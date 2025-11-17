// Header Component
import Image from "next/image";
import { Key } from "react";
import { IoSearch, IoClose, IoArrowBackOutline } from "react-icons/io5";

const categories = [
  "Hot",
  "Daily Plans",
  "Weekly Plans",
  "Monthly Plans",
];

export const DataScreenHeader = ({
  provider,
  walletBalance,
  activeCategory,
  onCategoryChange,
  activePlanType,
  planTypeOptions,
  onPlanTypeChange,
  searchTerm,
  onSearchChange,
  onSearchClear,
  onBack,
}: any) => {
  const formatNumber = (num: number) => num.toLocaleString();

   return (
     <div className="sticky top-0 z-20 bg-black border-b border-gray-800">
       <div className="w-full max-w-7xl mx-auto px-4 py-2">
         {/* Header with Back Button and Provider Info */}
         <div className="flex items-center gap-3 mb-4">
           <button
             onClick={onBack}
             className="p-2 hover:bg-gray-800 rounded-full transition-colors"
             aria-label="Go back"
           >
             <IoArrowBackOutline size={24} className="text-white" />
           </button>

           {/* Provider Logo */}
           <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center">
             {provider.image ? (
               <Image
                 src={provider.image}
                 alt={provider.name}
                 width={40}
                 height={40}
                 className="object-contain"
               />
             ) : (
               <span className="text-xs font-bold text-gray-800">
                 {provider.name[0]}
               </span>
             )}
           </div>

           <h1 className="text-lg md:text-xl font-bold text-white">
             {provider.name} Data Plans
           </h1>
         </div>

         {/* Wallet Balance */}
         <div className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2 mb-4">
           <span className="text-sm text-gray-400">Wallet Balance:</span>
           <span className="text-base md:text-lg font-semibold text-white">
             ₦{formatNumber(walletBalance)}
           </span>
         </div>

         {/* Search Bar */}
         <div className="relative mb-4">
           <IoSearch
             size={20}
             className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
           />
           <input
             type="text"
             value={searchTerm}
             onChange={(e) => onSearchChange(e.target.value)}
             placeholder="Search plans (e.g., 1GB for 30 days)"
             className="w-full bg-gray-900 text-white rounded-lg pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#744925]"
           />
           {searchTerm && (
             <button
               onClick={onSearchClear}
               className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded-full transition-colors"
             >
               <IoClose size={18} className="text-gray-400" />
             </button>
           )}
         </div>

         {/* Categories */}
         {!searchTerm && (
           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-3">
             {categories.map((cat) => (
               <button
                 key={cat}
                 onClick={() => onCategoryChange(cat)}
                 className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                   activeCategory === cat
                     ? "bg-[#744925] text-white"
                     : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                 }`}
               >
                 {cat === "Hot" ? "🔥 Hot" : cat}
               </button>
             ))}
           </div>
         )}

         {/* Plan Types (Only show for non-Hot categories) */}
         {!searchTerm &&
           activeCategory !== "Hot" &&
           planTypeOptions.length > 0 && (
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
               {planTypeOptions.map((type: string) => (
                 <button
                   key={type}
                   onClick={() => onPlanTypeChange(type)}
                   className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                     activePlanType === type
                       ? "bg-[#744925] text-white"
                       : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                   }`}
                 >
                   {type.replace(/_/g, " ")}
                 </button>
               ))}
             </div>
           )}
       </div>
     </div>
   );
};

