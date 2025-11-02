// // // // // // app/(protected)/home/page.tsx
// // // // // import { createServerClient } from '@/lib/supabase';
// // // // // import { redirect } from 'next/navigation';

// // // // // export default async function HomePage() {
// // // // //   const supabase = await createServerClient();
// // // // //   const { data: { user }, error } = await supabase.auth.getUser();

// // // // //   if (error || !user) redirect('/sign-in');

// // // // //   // Fetch profile (your RN logic)
// // // // //   const { data: profile } = await supabase
// // // // //     .from('profiles')
// // // // //     .select('*')
// // // // //     .eq('id', user.id)
// // // // //     .single();

// // // // //   return (
// // // // //     <div className="min-h-screen bg-black text-white p-4">
// // // // //       <h1 className="text-2xl text-[#D7A77F]">Welcome, {profile?.username || user.email}! to home page</h1>
// // // // //       {/* Your protected UI */}
// // // // //     </div>
// // // // //   );
// // // // // }

// // // // // app/(protected)/page.tsx
// // // // 'use client';

// // // // import { useState, useEffect, useContext } from 'react';
// // // // import { useRouter, usePathname, useSegments } from 'next/navigation';
// // // // import { FaBell, FaPlusCircle } from 'react-icons/fa';
// // // // import { motion } from 'framer-motion';
// // // // import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// // // // import { useQuery } from '@tanstack/react-query';
// // // // import { actions, DEFAULT_PROVIDER_IMAGE, NETWORK_IMAGES } from '@/constants/helper'; // Assume ported
// // // // // Assume contexts are ported: useAuth, useFont, useNotifications, DataContext

// // // // // Placeholder for contexts
// // // // const useAuth = () => ({ user: null, initialized: true });
// // // // const useFont = () => ({ selectedFont: 'default' });
// // // // const useNotifications = () => ({ notificationsEnabled: true });

// // // // interface DataBundle {
// // // //   id: number;
// // // //   data: string;
// // // //   price: number;
// // // //   validity: string;
// // // //   category: string;
// // // //   description?: string;
// // // //   variation_code: string;
// // // //   planType: string;
// // // // }

// // // // interface Provider {
// // // //   id: number;
// // // //   name: string;
// // // //   image: string;
// // // //   code: string;
// // // //   imageKey: string;
// // // // }

// // // // export default function HomePage() {
// // // //   const router = useRouter();
// // // //   const pathname = usePathname();
// // // //   const segments = useSegments();
// // // //   const { selectedFont } = useFont();
// // // //   const { user, initialized } = useAuth();
// // // //   const { notificationsEnabled } = useNotifications();
// // // //   const supabase = createClientComponentClient();

// // // //   const [createPinModalVisible, setCreatePinModalVisible] = useState(false);
// // // //   // ... other states for PIN modal

// // // //   const { data: purchaseHistory = [] } = useQuery({
// // // //     queryKey: ['purchaseHistory', user?.email],
// // // //     queryFn: async () => {
// // // //       if (!user?.email) return [];
// // // //       const { data } = await supabase
// // // //         .from('data_purchases')
// // // //         .select('*')
// // // //         .eq('user_email', user.email)
// // // //         .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
// // // //         .order('created_at', { ascending: false });
// // // //       return data || [];
// // // //     },
// // // //     enabled: !!user?.email,
// // // //   });

// // // //   const { data: newNotificationCount = 0 } = useQuery({
// // // //     queryKey: ['newNotificationCount', user?.id],
// // // //     queryFn: async () => {
// // // //       if (!user?.id || !notificationsEnabled) return 0;
// // // //       const { data } = await supabase
// // // //         .from('notifications')
// // // //         .select('id')
// // // //         .eq('user_id', user.id)
// // // //         .eq('is_read', false)
// // // //         .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
// // // //       return data?.length || 0;
// // // //     },
// // // //     enabled: !!user?.id && notificationsEnabled,
// // // //   });

// // // //   useEffect(() => {
// // // //     if (!initialized || !user) {
// // // //       router.replace('/');
// // // //     }
// // // //   }, [initialized, user, router]);

// // // //   const popularPlans = purchaseHistory.map((p: any) => {
// // // //     const amountMatch = p.plan_name?.match(/₦(\d+)/);
// // // //     const provider = p.provider_name || getProviderFromPlan(p.plan_name || '');
// // // //     const displayPlanName = p.plan_name?.includes(provider) ? p.plan_name : `${provider} ${p.plan_name || 'Unknown Plan'}`;
// // // //     return {
// // // //       plan_name: displayPlanName,
// // // //       provider,
// // // //       image: NETWORK_IMAGES[provider.toLowerCase()] || DEFAULT_PROVIDER_IMAGE,
// // // //       amount: amountMatch ? parseInt(amountMatch[1], 10) : 300,
// // // //       validity: p.validity || 'N/A',
// // // //       phone_number: p.mobile_number || (user?.user_metadata?.phone ?? ''),
// // // //       network_id: p.network_id?.toString() || '0',
// // // //       plan_id: p.plan_id?.toString() || '0',
// // // //     };
// // // //   });

// // // //   const hasPlans = popularPlans.length > 0;
// // // //   const phoneNumber = hasPlans ? popularPlans[0].phone_number : user?.user_metadata?.phone ?? '';
// // // //   const username = user?.user_metadata?.username ?? 'User';

// // // //   const getProviderFromPlan = (plan: string): string => {
// // // //     const planUpper = plan.toUpperCase();
// // // //     if (planUpper.includes('MTN')) return 'MTN';
// // // //     if (planUpper.includes('GLO')) return 'GLO';
// // // //     if (planUpper.includes('AIRTEL')) return 'AIRTEL';
// // // //     if (planUpper.includes('9MOBILE') || planUpper.includes('ETISALAT')) return '9MOBILE';
// // // //     return '';
// // // //   };

