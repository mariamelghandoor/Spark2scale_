"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LegoStep {
    id: string;
    title: string;
    color: string;
    shadowColor: string;
    description: string;
}

interface ScrollLegoTowerProps {
    activeIndex: number; // 0 to steps.length
    steps: LegoStep[];
}

export default function ScrollLegoTower({ activeIndex, steps }: ScrollLegoTowerProps) {
    return (
        <div className="relative flex flex-col justify-end items-center h-[500px] w-full max-w-[320px] mx-auto pb-10">
            {/* The Tower Base (Platform) */}
            <div className="relative w-72 h-8 bg-gradient-to-r from-[#8C7A65] to-[#B0A18F] rounded-t-xl shadow-2xl border-b-4 border-[#6E5D4B] z-10 flex items-center justify-center">
                <div className="flex gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="w-4 h-2 bg-[#6E5D4B]/40 rounded-full" />
                    ))}
                </div>
                {/* Platform reflection */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent rounded-t-xl pointer-events-none" />
            </div>

            {/* Glowing Ground Shadow */}
            <div className="absolute bottom-6 w-80 h-8 bg-black/10 blur-md rounded-full -z-10" />

            {/* The Tower Blocks Stacking Area */}
            <div className="absolute bottom-[40px] flex flex-col-reverse items-center w-full z-20">
                <AnimatePresence initial={false}>
                    {steps.map((step, index) => {
                        const isStacked = index < activeIndex;

                        if (!isStacked) return null;

                        return (
                            <motion.div
                                key={step.id}
                                initial={{ y: -400, rotate: index % 2 === 0 ? -15 : 15, opacity: 0, scale: 0.8 }}
                                animate={{ 
                                    y: 0, 
                                    rotate: 0, 
                                    opacity: 1, 
                                    scale: 1,
                                    transition: {
                                        type: "spring",
                                        stiffness: 180,
                                        damping: 15,
                                        mass: 0.8
                                    }
                                }}
                                exit={{ 
                                    y: -300, 
                                    opacity: 0, 
                                    rotate: index % 2 === 0 ? 10 : -10,
                                    transition: { duration: 0.3 } 
                                }}
                                className="relative w-56 h-16 -mt-1 cursor-pointer select-none group"
                            >
                                {/* 3D Lego Block Styling */}
                                <div 
                                    className="relative w-full h-[52px] rounded-xl shadow-xl transition-all duration-300 border-2 border-[#fff]/10"
                                    style={{
                                        backgroundColor: step.color,
                                        boxShadow: `0 8px 16px -4px rgba(0,0,0,0.2), inset 0 -6px 0 ${step.shadowColor}`,
                                    }}
                                >
                                    {/* Studs on top of the block */}
                                    <div className="absolute -top-[10px] left-0 right-0 flex justify-around px-8 pointer-events-none">
                                        {[1, 2, 3, 4].map((stud) => (
                                            <div 
                                                key={stud}
                                                className="w-5 h-3 rounded-full border border-black/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"
                                                style={{
                                                    backgroundColor: step.color,
                                                    boxShadow: `inset 0 -2px 3px ${step.shadowColor}`,
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Highlight reflection */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 rounded-xl pointer-events-none" />

                                    {/* Stage Label Text inside block */}
                                    <div className="absolute inset-0 flex flex-col justify-center items-center px-4 text-white">
                                        <span className="text-xs uppercase tracking-widest font-black opacity-60">
                                            Stage 0{index + 1}
                                        </span>
                                        <span className="text-sm font-bold tracking-tight drop-shadow-md">
                                            {step.title}
                                        </span>
                                    </div>

                                    {/* Inner shadows/glow */}
                                    <div className="absolute inset-x-2 bottom-1 h-[2px] bg-black/20 rounded-full opacity-60" />
                                </div>

                                {/* Floating Block Particles on Hover */}
                                <div className="absolute -inset-2 rounded-2xl border-2 border-dashed border-transparent group-hover:border-[#FFD95D]/40 transition-colors pointer-events-none" />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Empty Ghost Blocks Silhouette (shows target stack) */}
            <div className="absolute bottom-[40px] flex flex-col-reverse items-center w-full -z-10 opacity-15">
                {steps.map((step, index) => (
                    <div 
                        key={`ghost-${step.id}`}
                        className="w-56 h-16 -mt-1 border-2 border-dashed border-[#576238] rounded-xl flex items-center justify-center"
                    >
                        <span className="text-[10px] font-bold text-[#576238]">0{index + 1}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
