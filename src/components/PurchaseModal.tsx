 // Purchase Modal Component
 import { IoWifi,IoSearch,IoGift,IoClose,IoEye,IoEyeOff, IoArrowBackOutline,IoFlash, IoReloadOutline,IoCalendar, IoArrowForwardOutline } from "react-icons/io5";

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
  onCreatePin,
  onContinue,
}: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
      <div className="bg-gray-900 rounded-t-3xl md:rounded-3xl w-full md:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
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
              placeholder="Enter Phone Number"
              maxLength={11}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#744925]"
            />
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
                  hasPin ? "Enter your PIN" : "Create a transaction PIN"
                }
                maxLength={6}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 pr-24 focus:outline-none focus:ring-2 focus:ring-[#744925]"
              />
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
            className="w-full bg-[#744925] hover:bg-[#8B5530] text-white py-3 rounded-lg font-semibold transition-all active:scale-95"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};