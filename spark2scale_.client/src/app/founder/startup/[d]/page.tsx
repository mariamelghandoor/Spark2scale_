"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Share2, FolderOpen, Video, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bell, User, Lightbulb, FileText, BarChart3, Target, RefreshCw, Presentation, Check, AlertCircle, Clock, Link as LinkIcon } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const [currentUserId, setCurrentUserId] = useState<string>(""); // Needs to be set by your Auth logic

    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("contributor");
    const [videoCount, setVideoCount] = useState(0);

    // 1. Fetch User & Dashboard Data
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!params || !params.d) return;

            const rawId = Array.isArray(params.d) ? params.d[0] : params.d;
            const cleanId = decodeURIComponent(rawId).replace(/\s/g, '');

            // --- MOCK AUTH: REPLACE THIS WITH YOUR ACTUAL AUTH CONTEXT ---
            // We need the UserID to fetch meetings. 
            // For now, I'm simulating fetching a user ID. 
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

        // 0 = Sunday, 1 = Monday, etc.
        const startDayIndex = firstDayOfMonth.getDay();

        const days = [];
        // Add empty slots for days before the 1st
        for (let i = 0; i < startDayIndex; i++) days.push(null);
        // Add actual days
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

    // Split meetings into Upcoming and Past
    const now = new Date();

    const sortedMeetings = [...meetings].sort((a, b) => {
        return new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime();
    });

    const upcomingMeetings = sortedMeetings.filter(m => {
        // Simple date comparison (ignoring exact time for list, or being precise)
        const mDate = new Date(m.meeting_date);
        // Reset times for date-only comparison if preferred, or keep exact
        return mDate >= now || (mDate.getDate() === now.getDate() && mDate.getMonth() === now.getMonth() && mDate.getFullYear() === now.getFullYear());
    });

    const pastMeetings = sortedMeetings.filter(m => {
        const mDate = new Date(m.meeting_date);
        return mDate < now && !(mDate.getDate() === now.getDate() && mDate.getMonth() === now.getMonth());
    }).reverse(); // Most recent past first

    // Color helper
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'accepted': return "bg-[#576238] text-white"; // Greenish
            case 'pending': return "bg-[#FFD95D] text-[#576238]"; // Yellow
            case 'rejected':
            case 'canceled': return "bg-red-500 text-white"; // Red
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


    // Invite logic
    const handleSendInvite = () => {
        console.log("Inviting:", inviteEmail, "as", inviteRole);
        setInviteEmail("");
        setInviteRole("contributor");
        setInviteDialogOpen(false);
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
                                                    aspect-square flex flex-col items-center justify-center text-sm rounded-lg cursor-pointer transition-all relative 
                                                    ${!day ? "bg-transparent" : isToday ? "bg-[#576238] text-white font-bold" : hasMeetings ? "bg-[#FFD95D]/30 hover:bg-[#FFD95D]/50" : "hover:bg-[#F0EADC]"}
                                                `}
                                            >
                                                {day}

                                                {/* Dots for meetings */}
                                                {hasMeetings && (
                                                    <div className="flex gap-1 mt-1">
                                                        {dayMeetings.slice(0, 3).map((m, i) => (
                                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${isToday ? "bg-white" : getDotColor(m.status)}`} title={m.status} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Meetings List (Upcoming separated) */}
                                <div className="mt-8 grid md:grid-cols-2 gap-8 pt-6 border-t">

                                    {/* UPCOMING MEETINGS */}
                                    <div>
                                        <h5 className="font-bold text-[#576238] mb-3 flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4" /> Upcoming Events
                                        </h5>
                                        <div className="space-y-3">
                                            {upcomingMeetings.length === 0 ? (
                                                <p className="text-sm text-gray-400 italic">No upcoming meetings.</p>
                                            ) : (
                                                upcomingMeetings.slice(0, 4).map((meeting) => (
                                                    <div key={meeting.meeting_id} className="flex items-start gap-3 p-3 rounded-lg bg-[#F0EADC]/50 border border-[#F0EADC] hover:border-[#576238]/30 transition-all">
                                                        <div className="text-center min-w-[50px] bg-white rounded-md p-1 border">
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

                                    {/* PAST MEETINGS (Shown differently/dimmed) */}
                                    <div>
                                        <h5 className="font-bold text-gray-500 mb-3 flex items-center gap-2">
                                            <RefreshCw className="h-4 w-4" /> Past Events
                                        </h5>
                                        <div className="space-y-2 opacity-75">
                                            {pastMeetings.length === 0 ? (
                                                <p className="text-sm text-gray-400 italic">No past history.</p>
                                            ) : (
                                                pastMeetings.slice(0, 3).map((meeting) => (
                                                    <div key={meeting.meeting_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                        <div className="text-sm font-bold text-gray-400">
                                                            {new Date(meeting.meeting_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                                                        </div>
                                                        <div className="flex-grow text-sm text-gray-600">
                                                            {meeting.with_whom_name}
                                                        </div>
                                                        <div className={`w-2 h-2 rounded-full ${getDotColor(meeting.status)}`} />
                                                    </div>
                                                ))
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
                        <DialogDescription>Send an invitation to collaborate on {startupName}. Choose their role and access level.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-[#576238]">Email Address</Label>
                            <Input id="email" type="email" placeholder="colleague@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="border-[#576238]/30 focus:border-[#576238]" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="role" className="text-[#576238]">Role</Label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                                <SelectTrigger id="role" className="border-[#576238]/30"><SelectValue placeholder="Select role" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="contributor"><div className="flex flex-col items-start"><span className="font-semibold">Contributor</span><span className="text-xs text-muted-foreground">Read-only access to resources</span></div></SelectItem>
                                    <SelectItem value="team-member"><div className="flex flex-col items-start"><span className="font-semibold">Team Member</span><span className="text-xs text-muted-foreground">Full access to collaborate</span></div></SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendInvite} disabled={!inviteEmail || !inviteRole} className="bg-[#576238] hover:bg-[#6b7c3f] text-white"><Share2 className="mr-2 h-4 w-4" /> Send Invite</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}