// // // //   const handleSwipePurchase = (plan: any) => {
// // // //     // Implement purchase logic
// // // //     router.push({
// // // //       pathname: '/confirmation',
// // // //       query: {
// // // //         // params as in RN
// // // //       },
// // // //     });
// // // //   };

// // // //   if (!initialized || !user) {
// // // //     return (
// // // //       <div className="min-h-screen bg-black flex items-center justify-center">
// // // //         <div className="text-center">
// // // //           <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#D7A77F]"></div>
// // // //           <p className="text-white mt-4">Loading data...</p>
// // // //         </div>
// // // //       </div>
// // // //     );
// // // //   }

// // // //   return (
// // // //     <div className="min-h-screen bg-black p-4">
// // // //       <div className="fixed top-4 right-4 z-10">
// // // //         <button onClick={() => router.push('/notifications')} className="relative p-4">
// // // //           <FaBell size={24} className="text-gray-600" />
// // // //           {notificationsEnabled && newNotificationCount > 0 && (
// // // //             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
// // // //               {newNotificationCount > 99 ? '99+' : newNotificationCount}
// // // //             </span>
// // // //           )}
// // // //         </button>
// // // //       </div>

// // // //       <div className="flex flex-row items-center gap-2 mb-4 mt-4">
// // // //         <h1 className="text-3xl font-bold text-white">Hi,</h1>
// // // //         <h1 className="text-3xl font-bold text-white capitalize">{username} 👋</h1>
// // // //       </div>
// // // //       <p className="text-gray-400 mb-4">Your dashboard is here 🔥</p>

// // // //       <motion.div
// // // //         animate={{ opacity: [1, 0.4, 1] }}
// // // //         transition={{ duration: 1.6, repeat: Infinity }}
// // // //         className="bg-orange-500 rounded-xl p-3 mb-4 text-center shadow-lg"
// // // //       >
// // // //         <button onClick={() => router.push('/commingsoon')} className="text-white font-bold">
// // // //           ⚡ FLASH SALE! Up to 50% OFF Data Plans! ⚡
// // // //         </button>
// // // //       </motion.div>

// // // //       <h2 className="text-xl font-semibold text-white mb-3">⚡ Quick Actions</h2>
// // // //       <div className="grid grid-cols-3 gap-2 mb-6">
// // // //         {actions.map((action, index) => (
// // // //           <motion.button
// // // //             key={index}
// // // //             onClick={() => router.push(`/${action.route}`)}
// // // //             className="bg-gray-800 rounded-xl p-4 flex flex-col items-center hover:bg-gray-700 transition-colors"
// // // //             whileTap={{ scale: 0.95 }}
// // // //           >
// // // //             <action.icon className="text-2xl mb-2" style={{ color: action.color }} />
// // // //             <span className="text-white text-xs text-center font-medium">
// // // //               {action.title.length > 12 ? `${action.title.slice(0, 11)}...` : action.title}
// // // //             </span>
// // // //           </motion.button>
// // // //         ))}
// // // //       </div>

// // // //       <h2 className="text-xl font-semibold text-white mb-3">🔥 Recent Plans</h2>
// // // //       {hasPlans ? (
// // // //         <div className="space-y-4">
// // // //           {popularPlans.map((plan, index) => (
// // // //             <motion.div
// // // //               key={`${plan.plan_id}-${index}`}
// // // //               initial={{ x: -100, opacity: 0 }}
// // // //               animate={{ x: 0, opacity: 1 }}
// // // //               transition={{ delay: index * 0.2 }}
// // // //               className="bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-700"
// // // //               onClick={() => handleSwipePurchase(plan)}
// // // //             >
// // // //               <div className="flex items-center gap-3">
// // // //                 <img src={plan.image} alt={plan.provider} className="w-12 h-12 rounded" />
// // // //                 <div className="flex-1">
// // // //                   <p className="text-white font-semibold">{plan.plan_name}</p>
// // // //                   <p className="text-gray-400 text-sm">₦{plan.amount} - {plan.validity}</p>
// // // //                 </div>
// // // //               </div>
// // // //             </motion.div>
// // // //           ))}
// // // //         </div>
// // // //       ) : (
// // // //         <div className="bg-gray-800 rounded-xl p-4 text-center">
// // // //           <p className="text-gray-400">No recent purchases found in the last 24 hours.</p>
// // // //         </div>
// // // //       )}

// // // //       {/* PIN Modal placeholder */}
// // // //       {createPinModalVisible && (
// // // //         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
// // // //           {/* Modal content */}
// // // //         </div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // }

// // // // app/(protected)/home/page.tsx
// // // import { createServerClient } from "@/lib/supabase";
// // // import { redirect } from "next/navigation";
// // // import Image from "next/image";
// // // import { motion } from "framer-motion";
// // // import { FaBell } from "react-icons/fa";
// // // import { actions, NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from "@/constants/helper";

// // // export default async function HomePage() {
// // //   const supabase = await createServerClient();

// // //   // Authenticate user
// // //   const {
// // //     data: { user },
// // //     error,
// // //   } = await supabase.auth.getUser();

// // //   if (error || !user) redirect("/sign-in");

// // //   // Fetch user profile
// // //   const { data: profile } = await supabase
// // //     .from("profiles")
// // //     .select("*")
// // //     .eq("id", user.id)
// // //     .single();

// // //   // Fetch recent data purchases
// // //   const { data: purchases = [] } = await supabase
// // //     .from("data_purchases")
// // //     .select("*")
// // //     .eq("user_email", user.email)
// // //     .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
// // //     .order("created_at", { ascending: false });

