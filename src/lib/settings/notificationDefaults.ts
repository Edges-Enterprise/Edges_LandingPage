// src/lib/settings/notificationDefaults.ts
//
// The notification matrix shared by the dashboard tab, its server action and
// the settings page read. It lives outside the "use server" action module
// because such a file may only export async functions.

export interface NotificationPrefs {
  sales: boolean;
  orders: boolean;
  customers: boolean;
  marketing: boolean;
  system: boolean;
}

export interface NotificationSettings {
  email_notifications: NotificationPrefs;
  push_notifications: NotificationPrefs;
  sms_notifications: NotificationPrefs;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_notifications: {
    sales: true,
    orders: true,
    customers: true,
    marketing: false,
    system: true,
  },
  push_notifications: {
    sales: true,
    orders: true,
    customers: true,
    marketing: false,
    system: true,
  },
  sms_notifications: {
    sales: false,
    orders: false,
    customers: false,
    marketing: false,
    system: true,
  },
};
