// supabase/functions/global-scheduled-promotions/config.ts
//
// Scheduled promotional notifications for the global_* (multi-country,
// multi-tenant) model. The legacy reseller-scheduled-promotions promoted movie
// releases (Omotala Jalade / "Village Girl"); that content is deliberately not
// carried over. The promotion here is data bundles + airtime, sent once a day
// in the evening.
//
// "Evening" is local, not UTC: the supported markets span UTC+0 (Ghana, Ivory
// Coast, Senegal ...) to UTC+3 (Kenya, Uganda), so a single UTC send time cannot
// be 19:00-21:00 for everyone. Each store is evaluated against its own country's
// offset, so every recipient gets the promo at their own local evening.

export interface ScheduledNotification {
  id: string;
  title: string;
  message: string;
  notification_type: "promotional" | "app_update" | "hot_data" | "special_data";
  metadata?: Record<string, any>;
  schedule: ScheduleType;
  enabled: boolean;
}

export type ScheduleType =
  | { type: "dailyLocalWindow"; start: string; end: string } // ["19:00","21:00") local time, daily
  | { type: "time"; time: string } // "09:00" every day at 9am UTC
  | { type: "days"; days: string[]; time: string } // ["monday"] at 9am UTC
  | { type: "monthly"; day: number; time: string } // 1st of the month at 9am UTC
  | { type: "holiday"; date: string; time?: string } // "12-25" (MM-DD)
  | { type: "event"; eventName: string; date: string; time: string }; // "2026-11-27"

/**
 * Whole-hour UTC offsets for every country in SUPPORTED_COUNTRIES. None of
 * these zones observe daylight saving, so a fixed offset is exact.
 */
export const COUNTRY_UTC_OFFSETS: Record<string, number> = {
  ng: 1,
  gh: 0,
  ke: 3,
  za: 2,
  cm: 1,
  cf: 1,
  td: 1,
  cg: 1,
  gq: 1,
  ga: 1,
  ci: 0,
  sn: 0,
  bf: 0,
  bj: 1,
  tg: 0,
  ne: 1,
  ml: 0,
  gn: 0,
  rw: 2,
  ug: 3,
};

export const DEFAULT_UTC_OFFSET = 0;

export function countryUtcOffset(countryCode?: string | null): number {
  if (!countryCode) return DEFAULT_UTC_OFFSET;
  return COUNTRY_UTC_OFFSETS[countryCode.toLowerCase()] ?? DEFAULT_UTC_OFFSET;
}

/** The calendar date at `now` in a zone `utcOffsetHours` ahead of UTC. */
export function localDateString(now: Date, utcOffsetHours: number): string {
  return new Date(now.getTime() + utcOffsetHours * 3_600_000)
    .toISOString()
    .slice(0, 10);
}

export const SCHEDULED_NOTIFICATIONS: ScheduledNotification[] = [
  {
    id: "daily-evening-deals",
    title: "🌙 Evening Deals Are Live!",
    message:
      "Data bundles and airtime at their best prices — top up now and stay connected tonight.",
    notification_type: "promotional",
    metadata: {
      category: "evening_deals",
      actions: ["buy_data", "buy_airtime"],
    },
    schedule: { type: "dailyLocalWindow", start: "19:00", end: "21:00" },
    enabled: true,
  },
];

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function minutesOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Whether a schedule is due for a recipient whose zone is `utcOffsetHours`
 * ahead of UTC. The cron runs every 5 minutes, so the exact minute and the
 * 5-minute-rounded minute are both accepted (a run at 19:32 still matches a
 * 19:30 rule); the caller dedupes by scheduled_id + local date + country so a
 * window that spans several runs cannot send twice.
 */
export function shouldSendNow(
  notification: ScheduledNotification,
  currentDate: Date = new Date(),
  utcOffsetHours: number = 0,
): boolean {
  if (!notification.enabled) return false;

  const schedule = notification.schedule;

  // The evening window is the one offset-aware rule: it is expressed in the
  // recipient's local time, so the offset is applied before matching.
  if (schedule.type === "dailyLocalWindow") {
    const local = new Date(currentDate.getTime() + utcOffsetHours * 3_600_000);
    const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
    return mins >= minutesOfDay(schedule.start) && mins < minutesOfDay(schedule.end);
  }

  const hours = String(currentDate.getUTCHours()).padStart(2, "0");
  const minutes = String(currentDate.getUTCMinutes()).padStart(2, "0");
  const currentTime = `${hours}:${minutes}`;
  const roundedMinutes = String(Math.floor(currentDate.getUTCMinutes() / 5) * 5).padStart(2, "0");
  const roundedTime = `${hours}:${roundedMinutes}`;
  const atTime = (t: string) => currentTime === t || roundedTime === t;

  const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(currentDate.getUTCDate()).padStart(2, "0");
  const monthDay = `${month}-${dayOfMonth}`;

  switch (schedule.type) {
    case "time":
      return atTime(schedule.time);
    case "days":
      return (
        schedule.days.includes(DAY_NAMES[currentDate.getUTCDay()]) &&
        atTime(schedule.time)
      );
    case "monthly":
      return currentDate.getUTCDate() === schedule.day && atTime(schedule.time);
    case "holiday":
      return monthDay === schedule.date && (!schedule.time || atTime(schedule.time));
    case "event":
      return (
        schedule.date === `${currentDate.getUTCFullYear()}-${month}-${dayOfMonth}` &&
        atTime(schedule.time)
      );
    default:
      return false;
  }
}
