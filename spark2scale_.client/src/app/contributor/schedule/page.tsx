"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, ExternalLink, MapPin, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { meetingService, MeetingDto } from "@/services/meetingService";
import { motion } from "framer-motion";
import ContributorHeader from "@/components/contributor/ContributorHeader";

export default function ContributorSchedulePage() {
    // Initialize user data from localStorage
    const [userData] = useState<{ name: string; id: string }>(() => {
        if (typeof window === 'undefined') return { name: 'Contributor', id: '' };

        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                const name = user.fname && user.lname
                    ? `${user.fname} ${user.lname}`
                    : user.email?.split('@')[0] || 'Contributor';
                return { name, id: user.id || '' };
            } catch {
                return { name: 'Contributor', id: '' };
            }
        }
        return { name: 'Contributor', id: '' };
    });

    const [meetings, setMeetings] = useState<MeetingDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userData.id) {
            fetchMeetings();
        }
    }, [userData.id]);

    const fetchMeetings = async () => {
        try {
            const data = await meetingService.getUserMeetings(userData.id);
            setMeetings(data);
        } catch (error) {
            console.error("Failed to fetch meetings", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "Invalid Date";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        } catch {
            return "Invalid Date";
        }
    };

    const getMeetingDateTime = (m: MeetingDto) => {
        return new Date(`${m.meeting_date}T${m.meeting_time}`);
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingMeetings = meetings.filter(m => {
        const mDate = new Date(m.meeting_date);
        return mDate >= today && m.status?.toLowerCase() !== 'canceled' && m.status?.toLowerCase() !== 'rejected';
    });

    const pastMeetings = meetings
        .filter(m => {
            const mDate = new Date(m.meeting_date);
            mDate.setHours(0, 0, 0, 0);
            return mDate < today || m.status?.toLowerCase() === 'canceled' || m.status?.toLowerCase() === 'rejected';
        })
        .sort((a, b) => getMeetingDateTime(b).getTime() - getMeetingDateTime(a).getTime());

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Header */}
            <ContributorHeader
                backLink="/contributor/dashboard"
                title={`Schedule - ${userData.name}`}
                subtitle="Your upcoming meetings and events"
            />

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Upcoming Meetings */}
                    <div>
                        <h2 className="text-2xl font-bold text-[#576238] mb-4">
                            Upcoming Meetings
                        </h2>
                        {isLoading ? (
                            <p>Loading...</p>
                        ) : upcomingMeetings.length === 0 ? (
                            <Card className="p-8 text-center text-muted-foreground">No upcoming meetings.</Card>
                        ) : (
                            <div className="space-y-4">
                                {upcomingMeetings.map((meeting) => (
                                    <Card
                                        key={meeting.meeting_id}
                                        className="border-2 hover:border-[#FFD95D] transition-all"
                                    >
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <CardTitle className="text-[#576238] mb-2">
                                                        {meeting.with_whom_name || "Meeting"}
                                                    </CardTitle>
                                                    <CardDescription className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4" />
                                                            <span>With: <strong>{meeting.with_whom_name}</strong></span>
                                                        </div>
                                                    </CardDescription>
                                                </div>
                                                <Badge className="bg-[#576238]">{meeting.status}</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {/* Date and Time */}
                                                <div className="flex items-center gap-6">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Calendar className="h-4 w-4 text-[#576238]" />
                                                        <span className="font-semibold">
                                                            {formatDate(meeting.meeting_date)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Clock className="h-4 w-4 text-[#576238]" />
                                                        <span>
                                                            {meeting.meeting_time}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Join Button */}
                                                {meeting.meeting_link && (
                                                    <Button
                                                        className="w-full bg-[#576238] hover:bg-[#6b7c3f]"
                                                        onClick={() => {
                                                            window.open(meeting.meeting_link!, "_blank");
                                                        }}
                                                    >
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        Join Meeting
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Past Meetings */}
                    {pastMeetings.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold text-[#576238] mb-4">
                                Past Meetings
                            </h2>
                            <div className="space-y-3">
                                {pastMeetings.map((meeting) => (
                                    <Card
                                        key={meeting.meeting_id}
                                        className="border bg-gray-50 opacity-75"
                                    >
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-[#576238] mb-1">
                                                        {meeting.with_whom_name}
                                                    </h3>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <span>
                                                            {formatDate(meeting.meeting_date)}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{meeting.meeting_time}</span>
                                                    </div>
                                                </div>
                                                <Badge variant="outline">{meeting.status}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

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