// // //   // Fetch unread notifications count
// // //   const { data: unread = [] } = await supabase
// // //     .from("notifications")
// // //     .select("id")
// // //     .eq("user_id", user.id)
// // //     .eq("is_read", false)
// // //     .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

// // //   const username = profile?.username || user.user_metadata?.username || "User";
// // //   const newNotificationCount = unread.length;

// // //   const getProviderFromPlan = (plan: string): string => {
// // //     const planUpper = plan?.toUpperCase() || "";
// // //     if (planUpper.includes("MTN")) return "MTN";
// // //     if (planUpper.includes("GLO")) return "GLO";
// // //     if (planUpper.includes("AIRTEL")) return "AIRTEL";
// // //     if (planUpper.includes("9MOBILE") || planUpper.includes("ETISALAT"))
// // //       return "9MOBILE";
// // //     return "";
// // //   };

// // //   const popularPlans =
// // //     purchases?.map((p: any) => {
// // //       const amountMatch = p.plan_name?.match(/₦(\d+)/);
// // //       const provider = p.provider_name || getProviderFromPlan(p.plan_name);
// // //       const displayPlanName = p.plan_name?.includes(provider)
// // //         ? p.plan_name
// // //         : `${provider} ${p.plan_name || "Unknown Plan"}`;

// // //       return {
// // //         plan_name: displayPlanName,
// // //         provider,
// // //         image:
// // //           NETWORK_IMAGES[provider.toUpperCase()] || DEFAULT_PROVIDER_IMAGE,
// // //         amount: amountMatch ? parseInt(amountMatch[1], 10) : 300,
// // //         validity: p.validity || "N/A",
// // //         phone_number:
// // //           p.mobile_number || user.user_metadata?.phone || "Not available",
// // //         network_id: p.network_id?.toString() || "0",
// // //         plan_id: p.plan_id?.toString() || "0",
// // //       };
// // //     }) || [];

// // //   const hasPlans = popularPlans.length > 0;

// // //   return (
// // //     <div className="min-h-screen bg-black p-4">
// // //       {/* Notifications Button */}
// // //       <div className="fixed top-4 right-4 z-10">
// // //         <button
// // //           onClick={() => redirect("/notifications")}
// // //           className="relative p-4"
// // //         >
// // //           <FaBell size={24} className="text-gray-600" />
// // //           {newNotificationCount > 0 && (
// // //             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
// // //               {newNotificationCount > 99 ? "99+" : newNotificationCount}
// // //             </span>
// // //           )}
// // //         </button>
// // //       </div>

// // //       {/* Greeting */}
// // //       <div className="flex flex-row items-center gap-2 mb-4 mt-4">
// // //         <h1 className="text-3xl font-bold text-white">Hi,</h1>
// // //         <h1 className="text-3xl font-bold text-white capitalize">
// // //           {username} 👋
// // //         </h1>
// // //       </div>
// // //       <p className="text-gray-400 mb-4">Your dashboard is here 🔥</p>

// // //       {/* Flash Sale Banner */}
// // //       <motion.div
// // //         animate={{ opacity: [1, 0.4, 1] }}
// // //         transition={{ duration: 1.6, repeat: Infinity }}
// // //         className="bg-orange-500 rounded-xl p-3 mb-4 text-center shadow-lg"
// // //       >
// // //         <button
// // //           onClick={() => redirect("/commingsoon")}
// // //           className="text-white font-bold"
// // //         >
// // //           ⚡ FLASH SALE! Up to 50% OFF Data Plans! ⚡
// // //         </button>
// // //       </motion.div>

// // //       {/* Quick Actions */}
// // //       <h2 className="text-xl font-semibold text-white mb-3">⚡ Quick Actions</h2>
// // //       <div className="grid grid-cols-3 gap-2 mb-6">
// // //         {actions.map((action, index) => (
// // //           <motion.a
// // //             key={index}
// // //             href={`/${action.route}`}
// // //             className="bg-gray-800 rounded-xl p-4 flex flex-col items-center hover:bg-gray-700 transition-colors"
// // //             whileTap={{ scale: 0.95 }}
// // //           >
// // //             <action.icon
// // //               className="text-2xl mb-2"
// // //               style={{ color: action.color }}
// // //             />
// // //             <span className="text-white text-xs text-center font-medium">
// // //               {action.title.length > 12
// // //                 ? `${action.title.slice(0, 11)}...`
// // //                 : action.title}
// // //             </span>
// // //           </motion.a>
// // //         ))}
// // //       </div>

// // //       {/* Recent Plans */}
// // //       <h2 className="text-xl font-semibold text-white mb-3">🔥 Recent Plans</h2>
// // //       {hasPlans ? (
// // //         <div className="space-y-4">
// // //           {popularPlans.map((plan, index) => (
// // //             <motion.div
// // //               key={`${plan.plan_id}-${index}`}
// // //               initial={{ x: -100, opacity: 0 }}
// // //               animate={{ x: 0, opacity: 1 }}
// // //               transition={{ delay: index * 0.2 }}
// // //               className="bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-700"
// // //             >
// // //               <div className="flex items-center gap-3">
// // //                 <Image
// // //                   src={plan.image}
// // //                   alt={plan.provider}
// // //                   width={48}
// // //                   height={48}
// // //                   className="rounded"
// // //                 />
// // //                 <div className="flex-1">
// // //                   <p className="text-white font-semibold">{plan.plan_name}</p>
// // //                   <p className="text-gray-400 text-sm">
// // //                     ₦{plan.amount} - {plan.validity}
// // //                   </p>
// // //                 </div>
// // //               </div>
// // //             </motion.div>
// // //           ))}
// // //         </div>
// // //       ) : (
// // //         <div className="bg-gray-800 rounded-xl p-4 text-center">
// // //           <p className="text-gray-400">
// // //             No recent purchases found in the last 24 hours.
// // //           </p>
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // }

