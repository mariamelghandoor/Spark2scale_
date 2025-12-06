"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();

    const showNotifications = pathname?.startsWith("/founder") ||
        pathname?.startsWith("/investor") ||
        pathname?.startsWith("/contributor");

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-lg"
        >
            <div className="container flex h-16 items-center justify-between">
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

                <div className="flex items-center gap-4">
                    <Link href="/plans">
                        <Button variant="ghost" className="font-semibold text-[#576238]">
                            Plans
                        </Button>
                    </Link>

                    {/* Simplified: Removed the wrapper div that might block clicks */}
                    {showNotifications && <NotificationsDropdown />}

                    <Link href="/signup">
                        <Button
                            variant="default"
                            className="bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold"
                        >
                            Get Started
                        </Button>
                    </Link>
                    <Link href="/contact">
                        <Button variant="outline" className="font-semibold border-[#576238] text-[#576238]">
                            Contact Us
                        </Button>
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}