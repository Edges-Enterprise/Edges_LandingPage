// src/app/[countryCode]/[storeName]/StoreContent.tsx
"use client";

import { useState, useEffect } from "react";
import StoreHeader from "./StoreHeader";
import StoreHero from "./StoreHero";
import StoreProducts from "./StoreProducts";
import StoreFooter from "./StoreFooter";
import StoreAuthModal from "./StoreAuthModal";
import StorePurchaseModal from "./StorePurchaseModal";
import StoreFundWalletModal from "./StoreFundWalletModal";
import StoreSupportModal from "./StoreSupportModal";
import { useRouter } from "next/navigation";
import { StoreProduct } from "@/types/reseller/storefront";
import { CountryConfig } from "@/config/countries";
import { createGlobalCustomerVirtualAccount } from "@/actions/reseller/customers/createGlobalCustomerVirtualAccount";
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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
    const result = await createGlobalCustomerVirtualAccount(
      storeData.application.id,
      storeData.application.store_slug,
    );
    if (result.error) {
      wallet.setVirtualMessage({ type: "error", text: result.error });
    } else {
      wallet.setVirtualMessage({
        type: "success",
        text: result.message || "Virtual account created successfully!",
      });
      await wallet.refreshWalletData();
      setTimeout(() => wallet.setShowVirtualForm(false), 2000);
    }
    wallet.setVirtualLoading(false);
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

  const filteredProducts = storeData.products.filter(
    (product: StoreProduct) => {
      if (selectedCategory !== "all" && product.category !== selectedCategory) {
        return false;
      }
      if (selectedNetwork !== "all" && product.network !== selectedNetwork) {
        return false;
      }
      return true;
    },
  );

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

        <main style={{ padding: "2rem 5%", maxWidth: 1100, margin: "0 auto" }}>
          <StoreHero storeData={storeData} translations={t} config={config} />

          <StoreProducts
            products={filteredProducts}
            categories={storeData.categories}
            networks={storeData.networks}
            selectedCategory={selectedCategory}
            selectedNetwork={selectedNetwork}
            onCategoryChange={setSelectedCategory}
            onNetworkChange={setSelectedNetwork}
            onAddToCart={purchase.startPurchase}
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
          balance={wallet.walletBalance}
          virtualAccounts={wallet.virtualAccounts}
          loading={wallet.virtualLoading}
          message={wallet.virtualMessage}
          copiedAccount={wallet.copiedAccount}
          onCopy={copyToClipboard}
          onCreateVirtualAccount={handleCreateVirtualAccount}
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
