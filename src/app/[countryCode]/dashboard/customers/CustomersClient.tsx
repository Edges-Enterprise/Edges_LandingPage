// src/app/[countryCode]/dashboard/customers/CustomersClient.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  UserPlus,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
} from "lucide-react";
import CustomerTable from "./CustomerTable";
import AddCustomerModal from "./AddCustomerModal";
import CustomerDetailsModal from "./CustomerDetailsModal";
import { CountryConfig } from "@/config/countries";
import { Customer, CustomersData } from "@/types/reseller/customers";

interface CustomersClientProps {
  countryCode: string;
  config: CountryConfig;
  translations: any;
  customersData: CustomersData;
}

export default function CustomersClient({
  countryCode,
  config,
  translations,
  customersData,
}: CustomersClientProps) {
  const t = translations;
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>(
    customersData.customers,
  );
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>(
    customersData.customers,
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [stats, setStats] = useState(customersData.stats);

  // Filter customers
  useEffect(() => {
    let filtered = customers;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c: Customer) =>
          c.first_name?.toLowerCase().includes(query) ||
          c.last_name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c: Customer) => c.status === statusFilter);
    }

    setFilteredCustomers(filtered);
  }, [customers, searchQuery, statusFilter]);

  const refreshCustomers = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("global_customers")
        .select("*")
        .eq("reseller_id", customersData.application.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCustomers(data as Customer[]);

        // Update stats
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

        setStats({
          total_customers: data.length,
          active_customers: data.filter((c) => c.status === "active").length,
          new_customers_30d: data.filter(
            (c) => new Date(c.created_at) >= thirtyDaysAgo,
          ).length,
        });
      }
    } catch (error) {
      console.error("Refresh error:", error);
    }
  };

  const handleCustomerAdded = (): void => {
    refreshCustomers();
  };

  const handleCustomerUpdated = (): void => {
    refreshCustomers();
  };

  const handleCustomerDeleted = (): void => {
    refreshCustomers();
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      active: "#6EBD8A",
      inactive: "#F59E0B",
      suspended: "#EF4444",
    };
    return colors[status] || "var(--muted)";
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
            {t?.title || "Customers"}
          </h1>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
            {t?.subtitle || "Manage your customers"}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: "0.6rem 1.5rem",
            background: "var(--brand-color)",
            color: "#FDF8F3",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <UserPlus size={18} />
          {t?.addCustomer || "Add Customer"}
        </button>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              {t?.totalCustomers || "Total Customers"}
            </p>
            <Users size={16} style={{ color: "var(--brand-color)" }} />
          </div>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text)",
              margin: "0.25rem 0 0 0",
            }}
          >
            {stats.total_customers}
          </p>
        </div>

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              {t?.activeCustomers || "Active Customers"}
            </p>
            <UserCheck size={16} style={{ color: "#6EBD8A" }} />
          </div>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#6EBD8A",
              margin: "0.25rem 0 0 0",
            }}
          >
            {stats.active_customers}
          </p>
        </div>

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              {t?.newCustomers || "New Customers (30d)"}
            </p>
            <TrendingUp size={16} style={{ color: "#F59E0B" }} />
          </div>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#F59E0B",
              margin: "0.25rem 0 0 0",
            }}
          >
            {stats.new_customers_30d}
          </p>
        </div>

        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--dim)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              {t?.inactiveCustomers || "Inactive"}
            </p>
            <UserX size={16} style={{ color: "#EF4444" }} />
          </div>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#EF4444",
              margin: "0.25rem 0 0 0",
            }}
          >
            {stats.total_customers - stats.active_customers}
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
            placeholder={t?.searchCustomers || "Search customers..."}
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
          <option value="active">{t?.active || "Active"}</option>
          <option value="inactive">{t?.inactive || "Inactive"}</option>
          <option value="suspended">{t?.suspended || "Suspended"}</option>
        </select>
      </div>

      {/* Customer Table */}
      <CustomerTable
        customers={filteredCustomers}
        config={config}
        translations={t}
        onView={(customer: Customer) => {
          setSelectedCustomer(customer);
          setShowDetailsModal(true);
        }}
        onUpdate={handleCustomerUpdated}
        onDelete={handleCustomerDeleted}
        getStatusColor={getStatusColor}
      />

      {/* Modals */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCustomerAdded}
          applicationId={customersData.application.id}
          config={config}
          translations={t}
        />
      )}

      {showDetailsModal && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCustomer(null);
          }}
          onUpdate={handleCustomerUpdated}
          config={config}
          translations={t}
        />
      )}
    </div>
  );
}
