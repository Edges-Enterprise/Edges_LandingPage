// app/component/forgot-password.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { forgotPasswordAction } from "@/app/actions/auth";


export function ForgotPasswordClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // const handleResetPassword = async () => {
  //   // Logic will be implemented later
  //   console.log("Reset password for:", email);
  // };

const handleResetPassword = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.set("email", email.trim());

      const result = await forgotPasswordAction(null, formData);

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess("Check your inbox for a password reset link.");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        {/* Logo Container */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-36 h-36 rounded-full overflow-hidden mb-3">
            <Image
              src="/edgesnetworkicon.png"
              alt="Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm text-center mb-8">
          Enter your email address below and we'll send you a link to reset
          your password.
        </p>

        {/* Email Input */}
        <div className="w-full bg-gray-800 rounded-lg mb-5">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 bg-transparent text-white text-base placeholder-gray-400 focus:outline-none"
            autoComplete="email"
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={handleResetPassword}
          disabled={loading || !email.trim()}
          className={`w-full h-12 rounded-lg font-bold text-base mb-5 transition-all ${
            email.trim()
              ? "bg-transparent border-2 border-[#D7A77F] text-white hover:bg-[#D7A77F]/10"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          }`}
        >
          {loading ? "Sending..." : "Reset Password"}
        </button>

        {/* Sign In Link */}
        <div className="flex items-center justify-center mt-8">
          <span className="text-gray-400 text-sm">
            Remember your password?
          </span>
          <button
            onClick={() => router.push("/sign-in")}
            className="text-[#D7A77F] text-sm font-bold ml-1 hover:underline"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}