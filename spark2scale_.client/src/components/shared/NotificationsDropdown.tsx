"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
    id: number;
    title: string;
    message: string;
    time: string;
    read: boolean;
}

export default function NotificationsDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: 1,
            title: "New Investor Interest",
            message: "John Smith liked your EcoTech Solutions pitch",
            time: "5 min ago",
            read: false,
        },
        {
            id: 2,
            title: "Meeting Reminder",
            message: "Upcoming meeting with Sarah Chen in 30 minutes",
            time: "10 min ago",
            read: false,
        },
        {
            id: 3,
            title: "Document Updated",
            message: "Business Model Canvas has been updated to v3",
            time: "1 hour ago",
            read: true,
        },
        {
            id: 4,
            title: "Evaluation Complete",
            message: "Your market research evaluation is ready",
            time: "2 hours ago",
            read: true,
        },
        {
            id: 5,
            title: "New Team Member",
            message: "Alex joined your HealthAI Platform team",
            time: "1 day ago",
            read: true,
        },
    ]);

    const handleNotificationClick = (id: number) => {
        setNotifications(
            notifications.map((notif) =>
                notif.id === id ? { ...notif, read: true } : notif
            )
        );
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="font-bold text-[#576238]">
                    Notifications
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[400px]">
                    {notifications.map((notification) => (
                        <DropdownMenuItem
                            key={notification.id}
                            className={`cursor-pointer p-4 focus:outline-none transition-colors ${!notification.read
                                    ? "bg-[#FFD95D]/20 hover:bg-[#FFD95D]/30"
                                    : "bg-white hover:bg-gray-50"
                                }`}
                            onClick={() => handleNotificationClick(notification.id)}
                        >
                            <div className="flex flex-col gap-1 w-full">
                                <div className="flex items-start justify-between gap-2">
                                    <h4
                                        className={`font-semibold text-sm ${!notification.read ? "text-[#576238]" : "text-gray-700"
                                            }`}
                                    >
                                        {notification.title}
                                    </h4>
                                    {!notification.read && (
                                        <span className="h-2 w-2 bg-[#576238] rounded-full flex-shrink-0 mt-1" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {notification.message}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                    {notification.time}
                                </span>
                            </div>
                        </DropdownMenuItem>
                    ))}
                </ScrollArea>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center text-[#576238] font-semibold cursor-pointer">
                    View All Notifications
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
