"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { pitchDeckService, PitchDeck } from "@/services/pitchDeckService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Mic, Activity, Loader2 } from "lucide-react";
import Link from "next/link";

export default function PitchDetailsPage() {
    const params = useParams();

    // Extract IDs safely based on your folder structure [d] or [id]
    const rawStartupId = params?.d || params?.id;
    const startupId = Array.isArray(rawStartupId) ? rawStartupId[0] : rawStartupId;
    const pitchId = params?.pitchId as string;

    const [pitch, setPitch] = useState<PitchDeck | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!pitchId) return;
            try {
                // Fetch the specific pitch data from backend
                const data = await pitchDeckService.getPitchById(pitchId);
                setPitch(data);
            } catch (error) {
                console.error("Failed to fetch details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [pitchId]);

    // 1. Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-[#F0EADC]/30 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#576238]" />
                <p className="text-[#576238]">Loading Detailed Analysis...</p>
            </div>
        );
    }

    // 2. Data Normalization (Handle Lowercase/Uppercase Backend Data)
    const analysis = pitch?.analysis;
    const rawDetailed = (analysis?.detailed || analysis?.Detailed) as any;

    // 3. Error/Empty State
    if (!pitch || !rawDetailed) {
        return (
            <div className="min-h-screen bg-[#F0EADC]/30 flex flex-col items-center justify-center p-8">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold text-[#576238]">Analysis Not Found</h2>
                    <p className="text-muted-foreground">We couldn't find the detailed report for this video.</p>
                    <Link href={`/founder/startup/${startupId}/pitch-deck`}>
                        <Button className="bg-[#576238] hover:bg-[#6b7c3f]">Back to Dashboard</Button>
                    </Link>
                </div>
            </div>
        );
    }

    // 4. Safe Data Extraction
    const tone = rawDetailed.Tone || rawDetailed.tone || "N/A";
    const pacing = rawDetailed.Pacing || rawDetailed.pacing || "N/A";
    const sections = rawDetailed.Sections || rawDetailed.sections || [];
    const highlights = rawDetailed.TranscriptHighlights || rawDetailed.transcriptHighlights || [];

    return (
        <div className="min-h-screen bg-[#F0EADC]/30 p-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${startupId}/pitch-deck`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-[#576238]">Deep Dive Analysis</h1>
                            <p className="text-sm text-muted-foreground">
                                Uploaded on {new Date(pitch.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                    <Card className="bg-white border-[#576238]/20 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Tone</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#F0EADC] rounded-full">
                                    <Activity className="h-5 w-5 text-[#576238]" />
                                </div>
                                <span className="text-lg font-bold text-[#576238]">{tone}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-[#576238]/20 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Speech Pacing</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#F0EADC] rounded-full">
                                    <Mic className="h-5 w-5 text-[#576238]" />
                                </div>
                                <span className="text-lg font-bold text-[#576238]">{pacing}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Placeholder for future metric */}
                    <Card className="bg-white border-[#576238]/20 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Clarity Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#F0EADC] rounded-full">
                                    <CheckCircle className="h-5 w-5 text-[#576238]" />
                                </div>
                                <span className="text-lg font-bold text-[#576238]">High</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Section Breakdown */}
                <Card className="border-0 shadow-md">
                    <CardHeader className="bg-white rounded-t-xl border-b">
                        <CardTitle className="text-[#576238]">Section-by-Section Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        {sections.map((section: any, idx: number) => {
                            // Extract values safely inside map
                            const aspect = section.Aspect || section.aspect;
                            const comment = section.Comment || section.comment;
                            const score = section.Score || section.score;

                            return (
                                <div key={idx} className="flex flex-col sm:flex-row sm:items-start justify-between p-4 border rounded-lg bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                                    <div className="mb-2 sm:mb-0">
                                        <h3 className="font-bold text-[#576238]">{aspect}</h3>
                                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                            {comment}
                                        </p>
                                    </div>
                                    <div className={`px-3 py-1 self-start rounded-full text-white font-bold text-sm ${score >= 90 ? 'bg-green-600' : score >= 80 ? 'bg-[#576238]' : 'bg-yellow-500'}`}>
                                        {score}/100
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Transcript Highlights */}
                <Card className="border-0 shadow-md">
                    <CardHeader className="bg-white rounded-t-xl border-b">
                        <CardTitle className="text-[#576238]">Key Highlights</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ul className="space-y-3">
                            {highlights.map((highlight: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-3 text-sm p-3 bg-[#F0EADC]/30 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                    <span className="text-gray-700 italic">"{highlight}"</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}