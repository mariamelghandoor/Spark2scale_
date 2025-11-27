"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, ExternalLink, MapPin, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function ContributorSchedulePage() {
    const [userName] = useState("Sarah");

    // Sample meetings for contributor
    const upcomingMeetings = [
        {
            id: 1,
            title: "Team Sync - EcoTech Solutions",
            startup: "EcoTech Solutions",
            organizer: "Alex Chen",
            date: "2024-02-15",
            time: "2:00 PM",
            duration: "45 min",
            meetingLink: "https://meet.google.com/abc-defg-hij",
            type: "Team Meeting",
            description: "Weekly progress update and planning session",
        },
        {
            id: 2,
            title: "Document Review - HealthAI",
            startup: "HealthAI Platform",
            organizer: "Maria Santos",
            date: "2024-02-18",
            time: "10:00 AM",
            duration: "30 min",
            meetingLink: "https://zoom.us/j/123456789",
            type: "Review",
            description: "Review updated business plan and financial model",
        },
        {
            id: 3,
            title: "Strategy Discussion - EcoTech",
            startup: "EcoTech Solutions",
            organizer: "Alex Chen",
            date: "2024-02-20",
            time: "3:30 PM",
            duration: "1 hour",
            meetingLink: "https://meet.google.com/xyz-uvwx-rst",
            type: "Strategy",
            description: "Discuss Q2 marketing strategy and goals",
        },
    ];

    const pastMeetings = [
        {
            id: 4,
            title: "Onboarding - EcoTech Solutions",
            startup: "EcoTech Solutions",
            organizer: "Alex Chen",
            date: "2024-01-28",
            time: "11:00 AM",
            duration: "1 hour",
            type: "Onboarding",
        },
        {
            id: 5,
            title: "Initial Review - HealthAI",
            startup: "HealthAI Platform",
            organizer: "Maria Santos",
            date: "2024-01-25",
            time: "2:00 PM",
            duration: "45 min",
            type: "Review",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/contributor/dashboard">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-[#576238]">
                                    Schedule - {userName}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Your upcoming meetings and events
                                </p>
                            </div>
                        </div>
                        <Calendar className="h-8 w-8 text-[#576238]" />
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Upcoming Meetings */}
                    <div>
                        <h2 className="text-2xl font-bold text-[#576238] mb-4">
                            Upcoming Meetings
                        </h2>
                        <div className="space-y-4">
                            {upcomingMeetings.map((meeting) => (
                                <Card
                                    key={meeting.id}
                                    className="border-2 hover:border-[#FFD95D] transition-all"
                                >
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-[#576238] mb-2">
                                                    {meeting.title}
                                                </CardTitle>
                                                <CardDescription className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4" />
                                                        <span>Startup: <strong>{meeting.startup}</strong></span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4" />
                                                        <span>Organizer: {meeting.organizer}</span>
                                                    </div>
                                                </CardDescription>
                                            </div>
                                            <Badge className="bg-[#576238]">{meeting.type}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {/* Date and Time */}
                                            <div className="flex items-center gap-6">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="h-4 w-4 text-[#576238]" />
                                                    <span className="font-semibold">
                                                        {new Date(meeting.date).toLocaleDateString("en-US", {
                                                            weekday: "long",
                                                            month: "long",
                                                            day: "numeric",
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="h-4 w-4 text-[#576238]" />
                                                    <span>
                                                        {meeting.time} ({meeting.duration})
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            {meeting.description && (
                                                <p className="text-sm text-muted-foreground">
                                                    {meeting.description}
                                                </p>
                                            )}

                                            {/* Join Button */}
                                            <Button
                                                className="w-full bg-[#576238] hover:bg-[#6b7c3f]"
                                                onClick={() => {
                                                    window.open(meeting.meetingLink, "_blank");
                                                }}
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Join Meeting
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Past Meetings */}
                    <div>
                        <h2 className="text-2xl font-bold text-[#576238] mb-4">
                            Past Meetings
                        </h2>
                        <div className="space-y-3">
                            {pastMeetings.map((meeting) => (
                                <Card
                                    key={meeting.id}
                                    className="border bg-gray-50 opacity-75"
                                >
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-[#576238] mb-1">
                                                    {meeting.title}
                                                </h3>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span>Startup: {meeting.startup}</span>
                                                    <span>•</span>
                                                    <span>
                                                        {new Date(meeting.date).toLocaleDateString()}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{meeting.time}</span>
                                                </div>
                                            </div>
                                            <Badge variant="outline">{meeting.type}</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Info Card */}
                    <Card className="border-2 border-blue-200 bg-blue-50">
                        <CardHeader>
                            <CardTitle className="text-blue-900">📅 Schedule Access</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-blue-700">
                                As a contributor, you can view all scheduled meetings for the startups you're assigned to.
                                You'll be notified of any new meetings or changes to existing ones.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
