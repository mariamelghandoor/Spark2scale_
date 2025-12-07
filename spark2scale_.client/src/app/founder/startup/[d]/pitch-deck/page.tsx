"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Upload, Play, CheckCircle, Loader2, BarChart3, RefreshCw } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { pitchDeckService, PitchDeck } from "@/services/pitchDeckService";

export default function PitchDeckPage() {
    const params = useParams();

    // Robust ID Extraction
    const rawId = params?.d || params?.id;
    const startupId = rawId
        ? (Array.isArray(rawId) ? rawId[0] : rawId).toString()
        : "";

    const [pitches, setPitches] = useState<PitchDeck[]>([]);
    const [latestPitch, setLatestPitch] = useState<PitchDeck | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Fetch
    useEffect(() => {
        if (startupId) {
            loadPitches();
        }
    }, [startupId]);

    // Update "Latest" when pitches change
    useEffect(() => {
        if (pitches.length > 0) {
            setLatestPitch(pitches[0]);
        }
    }, [pitches]);

    const loadPitches = async () => {
        try {
            const data = await pitchDeckService.getPitches(startupId);
            setPitches(data);
        } catch (error) {
            console.error("Failed to load pitches", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !startupId) return;

        if (file.size > 50 * 1024 * 1024) {
            alert("File is too large. Max 50MB.");
            return;
        }

        setIsUploading(true);
        try {
            const newPitch = await pitchDeckService.uploadVideo(startupId, file);
            setPitches((prev) => [newPitch, ...prev]);
        } catch (error) {
            console.error(error);
            alert("Upload failed. Ensure backend is running.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleGenerateAnalysis = async () => {
        if (!latestPitch) return;

        setIsAnalyzing(true);
        try {
            const updatedPitch = await pitchDeckService.generateAnalysis(latestPitch.pitchdeckid);
            setLatestPitch(updatedPitch);
            setPitches(prev => prev.map(p => p.pitchdeckid === updatedPitch.pitchdeckid ? updatedPitch : p));
        } catch (error) {
            console.error("Analysis failed", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- FIX START: TypeScript-Safe Normalization ---
    const getSafeAnalysis = (pitch: PitchDeck | null) => {
        if (!pitch?.analysis) return null;

        // We cast to 'any' here to bypass the strict union check.
        // This allows us to check for both 'summary' and 'Summary' without TS complaining.
        const rawShort = (pitch.analysis.short || pitch.analysis.Short) as any;

        if (!rawShort) return null;

        return {
            score: rawShort.Score || rawShort.score || 0,
            summary: rawShort.Summary || rawShort.summary || "",
            feedback: rawShort.KeyFeedback || rawShort.keyFeedback || []
        };
    };

    const safeAnalysis = getSafeAnalysis(latestPitch);
    // --- FIX END ---

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="video/*"
                onChange={handleFileChange}
            />

            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${startupId}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">
                                🎤 Pitch Deck
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Stage 6 of 6 - Perfect your pitch
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Upload Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="mb-6 border-2 border-[#FFD95D]">
                            <CardHeader className="bg-gradient-to-r from-[#FFD95D]/20 to-transparent">
                                <CardTitle className="text-[#576238]">
                                    Upload Pitch Video
                                </CardTitle>
                                <CardDescription>
                                    Upload your latest take to get AI feedback.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="w-full">
                                    <Button
                                        className="h-32 flex-col gap-3 w-full"
                                        variant="outline"
                                        size="lg"
                                        onClick={handleUploadClick}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="h-8 w-8 animate-spin text-[#576238]" />
                                                <span>Uploading... Please wait</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-8 w-8" />
                                                <span>Select Video File</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Latest Pitch View */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="text-[#576238]">
                                    Latest Submission
                                </CardTitle>
                                <CardDescription>
                                    Review your most recent pitch
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="text-center py-8">Loading...</div>
                                ) : !latestPitch ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        No pitch videos uploaded yet.
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Video Player */}
                                        <div className="relative bg-black aspect-video flex items-center justify-center rounded-lg overflow-hidden border-2 border-[#576238]/20">
                                            <video
                                                controls
                                                src={latestPitch.video_url}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-semibold text-[#576238]">
                                                    Pitch Uploaded
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(latestPitch.created_at).toLocaleDateString()} at {new Date(latestPitch.created_at).toLocaleTimeString()}
                                                </p>
                                            </div>

                                            {/* Show Score Badge if Analysis Exists */}
                                            {safeAnalysis && (
                                                <div className="flex items-center gap-2 bg-[#F0EADC] px-4 py-2 rounded-lg">
                                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                                    <div className="text-right">
                                                        <p className="text-xl font-bold text-[#576238]">
                                                            {safeAnalysis.score}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                                            Score
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Area: Generate Button OR Analysis Results */}
                                        {!safeAnalysis ? (
                                            <div className="pt-4 border-t flex justify-center">
                                                <Button
                                                    size="lg"
                                                    className="bg-[#576238] hover:bg-[#6b7c3f] gap-2"
                                                    onClick={handleGenerateAnalysis}
                                                    disabled={isAnalyzing}
                                                >
                                                    {isAnalyzing ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Analyzing Pitch...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <BarChart3 className="h-4 w-4" />
                                                            Generate AI Analysis
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                className="space-y-4 pt-4 border-t"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold text-lg text-[#576238]">
                                                        AI Quick Summary
                                                    </h4>
                                                </div>

                                                {/* Summary Text */}
                                                <p className="text-muted-foreground italic border-l-4 border-[#FFD95D] pl-4">
                                                    "{safeAnalysis.summary}"
                                                </p>

                                                {/* Feedback Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {/* We map using 'any' to avoid the strict casing check on list items too */}
                                                    {safeAnalysis.feedback.map((fb: any, i: number) => (
                                                        <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs font-semibold text-[#576238]">
                                                                    {fb.Aspect || fb.aspect}
                                                                </span>
                                                                <span className="text-xs font-bold text-[#FFD95D] bg-[#576238] px-2 py-0.5 rounded-full">
                                                                    {fb.Score || fb.score}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {fb.Comment || fb.comment}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex gap-3 mt-6 pt-4 border-t">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 group"
                                                        asChild
                                                    >
                                                        {/* Dynamic Link using the real ID */}
                                                        <Link href={`/founder/startup/${startupId}/pitches/${latestPitch.pitchdeckid}/details`}>
                                                            View Full Report <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                        </Link>
                                                    </Button>

                                                    <Button
                                                        className="flex-1 bg-[#576238] hover:bg-[#6b7c3f]"
                                                        onClick={handleGenerateAnalysis}
                                                        disabled={isAnalyzing}
                                                    >
                                                        <RefreshCw className="mr-2 h-4 w-4" />
                                                        Regenerate
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}