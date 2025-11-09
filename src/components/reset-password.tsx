// // import React, { useEffect, useState } from "react";
// // import {
// //   Alert,
// //   View,
// //   Text,
// //   TextInput,
// //   TouchableOpacity,
// //   StyleSheet,
// //   KeyboardAvoidingView,
// //   StatusBar,
// //   ScrollView,
// //   Image,
// // } from "react-native";
// // import { useLocalSearchParams, router } from "expo-router";
// // import { Ionicons } from "@expo/vector-icons";
// // import { supabase } from "@/config/supabase";

// // export default function ResetPasswordScreen() {
// //   // ✅ Extract all parameters at the component level
// //   const { token, type, email } = useLocalSearchParams();

// //   const [newPassword, setNewPassword] = useState("");
// //   const [showPassword, setShowPassword] = useState(false);
// //   const [loading, setLoading] = useState(false);

// //   useEffect(() => {
// //     if (!token || type !== "recovery") {
// //       Alert.alert("Error", "Invalid or missing recovery token.");
// //     }
// //   }, [token, type]);

// //   const handleUpdatePassword = async () => {
// //     if (!token || type !== "recovery") return;

// //     if (!newPassword || newPassword.length < 8) {
// //       Alert.alert("Error", "Password must be at least 8 characters.");
// //       return;
// //     }

// //     setLoading(true);
// //     try {
// //       const recoveryToken = Array.isArray(token) ? token[0] : token;
// //       const userEmail = Array.isArray(email) ? email[0] : email;

// //       // 🔐 Check if email is available
// //       if (!userEmail) {
// //         throw new Error("Missing email address for recovery.");
// //       }

// //       // ✅ Include email in verifyOtp call
// //       const {
// //         data: { session },
// //         error: verifyError,
// //       } = await supabase.auth.verifyOtp({
// //         email: userEmail, // ✅ email is required
// //         token: recoveryToken,
// //         type: "recovery",
// //       });

// //       if (verifyError) throw verifyError;
// //       if (!session) throw new Error("Session could not be created");

// //       const { error: updateError } = await supabase.auth.updateUser({
// //         password: newPassword,
// //       });

// //       if (updateError) throw updateError;

// //       Alert.alert("Success", "Password updated successfully.");
// //       router.replace("/sign-in");
// //     } catch (err) {
// //       const error = err as Error;
// //       Alert.alert("Error", error.message || "Failed to update password.");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   return (
// //     <KeyboardAvoidingView
// //       style={{ flex: 1, backgroundColor: "black" }}
// //       behavior={"height"}
// //       keyboardVerticalOffset={0}
// //     >
// //       <StatusBar
// //         translucent
// //         backgroundColor="transparent"
// //         barStyle="light-content"
// //       />
// //       <ScrollView
// //         style={{
// //           flex: 1,
// //           paddingHorizontal: 20,
// //           paddingTop: StatusBar.currentHeight || 40,
// //         }}
// //         contentContainerStyle={{
// //           flexGrow: 1,
// //           justifyContent: "center",
// //           paddingBottom: 20,
// //         }}
// //         keyboardShouldPersistTaps="handled"
// //       >
// //         <View style={styles.container}>
// //           <View style={styles.logoContainer}>
// //             <Image
// //               source={require("@/assets/images/playstore.jpg")}
// //               style={styles.logo}
// //             />
// //             {/* <Text style={styles.welcomeText}>Reset Password</Text> */}
// //           </View>

// //           <Text style={styles.instructionsText}>
// //             Enter your new password below to reset your account.
// //           </Text>

// //           <View style={styles.inputContainer}>
// //             <TextInput
// //               placeholder="New Password"
// //               placeholderTextColor="#aaa"
// //               style={[styles.input, { flex: 1 }]}
// //               autoCapitalize="none"
// //               secureTextEntry={!showPassword}
// //               value={newPassword}
// //               onChangeText={setNewPassword}
// //             />
// //             <TouchableOpacity
// //               style={styles.eyeIcon}
// //               onPress={() => setShowPassword(!showPassword)}
// //             >
// //               <Ionicons
// //                 name={showPassword ? "eye" : "eye-off"}
// //                 size={24}
// //                 color="#aaa"
// //               />
// //             </TouchableOpacity>
// //           </View>

