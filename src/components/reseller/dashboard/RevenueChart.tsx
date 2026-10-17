// src/components/reseller/dashboard/RevenueChart.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getRevenueBreakdown,
  RevenueBreakdownItem,
} from "@/actions/reseller/dashboard";
import { cn } from "@/lib/utils/helpers";

interface RevenueChartProps {
  className?: string;
  period?: "daily" | "weekly" | "monthly" | "yearly";
}

export function RevenueChart({
  className,
  period = "monthly",
}: RevenueChartProps) {
  const [data, setData] = useState<RevenueBreakdownItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      const result = await getRevenueBreakdown(period);

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to load revenue data");
      }

      setIsLoading(false);
    }

    fetchData();
  }, [period]);

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
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-[300px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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
        <div className="flex items-center justify-center h-[300px] text-red-500">
          <div className="text-center">
            <p className="text-lg font-medium">⚠️ {error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Try refreshing the page
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    name: formatPeriodLabel(item.period, period),
    revenue: item.revenue,
    profit: item.profit,
  }));

  const maxValue = Math.max(
    ...formattedData.map((d) => Math.max(d.revenue, d.profit)),
    0,
  );

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Revenue & Profit
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {capitalize(period)} breakdown
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Revenue
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Profit
            </span>
          </div>
        </div>
      </div>

      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              className="dark:stroke-gray-700"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke="#9CA3AF"
              className="dark:stroke-gray-600"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              className="dark:stroke-gray-600"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              domain={[0, maxValue * 1.1 || 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.95)",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                color: "#111827",
              }}
              labelClassName="text-gray-500"
              formatter={(value, name) => {
                const num = Array.isArray(value)
                  ? Number(value[0])
                  : Number(value);
                return [`$${num.toLocaleString()}`, name];
              }}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#colorRevenue)"
              name="Revenue"
            />
            <Area
              type="monotone"
              dataKey="profit"
              stroke="#22C55E"
              strokeWidth={2}
              fill="url(#colorProfit)"
              name="Profit"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Helper functions
function formatPeriodLabel(period: string, type: string): string {
  if (type === "daily") {
    const date = new Date(period);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (type === "weekly") {
    const date = new Date(period);
    return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  if (type === "yearly") {
    return period;
  }
  // Monthly
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
