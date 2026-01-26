"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User, FolderOpen, Video } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";

export default function ContributorDashboard() {
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

    const [startups, setStartups] = useState<any[]>([]);

    useEffect(() => {
        if (!userData.id) return;

        const fetchStartups = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
                let cleanApiUrl = apiUrl.replace(/\/$/, '');
                cleanApiUrl = cleanApiUrl.replace(/\/api$/, '');

                // Fetch startups where user is a contributor
                const response = await fetch(`${cleanApiUrl}/api/Startups?contributorId=${userData.id}`);
                if (response.ok) {
                    const data = await response.json();

                    // Fetch contributor relationships to get invited_by info
                    const mapped = await Promise.all(data.map(async (s: any) => {
                        let invitedByName = "Unknown";
                        try {
                            // Fetch startup contributors to get invited_by
                            const contributorsRes = await fetch(`${cleanApiUrl}/api/StartupContributor/${s.sid}`);
                            if (contributorsRes.ok) {
                                const contributors = await contributorsRes.json();
                                const contributor = contributors.find((c: any) => c.contributorId === userData.id);
                                if (contributor?.invitedBy) {
                                    // Fetch user name
                                    const userRes = await fetch(`${cleanApiUrl}/api/Users`);
                                    if (userRes.ok) {
                                        const users = await userRes.json();
                                        const inviter = users.find((u: any) => u.uid === contributor.invitedBy);
                                        if (inviter) {
                                            invitedByName = `${inviter.fname || ''} ${inviter.lname || ''}`.trim() || inviter.email || "Unknown";
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.warn("Failed to fetch inviter name", err);
                        }

                        return {
                            id: s.sid,
                            name: s.startupname,
                            region: s.location || "Global",
                            field: s.field,
                            invitedBy: invitedByName,
                            role: "Contributor",
                        };
                    }));

                    setStartups(mapped);
                }
            } catch (error) {
                console.error("Failed to fetch contributor startups:", error);
            }
        };

        fetchStartups();
    }, [userData.id]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-[#576238]">
                            Hello {userData.name}!
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
                                                View Resources
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}

                    {startups.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <p className="text-muted-foreground">You haven't been added to any startups yet.</p>
                        </div>
                    )}
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
