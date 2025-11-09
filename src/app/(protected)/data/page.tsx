// app/(protected)/data/page.tsx

"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImSpinner9 } from "react-icons/im";
import { NETWORK_IMAGES } from "@/constants/helper";

const DEFAULT_PROVIDER_IMAGE = "/default-provider.png";

const SUPPORTED_PROVIDERS = ["MTN", "AIRTEL", "GLO", "9MOBILE"];

const NETWORK_ID_MAPPING = {
  MTN: { ebenk: 1, lizzysub: 1 },
  AIRTEL: { ebenk: 4, lizzysub: 2 },
  GLO: { ebenk: 2, lizzysub: 3 },
  "9MOBILE": { ebenk: 3, lizzysub: 4 },
};

interface Provider {
  id: number;
  name: string;
  image: string;
  code: string;
  imageKey?: string;
  availablePlanTypes?: string[];
  ebenkId: number;
  lizzysubId: number;
}

export default function BuyDataProvider() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>(
    {}
  );

  // Mock providers data
  const providers: Provider[] = SUPPORTED_PROVIDERS.map((name) => {
    const mapping = NETWORK_ID_MAPPING[name as keyof typeof NETWORK_ID_MAPPING];
    return {
      id: mapping.ebenk,
      name,
      image:
        NETWORK_IMAGES[name as keyof typeof NETWORK_IMAGES] ||
        DEFAULT_PROVIDER_IMAGE,
      code: name.toLowerCase(),
      imageKey: name,
      availablePlanTypes: [
        "SME",
        "SME_GIFTING",
        "CORPORATE_GIFTING",
        "GIFTING",
        "STANDARD",
        "HOTPLAN",
      ],
      ebenkId: mapping.ebenk,
      lizzysubId: mapping.lizzysub,
    };
  });

  const selectProvider = (provider: Provider) => {
    const serializableProvider = {
      id: provider.id,
      name: provider.name,
      code: provider.code,
      imageKey: provider.imageKey,
      image: provider.image,
      availablePlanTypes: provider.availablePlanTypes,
      ebenkId: provider.ebenkId,
      lizzysubId: provider.lizzysubId,
    };

    // Use router.push with state (Next.js 15 approach)
    // The state will be available in the serviceprovider page via useSearchParams or props
    router.push(`/data/${provider.code}`);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    // Simulate reload
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleImageError = (providerName: string) => {
    console.warn(`Image failed to load for ${providerName}`);
    setImageErrors((prev) => ({ ...prev, [providerName]: true }));
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
            📱 Select Data Provider
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            Choose your network provider to continue
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ImSpinner9 className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 animate-spin mb-4" />
            <p className="text-base sm:text-lg text-gray-300">
              Loading providers...
            </p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 sm:p-8 max-w-md mx-auto mb-6">
              <p className="text-red-400 text-center text-sm sm:text-base mb-4">
                {error}
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="bg-green-500 hover:bg-green-600 text-black px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <ImSpinner9 className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : providers.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <p className="text-gray-400 text-base sm:text-lg">
              No providers available at the moment.
            </p>
          </div>
        ) : (
          /* Provider Grid */
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {providers.map((provider) => (
              <button
                key={`${provider.name}-${provider.ebenkId}`}
                onClick={() => selectProvider(provider)}
                className="bg-gray-900 hover:bg-gray-800 rounded-full p-4 sm:p-6 lg:p-8
                         flex flex-col items-center justify-center
                         aspect-square transition-all duration-200
                         hover:ring-2 hover:ring-green-400 hover:scale-105
                         active:scale-95"
                aria-label={`Select ${provider.name} provider`}
              >
                <div className="flex flex-col items-center justify-center w-full h-full">
                  {imageErrors[provider.name] ? (
                    /* Fallback UI */
                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gray-700 rounded-full flex items-center justify-center mb-3">
                      <span className="text-white text-xs sm:text-sm font-semibold text-center px-2">
                        {provider.name}
                      </span>
                    </div>
                  ) : (
                    /* Provider Logo */
                    <div className="relative w-12 h-12 sm:w-24 sm:h-24 mb-3 rounded-full overflow-hidden">
                      <Image
                        src={provider.image}
                        alt={provider.name}
                        fill
                        className="object-contain"
                        onError={() => handleImageError(provider.name)}
                      />
                    </div>
                  )}
                  <span className="text-white font-semibold text-xs sm:text-sm lg:text-base text-center">
                    {provider.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Info Section */}
        {!loading && !error && providers.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              Select a provider to view available data plans
            </p>
          </div>
        )}
      </div>
    </div>
  );
}