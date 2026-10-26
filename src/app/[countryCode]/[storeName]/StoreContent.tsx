// src/app/[countryCode]/[storeName]/StoreContent.tsx
"use client";

import { useState, useEffect } from "react";
import StoreHeader from "./StoreHeader";
import StoreHero from "./StoreHero";
import StoreProducts from "./StoreProducts";
import StoreFooter from "./StoreFooter";
import StoreStatusBanner from "./StoreStatusBanner";
import StoreAuthModal from "./StoreAuthModal";
import StorePurchaseModal from "./StorePurchaseModal";
import StoreFundWalletModal from "./StoreFundWalletModal";
import StoreSupportModal from "./StoreSupportModal";
import { useRouter } from "next/navigation";
import { CountryConfig } from "@/config/countries";
import { createGlobalCustomerVirtualAccount } from "@/actions/reseller/customers/createGlobalCustomerVirtualAccount";
import { fundGlobalCustomerWallet } from "@/actions/reseller/customers/fundGlobalCustomerWallet";
import { createVirtualAccount } from "@/actions/reseller/wallet/createVirtualAccount";
import { fundWallet } from "@/actions/reseller/wallet/fundWallet";
import { useStoreCustomerAuth } from "@/hooks/store/useStoreCustomerAuth";
import { useStoreCustomerWallet } from "@/hooks/store/useStoreCustomerWallet";
import { useStorePurchase } from "@/hooks/store/useStorePurchase";

interface StoreContentProps {
  storeData: any;
  translations: any;
  config: CountryConfig;
}

