// app/(protected)/change-password/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiEye, HiEyeSlash } from "react-icons/hi2";
import { updatePasswordAction } from "@/app/actions/auth"; // Import the server action from auth.ts

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validation
    if (currentPassword.trim().length < 6) {
      setError("Current password must be at least 6 characters.");
      return;
    }
    if (newPassword.trim().length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setLoading(true);

    try {
      // Call the server action to update the password
      await updatePasswordAction(currentPassword, newPassword);

      setSuccess("Password updated successfully. Redirecting...");
      setTimeout(() => router.push("/home"), 2000); // Redirect to home or desired page
    } catch (err: any) {
      console.error("Password update error:", err);
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-zinc-900 shadow-md rounded-2xl p-6 border border-zinc-800">
        <h1 className="text-2xl font-semibold text-white mb-6 text-center">
          Change Password
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
          {/* Current Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Current Password
            </label>
            <input
              type={showCurrent ? "text" : "password"}
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-3 pr-10 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-10 text-gray-400 hover:text-gray-200"
            >
              {showCurrent ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
            </button>
          </div>

          {/* New Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              New Password
            </label>
            <input
              type={showNew ? "text" : "password"}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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

          {/* Confirm New Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

