"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, User, FolderOpen, Video, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { meetingService } from "@/services/meetingService";

interface StartupDetails {
    name: string;
    field: string;
    region: string;
    invitedBy: string;
}

interface CalendarEvent {
    date: number;
    fullDate: Date;
    title: string;
    time: string;
    type: string;
}

export default function ContributorStartupPage() {
    const params = useParams();
    // ID Logic
    const rawId = params?.id;
    const startupId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId).toString() : "";

    // User Data - Lazy Initialization to avoid useEffect setState warning
    const [userData] = useState<{ name: string; id: string }>(() => {
        if (typeof window !== 'undefined') {
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    const name = user.fname && user.lname ? `${user.fname} ${user.lname}` : user.email?.split('@')[0] || 'Contributor';
                    return { name, id: user.id || user.uid || '' };
                }
            } catch {
                // ignore
            }
        }
        return { name: 'Contributor', id: '' };
    });

    // Startup & Events State
    const [startup, setStartup] = useState<StartupDetails>({
        name: "Loading...",
        field: "...",
        region: "...",
        invitedBy: "Unknown",
    });
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Fetch Startup Details
    useEffect(() => {
        const fetchStartupDetails = async () => {
            if (!startupId) return;
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
                const cleanUrl = apiUrl.replace(/\/$/, "").replace(/\/api$/, "");

                const res = await fetch(`${cleanUrl}/api/Startups/${startupId}`);
                if (res.ok) {
                    const data = await res.json();
                    // Fetch contributor relationship to get invited_by
                    let invitedByName = "Founder";
                    try {
                        const contributorsRes = await fetch(`${cleanUrl}/api/StartupContributor/${startupId}`);
                        if (contributorsRes.ok) {
                            const contributors = await contributorsRes.json();
                            const contributor = contributors.find((c: any) => c.contributorId === userData.id);
                            if (contributor?.invitedBy) {
                                // Fetch user name
                                const userRes = await fetch(`${cleanUrl}/api/Users`);
                                if (userRes.ok) {
                                    const users = await userRes.json();
                                    const inviter = users.find((u: any) => u.uid === contributor.invitedBy);
                                    if (inviter) {
                                        invitedByName = `${inviter.fname || ''} ${inviter.lname || ''}`.trim() || inviter.email || "Founder";
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.warn("Failed to fetch inviter name", err);
                    }

                    setStartup({
                        name: data.startupname,
                        field: data.field,
                        region: data.location || "Global",
                        invitedBy: invitedByName,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch startup", error);
            }
        };

        fetchStartupDetails();
    }, [startupId]);

    // Fetch Meetings
    useEffect(() => {
        const fetchMeetings = async () => {
            if (!startupId || !userData.id) return;
            try {
                // Fetch contributor meetings
                const userMeetings = await meetingService.getUserMeetings(userData.id);

                const relevantMeetings = userMeetings.filter(m => m.startup_id === startupId || !m.startup_id);

                const mappedEvents: CalendarEvent[] = relevantMeetings.map(m => ({
                    date: new Date(m.meeting_date).getDate(),
                    fullDate: new Date(m.meeting_date),
                    title: m.with_whom_name || "Meeting",
                    time: m.meeting_time,
                    type: "meeting"
                }));

                setEvents(mappedEvents);
            } catch (error) {
                console.error("Failed to fetch meetings", error);
            }
        };

        fetchMeetings();
    }, [startupId, userData.id]);

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
    const isCurrentMonth = new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

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
                                Hello {userData.name} 👋
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
                            <Link href={`/contributor/startup/${startupId}/documents`}>
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
                                                    View Files
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>

                            <Link href={`/contributor/startup/${startupId}/pitches`}>
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
                                                    View Decks
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
                                    <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={handleNextMonth}>
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
                                    // Check only if it's the current month view
                                    const hasEvent = day && events.some((e) => {
                                        const eDate = new Date(e.fullDate);
                                        return eDate.getDate() === day &&
                                            eDate.getMonth() === currentMonth.getMonth() &&
                                            eDate.getFullYear() === currentMonth.getFullYear();
                                    });

                                    const isToday = isCurrentMonth && day === today;

                                    return (
                                        <div
                                            key={index}
                                            className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-all relative ${!day
                                                ? "bg-transparent"
                                                : isToday
                                                    ? "bg-[#576238] text-white font-bold"
                                                    : hasEvent
                                                        ? "bg-[#FFD95D]/30 font-semibold"
                                                        : "bg-gray-50"
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
                                    {events.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No upcoming events.</p>
                                    ) : events.slice(0, 3).map((event, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-[#F0EADC]/50 transition-colors"
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
                                            <span className="text-xs px-2 py-1 rounded-full bg-[#576238] text-white">
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
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
