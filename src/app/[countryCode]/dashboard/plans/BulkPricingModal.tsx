// src/app/[countryCode]/dashboard/plans/BulkPricingModal.tsx
"use client";

import { useState } from "react";
import { X, Percent, DollarSign, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface BulkPricingModalProps {
  plans: any[];
  onClose: () => void;
  onSuccess: () => void;
  config: any;
  translations: any;
}

export default function BulkPricingModal({
  plans,
  onClose,
  onSuccess,
  config,
  translations,
}: BulkPricingModalProps) {
  const t = translations;
  const supabase = createClient();
  const [markupType, setMarkupType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [markupValue, setMarkupValue] = useState<string>("0");
  const [applyTo, setApplyTo] = useState<"all" | "category" | "network">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const currencySymbol = config.currencySymbol || "₦";

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getCategories = () => {
    return [...new Set(plans.map((p) => p.category))];
  };

  const getNetworks = () => {
    return [...new Set(plans.map((p) => p.network).filter(Boolean))];
  };

  const getFilteredPlans = () => {
    let filtered = plans;
    if (applyTo === "category" && selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    if (applyTo === "network" && selectedNetwork) {
      filtered = filtered.filter((p) => p.network === selectedNetwork);
    }
    return filtered;
  };

  const calculateSellingPrice = (basePrice: number) => {
    const value = parseFloat(markupValue) || 0;
    if (markupType === "percentage") {
      return Math.round(basePrice * (1 + value / 100));
    } else {
      return Math.round(basePrice + value);
    }
  };

  const handleSubmit = async () => {
    const value = parseFloat(markupValue);
    if (isNaN(value) || value < 0) return;

    const filteredPlans = getFilteredPlans();
    if (filteredPlans.length === 0) return;

    setIsLoading(true);
    try {
      const updates = filteredPlans.map((plan) => {
        const newSellingPrice = calculateSellingPrice(plan.base_price);
        return {
          id: plan.id,
          markup_type: markupType,
          markup_value: value,
          selling_price: newSellingPrice,
        };
      });

      // Update each plan
      for (const update of updates) {
        const { error } = await supabase
          .from("global_plans")
          .update({
            markup_type: update.markup_type,
            markup_value: update.markup_value,
            selling_price: update.selling_price,
            updated_at: new Date().toISOString(),
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Bulk update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPlans = getFilteredPlans();
  const affectedCount = filteredPlans.length;

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
          {t?.bulkPricing || "Bulk Pricing Update"}
        </h2>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {t?.bulkPricingDescription ||
            "Apply pricing changes to multiple plans at once."}
        </p>

        {/* Apply To */}
        <div style={{ marginBottom: "1rem" }}>
          <p
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--muted)",
              marginBottom: "0.5rem",
            }}
          >
            {t?.applyTo || "Apply To"}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setApplyTo("all")}
              style={{
                padding: "0.4rem 1rem",
                background:
                  applyTo === "all" ? "var(--brand-color)" : "var(--bg2)",
                color: applyTo === "all" ? "#FDF8F3" : "var(--text)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: applyTo === "all" ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              {t?.allPlans || "All Plans"}
            </button>
            <button
              onClick={() => setApplyTo("category")}
              style={{
                padding: "0.4rem 1rem",
                background:
                  applyTo === "category" ? "var(--brand-color)" : "var(--bg2)",
                color: applyTo === "category" ? "#FDF8F3" : "var(--text)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: applyTo === "category" ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              {t?.category || "Category"}
            </button>
            <button
              onClick={() => setApplyTo("network")}
              style={{
                padding: "0.4rem 1rem",
                background:
                  applyTo === "network" ? "var(--brand-color)" : "var(--bg2)",
                color: applyTo === "network" ? "#FDF8F3" : "var(--text)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: applyTo === "network" ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              {t?.network || "Network"}
            </button>
          </div>
        </div>

        {/* Category/Network Selection */}
        {applyTo === "category" && (
          <div style={{ marginBottom: "1rem" }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 1rem",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            >
              <option value="">{t?.selectCategory || "Select Category"}</option>
              {getCategories().map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {applyTo === "network" && (
          <div style={{ marginBottom: "1rem" }}>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 1rem",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            >
              <option value="">{t?.selectNetwork || "Select Network"}</option>
              {getNetworks().map((net) => (
                <option key={net} value={net}>
                  {net}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Affected Count */}
        <div
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.5rem 1rem",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            {t?.plansAffected || "Plans Affected"}
          </span>
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            {affectedCount}
          </span>
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
                padding: "0.5rem 1rem",
                background:
                  markupType === "percentage"
                    ? "var(--brand-color)"
                    : "var(--bg2)",
                color: markupType === "percentage" ? "#FDF8F3" : "var(--text)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
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
                padding: "0.5rem 1rem",
                background:
                  markupType === "fixed" ? "var(--brand-color)" : "var(--bg2)",
                color: markupType === "fixed" ? "#FDF8F3" : "var(--text)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
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
              borderRadius: 8,
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
                    padding: "0.6rem 1rem",
                    background: "transparent",
                    border: "none",
                    color: "var(--text)",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
                <span
                  style={{
                    padding: "0.6rem 1rem",
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
                    padding: "0.6rem 1rem",
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
                    padding: "0.6rem 1rem",
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
        {filteredPlans.length > 0 && filteredPlans.length <= 5 && (
          <div
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              {t?.preview || "Preview"}
            </p>
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.25rem 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.8rem",
                }}
              >
                <span style={{ color: "var(--text)" }}>{plan.name}</span>
                <span style={{ color: "var(--muted)" }}>
                  {currencySymbol} {plan.base_price?.toLocaleString()} →{" "}
                  {currencySymbol}{" "}
                  {calculateSellingPrice(plan.base_price).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={
            isLoading ||
            affectedCount === 0 ||
            (applyTo === "category" && !selectedCategory) ||
            (applyTo === "network" && !selectedNetwork) ||
            !markupValue ||
            parseFloat(markupValue) <= 0
          }
          style={{
            width: "100%",
            padding: "0.75rem",
            background:
              isLoading || affectedCount === 0
                ? "var(--bg2)"
                : "var(--brand-color)",
            color: isLoading || affectedCount === 0 ? "var(--dim)" : "#FDF8F3",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "1rem",
            cursor:
              isLoading || affectedCount === 0 ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {isLoading
            ? t?.saving || "Saving..."
            : affectedCount === 0
              ? t?.noPlansSelected || "No plans selected"
              : t?.applyToAll ||
                `Apply to ${affectedCount} plan${affectedCount > 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
