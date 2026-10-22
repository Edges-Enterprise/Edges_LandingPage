// Run with: deno test --no-check --allow-read supabase/functions/_shared/currencySymbols.test.ts
//
// Task 8, row 8.e.ii (web half). The person reported that a non-NG storefront
// shows the country code next to the symbol. On the web the symbol never comes
// from Intl (which is what the mobile app hit); it comes from CURRENCY_SYMBOLS
// in src/lib/currency/currency.ts. That map had drifted from the country
// configs (src/config/countries/*, the source of truth): CDF was missing
// entirely, so getCurrencySymbol("CDF") fell back to the code itself and
// rendered "CDF 500" for DR Congo; MAD was mapped to the Arabic "د.م." while
// the config (and the mobile app) use "DH".
//
// This test parses both files and asserts they agree, so the two can no longer
// drift silently. It reads the files rather than importing them because the
// web is TypeScript with a path alias and no test runner.
import assert from "node:assert/strict";

const root = new URL("../../../", import.meta.url);

function parseCountryConfigs(): Map<string, { currency: string; symbol: string }> {
  const dir = new URL("src/config/countries/", root);
  const out = new Map<string, { currency: string; symbol: string }>();
  for (const entry of Deno.readDirSync(dir)) {
    if (!entry.name.endsWith(".ts") || entry.name === "index.ts") continue;
    const s = Deno.readTextFileSync(new URL(entry.name, dir));
    const code = s.match(/code:\s*"([a-z]{2})"/);
    const cur = s.match(/^\s*currency:\s*"([A-Z]{3})"/m);
    const sym = s.match(/currencySymbol:\s*"([^"]*)"/);
    if (code && cur && sym) {
      out.set(code[1], { currency: cur[1], symbol: sym[1] });
    }
  }
  return out;
}

function parseSymbolMap(): Map<string, string> {
  const s = Deno.readTextFileSync(new URL("src/lib/currency/currency.ts", root));
  const block = s.split("CURRENCY_SYMBOLS")[1].split("};")[0];
  const out = new Map<string, string>();
  for (const m of block.matchAll(/^\s*([A-Z]{3}):\s*"([^"]*)"/gm)) {
    out.set(m[1], m[2]);
  }
  return out;
}

Deno.test("every country's currency has a symbol, and it matches the config", () => {
  const countries = parseCountryConfigs();
  const symbols = parseSymbolMap();
  assert.ok(countries.size >= 20, `parsed only ${countries.size} country configs`);
  const problems: string[] = [];
  for (const [code, { currency, symbol }] of countries) {
    const mapped = symbols.get(currency);
    if (mapped === undefined) {
      problems.push(`${code}: ${currency} has no symbol (would render "${currency}")`);
    } else if (mapped !== symbol) {
      problems.push(`${code}: ${currency} maps to "${mapped}" but the config says "${symbol}"`);
    }
  }
  assert.deepEqual(problems, []);
});

Deno.test("the two reported currencies are right", () => {
  const symbols = parseSymbolMap();
  // DR Congo: the missing entry that rendered the bare code.
  assert.equal(symbols.get("CDF"), "FC");
  // Morocco: the Arabic symbol replaced by the Latin "DH" the configs use.
  assert.equal(symbols.get("MAD"), "DH");
});
