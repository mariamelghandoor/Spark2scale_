"use client";

import { motion, Variants, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import LegoBlock from "./LegoBlock";

export default function LegoResearchLoader() {
    const [messageIndex, setMessageIndex] = useState(0);

    const messages = [
        "Gathering market insights...",
        "Analyzing competitors...",
        "Stacking the data blocks...",
        "Building your report...",
        "Almost there! 🚀"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const blockVariants: Variants = {
        animate: (i: number) => ({
            y: [-50, 0, 0, 50],
            opacity: [0, 1, 1, 0],
            scale: [0.9, 1, 1, 0.9],
            transition: {
                duration: 2.5,
                repeat: Infinity,
                times: [0, 0.2, 0.8, 1],
                delay: i * 0.15,
                ease: ["easeOut", "linear", "easeIn"]
            }
        })
    };

    return (
        <div className="flex flex-col items-center justify-center py-20">

            <div className="relative w-32 h-40 flex flex-col-reverse items-center mb-10">
                <div className="absolute inset-0 bg-[#FFD95D]/20 blur-3xl rounded-full animate-pulse" />

                {/* Base Block */}
                <motion.div className="z-10" custom={0} variants={blockVariants} animate="animate">
                    <LegoBlock size="lg" color="#576238" completed={true} />
                </motion.div>

                {/* Middle Block 1 (-mb-2 makes it perfectly click over the studs below it) */}
                <motion.div className="z-20 -mb-2" custom={1} variants={blockVariants} animate="animate">
                    <LegoBlock size="md" color="#FFD95D" completed={true} />
                </motion.div>

                {/* Middle Block 2 */}
                <motion.div className="z-30 -mb-2" custom={2} variants={blockVariants} animate="animate">
                    <LegoBlock size="md" color="#F0EADC" completed={true} />
                </motion.div>

                {/* Top Block */}
                <motion.div className="z-40 -mb-2" custom={3} variants={blockVariants} animate="animate">
                    <LegoBlock size="sm" color="#576238" completed={true} />
                </motion.div>

            </div>

            <div className="h-16 flex flex-col items-center justify-center text-center">
                <h3 className="text-xl font-extrabold text-[#576238] tracking-tight">Building Your Research</h3>
                <div className="relative h-6 w-64 flex justify-center mt-2">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={messageIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="text-gray-500 text-sm font-semibold absolute w-full"
                        >
                            {messages[messageIndex]}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>

        </div>
    );
}