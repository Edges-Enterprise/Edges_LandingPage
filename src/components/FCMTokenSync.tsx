"use client";
import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { saveFCMTokenAction } from "@/app/actions/notifications";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export default function FCMTokenSync({ userId }: { userId: string }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    if (Notification.permission === "granted") {
      syncToken();
      return;
    }

    if (Notification.permission === "denied") {
      setBlocked(true);
      return;
    }

    setShowPrompt(true);
  }, []);

  async function syncToken() {
    try {
      const app =
        getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const messaging = getMessaging(app);
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
      );

      const token = await getToken(messaging, {
        serviceWorkerRegistration: registration,
      });

      if (token) {
        await saveFCMTokenAction(userId, token);
      }
    } catch (err) {
      console.error("FCM token error:", err);
    }
  }

  async function handleAllow() {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setShowPrompt(false);
      await syncToken();
    } else {
      setShowPrompt(false);
      setBlocked(true);
    }
  }

  // Blocked state — user denied, can't use platform
  if (blocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black">
        <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl text-center">
          <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔕</span>
          </div>
          <h2 className="text-white text-lg font-bold mb-2">
            Notifications Required
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            You need to enable notifications to use Alheri Data. Please update
            your browser notification settings and refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-gradient-to-r from-[#d7a77f] to-orange-600 text-black font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all"
          >
            I've enabled it, Refresh
          </button>
        </div>
      </div>
    );
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl">
        {/* Icon */}
        <div className="w-14 h-14 bg-gradient-to-br from-[#d7a77f] to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔔</span>
        </div>

        {/* Text */}
        <h2 className="text-white text-lg font-bold text-center mb-2">
          Allow Notifications to Continue
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          Alheri Data requires notifications to keep you updated on wallet
          funding, data deals, and important account activity.
        </p>

        {/* Single button */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleAllow}
            className="w-full py-3 bg-gradient-to-r from-[#d7a77f] to-orange-600 text-black font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all"
          >
            Allow Notifications
          </button>
        </div>
      </div>
    </div>
  );
}

// "use client";
// import { useEffect, useState } from "react";
// import { initializeApp, getApps } from "firebase/app";
// import { getMessaging, getToken } from "firebase/messaging";
// import { saveFCMTokenAction } from "@/app/actions/notifications";

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
// };

// const DISMISSED_KEY = "fcm_prompt_dismissed";

// export default function FCMTokenSync({ userId }: { userId: string }) {
//   const [showPrompt, setShowPrompt] = useState(false);

//   useEffect(() => {
//     if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

//     // Already granted — just sync token silently
//     if (Notification.permission === "granted") {
//       syncToken();
//       return;
//     }

//     // Already denied by browser — nothing we can do
//     if (Notification.permission === "denied") return;

//     // Check if user clicked "Not Now" before
//     if (localStorage.getItem(DISMISSED_KEY)) return;

//     // Show custom prompt
//     setShowPrompt(true);
//   }, []);

//   async function syncToken() {
//     try {
//       const app =
//         getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
//       const messaging = getMessaging(app);
//       const registration = await navigator.serviceWorker.register(
//         "/firebase-messaging-sw.js",
//       );

//       const token = await getToken(messaging, {
//         vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
//         serviceWorkerRegistration: registration,
//       });

//       if (token) {
//         await saveFCMTokenAction(userId, token);
//       }
//     } catch (err) {
//       console.error("FCM token error:", err);
//     }
//   }

//   async function handleContinue() {
//     setShowPrompt(false);
//     const permission = await Notification.requestPermission();
//     if (permission === "granted") {
//       await syncToken();
//     }
//   }

//   async function handleLater() {
//     setShowPrompt(false);
//     const permission = await Notification.requestPermission();
//     if (permission === "granted") {
//       await syncToken();
//     }
//   }

//   function handleNotNow() {
//     setShowPrompt(false);
//     localStorage.setItem(DISMISSED_KEY, "true");
//   }

//   if (!showPrompt) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
//       <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl">
//         {/* Icon */}
//         <div className="w-14 h-14 bg-gradient-to-br from-[#d7a77f] to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
//           <span className="text-2xl">🔔</span>
//         </div>

//         {/* Text */}
//         <h2 className="text-white text-lg font-bold text-center mb-2">
//           Stay in the loop!
//         </h2>
//         <p className="text-gray-400 text-sm text-center mb-6">
//           Get notified about wallet funding, data deals, and exclusive
//           promotions.
//         </p>

//         {/* Buttons */}
//         <div className="flex flex-col gap-3">
//           <button
//             onClick={handleNotNow}
//             className="hidden w-full py-2 text-gray-500 text-sm hover:text-gray-400 transition-colors"
//           >
//             Not Now
//           </button>
//           <button
//             onClick={handleLater}
//             className="w-full py-3 bg-gray-800 text-white font-medium rounded-xl hover:bg-gray-700 active:scale-95 transition-all border border-gray-700"
//           >
//             Later
//           </button>
//           <button
//             onClick={handleContinue}
//             className="w-full py-3 bg-gradient-to-r from-[#d7a77f] to-orange-600 text-black font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all"
//           >
//             Continue
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // "use client";
// // import { useEffect } from "react";
// // import { initializeApp, getApps } from "firebase/app";
// // import { getMessaging, getToken } from "firebase/messaging";
// // import { saveFCMTokenAction } from "@/app/actions/notifications";

// // const firebaseConfig = {
// //   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
// //   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
// //   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
// //   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
// //   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
// //   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
// // };

// // export default function FCMTokenSync({ userId }: { userId: string }) {
// //   useEffect(() => {
// //     async function sync() {
// //       if (!("Notification" in window)) return;

// //       const permission = await Notification.requestPermission();
// //       if (permission !== "granted") return;

// //       const app =
// //         getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
// //       const messaging = getMessaging(app);

// //       const token = await getToken(messaging, {
// //         vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
// //         serviceWorkerRegistration: await navigator.serviceWorker.register(
// //           "/firebase-messaging-sw.js",
// //         ),
// //       });

// //       if (token) {
// //         // Call server action to save token
// //         await saveFCMTokenAction(userId, token);
// //       }
// //     }

// //     sync().catch(console.error);
// //   }, [userId]);

// //   return null; // renders nothing
// // }
