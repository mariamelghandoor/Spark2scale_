"use client";

import { motion } from "framer-motion";
import LegoBlock from "./LegoBlock";
import { Check } from "lucide-react";

export default function LegoNotificationEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full py-4 space-y-3">
      {/* Animation Container - Scaled down for the dropdown */}
      <div className="relative scale-75">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="relative"
        >
          {/* The Main Block */}
          <LegoBlock size="lg" color="#576238" completed={true} />

          {/* The Floating Checkmark */}
          <motion.div
            className="absolute -top-3 -right-2 bg-white rounded-full p-1 shadow-md border-2 border-[#576238]/20"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Check className="w-3 h-3 text-[#576238]" />
          </motion.div>
        </motion.div>
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-xs font-bold text-[#576238]">All caught up!</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          No new blocks to stack.
        </p>
      </div>
    </div>
  );
}