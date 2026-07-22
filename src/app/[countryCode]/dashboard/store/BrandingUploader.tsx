// src/app/[countryCode]/dashboard/store/BrandingUploader.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import {
  Image,
  Upload,
  X,
  Loader2,
  CheckCircle,
  Smartphone,
} from "lucide-react";
import { uploadLogo } from "@/actions/reseller/store/uploadLogo";
// import { createServerClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/helpers";
import { createAdminClient } from "@/lib/supabase/admin";

interface BrandingUploaderProps {
  countryCode: string;
}

export function BrandingUploader({ countryCode }: BrandingUploaderProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
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
        .select("logo_url, notification_icon_url")
        .eq("auth_user_id", user.id)
        .single();

      if (appError) {
        setError(appError.message);
        setIsLoading(false);
        return;
      }

      if (application) {
        setLogoUrl(application.logo_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("File must be less than 2MB");
      return;
    }

    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const result = await uploadLogo(formData);

      if (result.success && result.data) {
        setLogoUrl(result.data.logo_url);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to upload logo");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!logoUrl) return;

    setIsDeleting(true);
    setError(null);

    try {
      // This would delete the logo from storage
      // For now, we'll just update the application
      const supabase = createAdminClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsDeleting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("global_reseller_applications")
        .update({
          logo_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_user_id", user.id);

      if (updateError) {
        setError(updateError.message);
        setIsDeleting(false);
        return;
      }

      setLogoUrl(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Store Branding
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Upload your store logo and branding assets
      </p>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Store Logo
          </label>
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
              error
                ? "border-red-300 dark:border-red-700"
                : "border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary",
            )}
          >
            {logoUrl ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <img
                    src={logoUrl}
                    alt="Store Logo"
                    className="h-32 w-32 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    onClick={handleRemove}
                    disabled={isDeleting}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click the X to remove your logo
                </p>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer"
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">
                  Click to upload your store logo
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  PNG, JPG, SVG • Max 2MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}
          </div>
          {isUploading && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </div>
          )}
        </div>

        {/* Notification Icon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notification Icon
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
            <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              Notification icon will be generated automatically
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Based on your store logo
            </p>
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
              Logo updated successfully!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
