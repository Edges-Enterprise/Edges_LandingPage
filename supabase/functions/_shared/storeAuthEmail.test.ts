// Run with: deno test supabase/functions/_shared/storeAuthEmail.test.ts
//
// Task 8, defect batch (bug A). The admin client is stubbed (a live
// service-role client cannot run in a test), but the resolution logic itself
// is the real exported function. Covers the two customer-row shapes and the
// store scoping that keeps one store's alias from resolving for another.
import assert from "node:assert/strict";
import { resolveStoreAuthEmail } from "./storeAuthEmail.ts";

interface Fixture {
  customers: Array<Record<string, unknown>>;
  stores: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
}

function fakeAdmin(fx: Fixture) {
  const applyFilters = (
    rows: Array<Record<string, unknown>>,
    filters: Record<string, unknown>,
  ) => rows.filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v));

  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const source = table === "global_customers"
        ? fx.customers
        : table === "global_reseller_applications"
        ? fx.stores
        : [];
      const builder = {
        select() {
          return builder;
        },
        eq(col: string, val: unknown) {
          filters[col] = val;
          return builder;
        },
        maybeSingle() {
          return Promise.resolve({
            data: applyFilters(source, filters)[0] ?? null,
            error: null,
          });
        },
      };
      return builder;
    },
    auth: {
      admin: {
        listUsers({ page, perPage }: { page: number; perPage: number }) {
          const start = (page - 1) * perPage;
          return Promise.resolve({
            data: { users: fx.users.slice(start, start + perPage) },
            error: null,
          });
        },
      },
    },
  } as never;
}

const STORE = "store-1";
const SLUG = "kesh-data";

Deno.test("direct hit: customer row already holds the typed address", async () => {
  const admin = fakeAdmin({
    customers: [{ reseller_id: STORE, email: "a@b.com", auth_email: "a+kesh-data1@b.com" }],
    stores: [{ id: STORE, store_slug: SLUG }],
    users: [],
  });
  assert.equal(await resolveStoreAuthEmail(admin, STORE, "a@b.com"), "a+kesh-data1@b.com");
});

Deno.test("fallback: alias-in-email row is recovered via Auth metadata", async () => {
  const admin = fakeAdmin({
    customers: [{ reseller_id: STORE, email: "a+kesh-data1@b.com", auth_email: "a+kesh-data1@b.com" }],
    stores: [{ id: STORE, store_slug: SLUG }],
    users: [{ email: "a+kesh-data1@b.com", user_metadata: { original_email: "a@b.com" } }],
  });
  assert.equal(await resolveStoreAuthEmail(admin, STORE, "a@b.com"), "a+kesh-data1@b.com");
});

Deno.test("fallback is case-insensitive on both the typed address and metadata", async () => {
  const admin = fakeAdmin({
    customers: [{ reseller_id: STORE, email: "a+kesh-data1@b.com", auth_email: "a+kesh-data1@b.com" }],
    stores: [{ id: STORE, store_slug: SLUG }],
    users: [{ email: "A+Kesh-Data1@B.com", user_metadata: { original_email: "A@B.com" } }],
  });
  assert.equal(await resolveStoreAuthEmail(admin, STORE, "  A@B.COM "), "a+kesh-data1@b.com");
});

Deno.test("another store's alias with the same typed address is not returned", async () => {
  const admin = fakeAdmin({
    customers: [{ reseller_id: STORE, email: "a+other-store1@b.com", auth_email: "a+other-store1@b.com" }],
    stores: [{ id: STORE, store_slug: SLUG }],
    users: [{ email: "a+other-store1@b.com", user_metadata: { original_email: "a@b.com" } }],
  });
  assert.equal(await resolveStoreAuthEmail(admin, STORE, "a@b.com"), null);
});

Deno.test("an alias with no matching customer row is not returned", async () => {
  const admin = fakeAdmin({
    customers: [],
    stores: [{ id: STORE, store_slug: SLUG }],
    users: [{ email: "a+kesh-data1@b.com", user_metadata: { original_email: "a@b.com" } }],
  });
  assert.equal(await resolveStoreAuthEmail(admin, STORE, "a@b.com"), null);
});

Deno.test("unknown typed address resolves to null", async () => {
  const admin = fakeAdmin({
    customers: [{ reseller_id: STORE, email: "a+kesh-data1@b.com", auth_email: "a+kesh-data1@b.com" }],
    stores: [{ id: STORE, store_slug: SLUG }],
    users: [{ email: "a+kesh-data1@b.com", user_metadata: { original_email: "a@b.com" } }],
  });
  assert.equal(await resolveStoreAuthEmail(admin, STORE, "nobody@b.com"), null);
});

Deno.test("owner: the store's own application resolves to its derived alias", async () => {
  const admin = fakeAdmin({
    customers: [],
    stores: [{
      id: STORE,
      store_slug: SLUG,
      email: "owner@b.com",
      original_email: "owner@b.com",
      auth_email: "owner+reseller-ke-kesh-data-neh5u@b.com",
    }],
    users: [],
  });
  assert.equal(
    await resolveStoreAuthEmail(admin, STORE, "owner@b.com"),
    "owner+reseller-ke-kesh-data-neh5u@b.com",
  );
});

Deno.test("owner: typed address is matched case-insensitively and trimmed", async () => {
  const admin = fakeAdmin({
    customers: [],
    stores: [{
      id: STORE,
      store_slug: SLUG,
      original_email: "Owner@B.com",
      auth_email: "owner+reseller-ke-kesh-data-neh5u@b.com",
    }],
    users: [],
  });
  assert.equal(
    await resolveStoreAuthEmail(admin, STORE, "  OWNER@b.COM "),
    "owner+reseller-ke-kesh-data-neh5u@b.com",
  );
});

Deno.test("owner: a different address does not resolve to the owner's alias", async () => {
  const admin = fakeAdmin({
    customers: [],
    stores: [{
      id: STORE,
      store_slug: SLUG,
      original_email: "owner@b.com",
      auth_email: "owner+reseller-ke-kesh-data-neh5u@b.com",
    }],
    users: [],
  });
  assert.equal(await resolveStoreAuthEmail(admin, STORE, "someone-else@b.com"), null);
});

Deno.test("owner: falls back to the application's email when original_email is absent", async () => {
  const admin = fakeAdmin({
    customers: [],
    stores: [{
      id: STORE,
      store_slug: SLUG,
      email: "owner@b.com",
      auth_email: "owner+reseller-ke-kesh-data-neh5u@b.com",
    }],
    users: [],
  });
  assert.equal(
    await resolveStoreAuthEmail(admin, STORE, "owner@b.com"),
    "owner+reseller-ke-kesh-data-neh5u@b.com",
  );
});

Deno.test("a customer row still wins over the owner match for the same typed address", async () => {
  // Guards the ordering: the customer lookup runs first, so a customer of this
  // store keeps resolving even if the owner application shares the address.
  const admin = fakeAdmin({
    customers: [{ reseller_id: STORE, email: "a@b.com", auth_email: "a+kesh-data1@b.com" }],
    stores: [{
      id: STORE,
      store_slug: SLUG,
      original_email: "a@b.com",
      auth_email: "a+reseller-ke-kesh-data-neh5u@b.com",
    }],
    users: [],
  });
  assert.equal(await resolveStoreAuthEmail(admin, STORE, "a@b.com"), "a+kesh-data1@b.com");
});
