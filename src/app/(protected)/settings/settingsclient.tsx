// app/(protected)/settings/settings-client.tsx

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FaChevronLeft, FaChevronDown, FaSignOutAlt } from "react-icons/fa";
import { motion } from "framer-motion";
import { sections } from "@/constants/helper";
import { signOutAction, deleteOwnAccountAction } from "@/app/actions/auth";
import { updateProfileNotificationsAction } from "@/app/actions/profile";
import Modal from "@/components/modal";

interface SettingsClientProps {
  initialUser: any;
  initialProfile: any;
  sections: typeof sections;
}

export default function SettingsClient({
  initialUser,
  initialProfile,
  sections,
}: SettingsClientProps) {
  const router = useRouter();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    initialProfile?.notifications_enabled ?? true
  );
  const [isPending, startTransition] = useTransition();
  const [modals, setModals] = useState({
    logout: false,
    delete: false,
    emailSupport: false,
  });

  const handleSectionToggle = (sectionTitle: string) => {
    setOpenSection(openSection === sectionTitle ? null : sectionTitle);
  };

  const handleItemPress = (section: string, item: string) => {
    if (item === "Notifications") {
      startTransition(async () => {
        const newValue = !notificationsEnabled;
        const result = await updateProfileNotificationsAction(newValue);
        if (result.success) {
          setNotificationsEnabled(newValue);
        } else {
          console.error(result.error);
          // Optionally show toast/error UI
        }
      });
      return;
    }

    switch (item) {
      case "Change Email":
        setModals((prev) => ({ ...prev, emailSupport: true }));
        break;
      case "Change Password":
        router.push("/change-password");
        break;
      case "Change Transaction PIN":
        router.push("/change-pin");
        break;
      case "Privacy Policy":
        router.push("/privacy");
        break;
      case "Terms of Service":
        router.push("/terms");
        break;
      case "Delete Account":
        setModals((prev) => ({ ...prev, delete: true }));
        break;
      default:
        alert(`${item} feature coming soon.`);
    }
  };

  const handleLogoutConfirm = async () => {
    startTransition(async () => {
      try {
        await signOutAction();
        // signOutAction handles redirect
      } catch (error) {
        console.error("Logout failed:", error);
        setModals((prev) => ({ ...prev, logout: false }));
      }
    });
  };

  const handleDeleteConfirm = async () => {
    startTransition(async () => {
      try {
        await deleteOwnAccountAction();
        // deleteOwnAccountAction handles redirect
      } catch (error) {
        console.error("Delete failed:", error);
        setModals((prev) => ({ ...prev, delete: false }));
      }
    });
  };

  const closeModal = (modalKey: keyof typeof modals) => {
    setModals((prev) => ({ ...prev, [modalKey]: false }));
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 overflow-y-auto pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <button
          onClick={() => router.back()}
          className="hover:opacity-70"
          disabled={isPending}
        >
          <FaChevronLeft size={24} className="text-white" />
        </button>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <div className="w-6" />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => handleSectionToggle(section.title)}
              className="w-full bg-gray-800 rounded-xl p-4 text-left hover:bg-gray-700 transition-colors disabled:opacity-50"
              disabled={isPending}
            >
              <span className="font-medium">{section.title}</span>
              <FaChevronDown
                className={`inline ml-2 w-4 h-4 text-gray-400 transition-transform ${
                  openSection === section.title ? "rotate-180" : ""
                }`}
              />
            </button>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: openSection === section.title ? "auto" : 0,
                opacity: openSection === section.title ? 1 : 0,
              }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-800 rounded-xl mt-2 p-4 space-y-2">
                {section.title === "Account" && initialProfile && (
                  <div className="mb-3 pb-3 border-b border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">
                      <span className="font-medium text-white">Username:</span>{" "}
                      {initialProfile.username || "Not set"}
                    </p>
                    <p className="text-sm text-gray-400">
                      <span className="font-medium text-white">Email:</span>{" "}
                      {initialUser.email}
                    </p>
                  </div>
                )}

                {section.items.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleItemPress(section.title, item)}
                    className="w-full flex justify-between items-center bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors disabled:opacity-50"
                    disabled={isPending}
                  >
                    <span className="text-sm">{item}</span>
                    {item === "Notifications" && (
                      <div
                        className="relative inline-block w-10 mr-2 align-middle select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={notificationsEnabled}
                          onChange={() => handleItemPress(section.title, item)}
                          className="sr-only"
                        />
                        <div
                          className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${
                            notificationsEnabled
                              ? "bg-[#D7A77F]"
                              : "bg-gray-600"
                          }`}
                        >
                          <div
                            className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                              notificationsEnabled
                                ? "transform translate-x-4"
                                : ""
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 left-4 right-4 bg-red-600 hover:bg-red-700 rounded-xl p-4 text-center font-semibold transition-colors shadow-lg disabled:opacity-50"
        onClick={() => setModals((prev) => ({ ...prev, logout: true }))}
        disabled={isPending}
      >
        <FaSignOutAlt className="inline mr-2" />
        Log Out
      </motion.button>

      {/* Modals */}
      {modals.logout && (
        <Modal
          open={modals.logout}
          title="Log Out?"
          message="Are you sure you want to log out of your account?"
          confirmText="Log Out"
          confirmColor="bg-red-600 hover:bg-red-700"
          loading={isPending}
          onClose={() => closeModal("logout")}
          onConfirm={handleLogoutConfirm}
        />
      )}

      {modals.delete && (
        <Modal
          open={modals.delete}
          title="Delete Account?"
          message="This action cannot be undone. All your data will be permanently deleted."
          subMessage="This includes your profile, transaction history, and all associated data."
          confirmText="Delete Forever"
          confirmColor="bg-red-600 hover:bg-red-700"
          loading={isPending}
          onClose={() => closeModal("delete")}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {modals.emailSupport && (
        <Modal
          open={modals.emailSupport}
          title="Change Email"
          message="To change your email, please contact support for assistance."
          confirmText="Contact Support"
          confirmColor="bg-amber-500 hover:bg-amber-600"
          loading={false}
          onClose={() => closeModal("emailSupport")}
          onConfirm={() => {
            closeModal("emailSupport");
            router.push("/support");
          }}
        />
      )}
    </div>
  );
}

// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { FaArrowLeft, FaSignOutAlt } from "react-icons/fa";
// import { motion } from "framer-motion";

// import { signOutAction } from "@/app/actions/auth";
// import { sections } from "@/constants/helper";
// import Modal from "@/components/modal";

// export default function SettingsClient() {
//   const router = useRouter();

//   const [openSection, setOpenSection] = useState<string | null>(null);
//   const [logoutVisible, setLogoutVisible] = useState(false);
//   const [deleteModalVisible, setDeleteModalVisible] = useState(false);
//   const [notificationsEnabled, setNotificationsEnabled] = useState(true);
//   const [isDeleting, setIsDeleting] = useState(false);
//   const [isLoggingOut, setIsLoggingOut] = useState(false);

//   const handleSignOut = async () => {
//     if (confirm("Are you sure you want to log out?")) {
//       setIsLoggingOut(true);
//       try {
//         await signOutAction(); // clears session + redirects
//       } catch (error) {
//         console.error("Error signing out:", error);
//         setIsLoggingOut(false);
//       }
//     }
//   };

//   const handleSectionToggle = (title: string) =>
//     setOpenSection(openSection === title ? null : title);

//   const handleItemPress = async (section: string, item: string) => {
//     switch (item) {
//       case "Change Email":
//         router.push("/change-email");
//         break;
//       case "Change Password":
//         router.push("/change-password");
//         break;
//       case "Change Transaction PIN":
//         router.push("/change-pin");
//         break;
//       case "Privacy Policy":
//         router.push("/privacy");
//         break;
//       case "Terms of Service":
//         router.push("/terms");
//         break;
//       case "Notifications":
//         const newValue = !notificationsEnabled;
//         setNotificationsEnabled(newValue);
//         await supabase
//           .from("profiles")
//           .update({ notifications_enabled: newValue })
//           .eq("id", user.id);
//         break;
//       case "Delete Account":
//         setDeleteModalVisible(true);
//         break;
//       default:
//         alert(`${item} feature coming soon.`);
//     }
//   };

//   const confirmDeleteAccount = async () => {
//     setIsDeleting(true);
//     try {
//       const { deleteOwnAccountAction } = await import("@/app/actions/auth");
//       await deleteOwnAccountAction();
//     } catch (error: any) {
//       console.error("Error deleting account:", error);
//       alert("Failed to delete your account. Please try again.");
//       setDeleteModalVisible(false);
//       setIsDeleting(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-black text-white p-4 overflow-y-auto pb-32">
//       <div className="flex items-center justify-between mb-6 pt-4">
//         <button onClick={() => router.back()} className="hover:opacity-70">
//           <FaArrowLeft size={24} className="text-white" />
//         </button>
//         <h1 className="text-2xl font-semibold">Settings</h1>
//         <div className="w-6" />
//       </div>

//       <div className="space-y-4">
//         {sections.map((section) => (
//           <div key={section.title}>
//             <button
//               onClick={() => handleSectionToggle(section.title)}
//               className="w-full bg-gray-800 rounded-xl p-4 text-left hover:bg-gray-700 transition-colors"
//             >
//               <span className="font-medium">{section.title}</span>
//             </button>
//             <motion.div
//               initial={{ height: 0, opacity: 0 }}
//               animate={{
//                 height: openSection === section.title ? "auto" : 0,
//                 opacity: openSection === section.title ? 1 : 0,
//               }}
//               transition={{ duration: 0.3 }}
//               className="overflow-hidden"
//             >
//               <div className="bg-gray-800 rounded-xl mt-2 p-4 space-y-2">
//                 {section.title === "Account" && profile && (
//                   <div className="mb-3 pb-3 border-b border-gray-700">
//                     <p className="text-sm text-gray-400 mb-1">
//                       <span className="font-medium text-white">Username:</span>{" "}
//                       {profile.username || "Not set"}
//                     </p>
//                     <p className="text-sm text-gray-400">
//                       <span className="font-medium text-white">Email:</span>{" "}
//                       {user.email}
//                     </p>
//                   </div>
//                 )}

//                 {section.items.map((item) => (
//                   <button
//                     key={item}
//                     onClick={() => handleItemPress(section.title, item)}
//                     className="w-full flex justify-between items-center bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors"
//                   >
//                     <span className="text-sm">{item}</span>
//                     {item === "Notifications" && (
//                       <div
//                         className="relative inline-block w-10 mr-2 align-middle select-none"
//                         onClick={(e) => e.stopPropagation()}
//                       >
//                         <input
//                           type="checkbox"
//                           checked={notificationsEnabled}
//                           onChange={() =>
//                             handleItemPress(section.title, item)
//                           }
//                           className="sr-only"
//                         />
//                         <div
//                           className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${
//                             notificationsEnabled
//                               ? "bg-[#D7A77F]"
//                               : "bg-gray-600"
//                           }`}
//                         >
//                           <div
//                             className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
//                               notificationsEnabled
//                                 ? "transform translate-x-4"
//                                 : ""
//                             }`}
//                           />
//                         </div>
//                       </div>
//                     )}
//                   </button>
//                 ))}
//               </div>
//             </motion.div>
//           </div>
//         ))}
//       </div>

//       <motion.button
//         initial={{ y: 100, opacity: 0 }}
//         animate={{ y: 0, opacity: 1 }}
//         transition={{ duration: 0.3 }}
//         className="fixed bottom-4 left-4 right-4 bg-red-600 hover:bg-red-700 rounded-xl p-4 text-center font-semibold transition-colors shadow-lg"
//         onClick={handleSignOut}
//       >
//         <FaSignOutAlt className="inline mr-2" /> Log Out
//       </motion.button>

//       {deleteModalVisible && (
//         <Modal
//           open={deleteModalVisible}
//           title="Delete Account?"
//           message="This action cannot be undone. All your data will be permanently deleted."
//           subMessage="This includes your profile, transaction history, and all associated data."
//           confirmText="Delete Forever"
//           confirmColor="bg-red-600 hover:bg-red-700"
//           loading={isDeleting}
//           onClose={() => setDeleteModalVisible(false)}
//           onConfirm={confirmDeleteAccount}
//         />
//       )}
//     </div>
//   );
// }
