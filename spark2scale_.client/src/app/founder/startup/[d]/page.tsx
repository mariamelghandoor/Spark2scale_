"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft, Share2, FolderOpen, Video, Calendar as CalendarIcon,
    ChevronLeft, ChevronRight, User, Lightbulb, FileText,
    BarChart3, Target, RefreshCw, Presentation, Check, AlertCircle,
    Link as LinkIcon, AlertOctagon, Timer, Info, Clock, Lock
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import LegoProgress from "@/components/lego/LegoProgress";
import { useParams, useRouter } from "next/navigation";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";

import { useAuth } from "@/context/AuthContext";

// Import the new service
import { startupDashboardService, WorkflowData, Meeting } from "@/services/startupDashboardService";

export default function StartupDashboard() {
    const params = useParams();
    const router = useRouter();
    const { user, loading } = useAuth();

    // --- State ---
    const [startupName, setStartupName] = useState("Loading...");
    const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
    const [docCount, setDocCount] = useState(0);
    const [videoCount, setVideoCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>("Viewer");

    // Meeting & Calendar State
    const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
    const [meetings, setMeetings] = useState<Meeting[]>([]);

    // Invite State
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [isInviting, setIsInviting] = useState(false);

    // Success Dialog State
    const [inviteSuccessOpen, setInviteSuccessOpen] = useState(false);
    const [lastInvitedEmail, setLastInvitedEmail] = useState("");

    // ID Logic
    const rawId = params?.d;
    const cleanId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId).toString() : "";

    // ---------------------------------------------------------
    // 1. Initial Data Fetch
    // ---------------------------------------------------------
    useEffect(() => {
        const init = async () => {
            if (!cleanId || loading || !user?.id) return;

            try {
                const data = await startupDashboardService.getDashboardData(cleanId, user.id);
                setWorkflowData(data.workflow);
                setStartupName(data.startupName);
                setUserRole(data.role); // Set Role
                setDocCount(data.docCount);
                setVideoCount(data.videoCount);
                setMeetings(data.meetings);
            } catch (error) {
                console.error("Dashboard load failed", error);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [cleanId, user, loading]);

    // Derived User Name
    const userName = user?.fname || "Founder";

    // ---------------------------------------------------------
    // 2. Logic & Handlers
    // ---------------------------------------------------------

    // Workflow Stages
    const currentData = workflowData || {
        ideaCheck: false, marketResearch: false, evaluation: false,
        recommendation: false, documents: false, pitchDeck: false
    };

    const stages = [
        { id: 1, name: "Idea Check", icon: Lightbulb, completed: currentData.ideaCheck, hasError: false, path: `/founder/startup/${cleanId}/idea-check` },
        { id: 2, name: "Market Research", icon: BarChart3, completed: currentData.marketResearch, hasError: false, errorMessage: "Missing required data", path: `/founder/startup/${cleanId}/market-research` },
        { id: 3, name: "Evaluation", icon: Target, completed: currentData.evaluation, hasError: false, path: `/founder/startup/${cleanId}/evaluate` },
        { id: 4, name: "Recommendation", icon: RefreshCw, completed: currentData.recommendation, hasError: false, path: `/founder/startup/${cleanId}/recommendations` },
        { id: 5, name: "Documents", icon: FileText, completed: currentData.documents, hasError: false, path: `/founder/startup/${cleanId}/documents` },
        { id: 6, name: "Pitch Deck", icon: Presentation, completed: currentData.pitchDeck, hasError: false, path: `/founder/startup/${cleanId}/pitch-deck` },
    ];

    const completedCount = stages.filter(stage => stage.completed).length;
    const stageErrors = stages.map(stage => stage.hasError || false);

    // Calendar & Other Handlers
    const prevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
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
    const getMeetingsForDay = (day: number | null) => {
        if (!day) return [];
        return meetings.filter(m => {
            const mDate = new Date(m.meeting_date);
            return mDate.getDate() === day && mDate.getMonth() === currentMonthDate.getMonth() && mDate.getFullYear() === currentMonthDate.getFullYear();
        });
    };

    // Meeting Sorting
    const now = new Date();
    const sortedMeetings = [...meetings].sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime());
    const allUpcoming = sortedMeetings.filter(m => {
        const mDate = new Date(m.meeting_date);
        return mDate >= now || (mDate.getDate() === now.getDate() && mDate.getMonth() === now.getMonth() && mDate.getFullYear() === now.getFullYear());
    });
    const acceptedUpcoming = allUpcoming.filter(m => m.status === 'accepted');
    const otherUpcoming = allUpcoming.filter(m => m.status !== 'accepted');
    const pastMeetings = sortedMeetings.filter(m => {
        const mDate = new Date(m.meeting_date);
        return mDate < now && !(mDate.getDate() === now.getDate() && mDate.getMonth() === now.getMonth());
    }).reverse();
    const otherMeetings = [...otherUpcoming, ...pastMeetings].sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'accepted': return "bg-[#576238] text-white";
            case 'pending': return "bg-[#FFD95D] text-[#576238]";
            case 'rejected': case 'canceled': return "bg-red-500 text-white";
            default: return "bg-gray-200 text-gray-600";
        }
    };
    const getDotColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'accepted': return "bg-[#576238]";
            case 'pending': return "bg-[#FFD95D]";
            case 'rejected': case 'canceled': return "bg-red-500";
            default: return "bg-gray-400";
        }
    };
    const handleSendInvite = async () => {
        if (!inviteEmail || !user?.id) return;
        setIsInviting(true);
        const result = await startupDashboardService.inviteTeamMember(inviteEmail, cleanId, user.id);
        if (result.success) {
            setLastInvitedEmail(inviteEmail);
            setInviteEmail("");
            setInviteDialogOpen(false);
            setInviteSuccessOpen(true);
        } else {
            alert(`Failed to invite: ${result.message}`);
        }
        setIsInviting(false);
    };
    const handleEventClick = () => router.push('/founder/schedule');

    // ---------------------------------------------------------
    // 3. Render
    // ---------------------------------------------------------
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
                        <div className="flex items-center gap-4">
                            <Link href="/schedule"><Button variant="ghost" size="icon"><CalendarIcon className="h-5 w-5" /></Button></Link>
                            <NotificationsDropdown />
                            <Link href="/profile"><Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button></Link>
                        </div>
                        {userRole === "Founder" && (
                            <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
                                <Share2 className="mr-2 h-4 w-4" /> Invite Team
                            </Button>
                        )}
                        {userRole !== "Founder" && (
                            <div className="px-3 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-500 border border-gray-200">
                                {userRole} View
                            </div>
                        )}
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

                            {/* WRAP IN TOOLTIP PROVIDER */}
                            <TooltipProvider delayDuration={0}>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                                    {stages.map((stage, index) => {
                                        const IconComponent = stage.icon;

                                        // Locking Logic
                                        const isLocked = index > 0 && !stages[index - 1].completed;

                                        return (
                                            <motion.div
                                                key={stage.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                            >
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="h-full relative group">
                                                            <Card
                                                                className={`p-4 text-center transition-all duration-300 h-full flex flex-col justify-between border-2 rounded-2xl relative
                                                                    ${isLocked
                                                                        ? "bg-gray-50/80 border-gray-200 cursor-not-allowed" // Professional Locked Look
                                                                        : stage.hasError
                                                                            ? "bg-red-50 hover:bg-red-100 border-red-400 cursor-pointer"
                                                                            : stage.completed
                                                                                ? "bg-[#F0EADC] hover:bg-[#e8e2d4] border-[#d4cbb8] cursor-pointer"
                                                                                : "bg-white hover:border-[#d4cbb8] cursor-pointer hover:-translate-y-1 hover:shadow-md"
                                                                    }
                                                                `}
                                                                onClick={() => {
                                                                    if (!isLocked) {
                                                                        router.push(stage.path);
                                                                    }
                                                                }}
                                                            >
                                                                <div className="flex flex-col items-center gap-3">
                                                                    {/* ICON AREA */}
                                                                    <div className="relative">
                                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
                                                                            ${isLocked
                                                                                ? "bg-white border border-gray-100" // Locked Icon Bg
                                                                                : stage.hasError
                                                                                    ? "bg-red-500"
                                                                                    : stage.completed
                                                                                        ? "bg-[#576238]"
                                                                                        : "bg-gray-100 group-hover:bg-[#576238]/10"
                                                                            }`}
                                                                        >
                                                                            <IconComponent
                                                                                className={`w-6 h-6 
                                                                                    ${isLocked
                                                                                        ? "text-gray-300" // Faded icon when locked
                                                                                        : stage.hasError || stage.completed
                                                                                            ? "text-white"
                                                                                            : "text-gray-500 group-hover:text-[#576238]"
                                                                                    }`}
                                                                            />
                                                                        </div>

                                                                        {/* LOCK BADGE - Integrated into Icon area */}
                                                                        {isLocked && (
                                                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                                                                                <Lock className="w-3 h-3 text-gray-400" />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* NAME - Readable but Styled as Inactive */}
                                                                    <h3 className={`font-semibold text-xs leading-tight 
                                                                        ${isLocked
                                                                            ? "text-slate-500 font-medium" // Readable slate color
                                                                            : stage.hasError
                                                                                ? "text-red-700"
                                                                                : stage.completed
                                                                                    ? "text-[#576238]"
                                                                                    : "text-gray-600"
                                                                        }`}
                                                                    >
                                                                        {stage.name}
                                                                    </h3>
                                                                </div>

                                                                {/* BOTTOM INDICATOR */}
                                                                <div className="mt-4">
                                                                    {isLocked ? (
                                                                        // Small clean dot for locked state instead of big icon
                                                                        <div className="w-1.5 h-1.5 mx-auto rounded-full bg-gray-300" />
                                                                    ) : stage.hasError ? (
                                                                        <div className="w-6 h-6 mx-auto rounded-full bg-red-500 flex items-center justify-center" title={stage.errorMessage}><AlertCircle className="w-4 h-4 text-white" /></div>
                                                                    ) : stage.completed ? (
                                                                        <div className="w-6 h-6 mx-auto rounded-full bg-[#576238] flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>
                                                                    ) : (
                                                                        <div className="w-6 h-6 mx-auto rounded-full border-2 border-gray-200 group-hover:border-[#576238]" />
                                                                    )}
                                                                </div>
                                                            </Card>
                                                        </div>
                                                    </TooltipTrigger>

                                                    {/* PROFESSIONAL TOOLTIP */}
                                                    {isLocked && (
                                                        <TooltipContent
                                                            side="top"
                                                            className="bg-slate-900 text-white border-slate-800 shadow-xl px-4 py-2 text-xs font-medium rounded-lg"
                                                            sideOffset={10}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Lock className="w-3 h-3 text-gray-400" />
                                                                <span>Complete previous stage</span>
                                                            </div>
                                                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900"></div>
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </TooltipProvider>
                        </div>

                        {/* Resources & Content Section */}
                        <div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-4">Resources & Content</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Link href={`/founder/startup/${cleanId}/documents-page`}>
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

                                <Link href={`/founder/startup/${cleanId}/pitches-page`}>
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

                        {/* Calendar Section */}
                        <div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-4">Startup Calendar</h3>
                            <Card className="p-6 bg-white border-2">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-lg font-bold text-[#576238]">
                                        {currentMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                                    </h4>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                                        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                                    </div>
                                </div>

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
                                                className={`group relative aspect-square flex flex-col items-center justify-center text-sm rounded-lg cursor-pointer transition-all ${!day ? "bg-transparent" : isToday ? "bg-[#576238] text-white font-bold" : hasMeetings ? "bg-[#FFD95D]/30 hover:bg-[#FFD95D]/50" : "hover:bg-[#F0EADC]"}`}
                                            >
                                                {day}
                                                {hasMeetings && (
                                                    <div className="flex gap-1 mt-1">
                                                        {dayMeetings.slice(0, 3).map((m, i) => (
                                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${isToday ? "bg-white" : getDotColor(m.status)}`} />
                                                        ))}
                                                    </div>
                                                )}
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
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Meetings List Container */}
                                <div className="mt-8 grid md:grid-cols-2 gap-8 pt-6 border-t">
                                    {/* Upcoming Events */}
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
                                                        onClick={handleEventClick}
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
                                                                <Clock className="w-3 h-3" /> {meeting.meeting_time.slice(0, 5)}
                                                            </div>
                                                            {meeting.meeting_link && (
                                                                <a
                                                                    href={meeting.meeting_link}
                                                                    target="_blank"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
                                                                >
                                                                    <LinkIcon className="w-3 h-3" /> Join Link
                                                                </a>
                                                            )}
                                                        </div>
                                                        <div className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${getStatusColor(meeting.status)}`}>
                                                            {meeting.status}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Activity & History */}
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
                            <Label htmlFor="role" className="text-[#576238] flex items-center gap-2">Role</Label>
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

            {/* Success Dialog */}
            <Dialog open={inviteSuccessOpen} onOpenChange={setInviteSuccessOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="text-[#576238] flex items-center gap-2">
                            <Check className="h-5 w-5" /> Invitation Sent
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-gray-600">
                            Invitation sent successfully to <span className="font-bold text-[#576238]">{lastInvitedEmail}</span>.
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            They will receive an email with a link to join your startup.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={() => setInviteSuccessOpen(false)}
                            className="bg-[#576238] hover:bg-[#6b7c3f] text-white"
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}