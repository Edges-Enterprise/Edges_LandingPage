// src/app/[countryCode]/dashboard/customers/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import CustomersClient from "./CustomersClient";
import "@/app/reseller.css";

interface CustomersPageProps {
  params: Promise<{ countryCode: string }>;
}

async function getCustomersData(userId: string) {
  const supabase = await createServerClient();

  try {
    // Get reseller application
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select("id, brand_color, store_name, store_slug, country_code")
      .eq("auth_user_id", userId)
      .single();

    if (appError) throw appError;

    // Get all customers for this reseller
    const { data: customers, error: customersError } = await supabase
      .from("global_customers")
      .select("*")
      .eq("reseller_id", application.id)
      .order("created_at", { ascending: false });

    if (customersError) throw customersError;

    // Wallet details live in their own table. Fetch them in one query and
    // attach, rather than a per-customer lookup, so the reseller can see the
    // customer funds they are holding for each customer.
    const { data: wallets, error: walletsError } = await supabase
      .from("global_customer_wallets")
      .select("customer_id, balance, total_spent, currency, status")
      .eq("reseller_id", application.id);

    if (walletsError) console.error("Customer wallets error:", walletsError);

    const walletByCustomer = new Map(
      (wallets || []).map((w) => [w.customer_id, w]),
    );

    const customersWithWallets = (customers || []).map((c) => {
      const wallet = walletByCustomer.get(c.id);
      return {
        ...c,
        wallet_balance: wallet ? Number(wallet.balance || 0) : 0,
        wallet_total_spent: wallet ? Number(wallet.total_spent || 0) : 0,
        wallet_currency: wallet?.currency ?? null,
        wallet_status: wallet?.status ?? null,
      };
    });

    // Calculate stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    const stats = {
      total_customers: customers?.length || 0,
      active_customers:
        customers?.filter((c) => c.status === "active").length || 0,
      new_customers_30d:
        customers?.filter((c) => new Date(c.created_at) >= thirtyDaysAgo)
          .length || 0,
    };

    return {
      application,
      customers: customersWithWallets,
      stats,
    };
  } catch (error) {
    console.error("Customers data error:", error);
    return null;
  }
}

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/customers.json`);
    return translations.default;
  } catch {
    try {
      const translations = await import("@/messages/en/customers.json");
      return translations.default;
    } catch {
      return {
        title: "Customers",
        subtitle: "Manage your customers",
        totalCustomers: "Total Customers",
        activeCustomers: "Active Customers",
        newCustomers: "New Customers (30d)",
        addCustomer: "Add Customer",
        searchCustomers: "Search customers...",
        allStatus: "All Status",
        active: "Active",
        inactive: "Inactive",
        suspended: "Suspended",
        name: "Name",
        email: "Email",
        phone: "Phone",
        status: "Status",
        joined: "Joined",
        actions: "Actions",
        noCustomers: "No customers yet",
        startAdding: "Add your first customer to start selling",
        view: "View",
        edit: "Edit",
        delete: "Delete",
        customerDetails: "Customer Details",
        customerInfo: "Customer Information",
        orderHistory: "Order History",
        noOrders: "No orders yet",
        totalSpent: "Total Spent",
        lastOrder: "Last Order",
        addCustomerTitle: "Add New Customer",
        addCustomerDescription:
          "Enter the customer's details to add them to your store.",
        firstName: "First Name",
        lastName: "Last Name",
        phoneNumber: "Phone Number",
        customerType: "Customer Type",
        individual: "Individual",
        business: "Business",
        enterprise: "Enterprise",
        saving: "Saving...",
        save: "Save Customer",
        cancel: "Cancel",
        loading: "Loading customers...",
        error: "Unable to load customers",
        retry: "Retry",
        deleteConfirm: "Are you sure you want to delete this customer?",
        deleteWarning: "This action cannot be undone.",
        confirmDelete: "Yes, Delete",
        customerDeleted: "Customer deleted successfully",
        customerAdded: "Customer added successfully",
        customerUpdated: "Customer updated successfully",
      };
    }
  }
}

export default async function CustomersPage({ params }: CustomersPageProps) {
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
  const customersData = await getCustomersData(user.id);

  if (!customersData) {
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
          {translations?.error || "Unable to load customers. Please try again."}
        </p>
      </div>
    );
  }

  return (
    <CountryProvider config={config}>
      <CustomersClient
        countryCode={countryCode}
        config={config}
        translations={translations}
        customersData={customersData}
      />
    </CountryProvider>
  );
}