// // // // // app/(protected)/page.tsx
// // // // 'use client';

// // // // import { useState, useEffect, useContext } from 'react';
// // // // import { useRouter, usePathname, useSegments } from 'next/navigation';
// // // // import { FaBell, FaPlusCircle } from 'react-icons/fa';
// // // // import { motion } from 'framer-motion';
// // // // import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// // // // import { useQuery } from '@tanstack/react-query';
// // // // import { actions, DEFAULT_PROVIDER_IMAGE, NETWORK_IMAGES } from '@/constants/helper'; // Assume ported
// // // // // Assume contexts are ported: useAuth, useFont, useNotifications, DataContext

// // // // // Placeholder for contexts
// // // // const useAuth = () => ({ user: null, initialized: true });
// // // // const useFont = () => ({ selectedFont: 'default' });
// // // // const useNotifications = () => ({ notificationsEnabled: true });

// // // // interface DataBundle {
// // // //   id: number;
// // // //   data: string;
// // // //   price: number;
// // // //   validity: string;
// // // //   category: string;
// // // //   description?: string;
// // // //   variation_code: string;
// // // //   planType: string;
// // // // }

// // // // interface Provider {
// // // //   id: number;
// // // //   name: string;
// // // //   image: string;
// // // //   code: string;
// // // //   imageKey: string;
// // // // }

// // // // export default function HomePage() {
// // // //   const router = useRouter();
// // // //   const pathname = usePathname();
// // // //   const segments = useSegments();
// // // //   const { selectedFont } = useFont();
// // // //   const { user, initialized } = useAuth();
// // // //   const { notificationsEnabled } = useNotifications();
// // // //   const supabase = createClientComponentClient();

// // // //   const [createPinModalVisible, setCreatePinModalVisible] = useState(false);
// // // //   // ... other states for PIN modal

// // // //   const { data: purchaseHistory = [] } = useQuery({
// // // //     queryKey: ['purchaseHistory', user?.email],
// // // //     queryFn: async () => {
// // // //       if (!user?.email) return [];
// // // //       const { data } = await supabase
// // // //         .from('data_purchases')
// // // //         .select('*')
// // // //         .eq('user_email', user.email)
// // // //         .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
// // // //         .order('created_at', { ascending: false });
// // // //       return data || [];
// // // //     },
// // // //     enabled: !!user?.email,
// // // //   });

// // // //   const { data: newNotificationCount = 0 } = useQuery({
// // // //     queryKey: ['newNotificationCount', user?.id],
// // // //     queryFn: async () => {
// // // //       if (!user?.id || !notificationsEnabled) return 0;
// // // //       const { data } = await supabase
// // // //         .from('notifications')
// // // //         .select('id')
// // // //         .eq('user_id', user.id)
// // // //         .eq('is_read', false)
// // // //         .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
// // // //       return data?.length || 0;
// // // //     },
// // // //     enabled: !!user?.id && notificationsEnabled,
// // // //   });

// // // //   useEffect(() => {
// // // //     if (!initialized || !user) {
// // // //       router.replace('/(protected)/welcome');
// // // //     }
// // // //   }, [initialized, user, router]);

// // // //   const popularPlans = purchaseHistory.map((p: any) => {
// // // //     const amountMatch = p.plan_name?.match(/₦(\d+)/);
// // // //     const provider = p.provider_name || getProviderFromPlan(p.plan_name || '');
// // // //     const displayPlanName = p.plan_name?.includes(provider) ? p.plan_name : `${provider} ${p.plan_name || 'Unknown Plan'}`;
// // // //     return {
// // // //       plan_name: displayPlanName,
// // // //       provider,
// // // //       image: NETWORK_IMAGES[provider.toLowerCase()] || DEFAULT_PROVIDER_IMAGE,
// // // //       amount: amountMatch ? parseInt(amountMatch[1], 10) : 300,
// // // //       validity: p.validity || 'N/A',
// // // //       phone_number: p.mobile_number || (user?.user_metadata?.phone ?? ''),
// // // //       network_id: p.network_id?.toString() || '0',
// // // //       plan_id: p.plan_id?.toString() || '0',
// // // //     };
// // // //   });

// // // //   const hasPlans = popularPlans.length > 0;
// // // //   const phoneNumber = hasPlans ? popularPlans[0].phone_number : user?.user_metadata?.phone ?? '';
// // // //   const username = user?.user_metadata?.username ?? 'User';

// // // //   const getProviderFromPlan = (plan: string): string => {
// // // //     const planUpper = plan.toUpperCase();
// // // //     if (planUpper.includes('MTN')) return 'MTN';
// // // //     if (planUpper.includes('GLO')) return 'GLO';
// // // //     if (planUpper.includes('AIRTEL')) return 'AIRTEL';
// // // //     if (planUpper.includes('9MOBILE') || planUpper.includes('ETISALAT')) return '9MOBILE';
// // // //     return '';
// // // //   };

// // // //   const handleSwipePurchase = (plan: any) => {
// // // //     // Implement purchase logic
// // // //     router.push({
// // // //       pathname: '/Confirmation',
// // // //       query: {
// // // //         // params as in RN
// // // //       },
// // // //     });
// // // //   };

// // // //   if (!initialized || !user) {
// // // //     return (
// // // //       <div className="min-h-screen bg-black flex items-center justify-center">
// // // //         <div className="text-center">
// // // //           <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#D7A77F]"></div>
// // // //           <p className="text-white mt-4">Loading data...</p>
// // // //         </div>
// // // //       </div>
// // // //     );
// // // //   }

