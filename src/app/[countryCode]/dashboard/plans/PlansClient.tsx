// src/app/[countryCode]/dashboard/plans/PlansClient.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Check,
  X,
  Loader2,
  Pencil,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { getPlans } from "@/actions/reseller/plans/getPlans";
import { togglePlan } from "@/actions/reseller/plans/togglePlan";
import { updatePlanConfig } from "@/actions/reseller/plans/updatePlanConfig";
import { bulkUpdatePlans } from "@/actions/reseller/plans/bulkUpdatePlans";
import { CountryConfig } from "@/config/countries";
import { PlanWithConfig } from "@/types/reseller/plans";

interface PlansClientProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  initialData: {
    plans: PlanWithConfig[];
    networks: string[];
  };
}

export default function PlansClient({
  countryCode,
  config,
  translations,
  initialData,
}: PlansClientProps) {
  const t = translations;
  const [plansData, setPlansData] = useState<PlanWithConfig[]>(
    initialData.plans,
  );
  const [activeNetwork, setActiveNetwork] = useState<string>(
    initialData.networks.length > 0 ? initialData.networks[0] : "",
  );
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editType, setEditType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [editValue, setEditValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [bulkType, setBulkType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [bulkValue, setBulkValue] = useState(20);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkScope, setBulkScope] = useState<"network" | "all">("network");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currencySymbol = config.currencySymbol || "₦";

  const formatPrice = (amount: number) => {
    return `${currencySymbol} ${amount?.toLocaleString() || 0}`;
  };

  const networks = initialData.networks || [];

  // Filter plans by active network
  const plans = useMemo(
    () => plansData.filter((p) => p.network === activeNetwork),
    [plansData, activeNetwork],
  );

  const refreshPlans = async () => {
    setIsLoading(true);
    try {
      const result = await getPlans({ network: activeNetwork });
      if (result.success && result.data) {
        // Merge with existing plans to preserve all networks
        const otherPlans = plansData.filter((p) => p.network !== activeNetwork);
        setPlansData([...otherPlans, ...(result.data || [])]);
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (planId: string, enabled: boolean) => {
    // Optimistic update
    setPlansData((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, config: p.config ? { ...p.config, enabled } : null }
          : p,
      ),
    );

    const result = await togglePlan(planId);
    if (!result.success) {
      // Revert on error
      setPlansData((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                config: p.config ? { ...p.config, enabled: !enabled } : null,
              }
            : p,
        ),
      );
      setMessage({
        type: "error",
        text: result.error || "Failed to toggle plan",
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const startEdit = (plan: PlanWithConfig) => {
    setEditingPlan(plan.id);
    setEditType(plan.config?.markup_type || "percentage");
    setEditValue(plan.config?.markup_value || 0);
  };

  const cancelEdit = () => {
    setEditingPlan(null);
  };

  const saveEdit = async (planId: string) => {
    setSaving(true);
    const result = await updatePlanConfig({
      planId,
      markupType: editType,
      markupValue: editValue,
    });

    if (result.success) {
      setPlansData((prev) =>
        prev.map((p) => {
          if (p.id === planId) {
            const basePrice = p.base_price;
            const sellingPrice =
              editType === "percentage"
                ? Math.round(basePrice * (1 + editValue / 100))
                : Math.round(basePrice + editValue);
            return {
              ...p,
              config: p.config
                ? {
                    ...p.config,
                    markup_type: editType,
                    markup_value: editValue,
                    selling_price: sellingPrice,
                  }
                : null,
              profit: sellingPrice - basePrice,
              profit_percent:
                basePrice > 0
                  ? ((sellingPrice - basePrice) / basePrice) * 100
                  : 0,
            };
          }
          return p;
        }),
      );
      setEditingPlan(null);
      setMessage({
        type: "success",
        text: t?.saveSuccess || "Plan updated successfully",
      });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to update plan",
      });
    }
    setSaving(false);
  };

  const handleBulkUpdate = async () => {
    setBulkSaving(true);
    setMessage(null);

    const result = await bulkUpdatePlans({
      network: bulkScope === "network" ? activeNetwork : undefined,
      markupType: bulkType,
      markupValue: bulkValue,
    });

    if (result.success) {
      await refreshPlans();
      setMessage({
        type: "success",
        text: `${result.count || 0} plans updated to ${
          bulkType === "percentage" ? `${bulkValue}%` : formatPrice(bulkValue)
        } markup`,
      });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to update plans",
      });
    }
    setBulkSaving(false);
  };

  const getNetworkCount = (network: string) => {
    return plansData.filter((p) => p.network === network).length;
  };

  // Set initial network if none selected and networks exist
  useEffect(() => {
    if (!activeNetwork && networks.length > 0) {
      setActiveNetwork(networks[0]);
    }
  }, [networks, activeNetwork]);

  // Count total plans
  const totalPlans = plansData.length;
  const enabledPlans = plansData.filter(
    (p) => p.config?.enabled !== false,
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "0.3rem",
          }}
        >
          {t?.title || "Plan Management"}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          {t?.subtitle ||
            "Toggle plans on/off and set your markup for each network"}
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              textTransform: "uppercase",
            }}
          >
            {t?.totalPlans || "Total Plans"}
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            {totalPlans}
          </p>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              textTransform: "uppercase",
            }}
          >
            {t?.networks || "Networks"}
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            {networks.length}
          </p>
        </div>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              textTransform: "uppercase",
            }}
          >
            {t?.activePlans || "Active Plans"}
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#6EBD8A",
            }}
          >
            {enabledPlans}
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: "0.9rem 1.2rem",
            borderRadius: 10,
            background:
              message.type === "success"
                ? "rgba(110,189,138,0.1)"
                : "rgba(239,68,68,0.1)",
            border:
              message.type === "success"
                ? "1px solid rgba(110,189,138,0.25)"
                : "1px solid rgba(239,68,68,0.25)",
            color: message.type === "success" ? "#6EBD8A" : "#F87171",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {message.type === "success" ? (
            <Check size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          {message.text}
        </div>
      )}

      {/* Bulk Update */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "1.25rem",
        }}
      >
        <h3
          style={{
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "1rem",
            fontSize: "0.95rem",
          }}
        >
          {t?.bulkPricing || "Bulk Update Markup"}
        </h3>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div>
            <label style={labelStyle}>{t?.applyTo || "Apply To"}</label>
            <select
              value={bulkScope}
              onChange={(e) =>
                setBulkScope(e.target.value as "network" | "all")
              }
              style={selectStyle}
            >
              <option value="network">
                {t?.onlyNetwork
                  ? t.onlyNetwork.replace("{network}", activeNetwork)
                  : `Only ${activeNetwork}`}
              </option>
              <option value="all">{t?.allNetworks || "All Networks"}</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t?.markupType || "Markup Type"}</label>
            <select
              value={bulkType}
              onChange={(e) =>
                setBulkType(e.target.value as "percentage" | "fixed")
              }
              style={selectStyle}
            >
              <option value="percentage">
                {t?.percentage || "Percentage (%)"}
              </option>
              <option value="fixed">
                {t?.fixed || `Fixed Amount (${currencySymbol})`}
              </option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t?.markupValue || "Value"}</label>
            <input
              type="number"
              value={bulkValue}
              onChange={(e) => setBulkValue(Number(e.target.value))}
              style={inputStyle}
              min="0"
              step={bulkType === "percentage" ? "1" : "10"}
            />
          </div>
          <button
            onClick={handleBulkUpdate}
            disabled={bulkSaving}
            style={btnPrimaryStyle}
          >
            {bulkSaving ? (
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <RotateCcw size={16} />
            )}
            {t?.apply || "Apply"}
          </button>
        </div>
      </div>

      {/* Network Tabs */}
      {networks.length > 0 ? (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {networks.map((net) => (
            <button
              key={net}
              onClick={() => {
                setActiveNetwork(net);
                setEditingPlan(null);
                refreshPlans();
              }}
              style={{
                ...tabStyle,
                background:
                  activeNetwork === net ? "var(--brand-color)" : "var(--bg2)",
                color: activeNetwork === net ? "#FDF8F3" : "var(--muted)",
                border:
                  activeNetwork === net ? "none" : "1px solid var(--border)",
              }}
            >
              {net}
              <span
                style={{
                  fontSize: "0.7rem",
                  opacity: 0.7,
                  marginLeft: 4,
                }}
              >
                ({getNetworkCount(net)})
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            color: "var(--dim)",
            background: "var(--bg2)",
            borderRadius: 12,
          }}
        >
          <p>{t?.noPlans || "No networks available"}</p>
        </div>
      )}

      {/* Plans List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {isLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--dim)",
            }}
          >
            <Loader2
              size={24}
              style={{ animation: "spin 1s linear infinite" }}
            />
            <p style={{ marginTop: "0.5rem" }}>
              {t?.loading || "Loading plans..."}
            </p>
          </div>
        ) : plans.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--dim)",
            }}
          >
            <p>{t?.noPlans || `No ${activeNetwork} plans available`}</p>
          </div>
        ) : (
          plans.map((plan) => {
            const isEditing = editingPlan === plan.id;
            const isEnabled = plan.config?.enabled !== false;
            const sellingPrice = plan.config?.selling_price || plan.base_price;
            const profit = sellingPrice - plan.base_price;
            const profitPercent =
              plan.base_price > 0
                ? Math.round((profit / plan.base_price) * 100)
                : 0;

            const editSellingPrice = isEditing
              ? editType === "percentage"
                ? Math.round(plan.base_price * (1 + editValue / 100))
                : Math.round(plan.base_price + editValue)
              : sellingPrice;

            const editProfit = isEditing
              ? editSellingPrice - plan.base_price
              : profit;

            return (
              <div
                key={plan.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "1rem 1.25rem",
                  opacity: isEnabled ? 1 : 0.55,
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  {/* Plan Info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          fontWeight: 600,
                          color: "var(--text)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {plan.name}
                      </h3>
                      {plan.data_amount && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--dim)",
                            background: "var(--bg2)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: 4,
                          }}
                        >
                          {plan.data_amount}
                        </span>
                      )}
                      {plan.validity && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--dim)",
                            background: "var(--bg2)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: 4,
                          }}
                        >
                          {plan.validity}
                        </span>
                      )}
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(plan.id, !isEnabled)}
                        style={{
                          width: 40,
                          height: 22,
                          borderRadius: 11,
                          border: "none",
                          background: isEnabled ? "#6EBD8A" : "var(--dim)",
                          position: "relative",
                          cursor: "pointer",
                          flexShrink: 0,
                          transition: "background 0.15s",
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#fff",
                            position: "absolute",
                            top: 2,
                            left: isEnabled ? 20 : 2,
                            transition: "left 0.15s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        />
                      </button>
                      {!isEnabled && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            color: "#F87171",
                            background: "rgba(239,68,68,0.1)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: 4,
                          }}
                        >
                          {t?.inactive || "Hidden"}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "var(--dim)" }}>
                      {t?.wholesalePrice || "Cost"}:{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {formatPrice(plan.base_price)}
                      </strong>
                      {plan.provider && ` • ${plan.provider}`}
                    </p>
                  </div>

                  {/* Editing or Display */}
                  {isEditing ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                        background: "var(--bg2)",
                        padding: "0.4rem 0.75rem",
                        borderRadius: 8,
                      }}
                    >
                      <select
                        value={editType}
                        onChange={(e) =>
                          setEditType(e.target.value as "percentage" | "fixed")
                        }
                        style={smallSelectStyle}
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">{currencySymbol}</option>
                      </select>
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(Number(e.target.value))}
                        style={{ ...smallInputStyle, width: 70 }}
                        min="0"
                        step={editType === "percentage" ? "1" : "10"}
                      />
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--dim)",
                          minWidth: 80,
                          textAlign: "center",
                        }}
                      >
                        <div>
                          {t?.yourPrice || "Sell"}:{" "}
                          <strong style={{ color: "var(--brand-color)" }}>
                            {formatPrice(editSellingPrice)}
                          </strong>
                        </div>
                        <div>
                          {t?.profit || "Profit"}:{" "}
                          <strong style={{ color: "#6EBD8A" }}>
                            {formatPrice(editProfit)}
                          </strong>
                        </div>
                      </div>
                      <button
                        onClick={() => saveEdit(plan.id)}
                        disabled={saving}
                        style={btnSaveStyle}
                      >
                        {saving ? (
                          <Loader2
                            size={14}
                            style={{ animation: "spin 1s linear infinite" }}
                          />
                        ) : (
                          <Check size={14} />
                        )}
                        {t?.save || "Save"}
                      </button>
                      <button onClick={cancelEdit} style={btnCancelStyle}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ textAlign: "center", minWidth: 60 }}>
                        <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
                          {t?.markup || "Markup"}
                        </p>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {plan.config?.markup_type === "percentage"
                            ? `${plan.config?.markup_value || 0}%`
                            : formatPrice(plan.config?.markup_value || 0)}
                        </p>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 80 }}>
                        <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
                          {t?.yourPrice || "Your Price"}
                        </p>
                        <p
                          style={{
                            fontSize: "1rem",
                            fontWeight: 700,
                            color: "var(--brand-color)",
                          }}
                        >
                          {formatPrice(sellingPrice)}
                        </p>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 60 }}>
                        <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
                          {t?.profit || "Profit"}
                        </p>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: profit > 0 ? "#6EBD8A" : "var(--dim)",
                          }}
                        >
                          {formatPrice(profit)}
                          <span
                            style={{
                              fontSize: "0.6rem",
                              fontWeight: 400,
                              color: "var(--dim)",
                              marginLeft: 2,
                            }}
                          >
                            ({profitPercent}%)
                          </span>
                        </p>
                      </div>
                      {isEnabled && (
                        <button
                          onClick={() => startEdit(plan)}
                          style={btnIconStyle}
                          title={t?.edit || "Edit markup"}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// Styles
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  background: "var(--bg2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: "0.85rem",
  outline: "none",
  fontFamily: "inherit",
  width: 100,
};

const smallInputStyle: React.CSSProperties = {
  padding: "0.35rem 0.5rem",
  background: "var(--bg2)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "0.8rem",
  outline: "none",
  fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  width: "auto",
};

const smallSelectStyle: React.CSSProperties = {
  ...smallInputStyle,
  cursor: "pointer",
  width: 50,
};

const tabStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: 8,
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  fontFamily: "inherit",
  transition: "all 0.15s",
  display: "inline-flex",
  alignItems: "center",
};

const btnPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "0.55rem 1.2rem",
  background: "var(--brand-color)",
  border: "none",
  borderRadius: 8,
  color: "#FDF8F3",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnSaveStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "0.3rem 0.7rem",
  background: "#6EBD8A",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnCancelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.3rem",
  background: "transparent",
  border: "none",
  borderRadius: 6,
  color: "var(--dim)",
  cursor: "pointer",
};

const btnIconStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.4rem",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--muted)",
  cursor: "pointer",
};

// // src/app/[countryCode]/dashboard/plans/PlansClient.tsx
// "use client";

// import { useState, useEffect, useMemo } from "react";
// import {
//   Check,
//   X,
//   Loader2,
//   Pencil,
//   RotateCcw,
//   AlertTriangle,
// } from "lucide-react";
// import { getPlans } from "@/actions/reseller/plans/getPlans";
// import { togglePlan } from "@/actions/reseller/plans/togglePlan";
// import { updatePlanConfig } from "@/actions/reseller/plans/updatePlanConfig";
// import { bulkUpdatePlans } from "@/actions/reseller/plans/bulkUpdatePlans";
// import { CountryConfig } from "@/config/countries";
// import { PlanWithConfig } from "@/types/reseller/plans";

// interface PlansClientProps {
//   countryCode: string;
//   config: CountryConfig;
//   translations: any;
//   initialData: {
//     plans: PlanWithConfig[];
//     networks: string[];
//   };
// }

// export default function PlansClient({
//   countryCode,
//   config,
//   translations,
//   initialData,
// }: PlansClientProps) {
//   const t = translations;
//   const [plansData, setPlansData] = useState<PlanWithConfig[]>(
//     initialData.plans,
//   );
//   const [activeNetwork, setActiveNetwork] = useState<string>(
//     initialData.networks.length > 0 ? initialData.networks[0] : "",
//   );
//   const [editingPlan, setEditingPlan] = useState<string | null>(null);
//   const [editType, setEditType] = useState<"percentage" | "fixed">(
//     "percentage",
//   );
//   const [editValue, setEditValue] = useState(0);
//   const [saving, setSaving] = useState(false);
//   const [bulkType, setBulkType] = useState<"percentage" | "fixed">(
//     "percentage",
//   );
//   const [bulkValue, setBulkValue] = useState(20);
//   const [bulkSaving, setBulkSaving] = useState(false);
//   const [bulkScope, setBulkScope] = useState<"network" | "all">("network");
//   const [message, setMessage] = useState<{
//     type: "success" | "error";
//     text: string;
//   } | null>(null);
//   const [isLoading, setIsLoading] = useState(false);

//   const currencySymbol = config.currencySymbol || "₦";

//   const formatPrice = (amount: number) => {
//     return `${currencySymbol} ${amount?.toLocaleString() || 0}`;
//   };

//   const networks = initialData.networks || [];

//   // Filter plans by active network
//   const plans = useMemo(
//     () => plansData.filter((p) => p.network === activeNetwork),
//     [plansData, activeNetwork],
//   );

//   const refreshPlans = async () => {
//     setIsLoading(true);
//     try {
//       const result = await getPlans({ network: activeNetwork });
//       if (result.success && result.data) {
//         // Merge with existing plans to preserve all networks
//         const otherPlans = plansData.filter((p) => p.network !== activeNetwork);
//         setPlansData([...otherPlans, ...(result.data || [])]);
//       }
//     } catch (error) {
//       console.error("Refresh error:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleToggle = async (planId: string, enabled: boolean) => {
//     // Optimistic update
//     setPlansData((prev) =>
//       prev.map((p) =>
//         p.id === planId
//           ? { ...p, config: p.config ? { ...p.config, enabled } : null }
//           : p,
//       ),
//     );

//     const result = await togglePlan(planId);
//     if (!result.success) {
//       // Revert on error
//       setPlansData((prev) =>
//         prev.map((p) =>
//           p.id === planId
//             ? {
//                 ...p,
//                 config: p.config ? { ...p.config, enabled: !enabled } : null,
//               }
//             : p,
//         ),
//       );
//       setMessage({
//         type: "error",
//         text: result.error || "Failed to toggle plan",
//       });
//       setTimeout(() => setMessage(null), 3000);
//     }
//   };

//   const startEdit = (plan: PlanWithConfig) => {
//     setEditingPlan(plan.id);
//     setEditType(plan.config?.markup_type || "percentage");
//     setEditValue(plan.config?.markup_value || 0);
//   };

//   const cancelEdit = () => {
//     setEditingPlan(null);
//   };

//   const saveEdit = async (planId: string) => {
//     setSaving(true);
//     const result = await updatePlanConfig({
//       planId,
//       markupType: editType,
//       markupValue: editValue,
//     });

//     if (result.success) {
//       setPlansData((prev) =>
//         prev.map((p) => {
//           if (p.id === planId) {
//             const basePrice = p.base_price;
//             const sellingPrice =
//               editType === "percentage"
//                 ? Math.round(basePrice * (1 + editValue / 100))
//                 : Math.round(basePrice + editValue);
//             return {
//               ...p,
//               config: p.config
//                 ? {
//                     ...p.config,
//                     markup_type: editType,
//                     markup_value: editValue,
//                     selling_price: sellingPrice,
//                   }
//                 : null,
//               profit: sellingPrice - basePrice,
//               profit_percent:
//                 basePrice > 0
//                   ? ((sellingPrice - basePrice) / basePrice) * 100
//                   : 0,
//             };
//           }
//           return p;
//         }),
//       );
//       setEditingPlan(null);
//       setMessage({
//         type: "success",
//         text: t?.saveSuccess || "Plan updated successfully",
//       });
//       setTimeout(() => setMessage(null), 3000);
//     } else {
//       setMessage({
//         type: "error",
//         text: result.error || "Failed to update plan",
//       });
//     }
//     setSaving(false);
//   };

//   const handleBulkUpdate = async () => {
//     setBulkSaving(true);
//     setMessage(null);

//     const result = await bulkUpdatePlans({
//       network: bulkScope === "network" ? activeNetwork : undefined,
//       markupType: bulkType,
//       markupValue: bulkValue,
//     });

//     if (result.success) {
//       await refreshPlans();
//       setMessage({
//         type: "success",
//         text: `${result.count || 0} plans updated to ${
//           bulkType === "percentage" ? `${bulkValue}%` : formatPrice(bulkValue)
//         } markup`,
//       });
//       setTimeout(() => setMessage(null), 3000);
//     } else {
//       setMessage({
//         type: "error",
//         text: result.error || "Failed to update plans",
//       });
//     }
//     setBulkSaving(false);
//   };

//   const getNetworkCount = (network: string) => {
//     return plansData.filter((p) => p.network === network).length;
//   };

//   // Set initial network if none selected and networks exist
//   useEffect(() => {
//     if (!activeNetwork && networks.length > 0) {
//       setActiveNetwork(networks[0]);
//     }
//   }, [networks, activeNetwork]);

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
//       {/* Header */}
//       <div>
//         <h1
//           style={{
//             fontFamily: "'Playfair Display', serif",
//             fontSize: "1.8rem",
//             fontWeight: 700,
//             color: "var(--text)",
//             marginBottom: "0.3rem",
//           }}
//         >
//           {t?.title || "Plan Management"}
//         </h1>
//         <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
//           {t?.subtitle ||
//             "Toggle plans on/off and set your markup for each network"}
//         </p>
//       </div>

//       {/* Message */}
//       {message && (
//         <div
//           style={{
//             padding: "0.9rem 1.2rem",
//             borderRadius: 10,
//             background:
//               message.type === "success"
//                 ? "rgba(110,189,138,0.1)"
//                 : "rgba(239,68,68,0.1)",
//             border:
//               message.type === "success"
//                 ? "1px solid rgba(110,189,138,0.25)"
//                 : "1px solid rgba(239,68,68,0.25)",
//             color: message.type === "success" ? "#6EBD8A" : "#F87171",
//             fontSize: "0.88rem",
//             display: "flex",
//             alignItems: "center",
//             gap: 8,
//           }}
//         >
//           {message.type === "success" ? (
//             <Check size={16} />
//           ) : (
//             <AlertTriangle size={16} />
//           )}
//           {message.text}
//         </div>
//       )}

//       {/* Bulk Update */}
//       <div
//         style={{
//           background: "var(--card)",
//           border: "1px solid var(--border)",
//           borderRadius: 12,
//           padding: "1.25rem",
//         }}
//       >
//         <h3
//           style={{
//             fontWeight: 600,
//             color: "var(--text)",
//             marginBottom: "1rem",
//             fontSize: "0.95rem",
//           }}
//         >
//           {t?.bulkPricing || "Bulk Update Markup"}
//         </h3>
//         <div
//           style={{
//             display: "flex",
//             gap: "0.75rem",
//             alignItems: "flex-end",
//             flexWrap: "wrap",
//           }}
//         >
//           <div>
//             <label style={labelStyle}>{t?.applyTo || "Apply To"}</label>
//             <select
//               value={bulkScope}
//               onChange={(e) =>
//                 setBulkScope(e.target.value as "network" | "all")
//               }
//               style={selectStyle}
//             >
//               <option value="network">
//                 {t?.onlyNetwork
//                   ? t.onlyNetwork.replace("{network}", activeNetwork)
//                   : `Only ${activeNetwork}`}
//               </option>
//               <option value="all">{t?.allNetworks || "All Networks"}</option>
//             </select>
//           </div>
//           <div>
//             <label style={labelStyle}>{t?.markupType || "Markup Type"}</label>
//             <select
//               value={bulkType}
//               onChange={(e) =>
//                 setBulkType(e.target.value as "percentage" | "fixed")
//               }
//               style={selectStyle}
//             >
//               <option value="percentage">
//                 {t?.percentage || "Percentage (%)"}
//               </option>
//               <option value="fixed">
//                 {t?.fixed || `Fixed Amount (${currencySymbol})`}
//               </option>
//             </select>
//           </div>
//           <div>
//             <label style={labelStyle}>{t?.markupValue || "Value"}</label>
//             <input
//               type="number"
//               value={bulkValue}
//               onChange={(e) => setBulkValue(Number(e.target.value))}
//               style={inputStyle}
//               min="0"
//               step={bulkType === "percentage" ? "1" : "10"}
//             />
//           </div>
//           <button
//             onClick={handleBulkUpdate}
//             disabled={bulkSaving}
//             style={btnPrimaryStyle}
//           >
//             {bulkSaving ? (
//               <Loader2
//                 size={16}
//                 style={{ animation: "spin 1s linear infinite" }}
//               />
//             ) : (
//               <RotateCcw size={16} />
//             )}
//             {t?.apply || "Apply"}
//           </button>
//         </div>
//       </div>

