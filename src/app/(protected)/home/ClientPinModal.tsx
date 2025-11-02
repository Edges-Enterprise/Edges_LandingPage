// // // // // app/(protected)/home/ClientPinModal.tsx
// // // // "use client";

// // // // import { useState } from "react";
// // // // import { motion } from "framer-motion";
// // // // import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// // // // interface Props {
// // // //   visible: boolean;
// // // //   onClose: () => void;
// // // //   user: any;
// // // // }

// // // // export default function ClientPinModal({ visible, onClose, user }: Props) {
// // // //   const supabase = createClientComponentClient();
// // // //   const [newPin, setNewPin] = useState("");
// // // //   const [confirmPin, setConfirmPin] = useState("");
// // // //   const [showNewPin, setShowNewPin] = useState(false);
// // // //   const [showConfirmPin, setShowConfirmPin] = useState(false);
// // // //   const [isPinLoading, setIsPinLoading] = useState(false);

// // // //   const closeCreateModal = () => {
// // // //     onClose();
// // // //     setNewPin("");
// // // //     setConfirmPin("");
// // // //     setIsPinLoading(false);
// // // //   };

// // // //   const handleCreatePin = async () => {
// // // //     if (
// // // //       newPin.length < 4 ||
// // // //       newPin.length > 6 ||
// // // //       confirmPin.length < 4 ||
// // // //       confirmPin.length > 6
// // // //     ) {
// // // //       alert("PIN must be between 4 and 6 digits.");
// // // //       return;
// // // //     }
// // // //     if (newPin !== confirmPin) {
// // // //       alert("PINs do not match.");
// // // //       return;
// // // //     }

// // // //     if (!user) {
// // // //       alert("You must be logged in to create a PIN.");
// // // //       return;
// // // //     }

// // // //     setIsPinLoading(true);
// // // //     try {
// // // //       const { error } = await supabase.auth.updateUser({
// // // //         data: {
// // // //           transaction_pin: newPin,
// // // //           transaction_pin_created: true,
// // // //         },
// // // //       });
// // // //       if (error) throw error;
// // // //       closeCreateModal();
// // // //       alert("Transaction PIN created successfully.");
// // // //     } catch (error) {
// // // //       console.error("PIN creation error:", error);
// // // //       alert("Failed to save PIN. Please try again.");
// // // //     } finally {
// // // //       setIsPinLoading(false);
// // // //     }
// // // //   };

// // // //   if (!visible) return null;

