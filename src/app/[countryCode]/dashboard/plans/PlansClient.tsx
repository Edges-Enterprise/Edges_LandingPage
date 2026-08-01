// src/app/[countryCode]/dashboard/plans/PlansClient.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Filter,
  Plus,
  ChevronDown,
  Percent,
  DollarSign,
} from "lucide-react";
import PlanCard from "./PlanCard";
import EditPlanModal from "./EditPlanModal";
import BulkPricingModal from "./BulkPricingModal";
import { CountryConfig } from "@/config/countries";
import { Plan, PlansData } from "@/types/reseller/plans";

interface PlansClientProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  plansData: PlansData;
}

export default function PlansClient({
  countryCode,
  config,
  translations,
  plansData,
}: PlansClientProps) {
  const t = translations;
  const supabase = createClient();
  const [plans, setPlans] = useState<Plan[]>(plansData.plans);
  const [filteredPlans, setFilteredPlans] = useState<Plan[]>(plansData.plans);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const categories: string[] = plansData.categories || [];
  const networks: string[] = plansData.networks || [];

  // Filter plans
  useEffect(() => {
    let filtered: Plan[] = plans;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p: Plan) =>
          p.name?.toLowerCase().includes(query) ||
          p.network?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query),
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p: Plan) => p.category === selectedCategory);
    }

    if (selectedNetwork !== "all") {
      filtered = filtered.filter((p: Plan) => p.network === selectedNetwork);
    }

    setFilteredPlans(filtered);
  }, [plans, searchQuery, selectedCategory, selectedNetwork]);

  const refreshPlans = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("global_plans")
        .select("*")
        .eq("reseller_id", plansData.application.id)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (!error && data) {
        setPlans(data as Plan[]);
      }
    } catch (error) {
      console.error("Refresh error:", error);
    }
  };

  const handlePlanUpdate = (): void => {
    refreshPlans();
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      data: t?.dataPlans || "Data Plans",
      airtime: t?.airtimePlans || "Airtime Plans",
      electricity: t?.electricityPlans || "Electricity Plans",
      cable: t?.cablePlans || "Cable Plans",
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      data: "#3B82F6",
      airtime: "#8B5CF6",
      electricity: "#F59E0B",
      cable: "#10B981",
    };
    return colors[category] || "var(--muted)";
  };

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            {t?.title || "Plans & Pricing"}
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
            {t?.subtitle || "Manage your products and set your prices"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => setShowBulkModal(true)}
            style={{
              padding: "0.6rem 1.2rem",
              background: "transparent",
              color: "var(--text)",
              border: "1px solid var(--border2)",
              borderRadius: 8,
              fontWeight: 500,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brand-color)";
              e.currentTarget.style.background =
                "rgba(var(--brand-color-rgb), 0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border2)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Percent size={16} />
            {t?.bulkPricing || "Bulk Pricing"}
          </button>
          <button
            onClick={refreshPlans}
            style={{
              padding: "0.6rem 1rem",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--muted)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brand-color)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            ⟳
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
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
            {plans.length}
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
            {t?.categories || "Categories"}
          </p>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            {categories.length}
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
            {plans.filter((p: Plan) => p.is_active).length}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 200,
            display: "flex",
            alignItems: "center",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <Search
            size={18}
            style={{ color: "var(--dim)", marginLeft: "0.75rem" }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
            placeholder={t?.searchPlans || "Search plans..."}
            style={{
              flex: 1,
              padding: "0.6rem 0.75rem",
              background: "transparent",
              border: "none",
              color: "var(--text)",
              fontSize: "0.9rem",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <select
            value={selectedCategory}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSelectedCategory(e.target.value)
            }
            style={{
              padding: "0.6rem 2rem 0.6rem 1rem",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              color: "var(--text)",
              fontSize: "0.9rem",
              outline: "none",
              appearance: "none",
              cursor: "pointer",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5F55' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.75rem center",
            }}
          >
            <option value="all">{t?.allCategories || "All Categories"}</option>
            {categories.map((cat: string) => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat)}
              </option>
            ))}
          </select>

          {networks.length > 0 && (
            <select
              value={selectedNetwork}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedNetwork(e.target.value)
              }
              style={{
                padding: "0.6rem 2rem 0.6rem 1rem",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--text)",
                fontSize: "0.9rem",
                outline: "none",
                appearance: "none",
                cursor: "pointer",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5F55' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.75rem center",
              }}
            >
              <option value="all">{t?.allNetworks || "All Networks"}</option>
              {networks.map((net: string) => (
                <option key={net} value={net}>
                  {net}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div
          style={{ textAlign: "center", padding: "3rem", color: "var(--dim)" }}
        >
          {t?.loading || "Loading plans..."}
        </div>
      ) : filteredPlans.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {filteredPlans.map((plan: Plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              config={config}
              translations={t}
              onEdit={() => {
                setSelectedPlan(plan);
                setShowEditModal(true);
              }}
              onUpdate={handlePlanUpdate}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <p style={{ color: "var(--muted)", fontSize: "1rem" }}>
            {searchQuery ||
            selectedCategory !== "all" ||
            selectedNetwork !== "all"
              ? t?.noResults || "No plans match your filters"
              : t?.noPlans || "No plans available"}
          </p>
          <p
            style={{
              color: "var(--dim)",
              fontSize: "0.85rem",
              marginTop: "0.25rem",
            }}
          >
            {t?.addPlans || "Add plans to start selling"}
          </p>
        </div>
      )}

      {/* Modals */}
      {showEditModal && selectedPlan && (
        <EditPlanModal
          plan={selectedPlan}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={handlePlanUpdate}
          config={config}
          translations={t}
        />
      )}

      {showBulkModal && (
        <BulkPricingModal
          plans={plans}
          onClose={() => setShowBulkModal(false)}
          onSuccess={handlePlanUpdate}
          config={config}
          translations={t}
        />
      )}
    </div>
  );
}
