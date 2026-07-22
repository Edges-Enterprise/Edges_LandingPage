// src/app/[countryCode]/dashboard/loading.tsx
"use client";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome Section Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="mt-2 h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
            <div className="mt-3 h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="mt-2 h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="mt-1 h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
        <div className="h-[300px] bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Activity Feed Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="mt-1 h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