// // // //   return (
// // // //     <motion.div
// // // //       initial={{ opacity: 0 }}
// // // //       animate={{ opacity: 1 }}
// // // //       exit={{ opacity: 0 }}
// // // //       className="fixed inset-0 bg-black bg-opacity-0 flex items-center justify-center z-50 p-4"
// // // //       onClick={closeCreateModal}
// // // //     >
// // // //       <motion.div
// // // //         initial={{ scale: 0.9, y: 20 }}
// // // //         animate={{ scale: 1, y: 0 }}
// // // //         className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
// // // //         onClick={(e) => e.stopPropagation()}
// // // //       >
// // // //         <h2 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
// // // //           Create Transaction PIN
// // // //         </h2>
// // // //         <div className="space-y-4">
// // // //           <div>
// // // //             <label className="block text-gray-400 text-sm mb-1">New PIN</label>
// // // //             <input
// // // //               type={showNewPin ? "text" : "password"}
// // // //               value={newPin}
// // // //               onChange={(e) =>
// // // //                 setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
// // // //               }
// // // //               className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
// // // //               maxLength={6}
// // // //               placeholder="Enter 4-6 digits"
// // // //             />
// // // //             <button
// // // //               type="button"
// // // //               onClick={() => setShowNewPin(!showNewPin)}
// // // //               className="text-gray-400 text-sm mt-1 hover:text-white transition-colors"
// // // //             >
// // // //               {showNewPin ? "Hide" : "Show"}
// // // //             </button>
// // // //           </div>
// // // //           <div>
// // // //             <label className="block text-gray-400 text-sm mb-1">
// // // //               Confirm PIN
// // // //             </label>
// // // //             <input
// // // //               type={showConfirmPin ? "text" : "password"}
// // // //               value={confirmPin}
// // // //               onChange={(e) =>
// // // //                 setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
// // // //               }
// // // //               className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
// // // //               maxLength={6}
// // // //               placeholder="Confirm 4-6 digits"
// // // //             />
// // // //             <button
// // // //               type="button"
// // // //               onClick={() => setShowConfirmPin(!showConfirmPin)}
// // // //               className="text-gray-400 text-sm mt-1 hover:text-white transition-colors"
// // // //             >
// // // //               {showConfirmPin ? "Hide" : "Show"}
// // // //             </button>
// // // //           </div>
// // // //           <div className="flex gap-2 pt-4">
// // // //             <button
// // // //               type="button"
// // // //               onClick={closeCreateModal}
// // // //               className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
// // // //               disabled={isPinLoading}
// // // //             >
// // // //               Cancel
// // // //             </button>
// // // //             <button
// // // //               type="button"
// // // //               onClick={handleCreatePin}
// // // //               className="flex-1 bg-green-500 hover:bg-green-600 text-black py-3 rounded-lg font-semibold transition-colors"
// // // //               disabled={
// // // //                 isPinLoading || newPin !== confirmPin || newPin.length < 4
// // // //               }
// // // //             >
// // // //               {isPinLoading ? (
// // // //                 <span className="flex items-center justify-center gap-2">
// // // //                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
// // // //                   Creating...
// // // //                 </span>
// // // //               ) : (
// // // //                 "Create PIN"
// // // //               )}
// // // //             </button>
// // // //           </div>
// // // //         </div>
// // // //       </motion.div>
// // // //     </motion.div>
// // // //   );
// // // // }


// // // // app/(protected)/home/ClientPinModal.tsx
// // // "use client";

// // // import { useState } from "react";
// // // import { motion } from "framer-motion";
// // // import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
// // // import { useRouter } from "next/navigation";

// // // interface Props {
// // //   visible: boolean;
// // //   user: any;
// // // }

// // // export default function ClientPinModal({ visible, user }: Props) {
// // //   const supabase = createClientComponentClient();
// // //   const router = useRouter();
// // //   const [isVisible, setIsVisible] = useState(visible);
// // //   const [newPin, setNewPin] = useState("");
// // //   const [confirmPin, setConfirmPin] = useState("");
// // //   const [showNewPin, setShowNewPin] = useState(false);
// // //   const [showConfirmPin, setShowConfirmPin] = useState(false);
// // //   const [isPinLoading, setIsPinLoading] = useState(false);

// // //   const closeCreateModal = () => {
// // //     setIsVisible(false);
// // //     setNewPin("");
// // //     setConfirmPin("");
// // //     setIsPinLoading(false);
// // //   };

// // //   const handleCreatePin = async () => {
// // //     if (
// // //       newPin.length < 4 ||
// // //       newPin.length > 6 ||
// // //       confirmPin.length < 4 ||
// // //       confirmPin.length > 6
// // //     ) {
// // //       alert("PIN must be between 4 and 6 digits.");
// // //       return;
// // //     }
// // //     if (newPin !== confirmPin) {
// // //       alert("PINs do not match.");
// // //       return;
// // //     }

// // //     if (!user) {
// // //       alert("You must be logged in to create a PIN.");
// // //       return;
// // //     }

// // //     setIsPinLoading(true);
// // //     try {
// // //       // Update both user metadata and profiles table
// // //       const { error: authError } = await supabase.auth.updateUser({
// // //         data: {
// // //           transaction_pin: newPin,
// // //           transaction_pin_created: true,
// // //         },
// // //       });
      
// // //       if (authError) throw authError;

// // //       // Also update the profiles table
// // //       const { error: profileError } = await supabase
// // //         .from('profiles')
// // //         .update({ transaction_pin: newPin })
// // //         .eq('id', user.id);

// // //       if (profileError) throw profileError;

// // //       closeCreateModal();
// // //       alert("Transaction PIN created successfully.");
      
