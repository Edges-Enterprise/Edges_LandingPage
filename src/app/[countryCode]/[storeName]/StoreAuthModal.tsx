// src/app/[countryCode]/[storeName]/StoreAuthModal.tsx
//
// Task 4, pointer 3.c.i.zi.x. Tabbed sign-in/sign-up modal for the
// customer storefront. Behavioral/structural port of the legacy
// (store)/old-storeName modal (legacy ~1051-1300); styling reuses the
// storefront's `--brand-color` token instead of the legacy's derived
// `gradFrom`/`gradTo`/`onPrimary`, per the brief's "reference, not a
// literal styling port" guidance.

"use client";

import { useState } from "react";
import { X, Mail, Lock, Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import type { AuthMode } from "@/hooks/store/useStoreCustomerAuth";

interface StoreAuthModalProps {
  open: boolean;
  onClose: () => void;
  authMode: AuthMode;
  switchAuthMode: (mode: AuthMode) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  loginError: string;
  loginLoading: boolean;
  onSubmit: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.85rem",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "0.9rem",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export default function StoreAuthModal({
  open,
  onClose,
  authMode,
  switchAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  loginError,
  loginLoading,
  onSubmit,
}: StoreAuthModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  if (!open) return null;

  const isSignup = authMode === "signup";
  const passwordVisible = isSignup ? showSignupPassword : showPassword;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "0.6rem",
    borderRadius: 8,
    border: "none",
    background: active ? "var(--bg)" : "transparent",
    color: active ? "var(--text)" : "var(--muted)",
    fontWeight: active ? 700 : 500,
    fontSize: "0.88rem",
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
    transition: "all 0.15s",
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card, var(--bg))",
          borderRadius: 20,
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: 420,
          position: "relative",
          boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            borderRadius: "20px 20px 0 0",
            background: "var(--brand-color)",
          }}
        />
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "var(--bg-muted, #F3F4F6)",
            border: "none",
            cursor: "pointer",
            color: "var(--muted)",
            borderRadius: 8,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={17} />
        </button>

        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: "1.5rem",
            background: "var(--bg-muted, #F3F4F6)",
            borderRadius: 10,
            padding: 3,
          }}
        >
          <button
            onClick={() => switchAuthMode("signin")}
            style={tabStyle(!isSignup)}
          >
            Sign In
          </button>
          <button
            onClick={() => switchAuthMode("signup")}
            style={tabStyle(isSignup)}
          >
            Sign Up
          </button>
        </div>

        <h2
          style={{
            fontSize: "1.3rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "0.25rem",
          }}
        >
          {isSignup ? "Create Account" : "Welcome Back"}
        </h2>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--muted)",
            marginBottom: "1.5rem",
          }}
        >
          {isSignup
            ? "Create an account to start purchasing"
            : "Sign in to purchase data and airtime"}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: "0.4rem",
              }}
            >
              <Mail size={13} style={{ color: "var(--brand-color)" }} />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: isSignup ? "0.5rem" : "1rem" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: "0.4rem",
              }}
            >
              <Lock size={13} style={{ color: "var(--brand-color)" }} />
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{ ...inputStyle, paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => {
                  if (isSignup) setShowSignupPassword((v) => !v);
                  else setShowPassword((v) => !v);
                }}
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isSignup && (
              <p
                style={{
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                  marginTop: 4,
                }}
              >
                Minimum 6 characters
              </p>
            )}
          </div>

          {loginError && (
            <p
              style={{
                color: "#EF4444",
                fontSize: "0.82rem",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            style={{
              width: "100%",
              padding: "0.85rem",
              background: "var(--brand-color)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              fontSize: "0.95rem",
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: loginLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: loginLoading ? 0.75 : 1,
            }}
          >
            {loginLoading ? (
              <>
                <Loader2
                  size={17}
                  style={{ animation: "spin 1s linear infinite" }}
                />{" "}
                {isSignup ? "Creating account…" : "Signing in…"}
              </>
            ) : (
              <>
                <LogIn size={17} /> {isSignup ? "Create Account" : "Sign In"}
              </>
            )}
          </button>

          {isSignup && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                background: "rgba(110,189,138,0.06)",
                borderRadius: 10,
                border: "1px solid rgba(110,189,138,0.15)",
              }}
            >
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "#6EBD8A",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                ✅ Why create an account?
              </p>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "1.2rem",
                  fontSize: "0.75rem",
                  color: "var(--muted)",
                }}
              >
                <li>Fund your wallet via bank transfer</li>
                <li>Track all your purchases</li>
                <li>Get receipts via email</li>
                <li>Access exclusive deals</li>
              </ul>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
