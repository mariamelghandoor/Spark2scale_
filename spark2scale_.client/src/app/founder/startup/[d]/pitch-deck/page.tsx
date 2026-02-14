"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, Loader2, BarChart3, CheckCheck } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { pitchDeckService, PitchDeck } from "@/services/pitchDeckService";
import { startupService } from "@/services/startupService";

export default function PitchDeckPage() {
    const params = useParams();

    const rawId = params?.d || params?.id;
    const startupId = rawId
        ? (Array.isArray(rawId) ? rawId[0] : rawId).toString()
        : "";

    const [pitches, setPitches] = useState<PitchDeck[]>([]);
    const [latestPitch, setLatestPitch] = useState<PitchDeck | null>(null);

    // Loading States
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);

    // State to track if stage is already done
    const [isStageDone, setIsStageDone] = useState(false);
    const [userRole, setUserRole] = useState<string>("Viewer");

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Fetch (Pitches + Workflow Status via Service)
    useEffect(() => {
        const initData = async () => {
            if (!startupId) return;
            setIsLoading(true);
            try {
                // Parallel fetch
                const [pitchData, isComplete, startupDetails] = await Promise.all([
                    pitchDeckService.getPitches(startupId),
                    pitchDeckService.getWorkflowStatus(startupId),
                    startupService.getById(startupId)
                ]);

                setPitches(pitchData);
                setIsStageDone(isComplete);
                if (startupDetails) setUserRole(startupDetails.current_role || "Viewer");
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setIsLoading(false);
            }
        };

        initData();
    }, [startupId]);

    useEffect(() => {
        if (pitches.length > 0) {
            const activePitch = pitches.find(p => p.is_current === true);
            setLatestPitch(activePitch || null);
        } else {
            setLatestPitch(null);
        }
    }, [pitches]);

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !startupId) return;

        if (file.size > 500 * 1024 * 1024) {
            alert("File is too large. Max 500MB.");
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

    // Updated: Uses Service
    const handleCompleteStage = async () => {
        setIsCompleting(true);
        try {
            const success = await pitchDeckService.completeStage(startupId);
            if (success) {
                setIsStageDone(true);
            } else {
                alert("Failed to update status.");
            }
        } catch (error) {
            console.error("Failed to complete stage:", error);
        } finally {
            setIsCompleting(false);
        }
    };

    const getSafeAnalysis = (pitch: PitchDeck | null) => {
        if (!pitch?.analysis) return null;
        const rawShort = (pitch.analysis.short || pitch.analysis.Short) as any;
        if (!rawShort) return null;

        return {
            score: rawShort.Score || rawShort.score || 0,
            summary: rawShort.Summary || rawShort.summary || "",
            feedback: rawShort.KeyFeedback || rawShort.keyFeedback || []
        };
    };

    const safeAnalysis = getSafeAnalysis(latestPitch);

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
                                Stage 6 of 6 - Perfect your pitch • {userRole} View
                            </p>
                        </div>
                    </div>
                    {/* Status Badge */}
                    {isStageDone && (
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200 flex items-center gap-2">
                            <CheckCheck className="h-4 w-4" /> Completed
                        </div>
                    )}
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Upload Section */}
                    {userRole === 'Founder' && (
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
                    )}

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

                                            {safeAnalysis ? (
                                                <div className="flex items-center gap-2 bg-[#F0EADC] px-4 py-2 rounded-lg">
                                                    <BarChart3 className="h-5 w-5 text-green-600" />
                                                    <div className="text-right">
                                                        <p className="text-xl font-bold text-[#576238]">
                                                            {safeAnalysis.score}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                                            Score
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="bg-[#576238] hover:bg-[#6b7c3f]"
                                                    onClick={handleGenerateAnalysis}
                                                    disabled={isAnalyzing || userRole !== 'Founder'}
                                                >
                                                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
                                                    Analyze
                                                </Button>
                                            )}
                                        </div>

                                        {/* Analysis Display */}
                                        {safeAnalysis && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                className="space-y-4 pt-4 border-t"
                                            >
                                                <h4 className="font-semibold text-lg text-[#576238]">AI Quick Summary</h4>
                                                <p className="text-muted-foreground italic border-l-4 border-[#FFD95D] pl-4">
                                                    "{safeAnalysis.summary}"
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Complete Stage Button Logic */}
                    {latestPitch && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-8 text-center"
                        >
                            {isStageDone ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Button
                                        disabled
                                        className="bg-[#576238] text-white font-semibold opacity-100 cursor-not-allowed"
                                    >
                                        <CheckCheck className="mr-2 h-4 w-4" />
                                        Stage Completed!
                                    </Button>
                                    <p className="text-sm text-muted-foreground font-medium mt-1">
                                        Great job! You have finalized this step.
                                    </p>
                                    <Link href={`/founder/startup/${startupId}`} className="text-sm text-[#576238] hover:underline mt-1 block">
                                        Return to Dashboard →
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <Button
                                        size="lg"
                                        onClick={handleCompleteStage}
                                        disabled={isCompleting || userRole !== 'Founder'}
                                        className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold px-8 h-14 text-lg shadow-lg hover:shadow-xl transition-all w-full md:w-auto"
                                    >
                                        {isCompleting ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                🎉 Complete All Stages!
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-sm text-muted-foreground mt-3">
                                        Click this to mark the Pitch Deck stage as done in your workflow.
                                    </p>
                                </>
                            )}
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}