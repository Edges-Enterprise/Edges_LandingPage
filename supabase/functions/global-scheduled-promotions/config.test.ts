// Run with: deno test --no-check supabase/functions/global-scheduled-promotions/config.test.ts
//
// The schedule matcher is the whole behaviour of the promotions job: the cron
// runs every 5 minutes and asks "is anything due now?". A bug here either sends
// a promotion on the wrong day or never sends it, and the legacy function
// shipped with exactly that class of bug (its weekly cron could never match a
// time/day rule). These cases pin every schedule type against fixed UTC dates.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { SCHEDULED_NOTIFICATIONS, shouldSendNow } from "./config.ts";

function due(id: string, iso: string): boolean {
  const n = SCHEDULED_NOTIFICATIONS.find((x) => x.id === id);
  assert(n, `unknown scheduled notification: ${id}`);
  return shouldSendNow(n!, new Date(iso));
}

Deno.test("time schedule fires at the exact and the 5-minute-rounded minute", () => {
  assertEquals(due("daily-afternoon", "2026-11-11T14:00:00Z"), true);
  assertEquals(due("daily-afternoon", "2026-11-11T14:02:00Z"), true);
  assertEquals(due("daily-afternoon", "2026-11-11T14:07:00Z"), false);
});

Deno.test("days schedule fires only on its weekday", () => {
  assertEquals(due("monday-motivation", "2026-11-09T08:00:00Z"), true); // Monday
  assertEquals(due("monday-motivation", "2026-11-10T08:00:00Z"), false); // Tuesday
  assertEquals(due("friday-vibes", "2026-11-13T15:00:00Z"), true); // Friday
  assertEquals(due("friday-vibes", "2026-11-12T15:00:00Z"), false); // Thursday
});

Deno.test("monthly schedule fires on its day of month", () => {
  assertEquals(due("monthly-first", "2026-12-01T09:00:00Z"), true);
  assertEquals(due("monthly-first", "2026-12-02T09:00:00Z"), false);
  assertEquals(due("monthly-payday", "2026-11-25T18:00:00Z"), true);
});

Deno.test("holiday schedule fires on MM-DD every year", () => {
  assertEquals(due("christmas", "2026-12-25T12:00:00Z"), true);
  assertEquals(due("christmas", "2027-12-25T12:00:00Z"), true);
  assertEquals(due("christmas", "2026-12-24T12:00:00Z"), false);
});

Deno.test("event schedule fires on its exact date only", () => {
  assertEquals(due("black-friday", "2026-11-27T00:00:00Z"), true);
  assertEquals(due("black-friday", "2025-11-27T00:00:00Z"), false);
  assertEquals(due("black-friday", "2026-11-28T00:00:00Z"), false);
});

Deno.test("a disabled schedule never fires", () => {
  const disabled = { ...SCHEDULED_NOTIFICATIONS[0], enabled: false };
  assertEquals(shouldSendNow(disabled, new Date("2026-11-11T14:00:00Z")), false);
});

Deno.test("every enabled schedule carries a title and a message", () => {
  for (const n of SCHEDULED_NOTIFICATIONS) {
    assert(n.title.length > 0, `${n.id} has no title`);
    assert(n.message.length > 0, `${n.id} has no message`);
  }
});

Deno.test("no legacy movie tie-in content is carried over", () => {
  const blob = JSON.stringify(SCHEDULED_NOTIFICATIONS).toLowerCase();
  for (const needle of ["omotola", "omotala", "jalade", "village girl"]) {
    assert(!blob.includes(needle), `legacy content leaked: ${needle}`);
  }
});
