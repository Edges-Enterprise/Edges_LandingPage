// src/lib/notifications/types.ts
//
// The notification shape both inboxes render. The two tables
// (global_notifications for the store owner, global_customer_notifications
// for a customer) are column-for-column identical, so one type covers both.

export interface StoreNotification {
  id: string;
  notification_type: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
}

export type NotificationAudience = "reseller" | "customer";
