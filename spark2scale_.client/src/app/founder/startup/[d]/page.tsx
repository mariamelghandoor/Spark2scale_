"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft, Share2, FolderOpen, Video, Calendar as CalendarIcon,
    ChevronLeft, ChevronRight, Bell, User, Lightbulb, FileText,
    BarChart3, Target, RefreshCw, Presentation, Check, AlertCircle,
    Clock, Link as LinkIcon, AlertOctagon, Timer, Info
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import LegoProgress from "@/components/lego/LegoProgress";
import { useParams, useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { pitchDeckService } from "@/services/pitchDeckService";

// --- Interfaces ---
interface WorkflowData {
    startupId: string;
    ideaCheck: boolean;
    marketResearch: boolean;
    evaluation: boolean;
    recommendation: boolean;
    documents: boolean;
    pitchDeck: boolean;
}

interface Meeting {
    meeting_id: string;
    sender_id: string;
    receiver_id: string;
    meeting_date: string; // ISO String
    meeting_time: string; // HH:mm:ss
    meeting_link?: string;
    with_whom_name: string;
    status: "pending" | "accepted" | "rejected" | "canceled";
}

export default function StartupDashboard() {
    const params = useParams();
    const router = useRouter();
    const [userName] = useState("Alex");

    // State
    const [startupName, setStartupName] = useState("Loading...");
    const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
    const [docCount, setDocCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Meeting & Calendar State
    const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>("");

    // Invite State
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [isInviting, setIsInviting] = useState(false); // Loading state
    const [videoCount, setVideoCount] = useState(0);

    // 1. Fetch User & Dashboard Data
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!params || !params.d) return;

            const rawId = Array.isArray(params.d) ? params.d[0] : params.d;
            const cleanId = decodeURIComponent(rawId).replace(/\s/g, '');

            // --- MOCK AUTH: REPLACE THIS WITH YOUR ACTUAL AUTH CONTEXT ---
            const mockUserId = "3e59c30f-e3d2-43d2-ba48-818e69b7a9fd"; // Replace with real ID
            setCurrentUserId(mockUserId);

            try {
                const baseUrl = "https://localhost:7155/api";

                const [workflowRes, startupRes, docCountRes, meetingsRes] = await Promise.all([
                    fetch(`${baseUrl}/StartupWorkflow/${cleanId}`),
                    fetch(`${baseUrl}/startups/${cleanId}`),
                    fetch(`${baseUrl}/DocumentVersions/count/${cleanId}`),
                    fetch(`${baseUrl}/Meetings?userId=${mockUserId}`) // Fetch Meetings
                ]);

                // Handle Workflow
                if (workflowRes.ok) {
                    const data = await workflowRes.json();
                    setWorkflowData(data);
                }

                // Handle Name
                if (startupRes.ok) {
                    const data = await startupRes.json();
                    setStartupName(data.startupname);
                } else {
                    setStartupName("Unknown Startup");
                }

                // Handle Document Count
                if (docCountRes.ok) {
                    const data = await docCountRes.json();
                    setDocCount(data.count);
                }

                // Handle Meetings
                if (meetingsRes.ok) {
                    const data = await meetingsRes.json();
                    setMeetings(data);
                }

            } catch (error) {
                console.error("Error connecting to backend:", error);
                setStartupName("Error Loading Data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [params]);

    const startupId = params?.d ? String(params.d) : "";

    useEffect(() => {
        const fetchCount = async () => {
            if (!startupId) return;
            const count = await pitchDeckService.getPitchCount(startupId);
            setVideoCount(count);
        };
        fetchCount();
    }, [startupId]);

    // --- Workflow Stages Logic ---
    const currentData = workflowData || {
        ideaCheck: false, marketResearch: false, evaluation: false,
        recommendation: false, documents: false, pitchDeck: false
    };

    const stages = [
        { id: 1, name: "Idea Check", icon: Lightbulb, completed: currentData.ideaCheck, hasError: false, path: `/founder/startup/${startupId}/idea-check` },
        { id: 2, name: "Market Research", icon: BarChart3, completed: currentData.marketResearch, hasError: false, errorMessage: "Missing required data", path: `/founder/startup/${startupId}/market-research` },
        { id: 3, name: "Evaluation", icon: Target, completed: currentData.evaluation, hasError: false, path: `/founder/startup/${startupId}/evaluate` },
        { id: 4, name: "Recommendation", icon: RefreshCw, completed: currentData.recommendation, hasError: false, path: `/founder/startup/${startupId}/recommendations` },
        { id: 5, name: "Documents", icon: FileText, completed: currentData.documents, hasError: false, path: `/founder/startup/${startupId}/documents` },
        { id: 6, name: "Pitch Deck", icon: Presentation, completed: currentData.pitchDeck, hasError: false, path: `/founder/startup/${startupId}/pitch-deck` },
    ];

    const completedCount = stages.filter(stage => stage.completed).length;
    const stageErrors = stages.map(stage => stage.hasError || false);


    // --- CALENDAR LOGIC START ---

    // Navigation handlers
    const prevMonth = () => {
        setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
    };

    // Generate days for grid
    const generateCalendarDays = () => {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayIndex = firstDayOfMonth.getDay();

        const days = [];
        for (let i = 0; i < startDayIndex; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);

        return days;
    };

    const calendarDays = generateCalendarDays();
    const todayObj = new Date();
    const isCurrentMonth = todayObj.getMonth() === currentMonthDate.getMonth() && todayObj.getFullYear() === currentMonthDate.getFullYear();
    const todayDate = isCurrentMonth ? todayObj.getDate() : null;

    // Helper to check if a specific calendar day has a meeting
    const getMeetingsForDay = (day: number | null) => {
        if (!day) return [];
        return meetings.filter(m => {
            const mDate = new Date(m.meeting_date);
            return mDate.getDate() === day &&
                mDate.getMonth() === currentMonthDate.getMonth() &&
                mDate.getFullYear() === currentMonthDate.getFullYear();
        });
    };

    // --- SORTING LOGIC START ---
    const now = new Date();

    const sortedMeetings = [...meetings].sort((a, b) => {
        return new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime();
    });

    // 1. Get ALL upcoming (future or today)
    const allUpcoming = sortedMeetings.filter(m => {
        const mDate = new Date(m.meeting_date);
        return mDate >= now || (mDate.getDate() === now.getDate() && mDate.getMonth() === now.getMonth() && mDate.getFullYear() === now.getFullYear());
    });

    // 2. Filter Upcoming: Only ACCEPTED goes to the top list
    const acceptedUpcoming = allUpcoming.filter(m => m.status === 'accepted');

    // 3. Filter Upcoming: PENDING or CANCELLED or REJECTED
    const otherUpcoming = allUpcoming.filter(m => m.status !== 'accepted');

    // 4. Past Meetings
    const pastMeetings = sortedMeetings.filter(m => {
        const mDate = new Date(m.meeting_date);
        return mDate < now && !(mDate.getDate() === now.getDate() && mDate.getMonth() === now.getMonth());
    }).reverse();

    // 5. Combine "Other" (Pending/Cancelled) + "Past" into one History/Activity list
    const otherMeetings = [...otherUpcoming, ...pastMeetings].sort((a, b) => {
        // Sort descending (newest first) for history list
        return new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime();
    });
    // --- SORTING LOGIC END ---

    // Color helper
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'accepted': return "bg-[#576238] text-white";
            case 'pending': return "bg-[#FFD95D] text-[#576238]";
            case 'rejected':
            case 'canceled': return "bg-red-500 text-white";
            default: return "bg-gray-200 text-gray-600";
        }
    };

    // Dot color helper for calendar
    const getDotColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'accepted': return "bg-[#576238]";
            case 'pending': return "bg-[#FFD95D]";
            case 'rejected':
            case 'canceled': return "bg-red-500";
            default: return "bg-gray-400";
        }
    };

    // --- CALENDAR LOGIC END ---

    // --- INVITE LOGIC START ---
    const handleSendInvite = async () => {
        if (!inviteEmail) return;
        setIsInviting(true);

        try {
            const response = await fetch("https://localhost:7155/api/Contributor/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: inviteEmail,
                    startupId: startupId
                })
            });

            if (response.ok) {
                alert(`Invitation sent to ${inviteEmail}`);
                setInviteEmail("");
                setInviteDialogOpen(false);
            } else {
                const err = await response.text();
                alert(`Failed to invite: ${err}`);
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred while sending the invite.");
        } finally {
            setIsInviting(false);
        }
    };
    // --- INVITE LOGIC END ---

    // Handle clicking a card
    const handleEventClick = () => {
        router.push('/founder/schedule');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/founder/dashboard">
                            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">Hello {userName} 👋</h1>
                            <p className="text-sm text-muted-foreground">{startupName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/founder/schedule">
                            <Button variant="outline" size="icon" className="relative"><CalendarIcon className="h-5 w-5" /></Button>
                        </Link>
                        <Button variant="outline" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        </Button>
                        <Link href="/profile">
                            <Button variant="outline" size="icon"><User className="h-5 w-5" /></Button>
                        </Link>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
                            <Share2 className="mr-2 h-4 w-4" /> Invite Team
                        </Button>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Left Column - Progress */}
                    <div className="lg:col-span-1">
                        <Card className="p-6 sticky top-8">
                            <h3 className="text-lg font-bold text-[#576238] mb-4 text-center">Your Progress</h3>
                            <LegoProgress totalStages={6} completedStages={completedCount} stageErrors={stageErrors} className="mb-6" />
                            <div className="space-y-2 text-sm">
                                <p className="text-center text-muted-foreground text-xs">
                                    {isLoading ? "Loading progress..." : "Keep building to unlock investor visibility!"}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column - Content */}
                    <div className="lg:col-span-4 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-[#576238] mb-6">Workflow Stages</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                                {stages.map((stage, index) => {
                                    const IconComponent = stage.icon;
                                    return (
                                        <motion.div
                                            key={stage.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <Card
                                                className={`p-4 text-center cursor-pointer transition-all h-full flex flex-col justify-between ${stage.hasError ? "bg-red-50 hover:bg-red-100 border-red-400" : stage.completed ? "bg-[#F0EADC] hover:bg-[#e8e2d4] border-[#d4cbb8]" : "bg-white hover:border-[#d4cbb8]"} border-2 rounded-2xl`}
                                                onClick={() => router.push(stage.path)}
                                            >
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stage.hasError ? "bg-red-500" : stage.completed ? "bg-[#576238]" : "bg-gray-200"}`}>
                                                        <IconComponent className={`w-6 h-6 ${stage.hasError || stage.completed ? "text-white" : "text-gray-400"}`} />
                                                    </div>
                                                    <h3 className={`font-semibold text-xs leading-tight ${stage.hasError ? "text-red-700" : stage.completed ? "text-[#576238]" : "text-gray-600"}`}>{stage.name}</h3>
                                                </div>
                                                <div className="mt-4">
                                                    {stage.hasError ? (
                                                        <div className="w-6 h-6 mx-auto rounded-full bg-red-500 flex items-center justify-center" title={stage.errorMessage}><AlertCircle className="w-4 h-4 text-white" /></div>
                                                    ) : stage.completed ? (
                                                        <div className="w-6 h-6 mx-auto rounded-full bg-[#576238] flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>
                                                    ) : (
                                                        <div className="w-6 h-6 mx-auto rounded-full border-2 border-gray-300" />
                                                    )}
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Resources & Content */}
                        <div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-4">Resources & Content</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Link href={`/founder/startup/${startupId}/documents-page`}>
                                    <Card className="p-8 hover:shadow-xl transition-all cursor-pointer border-2 hover:border-[#FFD95D] bg-[#F0EADC]/50 group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-[#576238] p-4 rounded-2xl group-hover:scale-110 transition-transform">
                                                <FolderOpen className="h-8 w-8 text-[#FFD95D]" />
                                            </div>
                                            <div className="flex-grow">
                                                <h4 className="text-xl font-bold text-[#576238] mb-1">Documents</h4>
                                                <p className="text-sm text-muted-foreground">Manage all startup documents</p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs bg-[#576238] text-white px-2 py-1 rounded-full">
                                                        {docCount} {docCount === 1 ? "file" : "files"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>

                                <Link href={`/founder/startup/${startupId}/pitches-page`}>
                                    <Card className="p-8 hover:shadow-xl transition-all cursor-pointer border-2 hover:border-[#FFD95D] bg-[#F0EADC]/50 group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-[#576238] p-4 rounded-2xl group-hover:scale-110 transition-transform">
                                                <Video className="h-8 w-8 text-[#FFD95D]" />
                                            </div>
                                            <div className="flex-grow">
                                                <h4 className="text-xl font-bold text-[#576238] mb-1">Pitches</h4>
                                                <p className="text-sm text-muted-foreground">View all pitch videos & slides</p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs bg-[#576238] text-white px-2 py-1 rounded-full">{videoCount} videos</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            </div>
                        </div>

                        {/* --- CALENDAR SECTION --- */}
                        <div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-4">Startup Calendar</h3>
                            <Card className="p-6 bg-white border-2">
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-lg font-bold text-[#576238]">
                                        {currentMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                                    </h4>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                                        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                                    </div>
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-2">
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                        <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">{day}</div>
                                    ))}
                                    {calendarDays.map((day, index) => {
                                        const dayMeetings = getMeetingsForDay(day);
                                        const hasMeetings = dayMeetings.length > 0;
                                        const isToday = day === todayDate;

                                        return (
                                            <div
                                                key={index}
                                                className={`
                                                    group relative aspect-square flex flex-col items-center justify-center text-sm rounded-lg cursor-pointer transition-all 
                                                    ${!day ? "bg-transparent" : isToday ? "bg-[#576238] text-white font-bold" : hasMeetings ? "bg-[#FFD95D]/30 hover:bg-[#FFD95D]/50" : "hover:bg-[#F0EADC]"}
                                                `}
                                            >
                                                {day}

                                                {/* Dots for meetings */}
                                                {hasMeetings && (
                                                    <div className="flex gap-1 mt-1">
                                                        {dayMeetings.slice(0, 3).map((m, i) => (
                                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${isToday ? "bg-white" : getDotColor(m.status)}`} />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* TOOLTIP ON HOVER */}
                                                {hasMeetings && (
                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-white border border-gray-200 p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                                        <div className="text-xs font-bold text-[#576238] mb-1 border-b pb-1">
                                                            {day} {currentMonthDate.toLocaleDateString('en-US', { month: 'short' })}
                                                        </div>
                                                        <div className="space-y-1">
                                                            {dayMeetings.map((m, i) => (
                                                                <div key={i} className="flex items-center justify-between text-[10px] text-gray-600">
                                                                    <span className="truncate max-w-[80px] font-medium">{m.with_whom_name}</span>
                                                                    <span className={`px-1 rounded-sm text-[9px] text-white ${getStatusColor(m.status)}`}>{m.meeting_time.slice(0, 5)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Tooltip arrow */}
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Meetings List Container */}
                                <div className="mt-8 grid md:grid-cols-2 gap-8 pt-6 border-t">

                                    {/* COLUMN 1: UPCOMING & ACCEPTED (The actionable ones) */}
                                    <div>
                                        <h5 className="font-bold text-[#576238] mb-3 flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4" /> Upcoming Events
                                        </h5>
                                        <div className="space-y-3">
                                            {acceptedUpcoming.length === 0 ? (
                                                <p className="text-sm text-gray-400 italic">No upcoming accepted meetings.</p>
                                            ) : (
                                                acceptedUpcoming.slice(0, 4).map((meeting) => (
                                                    <div
                                                        key={meeting.meeting_id}
                                                        onClick={handleEventClick} // <-- CLICK REDIRECT
                                                        className="cursor-pointer flex items-start gap-3 p-3 rounded-lg bg-[#F0EADC]/50 border border-[#F0EADC] hover:border-[#576238]/30 hover:bg-[#F0EADC] transition-all group"
                                                    >
                                                        <div className="text-center min-w-[50px] bg-white rounded-md p-1 border group-hover:border-[#576238]/30 transition-colors">
                                                            <div className="text-xs text-red-500 font-bold uppercase">{new Date(meeting.meeting_date).toLocaleDateString('en-US', { month: 'short' })}</div>
                                                            <div className="text-xl font-bold text-[#576238]">{new Date(meeting.meeting_date).getDate()}</div>
                                                        </div>
                                                        <div className="flex-grow">
                                                            <div className="font-semibold text-sm text-[#576238] line-clamp-1">
                                                                {meeting.with_whom_name || "Meeting"}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                                <Clock className="w-3 h-3" /> {meeting.meeting_time}
                                                            </div>
                                                            {/* STYLED LINK SECTION START */}
                                                            {meeting.meeting_link && (
                                                                <a
                                                                    href={meeting.meeting_link}
                                                                    target="_blank"
                                                                    onClick={(e) => e.stopPropagation()} // <-- PREVENT REDIRECT WHEN CLICKING JOIN
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
                                                                >
                                                                    <LinkIcon className="w-3 h-3" />
                                                                    Join Link
                                                                </a>
                                                            )}
                                                            {/* STYLED LINK SECTION END */}
                                                        </div>
                                                        <div className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${getStatusColor(meeting.status)}`}>
                                                            {meeting.status}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* COLUMN 2: ACTIVITY & HISTORY (Pending, Cancelled, Past) */}
                                    <div>
                                        <h5 className="font-bold text-gray-500 mb-3 flex items-center gap-2">
                                            <RefreshCw className="h-4 w-4" /> Activity & History
                                        </h5>
                                        <div className="space-y-2 opacity-90">
                                            {otherMeetings.length === 0 ? (
                                                <p className="text-sm text-gray-400 italic">No activity history.</p>
                                            ) : (
                                                otherMeetings.slice(0, 4).map((meeting) => {
                                                    const isPast = new Date(meeting.meeting_date) < now && meeting.status === 'accepted';
                                                    return (
                                                        <div key={meeting.meeting_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                                            <div className="text-xs font-bold text-gray-400 min-w-[40px]">
                                                                {new Date(meeting.meeting_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                                                            </div>
                                                            <div className="flex-grow">
                                                                <div className="text-sm text-gray-700 font-medium">
                                                                    {meeting.with_whom_name}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                                    {meeting.status === 'pending' && <Timer className="w-3 h-3" />}
                                                                    {meeting.status === 'canceled' && <AlertOctagon className="w-3 h-3" />}
                                                                    <span className="capitalize">{meeting.status}</span>
                                                                    {isPast && <span>• Past Event</span>}
                                                                </div>
                                                            </div>
                                                            <div className={`w-2 h-2 rounded-full ${getDotColor(meeting.status)}`} />
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            {/* Invite Team Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-[#576238]">Invite Team Member</DialogTitle>
                        <DialogDescription>Send an invitation to collaborate on {startupName}.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-[#576238]">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="colleague@example.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="border-[#576238]/30 focus:border-[#576238]"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="role" className="text-[#576238] flex items-center gap-2">
                                Role
                            </Label>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="relative group cursor-help">
                                            <div className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-600 border-[#576238]/10">
                                                <span className="font-medium">Contributor</span>
                                                <Info className="h-4 w-4 text-[#576238]" />
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#576238] text-white p-3 max-w-xs text-sm">
                                        <p>Contributor can view same view of the founder and perform tasks</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <p className="text-[10px] text-muted-foreground">
                                Only the Contributor role is available for invitation at this stage.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSendInvite}
                            disabled={!inviteEmail || isInviting}
                            className="bg-[#576238] hover:bg-[#6b7c3f] text-white"
                        >
                            {isInviting ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Share2 className="mr-2 h-4 w-4" />
                            )}
                            {isInviting ? "Sending..." : "Send Invite"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}