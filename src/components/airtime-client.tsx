// components/airtime-client.tsx
"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaChevronRight, FaSpinner } from "react-icons/fa6";
import { NETWORK_IMAGES } from "@/constants/helper";
import { purchaseAirtimeAction } from "@/app/actions/airtime";

// Real providers with codes for Lizzysub
const PROVIDERS = [
  { id: 1, name: "MTN", code: "mtn", image: NETWORK_IMAGES.MTN },
  { id: 2, name: "GLO", code: "glo", image: NETWORK_IMAGES.GLO },
  { id: 3, name: "AIRTEL", code: "airtel", image: NETWORK_IMAGES.AIRTEL },
  { id: 4, name: "9MOBILE", code: "9mobile", image: NETWORK_IMAGES["9MOBILE"] },
];

const AIRTIME_AMOUNTS = [100, 200, 400, 500, 1000, 2000, 3000, 5000, 10000];

interface AirtimePurchaseProps {
  initialBalance: number;
  userId: string;
}

export default function AirtimePurchase({
  initialBalance,
  userId,
}: AirtimePurchaseProps) {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const formatNumberWithCommas = (number: number) => {
    if (!number) return "0";
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const discountedPrice = selectedAmount
    ? Math.floor(selectedAmount * 0.99)
    : null;
  const isPurchaseEnabled =
    selectedProvider &&
    phoneNumber.length === 11 &&
    selectedAmount &&
    pin.length === 4;

  const handlePurchase = async () => {
    if (!isPurchaseEnabled || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = {
      network: selectedProvider.id,
      phone: phoneNumber,
      amount: selectedAmount,
      pin,
    };

    try {
      const result = await purchaseAirtimeAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(
          `Airtime purchased successfully! Reference: ${result.data?.reference}. Redirecting...`
        );
        setTimeout(() => router.push("/history"), 2000);
      }
    } catch (err: any) {
      setError("Something went wrong. Please try again.");
      console.error("Purchase error:", err);
    } finally {
      setLoading(false);
      setPin(""); // Clear PIN for security
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-black border-b border-gray-800 px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center bg-gray-900 rounded-lg p-4">
            <span className="text-sm sm:text-base font-semibold text-gray-400">
              Wallet Balance:
            </span>
            <span className="text-sm sm:text-base font-semibold text-white">
              ₦{formatNumberWithCommas(initialBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Provider Selection */}
        <section className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">
            Select Provider
          </h2>
          <p className="text-sm text-green-400 mb-4 text-center">
            Selected Provider: {selectedProvider?.name || "None"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider)}
                className={`
                  flex flex-col items-center justify-center
                  bg-gray-900 rounded-full p-4 sm:p-6
                  transition-all duration-200 hover:bg-gray-800
                  aspect-square
                  ${
                    selectedProvider?.id === provider.id
                      ? "ring-2 ring-green-400 bg-gray-800"
                      : ""
                  }
                `}
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-700 rounded-full mb-2 sm:mb-3 flex items-center justify-center overflow-hidden">
                  <Image
                    src={provider.image}
                    alt={provider.name}
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                </div>
                <span className="text-xs sm:text-sm font-semibold">
                  {provider.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Phone Number Input */}
        <section className="mb-8">
          <label className="block text-sm sm:text-base text-gray-400 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setPhoneNumber(value.slice(0, 11));
            }}
            placeholder="Enter 11-digit phone number"
            className="w-full bg-gray-900 rounded-lg px-4 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500"
            maxLength={11}
          />
        </section>

        {/* Amount Selection */}
        <section className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">
            Select Airtime Amount
          </h2>
          <div className="flex overflow-x-auto gap-3 py-2 scrollbar-hide">
            {AIRTIME_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                className={`
                  flex-shrink-0 px-5 sm:px-6 py-3 sm:py-4 rounded-lg
                  text-sm sm:text-base font-semibold
                  transition-all duration-200
                  ${
                    selectedAmount === amount
                      ? "bg-gray-800 ring-2 ring-green-400 text-white"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }
                `}
              >
                ₦{formatNumberWithCommas(amount)}
              </button>
            ))}
          </div>
        </section>

        {/* PIN Input */}
        <section className="mb-8">
          <label className="block text-sm sm:text-base text-gray-400 mb-2">
            Transaction PIN
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="Enter 4-digit PIN"
            className="w-full bg-gray-900 rounded-lg px-4 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500"
            maxLength={4}
          />
        </section>

        {/* Discount Bar */}
        {discountedPrice && (
          <div className="bg-gray-900 rounded-lg p-4 sm:p-5 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base text-gray-400">
                Amount to pay (1% off):
              </span>
              <span className="text-base sm:text-lg font-semibold text-green-400">
                ₦{formatNumberWithCommas(discountedPrice)}
              </span>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900 text-green-200 p-4 rounded-lg mb-4 text-center">
            {success}
          </div>
        )}

        {/* Purchase Button */}
        <div className="mb-8">
          <button
            onClick={handlePurchase}
            disabled={!isPurchaseEnabled || loading}
            className={`
              w-full rounded-lg p-4 sm:p-5
              flex items-center justify-between
              transition-all duration-200
              ${
                isPurchaseEnabled && !loading
                  ? "bg-gray-900 hover:bg-gray-800 cursor-pointer"
                  : "bg-gray-900 opacity-60 cursor-not-allowed"
              }
            `}
          >
            <span
              className={`text-sm sm:text-base font-semibold ${
                isPurchaseEnabled && !loading
                  ? "text-blue-400"
                  : "text-gray-500"
              }`}
            >
              {loading
                ? "Processing..."
                : isPurchaseEnabled
                ? "Purchase Airtime"
                : "Complete all fields"}
            </span>
            {isPurchaseEnabled && !loading && (
              <FaChevronRight className="w-5 h-5 text-blue-400" />
            )}
            {loading && (
              <FaSpinner className="w-5 h-5 animate-spin text-blue-400" />
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="text-center text-xs sm:text-sm text-gray-500 mt-4">
          <p>Enter your details and PIN to complete the purchase securely.</p>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
