"use client";

import { motion } from "framer-motion";

interface ModalProps {
  title: string;
  message?: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  loading?: boolean;
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

export default function Modal({
  title,
  message,
  subMessage,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "bg-red-600 hover:bg-red-700",
  loading = false,
  open,
  onClose,
  onConfirm,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-800 rounded-xl p-6 w-full max-w-md text-center"
      >
        <h2
          className={`text-xl font-bold mb-4 ${
            confirmColor.includes("red") ? "text-red-500" : "text-white"
          }`}
        >
          {title}
        </h2>

        {message && <p className="text-gray-400 mb-2">{message}</p>}
        {subMessage && (
          <p className="text-gray-500 text-sm mb-6">{subMessage}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 rounded-lg p-3 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`flex-1 ${confirmColor} rounded-lg p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
