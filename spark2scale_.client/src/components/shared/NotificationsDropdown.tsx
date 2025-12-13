"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bell, ChevronDown, Check, X } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationService, NotificationDto } from "@/services/notificationService";
import { meetingService } from "@/services/meetingService";
import { motion, AnimatePresence } from "framer-motion";
import LegoNotificationEmpty from "@/components/lego/LegoNotificationEmpty";

const TEST_USER_ID = "3e59c30f-e3d2-43d2-ba48-818e69b7a9fd";
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
                } catch (error) { }
            }
        }
    };

    const handleAccept = async (e: React.MouseEvent, n: NotificationDto) => {
        e.stopPropagation();
        if (n.related_entity_id) {
            // Optimistic update
            setNotifications(prev => prev.map(item =>
                item.nid === n.nid ? { ...item, type: 'info', description: '✅ You accepted this meeting.' } : item
            ));

            try {
                await meetingService.acceptMeeting(n.related_entity_id);
            } catch (error) {
                console.error("Accept failed", error);
            }
        }
    };

    const handleReject = async (e: React.MouseEvent, n: NotificationDto) => {
        e.stopPropagation();
        if (n.related_entity_id) {
            // Optimistic update
            setNotifications(prev => prev.map(item =>
                item.nid === n.nid ? { ...item, type: 'info', description: '❌ You declined this meeting.' } : item
            ));

            try {
                await meetingService.rejectMeeting(n.related_entity_id);
            } catch (error) {
                console.error("Reject failed", error);
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
                    className="w-80 border-2 border-[#576238]/10 shadow-2xl z-[9999] bg-white rounded-xl overflow-hidden mt-0 p-0"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="bg-[#F0EADC]/30 px-4 py-2 border-b border-[#576238]/10 flex justify-between items-center">
                        <DropdownMenuLabel className="font-bold text-[#576238] p-0 text-xs">
                            Notifications
                        </DropdownMenuLabel>
                        {unreadCount > 0 && (
                            <span className="text-[10px] bg-[#576238]/10 text-[#576238] px-2 py-0.5 rounded-full font-medium">
                                {unreadCount} New
                            </span>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <div className="h-[250px] flex items-center justify-center">
                            <LegoNotificationEmpty />
                        </div>
                    ) : (
                        <div className="max-h-[300px] overflow-y-auto">
                            <div className="flex flex-col">
                                {visibleNotifications.map((n) => {
                                    const isExpanded = expandedId === n.nid;

                                    // FIX: Hides buttons if type is 'info' (which we set on reject/accept)
                                    const isInvite = n.type !== 'info' && (n.type === 'meeting_invite' || n.topic.includes('Meeting Invite')) && n.related_entity_id != null;

                                    return (
                                        <div
                                            key={n.nid}
                                            className={`cursor-pointer p-3 border-b last:border-0 transition-colors
                                                ${n.is_read ? "bg-white hover:bg-gray-50" : "bg-[#FFD95D]/5 hover:bg-[#FFD95D]/10"}
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
                                                            {n.created_at ? new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Now"}
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

                                                                {isInvite && (
                                                                    <div className="flex gap-2 mt-2">
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={(e) => handleAccept(e, n)}
                                                                            className="h-7 flex-1 text-[10px] bg-[#576238] hover:bg-[#6b7c3f] text-white border border-[#576238]"
                                                                        >
                                                                            <Check className="w-3 h-3 mr-1" /> Accept
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={(e) => handleReject(e, n)}
                                                                            className="h-7 flex-1 text-[10px] border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                                                        >
                                                                            <X className="w-3 h-3 mr-1" /> Reject
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    {!isExpanded && (
                                                        <div className="flex justify-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ChevronDown className="w-3 h-3 text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {hasMore && (
                                    <div className="p-2 flex justify-center bg-gray-50/50 border-t border-[#576238]/5">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleLoadMore}
                                            className="text-xs text-[#576238] hover:text-[#576238] hover:bg-[#576238]/10 h-6 px-3"
                                        >
                                            <ChevronDown className="w-3 h-3 mr-1" />
                                            Load More
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}