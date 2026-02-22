"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowLeft, LogOut } from "lucide-react";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";

interface ContributorHeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    backLink?: string;
    showCalendar?: boolean;
    showProfile?: boolean;
    className?: string;
}

export default function ContributorHeader({
    title,
    subtitle,
    backLink,
    showCalendar = true,
    showProfile = true,
    className = ""
}: ContributorHeaderProps) {
    const router = useRouter();

    const handleLogout = () => {
        logout();
    };

    return (
        <div className={`border-b bg-white/80 backdrop-blur-lg ${className}`}>
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {backLink && (
                        <Link href={backLink}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                    )}
                    <div>
                        <div className="text-xl md:text-2xl font-bold text-[#576238]">
                            {title}
                        </div>
                        {subtitle && (
                            <div className="text-sm text-muted-foreground mt-1">
                                {subtitle}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {showCalendar && (
                        <Link href="/contributor/schedule">
                            <Button variant="ghost" size="icon" className="relative">
                                <Calendar className="h-5 w-5" />
                            </Button>
                        </Link>
                    )}

                    <NotificationsDropdown />

                    {showProfile && (
                        <Link href="/profile">
                            <Button variant="ghost" size="icon">
                                <User className="h-5 w-5" />
                            </Button>
                        </Link>
                    )}

                    <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign Out">
                        <LogOut className="h-5 w-5 text-red-500" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
