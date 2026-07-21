// src/app/[countryCode]/dashboard/DashboardClient.tsx
"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  Wallet,
  Smartphone,
} from "lucide-react";
import {
  StatsCard,
  RevenueChart,
  ActivityFeed,
  QuickActions,
} from "@/components/reseller/dashboard";
import {
  getDashboardStats,
  DashboardStats,
} from "@/actions/reseller/dashboard";
import { getBuildStatus, BuildStatus } from "@/actions/reseller/build";
import { cn } from "@/lib/utils/helpers";

interface DashboardClientProps {
  countryCode: string;
}

export function DashboardClient({ countryCode }: DashboardClientProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const [statsResult, buildResult] = await Promise.all([
          getDashboardStats(),
          getBuildStatus(),
        ]);

        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        } else {
          setError(statsResult.error || "Failed to load dashboard data");
        }

        if (buildResult.success) {
          setBuildStatus(buildResult.data || null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-medium text-red-500">⚠️ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Welcome back! Here's what's happening with your business.
          </p>
        </div>
        {buildStatus && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
            <div
              className={cn(
                "h-2 w-2 rounded-full animate-pulse",
                buildStatus.is_building && "bg-yellow-500",
                buildStatus.is_completed && "bg-green-500",
                buildStatus.is_failed && "bg-red-500",
                buildStatus.is_queued && "bg-blue-500",
              )}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Build: {buildStatus.status_label}
            </span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Revenue"
          value={stats?.total_revenue || 0}
          icon={<DollarSign size={20} />}
          change={{ value: 12, type: "increase" }}
          subtitle="This month"
          isLoading={isLoading}
        />
        <StatsCard
          title="Profit"
          value={stats?.total_profit || 0}
          icon={<TrendingUp size={20} />}
          change={{ value: 8, type: "increase" }}
          subtitle="This month"
          isLoading={isLoading}
        />
        <StatsCard
          title="Customers"
          value={stats?.total_customers || 0}
          icon={<Users size={20} />}
          change={{
            value: stats?.customers_last_30_days || 0,
            type: "increase",
          }}
          subtitle={`${stats?.customers_last_30_days || 0} new this month`}
          isLoading={isLoading}
        />
        <StatsCard
          title="Orders"
          value={stats?.total_orders || 0}
          icon={<ShoppingBag size={20} />}
          change={{
            value: stats?.orders_last_30_days || 0,
            type: "increase",
          }}
          subtitle={`${stats?.orders_last_30_days || 0} this month`}
          isLoading={isLoading}
        />
      </div>

      {/* Revenue Chart */}
      <RevenueChart period="monthly" />

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed limit={5} />
        </div>
        <div className="lg:col-span-1">
          <QuickActions countryCode={countryCode} />
        </div>
      </div>
    </div>
  );
}
