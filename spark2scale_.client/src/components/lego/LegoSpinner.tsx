<<<<<<< HEAD
import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export default function LegoSpinner({ className, ...props }: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("inline-block", className)}
            aria-hidden="true"
            {...props}
        >
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="40 60"
                opacity="0.9"
            />
            <circle cx="12" cy="3.5" r="1.5" fill="currentColor" />
            <circle cx="20.5" cy="12" r="1" fill="currentColor" opacity="0.55" />
=======
import React from "react";
import { cn } from "@/lib/utils";

interface LegoSpinnerProps extends React.SVGProps<SVGSVGElement> {}

export default function LegoSpinner({ className, ...props }: LegoSpinnerProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn("w-4 h-4", className)}
            {...props}
        >
            {/* Base block */}
            <rect x="2" y="4" width="20" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
            {/* Studs */}
            <path d="M5 4V2.5C5 1.67 5.67 1 6.5 1h2C9.33 1 10 1.67 10 2.5V4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M14 4V2.5C14 1.67 14.67 1 15.5 1h2C18.33 1 19 1.67 19 2.5V4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Inner details or highlights could go here, but keeping it clean for small sizes */}
>>>>>>> 39a4a5fcac3104a30e216f6bb7710f482b848703
        </svg>
    );
}