//       {/* Network Tabs */}
//       {networks.length > 0 ? (
//         <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
//           {networks.map((net) => (
//             <button
//               key={net}
//               onClick={() => {
//                 setActiveNetwork(net);
//                 setEditingPlan(null);
//                 refreshPlans();
//               }}
//               style={{
//                 ...tabStyle,
//                 background:
//                   activeNetwork === net ? "var(--brand-color)" : "var(--bg2)",
//                 color: activeNetwork === net ? "#FDF8F3" : "var(--muted)",
//                 border:
//                   activeNetwork === net ? "none" : "1px solid var(--border)",
//               }}
//             >
//               {net}
//               <span
//                 style={{
//                   fontSize: "0.7rem",
//                   opacity: 0.7,
//                   marginLeft: 4,
//                 }}
//               >
//                 ({getNetworkCount(net)})
//               </span>
//             </button>
//           ))}
//         </div>
//       ) : (
//         <div
//           style={{
//             textAlign: "center",
//             padding: "2rem",
//             color: "var(--dim)",
//             background: "var(--bg2)",
//             borderRadius: 12,
//           }}
//         >
//           <p>{t?.noPlans || "No networks available"}</p>
//         </div>
//       )}

//       {/* Plans List */}
//       <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
//         {isLoading ? (
//           <div
//             style={{
//               textAlign: "center",
//               padding: "2rem",
//               color: "var(--dim)",
//             }}
//           >
//             <Loader2
//               size={24}
//               style={{ animation: "spin 1s linear infinite" }}
//             />
//             <p style={{ marginTop: "0.5rem" }}>
//               {t?.loading || "Loading plans..."}
//             </p>
//           </div>
//         ) : plans.length === 0 ? (
//           <div
//             style={{
//               textAlign: "center",
//               padding: "3rem",
//               background: "var(--card)",
//               border: "1px solid var(--border)",
//               borderRadius: 12,
//               color: "var(--dim)",
//             }}
//           >
//             <p>{t?.noPlans || `No ${activeNetwork} plans available`}</p>
//           </div>
//         ) : (
//           plans.map((plan) => {
//             const isEditing = editingPlan === plan.id;
//             const isEnabled = plan.config?.enabled ?? false;
//             const sellingPrice = plan.config?.selling_price || plan.base_price;
//             const profit = sellingPrice - plan.base_price;
//             const profitPercent =
//               plan.base_price > 0
//                 ? Math.round((profit / plan.base_price) * 100)
//                 : 0;

//             const editSellingPrice = isEditing
//               ? editType === "percentage"
//                 ? Math.round(plan.base_price * (1 + editValue / 100))
//                 : Math.round(plan.base_price + editValue)
//               : sellingPrice;

//             const editProfit = isEditing
//               ? editSellingPrice - plan.base_price
//               : profit;

//             return (
//               <div
//                 key={plan.id}
//                 style={{
//                   background: "var(--card)",
//                   border: "1px solid var(--border)",
//                   borderRadius: 12,
//                   padding: "1rem 1.25rem",
//                   opacity: isEnabled ? 1 : 0.55,
//                   transition: "all 0.2s",
//                 }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "space-between",
//                     flexWrap: "wrap",
//                     gap: "0.75rem",
//                   }}
//                 >
//                   {/* Plan Info */}
//                   <div style={{ flex: 1, minWidth: 180 }}>
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "0.75rem",
//                         flexWrap: "wrap",
//                       }}
//                     >
//                       <h3
//                         style={{
//                           fontWeight: 600,
//                           color: "var(--text)",
//                           fontSize: "0.95rem",
//                         }}
//                       >
//                         {plan.name}
//                       </h3>
//                       {plan.data_amount && (
//                         <span
//                           style={{
//                             fontSize: "0.7rem",
//                             color: "var(--dim)",
//                             background: "var(--bg2)",
//                             padding: "0.15rem 0.5rem",
//                             borderRadius: 4,
//                           }}
//                         >
//                           {plan.data_amount}
//                         </span>
//                       )}
//                       {plan.validity && (
//                         <span
//                           style={{
//                             fontSize: "0.7rem",
//                             color: "var(--dim)",
//                             background: "var(--bg2)",
//                             padding: "0.15rem 0.5rem",
//                             borderRadius: 4,
//                           }}
//                         >
//                           {plan.validity}
//                         </span>
//                       )}
//                       {/* Toggle */}
//                       <button
//                         onClick={() => handleToggle(plan.id, !isEnabled)}
//                         style={{
//                           width: 40,
//                           height: 22,
//                           borderRadius: 11,
//                           border: "none",
//                           background: isEnabled ? "#6EBD8A" : "var(--dim)",
//                           position: "relative",
//                           cursor: "pointer",
//                           flexShrink: 0,
//                           transition: "background 0.15s",
//                         }}
//                       >
//                         <div
//                           style={{
//                             width: 18,
//                             height: 18,
//                             borderRadius: "50%",
//                             background: "#fff",
//                             position: "absolute",
//                             top: 2,
//                             left: isEnabled ? 20 : 2,
//                             transition: "left 0.15s",
//                             boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
//                           }}
//                         />
//                       </button>
//                       {!isEnabled && (
//                         <span
//                           style={{
//                             fontSize: "0.65rem",
//                             color: "#F87171",
//                             background: "rgba(239,68,68,0.1)",
//                             padding: "0.15rem 0.5rem",
//                             borderRadius: 4,
//                           }}
//                         >
//                           {t?.inactive || "Hidden"}
//                         </span>
//                       )}
//                     </div>
//                     <p style={{ fontSize: "0.78rem", color: "var(--dim)" }}>
//                       {t?.wholesalePrice || "Cost"}:{" "}
//                       <strong style={{ color: "var(--text)" }}>
//                         {formatPrice(plan.base_price)}
//                       </strong>
//                       {plan.provider && ` • ${plan.provider}`}
//                     </p>
//                   </div>

//                   {/* Editing or Display */}
//                   {isEditing ? (
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "0.5rem",
//                         flexWrap: "wrap",
//                         background: "var(--bg2)",
//                         padding: "0.4rem 0.75rem",
//                         borderRadius: 8,
//                       }}
//                     >
//                       <select
//                         value={editType}
//                         onChange={(e) =>
//                           setEditType(e.target.value as "percentage" | "fixed")
//                         }
//                         style={smallSelectStyle}
//                       >
//                         <option value="percentage">%</option>
//                         <option value="fixed">{currencySymbol}</option>
//                       </select>
//                       <input
//                         type="number"
//                         value={editValue}
//                         onChange={(e) => setEditValue(Number(e.target.value))}
//                         style={{ ...smallInputStyle, width: 70 }}
//                         min="0"
//                         step={editType === "percentage" ? "1" : "10"}
//                       />
//                       <div
//                         style={{
//                           fontSize: "0.75rem",
//                           color: "var(--dim)",
//                           minWidth: 80,
//                           textAlign: "center",
//                         }}
//                       >
//                         <div>
//                           {t?.yourPrice || "Sell"}:{" "}
//                           <strong style={{ color: "var(--brand-color)" }}>
//                             {formatPrice(editSellingPrice)}
//                           </strong>
//                         </div>
//                         <div>
//                           {t?.profit || "Profit"}:{" "}
//                           <strong style={{ color: "#6EBD8A" }}>
//                             {formatPrice(editProfit)}
//                           </strong>
//                         </div>
//                       </div>
//                       <button
//                         onClick={() => saveEdit(plan.id)}
//                         disabled={saving}
//                         style={btnSaveStyle}
//                       >
//                         {saving ? (
//                           <Loader2
//                             size={14}
//                             style={{ animation: "spin 1s linear infinite" }}
//                           />
//                         ) : (
//                           <Check size={14} />
//                         )}
//                         {t?.save || "Save"}
//                       </button>
//                       <button onClick={cancelEdit} style={btnCancelStyle}>
//                         <X size={14} />
//                       </button>
//                     </div>
//                   ) : (
//                     <div
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         gap: "1.5rem",
//                         flexWrap: "wrap",
//                       }}
//                     >
//                       <div style={{ textAlign: "center", minWidth: 60 }}>
//                         <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
//                           {t?.markup || "Markup"}
//                         </p>
//                         <p
//                           style={{
//                             fontSize: "0.85rem",
//                             fontWeight: 600,
//                             color: "var(--text)",
//                           }}
//                         >
//                           {plan.config?.markup_type === "percentage"
//                             ? `${plan.config?.markup_value || 0}%`
//                             : formatPrice(plan.config?.markup_value || 0)}
//                         </p>
//                       </div>
//                       <div style={{ textAlign: "center", minWidth: 80 }}>
//                         <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
//                           {t?.yourPrice || "Your Price"}
//                         </p>
//                         <p
//                           style={{
//                             fontSize: "1rem",
//                             fontWeight: 700,
//                             color: "var(--brand-color)",
//                           }}
//                         >
//                           {formatPrice(sellingPrice)}
//                         </p>
//                       </div>
//                       <div style={{ textAlign: "center", minWidth: 60 }}>
//                         <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
//                           {t?.profit || "Profit"}
//                         </p>
//                         <p
//                           style={{
//                             fontSize: "0.85rem",
//                             fontWeight: 600,
//                             color: profit > 0 ? "#6EBD8A" : "var(--dim)",
//                           }}
//                         >
//                           {formatPrice(profit)}
//                           <span
//                             style={{
//                               fontSize: "0.6rem",
//                               fontWeight: 400,
//                               color: "var(--dim)",
//                               marginLeft: 2,
//                             }}
//                           >
//                             ({profitPercent}%)
//                           </span>
//                         </p>
//                       </div>
//                       {isEnabled && (
//                         <button
//                           onClick={() => startEdit(plan)}
//                           style={btnIconStyle}
//                           title={t?.edit || "Edit markup"}
//                         >
//                           <Pencil size={15} />
//                         </button>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>

//       <style jsx>{`
//         @keyframes spin {
//           from {
//             transform: rotate(0deg);
//           }
//           to {
//             transform: rotate(360deg);
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

// // Styles
// const labelStyle: React.CSSProperties = {
//   display: "block",
//   fontSize: "0.75rem",
//   fontWeight: 600,
//   color: "var(--muted)",
//   marginBottom: 4,
// };

// const inputStyle: React.CSSProperties = {
//   padding: "0.5rem 0.75rem",
//   background: "var(--bg2)",
//   border: "1px solid var(--border)",
//   borderRadius: 8,
//   color: "var(--text)",
//   fontSize: "0.85rem",
//   outline: "none",
//   fontFamily: "inherit",
//   width: 100,
// };

// const smallInputStyle: React.CSSProperties = {
//   padding: "0.35rem 0.5rem",
//   background: "var(--bg2)",
//   border: "1px solid var(--border)",
//   borderRadius: 6,
//   color: "var(--text)",
//   fontSize: "0.8rem",
//   outline: "none",
//   fontFamily: "inherit",
// };

// const selectStyle: React.CSSProperties = {
//   ...inputStyle,
//   cursor: "pointer",
//   width: "auto",
// };

// const smallSelectStyle: React.CSSProperties = {
//   ...smallInputStyle,
//   cursor: "pointer",
//   width: 50,
// };

// const tabStyle: React.CSSProperties = {
//   padding: "0.5rem 1rem",
//   borderRadius: 8,
//   fontSize: "0.85rem",
//   fontWeight: 600,
//   cursor: "pointer",
//   border: "none",
//   fontFamily: "inherit",
//   transition: "all 0.15s",
//   display: "inline-flex",
//   alignItems: "center",
// };

// const btnPrimaryStyle: React.CSSProperties = {
//   display: "inline-flex",
//   alignItems: "center",
//   gap: 6,
//   padding: "0.55rem 1.2rem",
//   background: "var(--brand-color)",
//   border: "none",
//   borderRadius: 8,
//   color: "#FDF8F3",
//   fontSize: "0.85rem",
//   fontWeight: 600,
//   cursor: "pointer",
//   fontFamily: "inherit",
// };

// const btnSaveStyle: React.CSSProperties = {
//   display: "inline-flex",
//   alignItems: "center",
//   gap: 4,
//   padding: "0.3rem 0.7rem",
//   background: "#6EBD8A",
//   border: "none",
//   borderRadius: 6,
//   color: "#fff",
//   fontSize: "0.75rem",
//   fontWeight: 600,
//   cursor: "pointer",
//   fontFamily: "inherit",
// };

