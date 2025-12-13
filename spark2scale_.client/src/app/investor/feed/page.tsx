"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, X, Heart, Eye, Video, Sparkles, Trophy, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";
import apiClient from "@/lib/apiClient";
import LegoLoader from "@/components/lego/LegoLoader";

// --- Interfaces ---
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

interface InvestorDto {
    userId: string;
    tags: string[];
}

export default function InvestorFeed() {
    const [userName, setUserName] = useState("Sarah");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pitchDecks, setPitchDecks] = useState<PitchDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [likedPitches, setLikedPitches] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);
    const [investorTags, setInvestorTags] = useState<string[]>([]);

    // 1. HARDCODED ID RESTORED
    const investorId = "7da8b0c8-9adc-446b-b7f0-218f84a81f1b";

    // Calculate tag match count for sorting
    const getTagMatchCount = (pitchTags: string[]) => {
        if (!investorTags.length || !pitchTags.length) return 0;
        return pitchTags.filter(tag =>
            investorTags.some(invTag => invTag.toLowerCase() === tag.toLowerCase())
        ).length;
    };

    useEffect(() => {
        const fetchPitchDecks = async () => {
            try {
                setLoading(true);
                console.log("🔍 Fetching pitch decks...");

                // 2. Fetch investor tags (using hardcoded ID)
                try {
                    const investorResponse = await apiClient.get<InvestorDto[]>('/api/investors');
                    const investors = investorResponse.data;
                    const currentInvestor = investors.find((inv) => inv.userId === investorId);
                    if (currentInvestor?.tags) {
                        setInvestorTags(currentInvestor.tags);
                        console.log("👤 Investor tags:", currentInvestor.tags);
                    }
                } catch (err) {
                    console.warn("Could not fetch investor tags:", err);
                }

                // 3. Fetch pitch decks
                const response = await apiClient.get<PitchDeck[]>('/api/pitchdecks/with-startups');
                const data = response.data;
                console.log("✅ Fetched pitch decks:", data);

                const allPitches = Array.isArray(data) ? data : [];
                const activePitches = allPitches.filter((pitch: PitchDeck) => pitch.is_current === true);

                // 4. Sort by tag matches
                const sortedPitches = activePitches.sort((a, b) => {
                    const aMatches = getTagMatchCount(a.tags || []);
                    const bMatches = getTagMatchCount(b.tags || []);

                    if (aMatches !== bMatches) return bMatches - aMatches;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });

                setPitchDecks(sortedPitches);
                setError(null);

                // 5. Check Likes (using hardcoded ID)
                await checkLikedPitches(sortedPitches);

            } catch (err) {
                console.error("💥 Error loading feed:", err);
                setError("Failed to load pitch decks.");
            } finally {
                setLoading(false);
            }
        };

        fetchPitchDecks();
    }, []);

    const checkLikedPitches = async (pitches: PitchDeck[]) => {
        try {
            const likeChecks = await Promise.all(
                pitches.map(async (pitch) => {
                    try {
                        const response = await apiClient.get<{ isLiked: boolean }>(
                            `/api/pitchdecklikes/check/${investorId}/${pitch.pitchdeckid}`
                        );
                        return { pitchId: pitch.pitchdeckid, isLiked: response.data.isLiked };
                    } catch {
                        return { pitchId: pitch.pitchdeckid, isLiked: false };
                    }
                })
            );

            const liked = new Set(
                likeChecks.filter(check => check.isLiked).map(check => check.pitchId)
            );
            setLikedPitches(liked);
        } catch (err) {
            console.error("Error checking liked pitches:", err);
        }
    };

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    const handleLike = async (pitchId: string) => {
        if (actionLoading) return;

        console.log("🚀 Starting like action for:", pitchId);
        setActionLoading(true);

        try {
            const response = await apiClient.post('/api/pitchdecklikes/add', {
                investor_id: investorId, // Use Hardcoded ID
                pitchdeck_id: pitchId,
            });

            const data = response.data;
            console.log("❤️ Like action response:", data);

            setLikedPitches(prev => new Set([...prev, pitchId]));

            setPitchDecks(prev => prev.map(pitch =>
                pitch.pitchdeckid === pitchId
                    ? { ...pitch, countlikes: data.newLikeCount }
                    : pitch
            ));
        } catch (err) {
            console.error("Error liking pitch:", err);
        } finally {
            console.log("✅ Like action completed");
            setActionLoading(false);
        }
    };

    const handleDislike = async (pitchId: string) => {
        if (actionLoading) return;

        setActionLoading(true);
        try {
            if (likedPitches.has(pitchId)) {
                const response = await apiClient.delete('/api/pitchdecklikes/remove', {
                    data: {
                        investor_id: investorId, // Use Hardcoded ID
                        pitchdeck_id: pitchId,
                    }
                });

                const data = response.data;
                console.log("💔 Like removed:", data);

                setLikedPitches(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(pitchId);
                    return newSet;
                });

                setPitchDecks(prev => prev.map(pitch =>
                    pitch.pitchdeckid === pitchId
                        ? { ...pitch, countlikes: data.newLikeCount || Math.max(0, pitch.countlikes - 1) }
                        : pitch
                ));
            }
            console.log("👎 Passed on pitch");
        } catch (err) {
            console.error("Error handling dislike:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSwipe = async (direction: "left" | "right") => {
        if (actionLoading || currentIndex >= pitchDecks.length) return;

        const currentPitch = pitchDecks[currentIndex];

        if (direction === "right") {
            await handleLike(currentPitch.pitchdeckid);
        } else {
            await handleDislike(currentPitch.pitchdeckid);
        }

        if (currentIndex < pitchDecks.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setCurrentIndex(pitchDecks.length);
        }
    };

    const currentPitch = pitchDecks[currentIndex];
    const isCurrentLiked = currentPitch && likedPitches.has(currentPitch.pitchdeckid);

    // LOADING STATE (With LegoLoader)
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <LegoLoader />
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
                            <Button onClick={() => window.location.reload()} className="bg-[#576238]">
                                Refresh
                            </Button>
                        </Card>
                    ) : currentIndex < pitchDecks.length && currentPitch ? (
                        <div className="relative h-[650px]">
                            {/* Card Stack Effect */}
                            {pitchDecks.slice(currentIndex, currentIndex + 2).map((pitch, index) => {
                                const tagMatches = getTagMatchCount(pitch.tags || []);
                                const isRelevant = tagMatches > 0;

                                return (
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
                                            if (index === 0 && !actionLoading) {
                                                if (info.offset.x > 100) handleSwipe("right");
                                                else if (info.offset.x < -100) handleSwipe("left");
                                            }
                                        }}
                                        className="absolute inset-0"
                                    >
                                        <Card className={`h-full border-2 overflow-hidden shadow-xl flex flex-col bg-white ${isRelevant && index === 0 ? 'ring-2 ring-[#FFD95D]' : ''}`}>
                                            {/* Video Player */}
                                            <div className="relative h-64 bg-black overflow-hidden flex-shrink-0">
                                                {pitch.video_url ? (
                                                    <video
                                                        src={pitch.video_url}
                                                        controls
                                                        className="w-full h-full object-contain"
                                                        preload="metadata"
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
                                                {/* Relevance Badge */}
                                                {index === 0 && isRelevant && (
                                                    <div className="absolute top-4 left-4 right-4 flex justify-between">
                                                        <div className="bg-black/70 px-3 py-1 rounded-full">
                                                            <span className="text-white text-sm font-semibold flex items-center gap-2">
                                                                <Video className="h-4 w-4" />
                                                                {pitch.pitchname || "Untitled Pitch"}
                                                            </span>
                                                        </div>
                                                        <div className="bg-[#FFD95D] px-3 py-1 rounded-full">
                                                            <span className="text-[#576238] text-xs font-bold flex items-center gap-1">
                                                                <Sparkles className="h-3 w-3" />
                                                                {tagMatches} Match{tagMatches !== 1 ? 'es' : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                {index === 0 && !isRelevant && (
                                                    <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full">
                                                        <span className="text-white text-sm font-semibold flex items-center gap-2">
                                                            <Video className="h-4 w-4" />
                                                            {pitch.pitchname || "Untitled Pitch"}
                                                        </span>
                                                    </div>
                                                )}
                                                {/* Like Status Badge */}
                                                {index === 0 && isCurrentLiked && (
                                                    <div className="absolute top-4 right-4 bg-red-500 px-3 py-1 rounded-full">
                                                        <span className="text-white text-sm font-semibold flex items-center gap-1">
                                                            <Heart className="h-4 w-4 fill-white" />
                                                            Liked
                                                        </span>
                                                    </div>
                                                )}
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
                                                        {pitch.tags.map((tag, i) => {
                                                            const isMatched = investorTags.some(invTag =>
                                                                invTag.toLowerCase() === tag.toLowerCase()
                                                            );
                                                            return (
                                                                <span
                                                                    key={i}
                                                                    className={`px-3 py-1 text-xs rounded-full font-medium ${isMatched
                                                                        ? 'bg-[#FFD95D] text-[#576238] ring-2 ring-[#576238]'
                                                                        : 'bg-[#FFD95D]/20 text-[#576238]'
                                                                        }`}
                                                                >
                                                                    {tag}
                                                                    {isMatched && ' ✓'}
                                                                </span>
                                                            );
                                                        })}
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
                                )
                            })}
                        </div>
                    ) : (
                        <Card className="p-12 text-center border-2">
                            <div className="text-6xl mb-4">🎉</div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-2">
                                You've Reviewed Everything!
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                You've reviewed all {pitchDecks.length} available pitch{pitchDecks.length !== 1 ? 'es' : ''}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <Button
                                    onClick={() => {
                                        setCurrentIndex(0);
                                        x.set(0);
                                    }}
                                    className="bg-[#576238]"
                                >
                                    Review Again
                                </Button>
                                <Link href="/investor/schedule">
                                    <Button variant="outline">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        View Schedule
                                    </Button>
                                </Link>
                            </div>
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
                                disabled={actionLoading}
                                size="lg"
                                variant="outline"
                                className="rounded-full w-16 h-16 border-2 border-red-500 text-red-500 hover:bg-red-50 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <X className="h-6 w-6" />}
                            </Button>
                            <Button
                                onClick={() => handleSwipe("right")}
                                disabled={actionLoading}
                                size="lg"
                                className={`rounded-full w-16 h-16 disabled:opacity-50 ${isCurrentLiked
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-[#576238] hover:bg-[#6b7c3f]'
                                    }`}
                            >
                                {actionLoading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <Heart className={`h-6 w-6 ${isCurrentLiked ? 'fill-white' : ''}`} />
                                )}
                            </Button>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}