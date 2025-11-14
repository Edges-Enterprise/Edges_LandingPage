// // app/(protected)/home/ClientPinModal.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createTransactionPinAction } from "@/app/actions/wallet";
import { HiEye, HiEyeSlash } from "react-icons/hi2";

interface Props {
  visible: boolean;
  user: any;
}

export default function ClientPinModal({ visible, user }: Props) {
  const router = useRouter();

  const [isVisible, setIsVisible] = useState(visible);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with parent prop
  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  const closeCreateModal = () => {
    setIsVisible(false);
    setNewPin("");
    setConfirmPin("");
    setError(null);
    setIsPinLoading(false);
  };

  const handleCreatePin = async () => {
    setError(null);

    if (newPin.length < 4 || newPin.length > 6 || confirmPin.length < 4 || confirmPin.length > 6) {
      setError("PIN must be between 4 and 6 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    if (!user) {
      setError("You must be logged in to create a PIN.");
      return;
    }

    setIsPinLoading(true);

    try {
      const result = await createTransactionPinAction(newPin);

      if (result.error) {
        setError(result.error);
        setIsPinLoading(false);
        return;
      }

      closeCreateModal();
      alert("Transaction PIN created successfully.");
      router.refresh();
    } catch (err: any) {
      console.error("PIN creation error:", err);
      setError("Failed to save PIN. Please try again.");
      setIsPinLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={closeCreateModal}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
          Create Transaction PIN
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          Secure your transactions with a PIN between 4-6 digits
        </p>

        <div className="space-y-4 relative">
          {/* New PIN */}
          <div className="relative">
            <label className="block text-gray-400 text-sm mb-1">New PIN</label>
            <input
              type={showNewPin ? "text" : "password"}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
              placeholder="Enter 4-6 digits"
            />
            <button
              type="button"
              onClick={() => setShowNewPin(!showNewPin)}
              className="absolute right-3 top-12 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showNewPin ? <HiEyeSlash size={20} /> : <HiEye size={20} />}
            </button>
          </div>

          {/* Confirm PIN */}
          <div className="relative">
            <label className="block text-gray-400 text-sm mb-1">Confirm PIN</label>
            <input
              type={showConfirmPin ? "text" : "password"}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
              placeholder="Confirm 4-6 digits"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPin(!showConfirmPin)}
              className="absolute right-3 top-12 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showConfirmPin ? <HiEyeSlash size={20} /> : <HiEye size={20} />}
            </button>
          </div>

          {/* Error */}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={closeCreateModal}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
              disabled={isPinLoading}
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleCreatePin}
              className="flex-1 bg-[#D7A77F] hover:bg-[#c09670] text-black py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPinLoading || newPin !== confirmPin || newPin.length < 4 || newPin.length > 6}
            >
              {isPinLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Creating...
                </span>
              ) : (
                "Create PIN"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
