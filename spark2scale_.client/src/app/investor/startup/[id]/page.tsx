"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Calendar, Download, FileText, Heart, Play } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Startup {
    sid: string;
    startupname: string;
    field: string;
    idea_description: string;
    region?: string;
    stage?: string;
    funding?: string;
}

interface PitchDeck {
    pitchdeckid: string;
    pitchname: string;
    video_url: string;
    is_current: boolean;
    created_at: string;
}

export default function InvestorStartupProfile() {
    // Standard Next.js Client Component hook for params
    const params = useParams();
    const id = params?.id as string;

    const [startup, setStartup] = useState<Startup | null>(null);
    const [pitchDecks, setPitchDecks] = useState<PitchDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);

    // Placeholder documents
    const documents = [
        { id: 1, name: "Business Model Canvas", type: "PDF" },
        { id: 2, name: "Financial Projections", type: "Excel" },
        { id: 3, name: "Market Analysis Report", type: "PDF" },
    ];

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                setLoading(true);

                // 1. Fetch Startup Info
                const startupRes = await fetch(`/api/startups/${id}`);
                if (startupRes.ok) {
                    const startupData = await startupRes.json();
                    setStartup({
                        ...startupData,
                        region: "North America",
                        stage: "Seed",
                        funding: "TBD"
                    });
                }

                // 2. Fetch Pitch Decks
                const pitchesRes = await fetch(`/api/pitchdecks/${id}`);
                if (pitchesRes.ok) {
                    const pitchesData = await pitchesRes.json();
                    setPitchDecks(pitchesData);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) return <div className="p-12 text-center text-[#576238]">Loading startup profile...</div>;
    if (!startup) return <div className="p-12 text-center">Startup not found.</div>;

    const placeholderImage = "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&h=600&fit=crop";

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/investor/feed">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-[#576238]">Startup Profile</h1>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="overflow-hidden border-2 mb-6">
                            <div className="relative h-64">
                                <img
                                    src={placeholderImage}
                                    alt={startup.startupname}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                <div className="absolute bottom-6 left-6 text-white">
                                    <h1 className="text-4xl font-bold mb-2">{startup.startupname}</h1>
                                    <p className="text-lg text-white/90">{startup.idea_description}</p>
                                </div>
                            </div>
                            <CardContent className="p-6">
                                <div className="grid md:grid-cols-4 gap-4 mb-6">
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Region</p>
                                        <p className="font-semibold text-[#576238]">{startup.region}</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Field</p>
                                        <p className="font-semibold text-[#576238]">{startup.field}</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Stage</p>
                                        <p className="font-semibold text-[#576238]">{startup.stage}</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Seeking</p>
                                        <p className="font-semibold text-[#576238]">{startup.funding}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => setLiked(!liked)}
                                        className={`flex-1 ${liked ? "bg-red-500 hover:bg-red-600" : "bg-[#576238] hover:bg-[#6b7c3f]"}`}
                                    >
                                        {/* Heart Icon used here to fix the unused warning */}
                                        <Heart className={`mr-2 h-4 w-4 ${liked ? "fill-white" : ""}`} />
                                        {liked ? "Liked" : "Like Startup"}
                                    </Button>
                                    <Button variant="outline" className="flex-1">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Schedule Meeting
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Tabs defaultValue="videos" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="videos">Pitches ({pitchDecks.length})</TabsTrigger>
                                <TabsTrigger value="about">About</TabsTrigger>
                                <TabsTrigger value="documents">Documents</TabsTrigger>
                            </TabsList>

                            {/* VIDEOS TAB: Now using <video> tag */}
                            <TabsContent value="videos" className="mt-6">
                                {pitchDecks.length === 0 ? (
                                    <Card className="p-8 text-center text-muted-foreground border-2 border-dashed">
                                        No pitch videos uploaded yet.
                                    </Card>
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {pitchDecks.map((deck) => (
                                            <Card key={deck.pitchdeckid} className="overflow-hidden border-2">
                                                <div className="aspect-video bg-black relative group">
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
                                                        <div className="flex items-center justify-center h-full text-white">
                                                            <Play className="h-12 w-12 opacity-50" />
                                                            <span className="ml-2">Processing...</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-semibold text-[#576238] mb-1">
                                                                {deck.pitchname || "Untitled Pitch"}
                                                            </h4>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(deck.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <Button variant="outline" size="sm">
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="about" className="mt-6">
                                <Card className="border-2">
                                    <CardHeader>
                                        <CardTitle className="text-[#576238]">Details</CardTitle>
                                        <CardDescription>Startup overview information</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-4">
                                            <div>
                                                <h4 className="font-semibold">Idea Description</h4>
                                                <p className="text-sm text-muted-foreground">{startup.idea_description}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">Field</h4>
                                                <p className="text-sm text-muted-foreground">{startup.field}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="documents" className="mt-6">
                                <Card className="border-2">
                                    <CardHeader>
                                        <CardTitle className="text-[#576238]">Documents</CardTitle>
                                        <CardDescription>Access startup documentation</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {documents.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-[#FFD95D] transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-5 w-5 text-[#576238]" />
                                                        <div>
                                                            <p className="font-semibold text-[#576238]">{doc.name}</p>
                                                            <p className="text-xs text-muted-foreground">{doc.type}</p>
                                                        </div>
                                                    </div>
                                                    <Button variant="outline" size="sm">
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Download
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
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