// src/app/[countryCode]/dashboard/orders/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import OrdersClient from "./OrdersClient";
import { OrderStatusHistoryEntry } from "@/types/reseller/orders";
import "@/app/reseller.css";

interface OrdersPageProps {
  params: Promise<{ countryCode: string }>;
}

async function getOrdersData(userId: string) {
  const supabase = await createServerClient();

  try {
    // Get reseller application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id, brand_color, store_name, store_slug, country_code")
      .eq("auth_user_id", userId)
      .single();

    if (appError) throw appError;

    // Get all orders for this reseller
    const { data: orders, error: ordersError } = await supabase
      .from("global_orders")
      .select("*")
      .eq("reseller_id", application.id)
      .order("created_at", { ascending: false });

    if (ordersError) throw ordersError;

    // Calculate stats. The database only accepts pending/completed/failed/
    // cancelled (global_orders_status_check), so `cancelled` is the failure
    // bucket alongside `failed`.
    const completedOrders =
      orders?.filter((o) => o.status === "completed") || [];
    const pendingOrders = orders?.filter((o) => o.status === "pending") || [];
    const failedOrders =
      orders?.filter(
        (o) => o.status === "failed" || o.status === "cancelled",
      ) || [];

    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + (o.amount || 0),
      0,
    );
    const totalProfit = completedOrders.reduce(
      (sum, o) => sum + (o.profit || 0),
      0,
    );

    const stats = {
      total_orders: orders?.length || 0,
      completed_orders: completedOrders.length,
      pending_orders: pendingOrders.length,
      failed_orders: failedOrders.length,
      total_revenue: totalRevenue,
      total_profit: totalProfit,
      average_order_value:
        completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
    };

    // Status audit trail, grouped by order. The table is small (one row per
    // status transition) so a single fetch covers the page; RLS scopes it to
    // this reseller's orders.
    const orderIds = (orders || []).map((o) => o.id);
    let statusHistory: Record<string, OrderStatusHistoryEntry[]> = {};

    if (orderIds.length > 0) {
      const { data: history, error: historyError } = await supabase
        .from("global_order_status_history")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      statusHistory = (history || []).reduce(
        (acc: Record<string, OrderStatusHistoryEntry[]>, entry: any) => {
          (acc[entry.order_id] ||= []).push(entry);
          return acc;
        },
        {},
      );
    }

    return {
      application,
      orders: orders || [],
      stats,
      statusHistory,
    };
  } catch (error) {
    console.error("Orders data error:", error);
    return null;
  }
}

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/orders.json`);
    return translations.default;
  } catch {
    try {
      const translations = await import("@/messages/en/orders.json");
      return translations.default;
    } catch {
      return {
        title: "Orders",
        subtitle: "View and manage your orders",
        totalOrders: "Total Orders",
        completedOrders: "Completed",
        pendingOrders: "Pending",
        failedOrders: "Failed",
        totalRevenue: "Total Revenue",
        totalProfit: "Total Profit",
        avgOrderValue: "Average Order",
        searchOrders: "Search orders...",
        allStatus: "All Status",
        allCategories: "All Categories",
        orderId: "Order ID",
        customer: "Customer",
        plan: "Plan",
        amount: "Amount",
        profit: "Profit",
        status: "Status",
        date: "Date",
        actions: "Actions",
        noOrders: "No orders yet",
        startSelling: "Start selling to see your orders here",
        view: "View",
        updateStatus: "Update Status",
        orderDetails: "Order Details",
        orderInfo: "Order Information",
        customerInfo: "Customer Information",
        paymentInfo: "Payment Information",
        deliveryDetails: "Delivery Details",
        orderTimeline: "Order Timeline",
        statusUpdated: "Order status updated successfully",
        errorUpdating: "Failed to update order status",
        loading: "Loading orders...",
        error: "Unable to load orders",
        retry: "Retry",
        completed: "Completed",
        pending: "Pending",
        failed: "Failed",
        cancelled: "Cancelled",
        data: "Data",
        airtime: "Airtime",
        electricity: "Electricity",
        cable: "Cable TV",
        orderNumber: "Order #",
        placedOn: "Placed on",
        total: "Total",
        paymentStatus: "Payment Status",
        paid: "Paid",
        unpaid: "Unpaid",
        refundedStatus: "Refunded",
        deliveryInfo: "Delivery Info",
        providerReference: "Provider Reference",
        requestId: "Request ID",
        currentStatus: "Current Status",
        updating: "Updating...",
        created: "Created",
        updated: "Updated",
        orderIdLabel: "Order ID",
        paymentMethod: "Payment Method",
        reference: "Reference",
        close: "Close",
        statusHistory: "Status History",
        noStatusChanges: "No status changes recorded yet",
        systemActor: "System",
      };
    }
  }
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { countryCode } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const config = getCountryConfig(countryCode);
  const language = config.language.code || "en";
  const translations = await getTranslations(language);
  const ordersData = await getOrdersData(user.id);

  if (!ordersData) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <p style={{ color: "var(--muted)" }}>
          {translations?.error || "Unable to load orders. Please try again."}
        </p>
      </div>
    );
  }

  return (
    <CountryProvider config={config}>
      <OrdersClient
        countryCode={countryCode}
        config={config}
        translations={translations}
        ordersData={ordersData}
      />
    </CountryProvider>
  );
}