// const btnCancelStyle: React.CSSProperties = {
//   display: "inline-flex",
//   alignItems: "center",
//   padding: "0.3rem",
//   background: "transparent",
//   border: "none",
//   borderRadius: 6,
//   color: "var(--dim)",
//   cursor: "pointer",
// };

// const btnIconStyle: React.CSSProperties = {
//   display: "inline-flex",
//   alignItems: "center",
//   padding: "0.4rem",
//   background: "transparent",
//   border: "1px solid var(--border)",
//   borderRadius: 6,
//   color: "var(--muted)",
//   cursor: "pointer",
// };

// // // src/app/[countryCode]/dashboard/plans/PlansClient.tsx
// // "use client";

// // import { useState, useEffect, useMemo } from "react";
// // import { Check, X, Loader2, Pencil, RotateCcw, AlertTriangle } from "lucide-react";
// // import { getPlans } from "@/actions/reseller/plans/getPlans";
// // import { togglePlan } from "@/actions/reseller/plans/togglePlan";
// // import { updatePlanConfig } from "@/actions/reseller/plans/updatePlanConfig";
// // import { bulkUpdatePlans } from "@/actions/reseller/plans/bulkUpdatePlans";
// // import { CountryConfig } from "@/config/countries";
// // import { PlanWithConfig } from "@/types/reseller/plans";

// // interface PlansClientProps {
// //   countryCode: string;
// //   config: CountryConfig;
// //   translations: any;
// //   initialData: {
// //     plans: PlanWithConfig[];
// //     networks: string[];
// //   };
// // }

// // export default function PlansClient({
// //   countryCode,
// //   config,
// //   translations,
// //   initialData,
// // }: PlansClientProps) {
// //   const t = translations;
// //   const [plansData, setPlansData] = useState(initialData.plans);
// //   const [activeNetwork, setActiveNetwork] = useState<string>(
// //     initialData.networks[0] || ""
// //   );
// //   const [editingPlan, setEditingPlan] = useState<string | null>(null);
// //   const [editType, setEditType] = useState<"percentage" | "fixed">("percentage");
// //   const [editValue, setEditValue] = useState(0);
// //   const [saving, setSaving] = useState(false);
// //   const [bulkType, setBulkType] = useState<"percentage" | "fixed">("percentage");
// //   const [bulkValue, setBulkValue] = useState(20);
// //   const [bulkSaving, setBulkSaving] = useState(false);
// //   const [bulkScope, setBulkScope] = useState<"network" | "all">("network");
// //   const [message, setMessage] = useState<{
// //     type: "success" | "error";
// //     text: string;
// //   } | null>(null);

// //   const currencySymbol = config.currencySymbol || "₦";

// //   const formatPrice = (amount: number) => {
// //     return `${currencySymbol} ${amount?.toLocaleString() || 0}`;
// //   };

// //   const networks = initialData.networks || [];

// //   // Filter plans by active network
// //   const plans = useMemo(
// //     () => plansData.filter((p) => p.network === activeNetwork),
// //     [plansData, activeNetwork]
// //   );

// //   const refreshPlans = async () => {
// //     const result = await getPlans({ network: activeNetwork });
// //     if (result.success && result.data) {
// //       setPlansData((prev) => {
// //         const otherPlans = prev.filter((p) => p.network !== activeNetwork);
// //         return [...otherPlans, ...(result.data || [])];
// //       });
// //     }
// //   };

// //   const handleToggle = async (planId: string, enabled: boolean) => {
// //     setPlansData((prev) =>
// //       prev.map((p) => (p.id === planId ? { ...p, config: { ...p.config!, enabled } } : p))
// //     );
// //     const result = await togglePlan(planId);
// //     if (!result.success) {
// //       setPlansData((prev) =>
// //         prev.map((p) => (p.id === planId ? { ...p, config: { ...p.config!, enabled: !enabled } } : p))
// //       );
// //       setMessage({ type: "error", text: result.error || "Failed to toggle plan" });
// //     }
// //   };

// //   const startEdit = (plan: PlanWithConfig) => {
// //     setEditingPlan(plan.id);
// //     setEditType(plan.config?.markup_type || "percentage");
// //     setEditValue(plan.config?.markup_value || 0);
// //   };

// //   const cancelEdit = () => {
// //     setEditingPlan(null);
// //   };

// //   const saveEdit = async (planId: string) => {
// //     setSaving(true);
// //     const result = await updatePlanConfig({
// //       planId,
// //       markupType: editType,
// //       markupValue: editValue,
// //     });

// //     if (result.success) {
// //       setPlansData((prev) =>
// //         prev.map((p) => {
// //           if (p.id === planId) {
// //             const basePrice = p.base_price;
// //             const sellingPrice = editType === "percentage"
// //               ? Math.round(basePrice * (1 + editValue / 100))
// //               : Math.round(basePrice + editValue);
// //             return {
// //               ...p,
// //               config: {
// //                 ...p.config!,
// //                 markup_type: editType,
// //                 markup_value: editValue,
// //                 selling_price: sellingPrice,
// //               },
// //               profit: sellingPrice - basePrice,
// //               profit_percent: basePrice > 0 ? ((sellingPrice - basePrice) / basePrice) * 100 : 0,
// //             };
// //           }
// //           return p;
// //         })
// //       );
// //       setEditingPlan(null);
// //       setMessage({ type: "success", text: t?.saveSuccess || "Plan updated successfully" });
// //       setTimeout(() => setMessage(null), 3000);
// //     } else {
// //       setMessage({ type: "error", text: result.error || "Failed to update plan" });
// //     }
// //     setSaving(false);
// //   };

// //   const handleBulkUpdate = async () => {
// //     setBulkSaving(true);
// //     setMessage(null);

// //     const result = await bulkUpdatePlans({
// //       network: bulkScope === "network" ? activeNetwork : undefined,
// //       markupType: bulkType,
// //       markupValue: bulkValue,
// //     });

// //     if (result.success) {
// //       await refreshPlans();
// //       setMessage({
// //         type: "success",
// //         text: `${result.count || 0} plans updated to ${bulkType === "percentage" ? `${bulkValue}%` : formatPrice(bulkValue)} markup`,
// //       });
// //       setTimeout(() => setMessage(null), 3000);
// //     } else {
// //       setMessage({ type: "error", text: result.error || "Failed to update plans" });
// //     }
// //     setBulkSaving(false);
// //   };

// //   const getNetworkCount = (network: string) => {
// //     return plansData.filter((p) => p.network === network).length;
// //   };

// //   return (
// //     <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
// //       {/* Header */}
// //       <div>
// //         <h1
// //           style={{
// //             fontFamily: "'Playfair Display', serif",
// //             fontSize: "1.8rem",
// //             fontWeight: 700,
// //             color: "var(--text)",
// //             marginBottom: "0.3rem",
// //           }}
// //         >
// //           {t?.title || "Plan Management"}
// //         </h1>
// //         <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
// //           {t?.subtitle || "Toggle plans on/off and set your markup for each network"}
// //         </p>
// //       </div>

// //       {/* Message */}
// //       {message && (
// //         <div
// //           style={{
// //             padding: "0.9rem 1.2rem",
// //             borderRadius: 10,
// //             background:
// //               message.type === "success"
// //                 ? "rgba(110,189,138,0.1)"
// //                 : "rgba(239,68,68,0.1)",
// //             border:
// //               message.type === "success"
// //                 ? "1px solid rgba(110,189,138,0.25)"
// //                 : "1px solid rgba(239,68,68,0.25)",
// //             color: message.type === "success" ? "#6EBD8A" : "#F87171",
// //             fontSize: "0.88rem",
// //             display: "flex",
// //             alignItems: "center",
// //             gap: 8,
// //           }}
// //         >
// //           {message.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
// //           {message.text}
// //         </div>
// //       )}

// //       {/* Bulk Update */}
// //       <div
// //         style={{
// //           background: "var(--card)",
// //           border: "1px solid var(--border)",
// //           borderRadius: 12,
// //           padding: "1.25rem",
// //         }}
// //       >
// //         <h3
// //           style={{
// //             fontWeight: 600,
// //             color: "var(--text)",
// //             marginBottom: "1rem",
// //             fontSize: "0.95rem",
// //           }}
// //         >
// //           {t?.bulkPricing || "Bulk Update Markup"}
// //         </h3>
// //         <div
// //           style={{
// //             display: "flex",
// //             gap: "0.75rem",
// //             alignItems: "flex-end",
// //             flexWrap: "wrap",
// //           }}
// //         >
// //           <div>
// //             <label style={labelStyle}>{t?.applyTo || "Apply To"}</label>
// //             <select
// //               value={bulkScope}
// //               onChange={(e) => setBulkScope(e.target.value as "network" | "all")}
// //               style={selectStyle}
// //             >
// //               <option value="network">{t?.onlyNetwork || `Only ${activeNetwork}`}</option>
// //               <option value="all">{t?.allNetworks || "All Networks"}</option>
// //             </select>
// //           </div>
// //           <div>
// //             <label style={labelStyle}>{t?.markupType || "Markup Type"}</label>
// //             <select
// //               value={bulkType}
// //               onChange={(e) => setBulkType(e.target.value as "percentage" | "fixed")}
// //               style={selectStyle}
// //             >
// //               <option value="percentage">{t?.percentage || "Percentage (%)"}</option>
// //               <option value="fixed">{t?.fixed || `Fixed Amount (${currencySymbol})`}</option>
// //             </select>
// //           </div>
// //           <div>
// //             <label style={labelStyle}>{t?.markupValue || "Value"}</label>
// //             <input
// //               type="number"
// //               value={bulkValue}
// //               onChange={(e) => setBulkValue(Number(e.target.value))}
// //               style={inputStyle}
// //               min="0"
// //               step={bulkType === "percentage" ? "1" : "10"}
// //             />
// //           </div>
// //           <button
// //             onClick={handleBulkUpdate}
// //             disabled={bulkSaving}
// //             style={btnPrimaryStyle}
// //           >
// //             {bulkSaving ? (
// //               <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
// //             ) : (
// //               <RotateCcw size={16} />
// //             )}
// //             {t?.apply || "Apply"}
// //           </button>
// //         </div>
// //       </div>

// //       {/* Network Tabs */}
// //       <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
// //         {networks.map((net) => (
// //           <button
// //             key={net}
// //             onClick={() => {
// //               setActiveNetwork(net);
// //               setEditingPlan(null);
// //               refreshPlans();
// //             }}
// //             style={{
// //               ...tabStyle,
// //               background: activeNetwork === net ? "var(--brand-color)" : "var(--bg2)",
// //               color: activeNetwork === net ? "#FDF8F3" : "var(--muted)",
// //               border: activeNetwork === net ? "none" : "1px solid var(--border)",
// //             }}
// //           >
// //             {net}
// //             <span
// //               style={{
// //                 fontSize: "0.7rem",
// //                 opacity: 0.7,
// //                 marginLeft: 4,
// //               }}
// //             >
// //               ({getNetworkCount(net)})
// //             </span>
// //           </button>
// //         ))}
// //       </div>

// //       {/* Plans List */}
// //       <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
// //         {plans.length === 0 && (
// //           <div
// //             style={{
// //               textAlign: "center",
// //               padding: "3rem",
// //               background: "var(--card)",
// //               border: "1px solid var(--border)",
// //               borderRadius: 12,
// //               color: "var(--dim)",
// //             }}
// //           >
// //             <p>{t?.noPlans || `No ${activeNetwork} plans available`}</p>
// //           </div>
// //         )}

// //         {plans.map((plan) => {
// //           const isEditing = editingPlan === plan.id;
// //           const isEnabled = plan.config?.enabled ?? false;
// //           const sellingPrice = plan.config?.selling_price || plan.base_price;
// //           const profit = sellingPrice - plan.base_price;
// //           const profitPercent = plan.base_price > 0 ? Math.round((profit / plan.base_price) * 100) : 0;

// //           const editSellingPrice = isEditing
// //             ? editType === "percentage"
// //               ? Math.round(plan.base_price * (1 + editValue / 100))
// //               : Math.round(plan.base_price + editValue)
// //             : sellingPrice;

// //           const editProfit = isEditing ? editSellingPrice - plan.base_price : profit;

