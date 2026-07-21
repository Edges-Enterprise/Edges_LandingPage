// src/components/reseller/dashboard/QuickActions.tsx
"use client";

import { useRouter } from "next/navigation";
import {
  Plus,
  Wallet,
  Users,
  ShoppingBag,
  Smartphone,
  Settings,
  Share2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  href: string;
  color?: string;
}

interface QuickActionsProps {
  className?: string;
  countryCode: string;
}

export function QuickActions({ className, countryCode }: QuickActionsProps) {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      label: "Fund Wallet",
      icon: <Wallet size={20} />,
      href: `/${countryCode}/dashboard/wallet`,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      label: "Add Customer",
      icon: <Users size={20} />,
      href: `/${countryCode}/dashboard/customers`,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      label: "New Order",
      icon: <ShoppingBag size={20} />,
      href: `/${countryCode}/dashboard/orders`,
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      label: "Create Plan",
      icon: <Plus size={20} />,
      href: `/${countryCode}/dashboard/plans`,
      color: "bg-orange-500 hover:bg-orange-600",
    },
    {
      label: "App Build",
      icon: <Smartphone size={20} />,
      href: `/${countryCode}/dashboard/app`,
      color: "bg-indigo-500 hover:bg-indigo-600",
    },
    {
      label: "Share Store",
      icon: <Share2 size={20} />,
      href: `/${countryCode}/dashboard/store`,
      color: "bg-pink-500 hover:bg-pink-600",
    },
    {
      label: "Analytics",
      icon: <TrendingUp size={20} />,
      href: `/${countryCode}/dashboard/analytics`,
      color: "bg-cyan-500 hover:bg-cyan-600",
    },
    {
      label: "Settings",
      icon: <Settings size={20} />,
      href: `/${countryCode}/dashboard/settings`,
      color: "bg-gray-500 hover:bg-gray-600",
    },
  ];

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700",
        className,
      )}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => router.push(action.href)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-lg text-white transition-all",
              "hover:scale-105 active:scale-95",
              action.color || "bg-primary hover:bg-primary/80",
            )}
          >
            {action.icon}
            <span className="text-xs font-medium text-center">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