// // // //   return (
// // // //     <div className="min-h-screen bg-black p-4">
// // // //       <div className="fixed top-4 right-4 z-10">
// // // //         <button onClick={() => router.push('/notifications')} className="relative p-4">
// // // //           <FaBell size={24} className="text-gray-600" />
// // // //           {notificationsEnabled && newNotificationCount > 0 && (
// // // //             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
// // // //               {newNotificationCount > 99 ? '99+' : newNotificationCount}
// // // //             </span>
// // // //           )}
// // // //         </button>
// // // //       </div>

// // // //       <div className="flex flex-row items-center gap-2 mb-4 mt-4">
// // // //         <h1 className="text-3xl font-bold text-white">Hi,</h1>
// // // //         <h1 className="text-3xl font-bold text-white capitalize">{username} 👋</h1>
// // // //       </div>
// // // //       <p className="text-gray-400 mb-4">Your dashboard is here 🔥</p>

// // // //       <motion.div
// // // //         animate={{ opacity: [1, 0.4, 1] }}
// // // //         transition={{ duration: 1.6, repeat: Infinity }}
// // // //         className="bg-orange-500 rounded-xl p-3 mb-4 text-center shadow-lg"
// // // //       >
// // // //         <button onClick={() => router.push('/commingsoon')} className="text-white font-bold">
// // // //           ⚡ FLASH SALE! Up to 50% OFF Data Plans! ⚡
// // // //         </button>
// // // //       </motion.div>

// // // //       <h2 className="text-xl font-semibold text-white mb-3">⚡ Quick Actions</h2>
// // // //       <div className="grid grid-cols-3 gap-2 mb-6">
// // // //         {actions.map((action, index) => (
// // // //           <motion.button
// // // //             key={index}
// // // //             onClick={() => router.push(`/${action.route}`)}
// // // //             className="bg-gray-800 rounded-xl p-4 flex flex-col items-center hover:bg-gray-700 transition-colors"
// // // //             whileTap={{ scale: 0.95 }}
// // // //           >
// // // //             <action.icon className="text-2xl mb-2" style={{ color: action.color }} />
// // // //             <span className="text-white text-xs text-center font-medium">
// // // //               {action.title.length > 12 ? `${action.title.slice(0, 11)}...` : action.title}
// // // //             </span>
// // // //           </motion.button>
// // // //         ))}
// // // //       </div>

// // // //       <h2 className="text-xl font-semibold text-white mb-3">🔥 Recent Plans</h2>
// // // //       {hasPlans ? (
// // // //         <div className="space-y-4">
// // // //           {popularPlans.map((plan, index) => (
// // // //             <motion.div
// // // //               key={`${plan.plan_id}-${index}`}
// // // //               initial={{ x: -100, opacity: 0 }}
// // // //               animate={{ x: 0, opacity: 1 }}
// // // //               transition={{ delay: index * 0.2 }}
// // // //               className="bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-700"
// // // //               onClick={() => handleSwipePurchase(plan)}
// // // //             >
// // // //               <div className="flex items-center gap-3">
// // // //                 <img src={plan.image} alt={plan.provider} className="w-12 h-12 rounded" />
// // // //                 <div className="flex-1">
// // // //                   <p className="text-white font-semibold">{plan.plan_name}</p>
// // // //                   <p className="text-gray-400 text-sm">₦{plan.amount} - {plan.validity}</p>
// // // //                 </div>
// // // //               </div>
// // // //             </motion.div>
// // // //           ))}
// // // //         </div>
// // // //       ) : (
// // // //         <div className="bg-gray-800 rounded-xl p-4 text-center">
// // // //           <p className="text-gray-400">No recent purchases found in the last 24 hours.</p>
// // // //         </div>
// // // //       )}

// // // //       {/* PIN Modal placeholder */}
// // // //       {createPinModalVisible && (
// // // //         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
// // // //           {/* Modal content */}
// // // //         </div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // }

// // // app/(protected)/home/page.tsx
// // import { createServerClient } from '@/lib/supabase';
// // import { redirect } from 'next/navigation';
// // import { Suspense } from 'react';
// // import { actions, DEFAULT_PROVIDER_IMAGE, NETWORK_IMAGES } from '@/constants/helper'; // Ensure these are ported from RN constants
// // import ClientNotificationBadge from './ClientNotificationBadge';
// // import ClientFlashSaleBanner from './ClientFlashSaleBanner';
// // import ClientQuickActions from './ClientQuickActions';
// // import ClientRecentPlans from './ClientRecentPlans';
// // import ClientPinModal from './ClientPinModal';

// // interface Purchase {
// //   plan_name: string;
// //   provider_name: string;
// //   validity: string;
// //   mobile_number: string;
// //   network_id: string;
// //   plan_id: string;
// //   created_at: string;
// //   user_email: string;
// // }

// // export default async function HomePage() {
// //   const supabase = await createServerClient();
// //   const {
// //     data: { user },
// //     error,
// //   } = await supabase.auth.getUser();

// //   if (error || !user) {
// //     redirect('/sign-in');
// //   }

// //   // Fetch profile (matching RN useAuth logic)
// //   const { data: profile } = await supabase
// //     .from('profiles')
// //     .select('username, phone, user_metadata')
// //     .eq('id', user.id)
// //     .single() || { data: null };

// //   // Fetch purchase history (exact RN query)
// //   const now = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
// //   const { data: purchaseHistory = [] } = await supabase
// //     .from('data_purchases')
// //     .select(
// //       'plan_name, provider_name, validity, mobile_number, network_id, plan_id, created_at, user_email'
// //     )
// //     .eq('user_email', user.email)
// //     .gte('created_at', now)
// //     .order('created_at', { ascending: false });

// //   // Fetch new notification count (exact RN query; assume notificationsEnabled=true for SSR)
// //   const { count: newNotificationCount = 0 } = await supabase
// //     .from('notifications')
// //     .select('id', { count: 'exact', head: true })
// //     .eq('user_id', user.id)
// //     .eq('is_read', false)
// //     .gte('created_at', now);

