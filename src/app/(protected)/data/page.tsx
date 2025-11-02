import React from 'react'

const BuyDataPage = () => {
  return (
    <div>BuyData Page</div>
  )
}

export default BuyDataPage

// // app/(protected)/buy/page.tsx
// 'use client';

// import { useEffect, useState, useRef, useCallback } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { FaCellular, FaExclamationTriangle, FaSync } from 'react-icons/fa';
// import { motion } from 'framer-motion';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// import { NETWORK_IMAGES, DEFAULT_PROVIDER_IMAGE } from '@/constants/helper'; // Assume this is ported

// const SUPPORTED_PROVIDERS = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];
// const VALID_PLAN_TYPES = ['SME', 'SME_GIFTING', 'CORPORATE_GIFTING', 'GIFTING', 'STANDARD', 'HOTPLAN'];

// const NETWORK_ID_MAPPING = {
//   MTN: { ebenk: 1, lizzysub: 1 },
//   AIRTEL: { ebenk: 4, lizzysub: 2 },
//   GLO: { ebenk: 2, lizzysub: 3 },
//   '9MOBILE': { ebenk: 3, lizzysub: 4 },
// };

// interface Provider {
//   id: number;
//   name: string;
//   image: string; // Updated for web
//   code: string;
//   imageKey?: string;
//   availablePlanTypes?: string[];
//   ebenkId: number;
//   lizzysubId: number;
// }

// export default function BuyPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const supabase = createClientComponentClient();
//   const scrollRef = useRef<HTMLDivElement>(null);
//   const [providers, setProviders] = useState<Provider[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});

//   const loadProviders = useCallback(() => {
//     try {
//       setLoading(true);
//       setError(null);

//       const mappedProviders: Provider[] = SUPPORTED_PROVIDERS.map((name) => {
//         const mapping = NETWORK_ID_MAPPING[name as keyof typeof NETWORK_ID_MAPPING];
//         return {
//           id: mapping.ebenk,
//           name,
//           image: NETWORK_IMAGES[name] || DEFAULT_PROVIDER_IMAGE,
//           code: name.toLowerCase(),
//           imageKey: name,
//           availablePlanTypes: VALID_PLAN_TYPES,
//           ebenkId: mapping.ebenk,
//           lizzysubId: mapping.lizzysub,
//         };
//       });

//       setProviders(mappedProviders);
//     } catch (err: any) {
//       setError('Could not load providers. Please try again.');
//       setProviders([]);
//       console.error('Provider load error:', err);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadProviders();
//   }, [loadProviders]);

//   const selectProvider = (provider: Provider) => {
//     if (isNaN(provider.ebenkId) || provider.ebenkId <= 0) {
//       alert('Error: Invalid provider data.');
//       return;
//     }

//     const serializableProvider = {
//       id: provider.id,
//       name: provider.name,
//       code: provider.code,
//       imageKey: provider.imageKey,
//       image: provider.image,
//       availablePlanTypes: provider.availablePlanTypes,
//       ebenkId: provider.ebenkId,
//       lizzysubId: provider.lizzysubId,
//     };

//     const balance = searchParams.get('balance') || '0';

//     router.push({
//       pathname: '/(protected)/serviceprovider',
//       query: {
//         provider: JSON.stringify(serializableProvider),
//         networkId: provider.id.toString(),
//         ebenkId: provider.ebenkId.toString(),
//         lizzysubId: provider.lizzysubId.toString(),
//         balance,
//       },
//     });
//   };

//   const handleRetry = useCallback(() => {
//     loadProviders();
//     alert('Retrying: Fetching providers...');
//   }, [loadProviders]);

//   const handleImageError = (providerName: string) => {
//     console.warn(`Image failed to load for ${providerName}`);
//     setImageErrors((prev) => ({ ...prev, [providerName]: true }));
//   };

//   return (
//     <div className="flex-1 bg-black p-4 overflow-y-auto" ref={scrollRef}>
//       <h1 className="text-2xl font-bold text-white text-center mb-6">📱 Select Data Provider</h1>

//       {loading ? (
//         <div className="flex flex-col items-center justify-center mt-12">
//           <FaSync className="animate-spin text-4xl text-green-500 mb-2" />
//           <p className="text-white">Loading providers...</p>
//         </div>
//       ) : error ? (
//         <div className="flex flex-col items-center justify-center mt-12">
//           <p className="text-red-500 text-center mb-4">{error}</p>
//           <button
//             onClick={handleRetry}
//             className="bg-green-500 text-black px-5 py-2 rounded-lg font-semibold"
//           >
//             Retry
//           </button>
//         </div>
//       ) : providers.length === 0 ? (
//         <p className="text-gray-400 text-center mt-12">No providers available.</p>
//       ) : (
//         <div className="grid grid-cols-2 gap-4">
//           {providers.map((provider) => (
//             <motion.button
//               key={`${provider.name}-${provider.ebenkId}-${provider.lizzysubId}`}
//               onClick={() => selectProvider(provider)}
//               className="bg-gray-800 rounded-full p-2 flex flex-col items-center justify-center aspect-square hover:bg-gray-700 transition-colors"
//               whileTap={{ scale: 0.95 }}
//               role="button"
//               aria-label={`Select ${provider.name} provider`}
//             >
//               <div className="flex flex-col items-center justify-center">
//                 {imageErrors[provider.name] ? (
//                   <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mb-2">
//                     <span className="text-white text-sm text-center">{provider.name}</span>
//                   </div>
//                 ) : (
//                   <img
//                     src={provider.image}
//                     alt={provider.name}
//                     className="w-20 h-20 rounded-full mb-2 object-contain"
//                     onError={() => handleImageError(provider.name)}
//                   />
//                 )}
//                 <span className="text-white font-semibold text-sm text-center">{provider.name}</span>
//               </div>
//             </motion.button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }