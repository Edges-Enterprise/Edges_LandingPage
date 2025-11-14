
// // app/(protected)/settings/page.tsx

// import { redirect } from "next/navigation";
// import { createServerClient, getUser } from "@/lib/supabase/server";
// import SettingsClient from "./settings-client";

// interface Profile {
//   id: string;
//   username: string | null;
//   email: string;
//   notifications_enabled: boolean;
// }

// export default async function SettingsPage() {
//   // ============================================
//   // 1. AUTH CHECK
//   // ============================================
//   const user = await getUser();
//   if (!user) {
//     redirect("/sign-in");
//   }

//   // ============================================
//   // 2. FETCH PROFILE
//   // ============================================
//   const supabase = await createServerClient();
//   const { data: profile, error: profileError } = await supabase
//     .from("profiles")
//     .select("id, username, email, notifications_enabled")
//     .eq("id", user.id)
//     .single();

//   if (profileError) {
//     console.error("Profile fetch error:", profileError);
//     // Optionally handle error, but proceed with defaults
//   }

//   return (
//     <SettingsClient
//       initialUser={user}
//       initialProfile={profile || null}
//       sections={sections} // Assuming sections is imported from "@/constants/helper"
//     />
//   );
// }

// // // app/(protected)/settings/page.tsx

// // "use client";

// // import { sections } from "@/constants/helper";
// // import { useState } from "react";
// // import { useRouter } from "next/navigation";
// // import { FaChevronLeft, FaChevronDown, FaChevronRight } from "react-icons/fa";

// // const mockProfile = {
// //   username: "john_doe",
// //   email: "john@example.com",
// // };

// // export default function SettingsPage() {
// //   const router = useRouter();
// //   const [openSection, setOpenSection] = useState(null);
// //   const [notificationsEnabled, setNotificationsEnabled] = useState(true);
// //   const [logoutVisible, setLogoutVisible] = useState(true);
// //   const [logoutModalVisible, setLogoutModalVisible] = useState(false);
// //   const [deleteModalVisible, setDeleteModalVisible] = useState(false);
// // const [emailSupportModalVisible, setEmailSupportModalVisible] = useState(false);


// //   const handleSectionToggle = (sectionTitle) => {
// //     setOpenSection(openSection === sectionTitle ? null : sectionTitle);
// //   };

// //   const handleItemPress = (section, item) => {
// //     switch (item) {
// //       case "Change Email":
// //         setEmailSupportModalVisible(true);
// //         break;
// //       case "Change Password":
// //         router.push("/changepassword");
// //         break;
// //       case "Change Transaction PIN":
// //         router.push("/changepin");
// //         break;
// //       case "Privacy Policy":
// //         router.push("/privacy");
// //         break;
// //       case "Terms of Service":
// //         router.push("/terms");
// //         break;
// //       case "Notifications":
// //         // Toggle handled by the switch itself
// //         break;
// //       case "Delete Account":
// //         setDeleteModalVisible(true);
// //         break;
// //       default:
// //         alert(`${item} feature coming soon.`);
// //     }
// //   };

// //   const handleLogout = () => {
// //     setLogoutModalVisible(true);
// //   };

// //   const confirmLogout = () => {
// //     // Add logout logic here
// //     console.log("Logging out...");
// //     setLogoutModalVisible(false);
// //     router.push("/sign-in");
// //   };

// //   const confirmDeleteAccount = () => {
// //     // Add delete account logic here
// //     console.log("Deleting account...");
// //     setDeleteModalVisible(false);
// //     router.push("/");
// //   };

// //   return (
// //     <div className="min-h-screen bg-black ">
// //       {/* Main Container */}
// //       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
// //         {/* Header */}
// //         <div className="flex items-center justify-between mb-6 sm:mb-8">
// //           <button
// //             onClick={() => router.back()}
// //             className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
// //           >
// //             <FaChevronLeft className="w-6 h-6 text-gray-200" />
// //           </button>
// //           <h1 className="text-xl sm:text-2xl font-semibold text-gray-200">
// //             Settings
// //           </h1>
// //           <div className="w-10" />
// //         </div>

// //         {/* Settings Sections */}
// //         <div className="space-y-4 pb-24">
// //           {sections.map((section, index) => (
// //             <div key={section.title} className="group">
// //               {/* Section Header */}
// //               <button
// //                 onClick={() => handleSectionToggle(section.title)}
// //                 className="w-full p-4 sm:p-5 bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between"
// //               >
// //                 <span className="text-base sm:text-lg font-medium text-gray-800 dark:text-gray-200">
// //                   {section.title}
// //                 </span>
// //                 <FaChevronDown
// //                   className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
// //                     openSection === section.title ? "rotate-180" : ""
// //                   }`}
// //                 />
// //               </button>

// //               {/* Section Content */}
// //               <div
// //                 className={`overflow-hidden transition-all duration-300 ${
// //                   openSection === section.title
// //                     ? "max-h-[2000px] opacity-100 mt-3"
// //                     : "max-h-0 opacity-0"
// //                 }`}
// //               >
// //                 <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 sm:p-6 shadow-lg">
// //                   {/* Account Info */}
// //                   {section.title === "Account" && (
// //                     <div className="mb-4 pb-4 border-b border-gray-700">
// //                       <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
// //                         Username:{" "}
// //                         <span className="font-medium text-gray-200">
// //                           {mockProfile.username}
// //                         </span>
// //                       </p>
// //                       <p className="text-sm text-gray-600 dark:text-gray-400">
// //                         Email:{" "}
// //                         <span className="font-medium text-gray-200">
// //                           {mockProfile.email}
// //                         </span>
// //                       </p>
// //                     </div>
// //                   )}

