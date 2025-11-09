// Transaction Status Modal Component
import { IoWifi,IoSearch,IoGift,IoClose,IoEye,IoEyeOff, IoArrowBackOutline,IoFlash, IoReloadOutline,IoCalendar, IoArrowForwardOutline } from "react-icons/io5";

export const TransactionStatusModal = ({
  isOpen,
  onClose,
  status,
  bundle,
  phoneNumber,
  networkProvider,
}: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gray-900 rounded-3xl w-full max-w-sm p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {status === "processing"
              ? "Processing"
              : status === "success"
              ? "Success"
              : "Failed"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <IoClose size={24} className="text-white" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center space-y-4">
          {status === "processing" && (
            <>
              <IoReloadOutline size={64} className="text-green-500 animate-spin" />
              <p className="text-white text-lg">Processing Transaction...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-white text-lg font-semibold">
                Transaction Successful!
              </p>
              <p className="text-gray-400 text-sm">
                {bundle?.data} purchased for {phoneNumber} on {networkProvider}
              </p>
              <button
                onClick={onClose}
                className="w-full bg-[#744925] hover:bg-[#8B5530] text-white py-3 rounded-lg font-semibold transition-all mt-4"
              >
                Close
              </button>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                <IoClose size={40} className="text-white" />
              </div>
              <p className="text-white text-lg font-semibold">
                Transaction Failed
              </p>
              <p className="text-gray-400 text-sm">
                Failed to purchase {bundle?.data} for {phoneNumber}
              </p>
              <button
                onClick={onClose}
                className="w-full bg-[#744925] hover:bg-[#8B5530] text-white py-3 rounded-lg font-semibold transition-all mt-4"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};