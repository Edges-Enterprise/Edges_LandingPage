// src/hooks/store/useStoreCustomerAuth.ts
//
// Task 4, pointer 3.a.ii.zi.x. Auth/session core for the customer
// storefront, mirroring the legacy (store)/old-storeName state shape
// (legacy ~114-135, ~450-560) but against the global_* actions.
//
// Sign-up uses a per-store alias email so one real-world email can
// hold an independent Supabase Auth account at each store (Supabase
// Auth enforces email uniqueness): "<local>+<storeSlug><n>@<domain>",
// or "<local><storeSlug><n>@..." when the local part already contains
// a "+" (legacy's separator logic). Sign-in resolves that alias via
// getGlobalCustomerAuthEmail before calling signInWithPassword.

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registerCustomerToGlobalReseller } from "@/actions/reseller/customers/registerCustomerToGlobalReseller";
import { getGlobalCustomerAuthEmail } from "@/actions/reseller/customers/getGlobalCustomerAuthEmail";
import { getCurrentCustomerPinStatus } from "@/actions/reseller/customers/getCurrentCustomerPinStatus";
import { checkStoreOwnership } from "@/actions/reseller/store/checkStoreOwnership";

export type AuthMode = "signin" | "signup";

export function buildStoreAliasEmail(
  email: string,
  storeSlug: string,
): { authEmail: string; username: string } {
  const [localPart, domain] = email.split("@");
  const suffix = Math.floor(Math.random() * 9) + 1;
  const separator = localPart.includes("+") ? "" : "+";
  return {
    authEmail: `${localPart}${separator}${storeSlug}${suffix}@${domain}`,
    username: localPart,
  };
}

export function useStoreCustomerAuth(
  storeSlug: string,
  resellerId: string,
) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isStoreOwner, setIsStoreOwner] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  // null = not yet known (legacy's tri-state); drives isCreatingPin in the
  // purchase flow (3.a.v). See getCurrentCustomerPinStatus.
  const [hasTransactionPin, setHasTransactionPin] = useState<boolean | null>(
    null,
  );
  // false until the initial getUser() settles. Consumers that must tell
  // "signed out" from "not yet known" (e.g. the profile page) gate on this;
  // without it they cannot distinguish the two and render the wrong state.
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthReady(true);
      if (!user) return;
      setLoggedIn(true);
      // Ownership is decided server-side against the application row whose
      // auth_user_id is this user, not by comparing the account's store_slug
      // metadata: a reseller-added customer carries the *owner's* store_slug
      // (addCustomerWithLogin.ts), so the metadata comparison marked those
      // customers as the owner and showed them the dashboard.
      checkStoreOwnership({ applicationId: resellerId })
        .then(setIsStoreOwner)
        .catch(() => setIsStoreOwner(false));
    });
  }, [storeSlug, resellerId]);

  useEffect(() => {
    if (!loggedIn) {
      setHasTransactionPin(null);
      return;
    }
    let cancelled = false;
    getCurrentCustomerPinStatus(resellerId, isStoreOwner).then((result) => {
      if (!cancelled) setHasTransactionPin(result.hasPin);
    });
    return () => {
      cancelled = true;
    };
  }, [loggedIn, isStoreOwner, resellerId]);

  const switchAuthMode = useCallback((mode: AuthMode) => {
    setAuthMode(mode);
    setLoginError("");
    setEmail("");
    setPassword("");
  }, []);

  const handleLogin = useCallback(async () => {
    setLoginError("");
    setLoginLoading(true);
    const supabase = createClient();

    if (authMode === "signup") {
      const { authEmail, username } = buildStoreAliasEmail(email, storeSlug);
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: { username, role: "customer", original_email: email },
        },
      });

      if (error) {
        setLoginError(error.message);
        setLoginLoading(false);
        return;
      }

      if (data.user) {
        await registerCustomerToGlobalReseller(
          storeSlug,
          data.user.id,
          email,
          authEmail,
        );
        setLoggedIn(true);
        setIsStoreOwner(false);
        setEmail("");
        setPassword("");
      }
      setLoginLoading(false);
      return;
    }

    const authEmail = await getGlobalCustomerAuthEmail(email, storeSlug);
    const loginEmail = authEmail || email;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      setLoginError("Invalid email or password.");
      setLoginLoading(false);
      return;
    }

    if (data.user) {
      // Authoritative server-side ownership check (see the initial-load
      // effect) — the account's store_slug metadata is not a reliable signal
      // because reseller-added customers carry the owner's slug too.
      const owner = await checkStoreOwnership({ applicationId: resellerId });
      setIsStoreOwner(owner);
      setLoggedIn(true);
      // Sign-in always lands on the storefront, for the owner as much as for
      // a customer. The owner keeps a Dashboard entry in the storefront
      // header/drawer to reach the dashboard deliberately; routing there
      // automatically on sign-in contradicted "they will be on the
      // storefront too just like a customer would".
      setEmail("");
      setPassword("");
    }
    setLoginLoading(false);
  }, [authMode, email, password, storeSlug, resellerId]);

  const handleLogout = useCallback(async () => {
    setLogoutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setLoggedIn(false);
    setIsStoreOwner(false);
    setLogoutLoading(false);
  }, []);

  return {
    loggedIn,
    authReady,
    isStoreOwner,
    authMode,
    email,
    setEmail,
    password,
    setPassword,
    loginError,
    loginLoading,
    logoutLoading,
    switchAuthMode,
    handleLogin,
    handleLogout,
    hasTransactionPin,
  };
}