// //           <TouchableOpacity
// //             style={[
// //               styles.resetButton,
// //               newPassword.trim().length >= 8
// //                 ? styles.resetButtonActive
// //                 : styles.resetButtonDisabled,
// //             ]}
// //             onPress={handleUpdatePassword}
// //             disabled={loading || newPassword.trim().length < 8}
// //           >
// //             <Text
// //               style={[
// //                 styles.resetButtonText,
// //                 newPassword.trim().length >= 8
// //                   ? styles.resetButtonTextActive
// //                   : styles.resetButtonTextDisabled,
// //               ]}
// //             >
// //               {loading ? "Updating..." : "Update Password"}
// //             </Text>
// //           </TouchableOpacity>

// //           <View style={styles.signinContainer}>
// //             <Text style={styles.signinText}>Remember your password?</Text>
// //             <TouchableOpacity onPress={() => router.push("/sign-in")}>
// //               <Text style={styles.signinLink}> Sign In</Text>
// //             </TouchableOpacity>
// //           </View>
// //         </View>
// //       </ScrollView>
// //     </KeyboardAvoidingView>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   container: {
// //     flex: 1,
// //     backgroundColor: "#000",
// //     justifyContent: "center",
// //     alignItems: "center",
// //     paddingHorizontal: 20,
// //   },
// //   logoContainer: {
// //     alignItems: "center",
// //     marginBottom: 30,
// //   },
// //   logo: {
// //     width: 150,
// //     height: 150,
// //     borderRadius: 70,
// //     marginBottom: 10,
// //   },
// //   welcomeText: {
// //     color: "#fff",
// //     fontSize: 24,
// //     fontWeight: "bold",
// //   },
// //   instructionsText: {
// //     color: "#aaa",
// //     fontSize: 14,
// //     textAlign: "center",
// //     marginBottom: 30,
// //   },
// //   inputContainer: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     width: "100%",
// //     backgroundColor: "#333",
// //     borderRadius: 8,
// //     marginBottom: 20,
// //     paddingRight: 10,
// //   },
// //   input: {
// //     height: 50,
// //     paddingHorizontal: 10,
// //     color: "#fff",
// //     fontSize: 16,
// //   },
// //   eyeIcon: {
// //     padding: 8,
// //   },
// //   resetButton: {
// //     width: "100%",
// //     height: 50,
// //     borderRadius: 8,
// //     justifyContent: "center",
// //     alignItems: "center",
// //     marginBottom: 20,
// //   },
// //   resetButtonDisabled: {
// //     backgroundColor: "#666",
// //   },
// //   resetButtonActive: {
// //     backgroundColor: "transparent",
// //     borderWidth: 2,
// //     borderColor: "#D7A77F",
// //   },
// //   resetButtonText: {
// //     fontSize: 16,
// //     fontWeight: "bold",
// //   },
// //   resetButtonTextDisabled: {
// //     color: "#aaa",
// //   },
// //   resetButtonTextActive: {
// //     color: "#fff",
// //   },
// //   signinContainer: {
// //     flexDirection: "row",
// //     alignItems: "center",
// //     marginTop: 30,
// //   },
// //   signinText: {
// //     color: "#aaa",
// //     fontSize: 14,
// //   },
// //   signinLink: {
// //     color: "#D7A77F",
// //     fontSize: 14,
// //     fontWeight: "bold",
// //   },
// // });


// import React from 'react'

// const ResetPasswordScreen = () => {
//   return (
//     <div>ResetPasswordScreen</div>
//   )
// }

// export default ResetPasswordScreen

// app/(auth)/reset-password/ResetPasswordClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IoEye, IoEyeOff } from "react-icons/io5";

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

  useEffect(() => {
    if (!token || type !== "recovery") {
      setError("Invalid or missing recovery token.");
    }
  }, [token, type]);

  const handleUpdatePassword = async () => {
    // Logic will be implemented later
    console.log("Update password for:", email);
    console.log("Token:", token);
    console.log("New password:", newPassword);
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
          disabled={loading || newPassword.trim().length < 8}
          className={`w-full h-12 rounded-lg font-bold text-base mb-5 transition-all ${
            newPassword.trim().length >= 8
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