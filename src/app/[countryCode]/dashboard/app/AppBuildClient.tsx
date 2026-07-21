// src/app/[countryCode]/dashboard/app/AppBuildClient.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getBuildStatus, BuildStatus } from "@/actions/reseller/build";
import { triggerAppBuild } from "@/actions/reseller/build/triggerAppBuild";
import { cn } from "@/lib/utils";

interface AppBuildClientProps {
  countryCode: string;
}

export function AppBuildClient({ countryCode }: AppBuildClientProps) {
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Fetch build status
  const fetchBuildStatus = async () => {
    try {
      const result = await getBuildStatus();

      if (result.success) {
        setBuildStatus(result.data || null);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch build status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchBuildStatus();

    // Cleanup polling on unmount
    return () => {
      if (polling) {
        clearInterval(polling);
      }
    };
  }, []);

  // Start polling when build is in progress
  useEffect(() => {
    if (buildStatus?.is_building || buildStatus?.is_queued) {
      if (!polling) {
        const interval = setInterval(() => {
          fetchBuildStatus();
        }, 5000); // Poll every 5 seconds

        setPolling(interval);
      }
    } else {
      if (polling) {
        clearInterval(polling);
        setPolling(null);
      }
    }

    return () => {
      if (polling) {
        clearInterval(polling);
      }
    };
  }, [buildStatus?.is_building, buildStatus?.is_queued]);

  // Handle manual trigger
  const handleTriggerBuild = async () => {
    setIsTriggering(true);
    setError(null);

    try {
      // This would need the application ID - you'd get it from context or props
      const result = await triggerAppBuild({
        applicationId: "", // TODO: Get from context
        buildId: "", // TODO: Get from context
        storeName: "", // TODO: Get from context
        storeSlug: "", // TODO: Get from context
        brandColor: "", // TODO: Get from context
        logoUrl: null,
        notificationIconUrl: null,
        countryCode: countryCode,
      });

      if (result.success) {
        // Refetch status after trigger
        await fetchBuildStatus();
      } else {
        setError(result.error || "Failed to trigger build");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsTriggering(false);
    }
  };

  // Handle retry
  const handleRetry = async () => {
    await fetchBuildStatus();
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Loading build status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            App Build Status
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track your branded Android app build progress
          </p>
        </div>
        <button
          onClick={handleRetry}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <RefreshCw size={20} className={cn(isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {error}
            </p>
            <button
              onClick={handleRetry}
              className="mt-1 text-sm text-red-600 dark:text-red-300 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* No Build State */}
      {!buildStatus && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
          <Smartphone className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            No Build Started
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            You haven't started building your branded Android app yet. Click the
            button below to get started.
          </p>
          <button
            onClick={handleTriggerBuild}
            disabled={isTriggering}
            className={cn(
              "mt-6 px-6 py-3 rounded-lg font-medium text-white transition-all",
              "bg-primary hover:bg-primary/80",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center gap-2 mx-auto",
            )}
          >
            {isTriggering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting Build...
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4" />
                Start Build
              </>
            )}
          </button>
        </div>
      )}

      {/* Build Status Card */}
      {buildStatus && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Status Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  buildStatus.is_building &&
                    "bg-yellow-100 dark:bg-yellow-900/30",
                  buildStatus.is_completed &&
                    "bg-green-100 dark:bg-green-900/30",
                  buildStatus.is_failed && "bg-red-100 dark:bg-red-900/30",
                  buildStatus.is_queued && "bg-blue-100 dark:bg-blue-900/30",
                  buildStatus.is_pending &&
                    "bg-orange-100 dark:bg-orange-900/30",
                )}
              >
                {buildStatus.is_building && (
                  <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                )}
                {buildStatus.is_completed && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {buildStatus.is_failed && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                {buildStatus.is_queued && (
                  <Clock className="h-5 w-5 text-blue-600" />
                )}
                {buildStatus.is_pending && (
                  <Clock className="h-5 w-5 text-orange-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Build Status
                </h3>
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                    buildStatus.is_building &&
                      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                    buildStatus.is_completed &&
                      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                    buildStatus.is_failed &&
                      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                    buildStatus.is_queued &&
                      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                    buildStatus.is_pending &&
                      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
                  )}
                >
                  {buildStatus.status_label}
                </span>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
              {buildStatus.queued_at && (
                <div>Queued: {formatDate(buildStatus.queued_at)}</div>
              )}
              {buildStatus.duration_seconds && (
                <div>
                  Duration: {formatDuration(buildStatus.duration_seconds)}
                </div>
              )}
            </div>
          </div>

          {/* Status Content */}
          <div className="p-6 space-y-4">
            {/* Progress Indicator */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Progress
                </span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {getProgress(buildStatus.build_status)}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    buildStatus.is_completed && "bg-green-500",
                    buildStatus.is_failed && "bg-red-500",
                    buildStatus.is_building && "bg-yellow-500 animate-pulse",
                    buildStatus.is_queued && "bg-blue-500",
                    buildStatus.is_pending && "bg-orange-500",
                  )}
                  style={{ width: `${getProgress(buildStatus.build_status)}%` }}
                />
              </div>
            </div>

            {/* Status Timeline */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Timeline
              </h4>
              <div className="space-y-2">
                <StatusTimelineItem
                  label="Queued"
                  time={buildStatus.queued_at}
                  isComplete={!!buildStatus.queued_at}
                  isActive={buildStatus.is_queued || buildStatus.is_building}
                />
                <StatusTimelineItem
                  label="Building"
                  time={buildStatus.building_at}
                  isComplete={!!buildStatus.building_at}
                  isActive={buildStatus.is_building}
                />
                <StatusTimelineItem
                  label="Completed"
                  time={buildStatus.completed_at}
                  isComplete={!!buildStatus.completed_at}
                  isActive={buildStatus.is_completed}
                />
              </div>
            </div>

            {/* Error Message */}
            {buildStatus.error_message && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <span className="font-medium">Error:</span>{" "}
                  {buildStatus.error_message}
                </p>
              </div>
            )}

            {/* Download Button */}
            {buildStatus.apk_url && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <a
                  href={buildStatus.apk_url}
                  download
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download APK
                </a>
                {buildStatus.aab_url && (
                  <a
                    href={buildStatus.aab_url}
                    download
                    className="inline-flex items-center gap-2 px-6 py-3 ml-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download AAB
                  </a>
                )}
              </div>
            )}

            {/* Retry Button on Failure */}
            {buildStatus.is_failed && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleTriggerBuild}
                  disabled={isTriggering}
                  className={cn(
                    "inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors",
                    "bg-red-600 hover:bg-red-700 text-white",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  {isTriggering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Retry Build
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Timeline Item Component
function StatusTimelineItem({
  label,
  time,
  isComplete,
  isActive,
}: {
  label: string;
  time: string | null;
  isComplete: boolean;
  isActive: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "h-3 w-3 rounded-full flex-shrink-0",
          isComplete && "bg-green-500",
          isActive && !isComplete && "bg-yellow-500 animate-pulse",
          !isComplete && !isActive && "bg-gray-300 dark:bg-gray-600",
        )}
      />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      {time && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(time)}
        </span>
      )}
    </div>
  );
}

// Helper Functions
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function getProgress(status: string): number {
  switch (status) {
    case "queued":
      return 10;
    case "building":
      return 50;
    case "completed":
      return 100;
    case "failed":
      return 80;
    case "pending":
      return 5;
    default:
      return 0;
  }
}
