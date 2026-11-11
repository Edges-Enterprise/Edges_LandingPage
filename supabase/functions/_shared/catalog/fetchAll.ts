// supabase/functions/_shared/catalog/fetchAll.ts
//
// Page through a PostgREST read that can exceed the server's row cap.
//
// PostgREST returns at most `db-max-rows` rows per request (1000 on this
// project) regardless of the Range requested: asking for 0-4999 still returns
// 0-999. A read that needs the whole catalog therefore has to loop, and a
// silent truncation is the failure mode this guards against - the dashboard's
// global plan list showed 1,000 of 10,885 plans, and bulk "apply to all" only
// ever touched the first 1,000.
//
// `build` returns a fresh query builder WITHOUT a range applied; the helper
// applies `.range(from, to)` per page. It stops when a page returns fewer rows
// than requested, and refuses to loop forever.

/** PostgREST's per-request row cap on this project. */
export const PAGE_SIZE = 1000;

/** Hard stop so a misbehaving server cannot spin the loop. */
const MAX_PAGES = 200;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

interface RangeableQuery<T> {
  range(from: number, to: number): PromiseLike<PageResult<T>>;
}

export async function fetchAllRows<T>(
  build: () => RangeableQuery<T>,
  pageSize: number = PAGE_SIZE,
): Promise<{ data: T[]; error: string | null }> {
  const size = pageSize > 0 ? pageSize : PAGE_SIZE;
  const all: T[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * size;
    const { data, error } = await build().range(from, from + size - 1);

    if (error) return { data: all, error: error.message };

    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < size) break;
  }

  return { data: all, error: null };
}
