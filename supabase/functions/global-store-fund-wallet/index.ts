// supabase/functions/global-store-fund-wallet/index.ts
//
// Task 8, pointer 8.f.ii. Wallet funding for the mobile app, for both a
// store owner and a store customer, by mobile money (korapay/flutterwave).
//
// Why this exists rather than a call to the web action: the app is a
// native client and cannot invoke a Next.js "use server" action. The web
// already has the equivalent logic twice (src/actions/reseller/wallet/
// fundWallet.ts for the owner, .../customers/fundGlobalCustomerWallet.ts
// for a customer); this is the Deno port of both, so the app can reach
// them with nothing but its Supabase session.
//
// Scope: initiate only. This inserts a PENDING transaction carrying the
// gateway reference and returns the checkout URL. Completion is unchanged
// and stays on the web: the korapay/flutterwave webhooks match the
// reference and credit global_wallets (owner) or global_customer_wallets
// (customer) through the existing handlers.
//
// Identity invariant (see _shared/storeIdentity.ts): the caller is taken
// from the JWT and may only fund their own wallet. `resellerId` is a
// routing hint naming which store to look in, never an authorization
// claim. The gateway and currency come from the *store's* country_code as
// stored in the DB, not from the request body — same rule the web's
// /api/reseller/[countryCode]/wallet/fund route follows.
import {
  adminClient,
  corsHeaders,
  jsonResponse,
  resolveStoreIdentity,
} from "../_shared/storeIdentity.ts";
import {
  getPaymentProvider,
  initiatePayment,
} from "../_shared/paymentGateway.ts";
import { getCountryCurrency } from "../_shared/countryCurrency.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { resellerId, amount, mobileMoney } = body ?? {};

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return jsonResponse({ error: "Amount must be greater than 0" }, 400);
    }

    const admin = adminClient();
    const { identity, error, status } = await resolveStoreIdentity(
      admin,
      req.headers.get("Authorization"),
      resellerId,
    );
    if (error) return jsonResponse({ error }, status ?? 400);
    if (!identity) {
      return jsonResponse(
        { error: "Customer record not found. Please contact support." },
        404,
      );
    }

    // The store's own country decides the gateway and the currency.
    const { data: store } = await admin
      .from("global_reseller_applications")
      .select("id, country_code, store_slug, store_name, email")
      .eq("id", identity.resellerId)
      .single();

    if (!store) {
      return jsonResponse({ error: "Store not found" }, 404);
    }

    const countryCode: string = (store.country_code || "").toLowerCase();
    const provider = getPaymentProvider(countryCode);

    if (provider === "xixapay") {
      return jsonResponse(
        {
          error:
            "This store funds wallets by bank transfer to a virtual account. Use the virtual account flow instead.",
        },
        400,
      );
    }

    // Payer details differ by role: the owner funds their own wallet, a
    // customer funds theirs. Mirrors each web action's own lookup.
    let payerName: string;
    let payerEmail: string;
    let customerId: string | null = null;

    if (identity.userType === "reseller") {
      const { data: owner } = await admin
        .from("global_reseller_applications")
        .select("first_name, last_name, email")
        .eq("id", identity.resellerId)
        .single();
      payerName =
        `${owner?.first_name ?? ""} ${owner?.last_name ?? ""}`.trim() ||
        store.store_name ||
        "Store owner";
      payerEmail = owner?.email || store.email;
    } else {
      const { data: customer } = await admin
        .from("global_customers")
        .select("id, first_name, last_name, email")
        .eq("id", identity.customerId!)
        .single();
      if (!customer) {
        return jsonResponse(
          { error: "Customer record not found. Please contact support." },
          404,
        );
      }
      customerId = customer.id;
      payerName =
        `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() ||
        customer.email;
      payerEmail = customer.email;
    }

    // Korapay limits metadata to 5 keys (see fundWallet.ts); customer_id
    // is included so a webhook can tell a customer deposit from an owner's.
    const metadata: Record<string, unknown> = {
      reseller_id: identity.resellerId,
      country_code: countryCode,
      source: "app",
      payment_type:
        identity.userType === "reseller"
          ? "wallet_funding"
          : "customer_wallet_funding",
    };
    if (customerId) metadata.customer_id = customerId;

    const result = await initiatePayment(provider, {
      amount: parsedAmount,
      countryCode,
      source: "app",
      customerName: payerName,
      customerEmail: payerEmail,
      mobileMoney: mobileMoney?.number
        ? { number: mobileMoney.number }
        : undefined,
      metadata,
      // Derived server-side from the store, not taken from the request: the
      // payer should always land back on this store's own storefront.
      returnPath: `/${countryCode}/${store.store_slug}`,
    });

    if (!result.success) {
      return jsonResponse(
        { error: result.error || "Payment initiation failed" },
        400,
      );
    }

    // Record the pending transaction. Reseller and customer rows live in
    // different tables (global_transactions has no customer_id column at
    // all - see HANDOVER.md Task 4, 1.c.iii), which is exactly what the
    // webhooks use to route completion.
    if (identity.userType === "reseller") {
      const { error: insertError } = await admin
        .from("global_transactions")
        .insert({
          reseller_id: identity.resellerId,
          type: "credit",
          amount: parsedAmount,
          description: `Wallet funding via ${provider}`,
          status: "pending",
          reference: result.reference,
          payment_gateway: provider,
          metadata: {
            gateway: provider,
            source: "app",
            currency: getCountryCurrency(countryCode),
            provider_reference: result.providerReference,
            redirect_url: result.redirectUrl,
            auth_model: result.authModel,
            customer_email: payerEmail,
          },
        });

      if (insertError) {
        console.error("global-store-fund-wallet reseller insert:", insertError);
        return jsonResponse(
          { error: "Failed to create transaction record" },
          500,
        );
      }
    } else {
      const { data: wallet } = await admin
        .from("global_customer_wallets")
        .select("balance")
        .eq("reseller_id", identity.resellerId)
        .eq("customer_id", customerId!)
        .maybeSingle();

      const currentBalance = Number(wallet?.balance ?? 0);

      const { error: insertError } = await admin
        .from("global_customer_transactions")
        .insert({
          reseller_id: identity.resellerId,
          customer_id: customerId!,
          type: "deposit",
          amount: parsedAmount,
          net_amount: parsedAmount,
          previous_balance: currentBalance,
          // Real balance change happens on webhook completion, not here.
          new_balance: currentBalance,
          description: `Wallet funding via ${provider}`,
          status: "pending",
          reference: result.reference,
          payment_gateway: provider,
          metadata: {
            gateway: provider,
            source: "app",
            currency: getCountryCurrency(countryCode),
            provider_reference: result.providerReference,
            redirect_url: result.redirectUrl,
            auth_model: result.authModel,
            customer_email: payerEmail,
          },
        });

      if (insertError) {
        console.error("global-store-fund-wallet customer insert:", insertError);
        return jsonResponse(
          { error: "Failed to create transaction record" },
          500,
        );
      }
    }

    return jsonResponse({
      success: true,
      data: {
        reference: result.reference,
        redirectUrl: result.redirectUrl,
        providerReference: result.providerReference,
        authModel: result.authModel,
      },
    });
  } catch (error) {
    console.error("global-store-fund-wallet error:", error);
    return jsonResponse({ error: "Failed to initiate payment" }, 500);
  }
});
