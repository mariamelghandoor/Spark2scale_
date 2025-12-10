"use client";

import { motion } from "framer-motion";

// Generate sparkle positions OUTSIDE the component → no ESLint error
const sparklePositions = [...Array(6)].map(() => ({
    cx: 100 + Math.random() * 200,
    cy: 50 + Math.random() * 100,
}));

export default function LegoIllustration() {
    return (
        <div className="relative w-full max-w-md mx-auto">
            <svg
                viewBox="0 0 400 300"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto"
            >
                {/* Base platform */}
                <motion.rect
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    x="50"
                    y="220"
                    width="300"
                    height="20"
                    rx="4"
                    fill="#576238"
                    opacity="0.3"
                />

                {/* Stacked LEGO blocks */}
                {[0, 1, 2, 3, 4].map((index) => {
                    const yPos = 200 - index * 35;
                    const colors = ["#576238", "#FFD95D", "#8b9456", "#ffe89a", "#6b7c3f"];

                    return (
                        <g key={index}>
                            <motion.rect
                                initial={{ opacity: 0, y: -100 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: 0.3 + index * 0.15,
                                    type: "spring",
                                    stiffness: 200,
                                }}
                                x="150"
                                y={yPos}
                                width="100"
                                height="30"
                                rx="4"
                                fill={colors[index]}
                            />

                            <motion.circle
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 + index * 0.15 }}
                                cx="180"
                                cy={yPos - 5}
                                r="6"
                                fill={colors[index]}
                                opacity="0.8"
                            />

                            <motion.circle
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 + index * 0.15 }}
                                cx="220"
                                cy={yPos - 5}
                                r="6"
                                fill={colors[index]}
                                opacity="0.8"
                            />
                        </g>
                    );
                })}

                {/* Sparkles */}
                {sparklePositions.map((s, i) => (
                    <motion.circle
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                        transition={{
                            delay: 1 + i * 0.2,
                            duration: 1.5,
                            repeat: Infinity,
                            repeatDelay: 1,
                        }}
                        cx={s.cx}
                        cy={s.cy}
                        r="3"
                        fill="#FFD95D"
                    />
                ))}
            </svg>
        </div>
    );
}
