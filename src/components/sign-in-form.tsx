// // // components/sign-in-form.tsx

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAction } from "@/app/actions/auth";
import Link from "next/link";
import Image from "next/image";
import { HiEye, HiEyeSlash } from "react-icons/hi2";

export function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if both email and password are filled
  const isSignInEnabled = email.trim() !== "" && password.trim() !== "";

  // const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   if (!isSignInEnabled) return;

  //   // Logic will be implemented later
  //   console.log("Sign in with:", { email, password, rememberMe });
  // };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (!isSignInEnabled) return;

//     setLoading(true);
//     setError(null);

//     try {
//       const formData = new FormData();
//       formData.set("email", email);
//       formData.set("password", password);
//       formData.set("rememberMe", rememberMe.toString());

//       const result = await signInAction(null, formData);

//           // If we get here, there was an error (redirect would have thrown)
//     if (result?.error) {
//       setError(result.error);
//       setLoading(false);
//     }
//   } catch (err: any) {
//     // CRITICAL: Ignore NEXT_REDIRECT errors (they're intentional)
//     if (err?.message?.includes('NEXT_REDIRECT')) {
//       // Success! Let the redirect happen
//       return;
//     }
    
//     console.error(err);
//     setError("Something went wrong. Please try again.");
//     setLoading(false);
//   }
  // };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isSignInEnabled) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("rememberMe", rememberMe.toString());

      const result = await signInAction(null, formData);

      // If we reach here without redirect, there was an error
      if (result?.error) {
        setError(result.error);
      }
    } catch (err: any) {
      // CRITICAL: Ignore NEXT_REDIRECT errors (they're intentional)
      if (err?.digest?.startsWith("NEXT_REDIRECT")) {
        // Success! Let the redirect happen
        return;
      }

      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      // Only set loading to false if we're still on the page (no redirect)
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-4 sm:px-6 lg:px-20 py-8">
      <div className="w-full max-w-md flex flex-col items-center">
        <form className="w-full space-y-4" onSubmit={handleSubmit}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/edgesnetworkicon.png"
              alt="Edges Network Logo"
              width={150}
              height={150}
              className="rounded-full"
              priority
            />
            <h1 className="text-white text-2xl font-bold mt-2">
              Edges Network
            </h1>
          </div>

          {/* Email Input */}
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full h-12 px-4 bg-[#333] rounded-lg text-white placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#D7A77F]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
            autoComplete="email"
            required
          />

          {/* Password with Toggle */}
          <div className="relative w-full">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full h-12 px-4 pr-10 bg-[#333] rounded-lg text-white placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#D7A77F]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoCapitalize="none"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 p-1 text-[#aaa] hover:text-white transition-colors"
            >
              {showPassword ? (
                <HiEyeSlash size={24} />
              ) : (
                <HiEye size={24} />
              )}
            </button>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-[#D7A77F] bg-[#444] border-[#666] rounded focus:ring-[#D7A77F] focus:ring-2"
              />
              <span className="text-[#aaa] text-sm">Remember me</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[#D7A77F] text-sm underline hover:text-[#E8B890] transition-colors"
            >
              Forgot?
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading || !isSignInEnabled}
            className={`w-full h-12 rounded-lg font-bold transition-all ${
              isSignInEnabled
                ? "bg-transparent border-2 border-[#D7A77F] text-white hover:bg-[#D7A77F] hover:text-black"
                : "bg-[#666] border-0 text-[#aaa] cursor-not-allowed"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          {/* Sign Up Link */}
          <div className="flex items-center justify-center gap-1 text-center">
            <span className="text-[#aaa] text-sm">
              Don't have an account?
            </span>
            <Link
              href="/sign-up"
              className="text-[#D7A77F] text-sm font-bold hover:underline"
            >
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}