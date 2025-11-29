// app/(protected)/flashsale/FlashSaleClient.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  IoFlash,
  IoTimeOutline,
  IoGiftOutline,
  IoHourglassSharp,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoReloadOutline,
} from "react-icons/io5";
import { purchaseFlashSaleAction } from "@/app/actions/flashsale";

interface FlashSalePlan {
  planid: number;
  network: string;
  plantype: string;
  planname: string;
  amount: number;
  validate: string;
  flashname: string | null;
  oldprice: number | null;
  newprice: number | null;
  isflashsale: boolean;
  stock_available: number;
  stock_sold: number;
  discount_percentage: string | null;
}

interface FlashSaleClientProps {
  initialPlans: FlashSalePlan[];
  initialHasPin: boolean;
  initialIsActive: boolean;
}

interface PurchaseStatus {
  planId: number | null;
  status: "idle" | "processing" | "success" | "failed";
  message: string;
}

interface AlertModal {
  isOpen: boolean;
  title: string;
  message: string;
  type: "error" | "info" | "success";
}

export function FlashSaleClient({
  initialPlans,
  initialHasPin,
  initialIsActive,
}: FlashSaleClientProps) {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null);
  const [hasPin] = useState(initialHasPin);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isFlashSaleActive, setIsFlashSaleActive] = useState(initialIsActive);
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>({
    planId: null,
    status: "idle",
    message: "",
  });
  const [alertModal, setAlertModal] = useState<AlertModal>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (
    title: string,
    message: string,
    type: "error" | "info" | "success"
  ) => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type,
    });
  };

  const closeAlert = () => {
    setAlertModal({
      isOpen: false,
      title: "",
      message: "",
      type: "info",
    });
  };

  const getNextFriday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    let daysUntilFriday;
    if (dayOfWeek === 0) daysUntilFriday = 5;
    else if (dayOfWeek === 6) daysUntilFriday = 6;
    else if (dayOfWeek < 5) daysUntilFriday = 5 - dayOfWeek;
    else daysUntilFriday = 0;

    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    return nextFriday;
  };

  const [teaserDate] = useState(() => {
    const nextFriday = getNextFriday();
    const teaser = new Date(nextFriday);
    const daysToAdd = 3 + Math.floor(Math.random() * 3);
    teaser.setDate(nextFriday.getDate() + daysToAdd);
    return teaser;
  });

  const calculateTimeLeft = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();

    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
      const endOfSale = new Date(now);

      if (dayOfWeek === 5) endOfSale.setDate(now.getDate() + 2);
      else if (dayOfWeek === 6) endOfSale.setDate(now.getDate() + 1);

      endOfSale.setHours(23, 59, 59, 999);
      const difference = endOfSale.getTime() - now.getTime();

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return { hours, minutes, seconds, isActive: true };
      }
    }

    return { hours: 0, minutes: 0, seconds: 0, isActive: false };
  };

  const shouldShowTeaser = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 3;
  };

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "long" });
    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
        ? "rd"
        : "th";
    return `${day}${suffix} ${month}`;
  };

  // Detect network from phone number
  const detectNetwork = (phone: string) => {
    if (phone.length < 4) return null;

    const prefix = phone.substring(0, 4);

    // MTN prefixes
    if (
      [
        "0703",
        "0706",
        "0707",
        "0704",
        "07025",
        "07026",
        "0803",
        "0806",
        "0810",
        "0813",
        "0814",
        "0816",
        "0903",
        "0906",
        "0913",
        "0916",
      ].includes(prefix)
    ) {
      return "MTN";
    }

    // Airtel prefixes
    if (
      [
        "0701",
        "0708",
        "0802",
        "0808",
        "0812",
        "0901",
        "0902",
        "0904",
        "0907",
        "0912",
        "0911",
      ].includes(prefix)
    ) {
      return "AIRTEL";
    }

    // Glo prefixes
    if (
      ["0805", "0807", "0705", "0815", "0811", "0905", "0915"].includes(prefix)
    ) {
      return "GLO";
    }

    // 9mobile prefixes
    if (["0809", "0818", "0817", "0909", "0908"].includes(prefix)) {
      return "9MOBILE";
    }

    return null;
  };

  useEffect(() => {
    if (phoneNumber.length === 11) {
      const network = detectNetwork(phoneNumber);
      if (network) {
        setDetectedNetwork(network);
      }
    } else if (phoneNumber.length === 0) {
      // user cleared input completely
      setDetectedNetwork(null);
    } else if (phoneNumber.length < 4) {
      // still typing, allow auto-clear
      const network = detectNetwork(phoneNumber);
      if (!network) {
        setDetectedNetwork(null);
      }
    }
  }, [phoneNumber]);

  useEffect(() => {
    const initialTime = calculateTimeLeft();
    setTimeLeft({
      hours: initialTime.hours,
      minutes: initialTime.minutes,
      seconds: initialTime.seconds,
    });
    setIsFlashSaleActive(initialTime.isActive);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = calculateTimeLeft();
      setTimeLeft({
        hours: newTime.hours,
        minutes: newTime.minutes,
        seconds: newTime.seconds,
      });
      setIsFlashSaleActive(newTime.isActive);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handlePurchase = async (plan: FlashSalePlan) => {
    if (!hasPin) {
      showAlert(
        "Transaction PIN Required",
        "Please create a transaction PIN in your wallet settings first.",
        "error"
      );
      return;
    }

    if (phoneNumber.length !== 11) {
      showAlert(
        "Invalid Phone Number",
        "Please enter a valid 11-digit phone number",
        "error"
      );
      return;
    }

    // Validate phone number matches selected network
    const phoneNetwork = detectNetwork(phoneNumber);
    if (phoneNetwork && phoneNetwork !== detectedNetwork) {
      showAlert(
        "Network Mismatch",
        `This phone number is ${phoneNetwork} but you've selected ${detectedNetwork}. The number must match the network you're purchasing for.`,
        "error"
      );
      return;
    }

    if (!phoneNetwork && detectedNetwork) {
      showAlert(
        "Unable to Verify Network",
        `We couldn't detect the network for this phone number. Please make sure it matches the ${detectedNetwork} network you've selected.`,
        "error"
      );
      return;
    }

    setPurchaseStatus({
      planId: plan.planid,
      status: "processing",
      message: "Processing your purchase...",
    });

    try {
      const result = await purchaseFlashSaleAction({
        planid: plan.planid,
        network: plan.network,
        phone: phoneNumber,
        planName: plan.flashname || plan.planname,
        amount: plan.newprice || plan.amount,
        validity: plan.validate,
        pin: "", // PIN will be handled server-side if needed
      });

      if (result.error) {
        setPurchaseStatus({
          planId: plan.planid,
          status: "failed",
          message: result.error,
        });
        setTimeout(() => {
          setPurchaseStatus({ planId: null, status: "idle", message: "" });
        }, 5000);
      } else {
        setPurchaseStatus({
          planId: plan.planid,
          status: "success",
          message: result.message || "Purchase successful!",
        });
        setTimeout(() => {
          setPurchaseStatus({ planId: null, status: "idle", message: "" });
          router.refresh();
        }, 3000);
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      setPurchaseStatus({
        planId: plan.planid,
        status: "failed",
        message: error.message || "Something went wrong. Please try again.",
      });
      setTimeout(() => {
        setPurchaseStatus({ planId: null, status: "idle", message: "" });
      }, 5000);
    }
  };

  const NETWORK_IMAGES: { [key: string]: string } = {
    "9MOBILE": "/sp-9mobile.jpeg",
    AIRTEL: "/sp-airtel-logo.jpeg",
    GLO: "/sp-glo_logo.png",
    MTN: "/sp-mtn-logo.jpeg",
  };

  const networks = [
    {
      id: "MTN",
      name: "MTN",
      logo: NETWORK_IMAGES.MTN,
      color: "from-yellow-400 to-yellow-600",
      borderColor: "border-yellow-500",
      bgColor: "bg-yellow-500",
    },
    {
      id: "AIRTEL",
      name: "Airtel",
      logo: NETWORK_IMAGES.AIRTEL,
      color: "from-red-500 to-red-700",
      borderColor: "border-red-500",
      bgColor: "bg-red-500",
    },
    {
      id: "GLO",
      name: "Glo",
      logo: NETWORK_IMAGES.GLO,
      color: "from-green-500 to-green-700",
      borderColor: "border-green-500",
      bgColor: "bg-green-500",
    },
    {
      id: "9MOBILE",
      name: "9mobile",
      logo: NETWORK_IMAGES["9MOBILE"],
      color: "from-teal-500 to-teal-700",
      borderColor: "border-teal-500",
      bgColor: "bg-teal-500",
    },
  ];

  const selectedNetworkData = networks.find((n) => n.id === detectedNetwork);
  const filteredPlans = detectedNetwork
    ? initialPlans.filter((p) => p.network.toUpperCase() === detectedNetwork)
    : [];
  const isShowingTeaser = shouldShowTeaser();
  const actualFriday = getNextFriday();
  const isSaleEnded = !isFlashSaleActive;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center gap-2 ${
              isSaleEnded
                ? "bg-gradient-to-r from-gray-500 to-gray-700 text-white"
                : "bg-gradient-to-r from-yellow-400 to-orange-500 text-black animate-pulse"
            } px-6 py-2 rounded-full font-bold text-sm shadow-lg mb-6`}
          >
            <IoFlash className="w-5 h-5" />
            <span>
              {isSaleEnded ? "FLASH SALE ENDED" : "FLASH SALE LIVE NOW!"}
            </span>
            <IoFlash className="w-5 h-5" />
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            Data Flash Sale
          </h1>
          <p className="text-lg md:text-xl text-purple-200">
            Unbeatable prices on all networks
          </p>
        </div>

        {/* Sale Ended State */}
        {isSaleEnded && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
              <div className="text-6xl mb-4">📅</div>
              <h2 className="text-3xl font-black text-white mb-3">
                Flash Sale Coming Soon!
              </h2>
              <p className="text-purple-200 text-lg mb-4">
                Our next flash sale starts on
              </p>
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-4 rounded-xl inline-block">
                {!isShowingTeaser && teaserDate && (
                  <div className="text-xl text-purple-200 line-through mb-2 opacity-75">
                    {formatDate(teaserDate)}
                  </div>
                )}
                <div className="text-4xl font-black">
                  {isShowingTeaser && teaserDate
                    ? formatDate(teaserDate)
                    : formatDate(actualFriday)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Sale */}
        {!isSaleEnded && (
          <div>
            {/* Countdown Timer */}
            <div className="max-w-md mx-auto mb-8">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <IoHourglassSharp className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-semibold">Sale Ends In</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4">
                      <div className="text-3xl md:text-4xl font-black text-white">
                        {String(timeLeft.hours).padStart(2, "0")}
                      </div>
                      <div className="text-purple-200 text-xs font-semibold">
                        HOURS
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4">
                      <div className="text-3xl md:text-4xl font-black text-white">
                        {String(timeLeft.minutes).padStart(2, "0")}
                      </div>
                      <div className="text-purple-200 text-xs font-semibold">
                        MINS
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4">
                      <div className="text-3xl md:text-4xl font-black text-white">
                        {String(timeLeft.seconds).padStart(2, "0")}
                      </div>
                      <div className="text-purple-200 text-xs font-semibold">
                        SECS
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="max-w-md mx-auto mb-8">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <label className="block text-white font-semibold mb-3 text-center">
                  Enter Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) =>
                    setPhoneNumber(
                      e.target.value.replace(/\D/g, "").slice(0, 11)
                    )
                  }
                  placeholder="08012345678"
                  maxLength={11}
                  className="w-full bg-gray-800 text-white text-center rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {phoneNumber &&
                  phoneNumber.length === 11 &&
                  detectedNetwork && (
                    <div className="mt-3 text-center">
                      <span className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded-lg text-sm font-semibold">
                        <IoCheckmarkCircle className="w-4 h-4" />
                        <div className="relative w-6 h-6">
                          <Image
                            src={selectedNetworkData?.logo || ""}
                            alt={detectedNetwork}
                            fill
                            className="object-contain rounded"
                          />
                        </div>
                        {detectedNetwork} Detected
                      </span>
                    </div>
                  )}
                {phoneNumber &&
                  phoneNumber.length === 11 &&
                  !detectedNetwork && (
                    <div className="mt-3 text-center">
                      <span className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm font-semibold">
                        <IoCloseCircle className="w-4 h-4" />
                        Network not detected
                      </span>
                    </div>
                  )}
                {phoneNumber && phoneNumber.length < 11 && (
                  <p className="text-gray-400 text-sm mt-2 text-center">
                    {11 - phoneNumber.length} digits remaining
                  </p>
                )}
              </div>
            </div>

            {/* Network Selector */}
            <div className="mb-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto">
                {networks.map((network) => (
                  <button
                    key={network.id}
                    className={`relative bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 border-2 transition-all duration-300 ${
                      detectedNetwork === network.id
                        ? `${network.borderColor} shadow-lg scale-105`
                        : "border-white/20 hover:border-white/40"
                    }`}
                  >
                    {detectedNetwork === network.id && (
                      <div
                        className={`absolute -top-2 -right-2 ${network.bgColor} text-white rounded-full p-1`}
                      >
                        <IoCheckmarkCircle className="w-4 h-4" />
                      </div>
                    )}
                    <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-2">
                      <Image
                        src={network.logo}
                        alt={network.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="text-white font-bold text-sm md:text-base">
                      {network.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Data Plans */}
            {detectedNetwork && filteredPlans.length > 0 ? (
              <div className="mb-8">
                <div
                  className={`inline-flex items-center gap-3 bg-gradient-to-r ${selectedNetworkData?.color} text-white px-5 py-3 rounded-full font-bold text-sm mb-6 shadow-lg`}
                >
                  <div className="relative w-8 h-8 bg-white rounded-full p-1">
                    <Image
                      src={selectedNetworkData?.logo || ""}
                      alt={selectedNetworkData?.name || ""}
                      fill
                      className="object-contain rounded-full"
                    />
                  </div>
                  <span>{selectedNetworkData?.name} Flash Deals</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* {filteredPlans.map((plan) => {
                    const soldPercentage =
                      (plan.stock_sold / plan.stock_available) * 100;
                    const stockLeft = plan.stock_available - plan.stock_sold;
                    const displayPrice = plan.newprice || plan.amount;
                    const isProcessing =
                      purchaseStatus.planId === plan.planid &&
                      purchaseStatus.status === "processing";
                    const isSuccess =
                      purchaseStatus.planId === plan.planid &&
                      purchaseStatus.status === "success";
                    const isFailed =
                      purchaseStatus.planId === plan.planid &&
                      purchaseStatus.status === "failed";

                    return (
                      <div
                        key={plan.planid}
                        className="group bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:shadow-2xl hover:scale-105"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div
                            className={`bg-gradient-to-r ${selectedNetworkData?.color} text-white px-3 py-1 rounded-lg font-black text-sm`}
                          >
                            {plan.flashname || plan.planname}
                          </div>
                          {plan.discount_percentage && (
                            <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1 rounded-lg font-black text-sm">
                              -{plan.discount_percentage} OFF
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-purple-200 text-sm mb-4">
                          <span>{plan.validate} Validity</span>
                          <div className="flex items-center gap-1 text-yellow-400">
                            <IoTimeOutline className="w-4 h-4" />
                            <span className="font-semibold">
                              {timeLeft.hours}h {timeLeft.minutes}m
                            </span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">
                              ₦{displayPrice.toLocaleString()}
                            </span>
                            {plan.oldprice && (
                              <span className="text-lg text-gray-400 line-through">
                                ₦{plan.oldprice.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm text-purple-200 mb-2">
                            <div className="flex items-center gap-1">
                              <IoGiftOutline className="w-4 h-4" />
                              <span>Stock: {stockLeft} left</span>
                            </div>
                            <span>{soldPercentage.toFixed(0)}% sold</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${selectedNetworkData?.color} transition-all duration-500`}
                              style={{ width: `${soldPercentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-purple-300 mt-1">
                            {plan.stock_sold} / {plan.stock_available} sold
                          </div>
                        </div>

                        {/* Status Messages *
                        {isSuccess && (
                          <div className="mb-3 bg-green-500/20 border border-green-500 rounded-lg p-2 text-center">
                            <p className="text-green-400 text-sm font-semibold flex items-center justify-center gap-2">
                              <IoCheckmarkCircle className="w-4 h-4" />
                              {purchaseStatus.message}
                            </p>
                          </div>
                        )}

                        {isFailed && (
                          <div className="mb-3 bg-red-500/20 border border-red-500 rounded-lg p-2 text-center">
                            <p className="text-red-400 text-xs">
                              {purchaseStatus.message}
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() => handlePurchase(plan)}
                          disabled={stockLeft <= 0 || isProcessing || !hasPin}
                          className={`w-full bg-gradient-to-r ${selectedNetworkData?.color} text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isProcessing ? (
                            <>
                              <IoReloadOutline className="w-5 h-5 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : stockLeft <= 0 ? (
                            <span>Sold Out</span>
                          ) : !hasPin ? (
                            <span>Setup PIN First</span>
                          ) : (
                            <span>Buy Now</span>
                          )}
                        </button>
                      </div>
                    );
                  })} */}

                  {filteredPlans.map((plan) => {
                    const soldPercentage =
                      (plan.stock_sold / plan.stock_available) * 100;
                    const stockLeft = plan.stock_available - plan.stock_sold;
                    const isSoldOut = stockLeft <= 0;
                    const displayPrice = plan.newprice || plan.amount;

                    const isProcessing =
                      purchaseStatus.planId === plan.planid &&
                      purchaseStatus.status === "processing";
                    const isSuccess =
                      purchaseStatus.planId === plan.planid &&
                      purchaseStatus.status === "success";
                    const isFailed =
                      purchaseStatus.planId === plan.planid &&
                      purchaseStatus.status === "failed";

                    return (
                      <div
                        key={plan.planid}
                        className={`group relative overflow-hidden bg-white/10 backdrop-blur-lg rounded-2xl p-6 border transition-all duration-500
        ${
          isSoldOut
            ? "grayscale opacity-60 border-white/10 cursor-not-allowed"
            : "border-white/20 hover:border-white/40 hover:shadow-2xl hover:scale-105 hover:-translate-y-1"
        }`}
                      >
                        {/* DIAGONAL "SOLD OUT" RIBBON */}
                        {isSoldOut && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-100">
                            <div className="relative">
                              <div className="absolute inset-0 bg-red-600 transform rotate-12 scale-150 blur-xl opacity-70"></div>
                              <div className="relative bg-gradient-to-r from-red-600 to-pink-700 text-white font-black text-4xl md:text-3xl px-16 py-6 transform -rotate-45 shadow-2xl tracking-wider">
                                SOLD OUT
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Optional: Subtle "ghost" overlay for extra dead feel */}
                        {isSoldOut && (
                          <div className="absolute inset-0 bg-black/40 rounded-2xl"></div>
                        )}

                        <div className="relative z-10">
                          {" "}
                          {/* Content above overlay */}
                          <div className="flex justify-between items-start mb-4">
                            <div
                              className={`px-3 py-1 rounded-lg font-black text-sm transition-opacity
              ${
                isSoldOut
                  ? "bg-gray-600 text-gray-400"
                  : `bg-gradient-to-r ${selectedNetworkData?.color} text-white`
              }
            `}
                            >
                              {plan.flashname || plan.planname}
                            </div>
                            {plan.discount_percentage && !isSoldOut && (
                              <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1 rounded-lg font-black text-sm">
                                -{plan.discount_percentage} OFF
                              </div>
                            )}
                          </div>
                          <div
                            className={`flex items-center justify-between text-sm mb-4 ${
                              isSoldOut ? "text-gray-500" : "text-purple-200"
                            }`}
                          >
                            <span>{plan.validate} Validity</span>
                            {!isSoldOut && (
                              <div className="flex items-center gap-1 text-yellow-400">
                                <IoTimeOutline className="w-4 h-4" />
                                <span className="font-semibold">
                                  {timeLeft.hours}h {timeLeft.minutes}m
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="mb-4">
                            <div className="flex items-baseline gap-2">
                              <span
                                className={`text-3xl font-black ${
                                  isSoldOut ? "text-gray-500" : "text-white"
                                }`}
                              >
                                ₦{displayPrice.toLocaleString()}
                              </span>
                              {plan.oldprice && !isSoldOut && (
                                <span className="text-lg text-gray-400 line-through">
                                  ₦{plan.oldprice.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mb-4">
                            <div
                              className={`flex items-center justify-between text-sm mb-2 ${
                                isSoldOut ? "text-gray-500" : "text-purple-200"
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                <IoGiftOutline className="w-4 h-4" />
                                <span>Stock: {stockLeft} left</span>
                              </div>
                              <span>{soldPercentage.toFixed(0)}% sold</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ${
                                  isSoldOut
                                    ? "bg-gray-600"
                                    : `bg-gradient-to-r ${selectedNetworkData?.color}`
                                }`}
                                style={{
                                  width: `${Math.min(soldPercentage, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <div
                              className={`text-xs mt-1 ${
                                isSoldOut ? "text-gray-500" : "text-purple-300"
                              }`}
                            >
                              {plan.stock_sold} / {plan.stock_available} sold
                            </div>
                          </div>
                          {/* Status Messages */}
                          {isSuccess && (
                            <div className="mb-3 bg-green-500/20 border border-green-500 rounded-lg p-2 text-center">
                              <p className="text-green-400 text-sm font-semibold flex items-center justify-center gap-2">
                                <IoCheckmarkCircle className="w-4 h-4" />
                                {purchaseStatus.message}
                              </p>
                            </div>
                          )}
                          {isFailed && (
                            <div className="mb-3 bg-red-500/20 border border-red-500 rounded-lg p-2 text-center">
                              <p className="text-red-400 text-xs">
                                {purchaseStatus.message}
                              </p>
                            </div>
                          )}
                          <button
                            onClick={() => !isSoldOut && handlePurchase(plan)}
                            disabled={isSoldOut || isProcessing || !hasPin}
                            className={`w-full font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2
            ${
              isSoldOut
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : `bg-gradient-to-r ${selectedNetworkData?.color} text-white hover:shadow-lg active:scale-95`
            }`}
                          >
                            {isProcessing ? (
                              <>
                                <IoReloadOutline className="w-5 h-5 animate-spin" />
                                Processing...
                              </>
                            ) : isSoldOut ? (
                              "Sold Out"
                            ) : !hasPin ? (
                              "Setup PIN First"
                            ) : (
                              "Buy Now"
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : phoneNumber.length === 11 ? (
              <div className="text-center py-12">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
                  <p className="text-purple-200 text-lg mb-2">
                    No flash sale plans available
                  </p>
                  <p className="text-gray-400 text-sm">
                    {detectedNetwork
                      ? `for ${detectedNetwork}`
                      : "Unable to detect network from this number"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
                  <div className="text-6xl mb-4">📱</div>
                  <p className="text-purple-200 text-lg">
                    Enter your phone number to view available flash deals
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={closeAlert}
        >
          <div
            className="bg-gray-900 rounded-3xl w-full max-w-sm p-6 animate-scale-in border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              {alertModal.type === "error" && (
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                  <IoCloseCircle size={40} className="text-white" />
                </div>
              )}
              {alertModal.type === "success" && (
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                  <IoCheckmarkCircle size={40} className="text-white" />
                </div>
              )}
              {alertModal.type === "info" && (
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                  <IoFlash size={40} className="text-white" />
                </div>
              )}

              {/* Title */}
              <h2 className="text-xl font-bold text-white">
                {alertModal.title}
              </h2>

              {/* Message */}
              <p className="text-gray-300 text-sm">{alertModal.message}</p>

              {/* Close Button */}
              <button
                onClick={closeAlert}
                className="w-full bg-[#744925] hover:bg-[#8B5530] text-white py-3 rounded-xl font-semibold transition-all active:scale-95"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
