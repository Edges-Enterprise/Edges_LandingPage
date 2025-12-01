"use client";

import { useState, useTransition } from "react";
import {
  sendAdminNotificationAction,
  checkPushTokenHealthAction,
  cleanupOldProjectTokensAction,
} from "@/app/actions/admin-notifications";

import {
  FaBell,
  FaPaperPlane,
  FaUsers,
  FaChartLine,
  FaTrash,
} from "react-icons/fa6";
import { IoCheckmarkCircle, IoAlertCircle } from "react-icons/io5";
import { MdHealthAndSafety } from "react-icons/md";
import { NOTIFICATION_TYPES, NotificationType } from "@/constants/helper";

const targetAudienceOptions = [
  { value: "all", label: "All Users", description: "Send to everyone" },
  {
    value: "active",
    label: "Active Users",
    description: "Users active in last 30 days",
  },
];

interface Stats {
  totalSent: number;
  totalRead: number;
  readRate: number;
  usersWithPushTokens: number;
  recentNotifications: number;
}

interface Props {
  initialStats?: Stats | null;
}

export default function AdminNotificationsPage({ initialStats }: Props) {
  const [isPending, startTransition] = useTransition();
  const [notificationType, setNotificationType] =
    useState<NotificationType>("promotional");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "active">("all");
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [stats] = useState<Stats | null>(initialStats || null);
  const [tokenHealth, setTokenHealth] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleCheckTokens = async () => {
    startTransition(async () => {
      const healthResult = await checkPushTokenHealthAction();
      if (healthResult.success) {
        setTokenHealth(healthResult.data);
        setShowDiagnostics(true);
      }
    });
  };

  const handleCleanupOldTokens = async () => {
    if (
      !confirm(
        "This will remove the token from the old project (@woba9794/edges-network). Continue?"
      )
    ) {
      return;
    }

    startTransition(async () => {
      const cleanupResult = await cleanupOldProjectTokensAction(
        "@woba9794/edges-network"
      );
      if (cleanupResult.success) {
        setResult({
          type: "success",
          message: cleanupResult.message || "Old tokens removed!",
        });
        // Refresh token health
        const healthResult = await checkPushTokenHealthAction();
        if (healthResult.success) {
          setTokenHealth(healthResult.data);
        }
      } else {
        setResult({
          type: "error",
          message: cleanupResult.error || "Failed to cleanup",
        });
      }
    });
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setResult({ type: "error", message: "Title and message are required" });
      return;
    }

    setResult(null);

    startTransition(async () => {
      const sendResult = await sendAdminNotificationAction({
        notificationType,
        title: title.trim(),
        message: message.trim(),
        targetAudience,
      });

      if (sendResult.error) {
        setResult({ type: "error", message: sendResult.error });
      } else {
        setResult({
          type: "success",
          message: sendResult.message || "Sent successfully!",
        });
        // Clear form
        setTitle("");
        setMessage("");
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-[#D7A77F]/20 to-[#D7A77F]/5 rounded-xl border border-[#D7A77F]/30">
              <FaBell size={24} className="text-[#D7A77F]" />
            </div>
            <h1 className="text-3xl font-bold">Push Notifications</h1>
          </div>
          <p className="text-gray-400">
            Send custom notifications to your users
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaChartLine size={16} className="text-blue-400" />
                <p className="text-gray-400 text-sm">Total Sent</p>
              </div>
              <p className="text-2xl font-bold">
                {stats.totalSent.toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <IoCheckmarkCircle size={16} className="text-green-400" />
                <p className="text-gray-400 text-sm">Read Rate</p>
              </div>
              <p className="text-2xl font-bold">{stats.readRate.toFixed(1)}%</p>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaUsers size={16} className="text-purple-400" />
                <p className="text-gray-400 text-sm">Push Enabled</p>
              </div>
              <p className="text-2xl font-bold">
                {stats.usersWithPushTokens.toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaBell size={16} className="text-orange-400" />
                <p className="text-gray-400 text-sm">Last 7 Days</p>
              </div>
              <p className="text-2xl font-bold">
                {stats.recentNotifications.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Diagnostics Buttons */}
        <div className="mb-4 flex gap-3">
          <button
            onClick={handleCheckTokens}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <MdHealthAndSafety size={18} />
            Check Push Token Health
          </button>

          <button
            onClick={handleCleanupOldTokens}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <FaTrash size={16} />
            Remove Old Project Token
          </button>
        </div>

        {/* Token Health Diagnostics */}
        {showDiagnostics && tokenHealth && (
          <div className="mb-8 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Push Token Diagnostics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Tokens:</span>
                <span className="font-semibold">{tokenHealth.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Valid Tokens:</span>
                <span className="font-semibold text-green-400">
                  {tokenHealth.valid}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Invalid Tokens:</span>
                <span className="font-semibold text-red-400">
                  {tokenHealth.invalid}
                </span>
              </div>

              {tokenHealth.valid === 0 && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
                  <p className="text-yellow-500 text-sm">
                    ⚠️ No valid push tokens found! Users need to:
                    <br />
                    1. Install your mobile app
                    <br />
                    2. Grant notification permissions
                    <br />
                    3. Log in to register their device
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 md:p-8">
          <h2 className="text-xl font-bold mb-6">Compose Notification</h2>

          <div className="space-y-6">
            {/* Notification Type */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Notification Type
              </label>
              <select
                value={notificationType}
                onChange={(e) =>
                  setNotificationType(e.target.value as NotificationType)
                }
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-[#D7A77F] focus:outline-none"
                disabled={isPending}
              >
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 🔥 Weekend Special Offer!"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-[#D7A77F] focus:outline-none"
                maxLength={100}
                disabled={isPending}
              />
              <p className="text-gray-500 text-xs mt-1">
                {title.length}/100 characters
              </p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your notification message..."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-[#D7A77F] focus:outline-none min-h-[120px]"
                maxLength={500}
                disabled={isPending}
              />
              <p className="text-gray-500 text-xs mt-1">
                {message.length}/500 characters
              </p>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Target Audience
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {targetAudienceOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setTargetAudience(option.value as "all" | "active")
                    }
                    disabled={isPending}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      targetAudience === option.value
                        ? "border-[#D7A77F] bg-[#D7A77F]/10"
                        : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
                    }`}
                  >
                    <p className="font-semibold mb-1">{option.label}</p>
                    <p className="text-gray-400 text-sm">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Result Message */}
            {result && (
              <div
                className={`p-4 rounded-lg border flex items-start gap-3 ${
                  result.type === "success"
                    ? "bg-green-500/10 border-green-500"
                    : "bg-red-500/10 border-red-500"
                }`}
              >
                {result.type === "success" ? (
                  <IoCheckmarkCircle
                    size={24}
                    className="text-green-500 flex-shrink-0 mt-0.5"
                  />
                ) : (
                  <IoAlertCircle
                    size={24}
                    className="text-red-500 flex-shrink-0 mt-0.5"
                  />
                )}
                <p
                  className={
                    result.type === "success"
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {result.message}
                </p>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isPending || !title.trim() || !message.trim()}
              className="w-full bg-[#D7A77F] hover:bg-[#c09670] text-black font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  Sending...
                </>
              ) : (
                <>
                  <FaPaperPlane size={18} />
                  Send Notification
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Preview</h3>
          <div className="bg-black/50 border border-gray-600 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#D7A77F] rounded-full flex items-center justify-center flex-shrink-0">
                <FaBell size={16} className="text-black" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold mb-1">
                  {title || "Your title will appear here"}
                </p>
                <p className="text-gray-400 text-sm">
                  {message || "Your message will appear here"}
                </p>
                <p className="text-gray-600 text-xs mt-2">Just now</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { useState, useTransition } from "react";
// import {
//   sendAdminNotificationAction,
//   checkPushTokenHealthAction,
// } from "@/app/actions/admin-notifications";

// import { FaBell, FaPaperPlane, FaUsers, FaChartLine } from "react-icons/fa6";
// import { IoCheckmarkCircle, IoAlertCircle } from "react-icons/io5";
// import { MdHealthAndSafety } from "react-icons/md";
// import { NOTIFICATION_TYPES, NotificationType } from "@/constants/helper";

// const targetAudienceOptions = [
//   { value: "all", label: "All Users", description: "Send to everyone" },
//   {
//     value: "active",
//     label: "Active Users",
//     description: "Users active in last 30 days",
//   },
// ];

// interface Stats {
//   totalSent: number;
//   totalRead: number;
//   readRate: number;
//   usersWithPushTokens: number;
//   recentNotifications: number;
// }

// interface Props {
//   initialStats?: Stats | null;
// }

// export default function AdminNotificationsPage({ initialStats }: Props) {
//   const [isPending, startTransition] = useTransition();
//   const [notificationType, setNotificationType] =
//     useState<NotificationType>("promotional");
//   const [title, setTitle] = useState("");
//   const [message, setMessage] = useState("");
//   const [targetAudience, setTargetAudience] = useState<"all" | "active">("all");
//   const [result, setResult] = useState<{
//     type: "success" | "error";
//     message: string;
//   } | null>(null);
//   const [stats] = useState<Stats | null>(initialStats || null);
//   const [tokenHealth, setTokenHealth] = useState<any>(null);
//   const [showDiagnostics, setShowDiagnostics] = useState(false);

//   const handleCheckTokens = async () => {
//     startTransition(async () => {
//       const healthResult = await checkPushTokenHealthAction();
//       if (healthResult.success) {
//         setTokenHealth(healthResult.data);
//         setShowDiagnostics(true);
//       }
//     });
//   };

//   const handleSend = async () => {
//     if (!title.trim() || !message.trim()) {
//       setResult({ type: "error", message: "Title and message are required" });
//       return;
//     }

//     setResult(null);

//     startTransition(async () => {
//       const sendResult = await sendAdminNotificationAction({
//         notificationType,
//         title: title.trim(),
//         message: message.trim(),
//         targetAudience,
//       });

//       if (sendResult.error) {
//         setResult({ type: "error", message: sendResult.error });
//       } else {
//         setResult({
//           type: "success",
//           message: sendResult.message || "Sent successfully!",
//         });
//         // Clear form
//         setTitle("");
//         setMessage("");
//       }
//     });
//   };

//   return (
//     <div className="min-h-screen bg-black text-white p-4 md:p-8">
//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <div className="mb-8">
//           <div className="flex items-center gap-3 mb-2">
//             <div className="p-3 bg-gradient-to-br from-[#D7A77F]/20 to-[#D7A77F]/5 rounded-xl border border-[#D7A77F]/30">
//               <FaBell size={24} className="text-[#D7A77F]" />
//             </div>
//             <h1 className="text-3xl font-bold">Push Notifications</h1>
//           </div>
//           <p className="text-gray-400">
//             Send custom notifications to your users
//           </p>
//         </div>

//         {/* Stats Cards */}
//         {stats && (
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
//             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
//               <div className="flex items-center gap-2 mb-2">
//                 <FaChartLine size={16} className="text-blue-400" />
//                 <p className="text-gray-400 text-sm">Total Sent</p>
//               </div>
//               <p className="text-2xl font-bold">
//                 {stats.totalSent.toLocaleString()}
//               </p>
//             </div>

//             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
//               <div className="flex items-center gap-2 mb-2">
//                 <IoCheckmarkCircle size={16} className="text-green-400" />
//                 <p className="text-gray-400 text-sm">Read Rate</p>
//               </div>
//               <p className="text-2xl font-bold">{stats.readRate.toFixed(1)}%</p>
//             </div>

//             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
//               <div className="flex items-center gap-2 mb-2">
//                 <FaUsers size={16} className="text-purple-400" />
//                 <p className="text-gray-400 text-sm">Push Enabled</p>
//               </div>
//               <p className="text-2xl font-bold">
//                 {stats.usersWithPushTokens.toLocaleString()}
//               </p>
//             </div>

//             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
//               <div className="flex items-center gap-2 mb-2">
//                 <FaBell size={16} className="text-orange-400" />
//                 <p className="text-gray-400 text-sm">Last 7 Days</p>
//               </div>
//               <p className="text-2xl font-bold">
//                 {stats.recentNotifications.toLocaleString()}
//               </p>
//             </div>
//           </div>
//         )}

//         {/* Diagnostics Button */}
//         <div className="mb-4">
//           <button
//             onClick={handleCheckTokens}
//             disabled={isPending}
//             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
//           >
//             <MdHealthAndSafety size={18} />
//             Check Push Token Health
//           </button>
//         </div>

//         {/* Token Health Diagnostics */}
//         {showDiagnostics && tokenHealth && (
//           <div className="mb-8 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
//             <h3 className="text-lg font-bold mb-4">Push Token Diagnostics</h3>
//             <div className="space-y-3">
//               <div className="flex justify-between">
//                 <span className="text-gray-400">Total Tokens:</span>
//                 <span className="font-semibold">{tokenHealth.total}</span>
//               </div>
//               <div className="flex justify-between">
//                 <span className="text-gray-400">Valid Tokens:</span>
//                 <span className="font-semibold text-green-400">
//                   {tokenHealth.valid}
//                 </span>
//               </div>
//               <div className="flex justify-between">
//                 <span className="text-gray-400">Invalid Tokens:</span>
//                 <span className="font-semibold text-red-400">
//                   {tokenHealth.invalid}
//                 </span>
//               </div>

//               {tokenHealth.valid === 0 && (
//                 <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
//                   <p className="text-yellow-500 text-sm">
//                     ⚠️ No valid push tokens found! Users need to:
//                     <br />
//                     1. Install your mobile app
//                     <br />
//                     2. Grant notification permissions
//                     <br />
//                     3. Log in to register their device
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Main Form */}
//         <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 md:p-8">
//           <h2 className="text-xl font-bold mb-6">Compose Notification</h2>

//           <div className="space-y-6">
//             {/* Notification Type */}
//             <div>
//               <label className="block text-gray-400 text-sm mb-2">
//                 Notification Type
//               </label>
//               <select
//                 value={notificationType}
//                 onChange={(e) =>
//                   setNotificationType(e.target.value as NotificationType)
//                 }
//                 className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-[#D7A77F] focus:outline-none"
//                 disabled={isPending}
//               >
//                 {NOTIFICATION_TYPES.map((type) => (
//                   <option key={type} value={type}>
//                     {type.replace(/_/g, " ").toUpperCase()}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Title */}
//             <div>
//               <label className="block text-gray-400 text-sm mb-2">Title</label>
//               <input
//                 type="text"
//                 value={title}
//                 onChange={(e) => setTitle(e.target.value)}
//                 placeholder="e.g., 🔥 Weekend Special Offer!"
//                 className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-[#D7A77F] focus:outline-none"
//                 maxLength={100}
//                 disabled={isPending}
//               />
//               <p className="text-gray-500 text-xs mt-1">
//                 {title.length}/100 characters
//               </p>
//             </div>

//             {/* Message */}
//             <div>
//               <label className="block text-gray-400 text-sm mb-2">
//                 Message
//               </label>
//               <textarea
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 placeholder="Enter your notification message..."
//                 className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-[#D7A77F] focus:outline-none min-h-[120px]"
//                 maxLength={500}
//                 disabled={isPending}
//               />
//               <p className="text-gray-500 text-xs mt-1">
//                 {message.length}/500 characters
//               </p>
//             </div>

//             {/* Target Audience */}
//             <div>
//               <label className="block text-gray-400 text-sm mb-2">
//                 Target Audience
//               </label>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                 {targetAudienceOptions.map((option) => (
//                   <button
//                     key={option.value}
//                     type="button"
//                     onClick={() =>
//                       setTargetAudience(option.value as "all" | "active")
//                     }
//                     disabled={isPending}
//                     className={`p-4 rounded-lg border-2 transition-all text-left ${
//                       targetAudience === option.value
//                         ? "border-[#D7A77F] bg-[#D7A77F]/10"
//                         : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
//                     }`}
//                   >
//                     <p className="font-semibold mb-1">{option.label}</p>
//                     <p className="text-gray-400 text-sm">
//                       {option.description}
//                     </p>
//                   </button>
//                 ))}
//               </div>
//             </div>

//             {/* Result Message */}
//             {result && (
//               <div
//                 className={`p-4 rounded-lg border flex items-start gap-3 ${
//                   result.type === "success"
//                     ? "bg-green-500/10 border-green-500"
//                     : "bg-red-500/10 border-red-500"
//                 }`}
//               >
//                 {result.type === "success" ? (
//                   <IoCheckmarkCircle
//                     size={24}
//                     className="text-green-500 flex-shrink-0 mt-0.5"
//                   />
//                 ) : (
//                   <IoAlertCircle
//                     size={24}
//                     className="text-red-500 flex-shrink-0 mt-0.5"
//                   />
//                 )}
//                 <p
//                   className={
//                     result.type === "success"
//                       ? "text-green-500"
//                       : "text-red-500"
//                   }
//                 >
//                   {result.message}
//                 </p>
//               </div>
//             )}

//             {/* Send Button */}
//             <button
//               onClick={handleSend}
//               disabled={isPending || !title.trim() || !message.trim()}
//               className="w-full bg-[#D7A77F] hover:bg-[#c09670] text-black font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {isPending ? (
//                 <>
//                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
//                   Sending...
//                 </>
//               ) : (
//                 <>
//                   <FaPaperPlane size={18} />
//                   Send Notification
//                 </>
//               )}
//             </button>
//           </div>
//         </div>

//         {/* Preview Section */}
//         <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
//           <h3 className="text-lg font-bold mb-4">Preview</h3>
//           <div className="bg-black/50 border border-gray-600 rounded-lg p-4">
//             <div className="flex items-start gap-3">
//               <div className="w-10 h-10 bg-[#D7A77F] rounded-full flex items-center justify-center flex-shrink-0">
//                 <FaBell size={16} className="text-black" />
//               </div>
//               <div className="flex-1">
//                 <p className="text-white font-semibold mb-1">
//                   {title || "Your title will appear here"}
//                 </p>
//                 <p className="text-gray-400 text-sm">
//                   {message || "Your message will appear here"}
//                 </p>
//                 <p className="text-gray-600 text-xs mt-2">Just now</p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // "use client";

// // import { useState, useTransition } from "react";
// // import { sendAdminNotificationAction } from "@/app/actions/admin-notifications";
// // import { FaBell, FaPaperPlane, FaUsers, FaChartLine } from "react-icons/fa6";
// // import { IoCheckmarkCircle, IoAlertCircle } from "react-icons/io5";
// // import { NOTIFICATION_TYPES, type NotificationType } from "@/constants/helper";

// // const targetAudienceOptions = [
// //   { value: "all", label: "All Users", description: "Send to everyone" },
// //   {
// //     value: "active",
// //     label: "Active Users",
// //     description: "Users active in last 30 days",
// //   },
// // ];

// // interface Stats {
// //   totalSent: number;
// //   totalRead: number;
// //   readRate: number;
// //   usersWithPushTokens: number;
// //   recentNotifications: number;
// // }

// // interface Props {
// //   initialStats?: Stats | null;
// // }

// // export default function AdminNotificationsPage({ initialStats }: Props) {
// //   const [isPending, startTransition] = useTransition();
// //   const [notificationType, setNotificationType] =
// //     useState<NotificationType>("promotional");
// //   const [title, setTitle] = useState("");
// //   const [message, setMessage] = useState("");
// //   const [targetAudience, setTargetAudience] = useState<"all" | "active">("all");
// //   const [result, setResult] = useState<{
// //     type: "success" | "error";
// //     message: string;
// //   } | null>(null);
// //   const [stats, setStats] = useState<Stats | null>(initialStats || null);

// //   const handleSend = async () => {
// //     if (!title.trim() || !message.trim()) {
// //       setResult({ type: "error", message: "Title and message are required" });
// //       return;
// //     }

// //     setResult(null);

// //     startTransition(async () => {
// //       const sendResult = await sendAdminNotificationAction({
// //         notificationType,
// //         title: title.trim(),
// //         message: message.trim(),
// //         targetAudience,
// //       });

// //       if (sendResult.error) {
// //         setResult({ type: "error", message: sendResult.error });
// //       } else {
// //         setResult({
// //           type: "success",
// //           message: sendResult.message || "Sent successfully!",
// //         });
// //         // Clear form
// //         setTitle("");
// //         setMessage("");
// //       }
// //     });
// //   };

// //   return (
// //     <div className="min-h-screen bg-black text-white p-4 md:p-8">
// //       <div className="max-w-6xl mx-auto">
// //         {/* Header */}
// //         <div className="mb-8">
// //           <div className="flex items-center gap-3 mb-2">
// //             <div className="p-3 bg-gradient-to-br from-[#D7A77F]/20 to-[#D7A77F]/5 rounded-xl border border-[#D7A77F]/30">
// //               <FaBell size={24} className="text-[#D7A77F]" />
// //             </div>
// //             <h1 className="text-3xl font-bold">Push Notifications</h1>
// //           </div>
// //           <p className="text-gray-400">
// //             Send custom notifications to your users
// //           </p>
// //         </div>

// //         {/* Stats Cards */}
// //         {stats && (
// //           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
// //             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
// //               <div className="flex items-center gap-2 mb-2">
// //                 <FaChartLine size={16} className="text-blue-400" />
// //                 <p className="text-gray-400 text-sm">Total Sent</p>
// //               </div>
// //               <p className="text-2xl font-bold">
// //                 {stats.totalSent.toLocaleString()}
// //               </p>
// //             </div>

// //             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
// //               <div className="flex items-center gap-2 mb-2">
// //                 <IoCheckmarkCircle size={16} className="text-green-400" />
// //                 <p className="text-gray-400 text-sm">Read Rate</p>
// //               </div>
// //               <p className="text-2xl font-bold">{stats.readRate.toFixed(1)}%</p>
// //             </div>

// //             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
// //               <div className="flex items-center gap-2 mb-2">
// //                 <FaUsers size={16} className="text-purple-400" />
// //                 <p className="text-gray-400 text-sm">Push Enabled</p>
// //               </div>
// //               <p className="text-2xl font-bold">
// //                 {stats.usersWithPushTokens.toLocaleString()}
// //               </p>
// //             </div>

// //             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
// //               <div className="flex items-center gap-2 mb-2">
// //                 <FaBell size={16} className="text-orange-400" />
// //                 <p className="text-gray-400 text-sm">Last 7 Days</p>
// //               </div>
// //               <p className="text-2xl font-bold">
// //                 {stats.recentNotifications.toLocaleString()}
// //               </p>
// //             </div>
// //           </div>
// //         )}

// //         {/* Main Form */}
// //         <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 md:p-8">
// //           <h2 className="text-xl font-bold mb-6">Compose Notification</h2>

// //           <div className="space-y-6">
// //             {/* Notification Type */}
// //             <div>
// //               <label className="block text-gray-400 text-sm mb-2">
// //                 Notification Type
// //               </label>
// //               <select
// //                 value={notificationType}
// //                 onChange={(e) =>
// //                   setNotificationType(e.target.value as NotificationType)
// //                 }
// //                 className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-[#D7A77F] focus:outline-none"
// //                 disabled={isPending}
// //               >
// //                 {NOTIFICATION_TYPES.map((type) => (
// //                   <option key={type} value={type}>
// //                     {type.replace(/_/g, " ").toUpperCase()}
// //                   </option>
// //                 ))}
// //               </select>
// //             </div>

// //             {/* Title */}
// //             <div>
// //               <label className="block text-gray-400 text-sm mb-2">Title</label>
// //               <input
// //                 type="text"
// //                 value={title}
// //                 onChange={(e) => setTitle(e.target.value)}
// //                 placeholder="e.g., 🔥 Weekend Special Offer!"
// //                 className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-[#D7A77F] focus:outline-none"
// //                 maxLength={100}
// //                 disabled={isPending}
// //               />
// //               <p className="text-gray-500 text-xs mt-1">
// //                 {title.length}/100 characters
// //               </p>
// //             </div>

// //             {/* Message */}
// //             <div>
// //               <label className="block text-gray-400 text-sm mb-2">
// //                 Message
// //               </label>
// //               <textarea
// //                 value={message}
// //                 onChange={(e) => setMessage(e.target.value)}
// //                 placeholder="Enter your notification message..."
// //                 className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-[#D7A77F] focus:outline-none min-h-[120px]"
// //                 maxLength={500}
// //                 disabled={isPending}
// //               />
// //               <p className="text-gray-500 text-xs mt-1">
// //                 {message.length}/500 characters
// //               </p>
// //             </div>

// //             {/* Target Audience */}
// //             <div>
// //               <label className="block text-gray-400 text-sm mb-2">
// //                 Target Audience
// //               </label>
// //               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
// //                 {targetAudienceOptions.map((option) => (
// //                   <button
// //                     key={option.value}
// //                     type="button"
// //                     onClick={() =>
// //                       setTargetAudience(option.value as "all" | "active")
// //                     }
// //                     disabled={isPending}
// //                     className={`p-4 rounded-lg border-2 transition-all text-left ${
// //                       targetAudience === option.value
// //                         ? "border-[#D7A77F] bg-[#D7A77F]/10"
// //                         : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
// //                     }`}
// //                   >
// //                     <p className="font-semibold mb-1">{option.label}</p>
// //                     <p className="text-gray-400 text-sm">
// //                       {option.description}
// //                     </p>
// //                   </button>
// //                 ))}
// //               </div>
// //             </div>

// //             {/* Result Message */}
// //             {result && (
// //               <div
// //                 className={`p-4 rounded-lg border flex items-start gap-3 ${
// //                   result.type === "success"
// //                     ? "bg-green-500/10 border-green-500"
// //                     : "bg-red-500/10 border-red-500"
// //                 }`}
// //               >
// //                 {result.type === "success" ? (
// //                   <IoCheckmarkCircle
// //                     size={24}
// //                     className="text-green-500 flex-shrink-0 mt-0.5"
// //                   />
// //                 ) : (
// //                   <IoAlertCircle
// //                     size={24}
// //                     className="text-red-500 flex-shrink-0 mt-0.5"
// //                   />
// //                 )}
// //                 <p
// //                   className={
// //                     result.type === "success"
// //                       ? "text-green-500"
// //                       : "text-red-500"
// //                   }
// //                 >
// //                   {result.message}
// //                 </p>
// //               </div>
// //             )}

// //             {/* Send Button */}
// //             <button
// //               onClick={handleSend}
// //               disabled={isPending || !title.trim() || !message.trim()}
// //               className="w-full bg-[#D7A77F] hover:bg-[#c09670] text-black font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
// //             >
// //               {isPending ? (
// //                 <>
// //                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
// //                   Sending...
// //                 </>
// //               ) : (
// //                 <>
// //                   <FaPaperPlane size={18} />
// //                   Send Notification
// //                 </>
// //               )}
// //             </button>
// //           </div>
// //         </div>

// //         {/* Preview Section */}
// //         <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
// //           <h3 className="text-lg font-bold mb-4">Preview</h3>
// //           <div className="bg-black/50 border border-gray-600 rounded-lg p-4">
// //             <div className="flex items-start gap-3">
// //               <div className="w-10 h-10 bg-[#D7A77F] rounded-full flex items-center justify-center flex-shrink-0">
// //                 <FaBell size={16} className="text-black" />
// //               </div>
// //               <div className="flex-1">
// //                 <p className="text-white font-semibold mb-1">
// //                   {title || "Your title will appear here"}
// //                 </p>
// //                 <p className="text-gray-400 text-sm">
// //                   {message || "Your message will appear here"}
// //                 </p>
// //                 <p className="text-gray-600 text-xs mt-2">Just now</p>
// //               </div>
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// // // "use client";

// // // import { useState, useTransition } from "react";
// // // import {
// // //   sendAdminNotificationAction,
// // //   getNotificationStatsAction,
// // //   NOTIFICATION_TYPES,
// // //   type NotificationType,
// // // } from "@/app/actions/admin-notifications";
// // // import { FaBell, FaPaperPlane, FaUsers, FaChartLine } from "react-icons/fa6";
// // // import { IoCheckmarkCircle, IoAlertCircle } from "react-icons/io5";

// // // const targetAudienceOptions = [
// // //   { value: "all", label: "All Users", description: "Send to everyone" },
// // //   {
// // //     value: "active",
// // //     label: "Active Users",
// // //     description: "Users active in last 30 days",
// // //   },
// // // ];

// // // export default function AdminNotificationsPage() {
// // //   const [isPending, startTransition] = useTransition();
// // //   const [notificationType, setNotificationType] =
// // //     useState<NotificationType>("promotional");
// // //   const [title, setTitle] = useState("");
// // //   const [message, setMessage] = useState("");
// // //   const [targetAudience, setTargetAudience] = useState<"all" | "active">("all");
// // //   const [result, setResult] = useState<{
// // //     type: "success" | "error";
// // //     message: string;
// // //   } | null>(null);
// // //   const [stats, setStats] = useState<any>(null);

// // //   // Load stats on mount
// // //   useState(() => {
// // //     startTransition(async () => {
// // //       const statsResult = await getNotificationStatsAction();
// // //       if (statsResult.success) {
// // //         setStats(statsResult.stats);
// // //       }
// // //     });
// // //   });

// // //   const handleSend = async () => {
// // //     if (!title.trim() || !message.trim()) {
// // //       setResult({ type: "error", message: "Title and message are required" });
// // //       return;
// // //     }

// // //     setResult(null);

// // //     startTransition(async () => {
// // //       const sendResult = await sendAdminNotificationAction({
// // //         notificationType,
// // //         title: title.trim(),
// // //         message: message.trim(),
// // //         targetAudience,
// // //       });

// // //       if (sendResult.error) {
// // //         setResult({ type: "error", message: sendResult.error });
// // //       } else {
// // //         setResult({
// // //           type: "success",
// // //           message: sendResult.message || "Sent successfully!",
// // //         });
// // //         // Clear form
// // //         setTitle("");
// // //         setMessage("");
// // //         // Refresh stats
// // //         const statsResult = await getNotificationStatsAction();
// // //         if (statsResult.success) {
// // //           setStats(statsResult.stats);
// // //         }
// // //       }
// // //     });
// // //   };

// // //   return (
// // //     <div className="min-h-screen bg-black text-white p-4 md:p-8">
// // //       <div className="max-w-6xl mx-auto">
// // //         {/* Header */}
// // //         <div className="mb-8">
// // //           <div className="flex items-center gap-3 mb-2">
// // //             <div className="p-3 bg-gradient-to-br from-[#D7A77F]/20 to-[#D7A77F]/5 rounded-xl border border-[#D7A77F]/30">
// // //               <FaBell size={24} className="text-[#D7A77F]" />
// // //             </div>
// // //             <h1 className="text-3xl font-bold">Push Notifications</h1>
// // //           </div>
// // //           <p className="text-gray-400">
// // //             Send custom notifications to your users
// // //           </p>
// // //         </div>

// // //         {/* Stats Cards */}
// // //         {stats && (
// // //           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
// // //             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
// // //               <div className="flex items-center gap-2 mb-2">
// // //                 <FaChartLine size={16} className="text-blue-400" />
// // //                 <p className="text-gray-400 text-sm">Total Sent</p>
// // //               </div>
// // //               <p className="text-2xl font-bold">
// // //                 {stats.totalSent.toLocaleString()}
// // //               </p>
// // //             </div>

// // //             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
// // //               <div className="flex items-center gap-2 mb-2">
// // //                 <IoCheckmarkCircle size={16} className="text-green-400" />
// // //                 <p className="text-gray-400 text-sm">Read Rate</p>
// // //               </div>
// // //               <p className="text-2xl font-bold">{stats.readRate.toFixed(1)}%</p>
// // //             </div>

// // //             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
// // //               <div className="flex items-center gap-2 mb-2">
// // //                 <FaUsers size={16} className="text-purple-400" />
// // //                 <p className="text-gray-400 text-sm">Push Enabled</p>
// // //               </div>
// // //               <p className="text-2xl font-bold">
// // //                 {stats.usersWithPushTokens.toLocaleString()}
// // //               </p>
// // //             </div>

// // //             <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4">
// // //               <div className="flex items-center gap-2 mb-2">
// // //                 <FaBell size={16} className="text-orange-400" />
// // //                 <p className="text-gray-400 text-sm">Last 7 Days</p>
// // //               </div>
// // //               <p className="text-2xl font-bold">
// // //                 {stats.recentNotifications.toLocaleString()}
// // //               </p>
// // //             </div>
// // //           </div>
// // //         )}

// // //         {/* Main Form */}
// // //         <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 md:p-8">
// // //           <h2 className="text-xl font-bold mb-6">Compose Notification</h2>

// // //           <div className="space-y-6">
// // //             {/* Notification Type */}
// // //             <div>
// // //               <label className="block text-gray-400 text-sm mb-2">
// // //                 Notification Type
// // //               </label>
// // //               <select
// // //                 value={notificationType}
// // //                 onChange={(e) =>
// // //                   setNotificationType(e.target.value as NotificationType)
// // //                 }
// // //                 className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-[#D7A77F] focus:outline-none"
// // //                 disabled={isPending}
// // //               >
// // //                 {NOTIFICATION_TYPES.map((type) => (
// // //                   <option key={type} value={type}>
// // //                     {type.replace(/_/g, " ").toUpperCase()}
// // //                   </option>
// // //                 ))}
// // //               </select>
// // //             </div>

// // //             {/* Title */}
// // //             <div>
// // //               <label className="block text-gray-400 text-sm mb-2">Title</label>
// // //               <input
// // //                 type="text"
// // //                 value={title}
// // //                 onChange={(e) => setTitle(e.target.value)}
// // //                 placeholder="e.g., 🔥 Weekend Special Offer!"
// // //                 className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-[#D7A77F] focus:outline-none"
// // //                 maxLength={100}
// // //                 disabled={isPending}
// // //               />
// // //               <p className="text-gray-500 text-xs mt-1">
// // //                 {title.length}/100 characters
// // //               </p>
// // //             </div>

// // //             {/* Message */}
// // //             <div>
// // //               <label className="block text-gray-400 text-sm mb-2">
// // //                 Message
// // //               </label>
// // //               <textarea
// // //                 value={message}
// // //                 onChange={(e) => setMessage(e.target.value)}
// // //                 placeholder="Enter your notification message..."
// // //                 className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-[#D7A77F] focus:outline-none min-h-[120px]"
// // //                 maxLength={500}
// // //                 disabled={isPending}
// // //               />
// // //               <p className="text-gray-500 text-xs mt-1">
// // //                 {message.length}/500 characters
// // //               </p>
// // //             </div>

// // //             {/* Target Audience */}
// // //             <div>
// // //               <label className="block text-gray-400 text-sm mb-2">
// // //                 Target Audience
// // //               </label>
// // //               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
// // //                 {targetAudienceOptions.map((option) => (
// // //                   <button
// // //                     key={option.value}
// // //                     type="button"
// // //                     onClick={() =>
// // //                       setTargetAudience(option.value as "all" | "active")
// // //                     }
// // //                     disabled={isPending}
// // //                     className={`p-4 rounded-lg border-2 transition-all text-left ${
// // //                       targetAudience === option.value
// // //                         ? "border-[#D7A77F] bg-[#D7A77F]/10"
// // //                         : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
// // //                     }`}
// // //                   >
// // //                     <p className="font-semibold mb-1">{option.label}</p>
// // //                     <p className="text-gray-400 text-sm">
// // //                       {option.description}
// // //                     </p>
// // //                   </button>
// // //                 ))}
// // //               </div>
// // //             </div>

// // //             {/* Result Message */}
// // //             {result && (
// // //               <div
// // //                 className={`p-4 rounded-lg border flex items-start gap-3 ${
// // //                   result.type === "success"
// // //                     ? "bg-green-500/10 border-green-500"
// // //                     : "bg-red-500/10 border-red-500"
// // //                 }`}
// // //               >
// // //                 {result.type === "success" ? (
// // //                   <IoCheckmarkCircle
// // //                     size={24}
// // //                     className="text-green-500 flex-shrink-0 mt-0.5"
// // //                   />
// // //                 ) : (
// // //                   <IoAlertCircle
// // //                     size={24}
// // //                     className="text-red-500 flex-shrink-0 mt-0.5"
// // //                   />
// // //                 )}
// // //                 <p
// // //                   className={
// // //                     result.type === "success"
// // //                       ? "text-green-500"
// // //                       : "text-red-500"
// // //                   }
// // //                 >
// // //                   {result.message}
// // //                 </p>
// // //               </div>
// // //             )}

// // //             {/* Send Button */}
// // //             <button
// // //               onClick={handleSend}
// // //               disabled={isPending || !title.trim() || !message.trim()}
// // //               className="w-full bg-[#D7A77F] hover:bg-[#c09670] text-black font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
// // //             >
// // //               {isPending ? (
// // //                 <>
// // //                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
// // //                   Sending...
// // //                 </>
// // //               ) : (
// // //                 <>
// // //                   <FaPaperPlane size={18} />
// // //                   Send Notification
// // //                 </>
// // //               )}
// // //             </button>
// // //           </div>
// // //         </div>

// // //         {/* Preview Section */}
// // //         <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6">
// // //           <h3 className="text-lg font-bold mb-4">Preview</h3>
// // //           <div className="bg-black/50 border border-gray-600 rounded-lg p-4">
// // //             <div className="flex items-start gap-3">
// // //               <div className="w-10 h-10 bg-[#D7A77F] rounded-full flex items-center justify-center flex-shrink-0">
// // //                 <FaBell size={16} className="text-black" />
// // //               </div>
// // //               <div className="flex-1">
// // //                 <p className="text-white font-semibold mb-1">
// // //                   {title || "Your title will appear here"}
// // //                 </p>
// // //                 <p className="text-gray-400 text-sm">
// // //                   {message || "Your message will appear here"}
// // //                 </p>
// // //                 <p className="text-gray-600 text-xs mt-2">Just now</p>
// // //               </div>
// // //             </div>
// // //           </div>
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // }
