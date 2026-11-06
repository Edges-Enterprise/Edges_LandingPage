// Run with:
//   PHASE2_DB_URL=postgres://postgres@localhost:5433/phase2i \
//     deno test --no-check --allow-env --allow-read --allow-net \
//     supabase/functions/_shared/currency/phase2.integration.test.ts
//
// Phase 2 integration test. Runs against a REAL PostgreSQL database with the
// real migration applied, reads the rows the way the edge functions read
// them, and prices them with the real pipeline.
//
// This is the test that would have caught the cost-currency bug: it asserts
// a store in one country can sell another country's plan, priced in the
// store's own currency, with the reseller keeping only the margin.
//
// Skipped (not failed) when PHASE2_DB_URL is unset, so the suite still runs
// without a database.

import assert from "node:assert/strict";
import postgres from "npm:postgres@3";
import { computePrice } from "./pricing.ts";
import {
  loadStoreContext,
  pricePlan,
  type StoreContext,
} from "./storePrice.ts";
import { getCountryCurrency, countryCurrencyMap } from "../countryCurrency.ts";

const DB_URL = Deno.env.get("PHASE2_DB_URL");

function maybeTest(name: string, fn: () => Promise<void>) {
  if (!DB_URL) {
    Deno.test({ name: `${name} (skipped: no PHASE2_DB_URL)`, ignore: true, fn: () => {} });
    return;
  }
  Deno.test(name, fn);
}

maybeTest("integration: an RW store sells a UG plan, priced in RWF", async () => {
  const sql = postgres(DB_URL!, { onnotice: () => {} });
  try {
    await sql`DELETE FROM public.global_base_plans WHERE provider = 'zendit' AND provider_plan_id LIKE 'itest_%'`;
    await sql`DELETE FROM public.global_fx_rates WHERE quote_currency = 'RWF'`;

    // A rate, as the provider leg would have recorded it.
    await sql`
      INSERT INTO public.global_fx_rates (base_currency, quote_currency, rate, source, expires_at)
      VALUES ('USD', 'RWF', 1400, 'collection_provider', now() + interval '6 hours')`;

    // Two plans: one Rwandan, one Ugandan. The Rwandan store should sell both.
    await sql`
      INSERT INTO public.global_base_plans
        (provider, provider_plan_id, country_code, network, name, category,
         base_price, currency, price_type, send_value, send_currency, is_active)
      VALUES
        ('zendit','itest_rw','rw','MTN','MTN Rwanda 5GB','data',1.00,'USD','FIXED',1400,'RWF',true),
        ('zendit','itest_ug','ug','Airtel','Airtel Uganda 2GB','data',0.80,'USD','FIXED',3040,'UGX',true)`;

    const plans = await sql<
      {
        id: string;
        provider_plan_id: string;
        country_code: string;
        name: string;
        category: string;
        base_price: string;
        currency: string;
        price_type: string;
        send_value: string | null;
        send_currency: string | null;
      }[]
    >`SELECT id, provider_plan_id, country_code, name, category, base_price, currency,
             price_type, send_value, send_currency
      FROM public.global_base_plans
      WHERE provider = 'zendit' AND provider_plan_id LIKE 'itest_%'
      ORDER BY provider_plan_id`;

    assert.equal(plans.length, 2, "both plans exist regardless of store country");

    // The store's currency, via its country, exactly as loadStoreContext
    // resolves it.
    const [mapping] = await sql<
      { currency_code: string; buffer_fraction: string }[]
    >`SELECT cc.currency_code, c.buffer_fraction
      FROM public.global_country_currencies cc
      JOIN public.global_currencies c ON c.code = cc.currency_code
      WHERE cc.country_code = 'rw'`;
    assert.equal(mapping.currency_code, "RWF");

    const [rateRow] = await sql<{ rate: string }[]>`
      SELECT rate FROM public.global_fx_rates
      WHERE base_currency = 'USD' AND quote_currency = 'RWF' AND expires_at > now()
      ORDER BY fetched_at DESC LIMIT 1`;

    const ctx: StoreContext = {
      countryCode: "rw",
      currency: mapping.currency_code,
      usdToStoreRate: Number(rateRow.rate),
      rateSource: "collection_provider",
      rateExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      rateIsFallback: false,
      currencyIsFallback: false,
      bufferFraction: Number(mapping.buffer_fraction),
    };

    const resellerConfig = {
      plan_id: "",
      enabled: true,
      markup_type: "percentage",
      markup_value: 20,
      selling_price: null,
    };

    // Price BOTH plans in the Rwandan store's currency, through the same
    // pipeline the storefront and the purchase orchestrator use.
    const priced = plans.map((p) =>
      pricePlan(
        {
          id: p.id,
          provider_plan_id: p.provider_plan_id,
          country_code: p.country_code,
          name: p.name,
          category: p.category,
          base_price: Number(p.base_price),
          currency: p.currency,
          price_type: p.price_type,
          send_value: p.send_value === null ? null : Number(p.send_value),
          send_currency: p.send_currency,
        },
        { ...resellerConfig, plan_id: p.id },
        ctx,
        [],
      )
    );

    for (const row of priced) {
      // Every price is in the store's currency, whatever country the plan is for.
      assert.equal(row.storeCurrency, "RWF", `${row.providerPlanId} priced in RWF`);
      assert.ok(row.customerPriceDecimal > 0);
      assert.ok(
        row.customerPriceDecimal >= row.costLocalDecimal,
        `${row.providerPlanId}: profit must not be negative`,
      );
    }

    const ug = priced.find((r) => r.providerPlanId === "itest_ug")!;
    const rw = priced.find((r) => r.providerPlanId === "itest_rw")!;

    // RWF carries a 3% buffer (the registry seed), so the effective rate is
    // 1400 * 1.03 = 1442.
    //
    // UG plan: $0.80 at 1442 = 1153.6 -> 1154 cost, +20% reseller = 1384.8
    //          -> 1385.
    assert.equal(ug.costLocalDecimal, 1154);
    assert.equal(ug.customerPriceDecimal, 1385);
    assert.equal(ug.sendCurrency, "UGX", "the recipient still gets UGX");
    assert.equal(ug.sendValue, 3040);

    // RW plan: $1.00 at 1442 = 1442 cost, +20% = 1730.4 -> 1730.
    assert.equal(rw.costLocalDecimal, 1442);
    assert.equal(rw.customerPriceDecimal, 1730);

    // The bug this guards: profit must be the margin, not the whole sale.
    const profit = ug.customerPriceDecimal - ug.costLocalDecimal;
    assert.equal(profit, 231, "1385 - 1154");
    assert.ok(
      profit < ug.customerPriceDecimal / 2,
      "profit is a margin, not the sale",
    );
  } finally {
    await sql.end();
  }
});

