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
            <div className="w-full flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
                <Link href="/" className="flex items-center space-x-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#576238] rounded-md flex items-center justify-center">
                            <div className="flex gap-0.5">
                                <div className="w-2 h-2 rounded-full bg-[#FFD95D]" />
                                <div className="w-2 h-2 rounded-full bg-[#FFD95D]" />
                            </div>
                        </div>
                        <span className="text-xl font-bold text-[#576238]">Spark2Scale</span>
                    </div>
                </Link>

                <div className="flex items-center gap-3 md:gap-4">
                    <Link href="/plans">
                        <Button variant="outline" className="font-semibold">
                            Plans
                        </Button>
                    </Link>
                    <Link href="/signup">
                        <Button
                            variant="default"
                            className="bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold"
                        >
                            Get Started
                        </Button>
                    </Link>
                    <Link href="/contact">
                        <Button variant="outline" className="font-semibold">
                            Contact Us
                        </Button>
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}