// //           return (
// //             <div
// //               key={plan.id}
// //               style={{
// //                 background: "var(--card)",
// //                 border: "1px solid var(--border)",
// //                 borderRadius: 12,
// //                 padding: "1rem 1.25rem",
// //                 opacity: isEnabled ? 1 : 0.55,
// //                 transition: "all 0.2s",
// //               }}
// //             >
// //               <div
// //                 style={{
// //                   display: "flex",
// //                   alignItems: "center",
// //                   justifyContent: "space-between",
// //                   flexWrap: "wrap",
// //                   gap: "0.75rem",
// //                 }}
// //               >
// //                 {/* Plan Info */}
// //                 <div style={{ flex: 1, minWidth: 180 }}>
// //                   <div
// //                     style={{
// //                       display: "flex",
// //                       alignItems: "center",
// //                       gap: "0.75rem",
// //                       flexWrap: "wrap",
// //                     }}
// //                   >
// //                     <h3
// //                       style={{
// //                         fontWeight: 600,
// //                         color: "var(--text)",
// //                         fontSize: "0.95rem",
// //                       }}
// //                     >
// //                       {plan.name}
// //                     </h3>
// //                     {plan.data_amount && (
// //                       <span
// //                         style={{
// //                           fontSize: "0.7rem",
// //                           color: "var(--dim)",
// //                           background: "var(--bg2)",
// //                           padding: "0.15rem 0.5rem",
// //                           borderRadius: 4,
// //                         }}
// //                       >
// //                         {plan.data_amount}
// //                       </span>
// //                     )}
// //                     {plan.validity && (
// //                       <span
// //                         style={{
// //                           fontSize: "0.7rem",
// //                           color: "var(--dim)",
// //                           background: "var(--bg2)",
// //                           padding: "0.15rem 0.5rem",
// //                           borderRadius: 4,
// //                         }}
// //                       >
// //                         {plan.validity}
// //                       </span>
// //                     )}
// //                     {/* Toggle */}
// //                     <button
// //                       onClick={() => handleToggle(plan.id, !isEnabled)}
// //                       style={{
// //                         width: 40,
// //                         height: 22,
// //                         borderRadius: 11,
// //                         border: "none",
// //                         background: isEnabled ? "#6EBD8A" : "var(--dim)",
// //                         position: "relative",
// //                         cursor: "pointer",
// //                         flexShrink: 0,
// //                         transition: "background 0.15s",
// //                       }}
// //                     >
// //                       <div
// //                         style={{
// //                           width: 18,
// //                           height: 18,
// //                           borderRadius: "50%",
// //                           background: "#fff",
// //                           position: "absolute",
// //                           top: 2,
// //                           left: isEnabled ? 20 : 2,
// //                           transition: "left 0.15s",
// //                           boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
// //                         }}
// //                       />
// //                     </button>
// //                     {!isEnabled && (
// //                       <span
// //                         style={{
// //                           fontSize: "0.65rem",
// //                           color: "#F87171",
// //                           background: "rgba(239,68,68,0.1)",
// //                           padding: "0.15rem 0.5rem",
// //                           borderRadius: 4,
// //                         }}
// //                       >
// //                         {t?.inactive || "Hidden"}
// //                       </span>
// //                     )}
// //                   </div>
// //                   <p style={{ fontSize: "0.78rem", color: "var(--dim)" }}>
// //                     {t?.wholesalePrice || "Cost"}:{" "}
// //                     <strong style={{ color: "var(--text)" }}>
// //                       {formatPrice(plan.base_price)}
// //                     </strong>
// //                     {plan.provider && ` • ${plan.provider}`}
// //                   </p>
// //                 </div>

// //                 {/* Editing or Display */}
// //                 {isEditing ? (
// //                   <div
// //                     style={{
// //                       display: "flex",
// //                       alignItems: "center",
// //                       gap: "0.5rem",
// //                       flexWrap: "wrap",
// //                       background: "var(--bg2)",
// //                       padding: "0.4rem 0.75rem",
// //                       borderRadius: 8,
// //                     }}
// //                   >
// //                     <select
// //                       value={editType}
// //                       onChange={(e) => setEditType(e.target.value as "percentage" | "fixed")}
// //                       style={smallSelectStyle}
// //                     >
// //                       <option value="percentage">%</option>
// //                       <option value="fixed">{currencySymbol}</option>
// //                     </select>
// //                     <input
// //                       type="number"
// //                       value={editValue}
// //                       onChange={(e) => setEditValue(Number(e.target.value))}
// //                       style={{ ...smallInputStyle, width: 70 }}
// //                       min="0"
// //                       step={editType === "percentage" ? "1" : "10"}
// //                     />
// //                     <div
// //                       style={{
// //                         fontSize: "0.75rem",
// //                         color: "var(--dim)",
// //                         minWidth: 80,
// //                         textAlign: "center",
// //                       }}
// //                     >
// //                       <div>
// //                         {t?.yourPrice || "Sell"}:{" "}
// //                         <strong style={{ color: "var(--brand-color)" }}>
// //                           {formatPrice(editSellingPrice)}
// //                         </strong>
// //                       </div>
// //                       <div>
// //                         {t?.profit || "Profit"}:{" "}
// //                         <strong style={{ color: "#6EBD8A" }}>
// //                           {formatPrice(editProfit)}
// //                         </strong>
// //                       </div>
// //                     </div>
// //                     <button
// //                       onClick={() => saveEdit(plan.id)}
// //                       disabled={saving}
// //                       style={btnSaveStyle}
// //                     >
// //                       {saving ? (
// //                         <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
// //                       ) : (
// //                         <Check size={14} />
// //                       )}
// //                       {t?.save || "Save"}
// //                     </button>
// //                     <button onClick={cancelEdit} style={btnCancelStyle}>
// //                       <X size={14} />
// //                     </button>
// //                   </div>
// //                 ) : (
// //                   <div
// //                     style={{
// //                       display: "flex",
// //                       alignItems: "center",
// //                       gap: "1.5rem",
// //                       flexWrap: "wrap",
// //                     }}
// //                   >
// //                     <div style={{ textAlign: "center", minWidth: 60 }}>
// //                       <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
// //                         {t?.markup || "Markup"}
// //                       </p>
// //                       <p
// //                         style={{
// //                           fontSize: "0.85rem",
// //                           fontWeight: 600,
// //                           color: "var(--text)",
// //                         }}
// //                       >
// //                         {plan.config?.markup_type === "percentage"
// //                           ? `${plan.config?.markup_value || 0}%`
// //                           : formatPrice(plan.config?.markup_value || 0)}
// //                       </p>
// //                     </div>
// //                     <div style={{ textAlign: "center", minWidth: 80 }}>
// //                       <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
// //                         {t?.yourPrice || "Your Price"}
// //                       </p>
// //                       <p
// //                         style={{
// //                           fontSize: "1rem",
// //                           fontWeight: 700,
// //                           color: "var(--brand-color)",
// //                         }}
// //                       >
// //                         {formatPrice(sellingPrice)}
// //                       </p>
// //                     </div>
// //                     <div style={{ textAlign: "center", minWidth: 60 }}>
// //                       <p style={{ fontSize: "0.65rem", color: "var(--dim)" }}>
// //                         {t?.profit || "Profit"}
// //                       </p>
// //                       <p
// //                         style={{
// //                           fontSize: "0.85rem",
// //                           fontWeight: 600,
// //                           color: profit > 0 ? "#6EBD8A" : "var(--dim)",
// //                         }}
// //                       >
// //                         {formatPrice(profit)}
// //                         <span
// //                           style={{
// //                             fontSize: "0.6rem",
// //                             fontWeight: 400,
// //                             color: "var(--dim)",
// //                             marginLeft: 2,
// //                           }}
// //                         >
// //                           ({profitPercent}%)
// //                         </span>
// //                       </p>
// //                     </div>
// //                     {isEnabled && (
// //                       <button
// //                         onClick={() => startEdit(plan)}
// //                         style={btnIconStyle}
// //                         title={t?.edit || "Edit markup"}
// //                       >
// //                         <Pencil size={15} />
// //                       </button>
// //                     )}
// //                   </div>
// //                 )}
// //               </div>
// //             </div>
// //           );
// //         })}
// //       </div>
// //     </div>
// //   );
// // }

// // // Styles
// // const labelStyle: React.CSSProperties = {
// //   display: "block",
// //   fontSize: "0.75rem",
// //   fontWeight: 600,
// //   color: "var(--muted)",
// //   marginBottom: 4,
// // };

// // const inputStyle: React.CSSProperties = {
// //   padding: "0.5rem 0.75rem",
// //   background: "var(--bg2)",
// //   border: "1px solid var(--border)",
// //   borderRadius: 8,
// //   color: "var(--text)",
// //   fontSize: "0.85rem",
// //   outline: "none",
// //   fontFamily: "inherit",
// //   width: 100,
// // };

// // const smallInputStyle: React.CSSProperties = {
// //   padding: "0.35rem 0.5rem",
// //   background: "var(--bg2)",
// //   border: "1px solid var(--border)",
// //   borderRadius: 6,
// //   color: "var(--text)",
// //   fontSize: "0.8rem",
// //   outline: "none",
// //   fontFamily: "inherit",
// // };

// // const selectStyle: React.CSSProperties = {
// //   ...inputStyle,
// //   cursor: "pointer",
// //   width: "auto",
// // };

// // const smallSelectStyle: React.CSSProperties = {
// //   ...smallInputStyle,
// //   cursor: "pointer",
// //   width: 50,
// // };

// // const tabStyle: React.CSSProperties = {
// //   padding: "0.5rem 1rem",
// //   borderRadius: 8,
// //   fontSize: "0.85rem",
// //   fontWeight: 600,
// //   cursor: "pointer",
// //   border: "none",
// //   fontFamily: "inherit",
// //   transition: "all 0.15s",
// //   display: "inline-flex",
// //   alignItems: "center",
// // };

// // const btnPrimaryStyle: React.CSSProperties = {
// //   display: "inline-flex",
// //   alignItems: "center",
// //   gap: 6,
// //   padding: "0.55rem 1.2rem",
// //   background: "var(--brand-color)",
// //   border: "none",
// //   borderRadius: 8,
// //   color: "#FDF8F3",
// //   fontSize: "0.85rem",
// //   fontWeight: 600,
// //   cursor: "pointer",
// //   fontFamily: "inherit",
// // };

// // const btnSaveStyle: React.CSSProperties = {
// //   display: "inline-flex",
// //   alignItems: "center",
// //   gap: 4,
// //   padding: "0.3rem 0.7rem",
// //   background: "#6EBD8A",
// //   border: "none",
// //   borderRadius: 6,
// //   color: "#fff",
// //   fontSize: "0.75rem",
// //   fontWeight: 600,
// //   cursor: "pointer",
// //   fontFamily: "inherit",
// // };

// // const btnCancelStyle: React.CSSProperties = {
// //   display: "inline-flex",
// //   alignItems: "center",
// //   padding: "0.3rem",
// //   background: "transparent",
// //   border: "none",
// //   borderRadius: 6,
// //   color: "var(--dim)",
// //   cursor: "pointer",
// // };

// // const btnIconStyle: React.CSSProperties = {
// //   display: "inline-flex",
// //   alignItems: "center",
// //   padding: "0.4rem",
// //   background: "transparent",
// //   border: "1px solid var(--border)",
// //   borderRadius: 6,
// //   color: "var(--muted)",
// //   cursor: "pointer",
// // };

// // // // src/app/[countryCode]/dashboard/plans/PlansClient.tsx
// // // "use client";

// // // import { useState, useEffect } from "react";
// // // import { Search, Plus, Percent, Filter, RefreshCw } from "lucide-react";
// // // import PlanCard from "./PlanCard";
// // // import EditPlanModal from "./EditPlanModal";
// // // import BulkPricingModal from "./BulkPricingModal";
// // // import AddPlanModal from "./AddPlanModal";
// // // import { getPlans } from "@/actions/reseller/plans/getPlans";
// // // import { togglePlan } from "@/actions/reseller/plans/togglePlan";
// // // import { bulkUpdatePlans } from "@/actions/reseller/plans/bulkUpdatePlans";
// // // import { CountryConfig } from "@/config/countries";
// // // import { PlanWithConfig } from "@/types/reseller/plans";

// // // interface PlansClientProps {
// // //   countryCode: string;
// // //   config: CountryConfig;
// // //   translations: any;
// // //   initialData: {
// // //     plans: PlanWithConfig[];
// // //     categories: string[];
// // //     networks: string[];
// // //   };
// // // }

