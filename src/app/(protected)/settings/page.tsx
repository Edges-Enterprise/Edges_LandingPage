// // app/(protected)/settings/page.tsx
// 'use client';


// // import { FaArrowLeft, FaUser, FaEnvelope, FaLock, FaDownload, FaFont, FaPalette, FaBell, FaKey, FaShield, FaFileContract, FaSignOutAlt } from 'react-icons/fa';
// import { motion } from 'framer-motion';
// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { FaArrowLeft, FaSignOutAlt } from "react-icons/fa";

// import { useAuth } from "@/app/providers/AuthProvider";
// import { createClient } from "@/lib/supabase/client";
// import { signOutAction } from "@/app/actions/auth";
// // Assume contexts ported: useSupabase, useFont, useTheme, useNotifications

// const useSupabase = () => ({ deleteOwnAccount: async () => {}, user: null, profile: null, signOut: async () => {} });
// const useFont = () => ({ selectedFont: 'default', setSelectedFont: () => {} });
// const useTheme = () => ({ colorScheme: 'dark', setCustomColorScheme: () => {} });
// const useNotifications = () => ({ notificationsEnabled: true, setNotificationsEnabled: () => {} });

// const sections = [
//   {
//     title: 'Account',
//     items: ['Change Email', 'Change Password', 'Change Transaction PIN', 'Delete Account'],
//   },
//   {
//     title: 'Notifications',
//     items: [
//       // 'Check for Update',
//       // 'App Version',
//       // 'Fonts', 'Themes',
//       'Notifications'],
//   },
//   {
//     title: 'Legal',
//     items: ['Privacy Policy', 'Terms of Service'],
//   },
// ]; // Assume ported

// const availableThemes = ['dark', 'light']; // Assume ported

// export default function SettingsPage() {
//   const router = useRouter();
//   const supabase = createClientComponentClient();
//   const { deleteOwnAccount } = useSupabase();
//   const { colorScheme, setCustomColorScheme } = useTheme();
//   const { selectedFont, setSelectedFont } = useFont();
//   const { notificationsEnabled, setNotificationsEnabled } = useNotifications();
//   const [openSection, setOpenSection] = useState<string | null>(null);
//   const [logoutVisible, setLogoutVisible] = useState(false);
//   const [fontModalVisible, setFontModalVisible] = useState(false);
//   const [themeModalVisible, setThemeModalVisible] = useState(false);
//   const [deleteModalVisible, setDeleteModalVisible] = useState(false);
//   const { user, profile, signOut } = useSupabase();

//   useEffect(() => {
//     if (user && profile) {
//       const timer = setTimeout(() => setLogoutVisible(true), 5000);
//       return () => clearTimeout(timer);
//     }
//   }, [user, profile]);

//   const handleSectionToggle = (sectionTitle: string) => {
//     setOpenSection(openSection === sectionTitle ? null : sectionTitle);
//   };

//   const handleItemPress = async (section: string, item: string) => {
//     switch (item) {
//       case 'Change Password':
//         router.push('/changepassword');
//         break;
//       case 'Change Transaction PIN':
//         router.push('/changepin');
//         break;
//       case 'Privacy Policy':
//         router.push('/privacy');
//         break;
//       case 'Terms of Service':
//         router.push('/terms');
//         break;
//       case 'Notifications':
//         setNotificationsEnabled(!notificationsEnabled);
//         break;
//       case 'Delete Account':
//         setDeleteModalVisible(true);
//         break;
//       case 'Log Out':
//         if (confirm('Are you sure you want to logout?')) {
//           await signOut();
//         }
//         break;
//       default:
//         alert(`${item} feature will be implemented soon.`);
//     }
//   };

//   const confirmDeleteAccount = async () => {
//     try {
//       await deleteOwnAccount();
//       setDeleteModalVisible(false);
//       router.replace('/sign-in');
//     } catch (error) {
//       alert('Failed to delete your account.');
//     }
//   };