// //                   {/* Section Items */}
// //                   <div className="space-y-2">
// //                     {section.items.map((item, idx) => (
// //                       <button
// //                         key={idx}
// //                         onClick={() => handleItemPress(section.title, item)}
// //                         className="w-full p-3 sm:p-4 bg-gray-800/50 rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-between group/item"
// //                       >
// //                         <span className="text-sm sm:text-base text-gray-300">
// //                           {item}
// //                         </span>

// //                         {/* Toggle Switch for Notifications */}
// //                         {item === "Notifications" && (
// //                           <div
// //                             onClick={(e) => {
// //                               e.stopPropagation();
// //                               setNotificationsEnabled(!notificationsEnabled);
// //                             }}
// //                             className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
// //                               notificationsEnabled
// //                                 ? "bg-amber-700"
// //                                 : "bg-gray-600"
// //                             }`}
// //                           >
// //                             <div
// //                               className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
// //                                 notificationsEnabled ? "translate-x-6" : ""
// //                               }`}
// //                             />
// //                           </div>
// //                         )}

// //                         {item !== "Notifications" && (
// //                           <FaChevronRight className="w-4 h-4 text-gray-400 group-hover/item:text-gray-300 transition-colors" />
// //                         )}
// //                       </button>
// //                     ))}
// //                   </div>
// //                 </div>
// //               </div>
// //             </div>
// //           ))}
// //         </div>

// //         {/* Logout Button - Fixed at bottom on mobile, absolute on desktop */}
// //         {logoutVisible && (
// //           <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none lg:absolute lg:bottom-auto lg:top-auto lg:mt-6">
// //             <div className="max-w-7xl mx-auto pointer-events-auto">
// //               <button
// //                 onClick={handleLogout}
// //                 className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl transform hover:scale-[1.02]"
// //               >
// //                 Log Out
// //               </button>
// //             </div>
// //           </div>
// //         )}
// //       </div>

// //       {/* Logout Confirmation Modal */}
// //       {logoutModalVisible && (
// //         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
// //           <div className="bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-6">
// //             <h2 className="text-xl font-semibold text-gray-200 mb-3">
// //               Log Out?
// //             </h2>
// //             <p className="text-gray-400 mb-6">
// //               Are you sure you want to log out of your account?
// //             </p>
// //             <div className="flex gap-3">
// //               <button
// //                 onClick={() => setLogoutModalVisible(false)}
// //                 className="flex-1 px-4 py-3 bg-gray-800 text-gray-200 rounded-xl hover:bg-gray-600 transition-colors font-medium"
// //               >
// //                 Cancel
// //               </button>
// //               <button
// //                 onClick={confirmLogout}
// //                 className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium"
// //               >
// //                 Log Out
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       {/* Delete Account Confirmation Modal */}
// //       {deleteModalVisible && (
// //         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
// //           <div className="bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6">
// //             <h2 className="text-xl font-semibold text-red-500 mb-3">
// //               Delete Account?
// //             </h2>
// //             <p className="text-gray-400 mb-2">
// //               This action cannot be undone. All your data will be permanently
// //               deleted.
// //             </p>
// //             <p className="text-sm text-gray-500 mb-6">
// //               This includes your profile, transaction history, and all
// //               associated data.
// //             </p>
// //             <div className="flex gap-3">
// //               <button
// //                 onClick={() => setDeleteModalVisible(false)}
// //                 className="flex-1 px-4 py-3 bg-gray-800 text-gray-200 rounded-xl hover:bg-gray-600 transition-colors font-medium"
// //               >
// //                 Cancel
// //               </button>
// //               <button
// //                 onClick={confirmDeleteAccount}
// //                 className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium"
// //               >
// //                 Delete Forever
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       {/* Change Email Support Modal */}
// //       {emailSupportModalVisible && (
// //         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
// //           <div className="bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full p-6">
// //             <h2 className="text-xl font-semibold text-gray-200 mb-3">
// //               Change Email
// //             </h2>
// //             <p className="text-gray-400 mb-6">
// //               To change your email, please contact support for assistance.
// //             </p>
// //             <div className="flex gap-3">
// //               <button
// //                 onClick={() => setEmailSupportModalVisible(false)}
// //                 className="flex-1 px-4 py-3 bg-gray-800 text-gray-200 rounded-xl hover:bg-gray-600 transition-colors font-medium"
// //               >
// //                 Cancel
// //               </button>
// //               <button
// //                 onClick={() => {
// //                   setEmailSupportModalVisible(false);
// //                   router.push("/support");
// //                 }}
// //                 className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors font-medium"
// //               >
// //                 Contact Support
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }


// app/(protected)/settings/page.tsx

import { redirect } from "next/navigation";
import { createServerClient, getUser } from "@/lib/supabase/server";
import SettingsClient from "./settingsclient";
import { sections } from "@/constants/helper";

interface Profile {
  id: string;
  username: string | null;
  email: string;
  notifications_enabled: boolean;
}

export default async function SettingsPage() {
  // ============================================
  // 1. AUTH CHECK
  // ============================================
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  // ============================================
  // 2. FETCH PROFILE
  // ============================================
  const supabase = await createServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, email, notifications_enabled")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
    // Optionally handle error, but proceed with defaults
  }

  return (
    <SettingsClient
      initialUser={user}
      initialProfile={profile || null}
      sections={sections}
    />
  );
}