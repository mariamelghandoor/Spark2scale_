"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Navbar() {
    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-lg"
        >

            <div className="flex h-16 w-full items-center justify-between px-6 md:px-12">
                <Link href="/" className="flex items-center space-x-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#576238]">
                            <div className="flex gap-0.5">
                                <div className="h-2 w-2 rounded-full bg-[#FFD95D]" />
                                <div className="h-2 w-2 rounded-full bg-[#FFD95D]" />
                            </div>
                        </div>
                        <span className="text-xl font-bold text-[#576238]">Spark2Scale</span>
                    </div>
                </Link>

                <div className="flex items-center gap-4">
                    <Link href="/plans">
                        <Button variant="outline" className="font-semibold">
                            Plans
                        </Button>
                    </Link>
                    {/* Moved Contact Us here so the outline buttons are grouped */}
                    <Link href="/contact">
                        <Button variant="outline" className="font-semibold">
                            Contact Us
                        </Button>
                    </Link>
                    {/* Kept the primary CTA on the far right to anchor the visual weight */}
                    <Link href="/signup">
                        <Button
                            variant="default"
                            className="bg-[#576238] font-semibold text-white hover:bg-[#6b7c3f]"
                        >
                            Get Started
                        </Button>
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}