// //   // Server-side popular plans computation (exact RN logic)
// //   const popularPlans = purchaseHistory.map((p: Purchase) => {
// //     const amountMatch = p.plan_name?.match(/₦(\d+)/);
// //     const provider = p.provider_name || getProviderFromPlan(p.plan_name || '');
// //     const displayPlanName = p.plan_name?.includes(provider)
// //       ? p.plan_name
// //       : `${provider} ${p.plan_name || 'Unknown Plan'}`;
// //     return {
// //       plan_name: displayPlanName,
// //       provider,
// //       image: NETWORK_IMAGES[provider.toLowerCase()] || DEFAULT_PROVIDER_IMAGE,
// //       amount: amountMatch ? parseInt(amountMatch[1], 10) : 300,
// //       validity: p.validity || 'N/A',
// //       phone_number: p.mobile_number || (profile?.user_metadata?.phone ?? ''),
// //       network_id: p.network_id?.toString() || '0',
// //       plan_id: p.plan_id?.toString() || '0',
// //     };
// //   });

// //   const hasPlans = popularPlans.length > 0;
// //   const phoneNumber = hasPlans
// //     ? popularPlans[0].phone_number
// //     : profile?.user_metadata?.phone ?? '';
// //   const username = profile?.username || profile?.user_metadata?.username || 'Guest User';
// //   const userEmail = user.email ?? '';
// //   const hasTransactionPin = !!profile?.user_metadata?.transaction_pin_created;
// //   const notificationsEnabled = true; // Default from RN context; fetch if stored in profile

// //   // Loading state (matching RN)
// //   if (purchaseHistory?.length === 0 && newNotificationCount === undefined) {
// //     return (
// //       <div className="flex-1 flex items-center justify-center min-h-screen bg-black">
// //         <div className="text-center">
// //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D7A77F] mx-auto mb-4"></div>
// //           <p className="text-white text-base">Loading data...</p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="min-h-screen bg-black text-white px-4 pt-4 md:pt-6 pb-20">
// //       {/* Header Notification - Client for interaction */}
// //       <Suspense fallback={null}>
// //         <ClientNotificationBadge
// //           count={newNotificationCount}
// //           notificationsEnabled={notificationsEnabled}
// //           userEmail={userEmail}
// //         />
// //       </Suspense>

// //       {/* Greeting Container - Responsive */}
// //       <div className="flex flex-row items-center gap-2 mb-4 md:mb-6 mt-4 md:mt-6">
// //         <h1 className="text-2xl md:text-3xl font-bold text-white">Hi,</h1>
// //         <h1 className="text-2xl md:text-3xl font-bold text-white capitalize">{username} 👋</h1>
// //       </div>
// //       <p className="text-sm md:text-base text-gray-400 mb-4 md:mb-6">Your dashboard is here 🔥</p>

// //       {/* Flash Sale Banner - Client for animations */}
// //       <Suspense fallback={<div className="bg-orange-500 rounded-xl p-3 mb-4 text-center shadow-lg">Loading banner...</div>}>
// //         <ClientFlashSaleBanner />
// //       </Suspense>

// //       {/* Quick Actions Section - Client for presses */}
// //       <section className="mb-6 md:mb-8">
// //         <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">⚡ Quick Actions</h2>
// //         <Suspense fallback={<div className="bg-gray-800 rounded-xl p-3 md:p-4">Loading actions...</div>}>
// //           <ClientQuickActions actions={actions} user={user} />
// //         </Suspense>
// //       </section>

// //       {/* Popular Plans Section */}
// //       <section>
// //         <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">🔥 Recent Plans</h2>
// //         {hasPlans ? (
// //           <Suspense fallback={<div className="space-y-4"><div className="bg-gray-800 rounded-xl p-4 md:p-5 animate-pulse h-20"></div></div>}>
// //             <ClientRecentPlans
// //               plans={popularPlans}
// //               phoneNumber={phoneNumber}
// //               userEmail={userEmail}
// //               hasTransactionPin={hasTransactionPin}
// //               user={user}
// //             />
// //           </Suspense>
// //         ) : (
// //           <div className="bg-gray-800 rounded-xl p-4 md:p-6 text-center">
// //             <p className="text-gray-400 text-sm md:text-base">No recent purchases found in the last 24 hours.</p>
// //           </div>
// //         )}
// //       </section>

// //       {/* PIN Modal - Client, conditional render */}
// //       {/* <ClientPinModal visible={!hasTransactionPin} user={user} /> */}
// //     </div>
// //   );
// // }

// // // Server-side getProviderFromPlan (exact RN)
// // function getProviderFromPlan(plan: string): string {
// //   const planUpper = plan.toUpperCase();
// //   if (planUpper.includes('MTN')) return 'MTN';
// //   if (planUpper.includes('GLO')) return 'GLO';
// //   if (planUpper.includes('AIRTEL')) return 'AIRTEL';
// //   if (planUpper.includes('9MOBILE') || planUpper.includes('ETISALAT')) return '9MOBILE';
// //   return '';
// // }

// // app/(protected)/home/page.tsx
// import { createServerClient } from '@/lib/supabase';
// import { redirect } from 'next/navigation';
// import { Suspense } from 'react';
// import { actions, DEFAULT_PROVIDER_IMAGE, NETWORK_IMAGES } from '@/constants/helper';
// import ClientNotificationBadge from './ClientNotificationBadge';
// import ClientFlashSaleBanner from './ClientFlashSaleBanner';
// import ClientQuickActions from './ClientQuickActions';
// import ClientRecentPlans from './ClientRecentPlans';
// import ClientPinModal from './ClientPinModal';

// interface Purchase {
//   plan_name: string;
//   provider_name: string;
//   validity: string;
//   mobile_number: string;
//   network_id: string;
//   plan_id: string;
//   created_at: string;
//   user_email: string;
// }

