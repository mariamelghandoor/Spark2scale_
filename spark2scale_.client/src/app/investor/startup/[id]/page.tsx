"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Download, FileText, Lock, Clock, Loader2, Ban } from "lucide-react"; // Added Ban icon
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";

interface Startup {
    sid: string;
    startupname: string;
    field: string;
    idea_description: string;
    region?: string;
    startup_stage?: string;
    created_at?: string;
}

interface PitchDeck {
    pitchdeckid: string;
    pitchname: string;
    video_url: string;
    is_current: boolean;
    created_at: string;
}

interface StartupDocument {
    did: string;
    document_name: string;
    type: string;
    current_path: string | null;
    updated_at: string;
    canaccess: number;
    access_status: "public" | "locked" | "pending" | "granted";
}

interface RouteParams {
    id: string;
}

export default function InvestorStartupProfile() {
    const rawParams = useParams();
    const params = rawParams as unknown as RouteParams;
    const id = params?.id;

    // TODO: Replace with real logged-in investor ID
    const investorId = "7da8b0c8-9adc-446b-b7f0-218f84a81f1b";

    const [startup, setStartup] = useState<Startup | null>(null);
    const [pitchDecks, setPitchDecks] = useState<PitchDeck[]>([]);
    const [documents, setDocuments] = useState<StartupDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requestLoading, setRequestLoading] = useState(false);

    useEffect(() => {
        if (!id) {
            setError("Invalid Startup ID.");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const startupRes = await apiClient.get<Startup>(`/api/startups/${id}`);
                setStartup(startupRes.data);

                try {
                    const pitchesRes = await apiClient.get<PitchDeck[]>(`/api/pitchdecks/${id}?onlyPublic=true`);
                    setPitchDecks(pitchesRes.data);
                } catch (err: unknown) {
                    console.warn("Failed to load pitches", err);
                }

                try {
                    const docsRes = await apiClient.get<StartupDocument[]>(`/api/documents?startupId=${id}&investorId=${investorId}`);
                    setDocuments(docsRes.data);
                } catch (err: unknown) {
                    console.warn("Failed to load documents", err);
                }

            } catch (err: unknown) {
                console.error("Critical error fetching startup data:", err);
                setError("Failed to load startup profile. Please check your connection.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, investorId]);

    const handleRequestAccess = async () => {
        if (!startup) return;
        setRequestLoading(true);
        try {
            await apiClient.post("/api/investordocumentaccess/request", {
                investorId: investorId,
                startupId: startup.sid
            });

            toast.success("Access requested! The founder has been notified.");

            // Refresh documents
            const docsRes = await apiClient.get<StartupDocument[]>(`/api/documents?startupId=${id}&investorId=${investorId}`);
            setDocuments(docsRes.data);
        } catch (err) {
            console.error("Request failed", err);
            toast.error("Failed to request access.");
        } finally {
            setRequestLoading(false);
        }
    };

    // --- BUTTON STATE LOGIC ---
    const hasDocuments = documents.length > 0;
    const hasLockedDocs = documents.some(d => d.access_status === "locked");
    const hasPendingDocs = documents.some(d => d.access_status === "pending");

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (error || !startup) return <div className="p-20 text-center text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-20">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/investor/feed">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5 text-[#576238]" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-[#576238]">Startup Profile</h1>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="overflow-hidden border-2 mb-6 shadow-md bg-white">
                            <CardContent className="p-8">
                                <div className="mb-6">
                                    <h1 className="text-4xl font-bold mb-2 text-[#576238]">{startup.startupname}</h1>
                                    <p className="text-lg text-gray-600 line-clamp-2">{startup.idea_description}</p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                    <div className="text-center p-4 bg-gray-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1">REGION</p>
                                        <p className="font-semibold text-[#576238]">{startup.region || "Not specified"}</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1">FIELD</p>
                                        <p className="font-semibold text-[#576238]">{startup.field || "Not specified"}</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1">STAGE</p>
                                        <p className="font-semibold text-[#576238]">{startup.startup_stage || "Not specified"}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    {/* --- UPDATED DYNAMIC BUTTON LOGIC --- */}

                                    {/* Case 0: No Documents Available at all */}
                                    {!hasDocuments ? (
                                        <Button disabled className="flex-1 bg-gray-100 text-gray-400 border-gray-200">
                                            <Ban className="mr-2 h-4 w-4" />
                                            No Documents Available
                                        </Button>
                                    )
                                        /* Case 1: Locked Docs Exist -> Show Request Button */
                                        : hasLockedDocs ? (
                                            <Button
                                                onClick={handleRequestAccess}
                                                disabled={requestLoading}
                                                className="flex-1 bg-[#576238] hover:bg-[#6b7c3f] transition-all"
                                            >
                                                {requestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                                                Request Full Access
                                            </Button>
                                        )
                                            /* Case 2: Request Sent -> Show Pending */
                                            : hasPendingDocs ? (
                                                <Button disabled className="flex-1 bg-gray-200 text-gray-600 cursor-not-allowed">
                                                    <Clock className="mr-2 h-4 w-4" />
                                                    Full Access request is pending
                                                </Button>
                                            )
                                                /* Case 3: All Public or Granted -> Show Access Granted */
                                                : (
                                                    <Button variant="outline" className="flex-1 border-green-600 text-green-600 cursor-default bg-green-50">
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Full Access Granted
                                                    </Button>
                                                )}

                                    <Button variant="outline" className="flex-1 border-[#576238] text-[#576238] hover:bg-[#576238]/10">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Schedule Meeting
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* TABS SECTION */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Tabs defaultValue="documents" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-white border h-auto p-1">
                                <TabsTrigger value="videos" className="py-2 data-[state=active]:bg-[#576238] data-[state=active]:text-white">Pitches</TabsTrigger>
                                <TabsTrigger value="about" className="py-2 data-[state=active]:bg-[#576238] data-[state=active]:text-white">About</TabsTrigger>
                                <TabsTrigger value="documents" className="py-2 data-[state=active]:bg-[#576238] data-[state=active]:text-white">Documents</TabsTrigger>
                            </TabsList>
                            <TabsContent value="videos" className="mt-6">
                                {pitchDecks.length === 0 ? <p className="text-center text-gray-500 py-10">No pitches found.</p> : (
                                    <div className="grid md:grid-cols-2 gap-6">{pitchDecks.map(p => (
                                        <Card key={p.pitchdeckid} className="p-4"><h3 className="font-bold">{p.pitchname}</h3></Card>
                                    ))}</div>
                                )}
                            </TabsContent>
                            <TabsContent value="about" className="mt-6">
                                <Card className="p-6"><p>{startup.idea_description}</p></Card>
                            </TabsContent>
                            <TabsContent value="documents" className="mt-6">
                                <Card className="border-2 shadow-sm bg-white">
                                    <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
                                    <CardContent>
                                        {documents.length === 0 ? <p className="text-center text-gray-400 py-4">No documents available.</p> : documents.map(doc => (
                                            <div key={doc.did} className="flex justify-between p-4 border rounded mb-2 items-center">
                                                <div className="flex items-center gap-3">
                                                    {doc.access_status === 'locked' ? <Lock className="text-gray-400" /> : <FileText className="text-[#576238]" />}
                                                    <div>
                                                        <p className="font-bold">{doc.document_name}</p>
                                                        <p className="text-xs text-gray-500 uppercase">{doc.access_status}</p>
                                                    </div>
                                                </div>
                                                {doc.current_path ? (
                                                    <a href={doc.current_path} target="_blank"><Button size="sm" variant="outline">View</Button></a>
                                                ) : (
                                                    <Button size="sm" variant="ghost" disabled><Lock className="h-4 w-4 mr-1" /> Locked</Button>
                                                )}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}