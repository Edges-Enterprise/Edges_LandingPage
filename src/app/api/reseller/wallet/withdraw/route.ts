// src/app/api/reseller/wallet/withdraw/route.ts
//
// Withdrawals for the [countryCode] reseller dashboard (global_* tables).
// The legacy resellers* implementation in actions/reseller/wallet/withdrawFunds
// works off reseller_wallets and is unrelated; this is the global equivalent.
//
// Rules, enforced in SQL rather than here so the browser cannot bypass them:
//   - Sundays and Wednesdays only, in the store's timezone
//   - unlimited withdrawals on those days
//   - 2% fee, deducted from the requested amount
//   - the full balance is withdrawable, customer float included. The reseller
//     owns their store and its customers, so float is their responsibility.
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import { dispatchWithdrawalPayout, settleResellerPayouts } from "@/lib/payments/withdrawalPayout";

const FEE_RATE = 0.02;
const MIN_WITHDRAWAL = 100;

/** Sunday and Wednesday payouts are settled in Lagos for NG stores. */
function timezoneForCountry(countryCode: string): string {
  const config = getCountryConfig(countryCode);
  return config?.timezone || "Africa/Lagos";
}

async function resolveReseller() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { data: application, error: appError } = await supabase
    .from("global_reseller_applications")
    .select("id, country_code, store_name")
    .eq("auth_user_id", user.id)
    .single();

  if (appError || !application) {
    return { error: "Reseller application not found", status: 404 as const };
  }

  return { application, user };
}

export async function GET() {
  try {
    const resolved = await resolveReseller();
    if ("error" in resolved) {
      return NextResponse.json(
        { success: false, error: resolved.error },
        { status: resolved.status },
      );
    }

    const { application } = resolved;
    const admin = createAdminClient();

    // Close this reseller's async payouts before reporting the balance, so a
    // settlement that completed since their last visit is reflected here. The
    // daily cron is only a backstop for resellers who never come back.
    await settleResellerPayouts(application.id, application.country_code);

    const { data, error } = await admin.rpc("get_withdrawal_eligibility", {
      p_reseller_id: application.id,
      p_timezone: timezoneForCountry(application.country_code),
    });

    if (error) {
      console.error("withdrawal eligibility failed:", error.message);
      return NextResponse.json(
        { success: false, error: "Could not check withdrawal eligibility" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("withdrawal eligibility error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveReseller();
    if ("error" in resolved) {
      return NextResponse.json(
        { success: false, error: resolved.error },
        { status: resolved.status },
      );
    }

    const { application, user } = resolved;
    const body = await request.json();

    const amount = Number(body?.amount);
    const bankCode = String(body?.bankCode ?? "").trim();
    const accountNumber = String(body?.accountNumber ?? "").trim();
    const accountName = String(body?.accountName ?? "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Enter a valid amount" },
        { status: 400 },
      );
    }

    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { success: false, error: `Minimum withdrawal is ${MIN_WITHDRAWAL}` },
        { status: 400 },
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { success: false, error: "Account number must be 10 digits" },
        { status: 400 },
      );
    }

    if (!bankCode) {
      return NextResponse.json(
        { success: false, error: "Select a bank" },
        { status: 400 },
      );
    }

    if (!accountName) {
      return NextResponse.json(
        { success: false, error: "Account name is required" },
        { status: 400 },
      );
    }

    const fee = Math.round(amount * FEE_RATE);
    if (amount - fee <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount does not cover the fee" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const reference = `WDR-${application.id.slice(0, 8)}-${Date.now()}`;

    // Day rule, balance check, deduction and ledger row all happen inside this
    // one function, under a row lock. Checking any of it in JS would leave a
    // window for two concurrent requests to both pass.
    const { data, error } = await admin.rpc("request_global_withdrawal", {
      p_reseller_id: application.id,
      p_amount: amount,
      p_fee: fee,
      p_bank_code: bankCode,
      p_account_number: accountNumber,
      p_account_name: accountName,
      p_reference: reference,
      p_timezone: timezoneForCountry(application.country_code),
    });

    if (error) {
      console.error("withdrawal request failed:", error.message);
      return NextResponse.json(
        { success: false, error: "Could not process withdrawal" },
        { status: 500 },
      );
    }

    if (data?.success === false) {
      // Expected refusals: wrong day, insufficient balance. Surfaced to the
      // reseller verbatim so "Your next withdrawal day is ..." is visible.
      return NextResponse.json(
        { success: false, error: data.error, eligibility: data.eligibility },
        { status: 400 },
      );
    }

    // The money is now deducted and a pending row exists. Send the payout for
    // the net amount — the fee stays with the platform, so paying the gross
    // would hand the reseller their fee back.
    const outcome = await dispatchWithdrawalPayout({
      withdrawalId: data.withdrawal_id,
      resellerId: application.id,
      netAmount: Number(data.net_amount),
      bankCode,
      accountNumber,
      accountName,
      reference: String(data.reference),
      countryCode: application.country_code,
      customerEmail: user.email,
    });

    if (outcome.status === "failed") {
      // The provider refused, so the deduction was reversed by
      // fail_global_withdrawal. Tell the reseller plainly.
      return NextResponse.json(
        {
          success: false,
          error: outcome.error || "Withdrawal could not be sent to your bank",
          refunded: true,
          reference: data.reference,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      withdrawal_id: data.withdrawal_id,
      amount: data.amount,
      fee: data.fee,
      net_amount: data.net_amount,
      reference: data.reference,
      status: outcome.status,
      // A pending payout has been accepted by the provider but has not
      // settled yet; the reseller should see that rather than "paid".
      message:
        outcome.status === "completed"
          ? "Withdrawal sent to your bank account"
          : "Withdrawal is being processed and will arrive shortly",
    });
  } catch (error) {
    console.error("withdrawal error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
