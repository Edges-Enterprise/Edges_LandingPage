// src/app/[countryCode]/dashboard/orders/OrderDetailsModal.tsx
"use client";

import { useEffect, useState } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  Hash,
  RefreshCw,
} from "lucide-react";
import {
  getOrderDetails,
  OrderDetails,
} from "@/actions/reseller/orders/getOrderDetails";
import { updateOrderStatus } from "@/actions/reseller/orders/updateOrderStatus";
import { cn } from "@/lib/utils/helpers";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  countryCode: string;
  onUpdate?: () => void;
}

export function OrderDetailsModal({
  isOpen,
  onClose,
  orderId,
  countryCode,
  onUpdate,
}: OrderDetailsModalProps) {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getOrderDetails(orderId);

      if (result.success && result.data) {
        setOrder(result.data);
      } else {
        setError(result.error || "Failed to load order details");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (
    status: "pending" | "completed" | "failed" | "cancelled",
  ) => {
    setIsUpdating(true);
    setError(null);

    try {
      const result = await updateOrderStatus(orderId, status);

      if (result.success) {
        await fetchOrderDetails();
        if (onUpdate) onUpdate();
      } else {
        setError(result.error || "Failed to update order status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          color:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
          icon: Clock,
        };
      case "completed":
        return {
          label: "Completed",
          color:
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
          icon: CheckCircle,
        };
      case "failed":
        return {
          label: "Failed",
          color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
          icon: XCircle,
        };
      case "cancelled":
        return {
          label: "Cancelled",
          color:
            "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color:
            "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
          icon: Clock,
        };
    }
  };

  const status = order
    ? getStatusBadge(order.status)
    : { label: "", color: "", icon: Clock };
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Order Details
            </h3>
            {order && (
              <span
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                  status.color,
                )}
              >
                <StatusIcon size={12} />
                {status.label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-gray-200 dark:bg-gray-700 rounded"
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchOrderDetails}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Order Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Hash size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Order ID
                  </p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    #{order.id.slice(0, 12)}...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Calendar size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Date
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-gray-400" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Customer
                </p>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {order.customer_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {order.customer_email}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {order.customer_phone}
              </p>
            </div>

            {/* Plan Info */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag size={18} className="text-gray-400" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Plan</p>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {order.plan_name}
              </p>
              {order.plan_description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {order.plan_description}
                </p>
              )}
            </div>

            {/* Financial Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Amount
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  ${order.amount.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Profit
                </p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  ${order.profit.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Margin
                </p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {order.amount > 0
                    ? Math.round((order.profit / order.amount) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <CreditCard size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Payment Method
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white capitalize">
                    {order.payment_method}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Hash size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Transaction Reference
                  </p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {order.transaction_reference}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Update Actions */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Update Status
              </p>
              <div className="flex flex-wrap gap-2">
                {["pending", "completed", "failed", "cancelled"].map(
                  (statusOption) => {
                    const isActive = order.status === statusOption;
                    const statusInfo = getStatusBadge(statusOption);
                    const Icon = statusInfo.icon;

                    return (
                      <button
                        key={statusOption}
                        onClick={() => handleStatusUpdate(statusOption as any)}
                        disabled={isUpdating || isActive}
                        className={cn(
                          "px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2",
                          isActive
                            ? "border-primary bg-primary/10 text-primary cursor-default"
                            : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed",
                        )}
                      >
                        <Icon size={14} />
                        {statusOption.charAt(0).toUpperCase() +
                          statusOption.slice(1)}
                      </button>
                    );
                  },
                )}
              </div>
              {isUpdating && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  Updating status...
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
