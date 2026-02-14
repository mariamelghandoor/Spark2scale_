"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft, FolderOpen, Video, Calendar as CalendarIcon,
    ChevronLeft, ChevronRight, User, Lightbulb, FileText,
    BarChart3, Target, RefreshCw, Presentation, Check, AlertCircle,
    Link as LinkIcon, AlertOctagon, Timer, Clock, Lock, Info
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import LegoProgress from "@/components/lego/LegoProgress";
import { useParams, useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { startupDashboardService, WorkflowData, Meeting } from "@/services/startupDashboardService";

export default function ContributorStartupPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading } = useAuth();

    // --- State ---
    const [startupName, setStartupName] = useState("Loading...");
    const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
    const [docCount, setDocCount] = useState(0);
    const [videoCount, setVideoCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Meeting & Calendar State
    const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
    const [meetings, setMeetings] = useState<Meeting[]>([]);

    // ID Logic
    const rawId = params?.id;
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
    const userName = user?.fname || "Contributor";

    // ---------------------------------------------------------
    // 2. Logic & Handlers
    // ---------------------------------------------------------

    // Workflow Stages
    const currentData = workflowData || {
        ideaCheck: false, marketResearch: false, evaluation: false,
        recommendation: false, documents: false, pitchDeck: false
    };

    const stages = [
        {
            id: 1,
            name: "Idea Check",
            icon: Lightbulb,
            completed: currentData.ideaCheck,
            hasError: false,
            path: `/contributor/startup/${cleanId}/idea-check`,
            isReadOnly: false
        },
        {
            id: 2,
            name: "Market Research",
            icon: BarChart3,
            completed: currentData.marketResearch,
            hasError: false,
            path: null, // No read-only page yet
            isReadOnly: true
        },
        {
            id: 3,
            name: "Evaluation",
            icon: Target,
            completed: currentData.evaluation,
            hasError: false,
            path: null, // No read-only page yet
            isReadOnly: true
        },
        {
            id: 4,
            name: "Recommendation",
            icon: RefreshCw,
            completed: currentData.recommendation,
            hasError: false,
            path: null, // No read-only page yet
            isReadOnly: true
        },
        {
            id: 5,
            name: "Documents",
            icon: FileText,
            completed: currentData.documents,
            hasError: false,
            path: `/contributor/startup/${cleanId}/documents`,
            isReadOnly: false // Accessible
        },
        {
            id: 6,
            name: "Pitch Deck",
            icon: Presentation,
            completed: currentData.pitchDeck,
            hasError: false,
            path: `/contributor/startup/${cleanId}/pitches`,
            isReadOnly: false // Accessible
        },
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

    // STARTUP-CENTRIC CALENDAR FILTERING
    // For contributors, we might want to see meetings for this startup specifically, 
    // but the API currently returns user's meetings. 
    // We already have startup_id in meetings (from previous analysis), so let's try to be smart.
    // If the meeting has a startup_id that matches, OR if it's a general meeting for this user.
    const getMeetingsForDay = (day: number | null) => {
        if (!day) return [];
        return meetings.filter(m => {
            const mDate = new Date(m.meeting_date);
            // Ideally check m.startup_id === cleanId if available in Meeting type, 
            // but for now we trust the backend filtered by userId.
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

    const handleEventClick = () => router.push('/contributor/schedule');

    // ---------------------------------------------------------
    // 3. Render
    // ---------------------------------------------------------
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/contributor/dashboard">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">
                                Hello {userName} 👋
                            </h1>
                            <p className="text-sm text-muted-foreground">{startupName} • Contributor View</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/contributor/schedule">
                            <Button variant="outline" size="icon" className="relative">
                                <CalendarIcon className="h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="/profile">
                            <Button variant="outline" size="icon">
                                <User className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Left Column - Progress */}
                    <div className="lg:col-span-1">
                        <Card className="p-6 sticky top-8">
                            <h3 className="text-lg font-bold text-[#576238] mb-4 text-center">Startup Progress</h3>
                            <LegoProgress totalStages={6} completedStages={completedCount} stageErrors={stageErrors} className="mb-6" />
                            <div className="space-y-2 text-sm">
                                <p className="text-center text-muted-foreground text-xs">
                                    {isLoading ? "Loading progress..." : "View-only access to startup progress."}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column - Content */}
                    <div className="lg:col-span-4 space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-bold text-[#576238]">Workflow Stages</h2>
                                <span className="px-3 py-1 bg-[#576238]/10 text-[#576238] text-sm font-medium rounded-full flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> Read-Only Mode
                                </span>
                            </div>

                            {/* Workflow Grid */}
                            <TooltipProvider delayDuration={0}>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                                    {stages.map((stage, index) => {
                                        const IconComponent = stage.icon;

                                        // Locking Logic: Locked if previous not complete
                                        const isLocked = index > 0 && !stages[index - 1].completed;

                                        // Interaction Logic: 
                                        // - Clickable if: it has a path AND is not locked
                                        // - otherwise non-clickable
                                        const isClickable = stage.path && !isLocked;

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
                                                                        ? "bg-gray-50/80 border-gray-200 cursor-not-allowed"
                                                                        : stage.hasError
                                                                            ? "bg-red-50 border-red-400"
                                                                            : stage.completed
                                                                                ? "bg-[#F0EADC] border-[#d4cbb8]"
                                                                                : "bg-white border-transparent"
                                                                    }
                                                                    ${isClickable ? "hover:-translate-y-1 hover:shadow-md cursor-pointer hover:border-[#d4cbb8]" : "cursor-default"}
                                                                `}
                                                                onClick={() => {
                                                                    if (isClickable) {
                                                                        router.push(stage.path!);
                                                                    }
                                                                }}
                                                            >
                                                                <div className="flex flex-col items-center gap-3">
                                                                    <div className="relative">
                                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
                                                                            ${isLocked
                                                                                ? "bg-white border border-gray-100"
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
                                                                                        ? "text-gray-300"
                                                                                        : stage.hasError || stage.completed
                                                                                            ? "text-white"
                                                                                            : "text-gray-500 group-hover:text-[#576238]"
                                                                                    }`}
                                                                            />
                                                                        </div>
                                                                        {isLocked && (
                                                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                                                                                <Lock className="w-3 h-3 text-gray-400" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <h3 className={`font-semibold text-xs leading-tight 
                                                                        ${isLocked
                                                                            ? "text-slate-500"
                                                                            : stage.completed
                                                                                ? "text-[#576238]"
                                                                                : "text-gray-600"
                                                                        }`}
                                                                    >
                                                                        {stage.name}
                                                                    </h3>
                                                                </div>

                                                                <div className="mt-4">
                                                                    {isLocked ? (
                                                                        <div className="w-1.5 h-1.5 mx-auto rounded-full bg-gray-300" />
                                                                    ) : stage.completed ? (
                                                                        <div className="w-6 h-6 mx-auto rounded-full bg-[#576238] flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>
                                                                    ) : (
                                                                        <div className={`w-6 h-6 mx-auto rounded-full border-2 border-gray-200 ${isClickable ? "group-hover:border-[#576238]" : ""}`} />
                                                                    )}
                                                                </div>
                                                            </Card>
                                                        </div>
                                                    </TooltipTrigger>

                                                    {isLocked ? (
                                                        <TooltipContent className="bg-slate-900 text-white border-slate-800">
                                                            <div className="flex items-center gap-2">
                                                                <Lock className="w-3 h-3" />
                                                                <span>Complete previous stage</span>
                                                            </div>
                                                        </TooltipContent>
                                                    ) : !isClickable ? (
                                                        <TooltipContent className="bg-[#576238] text-white border-[#576238]">
                                                            <div className="flex items-center gap-2">
                                                                <Info className="w-3 h-3" />
                                                                <span>View-only mode (No details page)</span>
                                                            </div>
                                                        </TooltipContent>
                                                    ) : null}
                                                </Tooltip>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </TooltipProvider>
                        </div>

                        {/* Resources Section - Same as before but in new grid */}
                        <div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-4">
                                Resources & Content
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Link href={`/contributor/startup/${cleanId}/documents`}>
                                    <Card className="p-8 hover:shadow-xl transition-all cursor-pointer border-2 hover:border-[#FFD95D] bg-[#F0EADC]/50 group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-[#576238] p-4 rounded-2xl group-hover:scale-110 transition-transform">
                                                <FolderOpen className="h-8 w-8 text-[#FFD95D]" />
                                            </div>
                                            <div className="flex-grow">
                                                <h4 className="text-xl font-bold text-[#576238] mb-1">
                                                    Documents
                                                </h4>
                                                <p className="text-sm text-muted-foreground">
                                                    View and download documents
                                                </p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs bg-[#576238] text-white px-2 py-1 rounded-full">
                                                        {docCount} files
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>

                                <Link href={`/contributor/startup/${cleanId}/pitches`}>
                                    <Card className="p-8 hover:shadow-xl transition-all cursor-pointer border-2 hover:border-[#FFD95D] bg-[#F0EADC]/50 group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-[#576238] p-4 rounded-2xl group-hover:scale-110 transition-transform">
                                                <Video className="h-8 w-8 text-[#FFD95D]" />
                                            </div>
                                            <div className="flex-grow">
                                                <h4 className="text-xl font-bold text-[#576238] mb-1">
                                                    Pitches
                                                </h4>
                                                <p className="text-sm text-muted-foreground">
                                                    View pitch videos & slides
                                                </p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs bg-[#576238] text-white px-2 py-1 rounded-full">
                                                        {videoCount} videos
                                                    </span>
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
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-lg font-bold text-[#576238]">
                                        {currentMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                                    </h4>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={prevMonth}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={nextMonth}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-2">
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                        <div
                                            key={day}
                                            className="text-center text-xs font-semibold text-muted-foreground py-2"
                                        >
                                            {day}
                                        </div>
                                    ))}

                                    {calendarDays.map((day, index) => {
                                        const dayMeetings = getMeetingsForDay(day);
                                        const hasMeetings = dayMeetings.length > 0;
                                        const isToday = day === todayDate;

                                        return (
                                            <div
                                                key={index}
                                                className={`aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition-all relative ${!day
                                                    ? "bg-transparent"
                                                    : isToday
                                                        ? "bg-[#576238] text-white font-bold"
                                                        : hasMeetings
                                                            ? "bg-[#FFD95D]/30 font-semibold"
                                                            : "bg-gray-50"
                                                    }`}
                                            >
                                                {day}
                                                {hasMeetings && (
                                                    <div className="flex gap-1 mt-1">
                                                        {dayMeetings.slice(0, 3).map((m, i) => (
                                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${isToday ? "bg-white" : getDotColor(m.status)}`} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Upcoming Events */}
                                <div className="mt-6 pt-6 border-t">
                                    <h5 className="font-bold text-[#576238] mb-3 flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4" />
                                        Upcoming Events
                                    </h5>
                                    <div className="space-y-2">
                                        {acceptedUpcoming.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No upcoming accepted events.</p>
                                        ) : acceptedUpcoming.slice(0, 3).map((event, idx) => (
                                            <div
                                                key={idx}
                                                onClick={handleEventClick}
                                                className="cursor-pointer flex items-center gap-3 p-3 rounded-lg bg-[#F0EADC]/50 transition-colors border border-transparent hover:border-[#576238]/30"
                                            >
                                                <div className="text-center min-w-[40px]">
                                                    <div className="text-lg font-bold text-[#576238]">
                                                        {new Date(event.meeting_date).getDate()}
                                                    </div>
                                                </div>
                                                <div className="flex-grow">
                                                    <div className="font-semibold text-sm text-[#576238]">
                                                        {event.with_whom_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {event.meeting_time}
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] px-2 py-1 rounded-full text-white ${getStatusColor(event.status)}`}>
                                                    {event.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

