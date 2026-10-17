// src/hooks/store/useStoreCustomerWallet.ts
//
// Task 4, pointer 3.a.iii.zi.x. Wallet/virtual-account state for the
// customer storefront, mirroring the legacy (store)/old-storeName
// state (legacy ~137-170, ~560-640). Two branches, as legacy has:
//   - store owner  -> the reseller wallet (reuses the existing
//     `getWallet` action, which resolves the application by
//     auth_user_id)
//   - customer     -> `getCurrentCustomerWallet` (this session's new
//     action), which resolves the customer by auth_user_id and reads
//     `global_customer_wallets` x `global_customer_virtual_accounts`
//
// All reads are server-side: `global_customers` RLS only grants SELECT
// to the reseller owner, and the customer wallet/VA tables have no
// policies, so a browser client cannot read them (see the resolver
// action's header).
//
// The fund-wallet / create-virtual-account UI that consumes
// `showFundingModal`/`showVirtualForm`/`virtualLoading`/`virtualMessage`
// lands in 3.c.ii; this hook only owns the state + read.

"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentCustomerWallet } from "@/actions/reseller/customers/getCurrentCustomerWallet";
import { getWallet } from "@/actions/reseller/wallet/getWallet";
import type { GlobalCustomerVirtualAccount } from "@/actions/reseller/customers/getGlobalCustomerWallet";

export interface WalletMessage {
  type: "success" | "error";
  text: string;
}

interface UseStoreCustomerWalletArgs {
  loggedIn: boolean;
  isStoreOwner: boolean;
  resellerId: string;
}

export function useStoreCustomerWallet({
  loggedIn,
  isStoreOwner,
  resellerId,
}: UseStoreCustomerWalletArgs) {
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [virtualAccounts, setVirtualAccounts] = useState<
    GlobalCustomerVirtualAccount[]
  >([]);
  const [customerDataLoading, setCustomerDataLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [showVirtualForm, setShowVirtualForm] = useState(false);
  const [virtualLoading, setVirtualLoading] = useState(false);
  const [virtualMessage, setVirtualMessage] = useState<WalletMessage | null>(
    null,
  );
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const refreshWalletData = useCallback(async () => {
    if (!loggedIn) {
      setCustomerDataLoading(false);
      return;
    }

    setCustomerDataLoading(true);

    if (isStoreOwner) {
      const result = await getWallet();
      setWalletBalance(result.success ? (result.data?.balance ?? 0) : 0);
      setVirtualAccounts([]);
    } else {
      const result = await getCurrentCustomerWallet(resellerId);
      if (result.data) {
        setWalletBalance(result.data.balance);
        setVirtualAccounts(result.data.virtualAccounts);
      } else {
        setWalletBalance(0);
        setVirtualAccounts([]);
      }
    }

    setCustomerDataLoading(false);
  }, [loggedIn, isStoreOwner, resellerId]);

  useEffect(() => {
    void refreshWalletData();
  }, [refreshWalletData]);

  return {
    walletBalance,
    virtualAccounts,
    customerDataLoading,
    showBalance,
    setShowBalance,
    showFundingModal,
    setShowFundingModal,
    showVirtualForm,
    setShowVirtualForm,
    virtualLoading,
    setVirtualLoading,
    virtualMessage,
    setVirtualMessage,
    copiedAccount,
    setCopiedAccount,
    refreshWalletData,
  };
}
