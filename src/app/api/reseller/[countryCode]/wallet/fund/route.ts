// src/app/api/reseller/[countryCode]/wallet/fund/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { fundWallet } from "@/actions/reseller/wallet/fundWallet";

export async function POST(
  request: NextRequest,
  { params }: { params: { countryCode: string } },
) {
  try {
    const { countryCode: urlCountryCode } = await params;
    const body = await request.json();
    const { amount, source, mobileMoney } = body;

    // ── Auth + ownership check ──────────────────────────────────────
    // Never trust the URL's countryCode for gateway/currency selection.
    // Look up the authenticated user's actual reseller record and use
    // its country_code as the source of truth — the URL segment is
    // display/routing only and can be stale or spoofed.
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id, country_code")
      .eq("auth_user_id", user.id)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { success: false, error: "Reseller application not found" },
        { status: 404 },
      );
    }

    const realCountryCode = application.country_code;

    if (realCountryCode !== urlCountryCode) {
      // Mismatch between the URL the request came in on and the
      // reseller's actual country. Log it — this should be rare and
      // usually means a stale tab/redirect — and proceed using the
      // verified DB value rather than the untrusted URL value.
      console.warn(
        `Wallet fund: URL countryCode "${urlCountryCode}" did not match ` +
          `reseller ${application.id}'s actual country_code "${realCountryCode}". ` +
          `Using "${realCountryCode}".`,
      );
    }

    const result = await fundWallet({
      amount,
      countryCode: realCountryCode,
      source: source || "web",
      mobileMoney,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reference: result.data?.reference,
        redirectUrl: result.data?.redirectUrl,
        paymentUrl: result.data?.paymentUrl,
        authModel: result.data?.authModel,
        transactionId: result.data?.transaction_id,
      },
    });
  } catch (error) {
    console.error("Fund wallet API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fund wallet",
      },
      { status: 500 },
    );
  }
}

// // src/app/api/reseller/[countryCode]/wallet/fund/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { createServerClient } from "@/lib/supabase/server";
// import { fundWallet } from "@/actions/reseller/wallet/fundWallet";

// export async function POST(
//   request: NextRequest,
//   { params }: { params: { countryCode: string } },
// ) {
//   try {
//     const { countryCode } = await params;
//     const body = await request.json();

//     const { amount, source, mobileMoney } = body;

//     const result = await fundWallet({
//       amount,
//       countryCode,
//       source: source || "web",
//       mobileMoney,
//     });

//     if (!result.success) {
//       return NextResponse.json(
//         { success: false, error: result.error },
//         { status: 400 },
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       data: {
//         reference: result.data?.reference,
//         redirectUrl: result.data?.redirectUrl,
//         paymentUrl: result.data?.paymentUrl,
//         authModel: result.data?.authModel,
//         transactionId: result.data?.transaction_id,
//       },
//     });
//   } catch (error) {
//     console.error("Fund wallet API error:", error);
//     return NextResponse.json(
//       {
//         success: false,
//         error: error instanceof Error ? error.message : "Failed to fund wallet",
//       },
//       { status: 500 },
//     );
//   }
// }

// // // src/app/api/reseller/[countryCode]/wallet/fund/route.ts
// // import { NextRequest, NextResponse } from "next/server";
// // import { fundWallet } from "@/actions/reseller/wallet/fundWallet";

// // export async function POST(
// //   request: NextRequest,
// //   { params }: { params: { countryCode: string } },
// // ) {
// //   try {
// //     const { countryCode } = await params;
// //     const body = await request.json();
// //     const { amount, mobileMoney, source } = body;

// //     const result = await fundWallet({
// //       amount,
// //       countryCode,
// //       source: source || "web",
// //       mobileMoney,
// //     });

// //     if (!result.success) {
// //       return NextResponse.json(
// //         { success: false, error: result.error },
// //         { status: 400 },
// //       );
// //     }

// //     return NextResponse.json({
// //       success: true,
// //       reference: result.data?.reference,
// //       redirectUrl: result.data?.redirectUrl,
// //       authModel: result.data?.authModel,
// //     });
// //   } catch (error) {
// //     console.error("Fund wallet API error:", error);
// //     return NextResponse.json(
// //       { success: false, error: "Internal server error" },
// //       { status: 500 },
// //     );
// //   }
// // }
