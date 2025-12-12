"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, ExternalLink, User, Video, Plus, Link as LinkIcon, RefreshCw, Mail, AlertTriangle, Trash2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { meetingService, MeetingDto } from "@/services/meetingService";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TEST_USER_ID = "645bde5c-ab6e-47bc-ba8d-cd6f5500bc30";

export default function SchedulePage() {
    const [userName] = useState("Alex");
    const [meetings, setMeetings] = useState<MeetingDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // SCHEDULING STATE
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // CANCEL STATE
    const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
    const [isCanceling, setIsCanceling] = useState(false);

    const [newMeeting, setNewMeeting] = useState({
        date: "",
        time: "",
        link: "",
        investorEmail: ""
    });

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            const data = await meetingService.getUserMeetings(TEST_USER_ID);
            setMeetings(data);
        } catch (error) {
            console.error("Failed to fetch meetings", error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateMeetLink = () => {
        const roomName = `Spark2Scale-${Math.random().toString(36).substring(7)}`;
        setNewMeeting({ ...newMeeting, link: `https://meet.jit.si/${roomName}` });
    };

    const handleScheduleMeeting = async () => {
        setErrorMessage("");

        if (!newMeeting.date || !newMeeting.time || !newMeeting.link || !newMeeting.investorEmail) {
            setErrorMessage("Please fill in all fields.");
            return;
        }

        // Fix validation to use local time comparison
        const inputDate = new Date(newMeeting.date + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (inputDate < today) {
            setErrorMessage("Cannot schedule in the past.");
            return;
        }

        setIsScheduling(true);
        try {
            await meetingService.createMeeting({
                sender_id: TEST_USER_ID,
                invitee_email: newMeeting.investorEmail,
                meeting_date: newMeeting.date,
                meeting_time: newMeeting.time + ":00",
                meeting_link: newMeeting.link
            });

            await fetchMeetings();
            setNewMeeting({ date: "", time: "", link: "", investorEmail: "" });
            setErrorMessage("");
            setIsDialogOpen(false);

        } catch (error: any) {
            console.error("Error scheduling:", error);
            if (error.response && error.response.data) {
                const msg = typeof error.response.data === 'string'
                    ? error.response.data
                    : error.response.data.title || "Failed to schedule.";
                setErrorMessage(msg);
            } else {
                setErrorMessage("Network error. Please try again later.");
            }
        } finally {
            setIsScheduling(false);
        }
    };

    const handleConfirmCancel = async (id: string) => {
        setIsCanceling(true);
        try {
            await meetingService.cancelMeeting(id);
            await fetchMeetings();
            setConfirmCancelId(null);
        } catch (error) {
            console.error("Failed to cancel", error);
            alert("Could not cancel meeting.");
        } finally {
            setIsCanceling(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) setErrorMessage("");
    };

    // --- FIX: ABSOLUTE DATE PARSING ---
    // Instead of letting 'new Date()' shift the timezone, we explicitly read the string parts.
    const formatDate = (dateString: string) => {
        if (!dateString) return "Invalid Date";

        // dateString is usually "YYYY-MM-DD" or "YYYY-MM-DDT00:00:00"
        const cleanDate = dateString.split('T')[0]; // Get "2025-12-13"
        const [year, month, day] = cleanDate.split('-').map(Number);

        // Use constructor (year, monthIndex, day) - month is 0-indexed
        const date = new Date(year, month - 1, day);

        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return "";
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Sort Helpers
    const getMeetingDateTime = (m: MeetingDto) => {
        const datePart = m.meeting_date.split('T')[0];
        return new Date(`${datePart}T${m.meeting_time}`);
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingMeetings = meetings
        .filter(m => {
            // Compare purely based on date string to avoid timezone issues
            const mDate = new Date(m.meeting_date.split('T')[0] + "T00:00:00");
            return mDate >= today && m.status !== 'canceled' && m.status !== 'rejected';
        })
        .sort((a, b) => getMeetingDateTime(a).getTime() - getMeetingDateTime(b).getTime());

    const pastMeetings = meetings
        .filter(m => {
            const mDate = new Date(m.meeting_date.split('T')[0] + "T00:00:00");
            return mDate < today || m.status === 'canceled' || m.status === 'rejected';
        })
        .sort((a, b) => getMeetingDateTime(b).getTime() - getMeetingDateTime(a).getTime());

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-40">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/founder/dashboard">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">
                                Hello {userName} 👋
                            </h1>
                            <p className="text-sm text-muted-foreground">Meeting Schedule</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <NotificationsDropdown />

                        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                            <DialogTrigger asChild>
                                <Button className="bg-[#576238] hover:bg-[#6b7c3f] text-white">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Schedule Meeting
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Schedule New Meeting</DialogTitle>
                                    <DialogDescription>
                                        Send an invite to an investor via email.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
                                    {errorMessage && (
                                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            {errorMessage}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Invitee Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="investor@example.com"
                                            value={newMeeting.investorEmail}
                                            onChange={(e) => {
                                                setNewMeeting({ ...newMeeting, investorEmail: e.target.value });
                                                setErrorMessage("");
                                            }}
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            User must be a registered <strong>Investor</strong> on the platform.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="date">Date</Label>
                                            <Input
                                                id="date"
                                                type="date"
                                                min={todayStr}
                                                value={newMeeting.date}
                                                onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="time">Time</Label>
                                            <Input
                                                id="time"
                                                type="time"
                                                value={newMeeting.time}
                                                onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="link">Meeting Link</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="link"
                                                placeholder="https://meet.jit.si/..."
                                                value={newMeeting.link}
                                                readOnly
                                                className="pl-9 bg-gray-50 flex-grow"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={generateMeetLink}
                                                title="Generate Jitsi Link"
                                            >
                                                <RefreshCw className="h-4 w-4 text-[#576238]" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleScheduleMeeting}
                                    disabled={isScheduling}
                                    className="w-full bg-[#576238] hover:bg-[#6b7c3f]"
                                >
                                    {isScheduling ? "Sending Invite..." : "Send Invite"}
                                </Button>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 pb-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-[#576238] mb-2">
                            Your Meeting Schedule
                        </h2>
                        <p className="text-muted-foreground">
                            Manage your meetings with potential investors
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20 text-[#576238] animate-pulse">
                            Loading schedule...
                        </div>
                    ) : (
                        <>
                            {/* Upcoming Meetings */}
                            <div className="mb-10">
                                <h3 className="text-2xl font-bold text-[#576238] mb-4 flex items-center gap-2">
                                    <Calendar className="h-6 w-6" />
                                    Upcoming Meetings ({upcomingMeetings.length})
                                </h3>

                                {upcomingMeetings.length === 0 ? (
                                    <div className="p-8 text-center bg-white/50 rounded-xl border-2 border-dashed border-[#576238]/20">
                                        <p className="text-muted-foreground">No upcoming meetings.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {upcomingMeetings.map((meeting, index) => (
                                            <motion.div
                                                key={meeting.meeting_id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                            >
                                                <Card className="p-6 hover:shadow-lg transition-all border-2 hover:border-[#FFD95D] bg-white overflow-hidden">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex-grow">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="bg-[#576238] p-3 rounded-full">
                                                                    <User className="h-5 w-5 text-[#FFD95D]" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xl font-bold text-[#576238]">
                                                                        {meeting.with_whom_name || "New Contact"}
                                                                    </h4>
                                                                    <div className="flex gap-2 items-center">
                                                                        <span className="text-sm text-muted-foreground">Investment Meeting</span>
                                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold 
                                                                            ${meeting.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                                                                meeting.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                                    'bg-yellow-100 text-yellow-700'}`}>
                                                                            {meeting.status}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="grid md:grid-cols-2 gap-3 ml-14">
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <Calendar className="h-4 w-4 text-[#576238]" />
                                                                    <span className="font-medium">{formatDate(meeting.meeting_date)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <Clock className="h-4 w-4 text-[#576238]" />
                                                                    <span className="font-medium">{formatTime(meeting.meeting_time)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-2 md:items-end min-w-[140px]">
                                                            <AnimatePresence mode="wait">
                                                                {confirmCancelId === meeting.meeting_id ? (
                                                                    <motion.div
                                                                        key="confirm"
                                                                        initial={{ opacity: 0, x: 20 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        exit={{ opacity: 0, x: 20 }}
                                                                        className="flex flex-col items-end gap-2 bg-red-50 p-2 rounded-lg border border-red-100"
                                                                    >
                                                                        <p className="text-xs text-red-600 font-bold mb-1">Cancel meeting?</p>
                                                                        <div className="flex gap-2">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="h-7 text-xs bg-white hover:bg-gray-100"
                                                                                onClick={() => setConfirmCancelId(null)}
                                                                            >
                                                                                No
                                                                            </Button>
                                                                            <Button
                                                                                size="sm"
                                                                                className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                                                                                onClick={() => handleConfirmCancel(meeting.meeting_id)}
                                                                                disabled={isCanceling}
                                                                            >
                                                                                {isCanceling ? "..." : "Yes"}
                                                                            </Button>
                                                                        </div>
                                                                    </motion.div>
                                                                ) : (
                                                                    <motion.div
                                                                        key="default"
                                                                        initial={{ opacity: 0 }}
                                                                        animate={{ opacity: 1 }}
                                                                        exit={{ opacity: 0 }}
                                                                        className="flex flex-col gap-2 w-full"
                                                                    >
                                                                        {meeting.meeting_link && (
                                                                            <a
                                                                                href={meeting.meeting_link}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-block w-full"
                                                                            >
                                                                                <Button className="bg-[#576238] hover:bg-[#6b7c3f] text-white w-full">
                                                                                    <Video className="mr-2 h-4 w-4" />
                                                                                    Join
                                                                                    <ExternalLink className="ml-2 h-3 w-3" />
                                                                                </Button>
                                                                            </a>
                                                                        )}

                                                                        <Button
                                                                            variant="outline"
                                                                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full"
                                                                            onClick={() => setConfirmCancelId(meeting.meeting_id)}
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Cancel
                                                                        </Button>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Past Meetings */}
                            {pastMeetings.length > 0 && (
                                <div>
                                    <h3 className="text-2xl font-bold text-[#576238] mb-4 flex items-center gap-2">
                                        <Calendar className="h-6 w-6" />
                                        Past & Canceled Meetings
                                    </h3>
                                    <div className="space-y-4">
                                        {pastMeetings.map((meeting, index) => (
                                            <motion.div
                                                key={meeting.meeting_id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 + (index * 0.1) }}
                                            >
                                                <Card className={`p-6 border-2 transition-opacity ${meeting.status === 'canceled' ? 'bg-red-50/50 border-red-100 opacity-60' : 'bg-gray-50 opacity-75'}`}>
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex-grow">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className={`p-3 rounded-full ${meeting.status === 'canceled' ? 'bg-red-200' : 'bg-gray-400'}`}>
                                                                    <User className="h-5 w-5 text-white" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xl font-bold text-gray-700">
                                                                        {meeting.with_whom_name || "Contact"}
                                                                    </h4>
                                                                    <p className="text-sm text-muted-foreground capitalize">{meeting.status}</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid md:grid-cols-2 gap-3 ml-14">
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <Calendar className="h-4 w-4 text-gray-600" />
                                                                    <span className="font-medium text-gray-600">{formatDate(meeting.meeting_date)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <Clock className="h-4 w-4 text-gray-600" />
                                                                    <span className="font-medium text-gray-600">{formatTime(meeting.meeting_time)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2 md:items-end">
                                                            {meeting.status === 'canceled' ? (
                                                                <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold">✕ Canceled</span>
                                                            ) : (
                                                                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">✓ Completed</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </main>
        </div>
    );
}