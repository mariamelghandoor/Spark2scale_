"use client";

import { motion } from "framer-motion";
import LegoBlock from "./LegoBlock"; // Assuming this is in the same folder

export default function LegoLoader() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full bg-white/50 rounded-xl border-2 border-dashed border-[#576238]/20">
            <div className="relative w-32 h-40 flex flex-col-reverse items-center">
                {/* Base Block (Green) */}
                <motion.div
                    className="z-10"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        repeatDelay: 2, // Wait for others to stack
                        ease: "backOut"
                    }}
                >
                    <LegoBlock size="lg" color="#576238" completed={true} />
                </motion.div>

                {/* Middle Block (Yellow) - Drops on top */}
                <motion.div
                    className="z-20 -mb-2" // Negative margin to overlap slightly like real Legos
                    initial={{ opacity: 0, y: -100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        delay: 0.5, // Start after base
                        duration: 0.5,
                        repeat: Infinity,
                        repeatDelay: 2, // Sync with loop
                        type: "spring",
                        bounce: 0.5
                    }}
                >
                    <LegoBlock size="md" color="#FFD95D" completed={true} />
                </motion.div>

                {/* Top Block (Light Green) - Drops last */}
                <motion.div
                    className="z-30 -mb-2"
                    initial={{ opacity: 0, y: -100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        delay: 1.0, // Start after middle
                        duration: 0.5,
                        repeat: Infinity,
                        repeatDelay: 2,
                        type: "spring",
                        bounce: 0.5
                    }}
                >
                    <LegoBlock size="sm" color="#8b9456" completed={true} />
                </motion.div>
            </div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                className="mt-6 text-[#576238] font-bold text-lg tracking-wider"
            >
                LOADING DATA...
            </motion.p>
        </div>
    );
}