"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LegoLoader() {
    const [resetKey, setResetKey] = useState(0);
    const [textIndex, setTextIndex] = useState(0);

    const loadingTexts = [
        "Gathering Lego bricks...",
        "Snapping blocks into place...",
        "Designing your workspace...",
        "Building scaling modules...",
        "Polishing your dashboard..."
    ];

    // Loop the assembly animation every 4 seconds
    useEffect(() => {
        const assemblyInterval = setInterval(() => {
            setResetKey(prev => prev + 1);
        }, 4000);

        // Cycle texts slightly faster to keep interface feeling alive
        const textInterval = setInterval(() => {
            setTextIndex(prev => (prev + 1) % loadingTexts.length);
        }, 2000);

        return () => {
            clearInterval(assemblyInterval);
            clearInterval(textInterval);
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white/75 backdrop-blur-md border border-[#576238]/10 shadow-[0_20px_50px_rgba(87,98,56,0.1)] max-w-md w-full mx-auto relative overflow-hidden min-h-[350px]">
            {/* Ambient Background Glows */}
            <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-[#FFD95D]/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-[#576238]/15 blur-2xl pointer-events-none" />

            {/* Sparkle Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={`${resetKey}-particle-${i}`}
                        initial={{ opacity: 0, y: 60, scale: 0.5 }}
                        animate={{
                            opacity: [0, 0.6, 0],
                            y: [60, -20],
                            x: [0, (i % 2 === 0 ? 30 : -30) * Math.sin(i)],
                            scale: [0.5, 1, 0.5]
                        }}
                        transition={{
                            duration: 2.5,
                            delay: i * 0.4,
                            ease: "easeOut",
                        }}
                        className="absolute bottom-12 left-1/2 w-2 h-2 rounded-full bg-[#FFD95D]"
                        style={{ marginLeft: `${(i - 2.5) * 24}px` }}
                    />
                ))}
            </div>

            {/* Isometric SVG Build Canvas */}
            <div className="relative w-64 h-48 flex items-center justify-center">
                <svg viewBox="0 0 200 160" className="w-full h-full">
                    {/* Shadow Layer */}
                    <motion.ellipse
                        key={`${resetKey}-shadow`}
                        cx="100"
                        cy="110"
                        rx="45"
                        ry="18"
                        fill="rgba(87, 98, 56, 0.08)"
                        initial={{ scale: 0.6, opacity: 0.2 }}
                        animate={{
                            scale: [0.6, 0.8, 0.9, 1],
                            opacity: [0.2, 0.4, 0.7, 0.8]
                        }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    />

                    {/* Floor Baseplate Grid */}
                    <motion.g
                        key={`${resetKey}-baseplate`}
                        initial={{ opacity: 0, scale: 0.8, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                        {/* Diamond baseplate */}
                        <path d="M 100,120 L 160,90 L 100,60 L 40,90 Z" fill="#e8e5dc" stroke="#d5cfc1" strokeWidth="1.5" />
                        {/* Grid lines to make it look like a Lego panel */}
                        <path d="M 70,105 L 130,75 M 100,120 L 100,60 M 130,105 L 70,75" stroke="#d5cfc1" strokeWidth="1" strokeDasharray="2" />
                    </motion.g>

                    {/* Impact Ripple Waves */}
                    {/* Ripple 1: Earth Green Brick Landing */}
                    <motion.ellipse
                        key={`${resetKey}-ripple-1`}
                        cx="75"
                        cy="95"
                        rx="25"
                        ry="10"
                        stroke="#576238"
                        strokeWidth="1.5"
                        fill="none"
                        initial={{ opacity: 0, scale: 0.1 }}
                        animate={{ opacity: [0, 0.7, 0], scale: [0.1, 1.2] }}
                        transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                    />

                    {/* Ripple 2: Warm Yellow Brick Landing */}
                    <motion.ellipse
                        key={`${resetKey}-ripple-2`}
                        cx="125"
                        cy="95"
                        rx="25"
                        ry="10"
                        stroke="#FFD95D"
                        strokeWidth="1.5"
                        fill="none"
                        initial={{ opacity: 0, scale: 0.1 }}
                        animate={{ opacity: [0, 0.7, 0], scale: [0.1, 1.2] }}
                        transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                    />

                    {/* Ripple 3: Sage Green Brick Landing */}
                    <motion.ellipse
                        key={`${resetKey}-ripple-3`}
                        cx="100"
                        cy="82"
                        rx="35"
                        ry="14"
                        stroke="#8b9456"
                        strokeWidth="2"
                        fill="none"
                        initial={{ opacity: 0, scale: 0.1 }}
                        animate={{ opacity: [0, 0.8, 0], scale: [0.1, 1.3] }}
                        transition={{ delay: 1.2, duration: 0.7, ease: "easeOut" }}
                    />

                    {/* Assembled 3D Lego Bricks */}
                    {/* Brick 1: Earth Green (Left) */}
                    <motion.g
                        key={`${resetKey}-brick-1`}
                        initial={{ opacity: 0, y: -120, x: -20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        transition={{
                            delay: 0.3,
                            type: "spring",
                            stiffness: 280,
                            damping: 14
                        }}
                    >
                        {/* Translate group to local assembled position */}
                        <g transform="translate(55, 70)">
                            {/* Top Face */}
                            <path d="M 20,10 L 40,20 L 20,30 L 0,20 Z" fill="#576238" />
                            {/* Front Right Face */}
                            <path d="M 20,30 L 40,20 L 40,35 L 20,45 Z" fill="#434c2b" />
                            {/* Front Left Face */}
                            <path d="M 20,30 L 0,20 L 0,35 L 20,45 Z" fill="#2f351e" />
                            {/* Studs */}
                            <ellipse cx="13" cy="16.5" rx="3.5" ry="2" fill="#6e7c48" />
                            <path d="M 9.5,16.5 L 9.5,14 A 3.5,2 0 0 1 16.5,14 L 16.5,16.5 Z" fill="#576238" />

                            <ellipse cx="27" cy="23.5" rx="3.5" ry="2" fill="#6e7c48" />
                            <path d="M 23.5,23.5 L 23.5,21 A 3.5,2 0 0 1 30.5,21 L 30.5,23.5 Z" fill="#576238" />
                        </g>
                    </motion.g>

                    {/* Brick 2: Golden Yellow (Right) */}
                    <motion.g
                        key={`${resetKey}-brick-2`}
                        initial={{ opacity: 0, y: -120, x: 20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        transition={{
                            delay: 0.7,
                            type: "spring",
                            stiffness: 280,
                            damping: 14
                        }}
                    >
                        {/* Translate group to local assembled position */}
                        <g transform="translate(105, 70)">
                            {/* Top Face */}
                            <path d="M 20,10 L 40,20 L 20,30 L 0,20 Z" fill="#FFD95D" />
                            {/* Front Right Face */}
                            <path d="M 20,30 L 40,20 L 40,35 L 20,45 Z" fill="#e6c043" />
                            {/* Front Left Face */}
                            <path d="M 20,30 L 0,20 L 0,35 L 20,45 Z" fill="#cca429" />
                            {/* Studs */}
                            <ellipse cx="13" cy="16.5" rx="3.5" ry="2" fill="#ffe28a" />
                            <path d="M 9.5,16.5 L 9.5,14 A 3.5,2 0 0 1 16.5,14 L 16.5,16.5 Z" fill="#FFD95D" />

                            <ellipse cx="27" cy="23.5" rx="3.5" ry="2" fill="#ffe28a" />
                            <path d="M 23.5,23.5 L 23.5,21 A 3.5,2 0 0 1 30.5,21 L 30.5,23.5 Z" fill="#FFD95D" />
                        </g>
                    </motion.g>

                    {/* Brick 3: Sage Green (Top Arch linking Green and Yellow) */}
                    <motion.g
                        key={`${resetKey}-brick-3`}
                        initial={{ opacity: 0, y: -160, rotate: -8 }}
                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                        transition={{
                            delay: 1.1,
                            type: "spring",
                            stiffness: 300,
                            damping: 12
                        }}
                    >
                        {/* Translate group to local assembled position */}
                        <g transform="translate(65, 45)">
                            {/* Top Face - Spanning wider (2x4 design) */}
                            <path d="M 35,5 L 70,22.5 L 35,40 L 0,22.5 Z" fill="#8b9456" />
                            {/* Front Right Face */}
                            <path d="M 35,40 L 70,22.5 L 70,37.5 L 35,55 Z" fill="#747c43" />
                            {/* Front Left Face */}
                            <path d="M 35,40 L 0,22.5 L 0,37.5 L 35,55 Z" fill="#5d6335" />
                            
                            {/* Studs (4 spaced along the arch) */}
                            <ellipse cx="18" cy="14" rx="3.5" ry="2" fill="#a5b06d" />
                            <path d="M 14.5,14 L 14.5,11.5 A 3.5,2 0 0 1 21.5,11.5 L 21.5,14 Z" fill="#8b9456" />

                            <ellipse cx="35" cy="22.5" rx="3.5" ry="2" fill="#a5b06d" />
                            <path d="M 31.5,22.5 L 31.5,20 A 3.5,2 0 0 1 38.5,20 L 38.5,22.5 Z" fill="#8b9456" />

                            <ellipse cx="52" cy="31" rx="3.5" ry="2" fill="#a5b06d" />
                            <path d="M 48.5,31 L 48.5,28.5 A 3.5,2 0 0 1 55.5,28.5 L 55.5,31 Z" fill="#8b9456" />

                            <ellipse cx="35" cy="13" rx="3.5" ry="2" fill="#a5b06d" />
                            <path d="M 31.5,13 L 31.5,10.5 A 3.5,2 0 0 1 38.5,10.5 L 38.5,13 Z" fill="#8b9456" />
                        </g>
                    </motion.g>

                    {/* Success Sparkle Star (Triggers after assembly snaps) */}
                    <motion.path
                        key={`${resetKey}-success-sparkle`}
                        d="M 100,25 L 102,32 L 109,34 L 102,36 L 100,43 L 98,36 L 91,34 L 98,32 Z"
                        fill="#FFD95D"
                        initial={{ opacity: 0, scale: 0.1, rotate: -45 }}
                        animate={{ opacity: [0, 1, 1, 0], scale: [0.1, 1.4, 1.4, 0.1], rotate: [0, 90, 180, 270] }}
                        transition={{ delay: 1.5, duration: 1.2, ease: "easeInOut" }}
                    />
                </svg>
            </div>

            {/* Dynamic Text Messages with AnimatePresence */}
            <div className="h-8 mt-4 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={textIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="text-[#576238] font-bold text-base tracking-wide text-center"
                    >
                        {loadingTexts[textIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>
            
            {/* Visual Build Indicator Progress dots */}
            <div className="flex gap-1.5 mt-3 justify-center">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className={`w-2.5 h-1 rounded-full transition-all duration-300 ${i === textIndex ? "w-6 bg-[#576238]" : "bg-gray-200"}`}
                    />
                ))}
            </div>
        </div>
    );
}