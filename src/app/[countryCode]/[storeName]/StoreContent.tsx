// src/app/[countryCode]/[storeName]/StoreContent.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import StoreHeader from "./StoreHeader";
import StoreHero from "./StoreHero";
import StoreProducts from "./StoreProducts";
import StoreCart from "./StoreCart";
import StoreCheckout from "./StoreCheckout";
import StoreFooter from "./StoreFooter";
import { CartItem, StoreProduct } from "@/types/reseller/storefront";
import { CountryConfig } from "@/config/countries";
import { ThemeProvider } from "@/providers/ThemeProvider";

interface StoreContentProps {
  storeData: any;
  translations: any;
  config: CountryConfig;
}

export default function StoreContent({
  storeData,
  translations,
  config,
}: StoreContentProps) {
  const t = translations;
  const supabase = createClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const [brandColor, setBrandColor] = useState<string>(
    storeData.application.brand_color || "#C98A54",
  );

  // Load brand color from localStorage if available
  useEffect(() => {
    const savedBrandColor = localStorage.getItem("brandColor");
    if (savedBrandColor) {
      setBrandColor(savedBrandColor);
    }
  }, []);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${storeData.application.id}`);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        setCart([]);
      }
    }
  }, [storeData.application.id]);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem(
      `cart_${storeData.application.id}`,
      JSON.stringify(cart),
    );
  }, [cart, storeData.application.id]);

  const addToCart = (product: StoreProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          network: product.network,
          category: product.category,
        },
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const handleCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleOrderPlaced = () => {
    clearCart();
    setShowCheckout(false);
  };

  const filteredProducts = storeData.products.filter(
    (product: StoreProduct) => {
      if (selectedCategory !== "all" && product.category !== selectedCategory) {
        return false;
      }
      if (selectedNetwork !== "all" && product.network !== selectedNetwork) {
        return false;
      }
      return true;
    },
  );

  return (
    <ThemeProvider brandColor={brandColor}>
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          fontFamily: "'Instrument Sans', system-ui, sans-serif",
        }}
      >
        <StoreHeader
          storeData={storeData}
          cartCount={cart.length}
          cartTotal={cartTotal}
          onCartClick={() => setShowCart(true)}
          translations={t}
          config={config}
        />

        <main style={{ padding: "2rem 5%", maxWidth: 1100, margin: "0 auto" }}>
          <StoreHero
            storeData={storeData}
            translations={t}
            config={config}
            onAddToCart={addToCart}
          />

          <StoreProducts
            products={filteredProducts}
            categories={storeData.categories}
            networks={storeData.networks}
            selectedCategory={selectedCategory}
            selectedNetwork={selectedNetwork}
            onCategoryChange={setSelectedCategory}
            onNetworkChange={setSelectedNetwork}
            onAddToCart={addToCart}
            translations={t}
            config={config}
          />
        </main>

        <StoreFooter storeData={storeData} translations={t} config={config} />

        {/* Cart Drawer */}
        {showCart && (
          <StoreCart
            cart={cart}
            cartTotal={cartTotal}
            onClose={() => setShowCart(false)}
            onRemove={removeFromCart}
            onUpdateQuantity={updateQuantity}
            onCheckout={handleCheckout}
            translations={t}
            config={config}
          />
        )}

        {/* Checkout Modal */}
        {showCheckout && (
          <StoreCheckout
            cart={cart}
            cartTotal={cartTotal}
            resellerId={storeData.application.id}
            onClose={() => setShowCheckout(false)}
            onOrderPlaced={handleOrderPlaced}
            translations={t}
            config={config}
          />
        )}
      </div>
    </ThemeProvider>
  );
}
