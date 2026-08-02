// src/app/[countryCode]/[storeName]/StoreCheckout.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Check, Loader2, User, Mail, Phone, Hash } from "lucide-react";
import { CartItem } from "@/types/storefront";

interface StoreCheckoutProps {
  cart: CartItem[];
  cartTotal: number;
  resellerId: string;
  onClose: () => void;
  onOrderPlaced: () => void;
  translations: any;
  config: any;
}

export default function StoreCheckout({
  cart,
  cartTotal,
  resellerId,
  onClose,
  onOrderPlaced,
  translations,
  config,
}: StoreCheckoutProps) {
  const t = translations;
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    delivery_details: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currencySymbol = config.currencySymbol || "₦";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.customer_name.trim()) {
      newErrors.customer_name = "Name is required";
    }
    if (!formData.customer_email.trim() || !/\S+@\S+\.\S+/.test(formData.customer_email)) {
      newErrors.customer_email = "Valid email is required";
    }
    if (!formData.customer_phone.trim()) {
      newErrors.customer_phone = "Phone number is required";
    }
    if (!formData.delivery_details.trim()) {
      newErrors.delivery_details = "Delivery details are required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Create order in database
      const { data: order, error } = await supabase
        .from("global_orders")
        .insert({
          reseller_id: resellerId,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          delivery_details: formData.delivery_details,
          amount: cartTotal,
          status: "pending",
          payment_status: "pending",
          metadata: {
            items: cart.map((item) => ({
              product_id: item.product_id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              network: item.network,
              category: item.category,
            })),
          },
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setOrderNumber(order.id.slice(0, 8));
      setIsSuccess(true);
      onOrderPlaced();
    } catch (error) {
      console.error("Order error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSuccess) {
      onClose();
    }
  };

  if (isSuccess) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
        onClick={handleOverlayClick}
      >
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            maxWidth: 400,
            width: "100%",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(110,189,138,0.12)",
              border: "2px solid rgba(110,189,138,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
            }}
          >
            <Check size={32} style={{ color: "#6EBD8A" }} />
          </div>
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.2rem",
              fontWeight: 700,
              marginBottom: "0.25rem",
              color: "var(--text)",
            }}
          >
            {t?.orderPlaced || "Order Placed Successfully!"}
          </h3>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
            {t?.orderNumber || "Order #"}: <strong>{orderNumber}</strong>
          </p>
          <p style={{ color: "var(--dim)", fontSize: "0.85rem" }}>
            {t?.thankYou || "Thank you for your order!"}
          </p>
          <button
            onClick={onClose}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.5rem",
              background: "var(--brand-color)",
              color: "#FDF8F3",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {t?.continueShopping || "Continue Shopping"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          padding: "1.5rem",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--muted)";
          }}
        >
          <X size={20} />
        </button>

        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.2rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
            color: "var(--text)",
          }}
        >
          {t?.checkout || "Checkout"}
        </h2>

        {/* Order Summary */}
        <div
          style={{
            background: "var(--bg2)",
            borderRadius: 10,
            padding: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--dim)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            {t?.orderSummary || "Order Summary"}
          </p>
          {cart.map((item) => (
            <div
              key={item.product_id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.25rem 0",
                fontSize: "0.85rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ color: "var(--text)" }}>
                {item.name} × {item.quantity}
              </span>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>
                {currencySymbol}{(item.price * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "0.5rem",
              marginTop: "0.25rem",
              borderTop: "2px solid var(--border)",
            }}
          >
            <span style={{ fontWeight: 600, color: "var(--text)" }}>
              {t?.total || "Total"}
            </span>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--brand-color)",
              }}
            >
              {currencySymbol}{cartTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Customer Details */}
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: "0.25rem",
              }}
            >
              {t?.customerName || "Full Name"} *
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg2)",
                border: `1px solid ${errors.customer_name ? "#EF4444" : "var(--border)"}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <User size={16} style={{ color: "var(--dim)", marginLeft: "0.75rem" }} />
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                placeholder="John Doe"
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
            {errors.customer_name && (
              <p style={{ color: "#EF4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                {errors.customer_name}
              </p>
            )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: "0.25rem",
              }}
            >
              {t?.customerEmail || "Email Address"} *
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg2)",
                border: `1px solid ${errors.customer_email ? "#EF4444" : "var(--border)"}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Mail size={16} style={{ color: "var(--dim)", marginLeft: "0.75rem" }} />
              <input
                type="email"
                name="customer_email"
                value={formData.customer_email}
                onChange={handleChange}
                placeholder="customer@example.com"
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
            {errors.customer_email && (
              <p style={{ color: "#EF4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                {errors.customer_email}
              </p>
            )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: "0.25rem",
              }}
            >
              {t?.customerPhone || "Phone Number"} *
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg2)",
                border: `1px solid ${errors.customer_phone ? "#EF4444" : "var(--border)"}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Phone size={16} style={{ color: "var(--dim)", marginLeft: "0.75rem" }} />
              <input
                type="tel"
                name="customer_phone"
                value={formData.customer_phone}
                onChange={handleChange}
                placeholder="+1234567890"
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
            {errors.customer_phone && (
              <p style={{ color: "#EF4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                {errors.customer_phone}
              </p>
            )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: "0.25rem",
              }}
            >
              {t?.deliveryDetails || "Delivery Details"} *
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                background: "var(--bg2)",
                border: `1px solid ${errors.delivery_details ? "#EF4444" : "var(--border)"}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Hash size={16} style={{ color: "var(--dim)", marginLeft: "0.75rem", marginTop: "0.6rem" }} />
              <textarea
                name="delivery_details"
                value={formData.delivery_details}
                onChange={handleChange}
                placeholder="Phone number, meter number, or delivery address"
                rows={2}
                style={{
                  flex: 1,
                  padding: "0.6rem 0.75rem",
                  background: "transparent",
                  border: "none",
                  color: "var(--text)",
                  fontSize: "0.9rem",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>
            {errors.delivery_details && (
              <p style={{ color: "#EF4444", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                {errors.delivery_details}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            width: "100%",
            marginTop: "1.5rem",
            padding: "0.75rem",
            background: "var(--brand-color)",
            color: "#FDF8F3",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: "1rem",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.opacity = "0.85";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              {t?.processing || "Processing..."}
            </>
          ) : (
            t?.placeOrder || "Place Order"
          )}
        </button>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}