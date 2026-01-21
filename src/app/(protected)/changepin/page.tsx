// app/(protected)/settings/change-pin/page.tsx (assuming this is the file path for the change pin page)

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HiEye, HiEyeSlash } from "react-icons/hi2";
import {
  updateTransactionPinAction,
  getTransactionPinAction,
} from "@/app/actions/auth"; // Import the server action from auth.ts

export default function ChangePinPage() {
  const router = useRouter();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch current PIN on mount
  // Fetch current PIN on mount using server action
  useEffect(() => {
    const fetchCurrentPin = async () => {
      try {
        const { pin } = await getTransactionPinAction();
        setCurrentPin(pin);
      } catch (err: any) {
        console.error("Fetch PIN error:", err);
        setError("Failed to load current PIN. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentPin();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validation
    if (!currentPin) {
      setError("Current PIN is required.");
      return;
    }
    if (newPin.length < 4 || newPin.length > 6) {
      setError("New PIN must be between 4 and 6 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("New PIN and confirmation do not match.");
      return;
    }
    if (newPin === currentPin) {
      setError("New PIN must be different from current PIN.");
      return;
    }

    setLoading(true);

    try {
      // Call the server action to update the PIN
      await updateTransactionPinAction(currentPin, newPin);

      setSuccess("PIN updated successfully. Redirecting...");
      setTimeout(() => router.push("/home"), 2000); // Redirect to home or desired page
    } catch (err: any) {
      console.error("PIN update error:", err);
      setError(err.message || "Failed to update PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-zinc-900 shadow-md rounded-2xl p-6 border border-zinc-800">
        <h1 className="text-2xl font-semibold text-white mb-6 text-center">
          Change Transaction PIN
        </h1>

        {/* Error Message */}
        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        {/* Success Message */}
        {success && (
          <p className="text-green-500 text-sm text-center mb-4">{success}</p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          {/* Current PIN - Hidden */}
          <input type="hidden" value={currentPin} name="currentPin" />

          {/* New PIN */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              New PIN
            </label>
            <input
              type={showNew ? "text" : "password"}
              placeholder="Enter new PIN"
              inputMode="numeric"
              value={newPin}
              onChange={(e) =>
                setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full p-3 pr-10 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-10 text-gray-400 hover:text-gray-200"
            >
              {showNew ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
            </button>
          </div>

          {/* Confirm New PIN */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Confirm New PIN
            </label>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm new PIN"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full p-3 pr-10 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-10 text-gray-400 hover:text-gray-200"
            >
              {showConfirm ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-amber-600 hover:bg-amber-700 transition-all text-white font-semibold py-3 rounded-xl mt-4 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Updating..." : "Update PIN"}
          </button>
        </form>
      </div>
    </div>
  );
}

// // app/(protected)/changepin/page.tsx

// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { HiEye, HiEyeSlash } from "react-icons/hi2";
// import { updateTransactionPinAction } from "@/app/actions/auth"; // Import the server action from auth.ts

// export default function ChangePinPage() {
//   const router = useRouter();

//   const [currentPin, setCurrentPin] = useState("");
//   const [newPin, setNewPin] = useState("");
//   const [confirmPin, setConfirmPin] = useState("");
//   const [showCurrent, setShowCurrent] = useState(false);
//   const [showNew, setShowNew] = useState(false);
//   const [showConfirm, setShowConfirm] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setError(null);
//     setSuccess(null);

//     // Client-side validation
//     if (currentPin.length < 4 || currentPin.length > 6) {
//       setError("Current PIN must be between 4 and 6 digits.");
//       return;
//     }
//     if (newPin.length < 4 || newPin.length > 6) {
//       setError("New PIN must be between 4 and 6 digits.");
//       return;
//     }
//     if (newPin !== confirmPin) {
//       setError("New PIN and confirmation do not match.");
//       return;
//     }
//     if (newPin === currentPin) {
//       setError("New PIN must be different from current PIN.");
//       return;
//     }

//     setLoading(true);

//     try {
//       // Call the server action to update the PIN
//       await updateTransactionPinAction(currentPin, newPin);

//       setSuccess("PIN updated successfully. Redirecting...");
//       setTimeout(() => router.push("/home"), 2000); // Redirect to home or desired page
//     } catch (err: any) {
//       console.error("PIN update error:", err);
//       setError(err.message || "Failed to update PIN. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-10">
//       <div className="w-full max-w-md bg-zinc-900 shadow-md rounded-2xl p-6 border border-zinc-800">
//         <h1 className="text-2xl font-semibold text-white mb-6 text-center">
//           Change Transaction PIN
//         </h1>

//         {/* Error Message */}
//         {error && (
//           <p className="text-red-500 text-sm text-center mb-4">{error}</p>
//         )}

//         {/* Success Message */}
//         {success && (
//           <p className="text-green-500 text-sm text-center mb-4">{success}</p>
//         )}

//         {/* Form */}
//         <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
//           {/* Current PIN */}
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-300 mb-1">
//               Current PIN
//             </label>
//             <input
//               type={showCurrent ? "text" : "password"}
//               placeholder="Enter current PIN"
//               inputMode="numeric"
//               value={currentPin}
//               onChange={(e) =>
//                 setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))
//               }
//               className="w-full p-3 pr-10 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
//               required
//             />
//             <button
//               type="button"
//               onClick={() => setShowCurrent(!showCurrent)}
//               className="absolute right-3 top-10 text-gray-400 hover:text-gray-200"
//             >
//               {showCurrent ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
//             </button>
//           </div>

//           {/* New PIN */}
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-300 mb-1">
//               New PIN
//             </label>
//             <input
//               type={showNew ? "text" : "password"}
//               placeholder="Enter new PIN"
//               inputMode="numeric"
//               value={newPin}
//               onChange={(e) =>
//                 setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
//               }
//               className="w-full p-3 pr-10 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
//               required
//             />
//             <button
//               type="button"
//               onClick={() => setShowNew(!showNew)}
//               className="absolute right-3 top-10 text-gray-400 hover:text-gray-200"
//             >
//               {showNew ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
//             </button>
//           </div>

//           {/* Confirm New PIN */}
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-300 mb-1">
//               Confirm New PIN
//             </label>
//             <input
//               type={showConfirm ? "text" : "password"}
//               placeholder="Confirm new PIN"
//               inputMode="numeric"
//               value={confirmPin}
//               onChange={(e) =>
//                 setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
//               }
//               className="w-full p-3 pr-10 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
//               required
//             />
//             <button
//               type="button"
//               onClick={() => setShowConfirm(!showConfirm)}
//               className="absolute right-3 top-10 text-gray-400 hover:text-gray-200"
//             >
//               {showConfirm ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
//             </button>
//           </div>

//           {/* Submit Button */}
//           <button
//             type="submit"
//             disabled={loading}
//             className={`w-full bg-amber-600 hover:bg-amber-700 transition-all text-white font-semibold py-3 rounded-xl mt-4 ${
//               loading ? "opacity-50 cursor-not-allowed" : ""
//             }`}
//           >
//             {loading ? "Updating..." : "Update PIN"}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }
