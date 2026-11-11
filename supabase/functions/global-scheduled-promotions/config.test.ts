// Run with: deno test --no-check supabase/functions/global-scheduled-promotions/config.test.ts
//
// The schedule matcher is the whole behaviour of the promotions job: the cron
// runs every 5 minutes and asks "is anything due now?". A bug here either sends
// a promotion at the wrong time or never sends it, and the legacy function
// shipped with exactly that class of bug (its weekly cron could never match a
// time/day rule). These cases pin the daily evening window against fixed UTC
// instants for several country offsets.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  SCHEDULED_NOTIFICATIONS,
  countryUtcOffset,
  localDateString,
  shouldSendNow,
} from "./config.ts";

const evening = SCHEDULED_NOTIFICATIONS.find((n) => n.id === "daily-evening-deals")!;

Deno.test("the evening window fires at the start and inside, not before or after", () => {
  // UTC+1 (Nigeria): 19:00 local == 18:00 UTC.
  assertEquals(shouldSendNow(evening, new Date("2026-11-11T18:00:00Z"), 1), true); // 19:00
  assertEquals(shouldSendNow(evening, new Date("2026-11-11T18:30:00Z"), 1), true); // 19:30
  assertEquals(shouldSendNow(evening, new Date("2026-11-11T19:55:00Z"), 1), true); // 20:55
  assertEquals(shouldSendNow(evening, new Date("2026-11-11T17:55:00Z"), 1), false); // 18:55
  assertEquals(shouldSendNow(evening, new Date("2026-11-11T20:00:00Z"), 1), false); // 21:00 (end exclusive)
});

Deno.test("each country fires in its own local evening, not at one UTC time", () => {
  const at19utc = new Date("2026-11-11T19:00:00Z");
  // 19:00 UTC is evening only in the UTC+0 markets.
  assertEquals(shouldSendNow(evening, at19utc, countryUtcOffset("gh")), true); // 19:00 local
  assertEquals(shouldSendNow(evening, at19utc, countryUtcOffset("ci")), true); // 19:00 local
  // For UTC+1/+2/+3 it is 20:00/21:00/22:00 local, so not (or no longer) evening.
  assertEquals(shouldSendNow(evening, at19utc, countryUtcOffset("ng")), true); // 20:00 local
  assertEquals(shouldSendNow(evening, at19utc, countryUtcOffset("rw")), false); // 21:00 local
  assertEquals(shouldSendNow(evening, at19utc, countryUtcOffset("ke")), false); // 22:00 local
});

Deno.test("Kenya's evening lands three hours before Ghana's, in UTC", () => {
  // Kenya (UTC+3) 19:00 local == 16:00 UTC.
  assertEquals(shouldSendNow(evening, new Date("2026-11-11T16:00:00Z"), 3), true);
  // Ghana (UTC+0) is not yet at 19:00 then.
  assertEquals(shouldSendNow(evening, new Date("2026-11-11T16:00:00Z"), 0), false);
});

Deno.test("the offset table covers every supported country with a whole-hour offset", () => {
  const supported = [
    "ng", "gh", "ke", "za", "cm", "cf", "td", "cg", "gq", "ga",
    "ci", "sn", "bf", "bj", "tg", "ne", "ml", "gn", "rw", "ug",
  ];
  for (const code of supported) {
    const offset = countryUtcOffset(code);
    assert(Number.isInteger(offset), `${code} offset is not a whole hour`);
    assert(offset >= 0 && offset <= 3, `${code} offset out of range: ${offset}`);
  }
  assertEquals(countryUtcOffset("ZZ"), 0); // unknown falls back to UTC
});

Deno.test("a disabled schedule never fires", () => {
  const disabled = { ...evening, enabled: false };
  assertEquals(shouldSendNow(disabled, new Date("2026-11-11T18:30:00Z"), 1), false);
});

Deno.test("localDateString rolls the date over at the recipient's local midnight", () => {
  // 23:30 UTC on the 11th is already the 12th in a UTC+1 zone.
  assertEquals(localDateString(new Date("2026-11-11T23:30:00Z"), 1), "2026-11-12");
  assertEquals(localDateString(new Date("2026-11-11T23:30:00Z"), 0), "2026-11-11");
});

Deno.test("the promotion advertises data bundles and airtime", () => {
  const blob = JSON.stringify(SCHEDULED_NOTIFICATIONS).toLowerCase();
  assert(blob.includes("data"), "no data offer mentioned");
  assert(blob.includes("airtime"), "no airtime offer mentioned");
  for (const n of SCHEDULED_NOTIFICATIONS) {
    assert(n.title.length > 0, `${n.id} has no title`);
    assert(n.message.length > 0, `${n.id} has no message`);
  }
});

Deno.test("only one promotional notification is scheduled, so it sends once a day", () => {
  assertEquals(SCHEDULED_NOTIFICATIONS.filter((n) => n.enabled).length, 1);
});

Deno.test("no legacy movie tie-in content is carried over", () => {
  const blob = JSON.stringify(SCHEDULED_NOTIFICATIONS).toLowerCase();
  for (const needle of ["omotola", "omotala", "jalade", "village girl", "movie", "movies"]) {
    assert(!blob.includes(needle), `legacy content leaked: ${needle}`);
  }
});
