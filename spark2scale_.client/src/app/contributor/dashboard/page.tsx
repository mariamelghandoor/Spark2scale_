"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User, FolderOpen, Video } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";

export default function ContributorDashboard() {
    const [userName] = useState("Sarah");
    const [startups] = useState([
        {
            id: 1,
            name: "EcoTech Solutions",
            region: "North America",
            field: "Green Technology",
            invitedBy: "Alex Chen",
            role: "Contributor",
        },
        {
            id: 2,
            name: "HealthAI Platform",
            region: "Europe",

            field: "Healthcare Tech",
            invitedBy: "Maria Santos",
            role: "Contributor",
        },
    ]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-[#576238]">
                            Hello {userName} 👋
                        </h1>
                        <p className="text-sm text-muted-foreground">Contributor Dashboard</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/contributor/schedule">
                            <Button variant="ghost" size="icon">
                                <Calendar className="h-5 w-5" />
                            </Button>
                        </Link>
                        <NotificationsDropdown />
                        <Link href="/profile">
                            <Button variant="ghost" size="icon">
                                <User className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                {/* Startup Projects Section */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-[#576238]">
                            My Startups
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Startups you've been invited to contribute to
                        </p>
                    </div>
                </div>

                {/* Startup Cards Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {startups.map((startup, index) => (
                        <motion.div
                            key={startup.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link href={`/contributor/startup/${startup.id}`}>
                                <Card className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-[#FFD95D]">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-[#576238]">
                                                    {startup.name}
                                                </CardTitle>
                                                <CardDescription>
                                                    {startup.field} • {startup.region}
                                                </CardDescription>
                                            </div>
                                            <span className="text-xs px-2 py-1 rounded-full bg-[#FFD95D] text-[#576238] font-semibold">
                                                {startup.role}
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="text-sm text-muted-foreground">
                                                Invited by: <span className="font-semibold text-[#576238]">{startup.invitedBy}</span>
                                            </div>

                                            {/* Quick Access to Resources */}
                                            <div className="space-y-2 pt-2 border-t">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">
                                                    Quick Access
                                                </p>
                                                <div className="flex gap-2">
                                                    <div className="flex items-center gap-1 text-xs bg-[#F0EADC] px-2 py-1 rounded">
                                                        <FolderOpen className="h-3 w-3" />
                                                        Documents
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs bg-[#F0EADC] px-2 py-1 rounded">
                                                        <Video className="h-3 w-3" />
                                                        Pitches
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs bg-[#F0EADC] px-2 py-1 rounded">
                                                        <Calendar className="h-3 w-3" />
                                                        Calendar
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                size="sm"
                                                className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                            >
                                                View Resources →
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Info Section */}
                <div className="mt-12">
                    <Card className="border-2 border-[#FFD95D] bg-[#FFD95D]/10">
                        <CardHeader>
                            <CardTitle className="text-[#576238]">Your Contributor Access</CardTitle>
                            <CardDescription>
                                As a contributor, you have access to the following resources
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="bg-[#576238] p-2 rounded-lg">
                                        <FolderOpen className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-[#576238]">Documents</h4>
                                        <p className="text-sm text-muted-foreground">
                                            View and download all startup documents
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="bg-[#576238] p-2 rounded-lg">
                                        <Video className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-[#576238]">Pitches</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Access pitch decks and videos
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="bg-[#576238] p-2 rounded-lg">
                                        <Calendar className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-[#576238]">Schedule</h4>
                                        <p className="text-sm text-muted-foreground">
                                            View meetings and upcoming events
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}