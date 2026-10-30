// src/app/[countryCode]/dashboard/settings/SecuritySettings.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Shield,
  Lock,
  Smartphone,
  LogOut,
  Loader2,
  Copy,
} from "lucide-react";
import { CountryConfig } from "@/config/countries";
import { SecuritySettings as SecuritySettingsType } from "@/types/reseller/settings";
import { changePassword } from "@/actions/reseller/settings/changePassword";
import {
  getActiveSessions,
  revokeSession,
  getTwoFactorStatus,
} from "@/actions/reseller/settings/sessionActions";

interface SecuritySettingsProps {
  security: SecuritySettingsType;
  config: CountryConfig;
  translations: any;
  onSave: () => void;
}

const MIN_PASSWORD_LENGTH = 8;

export default function SecuritySettings({
  security,
  config,
  translations,
  onSave,
}: SecuritySettingsProps) {
  const t = translations;
  const supabase = createClient();

  const [sessions, setSessions] = useState(security.sessions || []);
  const [lastPasswordChange, setLastPasswordChange] = useState<
    string | undefined
  >(security.last_password_change);

  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    security.two_factor_enabled,
  );
  const [twoFactorVerifiedAt, setTwoFactorVerifiedAt] = useState<string | null>(
    null,
  );
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [enrollData, setEnrollData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [showDisableTwoFactor, setShowDisableTwoFactor] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [twoFactorNotice, setTwoFactorNotice] = useState<string | null>(null);

  // The page's server-rendered session list is a placeholder; replace it with
  // the caller's real sessions once mounted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sessionsResult, twoFactorResult] = await Promise.all([
        getActiveSessions(),
        getTwoFactorStatus(),
      ]);
      if (cancelled) return;

      if (sessionsResult.success && sessionsResult.sessions) {
        setSessions(sessionsResult.sessions);
      }
      if (twoFactorResult.success) {
        setTwoFactorEnabled(!!twoFactorResult.enabled);
        setTwoFactorVerifiedAt(twoFactorResult.verifiedAt ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
    setError(null);
    setSuccess(null);
  };

  const handlePasswordSubmit = async () => {
    if (!passwordData.current_password) {
      setError(t?.currentPasswordRequired || "Current password is required");
      return;
    }
    if (
      !passwordData.new_password ||
      passwordData.new_password.length < MIN_PASSWORD_LENGTH
    ) {
      setError(t?.passwordMinLength || "Password must be at least 8 characters");
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError(t?.passwordMismatch || "Passwords do not match");
      return;
    }
    if (passwordData.new_password === passwordData.current_password) {
      setError(
        t?.passwordMustDiffer ||
          "The new password must be different from the current one",
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Verified server-side: the action re-authenticates with the current
      // password before calling updateUser, so a borrowed session cannot
      // change the password on its own.
      const result = await changePassword(
        passwordData.current_password,
        passwordData.new_password,
      );

      if (!result.success) throw new Error(result.error);

      setSuccess(t?.passwordUpdated || "Password updated successfully");
      setLastPasswordChange(new Date().toISOString());
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setShowPasswordForm(false);
      onSave();

      // updateUser revokes other sessions on this project's GoTrue.
      const refreshed = await getActiveSessions();
      if (refreshed.success && refreshed.sessions) {
        setSessions(refreshed.sessions);
      }
    } catch (err: any) {
      setError(err.message || t?.passwordError || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    setError(null);
    setSuccess(null);

    try {
      const result = await revokeSession(sessionId);
      if (!result.success) throw new Error(result.error);

      setSessions((current) => current.filter((s) => s.id !== sessionId));
      setSuccess(t?.sessionRevoked || "Session signed out");
    } catch (err: any) {
      setError(err.message || t?.revokeError || "Failed to sign out session");
    } finally {
      setRevokingId(null);
    }
  };

  const startTwoFactorSetup = async () => {
    setTwoFactorBusy(true);
    setTwoFactorError(null);
    setTwoFactorNotice(null);

    try {
      // Clear out any abandoned unverified factors first, otherwise Supabase
      // rejects the enroll with "a factor with this name already exists".
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const stale =
        factorsData?.all?.filter(
          (f) => f.factor_type === "totp" && f.status === "unverified",
        ) || [];
      for (const factor of stale) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Dashboard ${new Date().toISOString().slice(0, 10)}`,
      });

      if (enrollError) throw enrollError;
      if (!data?.totp) throw new Error("No authenticator secret returned");

      setEnrollData({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setShowTwoFactorSetup(true);
      setVerifyCode("");
    } catch (err: any) {
      setTwoFactorError(
        err.message || t?.twoFactorError || "Could not start setup",
      );
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const confirmTwoFactor = async () => {
    if (!enrollData) return;
    if (!/^\d{6}$/.test(verifyCode.trim())) {
      setTwoFactorError(
        t?.invalidCode || "Enter the 6-digit code from your authenticator app",
      );
      return;
    }

    setTwoFactorBusy(true);
    setTwoFactorError(null);

    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify(
        {
          factorId: enrollData.factorId,
          code: verifyCode.trim(),
        },
      );

      if (verifyError) throw verifyError;

      setTwoFactorEnabled(true);
      setTwoFactorVerifiedAt(new Date().toISOString());
      setShowTwoFactorSetup(false);
      setEnrollData(null);
      setVerifyCode("");
      // Verifying a factor promotes this session to aal2 and signs out every
      // other session; the next navigation would force a fresh sign-in, so the
      // notice explains it rather than letting it look like a bug.
      setTwoFactorNotice(
        t?.twoFactorEnabledNotice ||
          "Two-factor authentication is on. Other devices have been signed out — you may be asked to sign in again.",
      );
      onSave();
    } catch (err: any) {
      setTwoFactorError(
        err.message || t?.invalidCode || "That code was not accepted",
      );
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!/^\d{6}$/.test(disableCode.trim())) {
      setTwoFactorError(
        t?.invalidCode || "Enter the 6-digit code from your authenticator app",
      );
      return;
    }

    setTwoFactorBusy(true);
    setTwoFactorError(null);
    setTwoFactorNotice(null);

    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verified =
        factorsData?.all?.filter(
          (f) => f.factor_type === "totp" && f.status === "verified",
        ) || [];

      if (!verified.length) throw new Error("No verified factor found");

      // Unenrolling a verified factor requires the session to be at aal2, which
      // means the user has to pass a challenge first.
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: verified[0].id });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verified[0].id,
        challengeId: challenge.id,
        code: disableCode.trim(),
      });
      if (verifyError) throw verifyError;

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: verified[0].id,
      });
      if (unenrollError) throw unenrollError;

      setTwoFactorEnabled(false);
      setTwoFactorVerifiedAt(null);
      setShowDisableTwoFactor(false);
      setDisableCode("");
      setTwoFactorNotice(
        t?.twoFactorDisabledNotice || "Two-factor authentication is off.",
      );
      onSave();
    } catch (err: any) {
      setTwoFactorError(
        err.message ||
          t?.twoFactorError ||
          "Could not turn off two-factor authentication",
      );
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--bg2)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "1.25rem",
    marginBottom: "1.5rem",
  };

  const inputStyle: React.CSSProperties = {
    padding: "0.6rem 0.75rem",
    background: "var(--bg3)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: "0.9rem",
    outline: "none",
  };

  const notice = (message: string, tone: "error" | "success") => (
    <div
      style={{
        padding: "0.5rem 0.75rem",
        background:
          tone === "error" ? "rgba(239,68,68,0.1)" : "rgba(110,189,138,0.1)",
        border: `1px solid ${
          tone === "error" ? "rgba(239,68,68,0.2)" : "rgba(110,189,138,0.2)"
        }`,
        borderRadius: 6,
        color: tone === "error" ? "#EF4444" : "#6EBD8A",
        fontSize: "0.85rem",
      }}
    >
      {message}
    </div>
  );

  return (
    <div>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.1rem",
          fontWeight: 700,
          marginBottom: "0.25rem",
        }}
      >
        {t?.security || "Security"}
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        {t?.securityInfo || "Manage your account security"}
      </p>

      {success && (
        <div style={{ marginBottom: "1rem" }}>{notice(success, "success")}</div>
      )}
      {error && !showPasswordForm && (
        <div style={{ marginBottom: "1rem" }}>{notice(error, "error")}</div>
      )}

      {/* Change Password */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Lock size={20} style={{ color: "var(--brand-color)" }} />
            <div>
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--text)",
                }}
              >
                {t?.changePassword || "Change Password"}
              </h3>
              <p
                style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}
              >
                {t?.lastChanged || "Last changed"}:{" "}
                {lastPasswordChange
                  ? formatDate(lastPasswordChange)
                  : t?.never || "Never"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            style={{
              padding: "0.4rem 1rem",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text)",
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brand-color)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            {showPasswordForm ? t?.cancel || "Cancel" : t?.change || "Change"}
          </button>
        </div>

        {showPasswordForm && (
          <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
            {error && notice(error, "error")}
            <input
              type="password"
              name="current_password"
              autoComplete="current-password"
              value={passwordData.current_password}
              onChange={handlePasswordChange}
              placeholder={t?.currentPassword || "Current Password"}
              style={inputStyle}
            />
            <input
              type="password"
              name="new_password"
              autoComplete="new-password"
              value={passwordData.new_password}
              onChange={handlePasswordChange}
              placeholder={t?.newPassword || "New Password (min 8 characters)"}
              style={inputStyle}
            />
            <input
              type="password"
              name="confirm_password"
              autoComplete="new-password"
              value={passwordData.confirm_password}
              onChange={handlePasswordChange}
              placeholder={t?.confirmPassword || "Confirm New Password"}
              style={inputStyle}
            />
            <button
              onClick={handlePasswordSubmit}
              disabled={isLoading}
              style={{
                padding: "0.6rem",
                background: "var(--brand-color)",
                color: "#FDF8F3",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {isLoading && <Loader2 size={16} className="spin" />}
              {isLoading
                ? t?.updating || "Updating..."
                : t?.updatePassword || "Update Password"}
            </button>
          </div>
        )}
      </div>

      {/* Two-Factor Auth */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Shield
              size={20}
              style={{
                color: twoFactorEnabled ? "#6EBD8A" : "var(--brand-color)",
              }}
            />
            <div>
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--text)",
                }}
              >
                {t?.twoFactorAuth || "Two-Factor Authentication"}
              </h3>
              <p
                style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}
              >
                {twoFactorEnabled
                  ? t?.twoFactorOn ||
                    `On — an authenticator code is required at sign-in${
                      twoFactorVerifiedAt
                        ? ` (since ${formatDate(twoFactorVerifiedAt)})`
                        : ""
                    }`
                  : t?.twoFactorOff ||
                    "Add a one-time code from an authenticator app"}
              </p>
            </div>
          </div>

          {twoFactorEnabled ? (
            <button
              onClick={() => {
                setShowDisableTwoFactor(true);
                setDisableCode("");
                setTwoFactorError(null);
              }}
              disabled={twoFactorBusy}
              style={{
                padding: "0.4rem 1rem",
                background: "transparent",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 6,
                color: "#EF4444",
                fontSize: "0.8rem",
                cursor: twoFactorBusy ? "not-allowed" : "pointer",
                opacity: twoFactorBusy ? 0.6 : 1,
              }}
            >
              {t?.disable2FA || "Disable 2FA"}
            </button>
          ) : (
            <button
              onClick={startTwoFactorSetup}
              disabled={twoFactorBusy}
              style={{
                padding: "0.4rem 1rem",
                background: "var(--brand-color)",
                border: "none",
                borderRadius: 6,
                color: "#FDF8F3",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: twoFactorBusy ? "not-allowed" : "pointer",
                opacity: twoFactorBusy ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {twoFactorBusy && <Loader2 size={14} className="spin" />}
              {t?.enable2FA || "Enable 2FA"}
            </button>
          )}
        </div>

        {twoFactorNotice && (
          <div style={{ marginTop: "0.75rem" }}>
            {notice(twoFactorNotice, "success")}
          </div>
        )}
        {twoFactorError && (
          <div style={{ marginTop: "0.75rem" }}>
            {notice(twoFactorError, "error")}
          </div>
        )}

        {showDisableTwoFactor && (
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border)",
              display: "grid",
              gap: "0.75rem",
              justifyItems: "start",
            }}
          >
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: 0 }}>
              {t?.disableTwoFactorPrompt ||
                "Enter the 6-digit code from your authenticator app to turn off two-factor authentication."}
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={disableCode}
              onChange={(e) => {
                setDisableCode(e.target.value.replace(/\D/g, ""));
                setTwoFactorError(null);
              }}
              placeholder={t?.verificationCode || "6-digit code"}
              style={{ ...inputStyle, letterSpacing: "0.3em", width: 160 }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={disableTwoFactor}
                disabled={twoFactorBusy}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#EF4444",
                  color: "#FDF8F3",
                  border: "none",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: twoFactorBusy ? "not-allowed" : "pointer",
                  opacity: twoFactorBusy ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                {twoFactorBusy && <Loader2 size={14} className="spin" />}
                {t?.confirmDisable2FA || "Turn off 2FA"}
              </button>
              <button
                onClick={() => {
                  setShowDisableTwoFactor(false);
                  setDisableCode("");
                  setTwoFactorError(null);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                {t?.cancel || "Cancel"}
              </button>
            </div>
          </div>
        )}

        {showTwoFactorSetup && enrollData && (
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border)",
              display: "grid",
              gap: "0.75rem",
              justifyItems: "start",
            }}
          >
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: 0 }}>
              {t?.twoFactorScan ||
                "Scan this QR code with your authenticator app, then enter the 6-digit code it shows."}
            </p>
            {/* The QR arrives as an inline SVG data URL from GoTrue. */}
            <img
              src={enrollData.qrCode}
              alt={t?.twoFactorQrAlt || "Two-factor authentication QR code"}
              width={180}
              height={180}
              style={{
                background: "#fff",
                padding: 8,
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                color: "var(--muted)",
                flexWrap: "wrap",
              }}
            >
              <span>{t?.twoFactorManual || "Or enter this key manually"}:</span>
              <code
                style={{
                  background: "var(--bg3)",
                  padding: "2px 8px",
                  borderRadius: 4,
                  color: "var(--text)",
                  fontSize: "0.8rem",
                  wordBreak: "break-all",
                }}
              >
                {enrollData.secret}
              </code>
              <button
                onClick={() =>
                  navigator.clipboard?.writeText(enrollData.secret)
                }
                aria-label={t?.copy || "Copy"}
                title={t?.copy || "Copy"}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  cursor: "pointer",
                  color: "var(--muted)",
                  display: "flex",
                }}
              >
                <Copy size={12} />
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => {
                setVerifyCode(e.target.value.replace(/\D/g, ""));
                setTwoFactorError(null);
              }}
              placeholder={t?.verificationCode || "6-digit code"}
              style={{ ...inputStyle, letterSpacing: "0.3em", width: 160 }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={confirmTwoFactor}
                disabled={twoFactorBusy}
                style={{
                  padding: "0.5rem 1rem",
                  background: "var(--brand-color)",
                  color: "#FDF8F3",
                  border: "none",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: twoFactorBusy ? "not-allowed" : "pointer",
                  opacity: twoFactorBusy ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                {twoFactorBusy && <Loader2 size={14} className="spin" />}
                {t?.verifyAndEnable || "Verify and enable"}
              </button>
              <button
                onClick={() => {
                  setShowTwoFactorSetup(false);
                  setEnrollData(null);
                  setVerifyCode("");
                  setTwoFactorError(null);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                {t?.cancel || "Cancel"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div style={cardStyle}>
        <h3
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Smartphone size={18} style={{ color: "var(--brand-color)" }} />
          {t?.sessions || "Active Sessions"}
        </h3>

        {sessions.length === 0 && (
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: 0 }}>
            {t?.noSessions || "No other sessions"}
          </p>
        )}

        {sessions.map((session) => (
          <div
            key={session.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              padding: "0.6rem 0.75rem",
              background: session.is_current
                ? "rgba(var(--brand-color-rgb), 0.05)"
                : "transparent",
              border: session.is_current
                ? "1px solid rgba(var(--brand-color-rgb), 0.15)"
                : "1px solid transparent",
              borderRadius: 8,
              marginBottom: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{
                    fontWeight: 500,
                    color: "var(--text)",
                    fontSize: "0.85rem",
                  }}
                >
                  {session.device_name}
                </span>
                {session.is_current && (
                  <span
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      color: "#6EBD8A",
                      background: "rgba(110,189,138,0.12)",
                      padding: "1px 8px",
                      borderRadius: 100,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t?.currentDevice || "This device"}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  fontSize: "0.7rem",
                  color: "var(--dim)",
                  marginTop: "0.25rem",
                  flexWrap: "wrap",
                }}
              >
                <span>{session.ip_address}</span>
                {session.location && <span>· {session.location}</span>}
                <span>· {formatDate(session.last_active)}</span>
              </div>
            </div>
            {!session.is_current && (
              <button
                onClick={() => handleRevoke(session.id)}
                disabled={revokingId === session.id}
                style={{
                  padding: "0.25rem 0.75rem",
                  background: "transparent",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 4,
                  color: "#EF4444",
                  fontSize: "0.75rem",
                  cursor: revokingId === session.id ? "not-allowed" : "pointer",
                  opacity: revokingId === session.id ? 0.6 : 1,
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <LogOut size={14} style={{ marginRight: "0.25rem" }} />
                {t?.revokeSession || "Sign out"}
              </button>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes security-spin { to { transform: rotate(360deg); } }
        .spin { animation: security-spin 0.9s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .spin { animation: none; }
        }
      `}</style>
    </div>
  );
}
