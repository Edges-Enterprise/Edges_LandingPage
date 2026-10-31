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
import CustomerDetailsModal from "./CustomerDetailsModal";
import AddCustomerModal from "./AddCustomerModal";
import ThemeSelect from "../ThemeSelect";
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
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
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
          className="add-customer-btn"
          onClick={() => setShowAddModal(true)}
          aria-label={t?.addCustomer || "Add Customer"}
          title={t?.addCustomer || "Add Customer"}
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
          <span className="add-customer-label">
            {t?.addCustomer || "Add Customer"}
          </span>
        </button>
      </div>

      {/* Stats Cards */}
      <style>{`
        .add-customer-label { display: inline; }
        @media (max-width: 767px) {
          .add-customer-label { display: none; }
          .add-customer-btn {
            padding: 0.6rem !important;
            border-radius: 50% !important;
          }
        }
        .customers-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 1023px) {
          .customers-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 767px) {
          .customers-stats-grid {
            gap: 0.5rem;
          }
          .customers-stats-grid > div {
            padding: 0.6rem 0.5rem !important;
          }
          .customers-stats-grid > div > div > p {
            font-size: 0.62rem !important;
          }
          .customers-stats-grid > div > p {
            font-size: 1.25rem !important;
          }
        }
      `}</style>
      <div className="customers-stats-grid">
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
              {t?.total || "Total"}
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
              {t?.active || "Active"}
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
              {t?.new || "New"}
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

        <ThemeSelect
          value={statusFilter}
          onChange={setStatusFilter}
          ariaLabel={t?.allStatus || "All Status"}
          style={{
            padding: "0.6rem 0.9rem",
            borderRadius: 10,
            minWidth: 140,
          }}
          options={[
            { value: "all", label: t?.allStatus || "All Status" },
            { value: "active", label: t?.active || "Active" },
            { value: "inactive", label: t?.inactive || "Inactive" },
          ]}
        />
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
