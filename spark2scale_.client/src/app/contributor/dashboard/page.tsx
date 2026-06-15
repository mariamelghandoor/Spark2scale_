"use client";

// ... (no changes here yet, just verifying)

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, User, FolderOpen, Video } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";
import { useAuth } from "@/context/AuthContext";

interface StartupApiResponse {
    sid: string;
    startupname: string;
    field: string;
    region?: string;
    location?: string;
    invited_by_name?: string;
    current_role?: string;
    [key: string]: unknown;
}

interface Startup {
    id: string;
    name: string;
    field: string;
    region: string;
    invitedBy: string;
    role: string;
}

// Unused interfaces removed

interface Invitation {
    invitationId: string;
    startupName: string;
    role: string;
    expiresAt: string;
    token?: string;
    Token?: string;
    [key: string]: unknown;
}

export default function ContributorDashboard() {
    const { user, loading } = useAuth();
    const [startups, setStartups] = useState<Startup[]>([]);
    const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleAcceptInvite = async (invite: Invitation) => {
        try {
            await import('@/services/invitationService').then(m => m.invitationService.respond({
                token: invite.token || invite.invitationId || invite.Token || "", // Handle casing
                accept: true,
                userId: user?.id || ''
            }));
            // Refresh
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error("Failed to accept invite", error);
        }
    };

    useEffect(() => {
        if (loading || !user?.id) return;

        const fetchStartups = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
                let cleanApiUrl = apiUrl.replace(/\/$/, '');
                cleanApiUrl = cleanApiUrl.replace(/\/api$/, '');

                // Fetch startups where user is a contributor
                const response = await fetch(`${cleanApiUrl}/api/Startups?contributorId=${user.id}`);
                if (response.ok) {
                    const data: StartupApiResponse[] = await response.json();

                    // Map the response to the format expected by the UI
                    const mapped = data.map((s) => ({
                        id: s.sid,
                        name: s.startupname,
                        region: s.region || "Global",
                        field: s.field,
                        invitedBy: s.invited_by_name || "Unknown",
                        role: s.current_role || "Contributor",
                    }));

                    setStartups(mapped);
                }

                // Fetch Pending Invitations
                import('@/services/invitationService').then(async m => {
                    try {
                        const invites = await m.invitationService.getMyPending();
                        setPendingInvites(invites as any);
                    } catch (e) {
                        console.error("Failed to fetch pending invites", e);
                    }
                });

            } catch (error) {
                console.error("Failed to fetch contributor startups:", error);
            }
        };

        fetchStartups();

        // --- SAFETY NET: Check for pending invitations in localStorage ---
        const checkPendingAndRedirect = async () => {
            const pendingInviteStr = localStorage.getItem('pendingInvitation') || localStorage.getItem('postVerificationInvitation');

            if (pendingInviteStr && user?.id) {
                try {
                    const invite = JSON.parse(pendingInviteStr);
                    console.log('Found pending invitation in storage on Dashboard:', invite);

                    if (invite.token) {
                        const m = await import('@/services/invitationService');
                        await m.invitationService.respond({
                            token: invite.token,
                            accept: true,
                            userId: user.id
                        });

                        console.log('Safety net: Invitation accepted. Redirecting...');

                        // Clear storage
                        localStorage.removeItem('pendingInvitation');
                        localStorage.removeItem('postVerificationInvitation');

                        // Refresh or Redirect
                        // If we have a startupId, redirect there
                        if (invite.startupId) {
                            window.location.href = `/contributor/startup/${invite.startupId}`;
                        } else {
                            setRefreshTrigger(prev => prev + 1);
                        }
                    }
                } catch (e: any) {
                    console.error('Safety net failed:', e);
                    // Check if error is "Invitation is already Accepted"
                    if (e?.response?.data?.message?.includes("already Accepted") || e?.message?.includes("already Accepted")) {
                        console.log('Invitation already accepted. Clearing storage and redirecting...');

                        // Try to get startupId from the stored invite string
                        let startupId = null;
                        try {
                            const storedInvite = JSON.parse(pendingInviteStr || '{}');
                            startupId = storedInvite.startupId;
                        } catch (parseError) {
                            console.error("Could not parse stored invite for redirection", parseError);
                        }

                        localStorage.removeItem('pendingInvitation');
                        localStorage.removeItem('postVerificationInvitation');

                        // Redirect if startupId is known
                        if (startupId) {
                            window.location.href = `/contributor/startup/${startupId}`;
                        } else {
                            setRefreshTrigger(prev => prev + 1);
                        }
                    }
                }
            }
        };

        checkPendingAndRedirect();
        // -----------------------------------------------------------------
    }, [user, loading, refreshTrigger]);

    // Derived User Name
    const userName = user?.fname || "Contributor";

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-[#F0EADC] flex flex-col">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white sticky top-0 z-50">
                <div className="flex w-full items-center justify-between px-6 md:px-12 py-3">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold text-[#576238] leading-tight">Welcome, {userName}</h1>
                            <p className="text-xs text-muted-foreground">Manage your contributed projects</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/contributor/schedule"><Button variant="ghost" size="icon" className="text-[#576238] hover:bg-[#576238]/10"><Calendar className="h-5 w-5" /></Button></Link>
                        <NotificationsDropdown />
                        <Link href="/profile"><Button variant="ghost" size="icon" className="text-[#576238] hover:bg-[#576238]/10"><User className="h-5 w-5" /></Button></Link>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                {/* Pending Invitations Section */}
                {pendingInvites.length > 0 && (
                    <div className="mb-12">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-3xl font-bold text-[#576238]">
                                    Pending Invitations
                                </h2>
                                <p className="text-muted-foreground mt-1">
                                    Startups waiting for your response
                                </p>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingInvites.map((invite) => (
                                <Card key={invite.invitationId} className="hover:shadow-xl transition-all border-l-4 border-l-orange-400">
                                    <CardHeader>
                                        <CardTitle className="text-[#576238]">
                                            {invite.startupName}
                                        </CardTitle>
                                        <CardDescription>
                                            Role: {invite.role}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="text-sm text-muted-foreground">
                                                Invited: {new Date(invite.expiresAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="flex-1 bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                                    onClick={() => handleAcceptInvite(invite)}
                                                >
                                                    Accept
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    Decline
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

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

                    {!loading && startups.length === 0 && pendingInvites.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <p className="text-muted-foreground">You haven't been added to any startups and have no pending invitations.</p>
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

