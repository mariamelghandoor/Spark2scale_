"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, X, Heart, Eye, Video, Sparkles, Trophy, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";

// Types matching your C# JSON & Model Structure
interface FeedbackItem {
    Aspect: string;
    Score: number;
    Comment: string;
}

interface ShortAnalysis {
    Score: number;
    Summary: string;
    KeyFeedback: FeedbackItem[];
}

interface DetailedAnalysis {
    Tone: string;
    Pacing: string;
    Sections: FeedbackItem[];
    TranscriptHighlights: string[];
}

interface AnalysisContent {
    Short?: ShortAnalysis;
    Detailed?: DetailedAnalysis;
}

interface PitchDeck {
    pitchdeckid: string;
    startup_id: string;
    video_url: string | null;
    pitchname: string;
    is_current: boolean;
    analysis: AnalysisContent | null;
    tags: string[];
    countlikes: number;
    created_at: string;
    startup?: {
        sid: string;
        startupname: string;
        field: string;
        idea_description: string;
    };
}

export default function InvestorFeed() {
    const [userName] = useState("Sarah");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pitchDecks, setPitchDecks] = useState<PitchDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch pitch decks from your API
    useEffect(() => {
        const fetchPitchDecks = async () => {
            try {
                setLoading(true);
                console.log("🔍 Fetching from: https://localhost:7155/api/pitchdecks/with-startups");

                const response = await fetch("https://localhost:7155/api/pitchdecks/with-startups");

                console.log("📡 Response status:", response.status);

                if (!response.ok) {
                    const contentType = response.headers.get("content-type");
                    let errorData: { message?: string; error?: string } = {};

                    if (contentType && contentType.includes("application/json")) {
                        errorData = await response.json();
                        console.error("❌ JSON Error:", errorData);
                    } else {
                        const text = await response.text();
                        console.error("❌ Text Error:", text);
                        errorData = { message: text || "Unknown error" };
                    }

                    throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
                }

                const data = await response.json();
                console.log("✅ Fetched pitch decks:", data);
                console.log("📊 Data length:", Array.isArray(data) ? data.length : "Not an array");

                const allPitches = Array.isArray(data) ? data : [];

                // Filter to show only current/active pitches
                const activePitches = allPitches.filter((pitch: PitchDeck) => pitch.is_current === true);

                console.log("🎯 Active pitches to display:", activePitches.length);

                setPitchDecks(activePitches);
                setError(null);
            } catch (err) {
                console.error("💥 Error fetching pitch decks:", err);
                const errorMessage = err instanceof Error ? err.message : "Failed to load pitch decks.";
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchPitchDecks();
    }, []);

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    const handleSwipe = async (direction: "left" | "right") => {
        const currentPitch = pitchDecks[currentIndex];

        if (direction === "right") {
            console.log("❤️ Liked:", currentPitch.startup?.startupname);

            try {
                // TODO: Replace with actual investor ID from your auth context
                const investorId = "7da8b0c8-9adc-446b-b7f0-218f84a81f1b"; // Placeholder GUID

                await fetch("https://localhost:7155/api/pitchdecklikes/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        investor_id: investorId,
                        pitchdeck_id: currentPitch.pitchdeckid,
                    }),
                });
            } catch (err) {
                console.error("Error liking pitch:", err);
            }
        } else {
            console.log("👎 Passed:", currentPitch.startup?.startupname);
        }

        if (currentIndex < pitchDecks.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const currentPitch = pitchDecks[currentIndex];

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 border-b-2 border-[#576238] mx-auto mb-4 animate-spin" />
                    <p className="text-[#576238] font-medium">Loading pitch decks...</p>
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 flex items-center justify-center p-4">
                <Card className="p-8 text-center max-w-2xl border-2 border-red-200">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-[#576238] mb-2">Error Loading Pitches</h3>
                    <p className="text-red-600 mb-4 text-sm">{error}</p>
                    <div className="bg-gray-100 p-4 rounded text-left mb-4 text-xs font-mono">
                        <p className="font-bold mb-2">Troubleshooting:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Check if your C# backend is running on https://localhost:7155</li>
                            <li>Verify the endpoint: /api/pitchdecks/with-startups</li>
                            <li>Check browser console (F12) for detailed errors</li>
                            <li>Ensure CORS is properly configured in Program.cs</li>
                        </ol>
                    </div>
                    <Button onClick={() => window.location.reload()} className="bg-[#576238]">
                        Retry
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[#576238]">
                        Hello {userName} 👋
                    </h1>
                    <div className="flex items-center gap-4">
                        <Link href="/investor/schedule">
                            <Button variant="ghost" size="icon">
                                <Calendar className="h-5 w-5" />
                            </Button>
                        </Link>
                        <NotificationsDropdown />
                        <Link href="/profile">
                            <Button variant="ghost" size="icon">
                                <div className="w-8 h-8 rounded-full bg-[#576238] flex items-center justify-center text-white text-sm font-semibold">
                                    {userName[0]}
                                </div>
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-md mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 text-center"
                    >
                        <h2 className="text-3xl font-bold text-[#576238] mb-2">
                            Discover Pitch Videos
                        </h2>
                        <p className="text-muted-foreground">
                            Swipe right to like, left to pass
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                            {pitchDecks.length} pitch{pitchDecks.length !== 1 ? 'es' : ''} available
                        </p>
                    </motion.div>

                    {pitchDecks.length === 0 ? (
                        <Card className="p-12 text-center border-2">
                            <Video className="h-16 w-16 text-[#576238] mx-auto mb-4 opacity-50" />
                            <h3 className="text-2xl font-bold text-[#576238] mb-2">
                                No Pitch Videos Yet
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Check back soon for new startup pitches!
                            </p>
                            <div className="bg-gray-100 p-4 rounded text-left mb-4 text-xs">
                                <p className="font-bold mb-2">Debug Info:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Make sure startups have uploaded pitch videos</li>
                                    <li>Verify videos are marked as "is_current = true"</li>
                                    <li>Check the pitchdecks table in Supabase</li>
                                </ul>
                            </div>
                            <Button onClick={() => window.location.reload()} className="bg-[#576238]">
                                Refresh
                            </Button>
                        </Card>
                    ) : currentIndex < pitchDecks.length && currentPitch ? (
                        <div className="relative h-[650px]">
                            {/* Card Stack Effect */}
                            {pitchDecks.slice(currentIndex, currentIndex + 2).map((pitch, index) => (
                                <motion.div
                                    key={pitch.pitchdeckid}
                                    style={{
                                        x: index === 0 ? x : 0,
                                        rotate: index === 0 ? rotate : 0,
                                        opacity: index === 0 ? opacity : 1,
                                        zIndex: pitchDecks.length - index,
                                        scale: index === 0 ? 1 : 0.95,
                                    }}
                                    drag={index === 0 ? "x" : false}
                                    dragConstraints={{ left: 0, right: 0 }}
                                    onDragEnd={(e, info) => {
                                        if (index === 0) {
                                            if (info.offset.x > 100) handleSwipe("right");
                                            else if (info.offset.x < -100) handleSwipe("left");
                                        }
                                    }}
                                    className="absolute inset-0"
                                >
                                    <Card className="h-full border-2 overflow-hidden shadow-xl flex flex-col bg-white">
                                        {/* Video Player */}
                                        <div className="relative h-64 bg-black overflow-hidden flex-shrink-0">
                                            {pitch.video_url ? (
                                                <video
                                                    src={pitch.video_url}
                                                    controls
                                                    className="w-full h-full object-contain"
                                                    poster={`https://via.placeholder.com/800x600/576238/FFD95D?text=${encodeURIComponent(pitch.startup?.startupname || 'Pitch Video')}`}
                                                >
                                                    Your browser does not support video playback.
                                                </video>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#576238] to-[#6b7c3f]">
                                                    <div className="text-center text-white">
                                                        <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                                        <p>No video available</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full">
                                                <span className="text-white text-sm font-semibold flex items-center gap-2">
                                                    <Video className="h-4 w-4" />
                                                    {pitch.pitchname || "Untitled Pitch"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <CardContent className="p-5 space-y-3 flex-grow overflow-y-auto">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="text-2xl font-bold text-[#576238] mb-1">
                                                            {pitch.pitchname || "Untitled Pitch"}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground">
                                                            by {pitch.startup?.startupname || "Unknown Startup"}
                                                        </p>
                                                    </div>
                                                    {/* AI Score Badge */}
                                                    {pitch.analysis?.Short?.Score && (
                                                        <div className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded-lg flex-shrink-0">
                                                            <Trophy className="h-4 w-4" />
                                                            <span className="font-bold text-sm">{pitch.analysis.Short.Score}/100</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                                    {pitch.startup?.idea_description || "No description available"}
                                                </p>
                                            </div>

                                            {/* Analysis Summary */}
                                            {pitch.analysis?.Short?.Summary && (
                                                <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-[#576238] mb-1">
                                                        <Sparkles className="h-3 w-3" />
                                                        <span>AI Insight</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 line-clamp-3 italic">
                                                        "{pitch.analysis.Short.Summary}"
                                                    </p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Field</p>
                                                    <p className="font-semibold text-[#576238]">
                                                        {pitch.startup?.field || "Not specified"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Likes</p>
                                                    <p className="font-semibold text-[#576238] flex items-center gap-1">
                                                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                                                        {pitch.countlikes}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            {pitch.tags && pitch.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {pitch.tags.map((tag, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-3 py-1 bg-[#FFD95D]/20 text-[#576238] text-xs rounded-full font-medium"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="pt-2 border-t mt-auto">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">
                                                        Posted: {new Date(pitch.created_at).toLocaleDateString()}
                                                    </span>
                                                    <Link href={`/investor/startup/${pitch.startup_id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-[#576238] text-[#576238] hover:bg-[#576238] hover:text-white"
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Profile
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-12 text-center border-2">
                            <div className="text-6xl mb-4">🎉</div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-2">
                                That's All for Now!
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                You've reviewed all available pitches
                            </p>
                            <Button onClick={() => setCurrentIndex(0)} className="bg-[#576238]">
                                Review Again
                            </Button>
                        </Card>
                    )}

                    {/* Action Buttons */}
                    {currentIndex < pitchDecks.length && pitchDecks.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex justify-center gap-6 mt-8"
                        >
                            <Button
                                onClick={() => handleSwipe("left")}
                                size="lg"
                                variant="outline"
                                className="rounded-full w-16 h-16 border-2 border-red-500 text-red-500 hover:bg-red-50"
                            >
                                <X className="h-6 w-6" />
                            </Button>
                            <Button
                                onClick={() => handleSwipe("right")}
                                size="lg"
                                className="rounded-full w-16 h-16 bg-[#576238] hover:bg-[#6b7c3f]"
                            >
                                <Heart className="h-6 w-6" />
                            </Button>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}