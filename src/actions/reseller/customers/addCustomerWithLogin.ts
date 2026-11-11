// src/actions/reseller/customers/addCustomerWithLogin.ts
//
// A reseller adding a customer by hand from the dashboard used to write only
// a `global_customers` row: no Supabase Auth account, so the customer could
// never sign in to the storefront. This action mirrors what self-signup does
// (auth user + customer row + wallet) and emails the generated credentials.
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import { sendAdminEmail } from "@/lib/email/email";

export interface AddCustomerWithLoginInput {
  resellerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status?: string;
}

export interface AddCustomerWithLoginResult {
  success?: boolean;
  customerId?: string;
  emailSent?: boolean;
  error?: string;
}

function generatePassword(): string {
  // Human-typable but not guessable: avoids 0/O/1/l confusion.
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// Matches the storefront signup alias so sign-in resolves it: "<local>+<slug><n>@<domain>",
// or without the "+" when the local part already has one.
function buildAlias(email: string, storeSlug: string, n: number): string {
  const [localPart, domain] = email.split("@");
  const separator = localPart.includes("+") ? "" : "+";
  return `${localPart}${separator}${storeSlug}${n}@${domain}`;
}

export async function addCustomerWithLogin(
  input: AddCustomerWithLoginInput,
): Promise<AddCustomerWithLoginResult> {
  const admin = createAdminClient();

  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!input.resellerId || !email || !firstName) {
    return { error: "Missing required fields" };
  }

  const { data: reseller, error: resellerError } = await admin
    .from("global_reseller_applications")
    .select("id, store_slug, store_name, country_code")
    .eq("id", input.resellerId)
    .single();

  if (resellerError || !reseller) {
    return { error: "Store not found" };
  }

  const { data: existing } = await admin
    .from("global_customers")
    .select("id, auth_user_id")
    .eq("reseller_id", reseller.id)
    .eq("email", email)
    .maybeSingle();

  if (existing?.auth_user_id) {
    return { error: "A customer with this email already has a login." };
  }

  const password = generatePassword();

  // Supabase Auth enforces email uniqueness, so a real address may already
  // hold an account at another store. Try a few alias suffixes.
  let authUserId: string | null = null;
  let authEmail: string | null = null;
  let lastAuthError: string | null = null;

  for (let attempt = 0; attempt < 5 && !authUserId; attempt++) {
    const candidate = buildAlias(email, reseller.store_slug, attempt + 1);
    const { data, error } = await admin.auth.admin.createUser({
      email: candidate,
      password,
      email_confirm: true,
      user_metadata: {
        username: email.split("@")[0],
        role: "customer",
        original_email: email,
        store_slug: reseller.store_slug,
      },
    });

    if (error) {
      lastAuthError = error.message;
      // A duplicate means this alias is taken — try the next suffix.
      if (/already|exists|registered/i.test(error.message)) continue;
      break;
    }
    authUserId = data.user?.id ?? null;
    authEmail = candidate;
  }

  if (!authUserId || !authEmail) {
    return { error: lastAuthError || "Failed to create customer login" };
  }

  const { data: customer, error: customerError } = await admin
    .from("global_customers")
    .insert({
      reseller_id: reseller.id,
      first_name: firstName,
      last_name: lastName,
      email,
      auth_email: authEmail,
      auth_user_id: authUserId,
      phone: input.phone?.trim() || null,
      status: input.status || "active",
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    // Don't leave an orphaned auth account behind.
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return { error: "Failed to create customer" };
  }

  const countryConfig = getCountryConfig(reseller.country_code);
  const { error: walletError } = await admin
    .from("global_customer_wallets")
    .insert({
      reseller_id: reseller.id,
      customer_id: customer.id,
      balance: 0,
      currency: countryConfig.currency,
      total_spent: 0,
    });
  if (walletError) {
    // Non-fatal: the wallet can be created lazily on first access.
    console.error("[addCustomerWithLogin] Wallet creation failed:", {
      customerId: customer.id,
      walletError,
    });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://edges-landing-page.vercel.app";
  const signInUrl = `${appUrl}/${reseller.country_code}/${reseller.store_slug}`;

  let emailSent = false;
  try {
    const result = await sendAdminEmail({
      to: email,
      subject: `Your ${reseller.store_name} account is ready`,
      recipientName: firstName,
      fromName: reseller.store_name,
      message: `
        <p>An account has been created for you at <strong>${reseller.store_name}</strong>.</p>
        <p>Sign in with the details below:</p>
        <table style="border-collapse:collapse;margin:16px 0;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td style="font-family:monospace;">${email}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Password</td><td style="font-family:monospace;">${password}</td></tr>
        </table>
        <p>For your security, change this password after your first sign-in.</p>
        <p><a href="${signInUrl}" style="color:#C98A54;">Go to ${reseller.store_name}</a></p>
      `,
    });
    emailSent = result.success;
  } catch (error) {
    console.error("[addCustomerWithLogin] Credential email failed:", error);
  }

  return { success: true, customerId: customer.id, emailSent };
}
