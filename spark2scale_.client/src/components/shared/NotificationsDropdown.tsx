"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bell, ChevronDown, ChevronUp } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationService, NotificationDto } from "@/services/notificationService";
import { motion, AnimatePresence } from "framer-motion";
import LegoNotificationEmpty from "@/components/lego/LegoNotificationEmpty";

const TEST_USER_ID = "b4e1a0db-dde7-40c0-9489-d3a33bd545b2";
const INITIAL_COUNT = 5;

export default function NotificationsDropdown() {
    const [notifications, setNotifications] = useState<NotificationDto[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const data = await notificationService.getByUser(TEST_USER_ID);
                setNotifications(data);
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };
        fetchNotifs();
    }, []);

    const handleNotificationClick = async (n: NotificationDto) => {
        if (expandedId === n.nid) {
            setExpandedId(null);
        } else {
            setExpandedId(n.nid);
            if (!n.is_read) {
                setNotifications(prev => prev.map(item =>
                    item.nid === n.nid ? { ...item, is_read: true } : item
                ));
                try {
                    await notificationService.markAsRead(n.nid);
                } catch (error) {
                    console.error("Failed to mark as read", error);
                }
            }
        }
    };

    const handleLoadMore = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setVisibleCount(prev => prev + 5);
    };

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        closeTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
            setExpandedId(null);
        }, 300);
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const visibleNotifications = notifications.slice(0, visibleCount);
    const hasMore = visibleCount < notifications.length;

    return (
        <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="relative inline-block"
        >
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative cursor-pointer hover:bg-[#576238]/10 transition-colors">
                        <Bell className="h-5 w-5 text-[#576238]" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-sm ring-1 ring-white">
                                {unreadCount}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="end"
                    sideOffset={4}
                    className="w-80 border-2 border-[#576238]/10 shadow-2xl z-[9999] bg-white rounded-xl overflow-hidden mt-0 p-0 flex flex-col"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* 1. FIXED HEADER */}
                    <div className="bg-[#F0EADC]/30 px-4 py-2 border-b border-[#576238]/10 flex justify-between items-center shrink-0">
                        <DropdownMenuLabel className="font-bold text-[#576238] p-0 text-xs">
                            Notifications
                        </DropdownMenuLabel>
                        {unreadCount > 0 && (
                            <span className="text-[10px] bg-[#576238]/10 text-[#576238] px-2 py-0.5 rounded-full font-medium">
                                {unreadCount} New
                            </span>
                        )}
                    </div>

                    {/* 2. SCROLLABLE LIST AREA */}
                    <div className="flex-1 min-h-[100px]">
                        {notifications.length === 0 ? (
                            <div className="h-[250px] flex items-center justify-center">
                                <LegoNotificationEmpty />
                            </div>
                        ) : (
                            // FIX: Fixed height allows scrollbar to appear correctly
                            <ScrollArea className="h-[300px] w-full">
                                <div className="flex flex-col">
                                    {visibleNotifications.map((n) => {
                                        const isExpanded = expandedId === n.nid;
                                        return (
                                            <div
                                                key={n.nid}
                                                className={`cursor-pointer p-3 border-b last:border-0 transition-colors
                                                    ${n.is_read
                                                        ? "bg-white hover:bg-gray-50"
                                                        : "bg-[#FFD95D]/5 hover:bg-[#FFD95D]/10"
                                                    }
                                                    ${isExpanded ? "bg-gray-50" : ""}
                                                `}
                                                onClick={() => handleNotificationClick(n)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1.5">
                                                        {!n.is_read ? (
                                                            <div className="h-2 w-2 bg-[#FFD95D] rounded-full shadow-sm ring-2 ring-white animate-pulse" />
                                                        ) : (
                                                            <div className="h-2 w-2 bg-gray-200 rounded-full" />
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-0.5 w-full">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-bold text-[#576238] uppercase tracking-wide">
                                                                {n.sender_name}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400 whitespace-nowrap">
                                                                {n.created_at
                                                                    ? new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                                                    : "Now"}
                                                            </span>
                                                        </div>

                                                        <h4 className={`font-semibold text-xs leading-tight ${n.is_read ? "text-gray-600" : "text-gray-900"}`}>
                                                            {n.topic}
                                                        </h4>

                                                        <AnimatePresence>
                                                            {isExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <p className="text-[11px] text-gray-600 mt-2 leading-relaxed bg-white/50 p-2 rounded-md border border-gray-100">
                                                                        {n.description || "No details provided."}
                                                                    </p>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>

                                                        {!isExpanded && (
                                                            <div className="flex justify-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <ChevronDown className="w-3 h-3 text-gray-300" />
                                                            </div>
                                                        )}
                                                        {isExpanded && (
                                                            <div className="flex justify-center mt-1">
                                                                <ChevronUp className="w-3 h-3 text-gray-300" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </div>

                    {/* 3. FIXED FOOTER (Outside ScrollArea) */}
                    {hasMore && (
                        <div className="p-2 flex justify-center bg-gray-50/80 border-t border-[#576238]/5 shrink-0 z-10">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLoadMore}
                                className="text-xs text-[#576238] hover:text-[#576238] hover:bg-[#576238]/10 h-7 w-full font-semibold"
                            >
                                <ChevronDown className="w-3 h-3 mr-1" />
                                Load More Notifications
                            </Button>
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}