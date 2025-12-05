"use client";

import { motion, AnimatePresence } from "framer-motion";
import LegoBlock from "./LegoBlock";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface LegoAddTriggerProps {
    isDropped: boolean;     // Controlled from parent
    onTrigger: () => void;  // Fired when user clicks
    className?: string;
}

export default function LegoAddTrigger({ isDropped, onTrigger, className }: LegoAddTriggerProps) {

    const handleClick = () => {
        if (isDropped) return; // Don't trigger if already down
        onTrigger();
    };

    return (
        <div
            className={cn("col-span-full flex flex-col items-center justify-center py-16 px-4 bg-white/40 rounded-xl border-2 border-dashed border-[#576238]/20 min-h-[350px] group cursor-pointer hover:bg-white/60 transition-colors", className)}
            onClick={handleClick}
        >

            <div className="relative w-40 h-32 flex items-center justify-center mb-8">

                {/* 1. The Target Zone (Visible when NOT dropped) */}
                <AnimatePresence>
                    {!isDropped && (
                        <motion.div
                            key="target-zone"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }} // Shrink when block hits
                            className="absolute bottom-0 w-[64px] h-[40px] border-2 border-dashed border-[#576238]/40 rounded-md flex items-center justify-center bg-[#576238]/5"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Plus className="w-6 h-6 text-[#576238]/60" />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 2. The Dropped Block */}
                <AnimatePresence>
                    {isDropped && (
                        <motion.div
                            key="block"
                            className="absolute bottom-0 z-20"
                            // Drop IN
                            initial={{ y: -300, opacity: 0, scale: 1.1 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            // Fly OUT (Reset)
                            exit={{ y: -300, opacity: 0, scale: 0.9 }}
                            transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 20,
                            }}
                        >
                            <LegoBlock size="md" color="#576238" completed={true} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 3. Impact Dust Effect (Only shows briefly on drop) */}
                {isDropped && (
                    <>
                        <motion.div
                            className="absolute bottom-0 left-[-20px] w-2 h-2 bg-[#576238]/30 rounded-full"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 1, 0], scale: 2, x: -25 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                        />
                        <motion.div
                            className="absolute bottom-0 right-[-20px] w-2 h-2 bg-[#576238]/30 rounded-full"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 1, 0], scale: 2, x: 25 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                        />
                    </>
                )}
            </div>

            {/* Text Area */}
            <motion.div
                layout // Smoothly adjust position
                className="text-center"
            >
                <h3 className="text-2xl font-bold text-[#576238] mb-2 group-hover:scale-105 transition-transform">
                    {isDropped ? "Foundation Laid..." : "Start Your Journey"}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6 h-6">
                    {isDropped ? "Waiting for details..." : "Click to lay your first foundation block."}
                </p>

                {/* Button fades out when block drops */}
                <AnimatePresence>
                    {!isDropped && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="inline-flex items-center text-sm font-semibold text-[#576238] bg-[#576238]/10 px-4 py-2 rounded-full group-hover:bg-[#576238] group-hover:text-white transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Place Root Block
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

        </div>
    );
}