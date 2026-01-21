// app/(protected)/change-password/page.tsx
"use client";

import { useState } from "react";
import { HiEye, HiEyeSlash } from "react-icons/hi2";

export default function ChangePasswordPage() {
   const [showCurrent, setShowCurrent] = useState(false);
   const [showNew, setShowNew] = useState(false);
   const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-black shadow-md rounded-2xl p-6 border border-amber-100">
        <h1 className="text-2xl font-semibold text-amber-600 mb-6 text-center">
          Change Password
        </h1>

        {/* Form */}
        <form className="flex flex-col space-y-4">

          {/* New Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type={showNew ? "text" : "password"}
              placeholder="Enter new password"
              className="w-full p-3 pr-10 rounded-xl border border-gray-300 text-xs text-gray-400 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            >
              {showNew ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
            </button>
          </div>

          {/* Confirm New Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm new password"
              className="w-full p-3 pr-10 rounded-xl border border-gray-300 text-xs text-gray-400 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            >
              {showConfirm ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-blue-700 transition-all text-white font-semibold py-3 rounded-xl mt-4"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
