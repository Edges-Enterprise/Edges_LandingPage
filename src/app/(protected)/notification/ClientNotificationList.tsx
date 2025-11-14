"use client";

import React, { useState, useTransition } from "react";
import { IoClose } from "react-icons/io5";
import { FaBell, FaTrash, FaGift, FaCreditCard } from "react-icons/fa6";
import { IoFlash } from "react-icons/io5";
import {
  dismissNotificationAction,
  clearAllNotificationsAction,
  markNotificationAsReadAction,
} from "@/app/actions/notifications";

interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
  is_read: boolean;
  network?: string | null;
}

interface Props {
  initialNotifications: Notification[];
  userEmail: string;
}

const networkColors: Record<string, string> = {
  mtn: "bg-yellow-500",
  airtel: "bg-red-500",
  glo: "bg-green-500",
  "9mobile": "bg-emerald-600",
  default: "bg-gray-600",
};

const notificationIcons: Record<string, React.ReactNode> = {
  transaction: <FaCreditCard size={16} className="text-white" />,
  purchase: <FaCreditCard size={16} className="text-white" />,
  hot_data: <IoFlash size={16} className="text-yellow-400" />,
  special_data: <FaGift size={16} className="text-pink-400" />,
  advertisement: <FaGift size={16} className="text-blue-400" />,
  default: <FaBell size={16} className="text-white" />,
};

const NewTagBadge = ({ isNew }: { isNew: boolean }) => {
  if (!isNew) return null;

  return (
    <span className="inline-flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-2.5 py-0.5 ml-2 animate-pulse-scale shadow-lg">
      <span className="text-[10px] text-black font-bold uppercase tracking-wide">
        New
      </span>
    </span>
  );
};

const NotificationItem = ({
  notification,
  onDismiss,
  onPress,
  isPending,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
  onPress: (notification: Notification) => void;
  isPending: boolean;
}) => {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const isNew =
    new Date().getTime() - new Date(notification.created_at).getTime() <
    24 * 60 * 60 * 1000;

  const showDismissButton = [
    "hot_data",
    "special_data",
    "weekend_plan",
    "weekly_plan",
    "advertisement",
  ].includes(notification.type);

  const networkColor =
    networkColors[notification.network?.toLowerCase() || "default"] ||
    networkColors.default;
  const icon =
    notificationIcons[notification.type] || notificationIcons.default;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    if (diff > 0 && diff < 100) {
      setSwipeDistance(diff);
    }
  };

  const handleTouchEnd = () => {
    if (swipeDistance > 60) {
      onDismiss(notification.id);
    }
    setSwipeDistance(0);
    setIsDragging(false);
  };

  return (
    <div className="relative mb-3 overflow-hidden rounded-xl group">
      {/* Delete Background */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-start pl-6 rounded-xl transition-opacity"
        style={{ opacity: swipeDistance > 0 ? 1 : 0 }}
      >
        <FaTrash size={24} className="text-white" />
      </div>

      {/* Notification Card */}
      <div
        className={`relative flex items-center p-4 bg-gradient-to-br from-gray-900 via-black to-gray-900 border rounded-xl cursor-pointer transition-all duration-300 hover:border-gray-600 hover:shadow-lg hover:shadow-white/5 active:scale-[0.98] ${
          notification.is_read ? "border-gray-800" : "border-[#D7A77F]"
        } ${isPending ? "opacity-50 pointer-events-none" : ""}`}
        style={{
          transform: `translateX(${swipeDistance}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
        onClick={() => onPress(notification)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Network Logo with Icon */}
        <div
          className={`relative w-12 h-12 ${networkColor} rounded-full mr-4 flex-shrink-0 flex items-center justify-center shadow-lg`}
        >
          <div className="absolute inset-0 bg-white/10 rounded-full animate-ping-slow opacity-75" />
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center flex-1 min-w-0">
              <p className="text-white text-sm md:text-base font-medium leading-snug line-clamp-2">
                {notification.message}
              </p>
              <NewTagBadge isNew={isNew && !notification.is_read} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  notification.is_read
                    ? "bg-gray-600"
                    : "bg-amber-600 animate-pulse"
                }`}
              />
              <p
                className={`text-xs font-medium ${
                  notification.is_read ? "text-gray-600" : "text-amber-600"
                }`}
              >
                {formatTime(notification.created_at)}
              </p>
            </div>
            {notification.network && (
              <>
                <span className="text-gray-700">•</span>
                <p className="text-gray-500 text-xs font-medium uppercase">
                  {notification.network}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        {showDismissButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(notification.id);
            }}
            className="ml-2 p-2 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-90"
            aria-label="Dismiss notification"
            disabled={isPending}
          >
            <IoClose
              size={18}
              className="text-gray-400 hover:text-white transition-colors"
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default function ClientNotificationsList({
  initialNotifications,
  userEmail,
}: Props) {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [isPending, startTransition] = useTransition();

  const handleDismiss = (id: string) => {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    // Server action
    startTransition(async () => {
      const result = await dismissNotificationAction(id);
      if (result.error) {
        // Revert on error
        setNotifications(initialNotifications);
        alert(result.error);
      }
    });
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      startTransition(async () => {
        await markNotificationAsReadAction(notification.id);
      });
    }

    // You can add navigation logic here based on notification type
    console.log("Notification pressed:", notification);
  };

  const handleClearAll = () => {
    if (!confirm("Are you sure you want to clear all notifications?")) {
      return;
    }

    // Optimistic update
    setNotifications([]);

    // Server action
    startTransition(async () => {
      const result = await clearAllNotificationsAction();
      if (result.error) {
        // Revert on error
        setNotifications(initialNotifications);
        alert(result.error);
      }
    });
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-lg border-b border-gray-800">
        <div className="w-full max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-white/10 to-white/5 rounded-xl border border-white/10">
                <FaBell size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-white text-xl md:text-2xl font-bold">
                  Notifications
                </h1>
                <p className="text-gray-400 text-xs md:text-sm">
                  {notifications.length}{" "}
                  {notifications.length === 1
                    ? "notification"
                    : "notifications"}
                </p>
              </div>
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50"
              >
                {isPending ? "Clearing..." : "Clear All"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-4xl mx-auto px-4 py-6">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 px-4">
            <div className="w-20 h-20 mb-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center border border-gray-700">
              <FaBell size={32} className="text-gray-600" />
            </div>
            <h3 className="text-white text-lg md:text-xl font-semibold mb-2">
              All caught up!
            </h3>
            <p className="text-gray-500 text-sm md:text-base text-center max-w-sm">
              You don't have any notifications right now. Check back later for
              updates.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onDismiss={handleDismiss}
                onPress={handleNotificationPress}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse-scale {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.9;
          }
        }

        @keyframes ping-slow {
          75%,
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .animate-pulse-scale {
          animation: pulse-scale 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