// // //       // Refresh the page to update the UI
// // //       router.refresh();
// // //     } catch (error) {
// // //       console.error("PIN creation error:", error);
// // //       alert("Failed to save PIN. Please try again.");
// // //     } finally {
// // //       setIsPinLoading(false);
// // //     }
// // //   };

// // //   // Use internal state to control visibility
// // //   if (!visible || !isVisible) return null;

// // //   return (
// // //     <motion.div
// // //       initial={{ opacity: 0 }}
// // //       animate={{ opacity: 1 }}
// // //       exit={{ opacity: 0 }}
// // //       className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
// // //       onClick={closeCreateModal}
// // //     >
// // //       <motion.div
// // //         initial={{ scale: 0.9, y: 20 }}
// // //         animate={{ scale: 1, y: 0 }}
// // //         className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
// // //         onClick={(e) => e.stopPropagation()}
// // //       >
// // //         <h2 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
// // //           Create Transaction PIN
// // //         </h2>
// // //         <p className="text-gray-400 text-sm text-center mb-6">
// // //           Secure your transactions with a PIN between 4-6 digits
// // //         </p>
// // //         <div className="space-y-4">
// // //           <div>
// // //             <label className="block text-gray-400 text-sm mb-1">New PIN</label>
// // //             <input
// // //               type={showNewPin ? "text" : "password"}
// // //               value={newPin}
// // //               onChange={(e) =>
// // //                 setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
// // //               }
// // //               className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
// // //               maxLength={6}
// // //               placeholder="Enter 4-6 digits"
// // //             />
// // //             <button
// // //               type="button"
// // //               onClick={() => setShowNewPin(!showNewPin)}
// // //               className="text-gray-400 text-sm mt-1 hover:text-white transition-colors"
// // //             >
// // //               {showNewPin ? "Hide" : "Show"}
// // //             </button>
// // //           </div>
// // //           <div>
// // //             <label className="block text-gray-400 text-sm mb-1">
// // //               Confirm PIN
// // //             </label>
// // //             <input
// // //               type={showConfirmPin ? "text" : "password"}
// // //               value={confirmPin}
// // //               onChange={(e) =>
// // //                 setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
// // //               }
// // //               className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
// // //               maxLength={6}
// // //               placeholder="Confirm 4-6 digits"
// // //             />
// // //             <button
// // //               type="button"
// // //               onClick={() => setShowConfirmPin(!showConfirmPin)}
// // //               className="text-gray-400 text-sm mt-1 hover:text-white transition-colors"
// // //             >
// // //               {showConfirmPin ? "Hide" : "Show"}
// // //             </button>
// // //           </div>
// // //           <div className="flex gap-2 pt-4">
// // //             <button
// // //               type="button"
// // //               onClick={closeCreateModal}
// // //               className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
// // //               disabled={isPinLoading}
// // //             >
// // //               Skip for now
// // //             </button>
// // //             <button
// // //               type="button"
// // //               onClick={handleCreatePin}
// // //               className="flex-1 bg-[#D7A77F] hover:bg-[#c09670] text-black py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
// // //               disabled={
// // //                 isPinLoading || newPin !== confirmPin || newPin.length < 4
// // //               }
// // //             >
// // //               {isPinLoading ? (
// // //                 <span className="flex items-center justify-center gap-2">
// // //                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
// // //                   Creating...
// // //                 </span>
// // //               ) : (
// // //                 "Create PIN"
// // //               )}
// // //             </button>
// // //           </div>
// // //         </div>
// // //       </motion.div>
// // //     </motion.div>
// // //   );
// // // }

// // // app/(protected)/home/ClientPinModal.tsx
// // "use client";

// // import { useState } from "react";
// // import { motion } from "framer-motion";
// // import { useRouter } from "next/navigation";

// // interface Props {
// //   visible: boolean;
// //   user: any;
// // }

// // export default function ClientPinModal({ visible, user }: Props) {
// //   const router = useRouter();
// //   const [isVisible, setIsVisible] = useState(visible);
// //   const [newPin, setNewPin] = useState("");
// //   const [confirmPin, setConfirmPin] = useState("");
// //   const [showNewPin, setShowNewPin] = useState(false);
// //   const [showConfirmPin, setShowConfirmPin] = useState(false);
// //   const [isPinLoading, setIsPinLoading] = useState(false);

