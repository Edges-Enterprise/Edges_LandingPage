// src/app/[countryCode]/apply/ApplicationClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCountry } from "@/providers/CountryProvider";
import ApplicationWizard from "@/components/reseller/application/ApplicationWizard";
import { CountryConfig } from "@/config/countries";

interface ApplicationClientProps {
  countryCode: string;
  config: CountryConfig;
}

export default function ApplicationClient({
  countryCode,
  config,
}: ApplicationClientProps) {
  const router = useRouter();
  const country = useCountry();
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    const savedId = localStorage.getItem("application_draft_id");
    if (savedId) {
      setApplicationId(savedId);
    }
  }, []);

  const handleComplete = (data: any) => {
    // Clear draft
    localStorage.removeItem("application_draft_id");
    // Redirect to success page
    router.push(`/${countryCode}/success?applicationId=${data.applicationId}`);
  };

  const handleDraftSaved = (id: string) => {
    setApplicationId(id);
    localStorage.setItem("application_draft_id", id);
  };

  // Render flag as HTML
  const renderFlag = (flag: string) => (
    <span
      style={{ display: "inline-block", width: 32, height: 22 }}
      dangerouslySetInnerHTML={{ __html: flag }}
    />
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 5% 4rem" }}>
      <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          {renderFlag(country.flag)}
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {country.name}
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(2rem, 3.5vw, 2.8rem)",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
            marginBottom: "0.5rem",
          }}
        >
          Business in-a Box
        </h1>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "1rem",
            maxWidth: 500,
            margin: "0 auto",
          }}
        >
          Complete the form below to start earning today.
        </p>
      </div>

      <ApplicationWizard
        countryCode={countryCode}
        config={config}
        applicationId={applicationId}
        onComplete={handleComplete}
        onDraftSaved={handleDraftSaved}
      />
    </div>
  );
}
