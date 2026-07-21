// src/components/reseller/modals/CreateOrderModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Search,
  User,
  ShoppingBag,
  DollarSign,
} from "lucide-react";
import { createOrder } from "@/actions/reseller/orders/createOrder";
import {
  getCustomers,
  Customer,
} from "@/actions/reseller/customers/getCustomers";
import { getPlans, Plan } from "@/actions/reseller/plans/getPlans";
import { cn } from "@/lib/utils/helpers";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  countryCode: string;
}

export function CreateOrderModal({
  isOpen,
  onClose,
  onSuccess,
  countryCode,
}: CreateOrderModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("wallet");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchPlan, setSearchPlan] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [customersResult, plansResult] = await Promise.all([
        getCustomers({ limit: 100 }),
        getPlans({ limit: 100 }),
      ]);

      if (customersResult.success && customersResult.data) {
        setCustomers(customersResult.data);
      }

      if (plansResult.success && plansResult.data) {
        setPlans(plansResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    `${c.first_name} ${c.last_name} ${c.email} ${c.phone}`
      .toLowerCase()
      .includes(searchCustomer.toLowerCase()),
  );

  const filteredPlans = plans.filter((p) =>
    p.name.toLowerCase().includes(searchPlan.toLowerCase()),
  );

  const selectedCustomerData = customers.find((c) => c.id === selectedCustomer);
  const selectedPlanData = plans.find((p) => p.id === selectedPlan);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!selectedCustomer || !selectedPlan) {
      setError("Please select a customer and a plan");
      setIsSubmitting(false);
      return;
    }

    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) {
      setError("Selected plan not found");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createOrder({
        customer_id: selectedCustomer,
        plan_id: selectedPlan,
        plan_name: plan.name,
        amount: plan.price,
        profit: plan.profit || 0,
        payment_method: paymentMethod,
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to create order");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Create Order
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Customer *
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
              />
            </div>
            {searchCustomer && filteredCustomers.length > 0 && (
              <div className="mt-1 max-h-32 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(customer.id);
                      setSearchCustomer(
                        `${customer.first_name} ${customer.last_name}`,
                      );
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors",
                      selectedCustomer === customer.id && "bg-primary/10",
                    )}
                  >
                    {customer.first_name} {customer.last_name}
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">
                      {customer.email}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedCustomerData && !searchCustomer && (
              <div className="mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                {selectedCustomerData.first_name}{" "}
                {selectedCustomerData.last_name}
              </div>
            )}
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Plan *
            </label>
            <div className="relative">
              <ShoppingBag
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                value={searchPlan}
                onChange={(e) => setSearchPlan(e.target.value)}
                placeholder="Search plans..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
              />
            </div>
            {searchPlan && filteredPlans.length > 0 && (
              <div className="mt-1 max-h-32 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                {filteredPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlan(plan.id);
                      setSearchPlan(plan.name);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex justify-between",
                      selectedPlan === plan.id && "bg-primary/10",
                    )}
                  >
                    <span>{plan.name}</span>
                    <span className="text-primary font-medium">
                      ${plan.price}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedPlanData && !searchPlan && (
              <div className="mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm flex justify-between">
                <span>{selectedPlanData.name}</span>
                <span className="text-primary font-medium">
                  ${selectedPlanData.price}
                </span>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["wallet", "card", "bank", "mobile_money"].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    "p-2 rounded-lg border text-sm transition-colors capitalize",
                    paymentMethod === method
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500",
                  )}
                >
                  {method.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          {selectedCustomerData && selectedPlanData && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order Summary
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Customer
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {selectedCustomerData.first_name}{" "}
                    {selectedCustomerData.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Plan</span>
                  <span className="text-gray-900 dark:text-white">
                    {selectedPlanData.name}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Total
                  </span>
                  <span className="font-bold text-primary">
                    ${selectedPlanData.price}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedCustomer || !selectedPlan}
              className={cn(
                "flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-medium transition-all",
                "hover:bg-primary/80",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Order"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
