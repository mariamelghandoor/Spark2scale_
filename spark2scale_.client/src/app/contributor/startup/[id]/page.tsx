"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Bell, User, FolderOpen, Video, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ContributorStartupPage() {
    const params = useParams();
    const [userName] = useState("Sarah");
    const [startup] = useState({
        name: "EcoTech Solutions",
        field: "Green Technology",
        region: "North America",
        invitedBy: "Alex Chen",
    });

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

    // Generate calendar days
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    };

    const calendarDays = generateCalendarDays();
    const today = new Date().getDate();

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
                            <p className="text-sm text-muted-foreground">{startup.name} • Contributor</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/contributor/schedule">
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
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Startup Info Banner */}
                    <Card className="p-6 bg-gradient-to-r from-[#576238] to-[#6b7c3f] text-white border-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">{startup.name}</h2>
                                <p className="text-white/80">{startup.field} • {startup.region}</p>
                                <p className="text-sm text-white/70 mt-2">
                                    Invited by: <span className="font-semibold">{startup.invitedBy}</span>
                                </p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                                <p className="text-xs text-white/80">Your Role</p>
                                <p className="text-lg font-bold">Contributor</p>
                            </div>
                        </div>
                    </Card>

                    {/* Resources & Content */}
                    <div>
                        <h3 className="text-2xl font-bold text-[#576238] mb-4">
                            Resources & Content
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <Link href={`/contributor/startup/${params.id}/documents`}>
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
                                                    12 files
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Read-only access
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>

                            <Link href={`/contributor/startup/${params.id}/pitches`}>
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
                                                    6 videos
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Read-only access
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

                    {/* Access Information */}
                    <Card className="p-6 bg-[#F0EADC]/50 border-2 border-[#576238]/20">
                        <h4 className="font-bold text-[#576238] mb-3">📋 Your Access Level</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                                <span className="text-green-600 font-bold">✓</span>
                                <span>View and download all documents and pitches</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-green-600 font-bold">✓</span>
                                <span>Access meeting schedules and upcoming events</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-green-600 font-bold">✓</span>
                                <span>View different document versions</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-red-600 font-bold">✗</span>
                                <span className="text-muted-foreground">Cannot edit or upload documents</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-red-600 font-bold">✗</span>
                                <span className="text-muted-foreground">Cannot view workflow stages or progress</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
