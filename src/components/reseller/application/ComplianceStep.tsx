// src/components/reseller/application/ComplianceStep.tsx
"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";

interface ComplianceStepProps {
  data: any;
  onChange: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

const POLICIES = [
  {
    id: "termsAccepted",
    label: "Terms of Service",
    description: "I agree to the Terms of Service.",
  },
  {
    id: "privacyAccepted",
    label: "Privacy Policy",
    description: "I agree to the Privacy Policy.",
  },
  {
    id: "acceptableUseAccepted",
    label: "Acceptable Use Policy",
    description: "I agree to the Acceptable Use Policy.",
  },
  {
    id: "kycAccepted",
    label: "KYC Policy",
    description: "I understand and agree to the KYC requirements.",
  },
];

export default function ComplianceStep({
  data,
  onChange,
  onNext,
  onPrevious,
}: ComplianceStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    termsAccepted: data.termsAccepted || false,
    privacyAccepted: data.privacyAccepted || false,
    acceptableUseAccepted: data.acceptableUseAccepted || false,
    kycAccepted: data.kycAccepted || false,
    allAccepted: data.allAccepted || false,
  });

  const handleToggle = (id: string) => {
    const newData = {
      ...formData,
      [id]: !formData[id as keyof typeof formData],
    };
    // Check if all are accepted
    const allAccepted = POLICIES.every(
      (p) => newData[p.id as keyof typeof newData],
    );
    setFormData({ ...newData, allAccepted });
    if (errors[id]) {
      setErrors({ ...errors, [id]: "" });
    }
  };

  const handleSelectAll = () => {
    const newValue = !formData.allAccepted;
    const newData = {
      allAccepted: newValue,
      termsAccepted: newValue,
      privacyAccepted: newValue,
      acceptableUseAccepted: newValue,
      kycAccepted: newValue,
    };
    setFormData(newData);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const unaccepted = POLICIES.filter(
      (p) => !formData[p.id as keyof typeof formData],
    );

    if (unaccepted.length > 0) {
      unaccepted.forEach((p) => {
        newErrors[p.id] = `You must agree to the ${p.label}`;
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onChange(formData);
      onNext();
    }
  };

  return (
    <div>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
        }}
      >
        Compliance & Policies
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        Please review and accept our policies to continue.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Select All */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            marginBottom: "1rem",
          }}
        >
          <button
            type="button"
            onClick={handleSelectAll}
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: `1px solid ${formData.allAccepted ? "var(--accent)" : "var(--border)"}`,
              background: formData.allAccepted
                ? "var(--accent)"
                : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {formData.allAccepted && (
              <Check size={14} style={{ color: "#FDF8F3" }} />
            )}
          </button>
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 500,
              color: "var(--text)",
            }}
          >
            Accept All Policies
          </span>
        </div>

        {/* Individual Policies */}
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {POLICIES.map((policy) => {
            const isChecked = formData[
              policy.id as keyof typeof formData
            ] as boolean;
            const hasError = !!errors[policy.id];

            return (
              <div
                key={policy.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  background: isChecked
                    ? "rgba(201,138,84,0.05)"
                    : "var(--bg2)",
                  border: `1px solid ${hasError ? "#EF4444" : isChecked ? "rgba(201,138,84,0.2)" : "var(--border)"}`,
                  borderRadius: 8,
                  transition: "all 0.2s",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(policy.id)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: `1px solid ${isChecked ? "var(--accent)" : "var(--border)"}`,
                    background: isChecked ? "var(--accent)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    marginTop: 1,
                    flexShrink: 0,
                  }}
                >
                  {isChecked && (
                    <Check size={14} style={{ color: "#FDF8F3" }} />
                  )}
                </button>
                <div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text)" }}>
                    {policy.label}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    {policy.description}
                  </div>
                  {hasError && (
                    <p
                      style={{
                        color: "#EF4444",
                        fontSize: "0.8rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      {errors[policy.id]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginTop: "2rem",
          }}
        >
          <button
            type="button"
            onClick={onPrevious}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0.8rem 2rem",
              background: "transparent",
              color: "var(--text)",
              border: "1px solid var(--border2)",
              borderRadius: 10,
              fontSize: "0.95rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
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
            <ChevronLeft size={18} /> Back
          </button>
          <button
            type="submit"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0.8rem 2rem",
              background: "var(--accent)",
              color: "#FDF8F3",
              border: "none",
              borderRadius: 10,
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 0.2s, transform 0.2s",
              flex: 1,
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Review Application <ChevronRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
