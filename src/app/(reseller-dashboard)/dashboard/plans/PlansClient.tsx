// app/(reseller-dashboard)/plans/PlansClient.tsx

"use client";

import { useState } from "react";
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
import { Check, X, Loader2, Pencil, RotateCcw } from "lucide-react";

export function PlansClient({
  resellerId,
  dataPlans,
  airtimePlans,
}: {
  resellerId: string;
  dataPlans: PlanWithPricing[];
  airtimePlans: PlanWithPricing[];
}) {
  const [activeTab, setActiveTab] = useState<"data" | "airtime">("data");
  const [plans, setPlans] = useState(dataPlans);
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

  const switchTab = (tab: "data" | "airtime") => {
    setActiveTab(tab);
    setPlans(tab === "data" ? dataPlans : airtimePlans);
    setEditingPlan(null);
  };

  const handleToggle = async (planId: string, enabled: boolean) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, enabled } : p)),
    );
    await updateResellerPlan(resellerId, {
      resellerPlanId: planId,
      enabled,
    });
  };

  const startEdit = (plan: PlanWithPricing) => {
    setEditingPlan(plan.id);
    setEditType(plan.markup_type);
    setEditValue(plan.markup_value);
  };

  const saveEdit = async (planId: string) => {
    setSaving(true);
    await updateResellerPlan(resellerId, {
      resellerPlanId: planId,
      markup_type: editType,
      markup_value: editValue,
    });
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              markup_type: editType,
              markup_value: editValue,
              finalPrice: calculateResellerPrice(
                p.plan!.base_price,
                editType,
                editValue,
              ),
              profit:
                calculateResellerPrice(
                  p.plan!.base_price,
                  editType,
                  editValue,
                ) - p.plan!.base_price,
            }
          : p,
      ),
    );
    setEditingPlan(null);
    setSaving(false);
  };

  const handleBulkUpdate = async () => {
    setBulkSaving(true);
    await bulkUpdateAllPlans(resellerId, bulkType, bulkValue);
    // Refresh the page to get updated data
    window.location.reload();
  };

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
          Plan Management
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Toggle plans on/off and set your markup for each
        </p>
      </div>

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
          Bulk Update All {activeTab === "data" ? "Data" : "Airtime"} Plans
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
            />
          </div>
          <button
            onClick={handleBulkUpdate}
            disabled={bulkSaving}
            style={btnSecondaryStyle}
          >
            {bulkSaving ? (
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <RotateCcw size={16} />
            )}
            Apply to All
          </button>
        </div>
      </Card>

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => switchTab("data")}
          style={{
            ...tabStyle,
            background: activeTab === "data" ? "var(--accent)" : "var(--bg2)",
            color: activeTab === "data" ? "#FDF8F3" : "var(--muted)",
            border: activeTab === "data" ? "none" : "1px solid var(--border)",
          }}
        >
          📱 Data Plans
        </button>
        <button
          onClick={() => switchTab("airtime")}
          style={{
            ...tabStyle,
            background:
              activeTab === "airtime" ? "var(--accent)" : "var(--bg2)",
            color: activeTab === "airtime" ? "#FDF8F3" : "var(--muted)",
            border:
              activeTab === "airtime" ? "none" : "1px solid var(--border)",
          }}
        >
          📞 Airtime Plans
        </button>
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
          const finalPrice = calculateResellerPrice(
            rp.plan!.base_price,
            rp.markup_type,
            rp.markup_value,
          );
          const profit = finalPrice - rp.plan!.base_price;

          return (
            <Card key={rp.id} style={{ opacity: rp.enabled ? 1 : 0.5 }}>
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
                    }}
                  >
                    <h3
                      style={{
                        fontWeight: 600,
                        color: "var(--text)",
                        fontSize: "0.95rem",
                      }}
                    >
                      {rp.plan?.name}
                    </h3>
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
                  {rp.plan?.description && (
                    <p style={{ fontSize: "0.8rem", color: "var(--dim)" }}>
                      {rp.plan.description}
                      {rp.plan.validity && ` • ${rp.plan.validity}`}
                    </p>
                  )}
                </div>

                {/* Editing controls */}
                {isEditing ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
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
                    />
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
                    <button
                      onClick={() => setEditingPlan(null)}
                      style={btnCancelStyle}
                    >
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
                    <div style={{ textAlign: "center" }}>
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
                    <div style={{ textAlign: "center" }}>
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
                    <div style={{ textAlign: "center" }}>
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
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
};

const btnSecondaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "0.5rem 1rem",
  background: "var(--bg2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
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