//   return (
//     <div className="min-h-screen bg-black text-white p-4 overflow-y-auto">
//       <div className="flex items-center justify-between mb-6 pt-4">
//         <button onClick={() => router.back()}>
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
//               animate={{ height: openSection === section.title ? 'auto' : 0, opacity: openSection === section.title ? 1 : 0 }}
//               className="overflow-hidden"
//             >
//               <div className="bg-gray-800 rounded-xl mt-2 p-4 space-y-2">
//                 {section.title === 'Account' && (
//                   <>
//                     <p className="text-sm">Username: {profile?.username}</p>
//                     <p className="text-sm">Email: {profile?.email}</p>
//                   </>
//                 )}
//                 {section.items.map((item, idx) => (
//                   <button
//                     key={idx}
//                     onClick={() => handleItemPress(section.title, item)}
//                     className="w-full flex justify-between items-center bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors"
//                   >
//                     <span className="text-sm">{item}</span>
//                     {item === 'Notifications' && (
//                       <input
//                         type="checkbox"
//                         checked={notificationsEnabled}
//                         onChange={() => setNotificationsEnabled(!notificationsEnabled)}
//                         className="toggle toggle-primary"
//                       />
//                     )}
//                   </button>
//                 ))}
//               </div>
//             </motion.div>
//           </div>
//         ))}
//       </div>

//       {logoutVisible && (
//         <motion.button
//           initial={{ x: '100%' }}
//           animate={{ x: 0 }}
//           className="fixed bottom-32 left-4 right-4 bg-red-600 rounded-xl p-4 text-center font-semibold"
//           onClick={() => handleItemPress('', 'Log Out')}
//         >
//           <FaSignOutAlt className="inline mr-2" /> Log Out
//         </motion.button>
//       )}

//       {deleteModalVisible && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//           <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md text-center">
//             <h2 className="text-xl font-bold mb-4">Delete Account?</h2>
//             <p className="text-gray-400 mb-4">This action cannot be undone.</p>
//             <div className="flex gap-2">
//               <button onClick={() => setDeleteModalVisible(false)} className="flex-1 bg-gray-600 rounded p-2">Cancel</button>
//               <button onClick={confirmDeleteAccount} className="flex-1 bg-red-600 rounded p-2">Delete</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


// app/(protected)/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaSignOutAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { signOutAction } from '@/app/actions/auth';

