"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LegoBlockProps {
    size?: "sm" | "md" | "lg";
    color?: string;
    completed?: boolean;
    hasError?: boolean;
    delay?: number;
    className?: string;
}

export default function LegoBlock({
    size = "md",
    color = "#576238",
    completed = false,
    hasError = false,
    delay = 0,
    className,
}: LegoBlockProps) {
    const sizeClasses = {
        sm: "w-12 h-8",
        md: "w-16 h-10",
        lg: "w-20 h-12",
    };

    // Use red color for error state, otherwise use the provided color
    const blockColor = hasError ? "#DC2626" : color;

    return (
        <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{
                delay,
                duration: 0.6,
                type: "spring",
                stiffness: 260,
                damping: 20,
            }}
            className={cn("relative", sizeClasses[size], className)}
        >
            {/* Main block body */}
            <div
                className="absolute inset-0 rounded-md shadow-lg"
                style={{
                    backgroundColor: completed || hasError ? blockColor : "#d1d5db",
                    opacity: completed || hasError ? 1 : 0.4,
                }}
            >
                {/* LEGO studs on top */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                    <div
                        className="w-3 h-3 rounded-full shadow-inner"
                        style={{
                            backgroundColor: completed || hasError ? blockColor : "#d1d5db",
                            filter: "brightness(1.2)",
                        }}
                    />
                    <div
                        className="w-3 h-3 rounded-full shadow-inner"
                        style={{
                            backgroundColor: completed || hasError ? blockColor : "#d1d5db",
                            filter: "brightness(1.2)",
                        }}
                    />
                </div>

                {/* Shine effect */}
                {(completed || hasError) && (
                    <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/30 to-transparent" />
                )}
            </div>
        </motion.div>
    );
}