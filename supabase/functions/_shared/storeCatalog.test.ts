// Run with: deno test supabase/functions/_shared/storeCatalog.test.ts
import assert from "node:assert/strict";
import { uniqueSorted } from "./storeCatalog.ts";

Deno.test("uniqueSorted trims, drops blanks, dedupes and sorts", () => {
  assert.deepEqual(uniqueSorted([" MTN ", "airtel", "MTN", "", null, undefined, "GLO"]), [
    "GLO",
    "MTN",
    "airtel",
  ]);
});
