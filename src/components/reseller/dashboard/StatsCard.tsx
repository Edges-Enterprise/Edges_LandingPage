// src/components/reseller/dashboard/StatsCard.tsx
"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils/helpers";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  subtitle?: string;
  className?: string;
  isLoading?: boolean;
}

export function StatsCard({
  title,
  value,
  icon,
  change,
  subtitle,
  className,
  isLoading = false,
}: StatsCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700",
          "animate-pulse",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
        <div className="mt-3 h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="mt-2 h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700",
        "transition-all duration-200 hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-gray-900/50",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </span>
        <div className="h-10 w-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === "number" && value < 0
            ? `-$${Math.abs(value).toLocaleString()}`
            : typeof value === "number"
              ? `$${value.toLocaleString()}`
              : value}
        </span>

        {change && (
          <span
            className={cn(
              "ml-2 inline-flex items-center text-xs font-medium",
              change.type === "increase"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {change.type === "increase" ? "↑" : "↓"} {Math.abs(change.value)}%
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
