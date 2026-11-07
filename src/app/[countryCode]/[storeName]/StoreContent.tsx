// src/app/[countryCode]/[storeName]/StoreContent.tsx
"use client";

import { useState, useEffect } from "react";
import { Network } from "lucide-react";
import StoreHeader from "./StoreHeader";
import StoreHero from "./StoreHero";
import StoreProducts from "./StoreProducts";
import StoreDestinationFlow from "./StoreDestinationFlow";
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
  // The storefront has two views: the store's own network tabs, and the
  // destination (world) flow opened from the globe icon. Only one renders.
  const [showDestination, setShowDestination] = useState(false);
  const router = useRouter();

  // StoreHeader's sign-in button navigates with ?login=true.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "true") setLoginOpen(true);
  }, []);

  // A successful sign-in/sign-up closes the modal and reveals the storefront.
  // The owner stays here too; the auth hook no longer redirects them.
  useEffect(() => {
    if (!auth.loggedIn) return;
    setLoginOpen(false);
    // Drop the ?login=true marker so the modal does not reappear on refresh
    // or when the visitor navigates back.
    const url = new URL(window.location.href);
    if (url.searchParams.get("login") === "true") {
      url.searchParams.delete("login");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [auth.loggedIn]);

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
          // The store's own country, not `config.code`: for a country
          // outside the supported set the config is the USD fallback and
          // its code is empty, so the gateway/currency must come from the
          // store record itself.
          countryCode: storeData.application.country_code,
          source: "web",
          mobileMoney: mobileNumber ? { number: mobileNumber } : undefined,
        })
      : await fundGlobalCustomerWallet({
          resellerId: storeData.application.id,
          amount,
          countryCode: storeData.application.country_code,
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

  // The store's own country. The storefront's primary (network-tab) view
  // shows ONLY this country's networks and plans — a Rwandan store must not
  // offer a UAE or Zimbabwe network tab. Every other country's plans are
  // reached through the destination (globe) view, which carries the
  // country/network tabs for all available destinations.
  const storeCountry = (storeData.application.country_code || "").toLowerCase();
  const localNetworks: string[] =
    storeData.networksByCountry?.[storeCountry] ?? [];
  const localProducts = storeData.products.filter(
    (p: { country_code?: string }) =>
      (p.country_code || "").toLowerCase() === storeCountry,
  );
  // The globe view sees the whole enabled catalog, every country.
  const globalProducts = storeData.products;

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
          onLoginClick={() => setLoginOpen(true)}
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

          {showDestination ? (
            <>
              {/* Back to the store's own network tabs. Mirrors the globe icon
                  that opened this view. */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <button
                  onClick={() => setShowDestination(false)}
                  aria-label={t?.networkPlans || "Network plans"}
                  title={t?.networkPlans || "Network plans"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0.45rem 0.9rem",
                    borderRadius: 10,
                    border: "1.5px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--brand-color)",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <Network size={16} />
                  {t?.networkPlans || "Network Plans"}
                </button>
              </div>
              <StoreDestinationFlow
                products={globalProducts}
                config={config}
                translations={t}
                canSell={storeData.storeStatus?.canSell !== false}
                onBuy={(product, phone, amount) => {
                  purchase.startPurchase(product, phone, amount);
                }}
              />
            </>
          ) : (
            <StoreProducts
              products={localProducts}
              networks={localNetworks}
              selectedNetwork={selectedNetwork}
              onNetworkChange={setSelectedNetwork}
              onAddToCart={purchase.startPurchase}
              canSell={storeData.storeStatus?.canSell !== false}
              translations={t}
              config={config}
              onOpenDestination={() => setShowDestination(true)}
              hasGlobalPlans={globalProducts.length > 0}
            />
          )}
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
          purchaseAmount={purchase.purchaseAmount}
          setPurchaseAmount={purchase.setPurchaseAmount}
          quotedPrice={purchase.quotedPrice}
          amountError={purchase.amountError}
          quoting={purchase.quoting}
          detection={purchase.detection}
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
