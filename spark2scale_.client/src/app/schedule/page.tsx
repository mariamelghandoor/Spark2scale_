"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, ExternalLink, User, Video, Plus, Link as LinkIcon, RefreshCw, Mail, AlertTriangle, Trash2, Check, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { meetingService, MeetingDto } from "@/services/meetingService";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userService } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";

// 1. HARDCODED USER ID PRESERVED
import { useRouter } from "next/navigation";

export default function SchedulePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [userName, setUserName] = useState("User");
    const [meetings, setMeetings] = useState<MeetingDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [backLink, setBackLink] = useState("/founder/dashboard");

    // SCHEDULING STATE
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // CANCEL STATE
    const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
    const [isCanceling, setIsCanceling] = useState(false);

    // ACTION STATE (Accept/Reject loading)
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const [newMeeting, setNewMeeting] = useState({
        date: "",
        time: "",
        link: "",
        investorEmail: ""
    });

    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (!user) {
            // Optional: redirect to login if no user
            // router.push('/signin');
            return;
        }

        const initializePage = async () => {
            try {
                if (user.fname) {
                    setUserName(user.fname);
                }

                const roleData = await userService.getUserRole(user.id);
                if (roleData.role === "investor") {
                    setBackLink("/investor/feed");
                } else if (roleData.role === "founder") {
                    setBackLink("/founder/dashboard");
                }
                await fetchMeetings(user.id);
            } catch (error) {
                console.error("Error initializing page", error);
            } finally {
                setIsLoading(false);
            }
        };
        initializePage();
    }, [user]);

    const fetchMeetings = async (userId?: string) => {
        const idToUse = userId || user?.id;
        if (!idToUse) return;
        try {
            const data = await meetingService.getUserMeetings(idToUse);
            setMeetings(data);
        } catch (error) {
            console.error("Failed to fetch meetings", error);
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
        const inputDate = new Date(newMeeting.date + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (inputDate < today) {
            setErrorMessage("Cannot schedule in the past.");
            return;
        }

        setIsScheduling(true);
        try {
            if (!user?.id) {
                setErrorMessage("User not identified.");
                setIsScheduling(false);
                return;
            }

            await meetingService.createMeeting({
                sender_id: user.id,
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
                const msg = typeof error.response.data === 'string' ? error.response.data : error.response.data.title || "Failed to schedule.";
                setErrorMessage(msg);
            } else {
                setErrorMessage("Network error. Please try again later.");
            }
        } finally {
            setIsScheduling(false);
        }
    };

    const handleAcceptMeeting = async (id: string) => {
        setActionLoadingId(id);
        try {
            await meetingService.acceptMeeting(id);
            setMeetings(prev => prev.map(m => m.meeting_id === id ? { ...m, status: 'accepted' } : m));
        } catch (error) {
            console.error("Failed to accept", error);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleRejectMeeting = async (id: string) => {
        setActionLoadingId(id);
        try {
            await meetingService.rejectMeeting(id);
            setMeetings(prev => prev.map(m => m.meeting_id === id ? { ...m, status: 'rejected' } : m));
        } catch (error) {
            console.error("Failed to reject", error);
        } finally {
            setActionLoadingId(null);
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

    const formatDate = (dateString: string) => {
        if (!dateString) return "Invalid Date";
        const cleanDate = dateString.split('T')[0];
        const [year, month, day] = cleanDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return "";
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const getMeetingDateTime = (m: MeetingDto) => {
        const datePart = m.meeting_date.split('T')[0];
        return new Date(`${datePart}T${m.meeting_time}`);
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingMeetings = meetings
        .filter(m => {
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
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 relative overflow-hidden">
    {/* Background floating Lego blocks */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Block 1: Forest Green (Top Left) */}
        <motion.div
            animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="absolute top-[10%] left-[8%] w-24 h-16 opacity-20 lg:opacity-35 hidden sm:block"
        >
            <div className="w-full h-12 bg-[#576238] rounded-xl shadow-2xl relative border border-white/10">
                <div className="absolute -top-2 left-3 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                <div className="absolute -top-2 left-10 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                <div className="absolute -top-2 left-17 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
            </div>
        </motion.div>

        {/* Block 2: Golden Yellow (Top Right) */}
        <motion.div
            animate={{ y: [8, -8, 8], rotate: [4, -4, 4] }}
            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
            className="absolute top-[15%] right-[10%] w-20 h-14 opacity-20 lg:opacity-35 hidden sm:block"
        >
            <div className="w-full h-10 bg-[#FFD95D] rounded-xl shadow-2xl relative border border-white/10">
                <div className="absolute -top-2 left-4 w-4 h-3 bg-[#FFD95D] rounded-t-md shadow-inner" />
                <div className="absolute -top-2 left-12 w-4 h-3 bg-[#FFD95D] rounded-t-md shadow-inner" />
            </div>
        </motion.div>

        {/* Block 3: Coral Red (Middle Left) */}
        <motion.div
            animate={{ y: [12, -12, 12], x: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
            className="absolute top-[50%] left-[5%] w-16 h-12 opacity-15 lg:opacity-25 hidden md:block"
        >
            <div className="w-full h-8 bg-[#ff6b6b] rounded-xl shadow-2xl relative border border-white/10">
                <div className="absolute -top-2 left-3 w-3 h-2 bg-[#ff6b6b] rounded-t-md shadow-inner" />
                <div className="absolute -top-2 left-9 w-3 h-2 bg-[#ff6b6b] rounded-t-md shadow-inner" />
            </div>
        </motion.div>

        {/* Block 4: Sky Blue (Middle Right) */}
        <motion.div
            animate={{ y: [-15, 15, -15], rotate: [-6, 6, -6] }}
            transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}
            className="absolute top-[55%] right-[8%] w-24 h-16 opacity-15 lg:opacity-25 hidden md:block"
        >
            <div className="w-full h-12 bg-[#4a90e2] rounded-xl shadow-2xl relative border border-white/10">
                <div className="absolute -top-2 left-3 w-4 h-3 bg-[#4a90e2] rounded-t-md shadow-inner" />
                <div className="absolute -top-2 left-10 w-4 h-3 bg-[#4a90e2] rounded-t-md shadow-inner" />
                <div className="absolute -top-2 left-17 w-4 h-3 bg-[#4a90e2] rounded-t-md shadow-inner" />
            </div>
        </motion.div>

        {/* Block 5: Sage Green (Bottom Left) */}
        <motion.div
            animate={{ y: [-8, 8, -8], rotate: [3, -3, 3] }}
            transition={{ repeat: Infinity, duration: 6.5, ease: "easeInOut" }}
            className="absolute bottom-[12%] left-[10%] w-20 h-14 opacity-20 lg:opacity-30 hidden sm:block"
        >
            <div className="w-full h-10 bg-[#8b9456] rounded-xl shadow-2xl relative border border-white/10">
                <div className="absolute -top-2 left-4 w-4 h-3 bg-[#8b9456] rounded-t-md shadow-inner" />
                <div className="absolute -top-2 left-12 w-4 h-3 bg-[#8b9456] rounded-t-md shadow-inner" />
            </div>
        </motion.div>

        {/* Block 6: Sandy Tan (Bottom Right) */}
        <motion.div
            animate={{ y: [10, -10, 10], x: [3, -3, 3] }}
            transition={{ repeat: Infinity, duration: 7.5, ease: "easeInOut" }}
            className="absolute bottom-[10%] right-[12%] w-16 h-12 opacity-20 lg:opacity-30 hidden sm:block"
        >
            <div className="w-full h-8 bg-[#d4cbb8] rounded-xl shadow-2xl relative border border-white/10">
                <div className="absolute -top-2 left-3 w-3 h-2 bg-[#d4cbb8] rounded-t-md shadow-inner" />
                <div className="absolute -top-2 left-9 w-3 h-2 bg-[#d4cbb8] rounded-t-md shadow-inner" />
            </div>
        </motion.div>
    </div>
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
                {/* 👇 Edge-to-edge width (w-full) with thicker padding (py-4) */}
                <div className="flex w-full items-center justify-between px-6 md:px-12 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={backLink}>
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-xl font-bold text-[#576238] leading-tight">
                                Meeting Schedule
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {userName}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationsDropdown />
                        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                            <DialogTrigger asChild>
                                <Button className="bg-[#576238] hover:bg-[#6b7c3f] text-white">
                                    <Plus className="mr-2 h-4 w-4" /> Schedule Meeting
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Schedule New Meeting</DialogTitle>
                                    <DialogDescription>Send an invite to an investor via email.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    {errorMessage && (
                                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4" /> {errorMessage}
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Invitee Email</Label>
                                        <Input id="email" type="email" placeholder="investor@example.com" value={newMeeting.investorEmail} onChange={(e) => { setNewMeeting({ ...newMeeting, investorEmail: e.target.value }); setErrorMessage(""); }} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="date">Date</Label>
                                            <Input id="date" type="date" min={todayStr} value={newMeeting.date} onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="time">Time</Label>
                                            <Input id="time" type="time" value={newMeeting.time} onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="link">Meeting Link</Label>
                                        <div className="flex gap-2">
                                            <Input id="link" placeholder="https://meet.jit.si/..." value={newMeeting.link} readOnly className="pl-9 bg-gray-50 flex-grow" />
                                            <Button type="button" variant="outline" size="icon" onClick={generateMeetLink}><RefreshCw className="h-4 w-4 text-[#576238]" /></Button>
                                        </div>
                                    </div>
                                </div>
                                <Button onClick={handleScheduleMeeting} disabled={isScheduling} className="w-full bg-[#576238] hover:bg-[#6b7c3f]">
                                    {isScheduling ? "Sending Invite..." : "Send Invite"}
                                </Button>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 pb-20">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-[#576238] mb-2">Your Meeting Schedule</h2>
                        <p className="text-muted-foreground">Manage your meetings with potential investors</p>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20 text-[#576238] animate-pulse">Loading schedule...</div>
                    ) : (
                        <>
                            {/* Upcoming Meetings */}
                            <div className="mb-10">
                                <h3 className="text-2xl font-bold text-[#576238] mb-4 flex items-center gap-2">
                                    <Calendar className="h-6 w-6" /> Upcoming Meetings ({upcomingMeetings.length})
                                </h3>
                                {upcomingMeetings.length === 0 ? (
                                    <div className="p-8 text-center bg-white/50 rounded-xl border-2 border-dashed border-[#576238]/20">
                                        <p className="text-muted-foreground">No upcoming meetings.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {upcomingMeetings.map((meeting, index) => {
                                            const isSender = meeting.sender_id === user?.id;
                                            const isPending = meeting.status === 'pending';
                                            const isAccepted = meeting.status === 'accepted';
                                            const isWorking = actionLoadingId === meeting.meeting_id;
                                            const showAcceptReject = !isSender && isPending;

                                            return (
                                                <motion.div key={meeting.meeting_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                                                    <Card className="p-6 hover:shadow-lg transition-all border-2 hover:border-[#FFD95D] bg-white overflow-hidden">
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                            <div className="flex-grow">
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    <div className="bg-[#576238] p-3 rounded-full"><User className="h-5 w-5 text-[#FFD95D]" /></div>
                                                                    <div>
                                                                        <h4 className="text-xl font-bold text-[#576238]">{meeting.with_whom_name || "New Contact"}</h4>
                                                                        <div className="flex gap-2 items-center">
                                                                            <span className="text-sm text-muted-foreground">{isSender ? "Invited by you" : "Invited by them"}</span>
                                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${meeting.status === 'accepted' ? 'bg-green-100 text-green-700' : meeting.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{meeting.status}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="grid md:grid-cols-2 gap-3 ml-14">
                                                                    <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-[#576238]" /><span className="font-medium">{formatDate(meeting.meeting_date)}</span></div>
                                                                    <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-[#576238]" /><span className="font-medium">{formatTime(meeting.meeting_time)}</span></div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-2 md:items-end min-w-[140px]">
                                                                {showAcceptReject && (
                                                                    <div className="flex gap-2 w-full">
                                                                        <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9" onClick={() => handleAcceptMeeting(meeting.meeting_id)} disabled={isWorking}>{isWorking ? "..." : <><Check className="w-4 h-4 mr-1" /> Accept</>}</Button>
                                                                        <Button className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-9" variant="outline" onClick={() => handleRejectMeeting(meeting.meeting_id)} disabled={isWorking}>{isWorking ? "..." : <><X className="w-4 h-4 mr-1" /> Reject</>}</Button>
                                                                    </div>
                                                                )}
                                                                {(isAccepted || isSender) && meeting.meeting_link && (
                                                                    <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-block w-full">
                                                                        <Button className="bg-[#576238] hover:bg-[#6b7c3f] text-white w-full"><Video className="mr-2 h-4 w-4" /> Join <ExternalLink className="ml-2 h-3 w-3" /></Button>
                                                                    </a>
                                                                )}
                                                                {isSender && (
                                                                    <AnimatePresence mode="wait">
                                                                        {confirmCancelId === meeting.meeting_id ? (
                                                                            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col items-end gap-2 bg-red-50 p-2 rounded-lg border border-red-100">
                                                                                <p className="text-xs text-red-600 font-bold mb-1">Cancel meeting?</p>
                                                                                <div className="flex gap-2">
                                                                                    <Button size="sm" variant="outline" className="h-7 text-xs bg-white hover:bg-gray-100" onClick={() => setConfirmCancelId(null)}>No</Button>
                                                                                    <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={() => handleConfirmCancel(meeting.meeting_id)} disabled={isCanceling}>{isCanceling ? "..." : "Yes"}</Button>
                                                                                </div>
                                                                            </motion.div>
                                                                        ) : (
                                                                            <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                                                                                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full" onClick={() => setConfirmCancelId(meeting.meeting_id)}><Trash2 className="mr-2 h-4 w-4" /> Cancel</Button>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Past Meetings */}
                            {pastMeetings.length > 0 && (
                                <div>
                                    <h3 className="text-2xl font-bold text-[#576238] mb-4 flex items-center gap-2"><Calendar className="h-6 w-6" /> Past & Canceled Meetings</h3>
                                    <div className="space-y-4">
                                        {pastMeetings.map((meeting, index) => (
                                            <motion.div key={meeting.meeting_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + (index * 0.1) }}>
                                                <Card className={`p-6 border-2 transition-opacity ${meeting.status === 'canceled' ? 'bg-red-50/50 border-red-100 opacity-60' : meeting.status === 'rejected' ? 'bg-red-50/50 border-red-100 opacity-60' : 'bg-gray-50 opacity-75'}`}>
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex-grow">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className={`p-3 rounded-full ${meeting.status === 'canceled' || meeting.status === 'rejected' ? 'bg-red-200' : 'bg-gray-400'}`}><User className="h-5 w-5 text-white" /></div>
                                                                <div>
                                                                    <h4 className="text-xl font-bold text-gray-700">{meeting.with_whom_name || "Contact"}</h4>
                                                                    <p className="text-sm text-muted-foreground capitalize">{meeting.status}</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid md:grid-cols-2 gap-3 ml-14">
                                                                <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-gray-600" /><span className="font-medium text-gray-600">{formatDate(meeting.meeting_date)}</span></div>
                                                                <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-gray-600" /><span className="font-medium text-gray-600">{formatTime(meeting.meeting_time)}</span></div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2 md:items-end">

                                                            {/* --- FIX IS HERE: Correct Badge Logic --- */}
                                                            {meeting.status === 'canceled' ? (
                                                                <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold">✕ Canceled</span>
                                                            ) : meeting.status === 'rejected' ? (
                                                                <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold">✕ Rejected</span>
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