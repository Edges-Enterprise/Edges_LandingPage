// // Create PIN Modal Component

"use client";

import { useState } from "react";
import { IoClose, IoEye, IoEyeOff, IoReloadOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { createTransactionPinAction } from "@/app/actions/wallet";

interface CreatePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; // pass logged-in user
}

export const CreatePinModal = ({ isOpen, onClose, user }: CreatePinModalProps) => {
  const router = useRouter();
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError(null);

    // Validation
    if (newPin.length < 4 || newPin.length > 6) {
      setError("PIN must be between 4 and 6 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    if (!user) {
      setError("You must be logged in to create a PIN.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createTransactionPinAction(newPin);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      alert("Transaction PIN created successfully.");
      setNewPin("");
      setConfirmPin("");
      setShowNewPin(false);
      setShowConfirmPin(false);
      setIsLoading(false);
      onClose();
      router.refresh();
    } catch (err: any) {
      console.error("Create PIN error:", err);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const isSaveDisabled =
    isLoading || newPin.length < 4 || newPin.length > 6 || newPin !== confirmPin;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-md p-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-4">
          <h2 className="text-lg md:text-xl font-bold text-white">
            Create Transaction PIN
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <IoClose size={24} className="text-white" />
          </button>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-500 text-sm mb-2 text-center">{error}</p>}

        {/* Inputs */}
        <div className="space-y-4">
          {/* New PIN */}
          <div className="relative">
            <input
              type={showNewPin ? "text" : "password"}
              value={newPin}
              onChange={(e) =>
                setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="New PIN (4-6 digits)"
              maxLength={6}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#744925]"
            />
            <button
              type="button"
              onClick={() => setShowNewPin(!showNewPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-700 rounded-full transition-colors"
            >
              {showNewPin ? (
                <IoEyeOff size={20} className="text-gray-400" />
              ) : (
                <IoEye size={20} className="text-gray-400" />
              )}
            </button>
          </div>

          {/* Confirm PIN */}
          <div className="relative">
            <input
              type={showConfirmPin ? "text" : "password"}
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Confirm PIN (4-6 digits)"
              maxLength={6}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#744925]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPin(!showConfirmPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-700 rounded-full transition-colors"
            >
              {showConfirmPin ? (
                <IoEyeOff size={20} className="text-gray-400" />
              ) : (
                <IoEye size={20} className="text-gray-400" />
              )}
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="w-full bg-[#744925] hover:bg-[#8B5530] text-white py-3 rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <IoReloadOutline size={20} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


// import { IoWifi,IoSearch,IoGift,IoClose,IoEye,IoEyeOff, IoArrowBackOutline,IoFlash, IoReloadOutline,IoCalendar, IoArrowForwardOutline } from "react-icons/io5";
// import { createTransactionPinAction } from "@/app/actions/wallet";

// export const CreatePinModal = ({
//   isOpen,
//   onClose,
//   newPin,
//   setNewPin,
//   confirmPin,
//   setConfirmPin,
//   showNewPin,
//   setShowNewPin,
//   showConfirmPin,
//   setShowConfirmPin,
//   onSave,
//   isLoading,
// }: any) => {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
//       <div className="bg-gray-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-md animate-slide-up">
//         <div className="border-b border-gray-800 p-4 flex items-center justify-between">
//           <h2 className="text-lg md:text-xl font-bold text-white">
//             Create Transaction PIN
//           </h2>
//           <button
//             onClick={onClose}
//             className="p-2 hover:bg-gray-800 rounded-full transition-colors"
//           >
//             <IoClose size={24} className="text-white" />
//           </button>
//         </div>

//         <div className="p-4 space-y-4">
//           {/* New PIN */}
//           <div className="relative">
//             <input
//               type={showNewPin ? "text" : "password"}
//               value={newPin}
//               onChange={(e) =>
//                 setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
//               }
//               placeholder="New PIN (4-6 digits)"
//               maxLength={6}
//               className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#744925]"
//             />
//             <button
//               onClick={() => setShowNewPin(!showNewPin)}
//               className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-700 rounded-full transition-colors"
//             >
//               {showNewPin ? (
//                 <IoEyeOff size={20} className="text-gray-400" />
//               ) : (
//                 <IoEye size={20} className="text-gray-400" />
//               )}
//             </button>
//           </div>

//           {/* Confirm PIN */}
//           <div className="relative">
//             <input
//               type={showConfirmPin ? "text" : "password"}
//               value={confirmPin}
//               onChange={(e) =>
//                 setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
//               }
//               placeholder="Confirm PIN (4-6 digits)"
//               maxLength={6}
//               className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#744925]"
//             />
//             <button
//               onClick={() => setShowConfirmPin(!showConfirmPin)}
//               className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-700 rounded-full transition-colors"
//             >
//               {showConfirmPin ? (
//                 <IoEyeOff size={20} className="text-gray-400" />
//               ) : (
//                 <IoEye size={20} className="text-gray-400" />
//               )}
//             </button>
//           </div>

//           {/* Save Button */}
//           <button
//             onClick={onSave}
//             disabled={isLoading}
//             className="w-full bg-[#744925] hover:bg-[#8B5530] text-white py-3 rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
//           >
//             {isLoading ? (
//               <>
//                 <IoReloadOutline size={20} className="animate-spin" />
//                 Saving...
//               </>
//             ) : (
//               "Save"
//             )}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };