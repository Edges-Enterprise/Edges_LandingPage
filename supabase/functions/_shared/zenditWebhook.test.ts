// Run with: deno test supabase/functions/_shared/zenditWebhook.test.ts
import assert from "node:assert/strict";
import {
  clientIp,
  constantTimeEqual,
  createZenditWebhookHandler,
  fetchZenditTransaction,
  normalizeZenditStatus,
  resolveAllowedIps,
  type SettleFn,
  tokenMatches,
  type ZenditWebhookConfig,
  ZENDIT_AUTH_HEADER,
  ZENDIT_WEBHOOK_IPS,
} from "./zenditWebhook.ts";

const SECRET = "test-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const REF = "GRC_DATA_1790000000000_ab12cd";

type Call = { url: string; auth: string | null };

// Config with the IP allow-list in blocking mode (default is observe-only).
const ENFORCING: ZenditWebhookConfig = { secret: SECRET, apiKey: "zendit-key", enforceIps: "true" };

function setup(opts: {
  apiResponse?: () => Response | Promise<Response>;
  settleResult?: Awaited<ReturnType<SettleFn>>;
  config?: ZenditWebhookConfig;
} = {}) {
  const fetchCalls: Call[] = [];
  const settleCalls: Array<{ ref: string; outcome: string; payload: Record<string, unknown> }> = [];
  const fetchFn = ((url: string, init?: RequestInit) => {
    fetchCalls.push({
      url,
      auth: new Headers(init?.headers).get("authorization"),
    });
    return Promise.resolve(
      opts.apiResponse?.() ??
        new Response(JSON.stringify({ transactionId: REF, status: "DONE" }), { status: 200 }),
    );
  }) as unknown as typeof fetch;
  const settle: SettleFn = (ref, outcome, payload) => {
    settleCalls.push({ ref, outcome, payload });
    return Promise.resolve(
      opts.settleResult ?? { data: { code: "SETTLED", order_id: "o1" }, error: null },
    );
  };
  const handler = createZenditWebhookHandler({
    getConfig: () => opts.config ?? { secret: SECRET, apiKey: "zendit-key" },
    fetchFn,
    settle,
  });
  return { handler, fetchCalls, settleCalls };
}

function post(body: unknown, token: string | null = SECRET, ip?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token !== null) headers[ZENDIT_AUTH_HEADER] = token;
  if (ip) headers["cf-connecting-ip"] = ip;
  return new Request("http://x/", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const hook = (status: string) => ({ transactionId: REF, status });

Deno.test("status normalisation", () => {
  for (const s of ["DONE", "done", " Done "]) assert.equal(normalizeZenditStatus(s), "completed");
  for (const s of ["FAILED", "FAIL", "failed"]) assert.equal(normalizeZenditStatus(s), "failed");
  for (const s of ["PENDING", "ACCEPTED", "AUTHORIZED", "IN_PROGRESS", "IN PROGRESS"]) {
    assert.equal(normalizeZenditStatus(s), "pending");
  }
  for (const s of ["REFUNDED", "", undefined, null, 7]) {
    assert.equal(normalizeZenditStatus(s), "unknown");
  }
});

Deno.test("constant-time compare and token matching", async () => {
  assert.equal(await constantTimeEqual("abc", "abc"), true);
  assert.equal(await constantTimeEqual("abc", "abd"), false);
  assert.equal(await constantTimeEqual("abc", "abcd"), false);
  assert.equal(await tokenMatches("new", ["new", "old"]), true);
  assert.equal(await tokenMatches("old", ["new", "old"]), true); // rotation overlap
  assert.equal(await tokenMatches("nope", ["new", "old"]), false);
  assert.equal(await tokenMatches(null, ["new"]), false);
  assert.equal(await tokenMatches("", ["", undefined]), false); // empty never matches
});

Deno.test("HEAD and GET answer 200 without auth (console verify); other methods 405", async () => {
  const { handler } = setup();
  assert.equal((await handler(new Request("http://x/", { method: "HEAD" }))).status, 200);
  assert.equal((await handler(new Request("http://x/", { method: "GET" }))).status, 200);
  assert.equal((await handler(new Request("http://x/", { method: "PUT" }))).status, 405);
});

Deno.test("fails closed when the webhook secret is not configured", async () => {
  const { handler, settleCalls } = setup({ config: { apiKey: "k" } });
  assert.equal((await handler(post(hook("DONE"), ""))).status, 500);
  assert.equal(settleCalls.length, 0);
});

Deno.test("rejects missing or wrong auth header; accepts current and previous secret", async () => {
  const { handler, settleCalls, fetchCalls } = setup({
    config: { secret: SECRET, previousSecret: "old-secret", apiKey: "k" },
  });
  assert.equal((await handler(post(hook("DONE"), null))).status, 401);
  assert.equal((await handler(post(hook("DONE"), "wrong"))).status, 401);
  assert.equal(settleCalls.length + fetchCalls.length, 0);
  assert.equal((await handler(post(hook("DONE"), "old-secret"))).status, 200);
  assert.equal((await handler(post(hook("DONE"), SECRET))).status, 200);
});

Deno.test("bad bodies are 400", async () => {
  const { handler } = setup();
  assert.equal((await handler(post("{not json"))).status, 400);
  assert.equal((await handler(post({ status: "DONE" }))).status, 400);
  assert.equal((await handler(post({ transactionId: 42, status: "DONE" }))).status, 400);
});

Deno.test("in-flight statuses are acknowledged and cause no lookup or settlement", async () => {
  for (const s of ["PENDING", "ACCEPTED", "AUTHORIZED", "IN_PROGRESS", "SOMETHING_NEW"]) {
    const { handler, fetchCalls, settleCalls } = setup();
    const r = await handler(post(hook(s)));
    assert.equal(r.status, 200, s);
    assert.equal(fetchCalls.length + settleCalls.length, 0, s);
  }
});

Deno.test("DONE: confirms with Zendit's API using our key, then settles as completed", async () => {
  const { handler, fetchCalls, settleCalls } = setup({
    apiResponse: () =>
      new Response(
        JSON.stringify({
          transactionId: REF, status: "DONE", cost: 440, costCurrency: "USD",
          recipientPhoneNumber: "+233244123456", updatedAt: "2026-10-06T10:00:00Z",
        }),
        { status: 200 },
      ),
  });
  const r = await handler(post(hook("DONE")));
  assert.equal(r.status, 200);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, `https://api.zendit.io/v1/topups/purchases/${REF}`);
  assert.equal(fetchCalls[0].auth, "Bearer zendit-key");
  assert.equal(settleCalls.length, 1);
  assert.equal(settleCalls[0].ref, REF);
  assert.equal(settleCalls[0].outcome, "completed");
  assert.equal(settleCalls[0].payload.status, "DONE");
  assert.equal(settleCalls[0].payload.cost, 440);
});

