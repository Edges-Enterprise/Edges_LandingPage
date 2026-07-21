// src/app/[countryCode]/dashboard/plans/PlansClient.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Package,
  DollarSign,
  TrendingUp,
  Tag,
  Clock,
  Eye,
  EyeOff,
  MoreVertical,
} from "lucide-react";
import { getPlans, Plan } from "@/actions/reseller/plans/getPlans";
import { deletePlan } from "@/actions/reseller/plans/deletePlan";
import { updatePlan } from "@/actions/reseller/plans/updatePlan";
import { CreatePlanModal } from "./CreatePlanModal";
import { EditPlanModal } from "./EditPlanModal";
import { cn } from "@/lib/utils/helpers";

interface PlansClientProps {
  countryCode: string;
}

export function PlansClient({ countryCode }: PlansClientProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get unique categories for filter
  const categories = [...new Set(plans.map((p) => p.category))];

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getPlans({
        page: currentPage,
        limit: pageSize,
        search: search || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        is_active:
          statusFilter !== "all" ? statusFilter === "active" : undefined,
      });

      if (result.success && result.data) {
        setPlans(result.data);
        setTotal(result.total || 0);
      } else {
        setError(result.error || "Failed to load plans");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (category: string) => {
    setCategoryFilter(category);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: "all" | "active" | "inactive") => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Are you sure you want to delete "${plan.name}"?`)) return;

    const result = await deletePlan(plan.id);

    if (result.success) {
      fetchPlans();
    } else {
      setError(result.error || "Failed to delete plan");
    }
  };

  const handleToggleStatus = async (plan: Plan) => {
    const result = await updatePlan({
      planId: plan.id,
      is_active: !plan.is_active,
    });

    if (result.success) {
      fetchPlans();
    } else {
      setError(result.error || "Failed to update plan status");
    }
  };

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsEditModalOpen(true);
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    fetchPlans();
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedPlan(null);
    fetchPlans();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Plans
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your data and airtime plans
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/80 transition-colors"
        >
          <Plus size={18} />
          Create Plan
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search plans by name, provider, or category..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleCategoryFilter("all")}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
              categoryFilter === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryFilter(category)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                categoryFilter === category
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
              )}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusFilter("all")}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
              statusFilter === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
            )}
          >
            All
          </button>
          <button
            onClick={() => handleStatusFilter("active")}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
              statusFilter === "active"
                ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
            )}
          >
            Active
          </button>
          <button
            onClick={() => handleStatusFilter("inactive")}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
              statusFilter === "inactive"
                ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
            )}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
            >
              <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="mt-2 h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="mt-4 h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No plans found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {search
              ? "Try adjusting your search"
              : "Start creating plans to offer to your customers"}
          </p>
          {!search && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
            >
              Create Your First Plan
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, total)} of {total} plans
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={cn(
                    "p-2 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors",
                    currentPage === 1
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700",
                  )}
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={cn(
                        "px-3 py-2 rounded-lg border transition-colors",
                        currentPage === pageNum
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={cn(
                    "p-2 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors",
                    currentPage === totalPages
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700",
                  )}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {isCreateModalOpen && (
        <CreatePlanModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
          countryCode={countryCode}
        />
      )}

      {selectedPlan && (
        <EditPlanModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedPlan(null);
          }}
          onSuccess={handleEditSuccess}
          plan={selectedPlan}
          countryCode={countryCode}
        />
      )}
    </div>
  );
}

// Plan Card Component
function PlanCard({
  plan,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onToggleStatus: (plan: Plan) => void;
}) {
  const profitMargin = plan.price > 0 ? (plan.profit / plan.price) * 100 : 0;

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all",
        plan.is_active
          ? "border-gray-200 dark:border-gray-700 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-gray-900/50"
          : "border-gray-200 dark:border-gray-700 opacity-60 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-gray-900/50",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {plan.name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {plan.provider}
          </p>
        </div>
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            plan.is_active
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
          )}
        >
          {plan.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Details */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
          <Tag size={14} className="text-gray-400" />
          <span>{plan.category}</span>
          {plan.data_amount && (
            <>
              <span className="text-gray-400">•</span>
              <span>{plan.data_amount}</span>
            </>
          )}
          {plan.validity && (
            <>
              <span className="text-gray-400">•</span>
              <span>{plan.validity}</span>
            </>
          )}
        </div>
        {plan.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {plan.description}
          </p>
        )}
      </div>

      {/* Pricing */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${plan.price.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Cost: ${plan.cost.toLocaleString()}</span>
              <span>•</span>
              <span className="text-green-600 dark:text-green-400">
                Profit: ${plan.profit.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span
              className={cn(
                "text-sm font-medium",
                profitMargin >= 20
                  ? "text-green-600 dark:text-green-400"
                  : profitMargin >= 10
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400",
              )}
            >
              {profitMargin.toFixed(1)}% margin
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
        <button
          onClick={() => onToggleStatus(plan)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            plan.is_active
              ? "text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
              : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20",
          )}
        >
          {plan.is_active ? "Deactivate" : "Activate"}
        </button>
        <button
          onClick={() => onEdit(plan)}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Edit size={16} />
        </button>
        <button
          onClick={() => onDelete(plan)}
          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
