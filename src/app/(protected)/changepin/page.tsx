"use client";

import React, { useState } from "react";
import { HiEye, HiEyeSlash } from "react-icons/hi2";

export default function ChangePinPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-zinc-900 shadow-md rounded-2xl p-6 border border-zinc-800">
        <h1 className="text-2xl font-semibold text-white mb-6 text-center">
          Change Transaction PIN
        </h1>

        {/* Form */}
        <form className="flex flex-col space-y-4">
          {/* Current PIN */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Current PIN
            </label>
            <input
              type={showCurrent ? "text" : "password"}
              placeholder="Enter current PIN"
              inputMode="numeric"
              className="w-full p-3 pr-10 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-10 text-gray-400 hover:text-gray-200"
            >
              {showCurrent ? <HiEyeSlash size={18} /> : <HiEye size={18} />}
            </button>
          </div>

          {/* New PIN */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              New PIN
            </label>
            <input
              type={showNew ? "text" : "password"}
              placeholder="Enter new PIN"
              inputMode="numeric"
              className="w-full p-3 pr-10 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
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
              className="w-full p-3 pr-10 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
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
            className="w-full bg-amber-600 hover:bg-blue-700 transition-all text-white font-semibold py-3 rounded-xl mt-4"
          >
            Update PIN
          </button>
        </form>
      </div>
    </div>
  );
}
