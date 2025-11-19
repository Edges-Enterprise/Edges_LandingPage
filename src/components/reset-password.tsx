
// src/components/reset-password.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { resetPasswordAction } from "@/app/actions/auth";

export function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Extract URL parameters
  const token = searchParams.get("token");
  const type = searchParams.get("type");
  const email = searchParams.get("email");

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token || type !== "recovery") {
      setError("Invalid or missing recovery token.");
    }
  }, [token, type]);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || !token || !email) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("email", email);
      formData.set("newPassword", newPassword.trim());

      const result = await resetPasswordAction(formData);

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess("Password updated successfully. Redirecting to Sign In...");
        setTimeout(() => router.push("/sign-in"), 2000);
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

        {/* Instructions */}
        <p className="text-gray-400 text-sm text-center mb-8">
          Enter your new password below to reset your account.
        </p>

        {/* Error Message */}
        {error && (
          <div className="w-full bg-red-900/20 border border-red-500 rounded-lg p-3 mb-5">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="w-full bg-green-900/20 border border-green-500 rounded-lg p-3 mb-5">
            <p className="text-green-400 text-sm text-center">{success}</p>
          </div>
        )}

        {/* Password Input */}
        <div className="flex items-center w-full bg-gray-800 rounded-lg mb-5 pr-3">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="flex-1 h-12 px-4 bg-transparent text-white text-base placeholder-gray-400 focus:outline-none"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            {showPassword ? (
              <IoEye size={24} className="text-gray-400" />
            ) : (
              <IoEyeOff size={24} className="text-gray-400" />
            )}
          </button>
        </div>

        {/* Password Requirements */}
        {newPassword && newPassword.length < 8 && (
          <p className="text-gray-500 text-xs mb-3">
            Password must be at least 8 characters
          </p>
        )}

        {/* Update Button */}
        <button
          onClick={handleUpdatePassword}
          disabled={loading || newPassword.trim().length < 8 || !token || !email}
          className={`w-full h-12 rounded-lg font-bold text-base mb-5 transition-all ${
            newPassword.trim().length >= 8 && token && email
              ? "bg-transparent border-2 border-[#D7A77F] text-white hover:bg-[#D7A77F]/10"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          }`}
        >
          {loading ? "Updating..." : "Update Password"}
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

// // src/components/reset-password.tsx
// "use client";

// import React, { useState, useEffect } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import Image from "next/image";
// import { IoEye, IoEyeOff } from "react-icons/io5";
// import { resetPasswordAction } from "@/app/actions/auth";


// export function ResetPasswordClient() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
  
//   // Extract URL parameters
//   const token = searchParams.get("token");
//   const type = searchParams.get("type");
//   const email = searchParams.get("email");

//   const [newPassword, setNewPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (!token || type !== "recovery") {
//       setError("Invalid or missing recovery token.");
//     }
//   }, [token, type]);

//   // const handleUpdatePassword = async () => {
//   //   // Logic will be implemented later
//   //   console.log("Update password for:", email);
//   //   console.log("Token:", token);
//   //   console.log("New password:", newPassword);
//   // };

// const handleUpdatePassword = async () => {
//     if (!newPassword.trim() || !token || !email) return;
//     setLoading(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       const formData = new FormData();
//       formData.set("token", token);
//       formData.set("email", email);
//       formData.set("newPassword", newPassword.trim());

//       const result = await resetPasswordAction(null, formData);

//       if (result?.error) {
//         setError(result.error);
//       } else {
//         setSuccess("Password updated successfully. Redirecting to Sign In...");
//         setTimeout(() => router.push("/sign-in"), 2000);
//       }
//     } catch (err) {
//       console.error(err);
//       setError("Something went wrong. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-black flex items-center justify-center px-5">
//       <div className="w-full max-w-md">
//         {/* Logo Container */}
//         <div className="flex flex-col items-center mb-8">
//           <div className="relative w-36 h-36 rounded-full overflow-hidden mb-3">
//             <Image
//               src="/edgesnetworkicon.png"
//               alt="Logo"
//               fill
//               className="object-cover"
//               priority
//             />
//           </div>
//         </div>

//         {/* Instructions */}
//         <p className="text-gray-400 text-sm text-center mb-8">
//           Enter your new password below to reset your account.
//         </p>

//         {/* Error Message */}
//         {error && (
//           <div className="w-full bg-red-900/20 border border-red-500 rounded-lg p-3 mb-5">
//             <p className="text-red-400 text-sm text-center">{error}</p>
//           </div>
//         )}

//         {/* Password Input */}
//         <div className="flex items-center w-full bg-gray-800 rounded-lg mb-5 pr-3">
//           <input
//             type={showPassword ? "text" : "password"}
//             placeholder="New Password"
//             value={newPassword}
//             onChange={(e) => setNewPassword(e.target.value)}
//             className="flex-1 h-12 px-4 bg-transparent text-white text-base placeholder-gray-400 focus:outline-none"
//             autoComplete="new-password"
//           />
//           <button
//             type="button"
//             onClick={() => setShowPassword(!showPassword)}
//             className="p-2 hover:bg-gray-700 rounded-full transition-colors"
//           >
//             {showPassword ? (
//               <IoEye size={24} className="text-gray-400" />
//             ) : (
//               <IoEyeOff size={24} className="text-gray-400" />
//             )}
//           </button>
//         </div>

//         {/* Password Requirements */}
//         {newPassword && newPassword.length < 8 && (
//           <p className="text-gray-500 text-xs mb-3">
//             Password must be at least 8 characters
//           </p>
//         )}

//         {/* Update Button */}
//         <button
//           onClick={handleUpdatePassword}
//           disabled={loading || newPassword.trim().length < 8}
//           className={`w-full h-12 rounded-lg font-bold text-base mb-5 transition-all ${
//             newPassword.trim().length >= 8
//               ? "bg-transparent border-2 border-[#D7A77F] text-white hover:bg-[#D7A77F]/10"
//               : "bg-gray-600 text-gray-400 cursor-not-allowed"
//           }`}
//         >
//           {loading ? "Updating..." : "Update Password"}
//         </button>

//         {/* Sign In Link */}
//         <div className="flex items-center justify-center mt-8">
//           <span className="text-gray-400 text-sm">
//             Remember your password?
//           </span>
//           <button
//             onClick={() => router.push("/sign-in")}
//             className="text-[#D7A77F] text-sm font-bold ml-1 hover:underline"
//           >
//             Sign In
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }