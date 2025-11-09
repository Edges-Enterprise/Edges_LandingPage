// // // components/sign-up-form.tsx (Client Component)
// // 'use client';
// // import Link from 'next/link';
// // import Image from 'next/image';
// // import { useState, useTransition, useActionState } from "react";
// // import { motion } from 'framer-motion'; // For fade animation (from dependencies)
// // import { signUpAction } from '@/app/actions/auth';
// // import { HiEye, HiEyeSlash } from 'react-icons/hi2';

// // export default function SignUpForm() {
// //   const [showPassword, setShowPassword] = useState(false);
// //   const [username, setUsername] = useState('');
// //   const [email, setEmail] = useState('');
// //   const [password, setPassword] = useState('');
// //   const [rememberMe, setRememberMe] = useState(false);
// //   const [isPending, startTransition] = useTransition();

// //   const [state, formAction] = useActionState(signUpAction, null );
// //   const pending = isPending;

// //   // Validation (from RN)
// //   const isEmailValid = (email: string) => {
// //     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// //     return emailRegex.test(email.trim());
// //   };

// //   const isFormValid =
// //     username.trim().length >= 3 &&
// //     isEmailValid(email) &&
// //     password.trim().length >= 6;

// //   const handleSubmit = async (formData: FormData) => {
// //     startTransition(async () => {
// //       await formAction(formData);
// //     });
// //   };

// //   return (
// //     <motion.form
// //       initial={{ opacity: 0 }}
// //       animate={{ opacity: 1 }}
// //       transition={{ duration: 0.8 }}
// //       className="w-full space-y-5"
// //       onSubmit={(e) => {
// //         e.preventDefault();
// //         if (!isFormValid) {
// //           alert("Please ensure username is at least 3 characters, email is valid, and password is at least 6 characters.");
// //           return;
// //         }
// //         const formData = new FormData(e.currentTarget);
// //         formData.set('username', username);
// //         formData.set('email', email);
// //         formData.set('password', password);
// //         formData.set('rememberMe', rememberMe.toString());
// //         handleSubmit(formData);
// //       }}
// //     >
// //       {/* Logo */}
// //       <div className="flex flex-col items-center mb-8">
// //         <Image
// //           src="/edgesnetworkicon.png"
// //           alt="Edges Network Logo"
// //           width={150}
// //           height={150}
// //           className="rounded-full mb-2"
// //         />
// //         <h1 className="text-white text-2xl font-bold">Create Account</h1>
// //       </div>

// //       {/* Username Input */}
// //       <div className="w-full">
// //         <input
// //           name="username"
// //           type="text"
// //           placeholder="Username"
// //           className="w-full h-12 px-4 bg-[#222] rounded-lg text-white text-base placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#D7A77F] focus:border-transparent"
// //           value={username}
// //           onChange={(e) => setUsername(e.target.value)}
// //           autoCapitalize="none"
// //           required
// //         />
// //       </div>

// //       {/* Email Input */}
// //       <div className="w-full">
// //         <input
// //           name="email"
// //           type="email"
// //           placeholder="Email"
// //           className="w-full h-12 px-4 bg-[#222] rounded-lg text-white text-base placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#D7A77F] focus:border-transparent"
// //           value={email}
// //           onChange={(e) => setEmail(e.target.value)}
// //           autoCapitalize="none"
// //           required
// //         />
// //       </div>

// //       {/* Password with Toggle */}
// //       <div className="relative w-full">
// //         <input
// //           name="password"
// //           type={showPassword ? 'text' : 'password'}
// //           placeholder="Password"
// //           className="w-full h-12 px-4 pr-10 bg-[#222] rounded-lg text-white text-base placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#D7A77F] focus:border-transparent"
// //           value={password}
// //           onChange={(e) => setPassword(e.target.value)}
// //           autoCapitalize="none"
// //           required
// //         />
// //         <button
// //           type="button"
// //           onClick={() => setShowPassword(!showPassword)}
// //           className="absolute right-3 top-3 p-1 text-[#aaa] hover:text-white transition-colors"
// //         >
// //           {showPassword ? <HiEyeSlash size={24} /> : <HiEye size={24} />}
// //         </button>
// //       </div>

// //       {/* Remember Me */}
// //       <div className="flex items-center gap-3">
// //         <input
// //           type="checkbox"
// //           checked={rememberMe}
// //           onChange={(e) => setRememberMe(e.target.checked)}
// //           className="w-4 h-4 text-[#D7A77F] bg-[#444] border-[#666] rounded focus:ring-[#D7A77F] focus:ring-2"
// //         />
// //         <span className="text-[#aaa] text-sm">Remember Me</span>
// //       </div>

// //       {state?.error && <p className="text-red-500 text-sm text-center">{state.error}</p>}

