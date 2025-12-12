"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, ExternalLink, User, Video } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SchedulePage() {
    const [userName] = useState("Alex");

    // Sample meetings data
    const meetings = [
        {
            id: 1,
            investorName: "Sarah Johnson",
            date: "2025-11-28",
            time: "2:00 PM - 3:00 PM",
            meetingLink: "https://meet.google.com/abc-defg-hij",
            status: "upcoming",
            investorCompany: "Venture Capital Partners",
            notes: "Series A funding discussion"
        },
        {
            id: 2,
            investorName: "Michael Chen",
            date: "2025-11-30",
            time: "10:00 AM - 10:45 AM",
            meetingLink: "https://zoom.us/j/123456789",
            status: "upcoming",
            investorCompany: "Tech Growth Fund",
            notes: "Initial pitch presentation"
        },
        {
            id: 3,
            investorName: "Emily Rodriguez",
            date: "2025-12-02",
            time: "3:30 PM - 4:30 PM",
            meetingLink: "https://meet.google.com/xyz-mnop-qrs",
            status: "upcoming",
            investorCompany: "Green Innovations VC",
            notes: "Follow-up meeting on sustainability metrics"
        },
        {
            id: 4,
            investorName: "David Park",
            date: "2025-12-05",
            time: "11:00 AM - 12:00 PM",
            meetingLink: "https://teams.microsoft.com/meeting123",
            status: "upcoming",
            investorCompany: "Angel Investors Network",
            notes: "Market research review"
        },
        {
            id: 5,
            investorName: "Lisa Thompson",
            date: "2025-11-20",
            time: "1:00 PM - 2:00 PM",
            meetingLink: "https://meet.google.com/past-meet-ing",
            status: "completed",
            investorCompany: "Startup Accelerators Inc",
            notes: "Initial introduction"
        },
    ];

    // Separate upcoming and past meetings
    const upcomingMeetings = meetings.filter(m => m.status === "upcoming");
    const pastMeetings = meetings.filter(m => m.status === "completed");

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
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
                            <p className="text-sm text-muted-foreground">Meeting Schedule</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-[#576238] mb-2">
                            Your Meeting Schedule
                        </h2>
                        <p className="text-muted-foreground">
                            Manage your meetings with potential investors
                        </p>
                    </div>

                    {/* Upcoming Meetings */}
                    <div className="mb-10">
                        <h3 className="text-2xl font-bold text-[#576238] mb-4 flex items-center gap-2">
                            <Calendar className="h-6 w-6" />
                            Upcoming Meetings ({upcomingMeetings.length})
                        </h3>
                        <div className="space-y-4">
                            {upcomingMeetings.map((meeting, index) => (
                                <motion.div
                                    key={meeting.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="p-6 hover:shadow-lg transition-all border-2 hover:border-[#FFD95D] bg-white">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            {/* Meeting Info */}
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="bg-[#576238] p-3 rounded-full">
                                                        <User className="h-5 w-5 text-[#FFD95D]" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-bold text-[#576238]">
                                                            {meeting.investorName}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {meeting.investorCompany}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-3 ml-14">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Calendar className="h-4 w-4 text-[#576238]" />
                                                        <span className="font-medium">{formatDate(meeting.date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Clock className="h-4 w-4 text-[#576238]" />
                                                        <span className="font-medium">{meeting.time}</span>
                                                    </div>
                                                </div>

                                                {meeting.notes && (
                                                    <div className="ml-14 mt-2">
                                                        <p className="text-sm text-muted-foreground italic">
                                                            "{meeting.notes}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Join Meeting Button */}
                                            <div className="flex flex-col gap-2 md:items-end">
                                                <a
                                                    href={meeting.meetingLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block"
                                                >
                                                    <Button className="bg-[#576238] hover:bg-[#6b7c3f] text-white w-full md:w-auto">
                                                        <Video className="mr-2 h-4 w-4" />
                                                        Join Meeting
                                                        <ExternalLink className="ml-2 h-3 w-3" />
                                                    </Button>
                                                </a>
                                                <span className="text-xs text-muted-foreground">
                                                    Click to open meeting link
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Past Meetings */}
                    {pastMeetings.length > 0 && (
                        <div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-4 flex items-center gap-2">
                                <Calendar className="h-6 w-6" />
                                Past Meetings ({pastMeetings.length})
                            </h3>
                            <div className="space-y-4">
                                {pastMeetings.map((meeting, index) => (
                                    <motion.div
                                        key={meeting.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: (upcomingMeetings.length + index) * 0.1 }}
                                    >
                                        <Card className="p-6 bg-gray-50 border-2 opacity-75">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                {/* Meeting Info */}
                                                <div className="flex-grow">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="bg-gray-400 p-3 rounded-full">
                                                            <User className="h-5 w-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xl font-bold text-gray-700">
                                                                {meeting.investorName}
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {meeting.investorCompany}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="grid md:grid-cols-2 gap-3 ml-14">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Calendar className="h-4 w-4 text-gray-600" />
                                                            <span className="font-medium text-gray-600">
                                                                {formatDate(meeting.date)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Clock className="h-4 w-4 text-gray-600" />
                                                            <span className="font-medium text-gray-600">
                                                                {meeting.time}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {meeting.notes && (
                                                        <div className="ml-14 mt-2">
                                                            <p className="text-sm text-gray-500 italic">
                                                                "{meeting.notes}"
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Completed Badge */}
                                                <div className="flex flex-col gap-2 md:items-end">
                                                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                                        ✓ Completed
                                                    </span>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {meetings.length === 0 && (
                        <Card className="p-12 text-center bg-white border-2 border-dashed">
                            <Calendar className="h-16 w-16 text-[#576238] mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-bold text-[#576238] mb-2">
                                No Meetings Scheduled
                            </h3>
                            <p className="text-muted-foreground">
                                Your upcoming meetings with investors will appear here
                            </p>
                        </Card>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