Deno.test("FAILED and FAIL both settle as failed", async () => {
  for (const s of ["FAILED", "FAIL"]) {
    const { handler, settleCalls } = setup({
      apiResponse: () => new Response(JSON.stringify({ transactionId: REF, status: s }), { status: 200 }),
    });
    assert.equal((await handler(post(hook(s)))).status, 200);
    assert.equal(settleCalls[0].outcome, "failed", s);
  }
});

Deno.test("trusts Zendit's API over the webhook when they disagree", async () => {
  const { handler, settleCalls } = setup({
    apiResponse: () => new Response(JSON.stringify({ transactionId: REF, status: "FAILED" }), { status: 200 }),
  });
  assert.equal((await handler(post(hook("DONE")))).status, 200); // webhook claims DONE
  assert.equal(settleCalls[0].outcome, "failed"); // API says FAILED
});

Deno.test("webhook says final but API says in flight: 503, nothing settled", async () => {
  const { handler, settleCalls } = setup({
    apiResponse: () => new Response(JSON.stringify({ transactionId: REF, status: "IN_PROGRESS" }), { status: 200 }),
  });
  assert.equal((await handler(post(hook("DONE")))).status, 503);
  assert.equal(settleCalls.length, 0);
});

Deno.test("API 404: not ours, acknowledged and ignored", async () => {
  const { handler, settleCalls } = setup({ apiResponse: () => new Response("{}", { status: 404 }) });
  const r = await handler(post(hook("DONE")));
  assert.equal(r.status, 200);
  assert.equal(settleCalls.length, 0);
});

Deno.test("verification trouble never settles: API 500/401/403/bad JSON/network/no key all 500", async () => {
  const cases: Array<() => Response | Promise<Response>> = [
    () => new Response("{}", { status: 500 }),
    () => new Response("{}", { status: 401 }),
    () => new Response("{}", { status: 403 }),
    () => new Response("<html>", { status: 200 }),
    () => Promise.reject(new Error("network down")) as unknown as Response,
  ];
  for (const apiResponse of cases) {
    const { handler, settleCalls } = setup({ apiResponse });
    assert.equal((await handler(post(hook("DONE")))).status, 500);
    assert.equal(settleCalls.length, 0);
  }
  const { handler, settleCalls } = setup({ config: { secret: SECRET } }); // no apiKey
  assert.equal((await handler(post(hook("DONE")))).status, 500);
  assert.equal(settleCalls.length, 0);
});

Deno.test("settlement result codes map to the right HTTP status", async () => {
  const table: Array<[Awaited<ReturnType<SettleFn>>, number]> = [
    [{ data: { code: "SETTLED" }, error: null }, 200],
    [{ data: { code: "ALREADY_SETTLED" }, error: null }, 200],
    [{ data: { code: "ORDER_NOT_FOUND" }, error: null }, 503],
    [{ data: { code: "DEDUCTION_FAILED", error: "x" }, error: null }, 500],
    [{ data: { code: "INVALID_STATE" }, error: null }, 200],
    [{ data: { code: "AMBIGUOUS_REFERENCE" }, error: null }, 200],
    [{ data: { code: "WHAT" }, error: null }, 500],
    [{ data: null, error: { message: "db down" } }, 500],
  ];
  for (const [settleResult, expected] of table) {
    const { handler } = setup({ settleResult });
    assert.equal((await handler(post(hook("DONE")))).status, expected, JSON.stringify(settleResult));
  }
});