export default function StoreContent({
  storeData,
  translations,
  config,
}: StoreContentProps) {
  const t = translations;
  const auth = useStoreCustomerAuth(
    storeData.application.store_slug,
    storeData.application.id,
  );
  const wallet = useStoreCustomerWallet({
    loggedIn: auth.loggedIn,
    isStoreOwner: auth.isStoreOwner,
    resellerId: storeData.application.id,
  });
  const [loginOpen, setLoginOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const router = useRouter();

  // StoreHeader's sign-in button navigates with ?login=true.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "true") setLoginOpen(true);
  }, []);

  const purchase = useStorePurchase({
    loggedIn: auth.loggedIn,
    isStoreOwner: auth.isStoreOwner,
    resellerId: storeData.application.id,
    hasTransactionPin: auth.hasTransactionPin,
    config,
    onPinSet: () => {},
    onPurchased: wallet.refreshWalletData,
    onRequireLogin: () => setLoginOpen(true),
  });

  const openFunding = () => {
    if (!auth.loggedIn) {
      setLoginOpen(true);
      return;
    }
    if (wallet.virtualAccounts.length > 0) {
      wallet.setShowFundingModal(true);
    } else {
      wallet.setShowVirtualForm(true);
    }
  };

  const handleCreateVirtualAccount = async () => {
    wallet.setVirtualLoading(true);
    wallet.setVirtualMessage(null);
    // An owner has no `global_customers` row (the customer action requires
    // one), so branch by role — same split as the fund handler below and as
    // the mobile `global-store-fund-wallet` edge function.
    const result = auth.isStoreOwner
      ? await createVirtualAccount({
          applicationId: storeData.application.id,
          countryCode: storeData.application.country_code,
        })
      : await createGlobalCustomerVirtualAccount(
          storeData.application.id,
          storeData.application.store_slug,
        );
    if (result.error) {
      wallet.setVirtualMessage({ type: "error", text: result.error });
    } else {
      wallet.setVirtualMessage({
        type: "success",
        // The owner action reports success via `data`; only the customer
        // action carries a `message`.
        text:
          ("message" in result && result.message) ||
          "Virtual account created successfully!",
      });
      await wallet.refreshWalletData();
      setTimeout(() => wallet.setShowVirtualForm(false), 2000);
    }
    wallet.setVirtualLoading(false);
  };

  // Non-xixapay countries fund by mobile money (korapay/flutterwave), the
  // same initiate-then-redirect model the reseller dashboard uses. Both
  // actions resolve the caller and store from the session, so no ids are
  // passed from here. The owner and the customer are different identity
  // classes (the owner has no `global_customers` row), so the branch is by
  // role — mirroring the mobile `global-store-fund-wallet` edge function.
  const handleFundMobileMoney = async ({
    amount,
    mobileNumber,
  }: {
    amount: number;
    mobileNumber: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const result = auth.isStoreOwner
      ? await fundWallet({
          amount,
          countryCode: config.code,
          source: "web",
          mobileMoney: mobileNumber ? { number: mobileNumber } : undefined,
        })
      : await fundGlobalCustomerWallet({
          resellerId: storeData.application.id,
          amount,
          countryCode: config.code,
          source: "web",
          mobileMoney: mobileNumber ? { number: mobileNumber } : undefined,
          returnPath: `/${storeData.application.country_code}/${storeData.application.store_slug}`,
        });

    if (!result.success) {
      return { ok: false, error: result.error };
    }

    // Korapay Direct API confirms via STK prompt; korapay-checkout and
    // flutterwave return a URL the customer must visit to pay.
    if (result.data?.authModel === "STK_PROMPT") {
      wallet.setVirtualMessage({
        type: "success",
        text: "Check your phone for the payment prompt to complete funding.",
      });
      wallet.setShowVirtualForm(false);
      await wallet.refreshWalletData();
      return { ok: true };
    }

    if (result.data?.redirectUrl) {
      window.location.href = result.data.redirectUrl;
      return { ok: true };
    }

    wallet.setVirtualMessage({
      type: "success",
      text: `Payment initiated. Reference: ${result.data?.reference ?? ""}`,
    });
    wallet.setShowVirtualForm(false);
    await wallet.refreshWalletData();
    return { ok: true };
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard may be unavailable (insecure context); still flash the label
    }
    wallet.setCopiedAccount(key);
    setTimeout(() => wallet.setCopiedAccount(null), 2000);
  };

  const filteredProducts = storeData.products;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
      }}
    >
        <StoreHeader
          storeData={storeData}
          translations={t}
          config={config}
          apkUrl={storeData.apkUrl}
          walletBalance={wallet.walletBalance}
          walletLoading={wallet.customerDataLoading}
          onFundClick={openFunding}
          onSupportClick={() => setSupportModalOpen(true)}
        />

        <StoreStatusBanner
          storeStatus={storeData.storeStatus}
          countryCode={storeData.application.country_code}
          translations={t}
        />

        <main style={{ padding: "2rem 5%", maxWidth: 1100, margin: "0 auto" }}>
          <StoreHero
            storeData={storeData}
            translations={t}
            config={config}
            onAddToCart={purchase.startPurchase}
          />

          <StoreProducts
            products={filteredProducts}
            networks={storeData.networks}
            selectedNetwork={selectedNetwork}
            onNetworkChange={setSelectedNetwork}
            onAddToCart={purchase.startPurchase}
            canSell={storeData.storeStatus?.canSell !== false}
            translations={t}
            config={config}
          />
        </main>

        <StoreFooter storeData={storeData} translations={t} config={config} />

        <StoreAuthModal
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          authMode={auth.authMode}
          switchAuthMode={auth.switchAuthMode}
          email={auth.email}
          setEmail={auth.setEmail}
          password={auth.password}
          setPassword={auth.setPassword}
          loginError={auth.loginError}
          loginLoading={auth.loginLoading}
          onSubmit={auth.handleLogin}
        />

        <StorePurchaseModal
          open={purchase.purchaseModalOpen}
          onClose={purchase.closePurchase}
          plan={purchase.selectedPlan}
          config={config}
          isCreatingPin={purchase.isCreatingPin}
          phone={purchase.purchasePhone}
          setPhone={purchase.setPurchasePhone}
          pin={purchase.purchasePin}
          setPin={purchase.setPurchasePin}
          loading={purchase.purchaseLoading}
          error={purchase.purchaseError}
          success={purchase.purchaseSuccess}
          onSubmit={purchase.handlePurchase}
        />

        <StoreFundWalletModal
          open={wallet.showFundingModal || wallet.showVirtualForm}
          mode={wallet.showFundingModal ? "accounts" : "create"}
          onClose={() => {
            wallet.setShowFundingModal(false);
            wallet.setShowVirtualForm(false);
          }}
          config={config}
          countryCode={storeData.application.country_code}
          balance={wallet.walletBalance}
          virtualAccounts={wallet.virtualAccounts}
          loading={wallet.virtualLoading}
          message={wallet.virtualMessage}
          copiedAccount={wallet.copiedAccount}
          onCopy={copyToClipboard}
          onCreateVirtualAccount={handleCreateVirtualAccount}
          onFundMobileMoney={handleFundMobileMoney}
        />

        <StoreSupportModal
          open={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
          resellerWhatsApp={storeData.application.phone ?? null}
          isStoreOwner={auth.isStoreOwner}
          config={config}
          onGoToSettings={() => {
            setSupportModalOpen(false);
            router.push(`/${storeData.application.country_code}/dashboard/settings`);
          }}
        />
      </div>
  );
}
