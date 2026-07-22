// src/app/[countryCode]/dashboard/pending/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle, Mail, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PendingPageProps {
  params: {
    countryCode: string;
  };
}

export default function PendingPage({ params }: PendingPageProps) {
  const { countryCode } = params;
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchApplication() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push(`/${countryCode}/apply`);
          return;
        }

        const { data: app, error } = await supabase
          .from("global_reseller_applications")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();

        if (error || !app) {
          router.push(`/${countryCode}/apply`);
          return;
        }

        setApplication(app);

        if (app.application_status === "active") {
          router.push(`/${countryCode}/dashboard`);
          return;
        }

        // ✅ If approved, redirect to dashboard
        if (app.application_status === "approved") {
          router.push(`/${countryCode}/dashboard`);
        }

        // ✅ If rejected, redirect to rejected page
        if (app.application_status === "rejected") {
          router.push(`/${countryCode}/dashboard/rejected`);
        }
      } catch (error) {
        console.error("Error fetching application:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchApplication();
  }, [countryCode, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        {/* Icon */}
        <div className="h-20 w-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Application Under Review
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Thank you for applying! Your application is currently being reviewed
          by our team.
        </p>

        {/* Application Details */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 text-left space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Application ID
            </span>
            <span className="text-sm font-mono text-gray-900 dark:text-white">
              {application?.id?.slice(0, 12)}...
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Store Name
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {application?.store_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Email
            </span>
            <span className="text-sm text-gray-900 dark:text-white">
              {application?.email}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Status
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              Pending Review
            </span>
          </div>
        </div>

        {/* What happens next */}
        <div className="space-y-4 text-left">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            What happens next?
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Review Process
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Our team will review your application within 24-48 hours.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Email Notification
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You'll receive an email once your application is approved or
                  if we need more information.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Need help? Contact our support team.
          </p>
          <button
            onClick={() => (window.location.href = `/${countryCode}/support`)}
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/80 transition-colors"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
