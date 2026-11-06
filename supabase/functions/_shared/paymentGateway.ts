// supabase/functions/_shared/paymentGateway.ts
//
// Task 8, pointer 8.f.ii. Mobile-money payment initiation for the
// customer/reseller wallet-funding edge function.
//
// Deno cannot import the web's src/lib/payments/* (React-flavoured,
// Next-aliased), so this mirrors those gateways' initiate step only —
// the part the app needs. Verification and webhook parsing stay on the
// web side (src/app/api/webhooks/*), which is what credits the wallet.
//
// Mirrors, deliberately and exactly:
//   - src/lib/payments/index.ts      getPaymentGatewayByCountry
//   - src/lib/payments/korapay.ts    initiatePayment (checkout-redirect mode)
//   - src/lib/payments/flutterwave.ts initiatePayment
// including their quirks, so the app and the web agree on behaviour:
//   * Korapay runs in checkout-redirect mode (the web's USE_DIRECT_API is
//     false), so the caller is redirected rather than prompted by STK.
//   * Flutterwave's mobile-money countries are RW and UG only. The web's
//     zm/za country configs name Flutterwave as the provider while
//     flutterwave.ts rejects anything outside RW/UG — a pre-existing
//     mismatch, mirrored here rather than silently "fixed" (see
//     HANDOVER.md Task 8, 8.f.ii).

import { getCountryCurrency } from "./countryCurrency.ts";

export type PaymentProvider = "xixapay" | "korapay" | "flutterwave";

// Country -> gateway. Mirrors src/config/countries/*.ts
// paymentGateway.provider (all 24 countries), kept as a small map so a
// Deno function does not import the React config.
const COUNTRY_PROVIDER: Record<string, PaymentProvider> = {
  ng: "xixapay",
  rw: "flutterwave",
  ug: "flutterwave",
  zm: "flutterwave",
  gh: "korapay",
  ke: "korapay",
  za: "korapay",
  eg: "korapay",
  ma: "korapay",
  cd: "korapay",
  cm: "korapay",
  cf: "korapay",
  td: "korapay",
  cg: "korapay",
  ga: "korapay",
  gq: "korapay",
  ci: "korapay",
  sn: "korapay",
  bf: "korapay",
  bj: "korapay",
  tg: "korapay",
  ne: "korapay",
  ml: "korapay",
  gn: "korapay",
};

/**
 * The gateway that funds a store's wallet, from the store's country alone.
 *
 * Phase 2: a country outside this map is not rejected. It funds by
 * Korapay/Flutterwave in USD, matching `getCountryCurrency`'s USD fallback —
 * the two must stay in step or a wallet would be funded in one currency and
 * denominated in another. Whether Korapay/Flutterwave will actually settle a
 * USD charge for a given country is a live-credential question, not
 * something this map can answer; see HANDOVER.md Phase 2 open items.
 *
 * For the USD case specifically, prefer `resolvePaymentProvider` below: this
 * function is not currency-aware and its Korapay default cannot charge USD.
 */
export function getPaymentProvider(countryCode: string): PaymentProvider {
  return COUNTRY_PROVIDER[(countryCode || "").toLowerCase()] || "korapay";
}

/**
 * Providers that can take a USD charge. Korapay holds USD but its checkout
 * channel is disabled on the live account (`409 AA021`), so USD never routes
 * there. Flutterwave is the sole USD rail by decision (2026-11-06): its
 * hosted link takes card + USD ACH and covers the intended function, so
 * Juicyway is not wired. Mirrors the web's `USD_CAPABLE_PROVIDERS` in
 * `src/lib/payments/index.ts`.
 */
const USD_CAPABLE_PROVIDERS: PaymentProvider[] = ["flutterwave"];

/**
 * The gateway to actually charge with, which is not always the country's
 * configured one. A USD charge must go to a USD-capable provider: an
 * unmapped country defaults to Korapay (via `getPaymentProvider`), whose USD
 * checkout channel is off, so a USD top-up would otherwise fail at the
 * gateway with `AA021`. Every other currency keeps the configured provider.
 */
export function resolvePaymentProvider(
  countryCode: string,
  currency?: string,
): PaymentProvider {
  const configured = getPaymentProvider(countryCode);
  if ((currency || "").toUpperCase() === "USD") {
    return USD_CAPABLE_PROVIDERS.includes(configured)
      ? configured
      : USD_CAPABLE_PROVIDERS[0];
  }
  return configured;
}

