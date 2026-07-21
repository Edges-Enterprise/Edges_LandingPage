// src/components/reseller/dashboard/ActivityFeed.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  ShoppingBag,
  UserPlus,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import {
  getRecentActivity,
  RecentActivityItem,
} from "@/actions/reseller/dashboard";
import { cn } from "@/lib/utils/helpers";

interface ActivityFeedProps {
  className?: string;
  limit?: number;
}

export function ActivityFeed({ className, limit = 10 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      const result = await getRecentActivity(limit);

      if (result.success && result.data) {
        setActivities(result.data);
      } else {
        setError(result.error || "Failed to load activity");
      }

      setIsLoading(false);
    }

    fetchData();
  }, [limit]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700",
          className,
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="mt-1 h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700",
          className,
        )}
      >
        <div className="flex items-center justify-center h-40 text-red-500">
          <div className="text-center">
            <p className="text-sm font-medium">⚠️ {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700",
          className,
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-400">
          <Clock size={32} className="mb-2 opacity-50" />
          <p className="text-sm">No recent activity</p>
          <p className="text-xs">Your activity will appear here</p>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order":
        return <ShoppingBag size={18} className="text-blue-500" />;
      case "customer":
        return <UserPlus size={18} className="text-green-500" />;
      case "build":
        return <Smartphone size={18} className="text-purple-500" />;
      case "transaction":
        return <TrendingUp size={18} className="text-yellow-500" />;
      default:
        return <Clock size={18} className="text-gray-500" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "order":
        return "bg-blue-100 dark:bg-blue-900/30";
      case "customer":
        return "bg-green-100 dark:bg-green-900/30";
      case "build":
        return "bg-purple-100 dark:bg-purple-900/30";
      case "transaction":
        return "bg-yellow-100 dark:bg-yellow-900/30";
      default:
        return "bg-gray-100 dark:bg-gray-700";
    }
  };

  const getActivityMessage = (activity: RecentActivityItem): string => {
    switch (activity.type) {
      case "order":
        return `New order #${activity.entity_id.slice(0, 8)}`;
      case "customer":
        return `New customer joined`;
      case "build":
        return `App build ${activity.data?.status || "started"}`;
      case "transaction":
        return `Transaction of $${activity.data?.amount || 0}`;
      default:
        return "Activity occurred";
    }
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {activities.length} items
        </span>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.entity_id}
            className="flex items-start gap-4 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                getActivityColor(activity.type),
              )}
            >
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {getActivityMessage(activity)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimeAgo(activity.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
