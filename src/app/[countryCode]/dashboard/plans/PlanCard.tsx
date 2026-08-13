// src/app/[countryCode]/dashboard/plans/PlanCard.tsx
"use client";

import { useState } from "react";
import {
  Edit2,
  Check,
  X,
  TrendingUp,
  Tag,
  DollarSign,
  Wifi, Package, Globe
} from "lucide-react";
import { PlanWithConfig } from "@/types/reseller/plans";
import { CountryConfig } from "@/config/countries";

interface PlanCardProps {
  plan: PlanWithConfig;
  config: CountryConfig;
  translations: any;
  onEdit: () => void;
  onToggle: () => void;
}

type CategoryIconMap = {
  [key: string]: React.ComponentType<{
    size?: number;
    style?: React.CSSProperties;
  }>;
};

type CategoryColorMap = {
  [key: string]: string;
};

type CategoryLabelMap = {
  [key: string]: string;
};

export default function PlanCard({
  plan,
  config,
  translations,
  onEdit,
  onToggle,
}: PlanCardProps) {
  const t = translations;
  const [isToggling, setIsToggling] = useState(false);

  const formatPrice = (amount: number): string => {
    const symbol = config.currencySymbol || "₦";
    return `${symbol} ${amount?.toLocaleString() || 0}`;
  };

  const getCategoryIcon = (
    category: string,
  ): React.ComponentType<{ size?: number; style?: React.CSSProperties }> => {
    const icons: CategoryIconMap = {
      data: Wifi,
      airtime: Tag,
      electricity: DollarSign,
      cable: TrendingUp,
      bundle: Package,
      esim: Globe,
    };
    return icons[category] || Tag;
  };

  const getCategoryColor = (category: string): string => {
    const colors: CategoryColorMap = {
      data: "#3B82F6",
      airtime: "#8B5CF6",
      electricity: "#F59E0B",
      cable: "#10B981",
      bundle: "#EC4899",
      esim: "#14B8A6",
    };
    return colors[category] || "var(--muted)";
  };

  const getCategoryLabel = (category: string): string => {
    const labels: CategoryLabelMap = {
      data: t?.data || "Data",
      airtime: t?.airtime || "Airtime",
      electricity: t?.electricity || "Electricity",
      cable: t?.cable || "Cable TV",
      bundle: t?.bundle || "Bundle",
      esim: t?.esim || "eSIM",
    };
    return labels[category] || category;
  };

  const CategoryIcon = getCategoryIcon(plan.category);
  const categoryColor = getCategoryColor(plan.category);
  const isEnabled = plan.config?.enabled ?? false;
  const sellingPrice = plan.config?.selling_price || plan.base_price;
  const profit = sellingPrice - plan.base_price;
  const profitPercent =
    plan.base_price > 0 ? Math.round((profit / plan.base_price) * 100) : 0;

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle();
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div
      style={{
        background: "var(--card)",
        border: `1px solid ${isEnabled ? "var(--border)" : "var(--border)"}`,
        borderRadius: 12,
        padding: "1.25rem",
        transition: "all 0.2s",
        position: "relative",
        opacity: isEnabled ? 1 : 0.6,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "rgba(var(--brand-color-rgb), 0.2)";
        e.currentTarget.style.boxShadow = "var(--shadow)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = isEnabled
          ? "var(--border)"
          : "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Status Badge */}
      <div
        style={{
          position: "absolute",
          top: "0.75rem",
          right: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.6rem",
            fontWeight: 600,
            color: isEnabled ? "#6EBD8A" : "var(--dim)",
            background: isEnabled
              ? "rgba(110,189,138,0.12)"
              : "rgba(107,95,85,0.12)",
            padding: "2px 10px",
            borderRadius: 100,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {isEnabled ? t?.active || "Active" : t?.inactive || "Inactive"}
        </span>
      </div>

      {/* Icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${categoryColor}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "0.75rem",
        }}
      >
        <CategoryIcon size={18} style={{ color: categoryColor }} />
      </div>

      {/* Name */}
      <h3
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.05rem",
          fontWeight: 700,
          marginBottom: "0.25rem",
          color: "var(--text)",
        }}
      >
        {plan.name}
      </h3>

      {/* Tags */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "0.75rem",
        }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--muted)",
            background: "var(--bg2)",
            padding: "2px 10px",
            borderRadius: 100,
          }}
        >
          {getCategoryLabel(plan.category)}
        </span>
        {plan.network && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--muted)",
              background: "var(--bg2)",
              padding: "2px 10px",
              borderRadius: 100,
            }}
          >
            {plan.network}
          </span>
        )}
        {plan.provider && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--muted)",
              background: "var(--bg2)",
              padding: "2px 10px",
              borderRadius: 100,
            }}
          >
            {plan.provider}
          </span>
        )}
      </div>

      {/* Description */}
      {plan.description && (
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--muted)",
            marginBottom: "0.75rem",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {plan.description}
        </p>
      )}

      {/* Prices */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0.5rem",
          padding: "0.75rem",
          background: "var(--bg2)",
          borderRadius: 8,
          marginBottom: "0.75rem",
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
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--muted)",
            }}
          >
            {formatPrice(plan.base_price)}
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
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            {formatPrice(sellingPrice)}
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
              fontSize: "0.85rem",
              fontWeight: 700,
              color: profit > 0 ? "#6EBD8A" : "var(--dim)",
            }}
          >
            {profit > 0 ? "+" : ""}
            {formatPrice(profit)}
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

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderTop: "1px solid var(--border)",
          paddingTop: "0.75rem",
        }}
      >
        <button
          onClick={onEdit}
          style={{
            flex: 1,
            padding: "0.4rem 0.75rem",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            fontSize: "0.8rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--brand-color)";
            e.currentTarget.style.background =
              "rgba(var(--brand-color-rgb), 0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Edit2 size={14} />
          {t?.edit || "Edit"}
        </button>

        <button
          onClick={handleToggle}
          disabled={isToggling}
          style={{
            flex: 1,
            padding: "0.4rem 0.75rem",
            background: isEnabled
              ? "rgba(239,68,68,0.08)"
              : "rgba(110,189,138,0.08)",
            border: `1px solid ${isEnabled ? "rgba(239,68,68,0.2)" : "rgba(110,189,138,0.2)"}`,
            borderRadius: 6,
            color: isEnabled ? "#EF4444" : "#6EBD8A",
            fontSize: "0.8rem",
            cursor: isToggling ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            transition: "all 0.2s",
            opacity: isToggling ? 0.6 : 1,
          }}
        >
          {isToggling ? (
            <span
              style={{
                display: "inline-block",
                animation: "spin 1s linear infinite",
              }}
            >
              ⟳
            </span>
          ) : isEnabled ? (
            <>
              <X size={14} />
              {t?.disable || "Disable"}
            </>
          ) : (
            <>
              <Check size={14} />
              {t?.enable || "Enable"}
            </>
          )}
        </button>
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

