// supabase/functions/global-scheduled-promotions/config.ts
//
// Scheduled promotional notifications for the global_* (multi-country,
// multi-tenant) model. Ported from the legacy
// reseller-scheduled-promotions/config.ts, which targeted the retired
// resellers / reseller_customers tables. The content is deliberately
// country-neutral ("buy data"), because one schedule fans out to every active
// store across NG / GH / KE / RW / UG.
//
// Times are UTC (the function runs on Deno, whose clock is UTC). The legacy
// config mixed UTC and Nigeria-local values; here every time is UTC.

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
  | { type: "time"; time: string } // "09:00" every day at 9am UTC
  | { type: "days"; days: string[]; time: string } // ["monday"] at 9am UTC
  | { type: "monthly"; day: number; time: string } // 1st of the month at 9am UTC
  | { type: "holiday"; date: string; time?: string } // "12-25" (MM-DD)
  | { type: "event"; eventName: string; date: string; time: string }; // "2026-11-27"

export const SCHEDULED_NOTIFICATIONS: ScheduledNotification[] = [
  // ── Daily ────────────────────────────────────────────────────────────────
  {
    id: "daily-afternoon",
    title: "⚡ Afternoon Deal!",
    message: "Get an extra data bonus on purchases today only.",
    notification_type: "promotional",
    metadata: { category: "bonus", discount: "20%", action: "buy_data" },
    schedule: { type: "time", time: "14:00" },
    enabled: true,
  },
  {
    id: "daily-evening",
    title: "🌙 Evening Special",
    message: "Stream before bed? Buy data now and save 10%.",
    notification_type: "promotional",
    metadata: { category: "discount", discount: "10%", action: "buy_data" },
    schedule: { type: "time", time: "19:30" },
    enabled: true,
  },

  // ── Weekly ───────────────────────────────────────────────────────────────
  {
    id: "monday-motivation",
    title: "💪 Monday Motivation!",
    message: "Start your week right. Buy data for unlimited access.",
    notification_type: "promotional",
    metadata: { category: "weekly", day: "Monday", action: "buy_data" },
    schedule: { type: "days", days: ["monday"], time: "08:00" },
    enabled: true,
  },
  {
    id: "wednesday-motivation",
    title: "💪 Wednesday Motivation!",
    message: "Midweek deals are live. Buy data for unlimited access.",
    notification_type: "promotional",
    metadata: { category: "weekly", day: "Wednesday", action: "buy_data" },
    schedule: { type: "days", days: ["wednesday"], time: "08:15" },
    enabled: true,
  },
  {
    id: "friday-vibes",
    title: "🎉 TGIF! Weekend Data Deal",
    message: "Weekend is here! Get data to stream, browse and connect all weekend.",
    notification_type: "promotional",
    metadata: { category: "weekly", day: "Friday", action: "buy_data" },
    schedule: { type: "days", days: ["friday"], time: "15:00" },
    enabled: true,
  },
  {
    id: "sunday-chill",
    title: "👼 Happy Sunday 👼",
    message: "It's chill time. Top up your data and relax.",
    notification_type: "promotional",
    metadata: { category: "weekly", day: "Sunday", action: "buy_data" },
    schedule: { type: "days", days: ["sunday"], time: "10:00" },
    enabled: true,
  },

  // ── Monthly ──────────────────────────────────────────────────────────────
  {
    id: "monthly-first",
    title: "🎉 New Month, New Deals!",
    message: "It's a fresh month! Get a 25% bonus on data purchases.",
    notification_type: "promotional",
    metadata: { category: "monthly", discount: "25%", action: "buy_data" },
    schedule: { type: "monthly", day: 1, time: "09:00" },
    enabled: true,
  },
  {
    id: "monthly-payday",
    title: "💸 Payday Rewards!",
    message: "Get a double data bonus on purchases today!",
    notification_type: "promotional",
    metadata: { category: "bonus", bonus: "2x", action: "buy_data" },
    schedule: { type: "monthly", day: 25, time: "18:00" },
    enabled: true,
  },

  // ── Holidays (MM-DD, repeat yearly) ──────────────────────────────────────
  {
    id: "christmas",
    title: "🎄 Merry Christmas!",
    message: "Celebrate with loved ones. Buy data to stay connected!",
    notification_type: "promotional",
    metadata: { holiday: "Christmas", action: "buy_data" },
    schedule: { type: "holiday", date: "12-25" },
    enabled: true,
  },
  {
    id: "new-year",
    title: "🎊 Happy New Year!",
    message: "Start the year connected! Get a 50% bonus on data purchases.",
    notification_type: "promotional",
    metadata: { holiday: "New Year", discount: "50%", action: "buy_data" },
    schedule: { type: "holiday", date: "01-01" },
    enabled: true,
  },
  {
    id: "valentine",
    title: "💕 Happy Valentine's Day!",
    message: "Share the love. Buy data to stay in touch!",
    notification_type: "promotional",
    metadata: { holiday: "Valentine's Day", action: "buy_data" },
    schedule: { type: "holiday", date: "02-14" },
    enabled: true,
  },

  // ── One-off events ───────────────────────────────────────────────────────
  {
    id: "black-friday",
    title: "🔥 BLACK FRIDAY SALE!",
    message: "70% OFF on all data bundles! Limited time only!",
    notification_type: "promotional",
    metadata: { event: "Black Friday", discount: "70%", action: "buy_data" },
    schedule: { type: "event", eventName: "Black Friday", date: "2026-11-27", time: "00:00" },
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

/**
 * Whether a schedule is due at `currentDate`. The cron runs every 5 minutes, so
 * the exact minute and the 5-minute-rounded minute are both accepted (a run at
 * 19:32 still matches a 19:30 rule); the caller dedupes by scheduled_id + day
 * so a window that spans two runs cannot send twice.
 */
export function shouldSendNow(
  notification: ScheduledNotification,
  currentDate: Date = new Date(),
): boolean {
  if (!notification.enabled) return false;

  const hours = String(currentDate.getUTCHours()).padStart(2, "0");
  const minutes = String(currentDate.getUTCMinutes()).padStart(2, "0");
  const currentTime = `${hours}:${minutes}`;
  const roundedMinutes = String(Math.floor(currentDate.getUTCMinutes() / 5) * 5).padStart(2, "0");
  const roundedTime = `${hours}:${roundedMinutes}`;
  const atTime = (t: string) => currentTime === t || roundedTime === t;

  const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(currentDate.getUTCDate()).padStart(2, "0");
  const monthDay = `${month}-${dayOfMonth}`;
  const schedule = notification.schedule;

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
