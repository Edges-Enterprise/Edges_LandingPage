// src/app/[countryCode]/[storeName]/StoreDestinationFlow.tsx
//
// The storefront's "destination" view, opened from the globe icon on the
// network-tabs row. Instead of browsing the store's own network tabs, the
// customer picks a product type (airtime or data bundle), types the
// recipient number, and the country/network is resolved from that number —
// so a Rwandan store can sell a Ugandan bundle without the customer
// choosing a country.
//
// Flow:
//   airtime | data bundle
//     -> phone number
//       -> network detected (provider lookup, prefix fallback)
//         -> airtime: amount entry / tiles, or "no airtime, try data"
//            data:    bundle tiles with Buy
//              -> confirm (PIN) -> wallet debited -> purchase complete
//
// The purchase itself is the existing StorePurchaseModal, reached via
// `onBuy` — this component only collects the destination and the plan.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Phone, Loader2, Signal, Zap, ShoppingBag } from "lucide-react";
import { StoreProduct } from "@/types/reseller/storefront";
import { CountryConfig } from "@/config/countries";
import { formatStorePrice } from "@/lib/currency/formatStorePrice";
import {
  lookupNetwork,
  type NetworkDetection,
} from "@/lib/storefront/networkLookup";
import { countryLabel, countryFlag } from "@/lib/storefront/countryLabel";
import {
  MAX_COUNTRY_TABS,
  rankCountryTabs,
} from "@/lib/storefront/countryTabs";

type Category = "airtime" | "data";

interface StoreDestinationFlowProps {
  products: StoreProduct[];
  config: CountryConfig;
  translations: any;
  onBuy: (product: StoreProduct, phone: string, amount?: number) => void;
  canSell?: boolean;
}

