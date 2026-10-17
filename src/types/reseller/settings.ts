// src/types/reseller/settings.ts

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country_code: string;
  store_name: string;
  store_slug: string;
  brand_color: string;
  logo_url?: string;
  notification_icon_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SecuritySettings {
  two_factor_enabled: boolean;
  last_password_change?: string;
  sessions: Session[];
}

export interface Session {
  id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  location?: string;
  last_active: string;
  is_current: boolean;
}

export interface NotificationSettings {
  email_notifications: {
    sales: boolean;
    orders: boolean;
    customers: boolean;
    marketing: boolean;
    system: boolean;
  };
  push_notifications: {
    sales: boolean;
    orders: boolean;
    customers: boolean;
    marketing: boolean;
    system: boolean;
  };
  sms_notifications: {
    sales: boolean;
    orders: boolean;
    customers: boolean;
    marketing: boolean;
    system: boolean;
  };
}

export interface SettingsData {
  application: {
    id: string;
    brand_color: string;
    store_name: string;
    store_slug: string;
    country_code: string;
  };
  profile: Profile;
  security: SecuritySettings;
  notifications: NotificationSettings;
}
