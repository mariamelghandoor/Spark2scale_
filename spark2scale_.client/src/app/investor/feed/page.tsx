"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, X, Heart, Eye, Video, Sparkles, Trophy, MessageCircle, User } from "lucide-react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";
import apiClient from "@/lib/apiClient"; // Using your shared client
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

import { useAuth } from "@/context/AuthContext";
import LegoSpinner from "@/components/lego/LegoSpinner";

export default function InvestorFeed() {
    const { user, loading: authLoading } = useAuth();
    const [userName, setUserName] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pitchDecks, setPitchDecks] = useState<PitchDeck[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [likedPitches, setLikedPitches] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState(false);
    const [investorTags, setInvestorTags] = useState<string[]>([]);

    useEffect(() => {
        if (user) {
            setUserName(user.fname || "Investor");
        }
    }, [user]);

    // Use actual user ID
    const investorId = user?.id;

    // Calculate tag match count for sorting
    const getTagMatchCount = (pitchTags: string[]) => {
        if (!investorTags.length || !pitchTags.length) return 0;
        return pitchTags.filter(tag =>
            investorTags.some(invTag => invTag.toLowerCase() === tag.toLowerCase())
        ).length;
    };

    useEffect(() => {
        const fetchPitchDecks = async () => {
            if (authLoading || !investorId) return;

            try {
                setLoading(true);
                console.log("🔍 Fetching pitch decks...");

                // 1. Fetch investor tags
                try {
                    const investorResponse = await apiClient.get<InvestorDto[]>('/api/investors');
                    const investors = investorResponse.data;
                    const currentInvestor = investors.find((inv) => inv.userId === investorId);
                    if (currentInvestor?.tags) {
                        setInvestorTags(currentInvestor.tags);
                    }
                } catch (err) {
                    console.warn("Could not fetch investor tags:", err);
                }

                // 2. Fetch pitch decks (Using apiClient handles the Base URL automatically)
                // Note: Added ?onlyPublic=true as per your request
                const response = await apiClient.get<any[]>('/api/pitchdecks/with-startups?onlyPublic=true');
                const rawData = response.data;

                console.log("✅ API Response Sample:", rawData[0]);

                // FIX: Normalize Data Casing
                const normalizedPitches: PitchDeck[] = rawData.map((item) => ({
                    ...item,
                    pitchdeckid: item.pitchdeckid || item.pitchDeckId || item.PitchDeckId,
                    startup_id: item.startup_id || item.startupId || item.StartupId,
                    video_url: item.video_url || item.videoUrl || item.VideoUrl,
                    pitchname: item.pitchname || item.pitchName || item.PitchName,
                    is_current: item.is_current ?? item.isCurrent ?? item.IsCurrent ?? true,
                    countlikes: item.countlikes ?? item.countLikes ?? item.CountLikes ?? 0,
                    created_at: item.created_at || item.createdAt || item.CreatedAt,
                    tags: item.tags || [],
                    startup: item.startup ? {
                        sid: item.startup.sid || item.startup.sId || item.startup.Sid,
                        startupname: item.startup.startupname || item.startup.startupName || item.startup.StartupName,
                        field: item.startup.field || item.startup.Field,
                        idea_description: item.startup.idea_description || item.startup.ideaDescription || item.startup.IdeaDescription
                    } : undefined
                }));

                // Removed filter to show all fetched decks
                const activePitches = normalizedPitches;

                // 3. Sort by tag matches
                const sortedPitches = activePitches.sort((a, b) => {
                    const aMatches = getTagMatchCount(a.tags);
                    const bMatches = getTagMatchCount(b.tags);

                    if (aMatches !== bMatches) return bMatches - aMatches;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });

                setPitchDecks(sortedPitches);
                setError(null);

                // 4. Check Likes
                await checkLikedPitches(sortedPitches);

            } catch (err) {
                console.error("💥 Error fetching pitch decks:", err);
                const errorMessage = err instanceof Error ? err.message : "Failed to load pitch decks.";
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchPitchDecks();
    }, [investorId, authLoading]);

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

    const likePitch = async (pitchId: string) => {
        try {
            const response = await apiClient.post('/api/pitchdecklikes/interact', {
                investor_id: investorId,
                pitchdeck_id: pitchId,
                liked: true,
                contacted: false
            });

            const data = response.data as any;
            setLikedPitches(prev => new Set([...prev, pitchId]));

            setPitchDecks(prev => prev.map(pitch =>
                pitch.pitchdeckid === pitchId
                    ? { ...pitch, countlikes: data.newLikeCount || pitch.countlikes + 1 }
                    : pitch
            ));
        } catch (err) {
            console.error("Error liking pitch:", err);
        }
    };

    const dislikePitch = async (pitchId: string) => {
        try {
            const response = await apiClient.post('/api/pitchdecklikes/interact', {
                investor_id: investorId,
                pitchdeck_id: pitchId,
                liked: false,
                contacted: false
            });

            const data = response.data as any;
            
            if (likedPitches.has(pitchId)) {
                setLikedPitches(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(pitchId);
                    return newSet;
                });

                setPitchDecks(prev => prev.map(pitch =>
                    pitch.pitchdeckid === pitchId
                        ? { ...pitch, countlikes: data.newLikeCount ?? Math.max(0, pitch.countlikes - 1) }
                        : pitch
                ));
            }
        } catch (err) {
            console.error("Error handling dislike:", err);
        }
    };

    const handleSwipe = async (direction: "left" | "right") => {
        if (actionLoading || currentIndex >= pitchDecks.length) return;
        setActionLoading(true);

        const currentPitch = pitchDecks[currentIndex];

        const targetX = direction === "right" ? 600 : -600;
        await animate(x, targetX, {
            type: "spring",
            stiffness: 250,
            damping: 25
        });

        if (direction === "right") {
            await likePitch(currentPitch.pitchdeckid);
        } else {
            await dislikePitch(currentPitch.pitchdeckid);
        }

        x.set(0);
        setCurrentIndex(prev => prev + 1);
        setActionLoading(false);
    };

    const handleContactFounder = async (pitchId: string) => {
        if (actionLoading) return;
        setActionLoading(true);

        try {
            await animate(x, 600, {
                type: "spring",
                stiffness: 250,
                damping: 25
            });

            const response = await apiClient.post('/api/pitchdecklikes/interact', {
                investor_id: investorId,
                pitchdeck_id: pitchId,
                liked: true,
                contacted: true
            });

            const data = response.data as any;
            setLikedPitches(prev => new Set([...prev, pitchId]));

            setPitchDecks(prev => prev.map(pitch =>
                pitch.pitchdeckid === pitchId
                    ? { ...pitch, countlikes: data.newLikeCount || pitch.countlikes + 1 }
                    : pitch
            ));

            x.set(0);
            setCurrentIndex(prev => prev + 1);
        } catch (err) {
            console.error("Error contacting founder:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const currentPitch = pitchDecks[currentIndex];
    const isCurrentLiked = currentPitch && likedPitches.has(currentPitch.pitchdeckid);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <LegoLoader />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 flex items-center justify-center p-4">
                <Card className="p-8 text-center max-w-2xl border-2 border-red-200">
                    <h3 className="text-xl font-bold text-[#576238] mb-2">Error Loading Pitches</h3>
                    <p className="text-red-600 mb-4 text-sm">{error}</p>
                    <Button onClick={() => window.location.reload()} className="bg-[#576238]">Retry</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="relative h-screen w-screen flex flex-col bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 overflow-hidden select-none">
            {/* Background 3D-style floating Lego blocks */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Block 1: Forest Green (Top Left) */}
                <motion.div
                    animate={{ y: [-12, 12, -12], rotate: [-6, 6, -6] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                    className="absolute top-[12%] left-[6%] w-24 h-16 opacity-20 lg:opacity-30 hidden sm:block"
                >
                    <div className="w-full h-12 bg-[#576238] rounded-xl shadow-2xl relative border border-white/10">
                        <div className="absolute -top-2 left-3 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-10 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-17 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                    </div>
                </motion.div>

                {/* Block 2: Golden Yellow (Top Right) */}
                <motion.div
                    animate={{ y: [10, -10, 10], rotate: [5, -5, 5] }}
                    transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
                    className="absolute top-[15%] right-[8%] w-20 h-14 opacity-20 lg:opacity-35 hidden sm:block"
                >
                    <div className="w-full h-10 bg-[#FFD95D] rounded-xl shadow-2xl relative border border-white/10">
                        <div className="absolute -top-2 left-4 w-4 h-3 bg-[#FFD95D] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-12 w-4 h-3 bg-[#FFD95D] rounded-t-md shadow-inner" />
                    </div>
                </motion.div>

                {/* Block 3: Coral Red (Middle Left) */}
                <motion.div
                    animate={{ y: [15, -15, 15], x: [-6, 6, -6] }}
                    transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                    className="absolute top-[50%] left-[4%] w-16 h-12 opacity-15 lg:opacity-20 hidden md:block"
                >
                    <div className="w-full h-8 bg-[#ff6b6b] rounded-xl shadow-2xl relative border border-white/10">
                        <div className="absolute -top-2 left-3 w-3 h-2 bg-[#ff6b6b] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-9 w-3 h-2 bg-[#ff6b6b] rounded-t-md shadow-inner" />
                    </div>
                </motion.div>

                {/* Block 4: Sky Blue (Middle Right) */}
                <motion.div
                    animate={{ y: [-16, 16, -16], rotate: [-7, 7, -7] }}
                    transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}
                    className="absolute top-[55%] right-[6%] w-24 h-16 opacity-15 lg:opacity-20 hidden md:block"
                >
                    <div className="w-full h-12 bg-[#4a90e2] rounded-xl shadow-2xl relative border border-white/10">
                        <div className="absolute -top-2 left-3 w-4 h-3 bg-[#4a90e2] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-10 w-4 h-3 bg-[#4a90e2] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-17 w-4 h-3 bg-[#4a90e2] rounded-t-md shadow-inner" />
                    </div>
                </motion.div>

                {/* Block 5: Sage Green (Bottom Left) */}
                <motion.div
                    animate={{ y: [-9, 9, -9], rotate: [4, -4, 4] }}
                    transition={{ repeat: Infinity, duration: 6.5, ease: "easeInOut" }}
                    className="absolute bottom-[15%] left-[8%] w-20 h-14 opacity-20 lg:opacity-25 hidden sm:block"
                >
                    <div className="w-full h-10 bg-[#8b9456] rounded-xl shadow-2xl relative border border-white/10">
                        <div className="absolute -top-2 left-4 w-4 h-3 bg-[#8b9456] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-12 w-4 h-3 bg-[#8b9456] rounded-t-md shadow-inner" />
                    </div>
                </motion.div>
            </div>

            {/* Header Navigation (Spreaded to full width to match founder dashboard) */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm flex-shrink-0">
                <div className="flex w-full items-center justify-between px-6 md:px-12 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#576238] to-[#6b7c3f] flex items-center justify-center text-white shadow-md font-bold">
                            {userName[0]?.toUpperCase() || "I"}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-[#576238] leading-tight">Hello, {userName} 👋</h1>
                            <p className="text-xs text-muted-foreground">Investor Space</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Saved Pitches Count Badge */}
                        <div className="flex items-center gap-1.5 bg-[#576238]/5 px-3 py-1.5 rounded-xl border border-[#576238]/10 text-[#576238] shadow-sm select-none mr-2">
                            <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500 animate-pulse" />
                            <span className="text-xs font-black">{likedPitches.size} Saved</span>
                        </div>

                        <Link href="/schedule">
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238] transition-colors rounded-xl">
                                <Calendar className="h-5 w-5" />
                            </Button>
                        </Link>
                        <NotificationsDropdown />
                        <Link href="/profile">
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238] transition-colors rounded-xl">
                                <User className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <main className="flex-1 w-full max-w-xl mx-auto px-4 py-4 flex flex-col justify-center items-center relative z-10 min-h-0 overflow-hidden">
                <div className="w-full flex flex-col justify-center gap-6 flex-1 min-h-0">
                    {pitchDecks.length === 0 ? (
                        <Card className="p-12 text-center bg-white/75 backdrop-blur-md border border-white/40 shadow-xl rounded-3xl w-full">
                            <Video className="h-16 w-16 text-[#576238] mx-auto mb-4 opacity-50" />
                            <h3 className="text-2xl font-bold text-[#576238] mb-2">No Pitch Videos Yet</h3>
                            <p className="text-sm text-gray-500 mb-6">Check back soon for new startup pitches!</p>
                            <Button onClick={() => window.location.reload()} className="bg-[#576238] hover:bg-[#6b7c3f] rounded-2xl px-6 py-5 shadow-lg font-bold">Refresh Feed</Button>
                        </Card>
                    ) : currentIndex < pitchDecks.length && currentPitch ? (
                        <>
                            <div className="relative flex-1 w-full max-h-[550px] min-h-[400px]">
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
                                                    if (info.offset.x > 150) handleSwipe("right");
                                                    else if (info.offset.x < -150) handleSwipe("left");
                                                    else {
                                                        animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
                                                    }
                                                }
                                            }}
                                            className="absolute inset-0 cursor-grab active:cursor-grabbing"
                                        >
                                            <Card className={`h-full border-2 overflow-hidden shadow-2xl flex flex-col bg-white rounded-3xl transition-shadow ${isRelevant && index === 0 ? 'ring-4 ring-[#FFD95D]/70 border-[#FFD95D]' : 'border-gray-200/60'}`}>
                                                {/* Video Player */}
                                                <div className="relative h-52 bg-black overflow-hidden flex-shrink-0">
                                                    {pitch.video_url ? (
                                                        <video src={pitch.video_url} controls className="w-full h-full object-contain" preload="metadata">Your browser does not support video playback.</video>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#576238] to-[#6b7c3f]">
                                                            <div className="text-center text-white">
                                                                <Video className="h-14 w-14 mx-auto mb-2 opacity-50" />
                                                                <p className="text-xs">No video pitch uploaded</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Header badges */}
                                                    <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none select-none">
                                                        <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
                                                            <span className="text-white text-xs font-semibold flex items-center gap-2">
                                                                <Video className="h-3.5 w-3.5" />
                                                                {pitch.pitchname || "Untitled"}
                                                            </span>
                                                        </div>
                                                        
                                                        {tagMatches > 0 && (
                                                            <div className="bg-[#FFD95D] px-3 py-1 rounded-xl shadow-lg border border-[#d9b43c]">
                                                                <span className="text-[#576238] text-[10px] font-black flex items-center gap-1">
                                                                    <Sparkles className="h-3 w-3" />
                                                                    {tagMatches} Match{tagMatches !== 1 ? 'es' : ''}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isCurrentLiked && index === 0 && (
                                                        <div className="absolute bottom-4 right-4 bg-red-500 px-3 py-1 rounded-xl shadow-lg">
                                                            <span className="text-white text-xs font-bold flex items-center gap-1">
                                                                <Heart className="h-3.5 w-3.5 fill-white" />
                                                                Liked
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Card Content (Scrollable Details) */}
                                                <CardContent className="p-6 space-y-4 flex-grow overflow-y-auto min-h-0">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="text-2xl font-black text-[#576238] mb-1 leading-tight">{pitch.pitchname || "Untitled Pitch"}</h3>
                                                            <p className="text-sm font-semibold text-muted-foreground">by {pitch.startup?.startupname || "Unknown Startup"}</p>
                                                        </div>
                                                        {pitch.analysis?.Short?.Score && (
                                                            <div className="flex items-center gap-1 bg-[#576238]/10 text-[#576238] px-3 py-1.5 rounded-xl border border-[#576238]/10 flex-shrink-0">
                                                                <Trophy className="h-4 w-4 text-[#FFD95D]" />
                                                                <span className="font-bold text-xs">{pitch.analysis.Short.Score}/100</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 italic">
                                                        "{pitch.startup?.idea_description || "No description available"}"
                                                    </p>

                                                    {pitch.analysis?.Short?.Summary && (
                                                        <div className="bg-[#576238]/5 p-4 rounded-2xl border border-[#576238]/10 relative overflow-hidden">
                                                            <div className="flex items-center gap-2 text-xs font-bold text-[#576238] mb-1.5">
                                                                <Sparkles className="h-3.5 w-3.5 text-[#FFD95D]" />
                                                                <span>AI Evaluation Summary</span>
                                                            </div>
                                                            <p className="text-xs text-[#576238]/80 line-clamp-3 leading-relaxed">
                                                                {pitch.analysis.Short.Summary}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Field</p>
                                                            <p className="font-bold text-sm text-[#576238]">{pitch.startup?.field || "Not specified"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Likes</p>
                                                            <p className="font-bold text-sm text-[#576238] flex items-center gap-1">
                                                                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                                                                {pitch.countlikes}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {pitch.tags && pitch.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pt-2">
                                                            {pitch.tags.map((tag, i) => {
                                                                const isMatched = investorTags.some(invTag => invTag.toLowerCase() === tag.toLowerCase());
                                                                return (
                                                                    <span key={i} className={`px-2.5 py-0.5 text-[10px] rounded-lg font-bold border transition-colors ${isMatched ? 'bg-[#FFD95D] text-[#576238] border-[#d9b43c] shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>{tag}{isMatched && ' ✓'}</span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </CardContent>

                                                {/* Fixed Card Footer */}
                                                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
                                                    <span className="text-xs text-muted-foreground">Posted: {new Date(pitch.created_at).toLocaleDateString()}</span>
                                                    <Link href={`/investor/startup/${pitch.startup_id}`}>
                                                        <Button variant="outline" size="sm" className="border-[#576238]/30 hover:border-[#576238] text-[#576238] hover:bg-[#576238]/5 rounded-xl font-bold transition-all">
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Profile
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Swipe Controls */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex justify-center items-center gap-6 mt-4 flex-shrink-0 w-full">
                                <Button 
                                    onClick={() => handleSwipe("left")} 
                                    disabled={actionLoading} 
                                    size="lg" 
                                    variant="outline" 
                                    className="rounded-full w-14 h-14 border-2 border-red-500 text-red-500 hover:bg-red-50 hover:scale-110 active:scale-95 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center bg-white flex-shrink-0"
                                >
                                    {actionLoading ? <LegoSpinner className="h-6 w-6 animate-spin" /> : <X className="h-6 w-6" />}
                                </Button>
                                
                                <Button 
                                    onClick={() => handleContactFounder(currentPitch.pitchdeckid)} 
                                    disabled={actionLoading} 
                                    size="lg" 
                                    className="rounded-full px-6 py-6 border-2 border-[#576238] bg-white text-[#576238] hover:bg-[#576238] hover:text-white hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-lg disabled:opacity-50 font-black flex items-center gap-2 flex-shrink-0"
                                >
                                    {actionLoading ? <LegoSpinner className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
                                    Contact Founder
                                </Button>

                                <Button 
                                    onClick={() => handleSwipe("right")} 
                                    disabled={actionLoading} 
                                    size="lg" 
                                    className={`rounded-full w-14 h-14 hover:scale-110 active:scale-95 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center flex-shrink-0 ${isCurrentLiked ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-[#576238] text-white hover:bg-[#6b7c3f]'}`}
                                >
                                    {actionLoading ? <LegoSpinner className="h-6 w-6 animate-spin" /> : <Heart className={`h-6 w-6 ${isCurrentLiked ? 'fill-white' : ''}`} />}
                                </Button>
                            </motion.div>
                        </>
                    ) : (
                        <Card className="p-16 text-center bg-white/75 backdrop-blur-md border border-white/40 shadow-xl rounded-3xl w-full">
                            <div className="text-6xl mb-4 animate-bounce">🎉</div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-2">Reviewed Everything!</h3>
                            <p className="text-muted-foreground mb-6">You've reviewed all available pitch decks.</p>
                            <div className="flex gap-3 justify-center">
                                <Button onClick={() => { setCurrentIndex(0); x.set(0); }} className="bg-[#576238] hover:bg-[#6b7c3f] rounded-2xl shadow-lg px-6 font-bold py-5">Review Again</Button>
                                <Link href="/schedule">
                                    <Button variant="outline" className="rounded-2xl border-[#576238]/30 text-[#576238] hover:bg-[#576238]/5 font-bold px-6 py-5">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        View Schedule
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}