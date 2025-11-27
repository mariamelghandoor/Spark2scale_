"use client";

import { motion } from "framer-motion";
import LegoBlock from "./LegoBlock";

interface LegoProgressProps {
    totalStages: number;
    completedStages: number;
    stageErrors?: boolean[];
    className?: string;
}

export default function LegoProgress({
    totalStages,
    completedStages,
    stageErrors = [],
    className,
}: LegoProgressProps) {
    const colors = [
        "#576238",
        "#FFD95D",
        "#8b9456",
        "#ffe89a",
        "#6b7c3f",
        "#ffdf7a",
    ];

    return (
        <div className={className}>
            <div className="flex flex-col-reverse items-center gap-1">
                {Array.from({ length: totalStages }).map((_, index) => (
                    <motion.div
                        key={index}
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                            delay: index * 0.1,
                            duration: 0.5,
                            type: "spring",
                        }}
                    >
                        <LegoBlock
                            size="md"
                            color={colors[index % colors.length]}
                            completed={index < completedStages}
                            hasError={stageErrors[index] || false}
                            delay={index * 0.1}
                        />
                    </motion.div>
                ))}
            </div>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center mt-4 text-sm font-medium text-muted-foreground"
            >
                {completedStages} / {totalStages} Complete
            </motion.p>
        </div>
    );
}