"use client";

import { motion, Variants } from "framer-motion";
import { useState, useEffect } from "react";
import LegoBlock from "./LegoBlock"; // Make sure this path is correct based on your folder structure

export type LoaderType = "Market" | "Evaluate" | "Recommend";

interface LegoResearchLoaderProps {
    type?: LoaderType;
}

export default function LegoResearchLoader({ type = "Market" }: LegoResearchLoaderProps) {
    const [messageIndex, setMessageIndex] = useState(0);

    // Dynamic configuration based on the type prop
    const loaderConfig = {
        Market: {
            title: "Building Your Research",
            messages: [
                "Gathering market insights...",
                "Analyzing competitors...",
                "Calculating TAM / SAM / SOM...",
                "Building your report...",
                "Almost there! 🚀"
            ]
        },
        Evaluate: {
            title: "Evaluating Startup",
            messages: [
                "Scanning business model...",
                "Checking for logical contradictions...",
                "Scoring founder experience...",
                "Compiling final verdict...",
                "Almost there! 🎯"
            ]
        },
        Recommend: {
            title: "Drafting Strategy",
            messages: [
                "Reviewing evaluation scores...",
                "Identifying critical gaps...",
                "Formulating top 3 priorities...",
                "Generating strategic advice...",
                "Almost there! 💡"
            ]
        }
    };

    const { title, messages } = loaderConfig[type];

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [messages.length]);

    const blockVariants: Variants = {
        hidden: { y: -50, opacity: 0 },
        visible: (i: number) => ({
            y: 0,
            opacity: 1,
            transition: {
                delay: i * 0.5,
                type: "spring",
                stiffness: 120,
                repeat: Infinity,
                repeatDelay: 2,
                repeatType: "reverse"
            }
        })
    };

    return (
        <div className="flex flex-col items-center justify-center py-20 w-full">
            {/* Lego Structure Animation - Reverted to the flex-col-reverse stacking theme */}
            <div className="relative w-32 h-40 flex flex-col-reverse items-center mb-8">

                {/* Base Block (Green) */}
                <motion.div
                    className="z-10"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <LegoBlock size="lg" color="#576238" completed={true} />
                </motion.div>

                {/* Middle Block 1 (Yellow) */}
                <motion.div
                    className="z-20 -mb-2" // Negative margin to overlap slightly like real Legos
                    custom={1}
                    variants={blockVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <LegoBlock size="md" color="#FFD95D" completed={true} />
                </motion.div>

                {/* Middle Block 2 (Cream) */}
                <motion.div
                    className="z-30 -mb-2"
                    custom={2}
                    variants={blockVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <LegoBlock size="md" color="#F0EADC" completed={true} />
                </motion.div>

                {/* Top Block (Green) */}
                <motion.div
                    className="z-40 -mb-2"
                    custom={3}
                    variants={blockVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <LegoBlock size="sm" color="#576238" completed={true} />
                </motion.div>
            </div>

            {/* Loading Message */}
            <div className="h-16 flex flex-col items-center">
                <h3 className="text-xl font-bold text-[#576238]">{title}</h3>
                <motion.div
                    key={messageIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center"
                >
                    <p className="text-gray-500 mt-2 min-w-[200px]">{messages[messageIndex]}</p>
                </motion.div>
            </div>
        </div>
    );
}