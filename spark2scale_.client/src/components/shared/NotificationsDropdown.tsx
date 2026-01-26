"use client";

import { useState, useEffect } from "react";
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
import { formatDistanceToNow } from "date-fns";

interface NotificationDto {
    nid: string;
    sender: string | null;
    receiver: string | null;
    topic: string;
    description: string;
    created_at: string;
    is_read: boolean;
    sender_name: string;
}

export default function NotificationsDropdown() {
    const [notifications, setNotifications] = useState<NotificationDto[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);
            const userId = user.id;

            if (!userId) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
            const cleanUrl = apiUrl.replace(/\/$/, "").replace(/\/api$/, "");

            const res = await fetch(`${cleanUrl}/api/Notifications?userId=${userId}`);
            if (res.ok) {
                const data: NotificationDto[] = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleNotificationClick = async (id: string, isRead: boolean) => {
        if (isRead) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => n.nid === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
            const cleanUrl = apiUrl.replace(/\/$/, "").replace(/\/api$/, "");

            await fetch(`${cleanUrl}/api/Notifications/read/${id}`, {
                method: 'POST'
            });
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const formatTime = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
        } catch {
            return "recently";
        }
    };

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
                    {loading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.nid}
                                className={`cursor-pointer p-4 focus:outline-none transition-colors ${!notification.is_read
                                    ? "bg-[#FFD95D]/20 hover:bg-[#FFD95D]/30"
                                    : "bg-white hover:bg-gray-50"
                                    }`}
                                onClick={() => handleNotificationClick(notification.nid, notification.is_read)}
                            >
                                <div className="flex flex-col gap-1 w-full">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4
                                            className={`font-semibold text-sm ${!notification.is_read ? "text-[#576238]" : "text-gray-700"
                                                }`}
                                        >
                                            {notification.topic}
                                        </h4>
                                        {!notification.is_read && (
                                            <span className="h-2 w-2 bg-[#576238] rounded-full flex-shrink-0 mt-1" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {notification.description}
                                    </p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-muted-foreground">
                                            {formatTime(notification.created_at)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/70">
                                            {notification.sender_name}
                                        </span>
                                    </div>
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center text-[#576238] font-semibold cursor-pointer">
                    View All Notifications
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
