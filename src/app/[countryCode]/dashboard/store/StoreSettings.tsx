// src/app/[countryCode]/dashboard/store/StoreSettings.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Store,
  Mail,
  Phone,
  MapPin,
//   Facebook,
//   Twitter,
//   Instagram,
  MessageCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { updateStoreSettings } from "@/actions/reseller/store/updateStoreSettings";

import { cn } from "@/lib/utils/helpers";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface StoreSettingsProps {
  countryCode: string;
}

export function StoreSettings({ countryCode }: StoreSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    store_name: "",
    store_description: "",
    welcome_message: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    social_links: {
      facebook: "",
      twitter: "",
      instagram: "",
      whatsapp: "",
    },
  });

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createAdminClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: application, error: appError } = await supabase
        .from("global_reseller_applications")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (appError) {
        setError(appError.message);
        setIsLoading(false);
        return;
      }

      if (application) {
        setFormData({
          store_name: application.store_name || "",
          store_description: application.store_description || "",
          welcome_message: application.welcome_message || "",
          contact_email: application.contact_email || "",
          contact_phone: application.contact_phone || "",
          address: application.address || "",
          social_links: application.social_links || {
            facebook: "",
            twitter: "",
            instagram: "",
            whatsapp: "",
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("social_")) {
      const platform = name.replace("social_", "");
      setFormData({
        ...formData,
        social_links: {
          ...formData.social_links,
          [platform]: value,
        },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateStoreSettings({
        store_name: formData.store_name,
        store_description: formData.store_description,
        welcome_message: formData.welcome_message,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        address: formData.address,
        social_links: formData.social_links,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to update store settings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Store Settings
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Configure your store's basic information and contact details
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Store Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Store Name
          </label>
          <div className="relative">
            <Store
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              name="store_name"
              value={formData.store_name}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
              required
            />
          </div>
        </div>

        {/* Store Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Store Description
          </label>
          <textarea
            name="store_description"
            value={formData.store_description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
            placeholder="Describe your store..."
          />
        </div>

        {/* Welcome Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Welcome Message
          </label>
          <textarea
            name="welcome_message"
            value={formData.welcome_message}
            onChange={handleChange}
            rows={2}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
            placeholder="Welcome to our store..."
          />
        </div>

        {/* Contact Email & Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contact Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contact Phone
            </label>
            <div className="relative">
              <Phone
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Store Address
          </label>
          <div className="relative">
            <MapPin
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Social Links
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              {/* <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                <Facebook className="inline h-4 w-4 mr-1" /> Facebook
              </label> */}
              <input
                type="url"
                name="social_facebook"
                value={formData.social_links.facebook}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                placeholder="https://facebook.com/your-store"
              />
            </div>
            <div>
              {/* <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                <Twitter className="inline h-4 w-4 mr-1" /> Twitter
              </label> */}
              <input
                type="url"
                name="social_twitter"
                value={formData.social_links.twitter}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                placeholder="https://twitter.com/your-store"
              />
            </div>
            <div>
              {/* <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                <Instagram className="inline h-4 w-4 mr-1" /> Instagram
              </label> */}
              <input
                type="url"
                name="social_instagram"
                value={formData.social_links.instagram}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                placeholder="https://instagram.com/your-store"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                <MessageCircle className="inline h-4 w-4 mr-1" /> WhatsApp
              </label>
              <input
                type="url"
                name="social_whatsapp"
                value={formData.social_links.whatsapp}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                placeholder="https://wa.me/123456789"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-600 dark:text-green-400">
              Store settings updated successfully!
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className={cn(
            "px-6 py-2.5 bg-primary text-white rounded-lg font-medium transition-all",
            "hover:bg-primary/80",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center gap-2",
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </form>
    </div>
  );
}
