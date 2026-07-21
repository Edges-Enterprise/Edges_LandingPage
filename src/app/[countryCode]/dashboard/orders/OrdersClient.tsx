// src/app/[countryCode]/dashboard/orders/OrdersClient.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  DollarSign,
  Calendar,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
} from "lucide-react";
import { getOrders, Order } from "@/actions/reseller/orders/getOrders";
import { updateOrderStatus } from "@/actions/reseller/orders/updateOrderStatus";
import { OrderDetailsModal } from "./OrderDetailsModal";
import { CreateOrderModal } from "@/components/reseller/modals/CreateOrderModal";
import { cn } from "@/lib/utils/helpers";

interface OrdersClientProps {
  countryCode: string;
}

export function OrdersClient({ countryCode }: OrdersClientProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "completed" | "failed" | "cancelled"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getOrders({
        page: currentPage,
        limit: pageSize,
        search: search || undefined,
        status: statusFilter,
      });

      if (result.success && result.data) {
        setOrders(result.data);
        setTotal(result.total || 0);
      } else {
        setError(result.error || "Failed to load orders");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (
    status: "all" | "pending" | "completed" | "failed" | "cancelled",
  ) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleStatusUpdate = async (
    orderId: string,
    status: "pending" | "completed" | "failed" | "cancelled",
  ) => {
    const result = await updateOrderStatus(orderId, status);

    if (result.success) {
      fetchOrders();
    } else {
      setError(result.error || "Failed to update order status");
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    fetchOrders();
  };

  const totalPages = Math.ceil(total / pageSize);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Orders
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage and track all your orders
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/80 transition-colors"
        >
          <Plus size={18} />
          Create Order
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
            placeholder="Search orders by customer, plan, or reference..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "completed", "failed", "cancelled"].map(
            (status) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status as any)}
                className={cn(
                  "px-4 py-2 rounded-lg border text-sm font-medium transition-colors capitalize",
                  statusFilter === status
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
                )}
              >
                {status}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No orders found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {search
                ? "Try adjusting your search"
                : "Start creating orders to track your sales"}
            </p>
            {!search && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
              >
                Create Your First Order
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order) => {
                    const status = getStatusBadge(order.status);
                    const StatusIcon = status.icon;

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => handleViewOrder(order)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ShoppingBag size={16} className="text-gray-400" />
                            <span className="font-mono text-sm text-gray-900 dark:text-white">
                              #{order.id.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {order.customer_name}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {order.plan_name}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            ${order.amount.toLocaleString()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${order.profit.toLocaleString()}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit",
                              status.color,
                            )}
                          >
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewOrder(order);
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, total)} of {total} orders
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
      </div>

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedOrder(null);
          }}
          orderId={selectedOrder.id}
          countryCode={countryCode}
          onUpdate={fetchOrders}
        />
      )}

      {isCreateModalOpen && (
        <CreateOrderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
          countryCode={countryCode}
        />
      )}
    </div>
  );
}
