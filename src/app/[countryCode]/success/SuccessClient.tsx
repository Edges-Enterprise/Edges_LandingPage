// src/app/[countryCode]/success/SuccessClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Mail,
  Loader2,
  Store,
  LayoutDashboard,
} from "lucide-react";
import { useCountry } from "@/providers/CountryProvider";
import { createClient } from "@/lib/supabase/client";

interface SuccessClientProps {
  countryCode: string;
  config: any;
  applicationId?: string;
  translations: any;
}

export default function SuccessClient({
  countryCode,
  config,
  applicationId,
  translations,
}: SuccessClientProps) {
  const router = useRouter();
  const country = useCountry();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const t = translations || {};

  useEffect(() => {
    if (!applicationId) {
      setError(t?.applicationNotFound || "Application ID not found");
      setLoading(false);
      return;
    }

    const fetchApplication = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("global_reseller_applications")
          .select("*")
          .eq("id", applicationId)
          .single();

        if (error) throw error;

        setApplication({
          ...data,
          fullName: `${data.first_name} ${data.last_name}`,
          displayStoreName:
            data.store_name
              ?.split("-")
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ") || data.store_name,
        });
      } catch (err) {
        setError(
          t?.applicationNotFound || "Failed to fetch application status",
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId, t]);

  const handleAutoLogin = async () => {
    if (!application || !application.temp_password) {
      router.push(
        `/${countryCode}/sign-in?email=${encodeURIComponent(application?.email || "")}`,
      );
      return;
    }

    setIsLoggingIn(true);
    try {
      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: application.auth_email,
        password: application.temp_password,
      });

      if (signInError) {
        console.error("Login error:", signInError);
        router.push(
          `/${countryCode}/sign-in?email=${encodeURIComponent(application.email)}`,
        );
      } else {
        router.push(`/${countryCode}/dashboard`);
      }
    } catch (err) {
      console.error("Auto-login failed:", err);
      router.push(
        `/${countryCode}/sign-in?email=${encodeURIComponent(application.email)}`,
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "1.5rem",
        }}
      >
        <Loader2
          size={40}
          style={{
            animation: "spin 1s linear infinite",
            color: "var(--accent)",
          }}
        />
        <p style={{ color: "var(--muted)" }}>
          {t?.loadingApplication || "Loading your application status..."}
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: "2rem",
          textAlign: "center",
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(239,68,68,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "2rem" }}>😕</span>
        </div>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.5rem",
            fontWeight: 700,
          }}
        >
          {t?.somethingWentWrong || "Something went wrong"}
        </h2>
        <p style={{ color: "var(--muted)" }}>
          {error || t?.applicationNotFound || "Application not found"}
        </p>
        <Link
          href={`/${countryCode}/apply`}
          style={{
            display: "inline-block",
            padding: "0.75rem 2rem",
            background: "var(--accent)",
            color: "#FDF8F3",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          {t?.goBackToApply || "Go back to Apply"}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 5% 4rem" }}>
      <div style={{ textAlign: "center" }}>
        {/* Success Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(110,189,138,0.12)",
            border: "2px solid rgba(110,189,138,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <Check size={40} style={{ color: "#6EBD8A" }} />
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
            fontWeight: 800,
            marginBottom: "0.5rem",
          }}
        >
          {t?.title || "Application Submitted! 🎉"}
        </h1>

        <p
          style={{
            color: "var(--muted)",
            fontSize: "1rem",
            marginBottom: "0.25rem",
          }}
        >
          {t?.congratulations || "Congratulations"}{" "}
          <strong style={{ color: "var(--accent-lt)" }}>
            {application.fullName}
          </strong>
          !
        </p>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {t?.storeBeingSetUp || "Your store"}{" "}
          <strong style={{ color: "var(--text)" }}>
            {application.displayStoreName}
          </strong>{" "}
          {t?.storeBeingSetUp || "is being set up."}
        </p>

        {/* Email Notice */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem 1.25rem",
            marginBottom: "2rem",
            textAlign: "left",
          }}
        >
          <Mail
            size={18}
            style={{ color: "var(--muted)", marginTop: 2, flexShrink: 0 }}
          />
          <div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--muted)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {t?.emailSent || "We've sent a confirmation email to"}{" "}
              <strong>{application.email}</strong>{" "}
              {t?.emailSentWithCredentials || "with your login credentials."}
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--dim)",
                marginTop: "0.25rem",
              }}
            >
              {t?.emailArrival ||
                "The email arrives within 5–15 minutes. Check your spam or junk folder if you don't see it."}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={handleAutoLogin}
            disabled={isLoggingIn}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--accent)",
              color: "#FDF8F3",
              border: "none",
              borderRadius: 10,
              padding: "0.85rem 1.8rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: isLoggingIn ? "not-allowed" : "pointer",
              opacity: isLoggingIn ? 0.7 : 1,
              textDecoration: "none",
              transition: "opacity 0.2s, transform 0.2s",
              flex: 1,
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (!isLoggingIn) {
                e.currentTarget.style.opacity = "0.85";
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {isLoggingIn ? (
              <>
                <Loader2
                  size={18}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                {t?.loggingIn || "Logging in..."}
              </>
            ) : (
              <>
                <LayoutDashboard size={18} />
                {t?.goToDashboard || "Go to Dashboard"}
              </>
            )}
          </button>
          <a
            href={`/${countryCode}/${application.store_slug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              color: "var(--text)",
              border: "1px solid var(--border2)",
              borderRadius: 10,
              padding: "0.85rem 1.8rem",
              fontSize: "0.95rem",
              fontWeight: 500,
              textDecoration: "none",
              transition: "border-color 0.2s, background 0.2s",
              flex: 1,
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,138,84,0.4)";
              e.currentTarget.style.background = "rgba(201,138,84,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border2)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Store size={18} />
            {t?.previewStore || "Preview Store"} <ExternalLink size={15} />
          </a>
        </div>

        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.8rem",
            color: "var(--dim)",
          }}
        >
          {t?.applicationSubmitted || "✓ Application submitted"} ·{" "}
          {t?.emailSentStatus || "✓ Email sent"} ·{" "}
          {application.android_app
            ? t?.buildQueued || "✓ Build queued"
            : t?.storeReady || "✓ Store ready"}
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
