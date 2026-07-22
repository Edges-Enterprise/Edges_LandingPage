// src/app/[countryCode]/dashboard/DashboardShell.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Smartphone,
  Users,
  ShoppingBag,
  Wallet,
  Package,
  Store,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/helpers";

interface DashboardShellProps {
  children: React.ReactNode;
  countryCode: string;
}

export function DashboardShell({ children, countryCode }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);

  const navigation = [
    {
      name: "Dashboard",
      href: `/${countryCode}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      name: "App Build",
      href: `/${countryCode}/dashboard/app`,
      icon: Smartphone,
    },
    {
      name: "Customers",
      href: `/${countryCode}/dashboard/customers`,
      icon: Users,
    },
    {
      name: "Orders",
      href: `/${countryCode}/dashboard/orders`,
      icon: ShoppingBag,
    },
    { name: "Wallet", href: `/${countryCode}/dashboard/wallet`, icon: Wallet },
    { name: "Plans", href: `/${countryCode}/dashboard/plans`, icon: Package },
    { name: "Store", href: `/${countryCode}/dashboard/store`, icon: Store },
    {
      name: "Settings",
      href: `/${countryCode}/dashboard/settings`,
      icon: Settings,
    },
  ];

  const isActive = (href: string) => {
    if (href === `/${countryCode}/dashboard`) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push(`/${countryCode}/sign-in`);
          return;
        }

        setUser(user);

        // Check application status
        const { data: app, error: appError } = await supabase
          .from("global_reseller_applications")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();

        if (appError || !app) {
          router.push(`/${countryCode}/apply`);
          return;
        }

        setApplication(app);

        // ✅ Check status - "active" means approved
        if (app.application_status === "active") {
          setIsLoading(false);
          return;
        }

        if (app.application_status === "pending") {
          router.push(`/${countryCode}/dashboard/pending`);
          return;
        }

        if (app.application_status === "rejected") {
          router.push(`/${countryCode}/dashboard/rejected`);
          return;
        }

        // Default: show dashboard
        setIsLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
        router.push(`/${countryCode}/sign-in`);
      }
    }

    checkAuth();
  }, [countryCode, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push(`/${countryCode}/sign-in`);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">Edges</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Network
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  onClick={() => {
                    router.push(item.href);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {item.name}
                </a>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <a
              onClick={() => {
                router.push(`/${countryCode}/support`);
                setSidebarOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <HelpCircle size={18} />
              Support
            </a>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Menu size={24} />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {application?.store_name || "Dashboard"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {application?.first_name?.charAt(0) || "U"}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                {application?.first_name || "User"}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}