// export default async function HomePage() {
//   const supabase = await createServerClient();
//   const {
//     data: { user },
//     error,
//   } = await supabase.auth.getUser();

//   if (error || !user) {
//     redirect('/sign-in');
//   }

//   // Fetch profile with better error handling
//   const { data: profile, error: profileError } = await supabase
//     .from('profiles')
//     .select('username, transaction_pin')
//     .eq('id', user.id)
//     .single();

//   // Debug logging (remove in production)
//   // console.log()
//   console.log('User ID:', user.id);
//   console.log('Profile data:', profile);
//   console.log('Profile error:', profileError);
//   console.log('User metadata:', user.user_metadata);

//   // Fetch purchase history (exact RN query)
//   const now = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
//   const { data: purchaseHistory = [] } = await supabase
//     .from('data_purchases')
//     .select(
//       'plan_name, provider_name, validity, mobile_number, network_id, plan_id, created_at, user_email'
//     )
//     .eq('user_email', user.email)
//     .gte('created_at', now)
//     .order('created_at', { ascending: false });

//   // Fetch new notification count (exact RN query; assume notificationsEnabled=true for SSR)
//   const { count: newNotificationCount = 0 } = await supabase
//     .from('notifications')
//     .select('id', { count: 'exact', head: true })
//     .eq('user_id', user.id)
//     .eq('is_read', false)
//     .gte('created_at', now);

//   // Server-side popular plans computation (exact RN logic)
//   const popularPlans = purchaseHistory?.map((p: Purchase) => {
//     const amountMatch = p.plan_name?.match(/₦(\d+)/);
//     const provider = p.provider_name || getProviderFromPlan(p.plan_name || '');
//     const displayPlanName = p.plan_name?.includes(provider)
//       ? p.plan_name
//       : `${provider} ${p.plan_name || 'Unknown Plan'}`;
//     return {
//       plan_name: displayPlanName,
//       provider,
//       image: NETWORK_IMAGES[provider.toLowerCase()] || DEFAULT_PROVIDER_IMAGE,
//       amount: amountMatch ? parseInt(amountMatch[1], 10) : 300,
//       validity: p.validity || 'N/A',
//       phone_number: p.mobile_number || profile?.phone || user.user_metadata?.phone || '',
//       network_id: p.network_id?.toString() || '0',
//       plan_id: p.plan_id?.toString() || '0',
//     };
//   });

//   const hasPlans = popularPlans.length > 0;
//   const phoneNumber = hasPlans
//     ? popularPlans[0].phone_number
//     : profile?.phone || user.user_metadata?.phone || '';

//   // Try multiple sources for username
//   const username =
//     profile?.username ||
//     'Guest User';

//   const userEmail = user.email ?? '';
//   const hasTransactionPin = !!(profile?.transaction_pin || user.user_metadata?.transaction_pin_created);
//   const notificationsEnabled = true;

//   // Loading state (matching RN)
//   if (purchaseHistory?.length === 0 && newNotificationCount === undefined) {
//     return (
//       <div className="flex-1 flex items-center justify-center min-h-screen bg-black">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D7A77F] mx-auto mb-4"></div>
//           <p className="text-white text-base">Loading data...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white px-4 pt-4 md:pt-6 pb-20">
//       {/* Header Notification - Client for interaction */}
//       <Suspense fallback={null}>
//         <ClientNotificationBadge
//           count={newNotificationCount}
//           notificationsEnabled={notificationsEnabled}
//           userEmail={userEmail}
//         />
//       </Suspense>

//       {/* Greeting Container - Responsive */}
//       <div className="flex flex-row items-center gap-2 mb-4 md:mb-6 mt-4 md:mt-6">
//         <h1 className="text-2xl md:text-3xl font-bold text-white">Hi,</h1>
//         <h1 className="text-2xl md:text-3xl font-bold text-white capitalize">{username} 👋</h1>
//       </div>
//       <p className="text-sm md:text-base text-gray-400 mb-4 md:mb-6">Your dashboard is here 🔥</p>

//       {/* Flash Sale Banner - Client for animations */}
//       <Suspense fallback={<div className="bg-orange-500 rounded-xl p-3 mb-4 text-center shadow-lg">Loading banner...</div>}>
//         <ClientFlashSaleBanner />
//       </Suspense>

//       {/* Quick Actions Section - Client for presses */}
//       <section className="mb-6 md:mb-8">
//         <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">⚡ Quick Actions</h2>
//         <Suspense fallback={<div className="bg-gray-800 rounded-xl p-3 md:p-4">Loading actions...</div>}>
//           <ClientQuickActions actions={actions} user={user} />
//         </Suspense>
//       </section>

//       {/* Popular Plans Section */}
//       <section>
//         <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">🔥 Recent Plans</h2>
//         {hasPlans ? (
//           <Suspense fallback={<div className="space-y-4"><div className="bg-gray-800 rounded-xl p-4 md:p-5 animate-pulse h-20"></div></div>}>
//             <ClientRecentPlans
//               plans={popularPlans}
//               phoneNumber={phoneNumber}
//               userEmail={userEmail}
//               hasTransactionPin={hasTransactionPin}
//               user={user}
//             />
//           </Suspense>
//         ) : (
//           <div className="bg-gray-800 rounded-xl p-4 md:p-6 text-center">
//             <p className="text-gray-400 text-sm md:text-base">No recent purchases found in the last 24 hours.</p>
//           </div>
//         )}
//       </section>

//       {/* PIN Modal - Client, conditional render */}
//       <ClientPinModal visible={!hasTransactionPin} onClose={} user={user} />
//     </div>
//   );
// }

