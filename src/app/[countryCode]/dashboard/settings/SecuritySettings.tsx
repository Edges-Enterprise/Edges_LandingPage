// src/app/[countryCode]/dashboard/settings/SecuritySettings.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Shield, Lock, Smartphone, Globe, Clock, LogOut } from "lucide-react";
import { CountryConfig } from "@/config/countries";
import { SecuritySettings as SecuritySettingsType } from "@/types/reseller/settings";

interface SecuritySettingsProps {
  security: SecuritySettingsType;
  config: CountryConfig;
  translations: any;
  onSave: () => void;
}

export default function SecuritySettings({
  security,
  config,
  translations,
  onSave,
}: SecuritySettingsProps) {
  const t = translations;
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
    setError(null);
    setSuccess(null);
  };

  const handlePasswordSubmit = async () => {
    // Validate
    if (!passwordData.current_password) {
      setError(t?.currentPasswordRequired || "Current password is required");
      return;
    }
    if (!passwordData.new_password || passwordData.new_password.length < 8) {
      setError(
        t?.passwordMinLength || "Password must be at least 8 characters",
      );
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError(t?.passwordMismatch || "Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password,
      });

      if (error) throw error;

      setSuccess(t?.passwordUpdated || "Password updated successfully");
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setShowPasswordForm(false);
      onSave();
    } catch (err: any) {
      setError(err.message || t?.passwordError || "Failed to update password");
    } finally {
      setIsLoading(false);
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

      {/* Change Password */}
      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
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
                {security.last_password_change
                  ? formatDate(security.last_password_change)
                  : "Never"}
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
            {error && (
              <div
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 6,
                  color: "#EF4444",
                  fontSize: "0.85rem",
                }}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "rgba(110,189,138,0.1)",
                  border: "1px solid rgba(110,189,138,0.2)",
                  borderRadius: 6,
                  color: "#6EBD8A",
                  fontSize: "0.85rem",
                }}
              >
                {success}
              </div>
            )}
            <input
              type="password"
              name="current_password"
              value={passwordData.current_password}
              onChange={handlePasswordChange}
              placeholder={t?.currentPassword || "Current Password"}
              style={{
                padding: "0.6rem 0.75rem",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
            <input
              type="password"
              name="new_password"
              value={passwordData.new_password}
              onChange={handlePasswordChange}
              placeholder={t?.newPassword || "New Password (min 8 characters)"}
              style={{
                padding: "0.6rem 0.75rem",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
            <input
              type="password"
              name="confirm_password"
              value={passwordData.confirm_password}
              onChange={handlePasswordChange}
              placeholder={t?.confirmPassword || "Confirm New Password"}
              style={{
                padding: "0.6rem 0.75rem",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
              }}
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
              }}
            >
              {isLoading
                ? t?.updating || "Updating..."
                : t?.updatePassword || "Update Password"}
            </button>
          </div>
        )}
      </div>

      {/* Two-Factor Auth */}
      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.25rem",
          marginBottom: "1.5rem",
          opacity: 0.6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <Shield size={20} style={{ color: "var(--dim)" }} />
            <div>
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--muted)",
                }}
              >
                {t?.twoFactorAuth || "Two-Factor Authentication"}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--dim)", margin: 0 }}>
                {t?.comingSoon || "Coming soon"}
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--dim)",
              background: "var(--bg3)",
              padding: "2px 10px",
              borderRadius: 100,
            }}
          >
            {t?.disabled || "Disabled"}
          </span>
        </div>
      </div>

      {/* Active Sessions */}
      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.25rem",
        }}
      >
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

        {security.sessions.map((session) => (
          <div
            key={session.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.6rem 0.75rem",
              background: session.is_current
                ? "rgba(var(--brand-color-rgb), 0.05)"
                : "transparent",
              border: session.is_current
                ? "1px solid rgba(var(--brand-color-rgb), 0.15)"
                : "none",
              borderRadius: 8,
              marginBottom: "0.5rem",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
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
                    }}
                  >
                    {t?.currentDevice || "Current"}
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
                }}
              >
                <span>{session.ip_address}</span>
                {session.location && <span>· {session.location}</span>}
                <span>· {formatDate(session.last_active)}</span>
              </div>
            </div>
            {!session.is_current && (
              <button
                style={{
                  padding: "0.25rem 0.75rem",
                  background: "transparent",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 4,
                  color: "#EF4444",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <LogOut size={14} style={{ marginRight: "0.25rem" }} />
                {t?.revokeSession || "Revoke"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