// //   const closeCreateModal = () => {
// //     setIsVisible(false);
// //     setNewPin("");
// //     setConfirmPin("");
// //     setIsPinLoading(false);
// //   };

// //   const handleCreatePin = async () => {
// //     if (
// //       newPin.length < 4 ||
// //       newPin.length > 6 ||
// //       confirmPin.length < 4 ||
// //       confirmPin.length > 6
// //     ) {
// //       alert("PIN must be between 4 and 6 digits.");
// //       return;
// //     }
// //     if (newPin !== confirmPin) {
// //       alert("PINs do not match.");
// //       return;
// //     }

// //     if (!user) {
// //       alert("You must be logged in to create a PIN.");
// //       return;
// //     }

// //     setIsPinLoading(true);
// //     try {
// //       // Update both user metadata and profiles table
// //       const { error: authError } = await supabase.auth.updateUser({
// //         data: {
// //           transaction_pin: newPin,
// //           transaction_pin_created: true,
// //         },
// //       });
      
// //       if (authError) throw authError;

// //       // Also update the profiles table
// //       const { error: profileError } = await supabase
// //         .from('profiles')
// //         .update({ transaction_pin: newPin })
// //         .eq('id', user.id);

// //       if (profileError) throw profileError;

// //       closeCreateModal();
// //       alert("Transaction PIN created successfully.");
      
// //       // Refresh the page to update the UI
// //       router.refresh();
// //     } catch (error) {
// //       console.error("PIN creation error:", error);
// //       alert("Failed to save PIN. Please try again.");
// //     } finally {
// //       setIsPinLoading(false);
// //     }
// //   };

// //   // Use internal state to control visibility
// //   if (!visible || !isVisible) return null;

// //   return (
// //     <motion.div
// //       initial={{ opacity: 0 }}
// //       animate={{ opacity: 1 }}
// //       exit={{ opacity: 0 }}
// //       className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
// //       onClick={closeCreateModal}
// //     >
// //       <motion.div
// //         initial={{ scale: 0.9, y: 20 }}
// //         animate={{ scale: 1, y: 0 }}
// //         className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
// //         onClick={(e) => e.stopPropagation()}
// //       >
// //         <h2 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
// //           Create Transaction PIN
// //         </h2>
// //         <p className="text-gray-400 text-sm text-center mb-6">
// //           Secure your transactions with a PIN between 4-6 digits
// //         </p>
// //         <div className="space-y-4">
// //           <div>
// //             <label className="block text-gray-400 text-sm mb-1">New PIN</label>
// //             <input
// //               type={showNewPin ? "text" : "password"}
// //               value={newPin}
// //               onChange={(e) =>
// //                 setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
// //               }
// //               className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
// //               maxLength={6}
// //               placeholder="Enter 4-6 digits"
// //             />
// //             <button
// //               type="button"
// //               onClick={() => setShowNewPin(!showNewPin)}
// //               className="text-gray-400 text-sm mt-1 hover:text-white transition-colors"
// //             >
// //               {showNewPin ? "Hide" : "Show"}
// //             </button>
// //           </div>
// //           <div>
// //             <label className="block text-gray-400 text-sm mb-1">
// //               Confirm PIN
// //             </label>
// //             <input
// //               type={showConfirmPin ? "text" : "password"}
// //               value={confirmPin}
// //               onChange={(e) =>
// //                 setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
// //               }
// //               className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
// //               maxLength={6}
// //               placeholder="Confirm 4-6 digits"
// //             />
// //             <button
// //               type="button"
// //               onClick={() => setShowConfirmPin(!showConfirmPin)}
// //               className="text-gray-400 text-sm mt-1 hover:text-white transition-colors"
// //             >
// //               {showConfirmPin ? "Hide" : "Show"}
// //             </button>
// //           </div>
// //           <div className="flex gap-2 pt-4">
// //             <button
// //               type="button"
// //               onClick={closeCreateModal}
// //               className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
// //               disabled={isPinLoading}
// //             >
// //               Skip for now
// //             </button>
// //             <button
// //               type="button"
// //               onClick={handleCreatePin}
// //               className="flex-1 bg-[#D7A77F] hover:bg-[#c09670] text-black py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
// //               disabled={
// //                 isPinLoading || newPin !== confirmPin || newPin.length < 4
// //               }
// //             >
// //               {isPinLoading ? (
// //                 <span className="flex items-center justify-center gap-2">
// //                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
// //                   Creating...
// //                 </span>
// //               ) : (
// //                 "Create PIN"
// //               )}
// //             </button>
// //           </div>
// //         </div>
// //       </motion.div>
// //     </motion.div>
// //   );
// // }

