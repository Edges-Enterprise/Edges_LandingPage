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
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerCustomerToGlobalReseller } from "@/actions/reseller/customers/registerCustomerToGlobalReseller";
import { getGlobalCustomerAuthEmail } from "@/actions/reseller/customers/getGlobalCustomerAuthEmail";
import { getCurrentCustomerPinStatus } from "@/actions/reseller/customers/getCurrentCustomerPinStatus";

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

export function useStoreCustomerAuth(storeSlug: string, resellerId: string) {
  const router = useRouter();
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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setLoggedIn(true);
      // Resellers' Auth accounts carry store_slug in user_metadata
      // (set by submitApplication.ts) — compare that, not store_name.
      // The slug is the same value this hook is given; store_name is the
      // display name ("Kwam Two" vs "kwam-two") and never matched, so the
      // owner was misclassified as a customer on the storefront.
      setIsStoreOwner(user.user_metadata?.store_slug === storeSlug);
    });
  }, [storeSlug]);

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
      const owner = data.user.user_metadata?.store_slug === storeSlug;
      setIsStoreOwner(owner);
      setLoggedIn(true);
      if (owner) router.push("/dashboard");
      setEmail("");
      setPassword("");
    }
    setLoginLoading(false);
  }, [authMode, email, password, storeSlug, router]);

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