// // Server-side getProviderFromPlan (exact RN)
// function getProviderFromPlan(plan: string): string {
//   const planUpper = plan.toUpperCase();
//   if (planUpper.includes('MTN')) return 'MTN';
//   if (planUpper.includes('GLO')) return 'GLO';
//   if (planUpper.includes('AIRTEL')) return 'AIRTEL';
//   if (planUpper.includes('9MOBILE') || planUpper.includes('ETISALAT')) return '9MOBILE';
//   return '';
// }

// app/(protected)/home/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  actions,
  DEFAULT_PROVIDER_IMAGE,
  NETWORK_IMAGES,
} from "@/constants/helper";
import ClientNotificationBadge from "./ClientNotificationBadge";
import ClientFlashSaleBanner from "./ClientFlashSaleBanner";
import ClientQuickActions from "./ClientQuickActions";
import ClientRecentPlans from "./ClientRecentPlans";
import ClientPinModal from "./ClientPinModal";

interface Purchase {
  plan_name: string;
  provider_name: string;
  validity: string;
  mobile_number: string;
  network_id: string;
  plan_id: string;
  created_at: string;
  user_email: string;
}

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in");
  }

  // Fetch profile - only select columns that exist
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, transaction_pin")
    .eq("id", user.id)
    .single();

  // Fetch purchase history
  const now = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: purchaseHistory = [] } = await supabase
    .from("data_purchases")
    .select(
      "plan_name, provider_name, validity, mobile_number, network_id, plan_id, created_at, user_email"
    )
    .eq("user_email", user.email)
    .gte("created_at", now)
    .order("created_at", { ascending: false });

  // Fetch new notification count
  const { count: newNotificationCount = 0 } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .gte("created_at", now);

  // Server-side popular plans computation
  const popularPlans = purchaseHistory?.map((p: Purchase) => {
    const amountMatch = p.plan_name?.match(/₦(\d+)/);
    const provider = p.provider_name || getProviderFromPlan(p.plan_name || "");
    const displayPlanName = p.plan_name?.includes(provider)
      ? p.plan_name
      : `${provider} ${p.plan_name || "Unknown Plan"}`;
    return {
      plan_name: displayPlanName,
      provider,
      image: NETWORK_IMAGES[provider.toLowerCase()] || DEFAULT_PROVIDER_IMAGE,
      amount: amountMatch ? parseInt(amountMatch[1], 10) : 300,
      validity: p.validity || "N/A",
      phone_number:
        p.mobile_number || user.user_metadata?.phone || user.phone || "",
      network_id: p.network_id?.toString() || "0",
      plan_id: p.plan_id?.toString() || "0",
    };
  });

  const hasPlans = popularPlans.length > 0;
  const phoneNumber = hasPlans
    ? popularPlans[0].phone_number
    : user.user_metadata?.phone || user.phone || "";

  // Get username from user_metadata (where it's actually stored)
  const username =
    user.user_metadata?.username ||
    profile?.username ||
    user.email?.split("@")[0] ||
    "User";

  const userEmail = user.email ?? "";
  const hasTransactionPin = !!(
    profile?.transaction_pin || user.user_metadata?.transaction_pin_created
  );
  const notificationsEnabled = true;

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-4 md:pt-6 pb-20">
      {/* Header Notification - Client for interaction */}
      <Suspense fallback={null}>
        <ClientNotificationBadge
          count={newNotificationCount}
          notificationsEnabled={notificationsEnabled}
          userEmail={userEmail}
        />
      </Suspense>

      {/* Greeting Container - Responsive */}
      <div className="flex flex-row items-center gap-2 mb-4 md:mb-6 mt-4 md:mt-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Hi,</h1>
        <h1 className="text-2xl md:text-3xl font-bold text-white capitalize">
          {username} 👋
        </h1>
      </div>
      <p className="text-sm md:text-base text-gray-400 mb-4 md:mb-6">
        Your dashboard is here 🔥
      </p>

      {/* Flash Sale Banner - Client for animations */}
      <Suspense
        fallback={
          <div className="bg-orange-500 rounded-xl p-3 mb-4 text-center shadow-lg">
            Loading banner...
          </div>
        }
      >
        <ClientFlashSaleBanner />
      </Suspense>

      {/* Quick Actions Section - Client for presses */}
      <section className="mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
          ⚡ Quick Actions
        </h2>
        <Suspense
          fallback={
            <div className="bg-gray-800 rounded-xl p-3 md:p-4">
              Loading actions...
            </div>
          }
        >
          <ClientQuickActions actions={actions} user={user} />
        </Suspense>
      </section>

      {/* Popular Plans Section */}
      <section>
        <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
          🔥 Recent Plans
        </h2>
        {hasPlans ? (
          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl p-4 md:p-5 animate-pulse h-20"></div>
              </div>
            }
          >
            <ClientRecentPlans
              plans={popularPlans}
              phoneNumber={phoneNumber}
              userEmail={userEmail}
              hasTransactionPin={hasTransactionPin}
              user={user}
            />
          </Suspense>
        ) : (
          <div className="bg-gray-800 rounded-xl p-4 md:p-6 text-center">
            <p className="text-gray-400 text-sm md:text-base">
              No recent purchases found in the last 24 hours.
            </p>
          </div>
        )}
      </section>

      {/* PIN Modal - Client, conditional render */}
      <ClientPinModal visible={!hasTransactionPin} user={user} />
    </div>
  );
}

// Server-side getProviderFromPlan (exact RN)
function getProviderFromPlan(plan: string): string {
  const planUpper = plan.toUpperCase();
  if (planUpper.includes("MTN")) return "MTN";
  if (planUpper.includes("GLO")) return "GLO";
  if (planUpper.includes("AIRTEL")) return "AIRTEL";
  if (planUpper.includes("9MOBILE") || planUpper.includes("ETISALAT"))
    return "9MOBILE";
  return "";
}