const sections = [
  {
    title: 'Account',
    items: ['Change Email', 'Change Password', 'Change Transaction PIN', 'Delete Account'],
  },
  {
    title: 'Notifications',
    items: ['Notifications'],
  },
  {
    title: 'Legal',
    items: ['Privacy Policy', 'Terms of Service'],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = createClient();
  
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch user profile
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setProfile(data);
          // Load notifications preference from profile or localStorage
          const savedNotifications = localStorage.getItem('notificationsEnabled');
          if (savedNotifications !== null) {
            setNotificationsEnabled(JSON.parse(savedNotifications));
          } else if (data.notifications_enabled !== undefined) {
            setNotificationsEnabled(data.notifications_enabled);
          }
        }
      };
      fetchProfile();
    }
  }, [user, supabase]);

  // Show logout button after 5 seconds
  useEffect(() => {
    if (user && profile) {
      const timer = setTimeout(() => setLogoutVisible(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [user, profile]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  const handleSectionToggle = (sectionTitle: string) => {
    setOpenSection(openSection === sectionTitle ? null : sectionTitle);
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to logout?')) {
      setIsLoggingOut(true);
      try {
        await signOutAction();
        // signOutAction handles redirect to '/'
      } catch (error) {
        console.error('Error signing out:', error);
        alert('Failed to sign out. Please try again.');
        setIsLoggingOut(false);
      }
    }
  };

  const handleItemPress = async (section: string, item: string) => {
    switch (item) {
      case 'Change Email':
        router.push('/change-email');
        break;
      case 'Change Password':
        router.push('/change-password');
        break;
      case 'Change Transaction PIN':
        router.push('/change-pin');
        break;
      case 'Privacy Policy':
        router.push('/privacy');
        break;
      case 'Terms of Service':
        router.push('/terms');
        break;
      case 'Notifications':
        const newValue = !notificationsEnabled;
        setNotificationsEnabled(newValue);
        // Save to localStorage
        localStorage.setItem('notificationsEnabled', JSON.stringify(newValue));
        // Optionally save to database
        try {
          await supabase
            .from('profiles')
            .update({ notifications_enabled: newValue })
            .eq('id', user?.id);
        } catch (error) {
          console.error('Error updating notifications:', error);
        }
        break;
      case 'Delete Account':
        setDeleteModalVisible(true);
        break;
      default:
        alert(`${item} feature coming soon.`);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      // Call the delete account server action
      const { deleteOwnAccountAction } = await import('@/app/actions/auth');
      await deleteOwnAccountAction();
      // deleteOwnAccountAction handles sign out and redirect
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(error.message || 'Failed to delete your account. Please try again.');
      setDeleteModalVisible(false);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D7A77F]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 overflow-y-auto pb-32">
      <div className="flex items-center justify-between mb-6 pt-4">
        <button 
          onClick={() => router.back()} 
          className="hover:opacity-70 transition-opacity"
          disabled={isLoggingOut}
        >
          <FaArrowLeft size={24} className="text-white" />
        </button>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <div className="w-6" />
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => handleSectionToggle(section.title)}
              className="w-full bg-gray-800 rounded-xl p-4 text-left hover:bg-gray-700 transition-colors disabled:opacity-50"
              disabled={isLoggingOut}
            >
              <span className="font-medium">{section.title}</span>
            </button>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ 
                height: openSection === section.title ? 'auto' : 0, 
                opacity: openSection === section.title ? 1 : 0 
              }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-800 rounded-xl mt-2 p-4 space-y-2">
                {section.title === 'Account' && profile && (
                  <div className="mb-3 pb-3 border-b border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">
                      <span className="font-medium text-white">Username:</span> {profile.username || 'Not set'}
                    </p>
                    <p className="text-sm text-gray-400">
                      <span className="font-medium text-white">Email:</span> {user.email}
                    </p>
                  </div>
                )}
                {section.items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleItemPress(section.title, item)}
                    className="w-full flex justify-between items-center bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors disabled:opacity-50"
                    disabled={isLoggingOut}
                  >
                    <span className="text-sm">{item}</span>
                    {item === 'Notifications' && (
                      <div 
                        className="relative inline-block w-10 mr-2 align-middle select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={notificationsEnabled}
                          onChange={() => handleItemPress(section.title, item)}
                          className="sr-only"
                          disabled={isLoggingOut}
                        />
                        <div 
                          className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${
                            notificationsEnabled ? 'bg-[#D7A77F]' : 'bg-gray-600'
                          }`}
                        >
                          <div 
                            className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                              notificationsEnabled ? 'transform translate-x-4' : ''
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
      {logoutVisible && !isLoggingOut && (
        <motion.button
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-12 left-4 right-4 bg-red-600 hover:bg-red-700 rounded-xl p-4 text-center font-semibold transition-colors shadow-lg"
          onClick={handleSignOut}
        >
          <FaSignOutAlt className="inline mr-2" /> Log Out
        </motion.button>
      )}

      {/* Logging out state */}
      {isLoggingOut && (
        <div className="fixed bottom-24 left-4 right-4 bg-red-600 rounded-xl p-4 text-center font-semibold shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Logging out...
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-800 rounded-xl p-6 w-full max-w-md text-center"
          >
            <h2 className="text-xl font-bold mb-4 text-red-500">Delete Account?</h2>
            <p className="text-gray-400 mb-2">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              This includes your profile, transaction history, and all associated data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalVisible(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 rounded-lg p-3 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 rounded-lg p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </span>
                ) : (
                  'Delete Forever'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}