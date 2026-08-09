// src/app/[countryCode]/dashboard/wallet/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import WalletClient from "./WalletClient";
import "@/app/reseller.css";

interface WalletPageProps {
  params: Promise<{ countryCode: string }>;
}

async function getWalletData(userId: string) {
  const supabase = await createServerClient();
  const admin = createAdminClient();

  try {
    // Get reseller application (RLS-scoped: confirms ownership via auth_user_id)
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id, brand_color, store_name, store_slug, country_code")
      .eq("auth_user_id", userId)
      .single();

    if (appError) throw appError;

    // Ownership is verified above, so it's safe to use the admin client
    // (bypasses RLS) for the remaining reads — run them in parallel.
    const [
      { data: wallet, error: walletError },
      { data: transactions, error: txError },
      { data: virtualAccount, error: vaError },
    ] = await Promise.all([
      admin
        .from("global_wallets")
        .select("*")
        .eq("reseller_id", application.id)
        .single(),
      admin
        .from("global_transactions")
        .select("*")
        .eq("reseller_id", application.id)
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("global_virtual_accounts")
        .select("*")
        .eq("reseller_id", application.id)
        .maybeSingle(),
    ]);

    if (walletError) console.error("Wallet fetch error:", walletError);
    if (txError) console.error("Transactions fetch error:", txError);
    if (vaError) console.error("Virtual account fetch error:", vaError);

    return {
      application,
      wallet: wallet || { balance: 0, currency: "USD", status: "active" },
      transactions: transactions || [],
      virtualAccount: virtualAccount || null,
    };
  } catch (error) {
    console.error("Wallet data error:", error);
    return null;
  }
}

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/wallet.json`);
    return translations.default;
  } catch {
    try {
      const translations = await import("@/messages/en/wallet.json");
      return translations.default;
    } catch {
      return {
        title: "Wallet",
        balance: "Balance",
        currency: "Currency",
        status: "Status",
        transactions: "Transactions",
        noTransactions: "No transactions yet",
        fundWallet: "Fund Wallet",
        withdraw: "Withdraw",
        virtualAccount: "Virtual Account",
        createVirtualAccount: "Create Virtual Account",
        active: "Active",
        pending: "Pending",
        completed: "Completed",
        failed: "Failed",
        amount: "Amount",
        date: "Date",
        type: "Type",
        description: "Description",
        reference: "Reference",
        deposit: "Deposit",
        withdrawal: "Withdrawal",
        purchase: "Purchase",
        refund: "Refund",
        commission: "Commission",
      };
    }
  }
}

export default async function WalletPage({ params }: WalletPageProps) {
  const { countryCode } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const config = getCountryConfig(countryCode);
  const language = config.language.code || "en";
  const translations = await getTranslations(language);
  const walletData = await getWalletData(user.id);

  if (!walletData) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <p style={{ color: "var(--muted)" }}>
          {translations?.error || "Unable to load wallet. Please try again."}
        </p>
      </div>
    );
  }

  return (
    <CountryProvider config={config}>
      <WalletClient
        countryCode={countryCode}
        config={config}
        translations={translations}
        walletData={walletData}
      />
    </CountryProvider>
  );
}

// // src/app/[countryCode]/dashboard/wallet/page.tsx
// import { createServerClient } from "@/lib/supabase/server";
// import { createAdminClient } from "@/lib/supabase/admin";
// import { getCountryConfig } from "@/config/countries";
// import { CountryProvider } from "@/providers/CountryProvider";
// import WalletClient from "./WalletClient";
// import "@/app/reseller.css";

// interface WalletPageProps {
//   params: Promise<{ countryCode: string }>;
// }

// async function getWalletData(userId: string) {
//   const supabase = await createServerClient();
//   const admin = createAdminClient(); // Service role client - bypasses RLS

//   try {
//     // Get reseller application (using session client - RLS works fine here)
//     const { data: application, error: appError } = await supabase
//       .from("global_reseller_applications")
//       .select("id, brand_color, store_name, store_slug, country_code")
//       .eq("auth_user_id", userId)
//       .single();

//     if (appError) throw appError;

//     console.log("📦 Server - application.id:", application.id);

//     // ✅ Use admin client for all subsequent queries (bypass RLS)
//     // Get wallet
//     const { data: wallet, error: walletError } = await admin
//       .from("global_wallets")
//       .select("*")
//       .eq("reseller_id", application.id)
//       .maybeSingle();

//     if (walletError) {
//       console.error("Wallet fetch error:", walletError);
//     }

//     // Get transactions
//     const { data: transactions, error: txError } = await admin
//       .from("global_transactions")
//       .select("*")
//       .eq("reseller_id", application.id)
//       .order("created_at", { ascending: false })
//       .limit(50);

//     if (txError) {
//       console.error("Transactions fetch error:", txError);
//     }

//     // ✅ Get virtual account with admin client (bypasses RLS)
//     const { data: virtualAccount, error: vaError } = await admin
//       .from("global_virtual_accounts")
//       .select("*")
//       .eq("reseller_id", application.id)
//       .maybeSingle();

//     if (vaError) {
//       console.error("❌ Virtual account fetch error:", vaError);
//     }

//     console.log("📦 Server - virtualAccount:", virtualAccount);

//     return {
//       application,
//       wallet: wallet || { balance: 0, currency: "USD", status: "active" },
//       transactions: transactions || [],
//       virtualAccount: virtualAccount || null,
//     };
//   } catch (error) {
//     console.error("Wallet data error:", error);
//     return null;
//   }
// }

// async function getTranslations(language: string) {
//   try {
//     const translations = await import(`@/messages/${language}/wallet.json`);
//     return translations.default;
//   } catch {
//     try {
//       const translations = await import("@/messages/en/wallet.json");
//       return translations.default;
//     } catch {
//       return {
//         title: "Wallet",
//         balance: "Balance",
//         currency: "Currency",
//         status: "Status",
//         transactions: "Transactions",
//         noTransactions: "No transactions yet",
//         fundWallet: "Fund Wallet",
//         withdraw: "Withdraw",
//         virtualAccount: "Virtual Account",
//         createVirtualAccount: "Create Virtual Account",
//         active: "Active",
//         pending: "Pending",
//         completed: "Completed",
//         failed: "Failed",
//         amount: "Amount",
//         date: "Date",
//         type: "Type",
//         description: "Description",
//         reference: "Reference",
//         deposit: "Deposit",
//         withdrawal: "Withdrawal",
//         purchase: "Purchase",
//         refund: "Refund",
//         commission: "Commission",
//       };
//     }
//   }
// }

// export default async function WalletPage({ params }: WalletPageProps) {
//   const { countryCode } = await params;

//   const supabase = await createServerClient();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   if (!user) {
//     return null;
//   }

//   const config = getCountryConfig(countryCode);
//   const language = config.language.code || "en";
//   const translations = await getTranslations(language);
//   const walletData = await getWalletData(user.id);

//   if (!walletData) {
//     return (
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           minHeight: "60vh",
//         }}
//       >
//         <p style={{ color: "var(--muted)" }}>
//           {translations?.error || "Unable to load wallet. Please try again."}
//         </p>
//       </div>
//     );
//   }

//   return (
//     <CountryProvider config={config}>
//       <WalletClient
//         countryCode={countryCode}
//         config={config}
//         translations={translations}
//         walletData={walletData}
//       />
//     </CountryProvider>
//   );
// }
