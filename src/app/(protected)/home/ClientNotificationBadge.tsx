// app/(protected)/home/ClientNotificationBadge.tsx
"use client";

import { useRouter } from "next/navigation";
import { IoNotificationsOutline } from "react-icons/io5";

interface Props {
  count: number;
  notificationsEnabled: boolean;
  userEmail: string;
}

export default function ClientNotificationBadge({
  count,
  notificationsEnabled,
  userEmail,
}: Props) {
  const router = useRouter();

  if (!notificationsEnabled) return null;

  return (
    <div className="fixed top-4 right-4 z-10 md:top-6 md:right-6">
      <button
        onClick={() => router.push("/notification")}
        className="relative p-6 md:p-6 hover:opacity-80 transition-opacity"
        aria-label="Notifications"
      >
        <IoNotificationsOutline size={24} className="text-gray-600" />
        {count > 0 && (
          <span className="absolute top-4 right-3 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] md:h-6 md:w-6 md:text-sm">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
    </div>
  );
}
