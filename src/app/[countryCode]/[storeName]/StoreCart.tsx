// src/app/[countryCode]/[storeName]/StoreCart.tsx
"use client";

import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { CartItem } from "@/types/reseller/storefront";

interface StoreCartProps {
  cart: CartItem[];
  cartTotal: number;
  onClose: () => void;
  onRemove: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onCheckout: () => void;
  translations: any;
  config: any;
}

export default function StoreCart({
  cart,
  cartTotal,
  onClose,
  onRemove,
  onUpdateQuantity,
  onCheckout,
  translations,
  config,
}: StoreCartProps) {
  const t = translations;
  const currencySymbol = config.currencySymbol || "₦";

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.1rem",
              fontWeight: 700,
              margin: 0,
              color: "var(--text)",
            }}
          >
            {t?.cart || "Cart"} ({cart.length})
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "0.25rem",
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
        </div>

        {/* Cart Items */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "1rem 1.5rem",
          }}
        >
          {cart.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    background: "var(--bg2)",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text)",
                        margin: 0,
                      }}
                    >
                      {item.name}
                    </p>
                    <p
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--muted)",
                        margin: 0,
                      }}
                    >
                      {currencySymbol}{item.price.toLocaleString()}
                      {item.network && ` · ${item.network}`}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <button
                      onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                      style={{
                        padding: "0.15rem 0.4rem",
                        background: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        color: "var(--muted)",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      <Minus size={12} />
                    </button>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text)",
                        minWidth: 24,
                        textAlign: "center",
                      }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                      style={{
                        padding: "0.15rem 0.4rem",
                        background: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        color: "var(--muted)",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemove(item.product_id)}
                    style={{
                      padding: "0.25rem",
                      background: "transparent",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#EF4444";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--muted)";
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: "0.5rem",
              }}
            >
              <ShoppingBag size={40} style={{ color: "var(--dim)" }} />
              <p style={{ color: "var(--muted)", fontSize: "1rem", margin: 0 }}>
                {t?.emptyCart || "Your cart is empty"}
              </p>
              <p style={{ color: "var(--dim)", fontSize: "0.85rem", margin: 0 }}>
                {t?.continueShopping || "Start adding items to your cart"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div
            style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                {t?.total || "Total"}
              </span>
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "var(--brand-color)",
                }}
              >
                {currencySymbol}{cartTotal.toLocaleString()}
              </span>
            </div>
            <button
              onClick={onCheckout}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "var(--brand-color)",
                color: "#FDF8F3",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: "1rem",
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
              {t?.checkout || "Proceed to Checkout"}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}