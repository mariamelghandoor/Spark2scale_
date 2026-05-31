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
        </svg>
    );
}
