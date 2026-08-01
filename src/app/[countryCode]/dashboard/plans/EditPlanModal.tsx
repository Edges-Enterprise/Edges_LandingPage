// src/app/[countryCode]/dashboard/plans/EditPlanModal.tsx
"use client";

import { useState } from "react";
import { X, Percent, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface EditPlanModalProps {
  plan: any;
  onClose: () => void;
  onSuccess: () => void;
  config: any;
  translations: any;
}

export default function EditPlanModal({
  plan,
  onClose,
  onSuccess,
  config,
  translations,
}: EditPlanModalProps) {
  const t = translations;
  const supabase = createClient();
  const [markupType, setMarkupType] = useState<"percentage" | "fixed">(
    plan.markup_type || "percentage",
  );
  const [markupValue, setMarkupValue] = useState<string>(
    plan.markup_value?.toString() || "0",
  );
  const [isLoading, setIsLoading] = useState(false);

  const currencySymbol = config.currencySymbol || "₦";

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const calculateSellingPrice = () => {
    const base = plan.base_price || 0;
    const value = parseFloat(markupValue) || 0;

    if (markupType === "percentage") {
      return Math.round(base * (1 + value / 100));
    } else {
      return Math.round(base + value);
    }
  };

  const sellingPrice = calculateSellingPrice();
  const profit = sellingPrice - (plan.base_price || 0);
  const profitPercent =
    plan.base_price > 0 ? Math.round((profit / plan.base_price) * 100) : 0;

  const handleSubmit = async () => {
    const value = parseFloat(markupValue);
    if (isNaN(value) || value < 0) return;

    setIsLoading(true);
    try {
      const newSellingPrice = calculateSellingPrice();

      const { error } = await supabase
        .from("global_plans")
        .update({
          markup_type: markupType,
          markup_value: value,
          selling_price: newSellingPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id);

      if (!error) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "1.5rem",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            padding: "0.25rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--muted)";
          }}
        >
          <X size={20} />
        </button>

        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.25rem",
            fontWeight: 700,
            marginBottom: "0.25rem",
          }}
        >
          {t?.editPlan || "Edit Plan"}
        </h2>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {t?.markupDescription ||
            "Set your markup to determine your profit on each sale."}
        </p>

        {/* Plan Info */}
        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {t?.planName || "Plan Name"}
            </p>
            <p
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {plan.name}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {t?.wholesalePrice || "Wholesale Price"}
            </p>
            <p
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--muted)",
              }}
            >
              {currencySymbol} {plan.base_price?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        {/* Markup Type */}
        <div style={{ marginBottom: "1rem" }}>
          <p
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.5rem",
            }}
          >
            {t?.markupType || "Markup Type"}
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setMarkupType("percentage")}
              style={{
                flex: 1,
                padding: "0.6rem 1rem",
                background:
                  markupType === "percentage"
                    ? "var(--brand-color)"
                    : "var(--bg2)",
                color: markupType === "percentage" ? "#FDF8F3" : "var(--text)",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                fontWeight: markupType === "percentage" ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              <Percent size={16} />
              {t?.percentage || "Percentage"}
            </button>
            <button
              onClick={() => setMarkupType("fixed")}
              style={{
                flex: 1,
                padding: "0.6rem 1rem",
                background:
                  markupType === "fixed" ? "var(--brand-color)" : "var(--bg2)",
                color: markupType === "fixed" ? "#FDF8F3" : "var(--text)",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                fontWeight: markupType === "fixed" ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              <DollarSign size={16} />
              {t?.fixed || "Fixed Amount"}
            </button>
          </div>
        </div>

        {/* Markup Value */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.5rem",
            }}
          >
            {markupType === "percentage"
              ? t?.markupPercentage || "Markup Percentage"
              : t?.markupAmount || "Markup Amount"}
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {markupType === "percentage" ? (
              <>
                <input
                  type="number"
                  value={markupValue}
                  onChange={(e) => setMarkupValue(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    background: "transparent",
                    border: "none",
                    color: "var(--text)",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
                <span
                  style={{
                    padding: "0.75rem 1rem",
                    color: "var(--dim)",
                    fontWeight: 600,
                    background: "var(--bg3)",
                  }}
                >
                  %
                </span>
              </>
            ) : (
              <>
                <span
                  style={{
                    padding: "0.75rem 1rem",
                    color: "var(--muted)",
                    fontWeight: 600,
                    background: "var(--bg3)",
                  }}
                >
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={markupValue}
                  onChange={(e) => setMarkupValue(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="1"
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    background: "transparent",
                    border: "none",
                    color: "var(--text)",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* Preview */}
        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0.5rem",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: "0.6rem",
                  color: "var(--dim)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.wholesalePrice || "Wholesale"}
              </p>
              <p
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--muted)",
                }}
              >
                {currencySymbol} {plan.base_price?.toLocaleString() || 0}
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: "0.6rem",
                  color: "var(--dim)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.yourPrice || "Your Price"}
              </p>
              <p
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                {currencySymbol} {sellingPrice.toLocaleString()}
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: "0.6rem",
                  color: "var(--dim)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t?.profit || "Profit"}
              </p>
              <p
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: profit > 0 ? "#6EBD8A" : "var(--dim)",
                }}
              >
                {profit > 0 ? "+" : ""}
                {currencySymbol} {profit.toLocaleString()}
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 400,
                    color: "var(--dim)",
                  }}
                >
                  ({profitPercent}%)
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: "var(--brand-color)",
            color: "#FDF8F3",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "1rem",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.opacity = "0.85";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          {isLoading ? t?.saving || "Saving..." : t?.save || "Save Changes"}
        </button>
      </div>
    </div>
  );
}
