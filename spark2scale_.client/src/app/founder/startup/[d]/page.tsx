"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Share2, FolderOpen, Video, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bell, User, Lightbulb, FileText, BarChart3, Target, RefreshCw, Presentation, Check } from "lucide-react";
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

export default function StartupDashboard() {
    const params = useParams();
    const router = useRouter();
    const [userName] = useState("Alex");
    const [startup] = useState({
        name: "EcoTech Solutions",
        progress: 2,
    });
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");

    // Current month calendar state
    const [currentMonth] = useState(new Date());
    const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Sample calendar events
    const events = [
        { date: 15, title: "Investor Meeting", time: "2:00 PM", type: "meeting" },
        { date: 18, title: "Pitch Deadline", time: "5:00 PM", type: "deadline" },
        { date: 22, title: "Document Review", time: "10:00 AM", type: "reminder" },
        { date: 25, title: "Team Sync", time: "3:30 PM", type: "meeting" },
    ];

    // 6 workflow stages including Documents and Pitch Deck
    const stages = [
        {
            id: 1,
            name: "Idea Check",
            icon: Lightbulb,
            completed: true,
            path: `/founder/startup/${params.id}/idea-check`,
        },
        {
            id: 2,
            name: "Documents",
            icon: FileText,
            completed: true,
            path: `/founder/startup/${params.id}/documents`,
        },
        {
            id: 3,
            name: "Market Research",
            icon: BarChart3,
            completed: false,
            path: `/founder/startup/${params.id}/market-research`,
        },
        {
            id: 4,
            name: "Evaluate",
            icon: Target,
            completed: false,
            path: `/founder/startup/${params.id}/evaluate`,
        },
        {
            id: 5,
            name: "Recommendations",
            icon: RefreshCw,
            completed: false,
            path: `/founder/startup/${params.id}/recommendations`,
        },
        {
            id: 6,
            name: "Pitch Deck",
            icon: Presentation,
            completed: false,
            path: `/founder/startup/${params.id}/pitch-deck`,
        },
    ];

    // Generate calendar days
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        // Add actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    };

    const calendarDays = generateCalendarDays();
    const today = new Date().getDate();

    const handleSendInvite = () => {
        // Handle invite logic here
        console.log("Inviting:", inviteEmail);
        setInviteEmail("");
        setInviteDialogOpen(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
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
                            <p className="text-sm text-muted-foreground">{startup.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/founder/schedule">
                            <Button variant="outline" size="icon" className="relative">
                                <CalendarIcon className="h-5 w-5" />
                            </Button>
                        </Link>
                        <Button variant="outline" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        </Button>
                        <Link href="/profile">
                            <Button variant="outline" size="icon">
                                <User className="h-5 w-5" />
                            </Button>
                        </Link>
                        <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Invite Team
                        </Button>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Left Column - Progress Visualization (narrower) */}
                    <div className="lg:col-span-1">
                        <Card className="p-6 sticky top-8">
                            <h3 className="text-lg font-bold text-[#576238] mb-4 text-center">
                                Your Progress
                            </h3>
                            <LegoProgress
                                totalStages={6}
                                completedStages={startup.progress}
                                className="mb-6"
                            />
                            <div className="space-y-2 text-sm">
                                <p className="text-center text-muted-foreground text-xs">
                                    Keep building to unlock investor visibility!
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column - Workflow Stages */}
                    <div className="lg:col-span-4 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-[#576238] mb-6">
                                Workflow Stages
                            </h2>

                            {/* Horizontal Stage Layout - 6 stages in a row */}
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
                                                className={`p-4 text-center cursor-pointer transition-all h-full flex flex-col justify-between ${stage.completed
                                                        ? "bg-[#F0EADC] hover:bg-[#e8e2d4] border-[#d4cbb8]"
                                                        : "bg-white hover:border-[#d4cbb8]"
                                                    } border-2 rounded-2xl`}
                                                onClick={() => router.push(stage.path)}
                                            >
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stage.completed ? "bg-[#576238]" : "bg-gray-200"
                                                        }`}>
                                                        <IconComponent className={`w-6 h-6 ${stage.completed ? "text-white" : "text-gray-400"
                                                            }`} />
                                                    </div>
                                                    <h3 className={`font-semibold text-xs leading-tight ${stage.completed ? "text-[#576238]" : "text-gray-600"
                                                        }`}>{stage.name}</h3>
                                                </div>
                                                <div className="mt-4">
                                                    {stage.completed ? (
                                                        <div className="w-6 h-6 mx-auto rounded-full bg-[#576238] flex items-center justify-center">
                                                            <Check className="w-4 h-4 text-white" />
                                                        </div>
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

                        {/* Resources & Content - Folder Style Section */}
                        <div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-4">
                                Resources & Content
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Link href={`/founder/startup/${params.id}/documents-page`}>
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
                                                    Manage all startup documents
                                                </p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs bg-[#576238] text-white px-2 py-1 rounded-full">
                                                        12 files
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>

                                <Link href={`/founder/startup/${params.id}/pitches-page`}>
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
                                                    View all pitch videos & slides
                                                </p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs bg-[#576238] text-white px-2 py-1 rounded-full">
                                                        6 videos
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
                            <h3 className="text-2xl font-bold text-[#576238] mb-4">
                                Startup Calendar
                            </h3>
                            <Card className="p-6 bg-white border-2">
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-lg font-bold text-[#576238]">
                                        {monthName}
                                    </h4>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon">
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon">
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-2">
                                    {/* Day headers */}
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                        <div
                                            key={day}
                                            className="text-center text-xs font-semibold text-muted-foreground py-2"
                                        >
                                            {day}
                                        </div>
                                    ))}

                                    {/* Calendar days */}
                                    {calendarDays.map((day, index) => {
                                        const hasEvent = day && events.some((e) => e.date === day);
                                        const isToday = day === today;

                                        return (
                                            <div
                                                key={index}
                                                className={`aspect-square flex items-center justify-center text-sm rounded-lg cursor-pointer transition-all relative ${!day
                                                        ? "bg-transparent"
                                                        : isToday
                                                            ? "bg-[#576238] text-white font-bold"
                                                            : hasEvent
                                                                ? "bg-[#FFD95D]/30 hover:bg-[#FFD95D]/50 font-semibold"
                                                                : "hover:bg-[#F0EADC]"
                                                    }`}
                                            >
                                                {day}
                                                {hasEvent && (
                                                    <div className="absolute bottom-1 w-1 h-1 bg-[#576238] rounded-full" />
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
                                        {events.slice(0, 3).map((event, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-[#F0EADC]/50 hover:bg-[#F0EADC] transition-colors cursor-pointer"
                                            >
                                                <div className="text-center min-w-[40px]">
                                                    <div className="text-lg font-bold text-[#576238]">
                                                        {event.date}
                                                    </div>
                                                </div>
                                                <div className="flex-grow">
                                                    <div className="font-semibold text-sm text-[#576238]">
                                                        {event.title}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {event.time}
                                                    </div>
                                                </div>
                                                <span
                                                    className={`text-xs px-2 py-1 rounded-full ${event.type === "meeting"
                                                            ? "bg-[#576238] text-white"
                                                            : event.type === "deadline"
                                                                ? "bg-red-500 text-white"
                                                                : "bg-[#FFD95D] text-[#576238]"
                                                        }`}
                                                >
                                                    {event.type}
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

            {/* Invite Team Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-[#576238]">Invite Team Member</DialogTitle>
                        <DialogDescription>
                            Send an invitation to collaborate on {startup.name}. They'll receive an email with access instructions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-[#576238]">
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="colleague@example.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="border-[#576238]/30 focus:border-[#576238]"
                            />
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Team members will have access to:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>View all workflow stages and progress</li>
                                <li>Access documents and pitch materials</li>
                                <li>Collaborate on startup development</li>
                                <li>View calendar and scheduled meetings</li>
                            </ul>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setInviteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendInvite}
                            disabled={!inviteEmail}
                            className="bg-[#576238] hover:bg-[#6b7c3f] text-white"
                        >
                            <Share2 className="mr-2 h-4 w-4" />
                            Send Invite
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}