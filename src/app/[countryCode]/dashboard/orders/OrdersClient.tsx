// src/app/[countryCode]/dashboard/orders/OrdersClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import OrdersTable from "./OrdersTable";
import OrderDetailsModal from "./OrderDetailsModal";
import UpdateStatusModal from "./UpdateStatusModal";
import { CountryConfig } from "@/config/countries";
import { Order, OrdersData, OrderStats, OrderStatusHistoryEntry } from "@/types/reseller/orders";

interface OrdersClientProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  ordersData: OrdersData;
  /** Order id from the URL (?order=…), opened on arrival from Recent Activity. */
  initialOrderId?: string;
}

export default function OrdersClient({
  countryCode,
  config,
  translations,
  ordersData,
  initialOrderId,
}: OrdersClientProps) {
  const t = translations;
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>(ordersData.orders);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>(
    ordersData.orders,
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [stats, setStats] = useState<OrderStats>(ordersData.stats);
  const [statusHistory, setStatusHistory] = useState<
    Record<string, OrderStatusHistoryEntry[]>
  >(ordersData.statusHistory || {});

  const currencySymbol = config.currencySymbol || "₦";

  // The table has no plan_category column; payment_method is the only
  // grouping field it stores, so the second filter groups by that.
  const categories = orders
    ? [...new Set(orders.map((o) => o.payment_method).filter(Boolean))]
    : [];

  // Opened with ?order=<id> from Recent Activity: select that order and show
  // its detail modal. Guarded so it runs once per id, not on every re-render.
  const openedInitialOrder = useRef<string | null>(null);
  useEffect(() => {
    if (!initialOrderId || openedInitialOrder.current === initialOrderId) {
      return;
    }
    const match = orders.find((o: Order) => o.id === initialOrderId);
    if (match) {
      openedInitialOrder.current = initialOrderId;
      setSelectedOrder(match);
      setShowDetailsModal(true);
    }
  }, [initialOrderId, orders]);

  // Filter orders
  useEffect(() => {
    let filtered = orders;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o: Order) =>
          o.transaction_reference?.toLowerCase().includes(query) ||
          o.customer_name?.toLowerCase().includes(query) ||
          o.plan_name?.toLowerCase().includes(query) ||
          o.payment_method?.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((o: Order) => o.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (o: Order) => o.payment_method === categoryFilter,
      );
    }

    setFilteredOrders(filtered);
  }, [orders, searchQuery, statusFilter, categoryFilter]);

  const refreshOrders = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("global_orders")
        .select("*")
        .eq("reseller_id", ordersData.application.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data as Order[]);

        // Update stats
        const completedOrders = data.filter((o) => o.status === "completed");
        const pendingOrders = data.filter((o) => o.status === "pending");
        const failedOrders = data.filter(
          (o) => o.status === "failed" || o.status === "cancelled",
        );
        const totalRevenue = completedOrders.reduce(
          (sum, o) => sum + (o.amount || 0),
          0,
        );
        const totalProfit = completedOrders.reduce(
          (sum, o) => sum + (o.profit || 0),
          0,
        );

        setStats({
          total_orders: data.length,
          completed_orders: completedOrders.length,
          pending_orders: pendingOrders.length,
          failed_orders: failedOrders.length,
          total_revenue: totalRevenue,
          total_profit: totalProfit,
          average_order_value:
            completedOrders.length > 0
              ? totalRevenue / completedOrders.length
              : 0,
        });

        // Re-read the audit trail so a fresh status change shows immediately.
        const { data: history } = await supabase
          .from("global_order_status_history")
          .select("*")
          .in(
            "order_id",
            data.map((o) => o.id),
          )
          .order("created_at", { ascending: false });

        if (history) {
          setStatusHistory(
            history.reduce(
              (acc: Record<string, OrderStatusHistoryEntry[]>, entry: any) => {
                (acc[entry.order_id] ||= []).push(entry);
                return acc;
              },
              {},
            ),
          );
        }
      }
    } catch (error) {
      console.error("Refresh error:", error);
    }
  };

  const handleOrderUpdated = (): void => {
    refreshOrders();
  };

  const formatPrice = (amount: number): string => {
    return `${currencySymbol} ${amount?.toLocaleString() || 0}`;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      completed: "#6EBD8A",
      pending: "#F59E0B",
      failed: "#EF4444",
      cancelled: "#8B5CF6",
    };
    return colors[status] || "var(--muted)";
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      completed: CheckCircle,
      pending: Clock,
      failed: XCircle,
      cancelled: XCircle,
    };
    return icons[status] || Package;
  };

  return (
    <div>
      <style>{`
        /* The dashboard sidebar is a fixed 240px, so the content column is
           much narrower than the viewport. A viewport media query therefore
           flipped these to 2x2 on ordinary desktops (a 1024px viewport leaves
           only ~736px of content). Query the content column instead, so the
           four cards stay on one row wherever they actually fit. */
        .orders-stats-wrap { container-type: inline-size; }
        .orders-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .orders-stat-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0.7rem 0.85rem;
          min-width: 0;
        }
        .orders-stat-card > p { overflow-wrap: anywhere; }
        @container (max-width: 600px) {
          .orders-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.5rem;
          }
          .orders-stat-card { padding: 0.6rem 0.7rem; }
          .orders-stat-card > p { font-size: 1.1rem !important; }
        }
      `}</style>
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
            {t?.title || "Orders"}
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
            {t?.subtitle || "View and manage your orders"}
          </p>
        </div>
        <button
          onClick={refreshOrders}
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

      {/* Stats Cards */}
      <div className="orders-stats-wrap">
      <div className="orders-stats-grid">
        <div className="orders-stat-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: 0,
              }}
            >
              {t?.totalOrders || "Total Orders"}
            </p>
            <Package size={14} style={{ color: "var(--brand-color)" }} />
          </div>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--text)",
              margin: "0.25rem 0 0 0",
            }}
          >
            {stats.total_orders}
          </p>
        </div>

        <div className="orders-stat-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: 0,
              }}
            >
              {t?.completedOrders || "Completed"}
            </p>
            <CheckCircle size={14} style={{ color: "#6EBD8A" }} />
          </div>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#6EBD8A",
              margin: "0.25rem 0 0 0",
            }}
          >
            {stats.completed_orders}
          </p>
        </div>

        <div className="orders-stat-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: 0,
              }}
            >
              {t?.pendingOrders || "Pending"}
            </p>
            <Clock size={14} style={{ color: "#F59E0B" }} />
          </div>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#F59E0B",
              margin: "0.25rem 0 0 0",
            }}
          >
            {stats.pending_orders}
          </p>
        </div>

        <div className="orders-stat-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: 0,
              }}
            >
              {t?.totalRevenue || "Revenue"}
            </p>
            <DollarSign size={14} style={{ color: "#3B82F6" }} />
          </div>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#3B82F6",
              margin: "0.25rem 0 0 0",
            }}
          >
            {formatPrice(stats.total_revenue)}
          </p>
        </div>
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
            placeholder={t?.searchOrders || "Search orders..."}
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

        <select
          value={statusFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setStatusFilter(e.target.value)
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
          <option value="all">{t?.allStatus || "All Status"}</option>
          <option value="pending">{t?.pending || "Pending"}</option>
          <option value="completed">{t?.completed || "Completed"}</option>
          <option value="failed">{t?.failed || "Failed"}</option>
          <option value="cancelled">{t?.cancelled || "Cancelled"}</option>
        </select>

        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setCategoryFilter(e.target.value)
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
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {t?.[cat as keyof typeof t] || cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Orders Table */}
      <OrdersTable
        orders={filteredOrders}
        config={config}
        translations={t}
        statusHistory={statusHistory}
        onView={(order: Order) => {
          setSelectedOrder(order);
          setShowDetailsModal(true);
        }}
        onUpdateStatus={(order: Order) => {
          setSelectedOrder(order);
          setShowStatusModal(true);
        }}
        onUpdate={handleOrderUpdated}
        getStatusColor={getStatusColor}
        getStatusIcon={getStatusIcon}
      />

      {/* Modals */}
      {showDetailsModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          statusHistory={
            selectedOrder ? statusHistory[selectedOrder.id] || [] : []
          }
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          config={config}
          translations={t}
        />
      )}

      {showStatusModal && selectedOrder && (
        <UpdateStatusModal
          order={selectedOrder}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={handleOrderUpdated}
          config={config}
          translations={t}
        />
      )}
    </div>
  );
}
