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

export function getPaymentProvider(countryCode: string): PaymentProvider {
  return COUNTRY_PROVIDER[(countryCode || "").toLowerCase()] || "korapay";
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
      currency: getCountryCurrency(params.countryCode),
      reference,
      customer: {
        name: params.customerName,
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

  if (!FLUTTERWAVE_MOBILE_MONEY_COUNTRIES.has(upperCountry)) {
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

  if (!params.mobileMoney?.number) {
    return {
      success: false,
      reference,
      error: "Mobile money number is required for Flutterwave payments",
    };
  }

  try {
    const payload = {
      tx_ref: reference,
      amount: params.amount,
      currency: getCountryCurrency(params.countryCode),
      redirect_url: callbackUrl(reference, params.returnPath),
      customer: {
        email: params.customerEmail,
        name: params.customerName,
        phone_number: params.mobileMoney.number,
      },
      payment_options: "mobilemoney",
      mobilemoney: {
        phone: params.mobileMoney.number,
        network:
          params.mobileMoney.network ||
          FLUTTERWAVE_NETWORKS[upperCountry]?.[0] ||
          "MTN",
        country: upperCountry,
      },
      meta: params.metadata,
      customizations: {
        title: "Wallet Funding",
        description: "Fund your wallet via mobile money",
      },
    };

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
