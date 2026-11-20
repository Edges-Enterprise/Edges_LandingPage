// scripts/migrate-ofure-to-global.mjs
//
// Migrate the legacy reseller `ofurecmfx352@gmail.com` (store `fure-network`,
// legacy id dbf4f917-5917-451c-a275-051e393c94a4) into the `global_*` tables
// that the `[countryCode]` app actually reads.
//
// Why: the live storefront route (`[countryCode]/[storeName]/page.tsx`) reads
// ONLY `global_reseller_applications` where `application_status = 'active'`.
// This reseller exists only in the legacy `resellers` table, so /ng/fure-network
// 404s while his money keeps landing in a legacy wallet nothing reads.
//
// Dry run by default. Pass --commit to write.
//
//   node scripts/migrate-ofure-to-global.mjs            # print the plan
//   node scripts/migrate-ofure-to-global.mjs --commit   # write it
//
// Idempotent: every step checks for an existing row first, so a re-run after a
// partial failure resumes instead of duplicating.

import { createClient } from "@supabase/supabase-js";

const LEGACY_RESELLER_ID = "dbf4f917-5917-451c-a275-051e393c94a4";
const COMMIT = process.argv.includes("--commit");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const log = (...a) => console.log(...a);
const wrote = [];
const skipped = [];

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

/**
 * Insert `row` unless a row matching `match` already exists. Returns the id.
 *
 * A dry run still assigns a real UUID, so later steps that key off this id
 * (e.g. a customer wallet's `customer_id`) exercise the same code path a
 * commit would instead of failing on a placeholder.
 */
async function ensure(table, match, row) {
  const existing = await must(
    `select ${table}`,
    db.from(table).select("id").match(match).limit(1).maybeSingle(),
  );
  if (existing?.id) {
    skipped.push(`${table} (${existing.id})`);
    return existing.id;
  }
  const id = row.id ?? crypto.randomUUID();
  if (!COMMIT) {
    wrote.push(`${table} [dry]`);
    return id;
  }
  const inserted = await must(
    `insert ${table}`,
    db.from(table).insert({ ...row, id }).select("id").single(),
  );
  wrote.push(`${table} (${inserted.id})`);
  return inserted.id;
}

