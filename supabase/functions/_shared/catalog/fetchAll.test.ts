// Run with: deno test supabase/functions/_shared/catalog/fetchAll.test.ts
import assert from "node:assert/strict";
import { fetchAllRows, PAGE_SIZE } from "./fetchAll.ts";

/** A fake table of `n` rows that honours the Range the helper applies. */
function fakeTable(n: number, pageCap = 1000) {
  const rows = Array.from({ length: n }, (_, i) => ({ i }));
  const ranges: Array<[number, number]> = [];
  return {
    ranges,
    build: () => ({
      range(from: number, to: number) {
        ranges.push([from, to]);
        // The server caps rows per request regardless of the Range asked.
        const end = Math.min(to, from + pageCap - 1);
        return Promise.resolve({ data: rows.slice(from, end + 1), error: null });
      },
    }),
  };
}

Deno.test("fetchAllRows pages past the per-request cap", async () => {
  const table = fakeTable(2500);
  const { data, error } = await fetchAllRows<{ i: number }>(table.build);
  assert.equal(error, null);
  assert.equal(data.length, 2500);
  assert.deepEqual(
    data.map((r) => r.i),
    Array.from({ length: 2500 }, (_, i) => i),
  );
  // Three pages: 0-999, 1000-1999, 2000-2999 (the last short).
  assert.deepEqual(table.ranges, [
    [0, 999],
    [1000, 1999],
    [2000, 2999],
  ]);
});

Deno.test("fetchAllRows stops on a short page (no extra request)", async () => {
  const table = fakeTable(10);
  const { data } = await fetchAllRows<{ i: number }>(table.build);
  assert.equal(data.length, 10);
  assert.equal(table.ranges.length, 1);
});

Deno.test("fetchAllRows returns exactly the page cap in one page", async () => {
  const table = fakeTable(PAGE_SIZE);
  const { data } = await fetchAllRows<{ i: number }>(table.build);
  assert.equal(data.length, PAGE_SIZE);
  // A full first page forces a second (empty) page to confirm the end.
  assert.equal(table.ranges.length, 2);
  assert.equal(table.ranges[1][0], PAGE_SIZE);
});

Deno.test("fetchAllRows surfaces an error and keeps what it has", async () => {
  let call = 0;
  const build = () => ({
    range() {
      call++;
      if (call === 2) {
        return Promise.resolve({ data: null, error: { message: "boom" } });
      }
      return Promise.resolve({
        data: Array.from({ length: PAGE_SIZE }, (_, i) => ({ i })),
        error: null,
      });
    },
  });
  const { data, error } = await fetchAllRows<{ i: number }>(build);
  assert.equal(error, "boom");
  assert.equal(data.length, PAGE_SIZE);
});

Deno.test("fetchAllRows honours an explicit smaller page size", async () => {
  const table = fakeTable(25, 10);
  const { data } = await fetchAllRows<{ i: number }>(table.build, 10);
  assert.equal(data.length, 25);
  assert.deepEqual(table.ranges, [
    [0, 9],
    [10, 19],
    [20, 29],
  ]);
});
