"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Something went wrong!
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
