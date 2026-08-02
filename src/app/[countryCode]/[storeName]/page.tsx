// src/app/[countryCode]/[storeName]/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { getCountryConfig } from "@/config/countries";
import { CountryProvider } from "@/providers/CountryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import StoreContent from "./StoreContent";
import "@/app/reseller.css";
import "./store-theme.css"; // We'll create this

interface StorePageProps {
  params: Promise<{ countryCode: string; storeName: string }>;
}

async function getStoreData(storeSlug: string) {
  const supabase = await createServerClient();

  try {
    // Get store owner (reseller)
    const { data: application, error: appError } = await supabase
      .from("global_reseller_applications")
      .select(
        "id, store_name, store_slug, brand_color, logo_url, country_code, phone, email",
      )
      .eq("store_slug", storeSlug)
      .eq("application_status", "active")
      .single();

    if (appError || !application) {
      return null;
    }

    // Get store settings
    const { data: settings, error: settingsError } = await supabase
      .from("global_reseller_settings")
      .select("store_settings")
      .eq("reseller_id", application.id)
      .single();

    // Get products
    const { data: products, error: productsError } = await supabase
      .from("global_plans")
      .select("*")
      .eq("reseller_id", application.id)
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (productsError) throw productsError;

    // Get categories
    const categories = products
      ? [...new Set(products.map((p) => p.category))]
      : [];
    const networks = products
      ? [...new Set(products.map((p) => p.network).filter(Boolean))]
      : [];

    return {
      application,
      products: products || [],
      categories,
      networks,
      settings: settings?.store_settings || {
        welcome_message: `Welcome to ${application.store_name || "our store"}!`,
        contact_email: application.email,
        contact_phone: application.phone,
        store_status: "active",
        theme: "light",
      },
    };
  } catch (error) {
    console.error("Store data error:", error);
    return null;
  }
}

async function getTranslations(language: string) {
  try {
    const translations = await import(`@/messages/${language}/storefront.json`);
    return translations.default;
  } catch {
    try {
      const translations = await import("@/messages/en/storefront.json");
      return translations.default;
    } catch {
      return {
        title: "Store",
        subtitle: "Browse our products",
        products: "Products",
        categories: "Categories",
        networks: "Networks",
        allCategories: "All Categories",
        allNetworks: "All Networks",
        addToCart: "Add to Cart",
        viewCart: "View Cart",
        checkout: "Checkout",
        cart: "Cart",
        emptyCart: "Your cart is empty",
        continueShopping: "Continue Shopping",
        total: "Total",
        quantity: "Quantity",
        remove: "Remove",
        customerName: "Full Name",
        customerEmail: "Email Address",
        customerPhone: "Phone Number",
        deliveryDetails: "Delivery Details",
        placeOrder: "Place Order",
        orderPlaced: "Order Placed Successfully!",
        orderNumber: "Order #",
        thankYou: "Thank you for your order!",
        productNotFound: "Product not found",
        storeNotFound: "Store not found",
        storeOffline: "Store is currently offline",
        storeMaintenance: "Store is under maintenance",
        loading: "Loading...",
        error: "Something went wrong",
        retry: "Retry",
        noProducts: "No products available",
        comingSoon: "More products coming soon!",
        price: "Price",
        network: "Network",
        category: "Category",
        data: "Data",
        airtime: "Airtime",
        electricity: "Electricity",
        cable: "Cable TV",
        contact: "Contact",
      };
    }
  }
}

export default async function StorePage({ params }: StorePageProps) {
  const { countryCode, storeName } = await params;

  const config = getCountryConfig(countryCode);
  const storeData = await getStoreData(storeName);

  if (!storeData) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "1rem",
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: "1.1rem" }}>
          Store not found
        </p>
        <p style={{ color: "var(--dim)" }}>
          The store you're looking for doesn't exist or is not active.
        </p>
      </div>
    );
  }

  // Check store status
  if (storeData.settings.store_status === "inactive") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "1rem",
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: "1.1rem" }}>
          Store is offline
        </p>
        <p style={{ color: "var(--dim)" }}>
          This store is currently not accepting orders.
        </p>
      </div>
    );
  }

  const language = config.language.code || "en";
  const translations = await getTranslations(language);

  // Get brand color from application or use default
  const brandColor = storeData.application.brand_color || "#C98A54";

  return (
    <ThemeProvider brandColor={brandColor}>
      <CountryProvider config={config}>
        <StoreContent
          storeData={storeData}
          translations={translations}
          config={config}
        />
      </CountryProvider>
    </ThemeProvider>
  );
}
