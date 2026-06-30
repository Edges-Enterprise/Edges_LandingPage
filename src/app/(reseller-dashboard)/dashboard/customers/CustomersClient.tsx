// app/(reseller-dashboard)/customers/CustomersClient.tsx

"use client";

import { Card } from "../Card";
import { formatNaira } from "@/lib/pricing/calculatePrice";
import type { Customer } from "@/types";
import { Users } from "lucide-react";

export function CustomersClient({ customers }: { customers: Customer[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "0.3rem",
          }}
        >
          Customers
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          {customers.length} customer{customers.length !== 1 ? "s" : ""} have
          purchased from your store
        </p>
      </div>

      {/* Customers Table */}
      <Card padding="none">
        {customers.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--dim)",
            }}
          >
            <Users
              size={40}
              style={{ margin: "0 auto 0.75rem", opacity: 0.3 }}
            />
            <p style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>
              No customers yet
            </p>
            <p style={{ fontSize: "0.85rem" }}>
              Customers will appear here after they make their first purchase
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    textAlign: "left",
                  }}
                >
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Total Orders</th>
                  {/* <th style={thStyle}>Total Spent</th> */}
                  <th style={thStyle}>Last Order</th>
                  <th style={thStyle}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "rgba(201,138,84,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            color: "var(--accent-lt)",
                            flexShrink: 0,
                          }}
                        >
                          {customer.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p
                            style={{
                              fontWeight: 500,
                              color: "var(--text)",
                              fontSize: "0.9rem",
                            }}
                          >
                            {customer.email}
                          </p>
                          {(customer.first_name || customer.last_name) && (
                            <p
                              style={{
                                fontSize: "0.78rem",
                                color: "var(--dim)",
                              }}
                            >
                              {[customer.first_name, customer.last_name]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "0.2rem 0.6rem",
                          borderRadius: 100,
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          background: "rgba(201,138,84,0.1)",
                          color: "var(--accent-lt)",
                        }}
                      >
                        {customer.total_orders || 0} order
                        {(customer.total_orders || 0) !== 1 ? "s" : ""}
                      </span>
                    </td>
                    {/* <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {formatNaira(customer.total_spent || 0)}
                    </td> */}
                    <td
                      style={{
                        ...tdStyle,
                        color: "var(--dim)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {customer.last_order
                        ? new Date(customer.last_order).toLocaleDateString(
                            "en-NG",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: "var(--dim)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {new Date(customer.created_at).toLocaleDateString(
                        "en-NG",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--dim)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "0.85rem 1rem",
  fontSize: "0.88rem",
  color: "var(--text)",
};