/** True when a charge in this currency must not be sent to `provider`. */
export function providerSupportsCurrency(
  provider: PaymentProvider,
  currency: string,
): boolean {
  if (currency.toUpperCase() === "USD") {
    return USD_CAPABLE_PROVIDERS.includes(provider);
  }
  return true;
}

// Korapay rejects `charges/initialize` with "One or more fields are invalid.
// Please fix them and try again." when customer.name contains any of
// + ( ) % < > = , or when it is empty (all verified live against the
// sandbox). A payer name is derived from the email local part at signup, so
// an alias like `bob+kesh-data1` reaches the gateway verbatim and every such
// funding attempt fails. Replace the rejected set with spaces and fall back
// to a placeholder when nothing usable remains.
export function sanitizeCustomerName(name: string): string {
  const cleaned = (name || "")
    .replace(/[+()%<>=]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Customer";
}

const KORAPAY_BASE_URL = "https://api.korapay.com/merchant/api/v1";
const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";

// The web app's public origin. Used for the gateway's redirect_url and
// notification_url, both of which must point at the Next app (the
// webhooks and the payment callback live there). Read lazily so merely
// importing this module needs no environment access.
function appUrl(): string {
  return (
    Deno.env.get("APP_URL") ||
    Deno.env.get("NEXT_PUBLIC_APP_URL") ||
    Deno.env.get("SITE_URL") ||
    "https://edges-landing-page.vercel.app"
  );
}

function generateReference(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

export interface InitiateParams {
  amount: number;
  countryCode: string;
  /**
   * The currency to charge in. Defaults to the country's own currency
   * (`getCountryCurrency`). Set to `USD` for a USD charge, which routes to a
   * USD-capable provider and builds a card/bank payload rather than mobile
   * money.
   */
  currency?: string;
  source: "app" | "web";
  customerName: string;
  customerEmail: string;
  /** Present only for Flutterwave, which needs the payer's MSISDN up front. */
  mobileMoney?: { number: string; network?: string };
  /** Metadata the webhook needs to attribute the deposit. Max 5 keys. */
  metadata: Record<string, unknown>;
  /** Same-origin path the web payment callback should return the payer to. */
  returnPath?: string;
}

export interface InitiateResult {
  success: boolean;
  reference: string;
  redirectUrl?: string;
  providerReference?: string;
  authModel?: "OTP" | "STK_PROMPT" | "REDIRECT";
  error?: string;
}

function callbackUrl(reference: string, returnPath?: string): string {
  const base = `${appUrl()}/api/payment/callback?reference=${reference}`;
  return returnPath
    ? `${base}&returnTo=${encodeURIComponent(returnPath)}`
    : base;
}

async function initiateKorapay(params: InitiateParams): Promise<InitiateResult> {
  const reference = generateReference("KPY");
  const secret = Deno.env.get("KORAPAY_SECRET_KEY") || "";
  const currency = (params.currency || getCountryCurrency(params.countryCode))
    .toUpperCase();

  // A USD charge cannot go through Korapay: the live account has no USD
  // checkout channel, so `charges/initialize` returns 409 `AA021`. Callers
  // route USD to Flutterwave (`resolvePaymentProvider`), so reaching here
  // with USD is a bug — refuse with the cause rather than forwarding AA021.
  if (currency === "USD") {
    return {
      success: false,
      reference,
      error:
        "Korapay cannot charge in USD (no USD channel on this account). " +
        "Use a USD-capable provider such as Flutterwave.",
    };
  }

  if (!secret) {
    return {
      success: false,
      reference,
      error: "Payment provider configuration missing. Please contact support.",
    };
  }

  try {
    const payload = {
      amount: params.amount,
      currency,
      reference,
      customer: {
        name: sanitizeCustomerName(params.customerName),
        email: params.customerEmail,
      },
      merchant_bears_cost: true,
      narration: "Wallet funding",
      metadata: params.metadata,
      channels: ["mobile_money"],
      default_channel: "mobile_money",
      redirect_url: callbackUrl(reference, params.returnPath),
      notification_url: `${appUrl()}/api/webhooks/korapay`,
    };

    const response = await fetch(`${KORAPAY_BASE_URL}/charges/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        reference,
        error:
          "Payment service returned an error. Please check your API credentials.",
      };
    }

    if (!response.ok || data.status === false) {
      return {
        success: false,
        reference,
        error: data.message || "Korapay payment failed",
      };
    }

    return {
      success: true,
      reference: data.data?.reference || reference,
      providerReference: data.data?.reference || "",
      redirectUrl: data.data?.checkout_url,
      authModel: "REDIRECT",
    };
  } catch (error) {
    console.error("Korapay initiate error:", error);
    return {
      success: false,
      reference,
      error: error instanceof Error ? error.message : "Korapay payment failed",
    };
  }
}

// Mirrors src/lib/payments/flutterwave.ts.
const FLUTTERWAVE_MOBILE_MONEY_COUNTRIES = new Set(["RW", "UG"]);
const FLUTTERWAVE_NETWORKS: Record<string, string[]> = {
  RW: ["MTN", "AIRTEL"],
  UG: ["MTN", "AIRTEL"],
};

async function initiateFlutterwave(
  params: InitiateParams,
): Promise<InitiateResult> {
  const reference = generateReference("FLW");
  const secret = Deno.env.get("FLUTTERWAVE_SECRET_KEY") || "";
  const upperCountry = params.countryCode.toUpperCase();
  const currency = (params.currency || getCountryCurrency(params.countryCode))
    .toUpperCase();
  // A USD charge is a card/bank hosted-link payment, not mobile money:
  // mobile money is a local-currency rail and Flutterwave has no USD
  // mobile-money method. Mirrors src/lib/payments/flutterwave.ts.
  const isUsd = currency === "USD";

  if (!isUsd && !FLUTTERWAVE_MOBILE_MONEY_COUNTRIES.has(upperCountry)) {
    return {
      success: false,
      reference,
      error: `Mobile money not supported for ${upperCountry} on Flutterwave.`,
    };
  }

  if (!secret) {
    return {
      success: false,
      reference,
      error: "Payment provider configuration missing. Please contact support.",
    };
  }

  if (!isUsd && !params.mobileMoney?.number) {
    return {
      success: false,
      reference,
      error: "Mobile money number is required for Flutterwave payments",
    };
  }

  try {
    const payload: Record<string, unknown> = {
      tx_ref: reference,
      amount: params.amount,
      currency,
      redirect_url: callbackUrl(reference, params.returnPath),
      customer: {
        email: params.customerEmail,
        name: sanitizeCustomerName(params.customerName),
        ...(params.mobileMoney?.number
          ? { phone_number: params.mobileMoney.number }
          : {}),
      },
      meta: params.metadata,
      customizations: {
        title: "Wallet Funding",
        description: isUsd
          ? "Fund your wallet via card or bank transfer"
          : "Fund your wallet via mobile money",
      },
    };

    if (isUsd) {
      // Card + USD ACH. `account` is Flutterwave's bank-transfer option.
      payload.payment_options = "card,account";
    } else {
      payload.payment_options = "mobilemoney";
      payload.mobilemoney = {
        phone: params.mobileMoney!.number,
        network:
          params.mobileMoney!.network ||
          FLUTTERWAVE_NETWORKS[upperCountry]?.[0] ||
          "MTN",
        country: upperCountry,
      };
    }

    const response = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        reference,
        error: "Invalid response from payment service.",
      };
    }

    if (data.status !== "success") {
      return {
        success: false,
        reference,
        error: data.message || "Flutterwave mobile money payment failed",
      };
    }

    const redirectUrl = data.data?.link || data.data?.redirect_url;
    if (!redirectUrl) {
      return {
        success: false,
        reference,
        error: "No checkout URL returned from Flutterwave",
      };
    }

    return {
      success: true,
      reference: data.data?.tx_ref || reference,
      providerReference: data.data?.flw_ref || data.data?.reference || "",
      redirectUrl,
      authModel: "REDIRECT",
    };
  } catch (error) {
    console.error("Flutterwave initiate error:", error);
    return {
      success: false,
      reference,
      error:
        error instanceof Error ? error.message : "Flutterwave payment failed",
    };
  }
}

export async function initiatePayment(
  provider: PaymentProvider,
  params: InitiateParams,
): Promise<InitiateResult> {
  switch (provider) {
    case "korapay":
      return await initiateKorapay(params);
    case "flutterwave":
      return await initiateFlutterwave(params);
    case "xixapay":
      return {
        success: false,
        reference: "",
        error:
          "This store funds wallets by bank transfer to a virtual account. Use the virtual account flow instead.",
      };
  }
}
