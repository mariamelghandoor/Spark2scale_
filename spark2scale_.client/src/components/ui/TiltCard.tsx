"use client";

import React, { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface TiltCardProps extends React.ComponentProps<typeof motion.div> {
    children: React.ReactNode;
    maxRotation?: number; // max rotation degrees
    perspective?: number; // 3D perspective depth
    glareOpacity?: number; // max opacity of glare
}

export default function TiltCard({
    children,
    className,
    maxRotation = 12,
    perspective = 1000,
    glareOpacity = 0.15,
    ...props
}: TiltCardProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Motion values for rotation and mouse position
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Spring physics configurations for super smooth hover responses
    const springConfig = { damping: 25, stiffness: 200, mass: 0.5 };
    const rotateX = useSpring(x, springConfig);
    const rotateY = useSpring(y, springConfig);

    // Glare position motion values
    const glareX = useMotionValue(0);
    const glareY = useMotionValue(0);
    const glareXSpring = useSpring(glareX, springConfig);
    const glareYSpring = useSpring(glareY, springConfig);
    const glareOpacityMv = useMotionValue(0);
    const glareOpacitySpring = useSpring(glareOpacityMv, springConfig);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = ref.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Position of mouse relative to card center (-0.5 to 0.5)
        const mouseX = (e.clientX - rect.left) / width - 0.5;
        const mouseY = (e.clientY - rect.top) / height - 0.5;

        // Calculate rotation degrees (rotateY is affected by X movement, rotateX by Y movement)
        const rX = -mouseY * maxRotation;
        const rY = mouseX * maxRotation;

        x.set(rX);
        y.set(rY);

        // Update glare positions (0% to 100%)
        glareX.set(((e.clientX - rect.left) / width) * 100);
        glareY.set(((e.clientY - rect.top) / height) * 100);
        glareOpacityMv.set(glareOpacity);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        glareOpacityMv.set(0);
    };

    // Interpolate glare gradient template
    const glareBg = useMotionTemplate`radial-gradient(circle 200px at ${glareXSpring}% ${glareYSpring}%, rgba(255, 255, 255, 0.4), transparent)`;

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transformStyle: "preserve-3d",
                perspective: `${perspective}px`,
                rotateX,
                rotateY,
            }}
            className={cn(
                "relative overflow-hidden transition-shadow duration-300 ease-out select-none",
                className
            )}
            {...props}
        >
            {/* Tilt content wrapper */}
            <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }} className="h-full w-full">
                {children}
            </div>

            {/* Dynamic Glare/Light Reflection Overlay */}
            <motion.div
                className="pointer-events-none absolute inset-0 mix-blend-overlay"
                style={{
                    background: glareBg,
                    opacity: glareOpacitySpring,
                }}
            />
        </motion.div>
    );
}
