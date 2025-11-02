// app/(protected)/home/ClientFlashSaleBanner.tsx
"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function ClientFlashSaleBanner() {
  const router = useRouter();

  return (
    <motion.div
      className="bg-orange-500 rounded-xl p-3 md:p-4 mb-4 md:mb-6 text-center shadow-[0_2px_8px_rgba(255,69,0,0.5)] md:shadow-lg"
      initial={{ opacity: 1, scale: 1 }}
    >
      <button
        onClick={() => router.push("/commingsoon")}
        className="w-full text-left focus:outline-none"
        aria-label="Flash Sale"
      >
        <span className="text-white font-bold text-base md:text-lg block">
          ⚡ FLASH SALE! Up to 50% OFF Data Plans! ⚡
        </span>
      </button>
    </motion.div>
  );
}