// // app/(protected)/home/ClientPinModal.tsx
// "use client";

// import { useState } from "react";
// import { motion } from "framer-motion";
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
// import { useRouter } from "next/navigation";

// interface Props {
//   visible: boolean;
//   user: any;
// }

// export default function ClientPinModal({ visible, user }: Props) {
//   const supabase = createClientComponentClient();
//   const router = useRouter();
//   const [isVisible, setIsVisible] = useState(visible);
//   const [newPin, setNewPin] = useState("");
//   const [confirmPin, setConfirmPin] = useState("");
//   const [showNewPin, setShowNewPin] = useState(false);
//   const [showConfirmPin, setShowConfirmPin] = useState(false);
//   const [isPinLoading, setIsPinLoading] = useState(false);

//   const closeCreateModal = () => {
//     setIsVisible(false);
//     setNewPin("");
//     setConfirmPin("");
//     setIsPinLoading(false);
//   };

//   const handleCreatePin = async () => {
//     if (
//       newPin.length < 4 ||
//       newPin.length > 6 ||
//       confirmPin.length < 4 ||
//       confirmPin.length > 6
//     ) {
//       alert("PIN must be between 4 and 6 digits.");
//       return;
//     }
//     if (newPin !== confirmPin) {
//       alert("PINs do not match.");
//       return;
//     }

//     if (!user) {
//       alert("You must be logged in to create a PIN.");
//       return;
//     }

//     setIsPinLoading(true);
//     try {
//       // Update both user metadata and profiles table
//       const { error: authError } = await supabase.auth.updateUser({
//         data: {
//           transaction_pin: newPin,
//           transaction_pin_created: true,
//         },
//       });
      
//       if (authError) throw authError;

//       // Also update the profiles table
//       const { error: profileError } = await supabase
//         .from('profiles')
//         .update({ transaction_pin: newPin })
//         .eq('id', user.id);

//       if (profileError) throw profileError;

//       closeCreateModal();
//       alert("Transaction PIN created successfully.");
      
//       // Refresh the page to update the UI
//       router.refresh();
//     } catch (error) {
//       console.error("PIN creation error:", error);
//       alert("Failed to save PIN. Please try again.");
//     } finally {
//       setIsPinLoading(false);
//     }
//   };

//   // Use internal state to control visibility
//   if (!visible || !isVisible) return null;

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }}
//       className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
//       onClick={closeCreateModal}
//     >
//       <motion.div
//         initial={{ scale: 0.9, y: 20 }}
//         animate={{ scale: 1, y: 0 }}
//         className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <h2 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
//           Create Transaction PIN
//         </h2>
//         <p className="text-gray-400 text-sm text-center mb-6">
//           Secure your transactions with a PIN between 4-6 digits
//         </p>
//         <div className="space-y-4">
//           <div>
//             <label className="block text-gray-400 text-sm mb-1">New PIN</label>
//             <input
//               type={showNewPin ? "text" : "password"}
//               value={newPin}
//               onChange={(e) =>
//                 setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
//               }
//               className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
//               maxLength={6}
//               placeholder="Enter 4-6 digits"
//             />
//             <button
//               type="button"
//               onClick={() => setShowNewPin(!showNewPin)}
//               className="text-gray-400 text-sm mt-1 hover:text-white transition-colors"
//             >
//               {showNewPin ? "Hide" : "Show"}
//             </button>
//           </div>
//           <div>
//             <label className="block text-gray-400 text-sm mb-1">
//               Confirm PIN
//             </label>
//             <input
//               type={showConfirmPin ? "text" : "password"}
//               value={confirmPin}
//               onChange={(e) =>
//                 setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
//               }
//               className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
//               maxLength={6}
//               placeholder="Confirm 4-6 digits"
//             />
//             <button
//               type="button"
//               onClick={() => setShowConfirmPin(!showConfirmPin)}
//               className="text-gray-400 text-sm mt-1 hover:text-white transition-colors"
//             >
//               {showConfirmPin ? "Hide" : "Show"}
//             </button>
//           </div>
//           <div className="flex gap-2 pt-4">
//             <button
//               type="button"
//               onClick={closeCreateModal}
//               className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
//               disabled={isPinLoading}
//             >
//               Skip for now
//             </button>
//             <button
//               type="button"
//               onClick={handleCreatePin}
//               className="flex-1 bg-[#D7A77F] hover:bg-[#c09670] text-black py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//               disabled={
//                 isPinLoading || newPin !== confirmPin || newPin.length < 4
//               }
//             >
//               {isPinLoading ? (
//                 <span className="flex items-center justify-center gap-2">
//                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
//                   Creating...
//                 </span>
//               ) : (
//                 "Create PIN"
//               )}
//             </button>
//           </div>
//         </div>
//       </motion.div>
//     </motion.div>
//   );
// }

// app/(protected)/home/ClientPinModal.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

interface Props {
  visible: boolean;
  user: any;
}

export default function ClientPinModal({ visible, user }: Props) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(visible);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isPinLoading, setIsPinLoading] = useState(false);

  const closeCreateModal = () => {
    setIsVisible(false);
    setNewPin("");
    setConfirmPin("");
    setIsPinLoading(false);
  };

  const handleCreatePin = async () => {
    if (
      newPin.length < 4 ||
      newPin.length > 6 ||
      confirmPin.length < 4 ||
      confirmPin.length > 6
    ) {
      alert("PIN must be between 4 and 6 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      alert("PINs do not match.");
      return;
    }

    if (!user) {
      alert("You must be logged in to create a PIN.");
      return;
    }

    setIsPinLoading(true);
    try {
      // Call the API route to create PIN on the server
      const response = await fetch('/api/create-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: newPin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create PIN');
      }

      closeCreateModal();
      alert("Transaction PIN created successfully.");
      
      // Refresh the page to update the UI
      router.refresh();
    } catch (error) {
      console.error("PIN creation error:", error);
      alert("Failed to save PIN. Please try again.");
    } finally {
      setIsPinLoading(false);
    }
  };

  // Use internal state to control visibility
  if (!visible || !isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={closeCreateModal}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4 text-center">
          Create Transaction PIN
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          Secure your transactions with a PIN between 4-6 digits
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">New PIN</label>
            <input
              type={showNewPin ? "text" : "password"}
              value={newPin}
              onChange={(e) =>
                setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
              maxLength={6}
              placeholder="Enter 4-6 digits"
            />
            <button
              type="button"
              onClick={() => setShowNewPin(!showNewPin)}
              className="text-gray-400 text-sm mt-1 hover:text-white transition-colors"
            >
              {showNewPin ? "Hide" : "Show"}
            </button>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              Confirm PIN
            </label>
            <input
              type={showConfirmPin ? "text" : "password"}
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-[#d7a77f] focus:outline-none"
              maxLength={6}
              placeholder="Confirm 4-6 digits"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPin(!showConfirmPin)}
              className="text-gray-400 text-sm mt-1 hover:text-white transition-colors"
            >
              {showConfirmPin ? "Hide" : "Show"}
            </button>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={closeCreateModal}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
              disabled={isPinLoading}
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleCreatePin}
              className="flex-1 bg-[#D7A77F] hover:bg-[#c09670] text-black py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                isPinLoading || newPin !== confirmPin || newPin.length < 4
              }
            >
              {isPinLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Creating...
                </span>
              ) : (
                "Create PIN"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}