async function main() {
  log(`\n${"=".repeat(70)}`);
  log(COMMIT ? "  COMMITTING" : "  DRY RUN — no writes (pass --commit)");
  log("=".repeat(70));

  // ── Source rows ───────────────────────────────────────────────────────────
  const legacy = await must(
    "legacy reseller",
    db.from("resellers").select("*").eq("id", LEGACY_RESELLER_ID).single(),
  );
  const legacyWallet = await must(
    "legacy wallet",
    db
      .from("reseller_wallets")
      .select("*")
      .eq("reseller_id", LEGACY_RESELLER_ID)
      .maybeSingle(),
  );
  const legacyVAs = await must(
    "legacy VAs",
    db
      .from("reseller_virtual_accounts")
      .select("*")
      .eq("reseller_id", LEGACY_RESELLER_ID),
  );
  const legacyConfigs = await must(
    "legacy plan configs",
    db
      .from("reseller_plan_configs")
      .select("*")
      .eq("reseller_id", LEGACY_RESELLER_ID),
  );
  const legacyCustomers = await must(
    "legacy customers",
    db
      .from("reseller_customers")
      .select("*")
      .eq("reseller_id", LEGACY_RESELLER_ID),
  );
  const legacyCustomerWallets = await must(
    "legacy customer wallets",
    db
      .from("reseller_customer_wallets")
      .select("*")
      .eq("reseller_id", LEGACY_RESELLER_ID),
  );
  const legacyAppConfigs = await must(
    "legacy app configs",
    db
      .from("reseller_app_configs")
      .select("*")
      .eq("reseller_id", LEGACY_RESELLER_ID),
  );
  const legacyNotifications = await must(
    "legacy notifications",
    db
      .from("reseller_notifications")
      .select("*")
      .eq("reseller_id", LEGACY_RESELLER_ID),
  );
  const legacyOrders = await must(
    "legacy orders",
    db
      .from("reseller_orders")
      .select("*")
      .eq("reseller_id", LEGACY_RESELLER_ID)
      .order("created_at", { ascending: true }),
  );
  const legacyTx = await must(
    "legacy transactions",
    db
      .from("reseller_transactions")
      .select("*")
      .eq("reseller_id", LEGACY_RESELLER_ID)
      .order("created_at", { ascending: true }),
  );
  const legacyBasePlans = await must(
    "legacy base plans",
    db
      .from("reseller_base_plans")
      .select("id, plan_id, network, plan_name, plan_type, amount, is_active"),
  );

  // ── Plan mapping ──────────────────────────────────────────────────────────
  // `global_base_plans` NG rows were seeded FROM `reseller_base_plans` and kept
  // the legacy integer in metadata.plan_id, which is an exact key. (Name+network
  // is NOT unique: 35 legacy plans share a name across plan_type.)
  const globalPlans = [];
  for (let from = 0; ; from += 1000) {
    const page = await must(
      "global base plans",
      db
        .from("global_base_plans")
        .select("id, network, name, base_price, metadata, country_code")
        .eq("country_code", "NG")
        .range(from, from + 999),
    );
    globalPlans.push(...page);
    if (page.length < 1000) break;
  }
  const globalByLegacyInt = new Map();
  for (const p of globalPlans) {
    const legacyInt = p.metadata?.plan_id;
    if (legacyInt != null) globalByLegacyInt.set(String(legacyInt), p);
  }
  const legacyByUuid = new Map(legacyBasePlans.map((p) => [p.id, p]));

  /** legacy config.plan_id (uuid) -> global_base_plans.id */
  function toGlobalPlanId(legacyPlanUuid) {
    const base = legacyByUuid.get(legacyPlanUuid);
    if (!base) return null;
    return globalByLegacyInt.get(String(base.plan_id))?.id ?? null;
  }

  // ── Sanity: no OTHER global identity already claims this reseller ─────────
  // The migrated row reuses LEGACY_RESELLER_ID, so exclude it: a re-run must
  // resume, not abort.
  const collision = (
    await must(
      "collision check",
      db
        .from("global_reseller_applications")
        .select("id, store_slug")
        .or(
          `auth_user_id.eq.${legacy.auth_user_id},email.eq.${legacy.email},store_slug.eq.${legacy.store_name}`,
        ),
    )
  ).filter((r) => r.id !== LEGACY_RESELLER_ID);
  if (collision.length) {
    throw new Error(
      `Refusing to run: global identity already exists (${JSON.stringify(collision)})`,
    );
  }

  // ── 1. Application ────────────────────────────────────────────────────────
  // The global row reuses the legacy UUID, so every historical reference
  // (orders, transactions, logs) keeps pointing at one stable key.
  const appId = await ensure(
    "global_reseller_applications",
    { id: LEGACY_RESELLER_ID },
    {
      id: LEGACY_RESELLER_ID,
      auth_user_id: legacy.auth_user_id,
      first_name: "Ofure",
      last_name: "Osayande",
      email: legacy.email,
      auth_email: legacy.email,
      original_email: legacy.email,
      phone: legacy.phone,
      country_code: "ng",
      store_name: "Fure Network",
      store_slug: "fure-network",
      brand_color: legacy.theme ?? "#D97706",
      logo_url: legacyAppConfigs[0]?.config?.assets?.logo ?? null,
      android_app: legacy.android_app ?? true,
      application_status: "active",
      agreed: true,
      bvn: legacy.bvn,
      transaction_pin: legacy.transaction_pin,
      temp_password: legacy.temp_password,
      dashboard_token: legacy.dashboard_token,
      push_token: legacy.push_token,
      fcm_token: legacy.fcm_token,
      notifications_enabled: legacy.notifications_enabled ?? true,
      catalog_mode: "selected",
      submitted_at: legacy.created_at,
      approved_at: new Date().toISOString(),
    },
  );
  log(`\napplication ......... ${appId}`);

  // ── 2. Wallet ─────────────────────────────────────────────────────────────
  // Carry the STORED balance. It is the authoritative figure: deposits 2,800
  // minus completed orders 2,798 = 2.00. The legacy ledger is the incomplete
  // one (it never wrote 5 purchase rows), so summing it understates spending.
  const walletId = await ensure(
    "global_wallets",
    { reseller_id: appId },
    {
      reseller_id: appId,
      balance: Number(legacyWallet?.balance ?? 0),
      currency: "NGN",
      status: "active",
      bonus_balance: 0,
      app_bonus_claimed: false,
    },
  );
  log(`wallet .............. ${walletId}  balance=${legacyWallet?.balance ?? 0}`);

  // ── 3. Virtual account + legacy cutover ───────────────────────────────────
  // The webhook resolves the LEGACY table first (STEP 5) and returns early, so
  // a transfer to the old number would credit the dead legacy wallet. Carry the
  // number across and deactivate the legacy row, or his customers' saved
  // account number becomes a money sink.
  for (const va of legacyVAs) {
    const vaId = await ensure(
      "global_virtual_accounts",
      { account_number: va.account_number },
      {
        reseller_id: appId,
        account_number: va.account_number,
        bank_name: va.bank_name,
        account_name: va.account_name,
        account_type: va.account_type,
        provider: va.provider,
        tracking_reference: va.tracking_reference,
        customer_email: va.customer_email,
        customer_name: va.customer_name,
        customer_phone: va.customer_phone,
        customer_bvn: va.customer_bvn,
        status: "active",
      },
    );
    log(`virtual account ..... ${vaId}  ${va.account_number} (${va.bank_name})`);

    if (va.status === "active") {
      if (COMMIT) {
        await must(
          "deactivate legacy VA",
          db
            .from("reseller_virtual_accounts")
            .update({ status: "inactive", updated_at: new Date().toISOString() })
            .eq("id", va.id),
        );
      }
      log(`  legacy VA ${va.account_number} -> inactive`);
    }
  }

  // ── 4. Plan configs ───────────────────────────────────────────────────────
  // selling_price stays NULL so the markup is applied at read time. A non-null
  // selling_price overrides the markup outright (pricing.ts step 4) and would
  // freeze a stale shelf price.
  const existingConfigs = await must(
    "existing global configs",
    db
      .from("global_reseller_plan_configs")
      .select("plan_id")
      .eq("reseller_id", appId),
  );
  const havePlan = new Set(existingConfigs.map((c) => c.plan_id));
  const configRows = [];
  let unmapped = 0;
  for (const c of legacyConfigs) {
    const gid = toGlobalPlanId(c.plan_id);
    if (!gid) {
      unmapped++;
      continue;
    }
    if (havePlan.has(gid)) continue;
    configRows.push({
      reseller_id: appId,
      plan_id: gid,
      enabled: c.enabled,
      markup_type: c.markup_type,
      markup_value: Number(c.markup_value),
      selling_price: null,
    });
  }
  if (COMMIT && configRows.length) {
    for (let i = 0; i < configRows.length; i += 500) {
      await must(
        "insert plan configs",
        db
          .from("global_reseller_plan_configs")
          .insert(configRows.slice(i, i + 500)),
      );
    }
  }
  log(
    `plan configs ........ ${configRows.length} to add, ${unmapped} unmapped ` +
      `(of ${legacyConfigs.length} legacy)`,
  );

  // ── 5. Customers + wallets ────────────────────────────────────────────────
  const customerIdMap = new Map();
  for (const c of legacyCustomers) {
    const cid = await ensure(
      "global_customers",
      { reseller_id: appId, email: c.email },
      {
        reseller_id: appId,
        email: c.email,
        first_name: c.first_name ?? c.email.split("@")[0],
        last_name: c.last_name ?? "",
        auth_user_id: c.auth_user_id,
        auth_email: c.auth_email,
        transaction_pin: c.transaction_pin,
        push_token: c.push_token,
        fcm_token: c.fcm_token,
        notifications_enabled: c.notifications_enabled ?? false,
      },
    );
    customerIdMap.set(c.id, cid);
    log(`customer ............ ${cid}  ${c.email}`);
  }
  for (const w of legacyCustomerWallets) {
    const cid = customerIdMap.get(w.customer_id);
    if (!cid) continue;
    const wid = await ensure(
      "global_customer_wallets",
      { reseller_id: appId, customer_id: cid },
      {
        reseller_id: appId,
        customer_id: cid,
        balance: Number(w.balance ?? 0),
        total_spent: Number(w.total_spent ?? 0),
        currency: "NGN",
        status: "active",
      },
    );
    log(`customer wallet ..... ${wid}`);
  }

  // ── 6. Store settings + app config ────────────────────────────────────────
  await ensure(
    "global_reseller_store_settings",
    { application_id: appId },
    {
      application_id: appId,
      store_status: "active",
      contact_phone: legacy.phone,
    },
  );
  for (const cfg of legacyAppConfigs) {
    await ensure(
      "global_reseller_app_configs",
      { application_id: appId },
      {
        application_id: appId,
        config: cfg.config,
        build_status:
          cfg.build_status === "completed" ? "completed" : "configuring",
      },
    );
    // The storefront's install banner reads global_app_builds, not the legacy
    // reseller_app_configs.apk_url. Without this the APK he already shipped
    // disappears from his store.
    if (cfg.apk_url) {
      await ensure(
        "global_app_builds",
        { application_id: appId, apk_url: cfg.apk_url },
        {
          application_id: appId,
          apk_url: cfg.apk_url,
          build_status: "completed",
          completed_at: cfg.updated_at ?? cfg.created_at,
          created_at: cfg.created_at,
        },
      );
      log(`app build ........... ${cfg.apk_url.split("/").pop()}`);
    }
  }
  log(`store settings ...... ensured`);

  // ── 7. Notifications ──────────────────────────────────────────────────────
  for (const n of legacyNotifications) {
    await ensure(
      "global_notifications",
      { reseller_id: appId, id: n.id },
      {
        id: n.id,
        reseller_id: appId,
        notification_type: n.notification_type,
        message: n.message,
        is_read: n.is_read,
        metadata: n.metadata ?? {},
        created_at: n.created_at,
      },
    );
  }
  log(`notifications ....... ${legacyNotifications.length}`);

  // ── 8. Orders ─────────────────────────────────────────────────────────────
  // Not a straight copy: global_orders requires customer_name and plan_name
  // (both NOT NULL) which legacy rows do not carry, and 13 of 35 have a null
  // plan_id. plan_name falls back to an explicit placeholder rather than a
  // guess — only 1 of the 5 null-plan completed orders is price-inferable.
  const customerByEmail = new Map(
    [...customerIdMap.entries()].map(([legacyId, gid]) => [
      legacyCustomers.find((c) => c.id === legacyId)?.email,
      gid,
    ]),
  );
  let ordersWritten = 0;
  for (const o of legacyOrders) {
    const legacyPlan = o.plan_id ? legacyByUuid.get(o.plan_id) : null;
    const gPlanId = o.plan_id ? toGlobalPlanId(o.plan_id) : null;
    await ensure(
      "global_orders",
      { reseller_id: appId, transaction_reference: o.id },
      {
        reseller_id: appId,
        customer_id: customerByEmail.get(o.customer_email) ?? null,
        customer_name: o.customer_email?.split("@")[0] ?? "Customer",
        plan_id: gPlanId,
        plan_name: legacyPlan?.plan_name ?? "Historical plan (not recorded)",
        amount: Number(o.amount),
        profit: Number(o.profit ?? 0),
        status: o.status,
        payment_method: null,
        transaction_reference: o.id,
        created_at: o.created_at,
        metadata: { migrated_from: "reseller_orders", legacy_id: o.id },
      },
    );
    ordersWritten++;
  }
  log(`orders .............. ${ordersWritten}`);

  // ── 9. Transactions ───────────────────────────────────────────────────────
  // global_transactions.type allows only credit/debit/purchase/refund, so the
  // legacy `deposit` must become `credit`. description and reference are NOT
  // NULL and legacy rows have no description.
  //
  // The legacy ledger is missing a debit for 5 completed orders (97+243+49+485+
  // 58 = 932), which is exactly why summing it gives 934 against a 2.00
  // balance. Those debits are reconstructed from the orders so the imported
  // history reconciles to the carried balance.
  const txWritten = [];
  for (const t of legacyTx) {
    const isDeposit = t.type === "deposit";
    await ensure(
      "global_transactions",
      { reseller_id: appId, reference: t.reference },
      {
        reseller_id: appId,
        wallet_id: walletId === "(new)" ? null : walletId,
        type: isDeposit ? "credit" : "debit",
        amount: Number(t.amount),
        description: isDeposit
          ? "Wallet funding (migrated from legacy)"
          : "Purchase (migrated from legacy)",
        status: t.status,
        reference: t.reference,
        payment_gateway: isDeposit ? "xixapay" : null,
        created_at: t.created_at,
        metadata: { ...(t.metadata ?? {}), migrated_from: "reseller_transactions" },
      },
    );
    txWritten.push(t.reference);
  }

  const recordedPurchases = new Set(
    legacyTx.filter((t) => t.type === "purchase").map((t) => t.reference),
  );
  const unrecorded = legacyOrders.filter(
    (o) => o.status === "completed" && !recordedPurchases.has(o.id),
  );
  for (const o of unrecorded) {
    await ensure(
      "global_transactions",
      { reseller_id: appId, reference: o.id },
      {
        reseller_id: appId,
        wallet_id: walletId === "(new)" ? null : walletId,
        type: "debit",
        amount: Number(o.amount),
        description: "Purchase (reconstructed from completed order)",
        status: "completed",
        reference: o.id,
        created_at: o.created_at,
        metadata: {
          migrated_from: "reseller_orders",
          reconstructed: true,
          order_id: o.id,
        },
      },
    );
    txWritten.push(o.id);
  }
  log(
    `transactions ........ ${txWritten.length} ` +
      `(${legacyTx.length} legacy + ${unrecorded.length} reconstructed)`,
  );

  // ── 10. Reseller settings row ─────────────────────────────────────────────
  const existingSettings = await must(
    "reseller settings",
    db
      .from("global_reseller_settings")
      .select("id")
      .eq("auth_user_id", legacy.auth_user_id)
      .maybeSingle(),
  );
  if (!existingSettings && COMMIT) {
    await must(
      "insert reseller settings",
      db
        .from("global_reseller_settings")
        .insert({ auth_user_id: legacy.auth_user_id }),
    );
  }
  log(`reseller settings ... ${existingSettings ? "exists" : "created"}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  log(`\n${"=".repeat(70)}`);
  log(`wrote ${wrote.length} / skipped ${skipped.length} existing`);
  if (!COMMIT) log("DRY RUN — nothing was written. Re-run with --commit.");
  log("=".repeat(70));

  // Post-commit assertions.
  if (COMMIT) {
    const va = await must(
      "verify global VA",
      db
        .from("global_virtual_accounts")
        .select("account_number, status")
        .eq("reseller_id", appId)
        .eq("status", "active"),
    );
    const legacyActive = await must(
      "verify legacy VA",
      db
        .from("reseller_virtual_accounts")
        .select("account_number, status")
        .eq("reseller_id", LEGACY_RESELLER_ID)
        .eq("status", "active"),
    );
    const wallet = await must(
      "verify wallet",
      db.from("global_wallets").select("balance").eq("reseller_id", appId).single(),
    );
    log(`\nVERIFY active global VAs: ${JSON.stringify(va)}`);
    log(`VERIFY active legacy VAs: ${JSON.stringify(legacyActive)}  (want [])`);
    log(`VERIFY wallet balance: ${wallet.balance}`);
    if (legacyActive.length) {
      log("!! legacy VA still active — the webhook will credit the dead wallet");
    }
  }
}

main().catch((e) => {
  console.error("\nFAILED:", e.message);
  process.exit(1);
});