export default function StoreDestinationFlow({
  products,
  config,
  translations,
  onBuy,
  canSell = true,
}: StoreDestinationFlowProps) {
  const t = translations;

  // Data is the default product type — the common case — and the customer can
  // switch to airtime. (Previously neither was selected until the customer
  // picked one, so the phone field and plans were hidden on arrival.)
  const [category, setCategory] = useState<Category>("data");
  const [country, setCountry] = useState<string>("all");
  const [phone, setPhone] = useState("");
  const [detection, setDetection] = useState<NetworkDetection | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [network, setNetwork] = useState<string>("all");
  const [amount, setAmount] = useState("");

  const hasNumber = phone.replace(/\D/g, "").length >= 6;
  const amountNumber = Number(amount);

  // The destination country: the country tab the customer picked, else the
  // one the number resolves to. If the lookup could not run (edge function
  // down, no session) fall back to the store's own country, so a local
  // customer is never blocked by a failed lookup.
  const detectedCountry = (
    detection?.country ||
    (hasNumber ? config.code : "") ||
    ""
  ).toLowerCase();
  const effectiveCountry =
    country !== "all" ? country : detectedCountry;

  // The country tabs of the global view, ranked by catalog size and capped
  // at MAX_COUNTRY_TABS, with the selected (or detected) country always kept.
  const countryTabs = useMemo(
    () => rankCountryTabs(products, MAX_COUNTRY_TABS, effectiveCountry),
    [products, effectiveCountry],
  );

  // Debounced provider lookup as the number is typed. The number's own country
  // decides the answer; the hint is the country tab the customer is on, else
  // the store's own country, and `preferred` is every country the store sells —
  // both only break ties for an ambiguous local number.
  const hintCountry = country !== "all" ? country : config.code;
  const preferredCountries = useMemo(
    () => [
      ...new Set(
        products
          .map((p) => (p.country_code || "").toLowerCase())
          .filter(Boolean),
      ),
    ],
    [products],
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      setDetection(null);
      setDetecting(false);
      return;
    }
    setDetecting(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const found = await lookupNetwork(phone, hintCountry, preferredCountries);
      setDetection(found);
      setDetecting(false);
      // Jump the country tab to the detected destination so the network
      // tabs below match the number.
      if (found?.country) setCountry(found.country.toLowerCase());
      // Prefer the detected carrier when the store carries it.
      setNetwork(found?.network || "all");
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [phone, hintCountry, preferredCountries]);

  // Every enabled plan for the effective destination.
  const countryPlans = useMemo(
    () =>
      effectiveCountry
        ? products.filter(
            (p) => (p.country_code || "").toLowerCase() === effectiveCountry,
          )
        : [],
    [products, effectiveCountry],
  );

  const categoryPlans = useMemo(
    () =>
      category
        ? countryPlans.filter(
            (p) => (p.category || "").toLowerCase() === category,
          )
        : [],
    [countryPlans, category],
  );

  const dataAvailableForCountry = useMemo(
    () => countryPlans.some((p) => (p.category || "").toLowerCase() === "data"),
    [countryPlans],
  );

  const airtimeAvailableForCountry = useMemo(
    () => countryPlans.some((p) => (p.category || "").toLowerCase() === "airtime"),
    [countryPlans],
  );

  const networks = useMemo(
    () =>
      [
        ...new Set(
          categoryPlans.map((p) => p.network).filter((n): n is string => !!n),
        ),
      ].sort(),
    [categoryPlans],
  );

  // If the detected brand matches one of the store's networks, use it;
  // otherwise leave the picker on "all".
  const effectiveNetwork = useMemo(() => {
    if (network !== "all" && networks.includes(network)) return network;
    return "all";
  }, [network, networks]);

  const visiblePlans = useMemo(() => {
    const plans =
      effectiveNetwork === "all"
        ? categoryPlans
        : categoryPlans.filter((p) => p.network === effectiveNetwork);
    return [...plans].sort((a, b) => a.price - b.price);
  }, [categoryPlans, effectiveNetwork]);

  // Airtime can be sold as a fixed bundle tile and/or a "choose an amount"
  // RANGE top-up. Data bundles are tiles.
  const rangePlan = useMemo(
    () => visiblePlans.find((p) => p.price_type === "RANGE"),
    [visiblePlans],
  );
  const tilePlans = useMemo(
    () => visiblePlans.filter((p) => p.price_type !== "RANGE"),
    [visiblePlans],
  );

  const resetFlow = (next: Category) => {
    setCategory(next);
    setAmount("");
  };

  return (
    <section id="products" style={{ padding: "1rem 0 2rem" }}>
      {/* Country tabs — the destinations this store sells. This is the
          global view's primary navigation: the store's own network tabs
          never list another country's networks, so they are reached here. */}
      {countryTabs.length > 0 && (
        <div
          className="store-country-scroll"
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            marginBottom: "1rem",
            paddingBottom: 2,
            scrollbarWidth: "none",
          }}
        >
          {countryTabs.map((c) => {
            const isActive = effectiveCountry === c.country;
            return (
              <button
                key={c.country}
                onClick={() => {
                  setCountry(c.country);
                  setNetwork("all");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0.5rem 0.95rem",
                  borderRadius: 10,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s",
                  background: isActive ? "var(--brand-color)" : "var(--card)",
                  color: isActive ? "#FDF8F3" : "var(--text2)",
                  border: isActive ? "none" : "1.5px solid var(--border)",
                }}
              >
                <span aria-hidden>{countryFlag(c.country)}</span>
                {countryLabel(c.country)}
              </button>
            );
          })}
        </div>
      )}

      {/* Product-type tabs — airtime or data bundle. */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {(["airtime", "data"] as Category[]).map((c) => {
          const isActive = category === c;
          return (
            <button
              key={c}
              onClick={() => resetFlow(c)}
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.02em",
                transition: "all 0.15s",
                background: isActive ? "var(--brand-color)" : "var(--card)",
                color: isActive ? "#FDF8F3" : "var(--text2)",
                border: isActive ? "none" : "1.5px solid var(--border)",
              }}
            >
              {c === "airtime" ? t?.airtime || "Airtime" : t?.data || "Data Bundles"}
            </button>
          );
        })}
      </div>

      <>
        {/* Phone number — the destination is derived from this. */}
          <div
            style={{
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              borderRadius: 14,
              padding: "1.1rem",
              marginBottom: "1.25rem",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: 6,
              }}
            >
              {t?.recipientNumber || "Recipient phone number"}
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "0 0.75rem",
              }}
            >
              <Phone size={16} style={{ color: "var(--muted)" }} />
              <input
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/[^0-9+]/g, "").slice(0, 16))
                }
                inputMode="tel"
                placeholder={t?.phonePlaceholder || "e.g. 0788 123 456"}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "var(--text)",
                  padding: "0.7rem 0",
                  fontSize: "0.95rem",
                  width: "100%",
                  fontFamily: "inherit",
                }}
              />
              {detecting && (
                <Loader2
                  size={16}
                  style={{ color: "var(--muted)", animation: "spin 1s linear infinite" }}
                />
              )}
            </div>

            {hasNumber && detection && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  fontSize: "0.78rem",
                  color: "var(--text2)",
                }}
              >
                <Signal size={14} style={{ color: "var(--brand-color)" }} />
                <span>
                  {detection.brand ? `${detection.brand} · ` : ""}
                  {(detection.country || "").toUpperCase()}
                </span>
                {detection.fallback && (
                  <span style={{ color: "var(--muted)" }}>
                    ({t?.detectedFallback || "estimated"})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Network tabs for the selected destination — the networks that
              country's enabled plans actually use. Shown whenever the
              destination carries more than one, so the customer can switch
              carriers; the detected carrier is pre-selected. */}
          {networks.length > 1 && (
            <div
              className="store-net-scroll"
              style={{
                display: "flex",
                gap: "0.4rem",
                flexWrap: "wrap",
                marginBottom: "1rem",
              }}
            >
              {networks.map((n) => (
                <button
                  key={n}
                  onClick={() => setNetwork(n)}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: 8,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: effectiveNetwork === n ? "var(--brand-color)" : "var(--bg2)",
                    color: effectiveNetwork === n ? "#FDF8F3" : "var(--muted)",
                    border: effectiveNetwork === n ? "none" : "1px solid var(--border)",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {!effectiveCountry ? (
            <p
              style={{
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "0.85rem",
                padding: "1.5rem 0",
              }}
            >
              {t?.enterNumber ||
                "Enter a phone number or pick a country to see available plans"}
            </p>
          ) : categoryPlans.length === 0 ? (
            // Nothing of the chosen type for this destination.
            <div
              style={{
                textAlign: "center",
                padding: "2.5rem 1.5rem",
                color: "var(--muted)",
                background: "var(--card)",
                borderRadius: 16,
                border: "1.5px dashed var(--border)",
              }}
            >
              {category === "airtime" && dataAvailableForCountry ? (
                <>
                  <p style={{ fontWeight: 600, color: "var(--text2)" }}>
                    {t?.noAirtime || "No airtime available for this number."}
                  </p>
                  <p style={{ fontSize: "0.82rem", marginTop: 4 }}>
                    {t?.tryDataBundles || "Try data bundles instead."}
                  </p>
                  <button
                    onClick={() => resetFlow("data")}
                    style={{
                      marginTop: "1rem",
                      padding: "0.6rem 1.2rem",
                      borderRadius: 10,
                      background: "var(--brand-color)",
                      border: "none",
                      color: "#FDF8F3",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {t?.viewDataBundles || "View Data Bundles"}
                  </button>
                </>
              ) : category === "data" && airtimeAvailableForCountry ? (
                <>
                  <p style={{ fontWeight: 600, color: "var(--text2)" }}>
                    {t?.noData || "No data bundles for this number."}
                  </p>
                  <p style={{ fontSize: "0.82rem", marginTop: 4 }}>
                    {t?.tryAirtime || "Try airtime instead."}
                  </p>
                  <button
                    onClick={() => resetFlow("airtime")}
                    style={{
                      marginTop: "1rem",
                      padding: "0.6rem 1.2rem",
                      borderRadius: 10,
                      background: "var(--brand-color)",
                      border: "none",
                      color: "#FDF8F3",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {t?.viewAirtime || "View Airtime"}
                  </button>
                </>
              ) : (
                <p style={{ fontWeight: 600, color: "var(--text2)" }}>
                  {t?.noPlansForNumber ||
                    "No plans available for this number right now."}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Airtime amount entry (RANGE top-up). */}
              {category === "airtime" && rangePlan && (
                <div
                  style={{
                    background: "var(--card)",
                    border: "1.5px solid var(--border)",
                    borderRadius: 14,
                    padding: "1.1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: 6,
                    }}
                  >
                    {t?.enterAmount || "Enter amount"}
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.6rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <input
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                      }
                      inputMode="decimal"
                      placeholder={
                        rangePlan.range_min != null
                          ? `from ${rangePlan.range_min}`
                          : "0"
                      }
                      style={{
                        flex: "1 1 140px",
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        color: "var(--text)",
                        padding: "0.7rem 0.85rem",
                        fontSize: "0.95rem",
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      disabled={!canSell || !(amountNumber > 0)}
                      onClick={() =>
                        onBuy(rangePlan, phone, amountNumber > 0 ? amountNumber : undefined)
                      }
                      style={{
                        padding: "0.7rem 1.3rem",
                        borderRadius: 10,
                        background: "var(--brand-color)",
                        border: "none",
                        color: "#FDF8F3",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor:
                          canSell && amountNumber > 0 ? "pointer" : "not-allowed",
                        fontFamily: "inherit",
                        opacity: canSell && amountNumber > 0 ? 1 : 0.5,
                      }}
                    >
                      {t?.buy || "Buy"}
                    </button>
                  </div>
                </div>
              )}

              {/* Tiles — fixed bundles (data, or fixed airtime). */}
              {tilePlans.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: "0.6rem",
                  }}
                >
                  {tilePlans.map((product) => (
                    <div
                      key={product.id}
                      style={{
                        background: "var(--card)",
                        border: "1.5px solid var(--border)",
                        borderRadius: 14,
                        padding: "1rem 0.7rem",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 4,
                        }}
                      >
                        <ShoppingBag size={13} style={{ color: "var(--muted)" }} />
                        <p
                          style={{
                            fontWeight: 700,
                            color: "var(--text)",
                            fontSize: "0.82rem",
                          }}
                        >
                          {product.name}
                        </p>
                      </div>
                      {product.validity && (
                        <p style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                          {product.validity}
                        </p>
                      )}
                      <p
                        style={{
                          fontWeight: 800,
                          color: "var(--brand-color)",
                          fontSize: "1.1rem",
                          marginTop: 6,
                          marginBottom: 10,
                        }}
                      >
                        {formatStorePrice(product.price, config)}
                      </p>
                      <button
                        disabled={!canSell}
                        onClick={() => onBuy(product, phone)}
                        style={{
                          width: "100%",
                          padding: "0.55rem",
                          background: "var(--brand-color)",
                          border: "none",
                          borderRadius: 9,
                          color: "#FDF8F3",
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          cursor: canSell ? "pointer" : "not-allowed",
                          fontFamily: "inherit",
                          marginTop: "auto",
                          opacity: canSell ? 1 : 0.5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                        }}
                      >
                        <Zap size={13} />
                        {canSell ? t?.buy || "Buy" : "Unavailable"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
      </>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .store-country-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
