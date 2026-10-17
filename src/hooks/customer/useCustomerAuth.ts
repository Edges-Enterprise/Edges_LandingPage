// src/hooks/customer/useCustomerAuth.ts
//
// Task 4, pointer 1.b.iii.zi.x. Multi-country equivalent of the
// handleAuth/switchAuthMode logic embedded directly in
// old-storeName/StoreContent.tsx (lines ~450-544). Written as a
// standalone hook rather than inline in StoreContent.tsx because
// branch 3.a (the new StoreContent.tsx) hasn't started yet as of this
// pointer — wire this into that component once it exists, rather than
// this hook assuming its shape. See HANDOVER.md Task 4 for full
// context, including why the synthetic-email signup pattern exists at
// all (Supabase Auth's global email uniqueness vs. one real-world
// email needing an independent account per store).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerCustomerToGlobalReseller } from "@/actions/reseller/customers/registerCustomerToGlobalReseller";
import { getGlobalCustomerAuthEmail } from "@/actions/reseller/customers/getGlobalCustomerAuthEmail";

export type AuthMode = "signin" | "signup";

interface UseCustomerAuthParams {
  countryCode: string;
  storeSlug: string;
  onAuthSuccess: () => void;
}

export function useCustomerAuth({
  countryCode,
  storeSlug,
  onAuthSuccess,
}: UseCustomerAuthParams) {
  const router = useRouter();

  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setLoginError("");
    setEmail("");
    setPassword("");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    const supabase = createClient();

    if (authMode === "signup") {
      if (password.length < 6) {
        setLoginError("Password must be at least 6 characters");
        setLoginLoading(false);
        return;
      }

      // Synthetic-email-per-store pattern (see HANDOVER.md Task 4):
      // Supabase Auth requires a globally-unique email, but the same
      // real-world email needs an independent account per store. This
      // embeds storeSlug into a derived email Supabase never shows the
      // customer; registerCustomerToGlobalReseller maps it back to
      // their real email in global_customers.
      const [localPart, domain] = email.split("@");
      const suffix = Math.floor(Math.random() * 9) + 1;
      const separator = localPart.includes("+") ? "" : "+";
      const storeEmail = `${localPart}${separator}${storeSlug}${suffix}@${domain}`;
      const username = email.split("@")[0];

      const { data, error } = await supabase.auth.signUp({
        email: storeEmail,
        password,
        options: {
          data: {
            username,
            role: "customer",
            original_email: email,
          },
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
          storeEmail,
        );
        setEmail("");
        setPassword("");
        setLoginLoading(false);
        onAuthSuccess();
        return;
      }

      setLoginLoading(false);
      return;
    }

    // Sign-in flow — resolve the real, synthetic auth_email for this
    // (store, email) pair first, same reasoning as the sign-up branch.
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
      // The store's own public customer-login form doubles as an
      // owner-login shortcut in the legacy flow — preserved here.
      // Resellers' Supabase Auth accounts carry store_slug in
      // user_metadata (confirmed via submitApplication.ts), so this
      // checks the slug rather than legacy's store_name equality.
      const isOwner = data.user.user_metadata?.store_slug === storeSlug;
      if (isOwner) {
        router.push(`/${countryCode}/dashboard`);
      } else {
        setEmail("");
        setPassword("");
        onAuthSuccess();
      }
    }
    setLoginLoading(false);
  };

  return {
    authMode,
    email,
    setEmail,
    password,
    setPassword,
    loginLoading,
    loginError,
    switchAuthMode,
    handleAuth,
  };
}