// // // export default function PlansClient({
// // //   countryCode,
// // //   config,
// // //   translations,
// // //   initialData,
// // // }: PlansClientProps) {
// // //   const t = translations;
// // //   const [plans, setPlans] = useState<PlanWithConfig[]>(initialData.plans);
// // //   const [filteredPlans, setFilteredPlans] = useState<PlanWithConfig[]>(
// // //     initialData.plans,
// // //   );
// // //   const [searchQuery, setSearchQuery] = useState("");
// // //   const [selectedCategory, setSelectedCategory] = useState("all");
// // //   const [selectedNetwork, setSelectedNetwork] = useState("all");
// // //   const [selectedPlan, setSelectedPlan] = useState<PlanWithConfig | null>(null);
// // //   const [showEditModal, setShowEditModal] = useState(false);
// // //   const [showBulkModal, setShowBulkModal] = useState(false);
// // //   const [showAddModal, setShowAddModal] = useState(false);
// // //   const [isLoading, setIsLoading] = useState(false);
// // //   const [selectedPlans, setSelectedPlans] = useState<string[]>([]);

// // //   const categories = initialData.categories || [];
// // //   const networks = initialData.networks || [];

// // //   // Filter plans
// // //   useEffect(() => {
// // //     let filtered = plans;

// // //     if (searchQuery) {
// // //       const query = searchQuery.toLowerCase();
// // //       filtered = filtered.filter(
// // //         (p) =>
// // //           p.name?.toLowerCase().includes(query) ||
// // //           p.network?.toLowerCase().includes(query) ||
// // //           p.description?.toLowerCase().includes(query),
// // //       );
// // //     }

// // //     if (selectedCategory !== "all") {
// // //       filtered = filtered.filter((p) => p.category === selectedCategory);
// // //     }

// // //     if (selectedNetwork !== "all") {
// // //       filtered = filtered.filter((p) => p.network === selectedNetwork);
// // //     }

// // //     setFilteredPlans(filtered);
// // //   }, [plans, searchQuery, selectedCategory, selectedNetwork]);

// // //   const refreshPlans = async () => {
// // //     setIsLoading(true);
// // //     try {
// // //       const result = await getPlans();
// // //       if (result.success && result.data) {
// // //         setPlans(result.data);
// // //       }
// // //     } catch (error) {
// // //       console.error("Refresh error:", error);
// // //     } finally {
// // //       setIsLoading(false);
// // //     }
// // //   };

// // //   const handleTogglePlan = async (planId: string) => {
// // //     const result = await togglePlan(planId);
// // //     if (result.success) {
// // //       await refreshPlans();
// // //     }
// // //   };

// // //   const handleBulkAction = async (action: "enable" | "disable") => {
// // //     if (selectedPlans.length === 0) return;

// // //     const result = await bulkUpdatePlans({
// // //       planIds: selectedPlans,
// // //       enabled: action === "enable",
// // //     });

// // //     if (result.success) {
// // //       setSelectedPlans([]);
// // //       await refreshPlans();
// // //     }
// // //   };

// // //   const getCategoryLabel = (category: string): string => {
// // //     const labels: Record<string, string> = {
// // //       data: t?.dataPlans || "Data Plans",
// // //       airtime: t?.airtimePlans || "Airtime Plans",
// // //       electricity: t?.electricityPlans || "Electricity Plans",
// // //       cable: t?.cablePlans || "Cable Plans",
// // //       bundle: t?.bundlePlans || "Bundles",
// // //       esim: t?.esimPlans || "eSIM Plans",
// // //     };
// // //     return labels[category] || category;
// // //   };

// // //   const stats = {
// // //     total: plans.length,
// // //     enabled: plans.filter((p) => p.config?.enabled).length,
// // //     disabled: plans.filter((p) => !p.config?.enabled).length,
// // //   };

// // //   return (
// // //     <div>
// // //       {/* Page Header */}
// // //       <div
// // //         style={{
// // //           marginBottom: "1.5rem",
// // //           display: "flex",
// // //           alignItems: "center",
// // //           justifyContent: "space-between",
// // //           flexWrap: "wrap",
// // //           gap: "1rem",
// // //         }}
// // //       >
// // //         <div>
// // //           <h1
// // //             style={{
// // //               fontFamily: "'Playfair Display', serif",
// // //               fontSize: "1.5rem",
// // //               fontWeight: 700,
// // //               margin: 0,
// // //             }}
// // //           >
// // //             {t?.title || "Plans & Pricing"}
// // //           </h1>
// // //           <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
// // //             {t?.subtitle || "Manage your products and set your prices"}
// // //           </p>
// // //         </div>
// // //         <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
// // //           {selectedPlans.length > 0 && (
// // //             <>
// // //               <button
// // //                 onClick={() => handleBulkAction("enable")}
// // //                 style={{
// // //                   padding: "0.6rem 1.2rem",
// // //                   background: "rgba(110,189,138,0.12)",
// // //                   color: "#6EBD8A",
// // //                   border: "1px solid rgba(110,189,138,0.2)",
// // //                   borderRadius: 8,
// // //                   fontWeight: 500,
// // //                   fontSize: "0.9rem",
// // //                   cursor: "pointer",
// // //                   transition: "all 0.2s",
// // //                 }}
// // //                 onMouseEnter={(e) => {
// // //                   e.currentTarget.style.background = "rgba(110,189,138,0.2)";
// // //                 }}
// // //                 onMouseLeave={(e) => {
// // //                   e.currentTarget.style.background = "rgba(110,189,138,0.12)";
// // //                 }}
// // //               >
// // //                 {t?.enableSelected || `Enable (${selectedPlans.length})`}
// // //               </button>
// // //               <button
// // //                 onClick={() => handleBulkAction("disable")}
// // //                 style={{
// // //                   padding: "0.6rem 1.2rem",
// // //                   background: "rgba(239,68,68,0.08)",
// // //                   color: "#EF4444",
// // //                   border: "1px solid rgba(239,68,68,0.2)",
// // //                   borderRadius: 8,
// // //                   fontWeight: 500,
// // //                   fontSize: "0.9rem",
// // //                   cursor: "pointer",
// // //                   transition: "all 0.2s",
// // //                 }}
// // //                 onMouseEnter={(e) => {
// // //                   e.currentTarget.style.background = "rgba(239,68,68,0.15)";
// // //                 }}
// // //                 onMouseLeave={(e) => {
// // //                   e.currentTarget.style.background = "rgba(239,68,68,0.08)";
// // //                 }}
// // //               >
// // //                 {t?.disableSelected || `Disable (${selectedPlans.length})`}
// // //               </button>
// // //             </>
// // //           )}
// // //           <button
// // //             onClick={() => setShowBulkModal(true)}
// // //             style={{
// // //               padding: "0.6rem 1.2rem",
// // //               background: "transparent",
// // //               color: "var(--text)",
// // //               border: "1px solid var(--border2)",
// // //               borderRadius: 8,
// // //               fontWeight: 500,
// // //               fontSize: "0.9rem",
// // //               cursor: "pointer",
// // //               transition: "all 0.2s",
// // //               display: "flex",
// // //               alignItems: "center",
// // //               gap: "0.5rem",
// // //             }}
// // //             onMouseEnter={(e) => {
// // //               e.currentTarget.style.borderColor = "var(--brand-color)";
// // //               e.currentTarget.style.background =
// // //                 "rgba(var(--brand-color-rgb), 0.05)";
// // //             }}
// // //             onMouseLeave={(e) => {
// // //               e.currentTarget.style.borderColor = "var(--border2)";
// // //               e.currentTarget.style.background = "transparent";
// // //             }}
// // //           >
// // //             <Percent size={16} />
// // //             {t?.bulkPricing || "Bulk Pricing"}
// // //           </button>
// // //           <button
// // //             onClick={() => setShowAddModal(true)}
// // //             style={{
// // //               padding: "0.6rem 1.2rem",
// // //               background: "var(--brand-color)",
// // //               color: "#FDF8F3",
// // //               border: "none",
// // //               borderRadius: 8,
// // //               fontWeight: 500,
// // //               fontSize: "0.9rem",
// // //               cursor: "pointer",
// // //               transition: "all 0.2s",
// // //               display: "flex",
// // //               alignItems: "center",
// // //               gap: "0.5rem",
// // //             }}
// // //             onMouseEnter={(e) => {
// // //               e.currentTarget.style.opacity = "0.85";
// // //             }}
// // //             onMouseLeave={(e) => {
// // //               e.currentTarget.style.opacity = "1";
// // //             }}
// // //           >
// // //             <Plus size={16} />
// // //             {t?.addPlans || "Add Plans"}
// // //           </button>
// // //           <button
// // //             onClick={refreshPlans}
// // //             disabled={isLoading}
// // //             style={{
// // //               padding: "0.6rem 1rem",
// // //               background: "transparent",
// // //               border: "1px solid var(--border)",
// // //               borderRadius: 8,
// // //               color: "var(--muted)",
// // //               cursor: "pointer",
// // //               transition: "all 0.2s",
// // //               display: "flex",
// // //               alignItems: "center",
// // //               justifyContent: "center",
// // //             }}
// // //             onMouseEnter={(e) => {
// // //               e.currentTarget.style.borderColor = "var(--brand-color)";
// // //               e.currentTarget.style.color = "var(--text)";
// // //             }}
// // //             onMouseLeave={(e) => {
// // //               e.currentTarget.style.borderColor = "var(--border)";
// // //               e.currentTarget.style.color = "var(--muted)";
// // //             }}
// // //           >
// // //             <RefreshCw
// // //               size={18}
// // //               style={{
// // //                 animation: isLoading ? "spin 1s linear infinite" : "none",
// // //               }}
// // //             />
// // //           </button>
// // //         </div>
// // //       </div>

// // //       {/* Stats Summary */}
// // //       <div
// // //         style={{
// // //           display: "grid",
// // //           gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
// // //           gap: "1rem",
// // //           marginBottom: "1.5rem",
// // //         }}
// // //       >
// // //         <div
// // //           style={{
// // //             background: "var(--card)",
// // //             border: "1px solid var(--border)",
// // //             borderRadius: 10,
// // //             padding: "1rem",
// // //             textAlign: "center",
// // //           }}
// // //         >
// // //           <p
// // //             style={{
// // //               fontSize: "0.7rem",
// // //               color: "var(--dim)",
// // //               textTransform: "uppercase",
// // //             }}
// // //           >
// // //             {t?.totalPlans || "Total Plans"}
// // //           </p>
// // //           <p
// // //             style={{
// // //               fontFamily: "'Playfair Display', serif",
// // //               fontSize: "1.5rem",
// // //               fontWeight: 700,
// // //               color: "var(--text)",
// // //             }}
// // //           >
// // //             {stats.total}
// // //           </p>
// // //         </div>
// // //         <div
// // //           style={{
// // //             background: "var(--card)",
// // //             border: "1px solid var(--border)",
// // //             borderRadius: 10,
// // //             padding: "1rem",
// // //             textAlign: "center",
// // //           }}
// // //         >
// // //           <p
// // //             style={{
// // //               fontSize: "0.7rem",
// // //               color: "var(--dim)",
// // //               textTransform: "uppercase",
// // //             }}
// // //           >
// // //             {t?.categories || "Categories"}
// // //           </p>
// // //           <p
// // //             style={{
// // //               fontFamily: "'Playfair Display', serif",
// // //               fontSize: "1.5rem",
// // //               fontWeight: 700,
// // //               color: "var(--text)",
// // //             }}
// // //           >
// // //             {categories.length}
// // //           </p>
// // //         </div>
// // //         <div
// // //           style={{
// // //             background: "var(--card)",
// // //             border: "1px solid var(--border)",
// // //             borderRadius: 10,
// // //             padding: "1rem",
// // //             textAlign: "center",
// // //           }}
// // //         >
// // //           <p
// // //             style={{
// // //               fontSize: "0.7rem",
// // //               color: "var(--dim)",
// // //               textTransform: "uppercase",
// // //             }}
// // //           >
// // //             {t?.networks || "Networks"}
// // //           </p>
// // //           <p
// // //             style={{
// // //               fontFamily: "'Playfair Display', serif",
// // //               fontSize: "1.5rem",
// // //               fontWeight: 700,
// // //               color: "var(--text)",
// // //             }}
// // //           >
// // //             {networks.length}
// // //           </p>
// // //         </div>
// // //         <div
// // //           style={{
// // //             background: "var(--card)",
// // //             border: "1px solid var(--border)",
// // //             borderRadius: 10,
// // //             padding: "1rem",
// // //             textAlign: "center",
// // //           }}
// // //         >
// // //           <p
// // //             style={{
// // //               fontSize: "0.7rem",
// // //               color: "var(--dim)",
// // //               textTransform: "uppercase",
// // //             }}
// // //           >
// // //             {t?.activePlans || "Active Plans"}
// // //           </p>
// // //           <p
// // //             style={{
// // //               fontFamily: "'Playfair Display', serif",
// // //               fontSize: "1.5rem",
// // //               fontWeight: 700,
// // //               color: "#6EBD8A",
// // //             }}
// // //           >
// // //             {stats.enabled}
// // //           </p>
// // //         </div>
// // //       </div>