Deno.test("fetchZenditTransaction encodes the id in the URL", async () => {
  let seen = "";
  const f = ((u: string) => {
    seen = u;
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as unknown as typeof fetch;
  await fetchZenditTransaction("a/b c", "k", f);
  assert.equal(seen, "https://api.zendit.io/v1/topups/purchases/a%2Fb%20c");
});

Deno.test("IP allow-list (enforcing): built-in Zendit IPs pass, others get 403 before any auth/lookup/settlement", async () => {
  for (const ip of ZENDIT_WEBHOOK_IPS) {
    const { handler, settleCalls } = setup({ config: ENFORCING });
    assert.equal((await handler(post(hook("DONE"), SECRET, ip))).status, 200, ip);
    assert.equal(settleCalls.length, 1, ip);
  }
  const { handler, fetchCalls, settleCalls } = setup({ config: ENFORCING });
  assert.equal((await handler(post(hook("DONE"), SECRET, "203.0.113.9"))).status, 403);
  assert.equal(fetchCalls.length + settleCalls.length, 0);
  // right IP but wrong secret is still rejected
  assert.equal((await handler(post(hook("DONE"), "wrong", ZENDIT_WEBHOOK_IPS[0]))).status, 401);
});

Deno.test("IP allow-list: missing client-IP header does not lock out real webhooks", async () => {
  const { handler, settleCalls } = setup();
  assert.equal((await handler(post(hook("DONE")))).status, 200); // no cf-connecting-ip
  assert.equal(settleCalls.length, 1);
});

Deno.test("IP allow-list: observe-only by default (unknown source is logged, not blocked)", async () => {
  for (const enforceIps of [undefined, "", "false", "yes"]) {
    const { handler, settleCalls } = setup({ config: { secret: SECRET, apiKey: "k", enforceIps } });
    assert.equal((await handler(post(hook("DONE"), SECRET, "203.0.113.9"))).status, 200, String(enforceIps));
    assert.equal(settleCalls.length, 1);
  }
  // observe-only still never bypasses the secret header
  const { handler } = setup();
  assert.equal((await handler(post(hook("DONE"), "wrong", "203.0.113.9"))).status, 401);
  // "TRUE" with whitespace also enforces
  const loud = setup({ config: { secret: SECRET, apiKey: "k", enforceIps: " TRUE " } });
  assert.equal((await loud.handler(post(hook("DONE"), SECRET, "203.0.113.9"))).status, 403);
});

Deno.test("IP allow-list (enforcing): x-forwarded-for is ignored (client-controlled)", async () => {
  const { handler } = setup({ config: ENFORCING });
  const req = post(hook("DONE"), SECRET, "203.0.113.9");
  req.headers.set("x-forwarded-for", ZENDIT_WEBHOOK_IPS[0]);
  assert.equal((await handler(req)).status, 403);
});

Deno.test("IP allow-list: env override, wildcard off-switch, ::ffff: form, HEAD/GET exempt", async () => {
  assert.deepEqual(resolveAllowedIps(undefined), ZENDIT_WEBHOOK_IPS);
  assert.deepEqual(resolveAllowedIps("  "), ZENDIT_WEBHOOK_IPS);
  assert.equal(resolveAllowedIps("*"), null);
  assert.deepEqual(resolveAllowedIps("1.1.1.1, 2.2.2.2"), ["1.1.1.1", "2.2.2.2"]);
  assert.equal(clientIp(new Request("http://x/", { headers: { "cf-connecting-ip": " ::ffff:3.217.45.95 " } })), "3.217.45.95");

  const custom = setup({ config: { ...ENFORCING, allowedIps: "203.0.113.9" } });
  assert.equal((await custom.handler(post(hook("DONE"), SECRET, "203.0.113.9"))).status, 200);
  assert.equal((await custom.handler(post(hook("DONE"), SECRET, ZENDIT_WEBHOOK_IPS[0]))).status, 403);

  const off = setup({ config: { ...ENFORCING, allowedIps: "*" } });
  assert.equal((await off.handler(post(hook("DONE"), SECRET, "203.0.113.9"))).status, 200);

  const v6 = setup({ config: ENFORCING });
  assert.equal((await v6.handler(post(hook("DONE"), SECRET, "::ffff:216.53.69.2"))).status, 200);

  const strict = setup({ config: ENFORCING });
  const head = new Request("http://x/", { method: "HEAD", headers: { "cf-connecting-ip": "203.0.113.9" } });
  assert.equal((await strict.handler(head)).status, 200); // console verify not IP-gated
});
