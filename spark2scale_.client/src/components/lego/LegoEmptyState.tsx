"use client";

import { motion } from "framer-motion";
import LegoBlock from "./LegoBlock";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface LegoEmptyStateProps {
    onAddClick: () => void;
}

export default function LegoEmptyState({ onAddClick }: LegoEmptyStateProps) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 bg-white/50 rounded-xl border-2 border-dashed border-[#576238]/20 min-h-[400px]">

            {/* Animation Container */}
            <div className="relative w-40 h-32 flex items-center justify-center mb-6">

                {/* The Foundation Block (Solid) */}
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="absolute bottom-0 z-10"
                >
                    <LegoBlock size="lg" color="#576238" completed={true} />
                </motion.div>

                {/* The Ghost Block (Hovering/Bouncing) */}
                <motion.div
                    className="absolute bottom-10 z-20 opacity-50"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    {/* We use a gray/transparent block to symbolize 'potential' */}
                    <div className="w-20 h-12 border-2 border-dashed border-[#576238] rounded-md flex items-center justify-center bg-[#576238]/10">
                        <Plus className="w-6 h-6 text-[#576238]" />
                    </div>
                </motion.div>

                {/* Floating particles */}
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-[#FFD95D]"
                        initial={{ opacity: 0, x: 0, y: 0 }}
                        animate={{
                            opacity: [0, 1, 0],
                            x: (i === 0 ? -40 : i === 1 ? 40 : 0),
                            y: -60
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.5,
                            ease: "easeOut"
                        }}
                    />
                ))}
            </div>

            <h3 className="text-2xl font-bold text-[#576238] mb-2 text-center">
                Start Building Your Empire
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-8">
                Every unicorn startup begins with a single block. Lay the foundation for your next big idea today.
            </p>

            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Button
                    onClick={onAddClick}
                    size="lg"
                    className="bg-[#576238] hover:bg-[#6b7c3f] text-white shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Lay the First Brick
                </Button>
            </motion.div>
        </div>
    );
}