"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Share2, FolderOpen, Video, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bell, User, Lightbulb, FileText, BarChart3, Target, RefreshCw, Presentation, Check, AlertCircle } from "lucide-react";
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

interface WorkflowData {
    startupId: string;
    ideaCheck: boolean;
    marketResearch: boolean;
    evaluation: boolean;
    recommendation: boolean;
    documents: boolean;
    pitchDeck: boolean;
}

export default function StartupDashboard() {
    const params = useParams();
    const router = useRouter();
    const [userName] = useState("Alex");

    // State
    const [startupName, setStartupName] = useState("Loading...");
    const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
    const [docCount, setDocCount] = useState(0); // <--- NEW STATE FOR FILE COUNT
    const [isLoading, setIsLoading] = useState(true);

    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("contributor");

    const [currentMonth] = useState(new Date());
    const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Updated Data Fetching
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!params || !params.d) return;

            const rawId = Array.isArray(params.d) ? params.d[0] : params.d;
            const cleanId = decodeURIComponent(rawId).replace(/\s/g, '');

            try {
                const baseUrl = "https://localhost:7155/api";

                // Fetch Workflow, Startup Name, AND Document Count in parallel
                const [workflowRes, startupRes, docCountRes] = await Promise.all([
                    fetch(`${baseUrl}/StartupWorkflow/${cleanId}`),
                    fetch(`${baseUrl}/startups/${cleanId}`),
                    fetch(`${baseUrl}/DocumentVersions/count/${cleanId}`) // <--- NEW FETCH
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

            } catch (error) {
                console.error("Error connecting to backend:", error);
                setStartupName("Error Loading Data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [params]);

    // ... (Keep existing Calendar, Events, and Stages logic exactly the same) ...
    // Sample calendar events
    const events = [
        { date: 15, title: "Investor Meeting", time: "2:00 PM", type: "meeting" },
        { date: 18, title: "Pitch Deadline", time: "5:00 PM", type: "deadline" },
        { date: 22, title: "Document Review", time: "10:00 AM", type: "reminder" },
        { date: 25, title: "Team Sync", time: "3:30 PM", type: "meeting" },
    ];

    const currentData = workflowData || {
        ideaCheck: false, marketResearch: false, evaluation: false,
        recommendation: false, documents: false, pitchDeck: false
    };
    const startupId = params?.d ? String(params.d) : "";

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

    // Calendar generation logic
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);
        return days;
    };
    const calendarDays = generateCalendarDays();
    const today = new Date().getDate();

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
                                                    {/* --- DYNAMIC COUNT DISPLAY --- */}
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
                                                    <span className="text-xs bg-[#576238] text-white px-2 py-1 rounded-full">6 videos</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            </div>
                        </div>

                        {/* Calendar */}
                        <div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-4">Startup Calendar</h3>
                            <Card className="p-6 bg-white border-2">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-lg font-bold text-[#576238]">{monthName}</h4>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
                                        <Button variant="outline" size="icon"><ChevronRight className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                        <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">{day}</div>
                                    ))}
                                    {calendarDays.map((day, index) => {
                                        const hasEvent = day && events.some((e) => e.date === day);
                                        const isToday = day === today;
                                        return (
                                            <div key={index} className={`aspect-square flex items-center justify-center text-sm rounded-lg cursor-pointer transition-all relative ${!day ? "bg-transparent" : isToday ? "bg-[#576238] text-white font-bold" : hasEvent ? "bg-[#FFD95D]/30 hover:bg-[#FFD95D]/50 font-semibold" : "hover:bg-[#F0EADC]"}`}>
                                                {day}
                                                {hasEvent && <div className="absolute bottom-1 w-1 h-1 bg-[#576238] rounded-full" />}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-6 pt-6 border-t">
                                    <h5 className="font-bold text-[#576238] mb-3 flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Upcoming Events</h5>
                                    <div className="space-y-2">
                                        {events.slice(0, 3).map((event, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-[#F0EADC]/50 hover:bg-[#F0EADC] transition-colors cursor-pointer">
                                                <div className="text-center min-w-[40px]"><div className="text-lg font-bold text-[#576238]">{event.date}</div></div>
                                                <div className="flex-grow"><div className="font-semibold text-sm text-[#576238]">{event.title}</div><div className="text-xs text-muted-foreground">{event.time}</div></div>
                                                <span className={`text-xs px-2 py-1 rounded-full ${event.type === "meeting" ? "bg-[#576238] text-white" : event.type === "deadline" ? "bg-red-500 text-white" : "bg-[#FFD95D] text-[#576238]"}`}>{event.type}</span>
                                            </div>
                                        ))}
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