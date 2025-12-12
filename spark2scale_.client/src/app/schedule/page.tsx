"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, ExternalLink, Video } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SchedulePage() {
    const meetings = [
        {
            id: 1,
            date: "2024-02-15",
            time: "10:00 AM",
            investor: "Sarah Johnson",
            startup: "EcoTech Solutions",
            link: "https://meet.google.com/abc-defg-hij",
            type: "Pitch Review",
        },
        {
            id: 2,
            date: "2024-02-16",
            time: "2:30 PM",
            investor: "Michael Chen",
            startup: "HealthAI Platform",
            link: "https://zoom.us/j/123456789",
            type: "Follow-up Discussion",
        },
        {
            id: 3,
            date: "2024-02-18",
            time: "11:00 AM",
            investor: "Emily Rodriguez",
            startup: "EcoTech Solutions",
            link: "https://meet.google.com/xyz-abcd-efg",
            type: "Investment Terms",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/founder/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-[#576238]">
                        <Calendar className="inline mr-2 h-6 w-6" />
                        Meeting Schedule
                    </h1>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <h2 className="text-xl font-semibold text-[#576238] mb-2">
                            Upcoming Meetings
                        </h2>
                        <p className="text-muted-foreground">
                            Your scheduled investor meetings and pitch sessions
                        </p>
                    </motion.div>

                    <div className="space-y-4">
                        {meetings.map((meeting, index) => (
                            <motion.div
                                key={meeting.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="border-2 hover:border-[#FFD95D] transition-all">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center justify-between">
                                            <span className="text-[#576238]">{meeting.type}</span>
                                            <span className="text-sm font-normal text-muted-foreground">
                                                {new Date(meeting.date).toLocaleDateString("en-US", {
                                                    weekday: "short",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-semibold text-[#576238]">
                                                        Investor:
                                                    </span>
                                                    <span>{meeting.investor}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-semibold text-[#576238]">
                                                        Startup:
                                                    </span>
                                                    <span>{meeting.startup}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-semibold text-[#576238]">
                                                        Time:
                                                    </span>
                                                    <span>{meeting.time}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end">
                                                <Button
                                                    className="bg-[#576238] hover:bg-[#6b7c3f]"
                                                    asChild
                                                >
                                                    <a
                                                        href={meeting.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Video className="mr-2 h-4 w-4" />
                                                        Join Meeting
                                                        <ExternalLink className="ml-2 h-3 w-3" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {meetings.length === 0 && (
                        <Card className="p-12 text-center">
                            <div className="text-6xl mb-4">📅</div>
                            <h3 className="text-xl font-semibold text-[#576238] mb-2">
                                No Upcoming Meetings
                            </h3>
                            <p className="text-muted-foreground">
                                Your scheduled meetings will appear here
                            </p>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