// // //       {/* Search and Filters */}
// // //       <div
// // //         style={{
// // //           display: "flex",
// // //           gap: "1rem",
// // //           flexWrap: "wrap",
// // //           marginBottom: "1.5rem",
// // //         }}
// // //       >
// // //         <div
// // //           style={{
// // //             flex: 1,
// // //             minWidth: 200,
// // //             display: "flex",
// // //             alignItems: "center",
// // //             background: "var(--bg2)",
// // //             border: "1px solid var(--border)",
// // //             borderRadius: 10,
// // //             overflow: "hidden",
// // //           }}
// // //         >
// // //           <Search
// // //             size={18}
// // //             style={{ color: "var(--dim)", marginLeft: "0.75rem" }}
// // //           />
// // //           <input
// // //             type="text"
// // //             value={searchQuery}
// // //             onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
// // //               setSearchQuery(e.target.value)
// // //             }
// // //             placeholder={t?.searchPlans || "Search plans..."}
// // //             style={{
// // //               flex: 1,
// // //               padding: "0.6rem 0.75rem",
// // //               background: "transparent",
// // //               border: "none",
// // //               color: "var(--text)",
// // //               fontSize: "0.9rem",
// // //               outline: "none",
// // //             }}
// // //           />
// // //         </div>

// // //         <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
// // //           <select
// // //             value={selectedCategory}
// // //             onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
// // //               setSelectedCategory(e.target.value)
// // //             }
// // //             style={{
// // //               padding: "0.6rem 2rem 0.6rem 1rem",
// // //               background: "var(--bg2)",
// // //               border: "1px solid var(--border)",
// // //               borderRadius: 10,
// // //               color: "var(--text)",
// // //               fontSize: "0.9rem",
// // //               outline: "none",
// // //               appearance: "none",
// // //               cursor: "pointer",
// // //               backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5F55' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
// // //               backgroundRepeat: "no-repeat",
// // //               backgroundPosition: "right 0.75rem center",
// // //             }}
// // //           >
// // //             <option value="all">{t?.allCategories || "All Categories"}</option>
// // //             {categories.map((cat: string) => (
// // //               <option key={cat} value={cat}>
// // //                 {getCategoryLabel(cat)}
// // //               </option>
// // //             ))}
// // //           </select>

// // //           {networks.length > 0 && (
// // //             <select
// // //               value={selectedNetwork}
// // //               onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
// // //                 setSelectedNetwork(e.target.value)
// // //               }
// // //               style={{
// // //                 padding: "0.6rem 2rem 0.6rem 1rem",
// // //                 background: "var(--bg2)",
// // //                 border: "1px solid var(--border)",
// // //                 borderRadius: 10,
// // //                 color: "var(--text)",
// // //                 fontSize: "0.9rem",
// // //                 outline: "none",
// // //                 appearance: "none",
// // //                 cursor: "pointer",
// // //                 backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5F55' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
// // //                 backgroundRepeat: "no-repeat",
// // //                 backgroundPosition: "right 0.75rem center",
// // //               }}
// // //             >
// // //               <option value="all">{t?.allNetworks || "All Networks"}</option>
// // //               {networks.map((net: string) => (
// // //                 <option key={net} value={net}>
// // //                   {net}
// // //                 </option>
// // //               ))}
// // //             </select>
// // //           )}
// // //         </div>
// // //       </div>

// // //       {/* Plans Grid */}
// // //       {isLoading ? (
// // //         <div
// // //           style={{ textAlign: "center", padding: "3rem", color: "var(--dim)" }}
// // //         >
// // //           {t?.loading || "Loading plans..."}
// // //         </div>
// // //       ) : filteredPlans.length > 0 ? (
// // //         <div
// // //           style={{
// // //             display: "grid",
// // //             gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
// // //             gap: "1rem",
// // //           }}
// // //         >
// // //           {filteredPlans.map((plan: PlanWithConfig) => (
// // //             <div key={plan.id} style={{ position: "relative" }}>
// // //               <input
// // //                 type="checkbox"
// // //                 checked={selectedPlans.includes(plan.id)}
// // //                 onChange={(e) => {
// // //                   if (e.target.checked) {
// // //                     setSelectedPlans([...selectedPlans, plan.id]);
// // //                   } else {
// // //                     setSelectedPlans(
// // //                       selectedPlans.filter((id) => id !== plan.id),
// // //                     );
// // //                   }
// // //                 }}
// // //                 style={{
// // //                   position: "absolute",
// // //                   top: "0.75rem",
// // //                   left: "0.75rem",
// // //                   zIndex: 1,
// // //                   width: 16,
// // //                   height: 16,
// // //                   cursor: "pointer",
// // //                 }}
// // //               />
// // //               <PlanCard
// // //                 plan={plan}
// // //                 config={config}
// // //                 translations={t}
// // //                 onEdit={() => {
// // //                   setSelectedPlan(plan);
// // //                   setShowEditModal(true);
// // //                 }}
// // //                 onToggle={() => handleTogglePlan(plan.id)}
// // //               />
// // //             </div>
// // //           ))}
// // //         </div>
// // //       ) : (
// // //         <div
// // //           style={{
// // //             textAlign: "center",
// // //             padding: "3rem",
// // //             background: "var(--card)",
// // //             border: "1px solid var(--border)",
// // //             borderRadius: 12,
// // //           }}
// // //         >
// // //           <p style={{ color: "var(--muted)", fontSize: "1rem" }}>
// // //             {searchQuery ||
// // //             selectedCategory !== "all" ||
// // //             selectedNetwork !== "all"
// // //               ? t?.noResults || "No plans match your filters"
// // //               : t?.noPlans || "No plans available"}
// // //           </p>
// // //           <p
// // //             style={{
// // //               color: "var(--dim)",
// // //               fontSize: "0.85rem",
// // //               marginTop: "0.25rem",
// // //             }}
// // //           >
// // //             {t?.addPlans || "Add plans to start selling"}
// // //           </p>
// // //         </div>
// // //       )}

// // //       {/* Modals */}
// // //       {showEditModal && selectedPlan && (
// // //         <EditPlanModal
// // //           plan={selectedPlan}
// // //           onClose={() => {
// // //             setShowEditModal(false);
// // //             setSelectedPlan(null);
// // //           }}
// // //           onSuccess={refreshPlans}
// // //           config={config}
// // //           translations={t}
// // //         />
// // //       )}

// // //       {showBulkModal && (
// // //         <BulkPricingModal
// // //           plans={plans}
// // //           onClose={() => setShowBulkModal(false)}
// // //           onSuccess={refreshPlans}
// // //           config={config}
// // //           translations={t}
// // //         />
// // //       )}

// // //       {showAddModal && (
// // //         <AddPlanModal
// // //           isOpen={showAddModal}
// // //           onClose={() => setShowAddModal(false)}
// // //           onSuccess={refreshPlans}
// // //           countryCode={countryCode}
// // //           translations={t}
// // //           config={config}
// // //         />
// // //       )}

// // //       <style jsx>{`
// // //         @keyframes spin {
// // //           from {
// // //             transform: rotate(0deg);
// // //           }
// // //           to {
// // //             transform: rotate(360deg);
// // //           }
// // //         }
// // //       `}</style>
// // //     </div>
// // //   );
// // // }

// // // // // src/app/[countryCode]/dashboard/plans/PlansClient.tsx
// // // // "use client";

// // // // import { useState, useEffect } from "react";
// // // // import { createClient } from "@/lib/supabase/client";
// // // // import {
// // // //   Search,
// // // //   Filter,
// // // //   Plus,
// // // //   ChevronDown,
// // // //   Percent,
// // // //   DollarSign,
// // // // } from "lucide-react";
// // // // import PlanCard from "./PlanCard";
// // // // import EditPlanModal from "./EditPlanModal";
// // // // import BulkPricingModal from "./BulkPricingModal";
// // // // import { CountryConfig } from "@/config/countries";
// // // // import { Plan, PlansData } from "@/types/reseller/plans";

// // // // interface PlansClientProps {
// // // //   countryCode: string;
// // // //   config: CountryConfig;
// // // //   translations: any;
// // // //   plansData: PlansData;
// // // // }

// // // // export default function PlansClient({
// // // //   countryCode,
// // // //   config,
// // // //   translations,
// // // //   plansData,
// // // // }: PlansClientProps) {
// // // //   const t = translations;
// // // //   const supabase = createClient();
// // // //   const [plans, setPlans] = useState<Plan[]>(plansData.plans);
// // // //   const [filteredPlans, setFilteredPlans] = useState<Plan[]>(plansData.plans);
// // // //   const [searchQuery, setSearchQuery] = useState<string>("");
// // // //   const [selectedCategory, setSelectedCategory] = useState<string>("all");
// // // //   const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
// // // //   const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
// // // //   const [showEditModal, setShowEditModal] = useState<boolean>(false);
// // // //   const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
// // // //   const [isLoading, setIsLoading] = useState<boolean>(false);

// // // //   const categories: string[] = plansData.categories || [];
// // // //   const networks: string[] = plansData.networks || [];

// // // //   // Filter plans
// // // //   useEffect(() => {
// // // //     let filtered: Plan[] = plans;

// // // //     if (searchQuery) {
// // // //       const query = searchQuery.toLowerCase();
// // // //       filtered = filtered.filter(
// // // //         (p: Plan) =>
// // // //           p.name?.toLowerCase().includes(query) ||
// // // //           p.network?.toLowerCase().includes(query) ||
// // // //           p.description?.toLowerCase().includes(query),
// // // //       );
// // // //     }

// // // //     if (selectedCategory !== "all") {
// // // //       filtered = filtered.filter((p: Plan) => p.category === selectedCategory);
// // // //     }

// // // //     if (selectedNetwork !== "all") {
// // // //       filtered = filtered.filter((p: Plan) => p.network === selectedNetwork);
// // // //     }

// // // //     setFilteredPlans(filtered);
// // // //   }, [plans, searchQuery, selectedCategory, selectedNetwork]);

// // // //   const refreshPlans = async (): Promise<void> => {
// // // //     try {
// // // //       const { data, error } = await supabase
// // // //         .from("global_plans")
// // // //         .select("*")
// // // //         .eq("reseller_id", plansData.application.id)
// // // //         .order("category", { ascending: true })
// // // //         .order("name", { ascending: true });

// // // //       if (!error && data) {
// // // //         setPlans(data as Plan[]);
// // // //       }
// // // //     } catch (error) {
// // // //       console.error("Refresh error:", error);
// // // //     }
// // // //   };

// // // //   const handlePlanUpdate = (): void => {
// // // //     refreshPlans();
// // // //   };

// // // //   const getCategoryLabel = (category: string): string => {
// // // //     const labels: Record<string, string> = {
// // // //       data: t?.dataPlans || "Data Plans",
// // // //       airtime: t?.airtimePlans || "Airtime Plans",
// // // //       electricity: t?.electricityPlans || "Electricity Plans",
// // // //       cable: t?.cablePlans || "Cable Plans",
// // // //     };
// // // //     return labels[category] || category;
// // // //   };

// // // //   const getCategoryColor = (category: string): string => {
// // // //     const colors: Record<string, string> = {
// // // //       data: "#3B82F6",
// // // //       airtime: "#8B5CF6",
// // // //       electricity: "#F59E0B",
// // // //       cable: "#10B981",
// // // //     };
// // // //     return colors[category] || "var(--muted)";
// // // //   };

