// app/(reseller-dashboard)/plans/PlansClient.tsx

"use client";

import { useState, useMemo } from "react";
import { Card } from "../Card";
import { Badge } from "../Badge";
import {
  bulkUpdateAllPlans,
  updateResellerPlan,
} from "@/app/actions/reseller/plans/updatePlan";
import {
  calculateResellerPrice,
  formatNaira,
} from "@/lib/pricing/calculatePrice";
import type { PlanWithPricing } from "@/types";
import {
  Check,
  X,
  Loader2,
  Pencil,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

const NETWORKS = ["MTN", "AIRTEL", "GLO", "9MOBILE"] as const;

export function PlansClient({
  resellerId,
  allPlans,
}: {
  resellerId: string;
  allPlans: PlanWithPricing[];
}) {
  const [activeTab, setActiveTab] = useState<(typeof NETWORKS)[number]>("MTN");
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editType, setEditType] = useState<"fixed" | "percentage">(
    "percentage",
  );
  const [editValue, setEditValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [bulkType, setBulkType] = useState<"fixed" | "percentage">(
    "percentage",
  );
  const [bulkValue, setBulkValue] = useState(20);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkScope, setBulkScope] = useState<"network" | "all">("network");
  const [plansData, setPlansData] = useState(allPlans);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Filter plans by active network tab
  const plans = useMemo(
    () => plansData.filter((p) => p.plan?.network === activeTab),
    [plansData, activeTab],
  );

  const handleToggle = async (planId: string, enabled: boolean) => {
    // Optimistic update
    setPlansData((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, enabled } : p)),
    );
    await updateResellerPlan(resellerId, { resellerPlanId: planId, enabled });
  };

  const startEdit = (plan: PlanWithPricing) => {
    setEditingPlan(plan.id);
    setEditType(plan.markup_type);
    setEditValue(plan.markup_value);
  };

  const cancelEdit = () => {
    setEditingPlan(null);
  };

  const saveEdit = async (planId: string) => {
    setSaving(true);
    const result = await updateResellerPlan(resellerId, {
      resellerPlanId: planId,
      markup_type: editType,
      markup_value: editValue,
    });

    if (result.success) {
      setPlansData((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                markup_type: editType,
                markup_value: editValue,
                finalPrice: calculateResellerPrice(
                  p.plan!.amount,
                  editType,
                  editValue,
                ),
                profit:
                  calculateResellerPrice(p.plan!.amount, editType, editValue) -
                  p.plan!.amount,
              }
            : p,
        ),
      );
      setEditingPlan(null);
      setMessage({ type: "success", text: "Plan updated successfully" });
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

    if (bulkScope === "all") {
      // Update ALL plans across all networks
      const result = await bulkUpdateAllPlans(resellerId, bulkType, bulkValue);
      if (result.success) {
        // Update local state for immediate feedback
        setPlansData((prev) =>
          prev.map((p) => ({
            ...p,
            markup_type: bulkType,
            markup_value: bulkValue,
            finalPrice: calculateResellerPrice(
              p.plan!.amount,
              bulkType,
              bulkValue,
            ),
            profit:
              calculateResellerPrice(p.plan!.amount, bulkType, bulkValue) -
              p.plan!.amount,
          })),
        );
        setMessage({
          type: "success",
          text: `All plans updated to ${bulkType === "percentage" ? `${bulkValue}%` : formatNaira(bulkValue)} markup`,
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to update plans",
        });
      }
    } else {
      // Update only current network tab
      const networkPlanIds = plans.map((p) => p.id);
      let hasError = false;

      for (const planId of networkPlanIds) {
        const result = await updateResellerPlan(resellerId, {
          resellerPlanId: planId,
          markup_type: bulkType,
          markup_value: bulkValue,
        });
        if (!result.success) hasError = true;
      }

      if (!hasError) {
        setPlansData((prev) =>
          prev.map((p) =>
            networkPlanIds.includes(p.id)
              ? {
                  ...p,
                  markup_type: bulkType,
                  markup_value: bulkValue,
                  finalPrice: calculateResellerPrice(
                    p.plan!.amount,
                    bulkType,
                    bulkValue,
                  ),
                  profit:
                    calculateResellerPrice(
                      p.plan!.amount,
                      bulkType,
                      bulkValue,
                    ) - p.plan!.amount,
                }
              : p,
          ),
        );
        setMessage({
          type: "success",
          text: `${activeTab} plans updated to ${bulkType === "percentage" ? `${bulkValue}%` : formatNaira(bulkValue)} markup`,
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: "error",
          text: "Some plans failed to update. Please try again.",
        });
      }
    }

    setBulkSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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
          Plan Management
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Toggle plans on/off and set your markup for each network
        </p>
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
      <Card>
        <h3
          style={{
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: "1rem",
            fontSize: "0.95rem",
          }}
        >
          Bulk Update Markup
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
            <label style={labelStyle}>Apply To</label>
            <select
              value={bulkScope}
              onChange={(e) =>
                setBulkScope(e.target.value as "network" | "all")
              }
              style={selectStyle}
            >
              <option value="network">Only {activeTab}</option>
              <option value="all">All Networks</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Markup Type</label>
            <select
              value={bulkType}
              onChange={(e) =>
                setBulkType(e.target.value as "fixed" | "percentage")
              }
              style={selectStyle}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₦)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Value</label>
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
            Apply to {bulkScope === "all" ? "All Networks" : activeTab}
          </button>
        </div>
      </Card>

      {/* Network Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {NETWORKS.map((net) => {
          const netPlanCount = plansData.filter(
            (p) => p.plan?.network === net,
          ).length;
          return (
            <button
              key={net}
              onClick={() => {
                setActiveTab(net);
                setEditingPlan(null);
              }}
              style={{
                ...tabStyle,
                background: activeTab === net ? "var(--accent)" : "var(--bg2)",
                color: activeTab === net ? "#FDF8F3" : "var(--muted)",
                border: activeTab === net ? "none" : "1px solid var(--border)",
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
                ({netPlanCount})
              </span>
            </button>
          );
        })}
      </div>

      {/* Plans List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {plans.length === 0 && (
          <Card>
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "var(--dim)",
              }}
            >
              <p>No {activeTab} plans available</p>
            </div>
          </Card>
        )}

        {plans.map((rp) => {
          const isEditing = editingPlan === rp.id;
          const finalPrice = isEditing
            ? calculateResellerPrice(rp.plan!.amount, editType, editValue)
            : rp.finalPrice;
          const profit = isEditing
            ? calculateResellerPrice(rp.plan!.amount, editType, editValue) -
              rp.plan!.amount
            : rp.profit;

          return (
            <Card key={rp.id} style={{ opacity: rp.enabled ? 1 : 0.55 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                {/* Plan info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: 4,
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
                      {rp.plan?.plan_name}
                    </h3>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--dim)",
                        background: "var(--bg2)",
                        padding: "0.15rem 0.5rem",
                        borderRadius: 4,
                      }}
                    >
                      {rp.plan?.plan_type}
                    </span>
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(rp.id, !rp.enabled)}
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        border: "none",
                        background: rp.enabled ? "var(--green)" : "var(--dim)",
                        position: "relative",
                        cursor: "pointer",
                        flexShrink: 0,
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
                          left: rp.enabled ? 20 : 2,
                          transition: "left 0.15s",
                        }}
                      />
                    </button>
                    {!rp.enabled && <Badge variant="error">Hidden</Badge>}
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--dim)" }}>
                    Base: {formatNaira(rp.plan!.amount)}
                    {rp.plan?.validity && ` • ${rp.plan.validity}`}
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
                      padding: "0.5rem 0.75rem",
                      borderRadius: 8,
                    }}
                  >
                    <select
                      value={editType}
                      onChange={(e) =>
                        setEditType(e.target.value as "fixed" | "percentage")
                      }
                      style={selectStyle}
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">₦</option>
                    </select>
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(Number(e.target.value))}
                      style={{ ...inputStyle, width: 80 }}
                      min="0"
                      step={editType === "percentage" ? "1" : "10"}
                    />
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--dim)",
                        minWidth: 80,
                        textAlign: "center",
                      }}
                    >
                      <div>
                        Sell:{" "}
                        <strong style={{ color: "var(--accent-lt)" }}>
                          {formatNaira(finalPrice)}
                        </strong>
                      </div>
                      <div>
                        Profit:{" "}
                        <strong style={{ color: "var(--green)" }}>
                          {formatNaira(profit)}
                        </strong>
                      </div>
                    </div>
                    <button
                      onClick={() => saveEdit(rp.id)}
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
                      Save
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
                    }}
                  >
                    <div style={{ textAlign: "center", minWidth: 60 }}>
                      <p style={{ fontSize: "0.7rem", color: "var(--dim)" }}>
                        Markup
                      </p>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        {rp.markup_type === "percentage"
                          ? `${rp.markup_value}%`
                          : formatNaira(rp.markup_value)}
                      </p>
                    </div>
                    <div style={{ textAlign: "center", minWidth: 80 }}>
                      <p style={{ fontSize: "0.7rem", color: "var(--dim)" }}>
                        Selling Price
                      </p>
                      <p
                        style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: "var(--accent-lt)",
                        }}
                      >
                        {formatNaira(finalPrice)}
                      </p>
                    </div>
                    <div style={{ textAlign: "center", minWidth: 60 }}>
                      <p style={{ fontSize: "0.7rem", color: "var(--dim)" }}>
                        Profit
                      </p>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--green)",
                        }}
                      >
                        {formatNaira(profit)}
                      </p>
                    </div>
                    {rp.enabled && (
                      <button
                        onClick={() => startEdit(rp)}
                        style={btnIconStyle}
                        title="Edit markup"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Styles
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
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
  fontSize: "0.88rem",
  outline: "none",
  fontFamily: "inherit",
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
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
  padding: "0.6rem 1.2rem",
  background: "var(--accent)",
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
  padding: "0.4rem 0.8rem",
  background: "var(--green)",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
const btnCancelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.4rem",
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