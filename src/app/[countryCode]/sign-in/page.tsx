// src/app/[countryCode]/sign-in/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthEmail } from "@/lib/auth/email-lookup";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (emailParam) {
      setSuccessMessage(
        `Please sign in with your password. We've pre-filled your email.`,
      );
    }
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      // ✅ First, try to find the auth_email for this original email
      const authEmail = await getAuthEmail(email);

      // If we found an auth email, use it; otherwise use the original email
      const loginEmail = authEmail || email;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password");
        return;
      }

      // Get the country code from the URL
      const pathParts = window.location.pathname.split("/");
      const countryCode = pathParts[1] || "ng";

      router.push(`/${countryCode}/dashboard`);
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 5%" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "2rem",
            fontWeight: 800,
            marginBottom: "0.5rem",
          }}
        >
          Welcome Back
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Sign in to your reseller dashboard
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--card)",
          border: "1px solid var(--border2)",
          borderRadius: 16,
          padding: "2rem",
        }}
      >
        {successMessage && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(110,189,138,0.1)",
              border: "1px solid rgba(110,189,138,0.3)",
              borderRadius: 8,
              color: "#6EBD8A",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            {successMessage}
          </div>
        )}

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 500,
              marginBottom: "0.35rem",
              color: "var(--text)",
            }}
          >
            Email
          </label>
          <div style={{ position: "relative" }}>
            <Mail
              size={18}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--dim)",
              }}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: "0.75rem 1rem 0.75rem 2.5rem",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: "0.95rem",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              required
            />
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 500,
              marginBottom: "0.35rem",
              color: "var(--text)",
            }}
          >
            Password
          </label>
          <div style={{ position: "relative" }}>
            <Lock
              size={18}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--dim)",
              }}
            />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: "100%",
                padding: "0.75rem 1rem 0.75rem 2.5rem",
                paddingRight: "2.5rem",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: "0.95rem",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--dim)",
                cursor: "pointer",
                padding: "0.25rem",
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8,
              color: "#EF4444",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.85rem",
            background: loading ? "var(--dim)" : "var(--accent)",
            color: "#FDF8F3",
            border: "none",
            borderRadius: 10,
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "opacity 0.2s, transform 0.2s",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.85rem",
            color: "var(--dim)",
            textAlign: "center",
          }}
        >
          Don't have an account?{" "}
          <a
            href={`/${window.location.pathname.split("/")[1] || "ng"}/apply`}
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Apply now
          </a>
        </p>
      </form>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "4rem", textAlign: "center" }}>Loading...</div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