// //       {/* Sign Up Button */}
// //       <button
// //         type="submit"
// //         disabled={pending || !isFormValid}
// //         className={`w-full h-12 rounded-lg flex items-center justify-center font-bold text-base transition-all ${
// //           isFormValid
// //             ? 'bg-transparent border-2 border-[#D7A77F] text-white hover:bg-[#D7A77F] hover:text-black'
// //             : 'bg-[#333] border-0 text-[#aaa]'
// //         } ${pending ? 'opacity-50 cursor-not-allowed' : ''}`}
// //       >
// //         {pending ? (
// //           <div className="w-5 h-5 border-2 border-[#D7A77F] border-t-transparent rounded-full animate-spin" />
// //         ) : (
// //           'Sign Up'
// //         )}
// //       </button>

// //       {/* Terms & Privacy */}
// //       <p className="text-[#aaa] text-xs text-center leading-5">
// //         By signing up, you agree to our{' '}
// //         <Link href="/terms" className="text-[#D7A77F] underline">
// //           Terms of Service
// //         </Link>{' '}
// //         and{' '}
// //         <Link href="/privacy" className="text-[#D7A77F] underline">
// //           Privacy Policy
// //         </Link>
// //         .
// //       </p>

// //       {/* Sign In Link */}
// //       <div className="flex items-center justify-center gap-1 mt-8">
// //         <span className="text-[#aaa] text-sm">Already have an account?</span>
// //         <Link href="/sign-in" className="text-[#D7A77F] text-sm font-bold">
// //           Sign in
// //         </Link>
// //       </div>
// //     </motion.form>
// //   );
// // }



// const SignUpForm = () => {
//   return (
//     <div>SignUpForm</div>
//   )
// }

// export default SignUpForm


// app/(auth)/sign-up/SignUpForm.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { HiEye, HiEyeSlash } from "react-icons/hi2";

export function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email validation
  const isEmailValid = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Form validation
  const isFormValid =
    username.trim().length >= 3 &&
    isEmailValid(email) &&
    password.trim().length >= 6;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isFormValid) {
      setError("Please ensure username is at least 3 characters, email is valid, and password is at least 6 characters.");
      return;
    }

    // Logic will be implemented later
    console.log("Sign up with:", { username, email, password, rememberMe });
  };

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-4 sm:px-6 lg:px-20 py-8">
      <div className="w-full max-w-md">
        <form className="w-full space-y-5 animate-fade-in" onSubmit={handleSubmit}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/edgesnetworkicon.png"
              alt="Edges Network Logo"
              width={150}
              height={150}
              className="rounded-full mb-2"
              priority
            />
            <h1 className="text-white text-2xl font-bold">Create Account</h1>
          </div>

          {/* Username Input */}
          <div className="w-full">
            <input
              name="username"
              type="text"
              placeholder="Username"
              className="w-full h-12 px-4 bg-[#222] rounded-lg text-white text-base placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#D7A77F] focus:border-transparent"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              required
            />
            {username && username.trim().length < 3 && (
              <p className="text-gray-500 text-xs mt-1">
                Username must be at least 3 characters
              </p>
            )}
          </div>

          {/* Email Input */}
          <div className="w-full">
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="w-full h-12 px-4 bg-[#222] rounded-lg text-white text-base placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#D7A77F] focus:border-transparent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoComplete="email"
              required
            />
            {email && !isEmailValid(email) && (
              <p className="text-gray-500 text-xs mt-1">
                Please enter a valid email address
              </p>
            )}
          </div>

          {/* Password with Toggle */}
          <div className="relative w-full">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full h-12 px-4 pr-10 bg-[#222] rounded-lg text-white text-base placeholder-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#D7A77F] focus:border-transparent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoCapitalize="none"
              autoComplete="new-password"
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
            {password && password.trim().length < 6 && (
              <p className="text-gray-500 text-xs mt-1">
                Password must be at least 6 characters
              </p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-[#D7A77F] bg-[#444] border-[#666] rounded focus:ring-[#D7A77F] focus:ring-2"
            />
            <span className="text-[#aaa] text-sm">Remember Me</span>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          {/* Sign Up Button */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className={`w-full h-12 rounded-lg flex items-center justify-center font-bold text-base transition-all ${
              isFormValid
                ? "bg-transparent border-2 border-[#D7A77F] text-white hover:bg-[#D7A77F] hover:text-black"
                : "bg-[#333] border-0 text-[#aaa] cursor-not-allowed"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#D7A77F] border-t-transparent rounded-full animate-spin" />
            ) : (
              "Sign Up"
            )}
          </button>

          {/* Terms & Privacy */}
          <p className="text-[#aaa] text-xs text-center leading-5">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-[#D7A77F] underline hover:text-[#E8B890]">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[#D7A77F] underline hover:text-[#E8B890]">
              Privacy Policy
            </Link>
            .
          </p>

          {/* Sign In Link */}
          <div className="flex items-center justify-center gap-1 mt-8">
            <span className="text-[#aaa] text-sm">
              Already have an account?
            </span>
            <Link
              href="/sign-in"
              className="text-[#D7A77F] text-sm font-bold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </form>

        <style jsx global>{`
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .animate-fade-in {
            animation: fade-in 0.8s ease-out;
          }
        `}</style>
      </div>
    </main>
  );
}