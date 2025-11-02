// app/(protected)/home/ClientQuickActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  IoCellularOutline,
  IoCallOutline,
  IoFlashOutline,
  IoTvOutline,
  IoHeadsetOutline,
  IoSchoolOutline,
  IoGiftOutline,
  IoAddCircleOutline,
} from "react-icons/io5";

interface Action {
  title: string;
  route: string;
  icon: string; // String name from ICONS
  color: string;
}

interface Props {
  actions: Action[];
  user: any;
}

const iconMap: {
  [key: string]: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
} = {
  "cellular-outline": IoCellularOutline,
  "call-outline": IoCallOutline,
  "flash-outline": IoFlashOutline,
  "tv-outline": IoTvOutline,
  "headset-outline": IoHeadsetOutline,
  "school-outline": IoSchoolOutline,
  "gift-outline": IoGiftOutline,
};

export default function ClientQuickActions({ actions, user }: Props) {
  const router = useRouter();

  const handlePress = (action: Action) => {
    if (!user && action.route !== "commingsoon") {
      alert("Please log in to access this feature.");
      router.push("/sign-in");
      return;
    }
    router.push(`/${action.route}`);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-3 md:p-4">
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {actions.map((action, index) => {
          const Icon = iconMap[action.icon] || IoAddCircleOutline; // Map string to component
          return (
            <motion.button
              key={index}
              onClick={() => handlePress(action)}
              className="bg-gray-900 rounded-xl p-4 md:p-5 flex flex-col items-center justify-center hover:bg-gray-700 transition-colors w-full aspect-square"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon
                className="text-xl md:text-2xl lg:text-[60px] mb-1 md:mb-2 lg:mb-3"
                style={{ color: action.color }}
              />
              <span className="text-white text-xs md:text-sm font-medium text-center leading-tight">
                {action.title.length > 12
                  ? `${action.title.slice(0, 11)}...`
                  : action.title}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
