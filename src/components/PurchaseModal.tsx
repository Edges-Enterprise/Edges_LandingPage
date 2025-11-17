// components/PurchaseModal.tsx
import { IoClose, IoEye, IoEyeOff } from "react-icons/io5";

export const PurchaseModal = ({
  isOpen,
  onClose,
  bundle,
  phoneNumber,
  setPhoneNumber,
  transactionPin,
  setTransactionPin,
  showPin,
  setShowPin,
  hasPin,
  error,
  onCreatePin,
  onContinue,
  isPurchasing,
}: any) => {
  if (!isOpen) return null;

  const isContinueDisabled =
    isPurchasing ||
    phoneNumber.length !== 11 ||
    transactionPin.length < 4 ||
    transactionPin.length > 6;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold text-white">
            {bundle?.data}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <IoClose size={24} className="text-white" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Plan Details */}
          <div className="bg-gray-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Amount:</span>
              <span className="text-white font-semibold">
                ₦{bundle?.price?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Validity:</span>
              <span className="text-white font-semibold">
                {bundle?.validity}
              </span>
            </div>
            {bundle?.planType && bundle.planType !== "HOT" && (
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Plan Type:</span>
                <span className="text-white font-semibold">
                  {bundle.planType.replace(/_/g, " ")}
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Phone Number */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) =>
                setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 11))
              }
              placeholder="Enter 11-digit phone number"
              maxLength={11}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#744925]"
            />
            {phoneNumber && phoneNumber.length !== 11 && (
              <p className="text-gray-500 text-xs mt-1">
                Phone number must be 11 digits
              </p>
            )}
          </div>

          {/* Transaction PIN */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              Transaction PIN{" "}
              {!hasPin && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={transactionPin}
                onChange={(e) =>
                  setTransactionPin(
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                placeholder={
                  hasPin ? "Enter your PIN" : "Create a transaction PIN first"
                }
                maxLength={6}
                disabled={!hasPin}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-24 focus:outline-none focus:ring-2 focus:ring-[#744925] disabled:opacity-50"
              />
              {hasPin && (
                <button
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-12 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-700 rounded-full transition-colors"
                >
                  {showPin ? (
                    <IoEyeOff size={20} className="text-gray-400" />
                  ) : (
                    <IoEye size={20} className="text-gray-400" />
                  )}
                </button>
              )}
              {!hasPin && (
                <button
                  onClick={onCreatePin}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#744925] text-white text-xs rounded-lg hover:bg-[#8B5530] transition-colors"
                >
                  Create
                </button>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={onContinue}
            disabled={isContinueDisabled}
            className="w-full bg-[#744925] hover:bg-[#8B5530] text-white py-3 rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPurchasing ? "Processing..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

//  // Purchase Modal Component
//  import { IoClose,IoEye,IoEyeOff} from "react-icons/io5";

// export const PurchaseModal = ({
//   isOpen,
//   onClose,
//   bundle,
//   phoneNumber,
//   setPhoneNumber,
//   transactionPin,
//   setTransactionPin,
//   showPin,
//   setShowPin,
//   hasPin,
//   onCreatePin,
//   onContinue,
// }: any) => {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
//       <div className="bg-gray-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
//         <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
//           <h2 className="text-lg md:text-xl font-bold text-white">
//             {bundle?.data}
//           </h2>
//           <button
//             onClick={onClose}
//             className="p-2 hover:bg-gray-800 rounded-full transition-colors"
//           >
//             <IoClose size={24} className="text-white" />
//           </button>
//         </div>

//         <div className="p-4 space-y-4">
//           {/* Phone Number */}
//           <div>
//             <label className="text-sm font-medium text-gray-400 mb-2 block">
//               Phone Number
//             </label>
//             <input
//               type="tel"
//               value={phoneNumber}
//               onChange={(e) =>
//                 setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 11))
//               }
//               placeholder="Enter Phone Number"
//               maxLength={11}
//               className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#744925]"
//             />
//           </div>

//           {/* Transaction PIN */}
//           <div>
//             <label className="text-sm font-medium text-gray-400 mb-2 block">
//               Transaction PIN{" "}
//               {!hasPin && <span className="text-red-500">*</span>}
//             </label>
//             <div className="relative">
//               <input
//                 type={showPin ? "text" : "password"}
//                 value={transactionPin}
//                 onChange={(e) =>
//                   setTransactionPin(
//                     e.target.value.replace(/\D/g, "").slice(0, 6)
//                   )
//                 }
//                 placeholder={
//                   hasPin ? "Enter your PIN" : "Create a transaction PIN"
//                 }
//                 maxLength={6}
//                 className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-24 focus:outline-none focus:ring-2 focus:ring-[#744925]"
//               />
//               <button
//                 onClick={() => setShowPin(!showPin)}
//                 className="absolute right-12 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-700 rounded-full transition-colors"
//               >
//                 {showPin ? (
//                   <IoEyeOff size={20} className="text-gray-400" />
//                 ) : (
//                   <IoEye size={20} className="text-gray-400" />
//                 )}
//               </button>
//               {!hasPin && (
//                 <button
//                   onClick={onCreatePin}
//                   className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#744925] text-white text-xs rounded-lg hover:bg-[#8B5530] transition-colors"
//                 >
//                   Create
//                 </button>
//               )}
//             </div>
//           </div>

//           {/* Continue Button */}
//           <button
//             onClick={onContinue}
//             className="w-full bg-[#744925] hover:bg-[#8B5530] text-white py-3 rounded-lg font-semibold transition-all active:scale-95"
//           >
//             Continue
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