maybeTest("integration: an unmapped country falls back to USD, not an error", async () => {
  const sql = postgres(DB_URL!, { onnotice: () => {} });
  try {
    // A country we have no currency mapping for.
    const rows = await sql`
      SELECT currency_code FROM public.global_country_currencies WHERE country_code = 'aq'`;
    assert.equal(rows.length, 0, "no currency mapping for this country");

    // The policy: it is a USD store, the same as the wallet side.
    assert.equal(getCountryCurrency("aq"), "USD");
    assert.equal(getCountryCurrency("tz"), "USD", "a real country outside the set too");

    // And a currency that is not in the registry cannot be used by a wallet.
    await assert.rejects(
      () =>
        sql`INSERT INTO public.global_wallets (reseller_id, currency)
            VALUES ('00000000-0000-0000-0000-0000000000a2', 'ZZZ')`,
      /foreign key/i,
    );
  } finally {
    await sql.end();
  }
});

maybeTest("integration: the wallet map and the pricing table agree", async () => {
  const sql = postgres(DB_URL!, { onnotice: () => {} });
  try {
    const rows = await sql<{ country_code: string; currency_code: string }[]>`
      SELECT country_code, currency_code FROM public.global_country_currencies`;
    const db = new Map(rows.map((r) => [r.country_code, r.currency_code]));
    const walletMap = countryCurrencyMap();

    // Every country the wallet map knows must price in the same currency.
    for (const [country, currency] of Object.entries(walletMap)) {
      assert.equal(
        db.get(country),
        currency,
        `${country}: wallet map says ${currency}, pricing table says ${db.get(country)}`,
      );
    }
    // And the pricing table must not contain a country the wallet map lacks,
    // which would mean a store prices in a currency its wallet cannot hold.
    for (const [country, currency] of db) {
      assert.equal(
        walletMap[country],
        currency,
        `${country}: pricing table says ${currency}, wallet map says ${walletMap[country]}`,
      );
    }
  } finally {
    await sql.end();
  }
});

maybeTest("integration: a USD store prices in USD", async () => {
  const sql = postgres(DB_URL!, { onnotice: () => {} });
  try {
    const [mapping] = await sql<{ currency_code: string }[]>`
      SELECT currency_code FROM public.global_country_currencies WHERE country_code = 'us'`;
    assert.equal(mapping.currency_code, "USD");

    // USD needs no rate lookup: the base currency is its own rate of 1.
    const result = computePrice({
      costUsd: 1.0,
      storeCurrency: "USD",
      usdToStoreRate: 1,
      resellerMarkup: { markup_type: "percentage", markup_value: 25 },
    });
    assert.equal(result.customerPriceDecimal, 1.25);
    assert.equal(result.costLocalDecimal, 1);
  } finally {
    await sql.end();
  }
});

// A stub Supabase client, so loadStoreContext's own currency resolution can
// be exercised without a database. Only the calls it makes are implemented.
function stubClient(opts: {
  countryCurrency?: { currency_code: string } | null;
  currencyRow?: { buffer_fraction: number } | null;
  rate?: Record<string, unknown> | null;
  markups?: Record<string, unknown>[];
}) {
  function table(name: string) {
    const builder: Record<string, unknown> = {};
    const rows: Record<string, unknown>[] =
      name === "global_country_currencies"
        ? opts.countryCurrency ? [opts.countryCurrency] : []
        : name === "global_currencies"
        ? opts.currencyRow ? [opts.currencyRow] : []
        : name === "global_fx_rates"
        ? opts.rate ? [opts.rate] : []
        : name === "global_platform_markups"
        ? opts.markups ?? []
        : [];
    const self = () => builder;
    for (
      const m of ["select", "eq", "order", "limit", "insert", "update"] as const
    ) {
      builder[m] = self;
    }
    builder.maybeSingle = () =>
      Promise.resolve({ data: rows[0] ?? null, error: null });
    builder.single = () =>
      Promise.resolve({ data: rows[0] ?? null, error: null });
    builder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve);
    return builder;
  }
  return { from: table } as never;
}

Deno.test("storePrice: an unmapped country resolves to a USD context", async () => {
  // The pricing-side half of the USD fallback. No rate row is needed because
  // USD's own rate is 1.
  const client = stubClient({ countryCurrency: null, currencyRow: null });
  const { context } = await loadStoreContext(client, {
    countryCode: "tz",
    planId: null,
  });
  assert.equal(context.currency, "USD");
  assert.equal(context.currencyIsFallback, true);
  assert.equal(context.usdToStoreRate, 1);
});

Deno.test("storePrice: a mapped country resolves to its own currency", async () => {
  const client = stubClient({
    countryCurrency: { currency_code: "RWF" },
    currencyRow: { buffer_fraction: 0.03 },
    rate: {
      base_currency: "USD",
      quote_currency: "RWF",
      rate: 1442,
      source: "collection_provider",
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    },
  });
  const { context } = await loadStoreContext(client, {
    countryCode: "rw",
    planId: null,
  });
  assert.equal(context.currency, "RWF");
  assert.equal(context.currencyIsFallback, false);
  assert.equal(context.usdToStoreRate, 1442);
  assert.equal(context.bufferFraction, 0.03);
});

Deno.test("storePrice: a mapped currency with no rate row falls back to USD", async () => {
  // The live case: CDF is mapped to `cd`, but the DRC is not in Zendit's
  // quote list, so no rate row exists. The store must still sell — priced in
  // USD, whose rate is 1 — rather than going dark.
  const client = stubClient({
    countryCurrency: { currency_code: "CDF" },
    currencyRow: { buffer_fraction: 0 },
    rate: null,
  });
  const { context } = await loadStoreContext(client, {
    countryCode: "cd",
    planId: null,
  });
  assert.equal(context.currency, "USD");
  assert.equal(context.currencyIsFallback, true);
  assert.equal(context.usdToStoreRate, 1);
});

Deno.test("storePrice: an expired rate falls back to USD, not an error", async () => {
  // A stale rate silently mis-prices, so it must be treated as no rate — but
  // "no rate" is now the USD fallback, not a hard failure. The row is
  // snake_case exactly as PostgREST returns it — a camelCase fixture hid a
  // bug where the expiry field was read as `expiresAt`.
  const client = stubClient({
    countryCurrency: { currency_code: "RWF" },
    currencyRow: { buffer_fraction: 0 },
    rate: {
      base_currency: "USD",
      quote_currency: "RWF",
      rate: 1442,
      source: "collection_provider",
      fetched_at: new Date(Date.now() - 7200_000).toISOString(),
      expires_at: new Date(Date.now() - 3600_000).toISOString(),
    },
  });
  const { context } = await loadStoreContext(client, {
    countryCode: "rw",
    planId: null,
  });
  assert.equal(context.currency, "USD");
  assert.equal(context.currencyIsFallback, true);
  assert.equal(context.usdToStoreRate, 1);
});
