"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Calendar, Download, FileText, Heart, Play, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import apiClient from "@/lib/apiClient";

// --- Interfaces ---
interface Startup {
    sid: string;
    startupname: string;
    field: string;
    idea_description: string;
    region?: string;
    stage?: string;
    funding?: string;
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
    current_path: string;
    updated_at: string;
}

// Define the expected route parameters
interface RouteParams {
    id: string;
}

export default function InvestorStartupProfile() {
    // 1. Safe useParams handling
    // We cast to unknown first to avoid "incompatible type" errors, then to our interface
    const rawParams = useParams();
    const params = rawParams as unknown as RouteParams;
    const id = params?.id;

    const [startup, setStartup] = useState<Startup | null>(null);
    const [pitchDecks, setPitchDecks] = useState<PitchDeck[]>([]);
    const [documents, setDocuments] = useState<StartupDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [liked, setLiked] = useState(false);

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

                // 2. API Call: Fetch Startup
                const startupRes = await apiClient.get<Startup>(`/api/startups/${id}`);
                setStartup({
                    ...startupRes.data,
                    region: "North America",
                    stage: "Seed",
                    funding: "TBD"
                });

                // 3. API Call: Fetch Pitches (Nested try-catch for partial failure)
                try {
                    const pitchesRes = await apiClient.get<PitchDeck[]>(`/api/pitchdecks/${id}`);
                    setPitchDecks(pitchesRes.data);
                } catch (err: unknown) {
                    console.warn("Failed to load pitches", err);
                }

                // 4. API Call: Fetch Documents
                try {
                    const docsRes = await apiClient.get<StartupDocument[]>(`/api/documents?startupId=${id}`);
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
    }, [id]);

    // --- Loading State ---
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-[#576238]" />
                    <p className="text-[#576238] font-medium">Loading Startup Profile...</p>
                </div>
            </div>
        );
    }

    // --- Error/Empty State ---
    if (error || !startup) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 p-4">
                <Card className="max-w-md w-full border-red-200">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-red-600">Unable to Load Profile</CardTitle>
                        <CardDescription>{error || "Startup not found."}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Link href="/investor/feed">
                            <Button variant="outline">Return to Feed</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const placeholderImage = "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&h=600&fit=crop";

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
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
                            <div className="relative h-64">
                                <img
                                    src={placeholderImage}
                                    alt={startup.startupname}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-6 left-6 text-white max-w-2xl">
                                    <h1 className="text-4xl font-bold mb-2">{startup.startupname}</h1>
                                    <p className="text-lg text-white/90 line-clamp-2">{startup.idea_description}</p>
                                </div>
                            </div>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="text-center p-4 bg-gray-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Region</p>
                                        <p className="font-semibold text-[#576238]">{startup.region}</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Field</p>
                                        <p className="font-semibold text-[#576238]">{startup.field}</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Stage</p>
                                        <p className="font-semibold text-[#576238]">{startup.stage}</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg border">
                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Seeking</p>
                                        <p className="font-semibold text-[#576238]">{startup.funding}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => setLiked(!liked)}
                                        className={`flex-1 transition-all ${liked ? "bg-red-500 hover:bg-red-600" : "bg-[#576238] hover:bg-[#6b7c3f]"}`}
                                    >
                                        <Heart className={`mr-2 h-4 w-4 ${liked ? "fill-white" : ""}`} />
                                        {liked ? "Liked" : "Like Startup"}
                                    </Button>
                                    <Button variant="outline" className="flex-1 border-[#576238] text-[#576238] hover:bg-[#576238]/10">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Schedule Meeting
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Tabs defaultValue="videos" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-white border h-auto p-1">
                                <TabsTrigger value="videos" className="py-2 data-[state=active]:bg-[#576238] data-[state=active]:text-white">
                                    Pitches ({pitchDecks.length})
                                </TabsTrigger>
                                <TabsTrigger value="about" className="py-2 data-[state=active]:bg-[#576238] data-[state=active]:text-white">
                                    About
                                </TabsTrigger>
                                <TabsTrigger value="documents" className="py-2 data-[state=active]:bg-[#576238] data-[state=active]:text-white">
                                    Documents ({documents.length})
                                </TabsTrigger>
                            </TabsList>

                            {/* VIDEOS TAB */}
                            <TabsContent value="videos" className="mt-6">
                                {pitchDecks.length === 0 ? (
                                    <Card className="p-12 text-center text-muted-foreground border-2 border-dashed bg-white/50">
                                        <div className="flex flex-col items-center">
                                            <Play className="h-12 w-12 opacity-20 mb-2" />
                                            <p>No pitch videos uploaded yet.</p>
                                        </div>
                                    </Card>
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {pitchDecks.map((deck) => (
                                            <Card key={deck.pitchdeckid} className="overflow-hidden border-2 hover:border-[#576238] transition-colors group bg-white">
                                                <div className="aspect-video bg-black relative">
                                                    {deck.video_url ? (
                                                        <video
                                                            src={deck.video_url}
                                                            className="w-full h-full object-contain"
                                                            controls
                                                            preload="metadata"
                                                        >
                                                            Your browser does not support the video tag.
                                                        </video>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full text-white bg-neutral-900">
                                                            <Play className="h-12 w-12 opacity-50 mb-2" />
                                                            <span className="text-sm text-gray-400">Processing Video...</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div>
                                                            <h4 className="font-bold text-[#576238] line-clamp-1">
                                                                {deck.pitchname || "Untitled Pitch"}
                                                            </h4>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Uploaded: {new Date(deck.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        {deck.video_url && (
                                                            <a href={deck.video_url} download target="_blank" rel="noopener noreferrer">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#576238]">
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            </a>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            {/* ABOUT TAB */}
                            <TabsContent value="about" className="mt-6">
                                <Card className="border-2 shadow-sm bg-white">
                                    <CardHeader>
                                        <CardTitle className="text-[#576238]">Detailed Overview</CardTitle>
                                        <CardDescription>In-depth information about the startup</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="p-4 bg-gray-50 rounded-lg border">
                                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                                <span className="w-1 h-6 bg-[#FFD95D] rounded-full"></span>
                                                Idea Description
                                            </h4>
                                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                                {startup.idea_description || "No description provided."}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-50 rounded-lg border">
                                                <h4 className="font-semibold text-gray-900 mb-1">Field / Industry</h4>
                                                <p className="text-gray-600">{startup.field || "Unspecified"}</p>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg border">
                                                <h4 className="font-semibold text-gray-900 mb-1">Founded</h4>
                                                <p className="text-gray-600">
                                                    {startup.created_at ? new Date(startup.created_at).toLocaleDateString() : "Unknown"}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* DOCUMENTS TAB */}
                            <TabsContent value="documents" className="mt-6">
                                <Card className="border-2 shadow-sm bg-white">
                                    <CardHeader>
                                        <CardTitle className="text-[#576238]">Startup Documents</CardTitle>
                                        <CardDescription>
                                            Access documents uploaded by the founder.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {documents.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-gray-50">
                                                <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                                <p>No documents available for this startup.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {documents.map((doc) => (
                                                    <div
                                                        key={doc.did}
                                                        className="flex items-center justify-between p-4 border rounded-lg hover:border-[#FFD95D] hover:bg-yellow-50/30 transition-all bg-white"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-lg bg-[#576238]/10 flex items-center justify-center text-[#576238]">
                                                                <FileText className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-800">{doc.document_name}</p>
                                                                <p className="text-xs text-muted-foreground flex gap-2">
                                                                    <span className="uppercase">{doc.type}</span>
                                                                    <span>•</span>
                                                                    <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <a href={doc.current_path} target="_blank" rel="noopener noreferrer">
                                                            <Button variant="outline" size="sm" className="border-[#576238] text-[#576238] hover:bg-[#576238] hover:text-white transition-colors">
                                                                <Download className="h-4 w-4 mr-2" />
                                                                View
                                                            </Button>
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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