// // // //   return (
// // // //     <div>
// // // //       {/* Page Header */}
// // // //       <div
// // // //         style={{
// // // //           marginBottom: "1.5rem",
// // // //           display: "flex",
// // // //           alignItems: "center",
// // // //           justifyContent: "space-between",
// // // //           flexWrap: "wrap",
// // // //           gap: "1rem",
// // // //         }}
// // // //       >
// // // //         <div>
// // // //           <h1
// // // //             style={{
// // // //               fontFamily: "'Playfair Display', serif",
// // // //               fontSize: "1.5rem",
// // // //               fontWeight: 700,
// // // //               margin: 0,
// // // //             }}
// // // //           >
// // // //             {t?.title || "Plans & Pricing"}
// // // //           </h1>
// // // //           <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
// // // //             {t?.subtitle || "Manage your products and set your prices"}
// // // //           </p>
// // // //         </div>
// // // //         <div style={{ display: "flex", gap: "0.75rem" }}>
// // // //           <button
// // // //             onClick={() => setShowBulkModal(true)}
// // // //             style={{
// // // //               padding: "0.6rem 1.2rem",
// // // //               background: "transparent",
// // // //               color: "var(--text)",
// // // //               border: "1px solid var(--border2)",
// // // //               borderRadius: 8,
// // // //               fontWeight: 500,
// // // //               fontSize: "0.9rem",
// // // //               cursor: "pointer",
// // // //               transition: "all 0.2s",
// // // //               display: "flex",
// // // //               alignItems: "center",
// // // //               gap: "0.5rem",
// // // //             }}
// // // //             onMouseEnter={(e) => {
// // // //               e.currentTarget.style.borderColor = "var(--brand-color)";
// // // //               e.currentTarget.style.background =
// // // //                 "rgba(var(--brand-color-rgb), 0.05)";
// // // //             }}
// // // //             onMouseLeave={(e) => {
// // // //               e.currentTarget.style.borderColor = "var(--border2)";
// // // //               e.currentTarget.style.background = "transparent";
// // // //             }}
// // // //           >
// // // //             <Percent size={16} />
// // // //             {t?.bulkPricing || "Bulk Pricing"}
// // // //           </button>
// // // //           <button
// // // //             onClick={refreshPlans}
// // // //             style={{
// // // //               padding: "0.6rem 1rem",
// // // //               background: "transparent",
// // // //               border: "1px solid var(--border)",
// // // //               borderRadius: 8,
// // // //               color: "var(--muted)",
// // // //               cursor: "pointer",
// // // //               transition: "all 0.2s",
// // // //             }}
// // // //             onMouseEnter={(e) => {
// // // //               e.currentTarget.style.borderColor = "var(--brand-color)";
// // // //               e.currentTarget.style.color = "var(--text)";
// // // //             }}
// // // //             onMouseLeave={(e) => {
// // // //               e.currentTarget.style.borderColor = "var(--border)";
// // // //               e.currentTarget.style.color = "var(--muted)";
// // // //             }}
// // // //           >
// // // //             ⟳
// // // //           </button>
// // // //         </div>
// // // //       </div>

// // // //       {/* Stats Summary */}
// // // //       <div
// // // //         style={{
// // // //           display: "grid",
// // // //           gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
// // // //           gap: "1rem",
// // // //           marginBottom: "1.5rem",
// // // //         }}
// // // //       >
// // // //         <div
// // // //           style={{
// // // //             background: "var(--card)",
// // // //             border: "1px solid var(--border)",
// // // //             borderRadius: 10,
// // // //             padding: "1rem",
// // // //             textAlign: "center",
// // // //           }}
// // // //         >
// // // //           <p
// // // //             style={{
// // // //               fontSize: "0.7rem",
// // // //               color: "var(--dim)",
// // // //               textTransform: "uppercase",
// // // //             }}
// // // //           >
// // // //             {t?.totalPlans || "Total Plans"}
// // // //           </p>
// // // //           <p
// // // //             style={{
// // // //               fontFamily: "'Playfair Display', serif",
// // // //               fontSize: "1.5rem",
// // // //               fontWeight: 700,
// // // //               color: "var(--text)",
// // // //             }}
// // // //           >
// // // //             {plans.length}
// // // //           </p>
// // // //         </div>
// // // //         <div
// // // //           style={{
// // // //             background: "var(--card)",
// // // //             border: "1px solid var(--border)",
// // // //             borderRadius: 10,
// // // //             padding: "1rem",
// // // //             textAlign: "center",
// // // //           }}
// // // //         >
// // // //           <p
// // // //             style={{
// // // //               fontSize: "0.7rem",
// // // //               color: "var(--dim)",
// // // //               textTransform: "uppercase",
// // // //             }}
// // // //           >
// // // //             {t?.categories || "Categories"}
// // // //           </p>
// // // //           <p
// // // //             style={{
// // // //               fontFamily: "'Playfair Display', serif",
// // // //               fontSize: "1.5rem",
// // // //               fontWeight: 700,
// // // //               color: "var(--text)",
// // // //             }}
// // // //           >
// // // //             {categories.length}
// // // //           </p>
// // // //         </div>
// // // //         <div
// // // //           style={{
// // // //             background: "var(--card)",
// // // //             border: "1px solid var(--border)",
// // // //             borderRadius: 10,
// // // //             padding: "1rem",
// // // //             textAlign: "center",
// // // //           }}
// // // //         >
// // // //           <p
// // // //             style={{
// // // //               fontSize: "0.7rem",
// // // //               color: "var(--dim)",
// // // //               textTransform: "uppercase",
// // // //             }}
// // // //           >
// // // //             {t?.networks || "Networks"}
// // // //           </p>
// // // //           <p
// // // //             style={{
// // // //               fontFamily: "'Playfair Display', serif",
// // // //               fontSize: "1.5rem",
// // // //               fontWeight: 700,
// // // //               color: "var(--text)",
// // // //             }}
// // // //           >
// // // //             {networks.length}
// // // //           </p>
// // // //         </div>
// // // //         <div
// // // //           style={{
// // // //             background: "var(--card)",
// // // //             border: "1px solid var(--border)",
// // // //             borderRadius: 10,
// // // //             padding: "1rem",
// // // //             textAlign: "center",
// // // //           }}
// // // //         >
// // // //           <p
// // // //             style={{
// // // //               fontSize: "0.7rem",
// // // //               color: "var(--dim)",
// // // //               textTransform: "uppercase",
// // // //             }}
// // // //           >
// // // //             {t?.activePlans || "Active Plans"}
// // // //           </p>
// // // //           <p
// // // //             style={{
// // // //               fontFamily: "'Playfair Display', serif",
// // // //               fontSize: "1.5rem",
// // // //               fontWeight: 700,
// // // //               color: "#6EBD8A",
// // // //             }}
// // // //           >
// // // //             {plans.filter((p: Plan) => p.is_active).length}
// // // //           </p>
// // // //         </div>
// // // //       </div>

// // // //       {/* Search and Filters */}
// // // //       <div
// // // //         style={{
// // // //           display: "flex",
// // // //           gap: "1rem",
// // // //           flexWrap: "wrap",
// // // //           marginBottom: "1.5rem",
// // // //         }}
// // // //       >
// // // //         <div
// // // //           style={{
// // // //             flex: 1,
// // // //             minWidth: 200,
// // // //             display: "flex",
// // // //             alignItems: "center",
// // // //             background: "var(--bg2)",
// // // //             border: "1px solid var(--border)",
// // // //             borderRadius: 10,
// // // //             overflow: "hidden",
// // // //           }}
// // // //         >
// // // //           <Search
// // // //             size={18}
// // // //             style={{ color: "var(--dim)", marginLeft: "0.75rem" }}
// // // //           />
// // // //           <input
// // // //             type="text"
// // // //             value={searchQuery}
// // // //             onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
// // // //               setSearchQuery(e.target.value)
// // // //             }
// // // //             placeholder={t?.searchPlans || "Search plans..."}
// // // //             style={{
// // // //               flex: 1,
// // // //               padding: "0.6rem 0.75rem",
// // // //               background: "transparent",
// // // //               border: "none",
// // // //               color: "var(--text)",
// // // //               fontSize: "0.9rem",
// // // //               outline: "none",
// // // //             }}
// // // //           />
// // // //         </div>

// // // //         <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
// // // //           <select
// // // //             value={selectedCategory}
// // // //             onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
// // // //               setSelectedCategory(e.target.value)
// // // //             }
// // // //             style={{
// // // //               padding: "0.6rem 2rem 0.6rem 1rem",
// // // //               background: "var(--bg2)",
// // // //               border: "1px solid var(--border)",
// // // //               borderRadius: 10,
// // // //               color: "var(--text)",
// // // //               fontSize: "0.9rem",
// // // //               outline: "none",
// // // //               appearance: "none",
// // // //               cursor: "pointer",
// // // //               backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5F55' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
// // // //               backgroundRepeat: "no-repeat",
// // // //               backgroundPosition: "right 0.75rem center",
// // // //             }}
// // // //           >
// // // //             <option value="all">{t?.allCategories || "All Categories"}</option>
// // // //             {categories.map((cat: string) => (
// // // //               <option key={cat} value={cat}>
// // // //                 {getCategoryLabel(cat)}
// // // //               </option>
// // // //             ))}
// // // //           </select>

// // // //           {networks.length > 0 && (
// // // //             <select
// // // //               value={selectedNetwork}
// // // //               onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
// // // //                 setSelectedNetwork(e.target.value)
// // // //               }
// // // //               style={{
// // // //                 padding: "0.6rem 2rem 0.6rem 1rem",
// // // //                 background: "var(--bg2)",
// // // //                 border: "1px solid var(--border)",
// // // //                 borderRadius: 10,
// // // //                 color: "var(--text)",
// // // //                 fontSize: "0.9rem",
// // // //                 outline: "none",
// // // //                 appearance: "none",
// // // //                 cursor: "pointer",
// // // //                 backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5F55' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
// // // //                 backgroundRepeat: "no-repeat",
// // // //                 backgroundPosition: "right 0.75rem center",
// // // //               }}
// // // //             >
// // // //               <option value="all">{t?.allNetworks || "All Networks"}</option>
// // // //               {networks.map((net: string) => (
// // // //                 <option key={net} value={net}>
// // // //                   {net}
// // // //                 </option>
// // // //               ))}
// // // //             </select>
// // // //           )}
// // // //         </div>
// // // //       </div>

// // // //       {/* Plans Grid */}
// // // //       {isLoading ? (
// // // //         <div
// // // //           style={{ textAlign: "center", padding: "3rem", color: "var(--dim)" }}
// // // //         >
// // // //           {t?.loading || "Loading plans..."}
// // // //         </div>
// // // //       ) : filteredPlans.length > 0 ? (
// // // //         <div
// // // //           style={{
// // // //             display: "grid",
// // // //             gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
// // // //             gap: "1rem",
// // // //           }}
// // // //         >
// // // //           {filteredPlans.map((plan: Plan) => (
// // // //             <PlanCard
// // // //               key={plan.id}
// // // //               plan={plan}
// // // //               config={config}
// // // //               translations={t}
// // // //               onEdit={() => {
// // // //                 setSelectedPlan(plan);
// // // //                 setShowEditModal(true);
// // // //               }}
// // // //               onUpdate={handlePlanUpdate}
// // // //             />
// // // //           ))}
// // // //         </div>
// // // //       ) : (
// // // //         <div
// // // //           style={{
// // // //             textAlign: "center",
// // // //             padding: "3rem",
// // // //             background: "var(--card)",
// // // //             border: "1px solid var(--border)",
// // // //             borderRadius: 12,
// // // //           }}
// // // //         >
// // // //           <p style={{ color: "var(--muted)", fontSize: "1rem" }}>
// // // //             {searchQuery ||
// // // //             selectedCategory !== "all" ||
// // // //             selectedNetwork !== "all"
// // // //               ? t?.noResults || "No plans match your filters"
// // // //               : t?.noPlans || "No plans available"}
// // // //           </p>
// // // //           <p
// // // //             style={{
// // // //               color: "var(--dim)",
// // // //               fontSize: "0.85rem",
// // // //               marginTop: "0.25rem",
// // // //             }}
// // // //           >
// // // //             {t?.addPlans || "Add plans to start selling"}
// // // //           </p>
// // // //         </div>
// // // //       )}

// // // //       {/* Modals */}
// // // //       {showEditModal && selectedPlan && (
// // // //         <EditPlanModal
// // // //           plan={selectedPlan}
// // // //           onClose={() => {
// // // //             setShowEditModal(false);
// // // //             setSelectedPlan(null);
// // // //           }}
// // // //           onSuccess={handlePlanUpdate}
// // // //           config={config}
// // // //           translations={t}
// // // //         />
// // // //       )}

// // // //       {showBulkModal && (
// // // //         <BulkPricingModal
// // // //           plans={plans}
// // // //           onClose={() => setShowBulkModal(false)}
// // // //           onSuccess={handlePlanUpdate}
// // // //           config={config}
// // // //           translations={t}
// // // //         />
// // // //       )}
// // // //     </div>
// // // //   );
// // // // }
