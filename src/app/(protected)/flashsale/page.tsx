"use client";

import { useState, useEffect } from "react";

import {
  IoFlash,
  IoTimeOutline,
  IoGiftOutline,
  IoTrendingUp,
  IoHourglassSharp,
} from "react-icons/io5";

export default function FlashSalePage() {
  const [selectedNetwork, setSelectedNetwork] = useState("mtn");
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const getNextFriday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    let daysUntilFriday;
    if (dayOfWeek === 0) {
      daysUntilFriday = 5;
    } else if (dayOfWeek === 6) {
      daysUntilFriday = 6;
    } else if (dayOfWeek < 5) {
      daysUntilFriday = 5 - dayOfWeek;
    } else {
      daysUntilFriday = 0;
    }

    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    return nextFriday;
  };
  // Lazy initializer: Computes teaserDate synchronously on first render (no flash, static)
  const [teaserDate] = useState(() => {
    const nextFriday = getNextFriday();
    const teaser = new Date(nextFriday);
    const daysToAdd = 3 + Math.floor(Math.random() * 3); // Random 3, 4, or 5—fixed on mount
    teaser.setDate(nextFriday.getDate() + daysToAdd);
    return teaser;
  });
  const [isFlashSaleActive, setIsFlashSaleActive] = useState(false);

  const calculateTimeLeft = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

    // Check if we're in flash sale period (Friday, Saturday, or Sunday)
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
      // Calculate end time: Sunday at 11:59:59 PM
      const endOfSale = new Date(now);

      if (dayOfWeek === 5) {
        // Friday - add 2 days to get to Sunday
        endOfSale.setDate(now.getDate() + 2);
      } else if (dayOfWeek === 6) {
        // Saturday - add 1 day to get to Sunday
        endOfSale.setDate(now.getDate() + 1);
      }
      // If Sunday (0), use current date

      endOfSale.setHours(23, 59, 59, 999);

      const difference = endOfSale.getTime() - now.getTime();

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return {
          hours,
          minutes,
          seconds,
          isActive: true,
        };
      }
    }

    // Not in flash sale period
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      isActive: false,
    };
  };

  

  const shouldShowTeaser = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 3;
  };

  const formatDate = (date) => {
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

  const isSaleEnded = !isFlashSaleActive;

  // Initialize timer on mount (no teaser init needed—handled in lazy state)
  useEffect(() => {
    // Set initial time
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

  const networks = [
    {
      id: "mtn",
      name: "MTN",
      logo: "🟡",
      color: "from-yellow-400 to-yellow-600",
      borderColor: "border-yellow-500",
      bgColor: "bg-yellow-500",
    },
    {
      id: "airtel",
      name: "Airtel",
      logo: "🔴",
      color: "from-red-500 to-red-700",
      borderColor: "border-red-500",
      bgColor: "bg-red-500",
    },
    {
      id: "glo",
      name: "Glo",
      logo: "🟢",
      color: "from-green-500 to-green-700",
      borderColor: "border-green-500",
      bgColor: "bg-green-500",
    },
    {
      id: "9mobile",
      name: "9mobile",
      logo: "🟢",
      color: "from-teal-500 to-teal-700",
      borderColor: "border-teal-500",
      bgColor: "bg-teal-500",
    },
  ];

  const dataPlans = {
    mtn: [
      {
        id: 1,
        data: "1GB",
        validity: "30 Days",
        oldPrice: "₦500",
        newPrice: "₦280",
        discount: "44%",
        stockAvailable: 250,
        stockSold: 180,
      },
      {
        id: 2,
        data: "2GB",
        validity: "30 Days",
        oldPrice: "₦1,000",
        newPrice: "₦550",
        discount: "45%",
        stockAvailable: 300,
        stockSold: 245,
      },
      {
        id: 3,
        data: "5GB",
        validity: "30 Days",
        oldPrice: "₦1,500",
        newPrice: "₦900",
        discount: "40%",
        stockAvailable: 400,
        stockSold: 320,
      },
      {
        id: 4,
        data: "10GB",
        validity: "30 Days",
        oldPrice: "₦3,000",
        newPrice: "₦1,800",
        discount: "40%",
        stockAvailable: 500,
        stockSold: 425,
      },
      {
        id: 5,
        data: "15GB",
        validity: "30 Days",
        oldPrice: "₦4,500",
        newPrice: "₦2,600",
        discount: "42%",
        stockAvailable: 200,
        stockSold: 168,
      },
      {
        id: 6,
        data: "20GB",
        validity: "30 Days",
        oldPrice: "₦6,000",
        newPrice: "₦3,400",
        discount: "43%",
        stockAvailable: 150,
        stockSold: 132,
      },
    ],
    airtel: [
      {
        id: 1,
        data: "1GB",
        validity: "30 Days",
        oldPrice: "₦500",
        newPrice: "₦270",
        discount: "46%",
        stockAvailable: 300,
        stockSold: 256,
      },
      {
        id: 2,
        data: "2GB",
        validity: "30 Days",
        oldPrice: "₦1,000",
        newPrice: "₦540",
        discount: "46%",
        stockAvailable: 350,
        stockSold: 298,
      },
      {
        id: 3,
        data: "5GB",
        validity: "30 Days",
        oldPrice: "₦1,500",
        newPrice: "₦850",
        discount: "43%",
        stockAvailable: 450,
        stockSold: 389,
      },
      {
        id: 4,
        data: "10GB",
        validity: "30 Days",
        oldPrice: "₦2,800",
        newPrice: "₦1,650",
        discount: "41%",
        stockAvailable: 400,
        stockSold: 356,
      },
      {
        id: 5,
        data: "15GB",
        validity: "60 Days",
        oldPrice: "₦4,200",
        newPrice: "₦2,400",
        discount: "43%",
        stockAvailable: 250,
        stockSold: 215,
      },
      {
        id: 6,
        data: "20GB",
        validity: "60 Days",
        oldPrice: "₦5,500",
        newPrice: "₦3,100",
        discount: "44%",
        stockAvailable: 180,
        stockSold: 154,
      },
    ],
    glo: [
      {
        id: 1,
        data: "1.6GB",
        validity: "30 Days",
        oldPrice: "₦500",
        newPrice: "₦260",
        discount: "48%",
        stockAvailable: 400,
        stockSold: 342,
      },
      {
        id: 2,
        data: "3.9GB",
        validity: "30 Days",
        oldPrice: "₦1,000",
        newPrice: "₦520",
        discount: "48%",
        stockAvailable: 500,
        stockSold: 445,
      },
      {
        id: 3,
        data: "7.7GB",
        validity: "30 Days",
        oldPrice: "₦1,500",
        newPrice: "₦820",
        discount: "45%",
        stockAvailable: 350,
        stockSold: 298,
      },
      {
        id: 4,
        data: "13GB",
        validity: "30 Days",
        oldPrice: "₦3,000",
        newPrice: "₦1,700",
        discount: "43%",
        stockAvailable: 300,
        stockSold: 267,
      },
      {
        id: 5,
        data: "18GB",
        validity: "30 Days",
        oldPrice: "₦4,000",
        newPrice: "₦2,300",
        discount: "43%",
        stockAvailable: 220,
        stockSold: 189,
      },
      {
        id: 6,
        data: "29GB",
        validity: "30 Days",
        oldPrice: "₦8,000",
        newPrice: "₦4,500",
        discount: "44%",
        stockAvailable: 150,
        stockSold: 128,
      },
    ],
    "9mobile": [
      {
        id: 1,
        data: "1.5GB",
        validity: "30 Days",
        oldPrice: "₦500",
        newPrice: "₦290",
        discount: "42%",
        stockAvailable: 250,
        stockSold: 198,
      },
      {
        id: 2,
        data: "2.5GB",
        validity: "30 Days",
        oldPrice: "₦1,000",
        newPrice: "₦580",
        discount: "42%",
        stockAvailable: 280,
        stockSold: 234,
      },
      {
        id: 3,
        data: "4.5GB",
        validity: "30 Days",
        oldPrice: "₦1,500",
        newPrice: "₦900",
        discount: "40%",
        stockAvailable: 320,
        stockSold: 276,
      },
      {
        id: 4,
        data: "11GB",
        validity: "30 Days",
        oldPrice: "₦3,000",
        newPrice: "₦1,850",
        discount: "38%",
        stockAvailable: 200,
        stockSold: 167,
      },
      {
        id: 5,
        data: "15GB",
        validity: "30 Days",
        oldPrice: "₦4,500",
        newPrice: "₦2,700",
        discount: "40%",
        stockAvailable: 180,
        stockSold: 145,
      },
      {
        id: 6,
        data: "40GB",
        validity: "90 Days",
        oldPrice: "₦10,000",
        newPrice: "₦6,200",
        discount: "38%",
        stockAvailable: 100,
        stockSold: 82,
      },
    ],
  };

  const selectedNetworkData = networks.find((n) => n.id === selectedNetwork);
  const plans = dataPlans[selectedNetwork];

  const isShowingTeaser = shouldShowTeaser();
  const actualFriday = getNextFriday();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
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

        {/* Countdown Timer or Next Sale Info */}
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
                {/* Show crossed out teaser date if not on Mon-Wed */}
                {!isShowingTeaser && teaserDate && (
                  <div className="text-xl text-purple-200 line-through mb-2 opacity-75">
                    {formatDate(teaserDate)}
                  </div>
                )}
                {/* Show the actual date */}
                <div className="text-4xl font-black">
                  {isShowingTeaser && teaserDate
                    ? formatDate(teaserDate)
                    : formatDate(actualFriday)}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isSaleEnded && (
          <div>
            <div className="max-w-md mx-auto mb-12">
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
            {/* Network Selector */}
            <div className="mb-12">
              <h2 className="text-white text-xl font-bold mb-4 text-center">
                Select Network
              </h2>
              <div className="grid grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto">
                {networks.map((network) => (
                  <button
                    key={network.id}
                    onClick={() => setSelectedNetwork(network.id)}
                    className={`relative bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 border-2 transition-all duration-300 ${
                      selectedNetwork === network.id
                        ? `${network.borderColor} shadow-lg scale-105`
                        : "border-white/20 hover:border-white/40"
                    }`}
                  >
                    {selectedNetwork === network.id && (
                      <div
                        className={`absolute -top-2 -right-2 ${network.bgColor} text-white rounded-full p-1`}
                      >
                        <IoTrendingUp className="w-4 h-4" />
                      </div>
                    )}
                    <div className="text-4xl md:text-5xl mb-2">
                      {network.logo}
                    </div>
                    <div className="text-white font-bold text-sm md:text-base">
                      {network.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {/* Data Plans Grid */}
            <div className="mb-8">
              <div
                className={`inline-flex items-center gap-2 bg-gradient-to-r ${selectedNetworkData.color} text-white px-4 py-2 rounded-full font-bold text-sm mb-6`}
              >
                <span>{selectedNetworkData.name} Flash Deals</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const soldPercentage =
                    (plan.stockSold / plan.stockAvailable) * 100;
                  const stockLeft = plan.stockAvailable - plan.stockSold;

                  return (
                    <div
                      key={plan.id}
                      className="group bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:shadow-2xl hover:scale-105"
                    >
                      {/* Discount Badge */}
                      <div className="flex justify-between items-start mb-4">
                        <div
                          className={`bg-gradient-to-r ${selectedNetworkData.color} text-white px-3 py-1 rounded-lg font-black text-sm`}
                        >
                          {plan.data}
                        </div>
                        <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1 rounded-lg font-black text-sm">
                          -{plan.discount} OFF
                        </div>
                      </div>

                      {/* Validity and Time Left */}
                      <div className="flex items-center justify-between text-purple-200 text-sm mb-4">
                        <span>{plan.validity} Validity</span>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <IoTimeOutline className="w-4 h-4" />
                          <span className="font-semibold">
                            {timeLeft.hours}h {timeLeft.minutes}m
                          </span>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="mb-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-white">
                            {plan.newPrice}
                          </span>
                          <span className="text-lg text-gray-400 line-through">
                            {plan.oldPrice}
                          </span>
                        </div>
                      </div>

                      {/* Stock Info */}
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
                            className={`h-full bg-gradient-to-r ${selectedNetworkData.color} transition-all duration-500`}
                            style={{ width: `${soldPercentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-purple-300 mt-1">
                          {plan.stockSold} / {plan.stockAvailable} sold
                        </div>
                      </div>

                      {/* Buy Button */}
                      <button
                        className={`w-full bg-gradient-to-r ${selectedNetworkData.color} text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2`}
                      >
                        <span>Buy Now</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// "use client";

// import { useState, useEffect } from "react";

// import {
//   IoFlash,
//   IoTimeOutline,
//   IoGiftOutline,
//   IoTrendingUp,
//   IoHourglassSharp,
// } from "react-icons/io5";

// export default function FlashSalePage() {
//   const [selectedNetwork, setSelectedNetwork] = useState("mtn");
//   const [timeLeft, setTimeLeft] = useState({
//     hours: 0,
//     minutes: 0,
//     seconds: 0,
//   });
//   const [teaserDate, setTeaserDate] = useState(null);
//   const [isFlashSaleActive, setIsFlashSaleActive] = useState(false);

//   const calculateTimeLeft = () => {
//     const now = new Date();
//     const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

//     // Check if we're in flash sale period (Friday, Saturday, or Sunday)
//     if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
//       // Calculate end time: Sunday at 11:59:59 PM
//       const endOfSale = new Date(now);

//       if (dayOfWeek === 5) {
//         // Friday - add 2 days to get to Sunday
//         endOfSale.setDate(now.getDate() + 2);
//       } else if (dayOfWeek === 6) {
//         // Saturday - add 1 day to get to Sunday
//         endOfSale.setDate(now.getDate() + 1);
//       }
//       // If Sunday (0), use current date

//       endOfSale.setHours(23, 59, 59, 999);

//       const difference = endOfSale.getTime() - now.getTime();

//       if (difference > 0) {
//         const hours = Math.floor(difference / (1000 * 60 * 60));
//         const minutes = Math.floor(
//           (difference % (1000 * 60 * 60)) / (1000 * 60)
//         );
//         const seconds = Math.floor((difference % (1000 * 60)) / 1000);

//         return {
//           hours,
//           minutes,
//           seconds,
//           isActive: true,
//         };
//       }
//     }

//     // Not in flash sale period
//     return {
//       hours: 0,
//       minutes: 0,
//       seconds: 0,
//       isActive: false,
//     };
//   };

//   const getNextFriday = () => {
//     const today = new Date();
//     const dayOfWeek = today.getDay();

//     let daysUntilFriday;
//     if (dayOfWeek === 0) {
//       daysUntilFriday = 5;
//     } else if (dayOfWeek === 6) {
//       daysUntilFriday = 6;
//     } else if (dayOfWeek < 5) {
//       daysUntilFriday = 5 - dayOfWeek;
//     } else {
//       daysUntilFriday = 0;
//     }

//     const nextFriday = new Date(today);
//     nextFriday.setDate(today.getDate() + daysUntilFriday);
//     return nextFriday;
//   };

//   const shouldShowTeaser = () => {
//     const today = new Date();
//     const dayOfWeek = today.getDay();
//     return dayOfWeek >= 1 && dayOfWeek <= 3;
//   };

//   const formatDate = (date) => {
//     const day = date.getDate();
//     const month = date.toLocaleString("en-US", { month: "long" });
//     const suffix =
//       day === 1 || day === 21 || day === 31
//         ? "st"
//         : day === 2 || day === 22
//         ? "nd"
//         : day === 3 || day === 23
//         ? "rd"
//         : "th";
//     return `${day}${suffix} ${month}`;
//   };

//   const isSaleEnded = !isFlashSaleActive;

//   // Initialize timer and teaser date on mount
//   useEffect(() => {
//     // Set initial time
//     const initialTime = calculateTimeLeft();
//     setTimeLeft({
//       hours: initialTime.hours,
//       minutes: initialTime.minutes,
//       seconds: initialTime.seconds,
//     });
//     setIsFlashSaleActive(initialTime.isActive);

//     // Initialize teaser date
//     const nextFriday = getNextFriday();
//     const teaser = new Date(nextFriday);
//     const daysToAdd = 3 + Math.floor(Math.random() * 3); // This is 3, 4, or 5—nothing more
//     teaser.setDate(nextFriday.getDate() + daysToAdd);
//     // teaser.setDate(nextFriday.getDate() + 3); // Monday after Friday
//     setTeaserDate(teaser);
//   }, []);

//   useEffect(() => {
//     const timer = setInterval(() => {
//       const newTime = calculateTimeLeft();
//       setTimeLeft({
//         hours: newTime.hours,
//         minutes: newTime.minutes,
//         seconds: newTime.seconds,
//       });
//       setIsFlashSaleActive(newTime.isActive);
//     }, 1000);

//     return () => clearInterval(timer);
//   }, []);

//   const networks = [
//     {
//       id: "mtn",
//       name: "MTN",
//       logo: "🟡",
//       color: "from-yellow-400 to-yellow-600",
//       borderColor: "border-yellow-500",
//       bgColor: "bg-yellow-500",
//     },
//     {
//       id: "airtel",
//       name: "Airtel",
//       logo: "🔴",
//       color: "from-red-500 to-red-700",
//       borderColor: "border-red-500",
//       bgColor: "bg-red-500",
//     },
//     {
//       id: "glo",
//       name: "Glo",
//       logo: "🟢",
//       color: "from-green-500 to-green-700",
//       borderColor: "border-green-500",
//       bgColor: "bg-green-500",
//     },
//     {
//       id: "9mobile",
//       name: "9mobile",
//       logo: "🟢",
//       color: "from-teal-500 to-teal-700",
//       borderColor: "border-teal-500",
//       bgColor: "bg-teal-500",
//     },
//   ];

//   const dataPlans = {
//     mtn: [
//       {
//         id: 1,
//         data: "1GB",
//         validity: "30 Days",
//         oldPrice: "₦500",
//         newPrice: "₦280",
//         discount: "44%",
//         stockAvailable: 250,
//         stockSold: 180,
//       },
//       {
//         id: 2,
//         data: "2GB",
//         validity: "30 Days",
//         oldPrice: "₦1,000",
//         newPrice: "₦550",
//         discount: "45%",
//         stockAvailable: 300,
//         stockSold: 245,
//       },
//       {
//         id: 3,
//         data: "5GB",
//         validity: "30 Days",
//         oldPrice: "₦1,500",
//         newPrice: "₦900",
//         discount: "40%",
//         stockAvailable: 400,
//         stockSold: 320,
//       },
//       {
//         id: 4,
//         data: "10GB",
//         validity: "30 Days",
//         oldPrice: "₦3,000",
//         newPrice: "₦1,800",
//         discount: "40%",
//         stockAvailable: 500,
//         stockSold: 425,
//       },
//       {
//         id: 5,
//         data: "15GB",
//         validity: "30 Days",
//         oldPrice: "₦4,500",
//         newPrice: "₦2,600",
//         discount: "42%",
//         stockAvailable: 200,
//         stockSold: 168,
//       },
//       {
//         id: 6,
//         data: "20GB",
//         validity: "30 Days",
//         oldPrice: "₦6,000",
//         newPrice: "₦3,400",
//         discount: "43%",
//         stockAvailable: 150,
//         stockSold: 132,
//       },
//     ],
//     airtel: [
//       {
//         id: 1,
//         data: "1GB",
//         validity: "30 Days",
//         oldPrice: "₦500",
//         newPrice: "₦270",
//         discount: "46%",
//         stockAvailable: 300,
//         stockSold: 256,
//       },
//       {
//         id: 2,
//         data: "2GB",
//         validity: "30 Days",
//         oldPrice: "₦1,000",
//         newPrice: "₦540",
//         discount: "46%",
//         stockAvailable: 350,
//         stockSold: 298,
//       },
//       {
//         id: 3,
//         data: "5GB",
//         validity: "30 Days",
//         oldPrice: "₦1,500",
//         newPrice: "₦850",
//         discount: "43%",
//         stockAvailable: 450,
//         stockSold: 389,
//       },
//       {
//         id: 4,
//         data: "10GB",
//         validity: "30 Days",
//         oldPrice: "₦2,800",
//         newPrice: "₦1,650",
//         discount: "41%",
//         stockAvailable: 400,
//         stockSold: 356,
//       },
//       {
//         id: 5,
//         data: "15GB",
//         validity: "60 Days",
//         oldPrice: "₦4,200",
//         newPrice: "₦2,400",
//         discount: "43%",
//         stockAvailable: 250,
//         stockSold: 215,
//       },
//       {
//         id: 6,
//         data: "20GB",
//         validity: "60 Days",
//         oldPrice: "₦5,500",
//         newPrice: "₦3,100",
//         discount: "44%",
//         stockAvailable: 180,
//         stockSold: 154,
//       },
//     ],
//     glo: [
//       {
//         id: 1,
//         data: "1.6GB",
//         validity: "30 Days",
//         oldPrice: "₦500",
//         newPrice: "₦260",
//         discount: "48%",
//         stockAvailable: 400,
//         stockSold: 342,
//       },
//       {
//         id: 2,
//         data: "3.9GB",
//         validity: "30 Days",
//         oldPrice: "₦1,000",
//         newPrice: "₦520",
//         discount: "48%",
//         stockAvailable: 500,
//         stockSold: 445,
//       },
//       {
//         id: 3,
//         data: "7.7GB",
//         validity: "30 Days",
//         oldPrice: "₦1,500",
//         newPrice: "₦820",
//         discount: "45%",
//         stockAvailable: 350,
//         stockSold: 298,
//       },
//       {
//         id: 4,
//         data: "13GB",
//         validity: "30 Days",
//         oldPrice: "₦3,000",
//         newPrice: "₦1,700",
//         discount: "43%",
//         stockAvailable: 300,
//         stockSold: 267,
//       },
//       {
//         id: 5,
//         data: "18GB",
//         validity: "30 Days",
//         oldPrice: "₦4,000",
//         newPrice: "₦2,300",
//         discount: "43%",
//         stockAvailable: 220,
//         stockSold: 189,
//       },
//       {
//         id: 6,
//         data: "29GB",
//         validity: "30 Days",
//         oldPrice: "₦8,000",
//         newPrice: "₦4,500",
//         discount: "44%",
//         stockAvailable: 150,
//         stockSold: 128,
//       },
//     ],
//     "9mobile": [
//       {
//         id: 1,
//         data: "1.5GB",
//         validity: "30 Days",
//         oldPrice: "₦500",
//         newPrice: "₦290",
//         discount: "42%",
//         stockAvailable: 250,
//         stockSold: 198,
//       },
//       {
//         id: 2,
//         data: "2.5GB",
//         validity: "30 Days",
//         oldPrice: "₦1,000",
//         newPrice: "₦580",
//         discount: "42%",
//         stockAvailable: 280,
//         stockSold: 234,
//       },
//       {
//         id: 3,
//         data: "4.5GB",
//         validity: "30 Days",
//         oldPrice: "₦1,500",
//         newPrice: "₦900",
//         discount: "40%",
//         stockAvailable: 320,
//         stockSold: 276,
//       },
//       {
//         id: 4,
//         data: "11GB",
//         validity: "30 Days",
//         oldPrice: "₦3,000",
//         newPrice: "₦1,850",
//         discount: "38%",
//         stockAvailable: 200,
//         stockSold: 167,
//       },
//       {
//         id: 5,
//         data: "15GB",
//         validity: "30 Days",
//         oldPrice: "₦4,500",
//         newPrice: "₦2,700",
//         discount: "40%",
//         stockAvailable: 180,
//         stockSold: 145,
//       },
//       {
//         id: 6,
//         data: "40GB",
//         validity: "90 Days",
//         oldPrice: "₦10,000",
//         newPrice: "₦6,200",
//         discount: "38%",
//         stockAvailable: 100,
//         stockSold: 82,
//       },
//     ],
//   };

//   const selectedNetworkData = networks.find((n) => n.id === selectedNetwork);
//   const plans = dataPlans[selectedNetwork];

//   const isShowingTeaser = shouldShowTeaser();
//   const actualFriday = getNextFriday();

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
//       {/* Animated Background */}
//       <div className="absolute inset-0 opacity-20">
//         <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
//         <div className="absolute top-40 right-10 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
//       </div>

//       <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <div
//             className={`inline-flex items-center gap-2 ${
//               isSaleEnded
//                 ? "bg-gradient-to-r from-gray-500 to-gray-700 text-white"
//                 : "bg-gradient-to-r from-yellow-400 to-orange-500 text-black animate-pulse"
//             } px-6 py-2 rounded-full font-bold text-sm shadow-lg mb-6`}
//           >
//             <IoFlash className="w-5 h-5" />
//             <span>
//               {isSaleEnded ? "FLASH SALE ENDED" : "FLASH SALE LIVE NOW!"}
//             </span>
//             <IoFlash className="w-5 h-5" />
//           </div>

//           <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
//             Data Flash Sale
//           </h1>
//           <p className="text-lg md:text-xl text-purple-200">
//             Unbeatable prices on all networks
//           </p>
//         </div>

//         {/* Countdown Timer or Next Sale Info */}
//         {isSaleEnded && (
//           <div className="max-w-2xl mx-auto mb-12">
//             <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
//               <div className="text-6xl mb-4">📅</div>
//               <h2 className="text-3xl font-black text-white mb-3">
//                 Flash Sale Coming Soon!
//               </h2>
//               <p className="text-purple-200 text-lg mb-4">
//                 Our next flash sale starts on
//               </p>
//               <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-4 rounded-xl inline-block">
//                 {/* Show crossed out teaser date if not on Mon-Wed */}
//                 {!isShowingTeaser && teaserDate && (
//                   <div className="text-xl text-purple-200 line-through mb-2 opacity-75">
//                     {formatDate(teaserDate)}
//                   </div>
//                 )}
//                 {/* Show the actual date */}
//                 <div className="text-4xl font-black">
//                   {isShowingTeaser && teaserDate
//                     ? formatDate(teaserDate)
//                     : formatDate(actualFriday)}
//                 </div>
//               </div>

//             </div>
//           </div>
//         )}

//         {!isSaleEnded && (
//           <div>
//             <div className="max-w-md mx-auto mb-12">
//               <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
//                 <div className="flex items-center justify-center gap-2 mb-4">
//                   <IoHourglassSharp className="w-5 h-5 text-yellow-400" />
//                   <span className="text-white font-semibold">Sale Ends In</span>
//                 </div>

//                 <div className="grid grid-cols-3 gap-3">
//                   <div className="text-center">
//                     <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4">
//                       <div className="text-3xl md:text-4xl font-black text-white">
//                         {String(timeLeft.hours).padStart(2, "0")}
//                       </div>
//                       <div className="text-purple-200 text-xs font-semibold">
//                         HOURS
//                       </div>
//                     </div>
//                   </div>
//                   <div className="text-center">
//                     <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4">
//                       <div className="text-3xl md:text-4xl font-black text-white">
//                         {String(timeLeft.minutes).padStart(2, "0")}
//                       </div>
//                       <div className="text-purple-200 text-xs font-semibold">
//                         MINS
//                       </div>
//                     </div>
//                   </div>
//                   <div className="text-center">
//                     <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-4">
//                       <div className="text-3xl md:text-4xl font-black text-white">
//                         {String(timeLeft.seconds).padStart(2, "0")}
//                       </div>
//                       <div className="text-purple-200 text-xs font-semibold">
//                         SECS
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             {/* Network Selector */}
//             <div className="mb-12">
//               <h2 className="text-white text-xl font-bold mb-4 text-center">
//                 Select Network
//               </h2>
//               <div className="grid grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto">
//                 {networks.map((network) => (
//                   <button
//                     key={network.id}
//                     onClick={() => setSelectedNetwork(network.id)}
//                     className={`relative bg-white/10 backdrop-blur-lg rounded-2xl p-4 md:p-6 border-2 transition-all duration-300 ${
//                       selectedNetwork === network.id
//                         ? `${network.borderColor} shadow-lg scale-105`
//                         : "border-white/20 hover:border-white/40"
//                     }`}
//                   >
//                     {selectedNetwork === network.id && (
//                       <div
//                         className={`absolute -top-2 -right-2 ${network.bgColor} text-white rounded-full p-1`}
//                       >
//                         <IoTrendingUp className="w-4 h-4" />
//                       </div>
//                     )}
//                     <div className="text-4xl md:text-5xl mb-2">
//                       {network.logo}
//                     </div>
//                     <div className="text-white font-bold text-sm md:text-base">
//                       {network.name}
//                     </div>
//                   </button>
//                 ))}
//               </div>
//             </div>
//             {/* Data Plans Grid */}
//             <div className="mb-8">
//               <div
//                 className={`inline-flex items-center gap-2 bg-gradient-to-r ${selectedNetworkData.color} text-white px-4 py-2 rounded-full font-bold text-sm mb-6`}
//               >
//                 <span>{selectedNetworkData.name} Flash Deals</span>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                 {plans.map((plan) => {
//                   const soldPercentage =
//                     (plan.stockSold / plan.stockAvailable) * 100;
//                   const stockLeft = plan.stockAvailable - plan.stockSold;

//                   return (
//                     <div
//                       key={plan.id}
//                       className="group bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:shadow-2xl hover:scale-105"
//                     >
//                       {/* Discount Badge */}
//                       <div className="flex justify-between items-start mb-4">
//                         <div
//                           className={`bg-gradient-to-r ${selectedNetworkData.color} text-white px-3 py-1 rounded-lg font-black text-sm`}
//                         >
//                           {plan.data}
//                         </div>
//                         <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1 rounded-lg font-black text-sm">
//                           -{plan.discount} OFF
//                         </div>
//                       </div>

//                       {/* Validity and Time Left */}
//                       <div className="flex items-center justify-between text-purple-200 text-sm mb-4">
//                         <span>{plan.validity} Validity</span>
//                         <div className="flex items-center gap-1 text-yellow-400">
//                           <IoTimeOutline className="w-4 h-4" />
//                           <span className="font-semibold">
//                             {timeLeft.hours}h {timeLeft.minutes}m
//                           </span>
//                         </div>
//                       </div>

//                       {/* Pricing */}
//                       <div className="mb-4">
//                         <div className="flex items-baseline gap-2">
//                           <span className="text-3xl font-black text-white">
//                             {plan.newPrice}
//                           </span>
//                           <span className="text-lg text-gray-400 line-through">
//                             {plan.oldPrice}
//                           </span>
//                         </div>
//                       </div>

//                       {/* Stock Info */}
//                       <div className="mb-4">
//                         <div className="flex items-center justify-between text-sm text-purple-200 mb-2">
//                           <div className="flex items-center gap-1">
//                             <IoGiftOutline className="w-4 h-4" />
//                             <span>Stock: {stockLeft} left</span>
//                           </div>
//                           <span>{soldPercentage.toFixed(0)}% sold</span>
//                         </div>
//                         <div className="h-2 bg-white/10 rounded-full overflow-hidden">
//                           <div
//                             className={`h-full bg-gradient-to-r ${selectedNetworkData.color} transition-all duration-500`}
//                             style={{ width: `${soldPercentage}%` }}
//                           ></div>
//                         </div>
//                         <div className="text-xs text-purple-300 mt-1">
//                           {plan.stockSold} / {plan.stockAvailable} sold
//                         </div>
//                       </div>

//                       {/* Buy Button */}
//                       <button
//                         className={`w-full bg-gradient-to-r ${selectedNetworkData.color} text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2`}
//                       >
//                         <span>Buy Now</span>
//                       </button>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
