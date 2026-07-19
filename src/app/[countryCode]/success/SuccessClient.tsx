// src/app/[countryCode]/success/SuccessClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  ExternalLink,
  Mail,
  Loader2,
  Store,
  LayoutDashboard,
} from "lucide-react";
import { useCountry } from "@/providers/CountryProvider";
import { createClient } from "@/lib/supabase/client";

import { getApplicationStatus } from "@/actions/reseller/application";

interface SuccessClientProps {
  countryCode: string;
  config: any;
  applicationId?: string;
}

export default function SuccessClient({
  countryCode,
  config,
  applicationId,
}: SuccessClientProps) {
  const router = useRouter();
  const country = useCountry();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!applicationId) {
      setError("Application ID not found");
      setLoading(false);
      return;
    }

   const fetchApplication = async () => {
     try {
       const supabase = createClient();
       const { data, error } = await supabase
         .from("global_reseller_applications")
         .select(
           "first_name, last_name, email, store_name, store_slug, android_app, application_status",
         )
         .eq("id", applicationId)
         .single();

       if (error) throw error;

       setApplication({
         ...data,
         fullName: `${data.first_name} ${data.last_name}`,
         firstName: data.first_name,
         lastName: data.last_name,
       });
     } catch (err) {
       setError("Failed to fetch application status");
       console.error(err);
     } finally {
       setLoading(false);
     }
   };

    fetchApplication();
  }, [applicationId]);

  const handleAutoLogin = async () => {
    setIsLoggingIn(true);
    try {
      const supabase = createClient();

      // ✅ Sign in with the user's credentials from the application
      const { error } = await supabase.auth.signInWithPassword({
        email: application.email,
        password: application.password, // We need to store this or use a different approach
      });

      if (error) {
        console.error("Login error:", error);
        // Fallback: redirect to sign-in page
        router.push(`/${countryCode}/sign-in?email=${application.email}`);
      } else {
        router.push(`/${countryCode}/dashboard`);
      }
    } catch (err) {
      console.error("Auto-login failed:", err);
      router.push(`/${countryCode}/sign-in?email=${application.email}`);
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
          Loading your application status...
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
          Something went wrong
        </h2>
        <p style={{ color: "var(--muted)" }}>
          {error || "Application not found"}
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
          Go back to Apply
        </Link>
      </div>
    );
  }

  const displayName = `${application.fullName || application.firstName || "User"}`;
  const storeDisplayName =
    application.storeName
      ?.split("-")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || "your store";

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
          Application Submitted! 🎉
        </h1>

        <p
          style={{
            color: "var(--muted)",
            fontSize: "1rem",
            marginBottom: "0.25rem",
          }}
        >
          Congratulations{" "}
          <strong style={{ color: "var(--accent-lt)" }}>{displayName}</strong>!
        </p>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          Your store{" "}
          <strong style={{ color: "var(--text)" }}>{storeDisplayName}</strong>{" "}
          is being set up.
        </p>

        {/* Application ID */}
        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0.8rem 1.2rem",
            marginBottom: "1.5rem",
            display: "inline-block",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--dim)",
              display: "block",
            }}
          >
            Application ID
          </span>
          <code style={{ color: "var(--accent-lt)", fontSize: "0.9rem" }}>
            {applicationId}
          </code>
        </div>

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
              We've sent a confirmation email to{" "}
              <strong>{application.email}</strong> with your login credentials.
              {application.androidApp && (
                <span>
                  {" "}
                  Your Android app build will start automatically and you'll
                  receive another email when it's ready.
                </span>
              )}
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--dim)",
                marginTop: "0.25rem",
              }}
            >
              The email arrives within 5–15 minutes. Check your spam or junk
              folder if you don't see it.
            </p>
          </div>
        </div>

        {/* Build Status (if Android app selected) */}
        {application.androidApp && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "rgba(201,138,84,0.05)",
              border: "1px solid rgba(201,138,84,0.2)",
              borderRadius: 10,
              padding: "0.75rem 1.25rem",
              marginBottom: "2rem",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#FCD34D",
                animation: "pulse-dot 1.5s ease-in-out infinite",
              }}
            />
            <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>
              Your Android app is being built. You'll get an email when it's
              ready!
            </span>
          </div>
        )}

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
                Logging in...
              </>
            ) : (
              <>
                <LayoutDashboard size={18} />
                Go to Dashboard
              </>
            )}
          </button>
          <a
            href={`/${countryCode}/${application.storeSlug}`}
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
            Preview Store <ExternalLink size={15} />
          </a>
        </div>

        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.8rem",
            color: "var(--dim)",
          }}
        >
          ✓ Application submitted · ✓ Email sent ·{" "}
          {application.androidApp ? "✓ Build queued" : "✓ Store ready"}
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
