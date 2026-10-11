// src/app/[countryCode]/[storeName]/StoreContent.tsx
"use client";

import { useState, useEffect } from "react";
import StoreHeader from "./StoreHeader";
import StoreHero from "./StoreHero";
import StoreProducts from "./StoreProducts";
import StoreFooter from "./StoreFooter";
import StoreAuthModal from "./StoreAuthModal";
import StorePurchaseModal from "./StorePurchaseModal";
import { StoreProduct } from "@/types/reseller/storefront";
import { CountryConfig } from "@/config/countries";
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");

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
          cartCount={0}
          cartTotal={0}
          onCartClick={() => {}}
          translations={t}
          config={config}
          apkUrl={storeData.apkUrl}
          walletBalance={wallet.walletBalance}
          walletLoading={wallet.customerDataLoading}
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
      </div>
  );
}
