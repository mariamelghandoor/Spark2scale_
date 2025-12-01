"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Sparkles, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";

// --- Types matching your C# JSONB Structure ---
interface RecommendationContent {
    summary: string;
    score: number;
    keyPoints: string[];
    actionPlan: string;
}

interface DBRecommendation {
    rid: string;
    startup_id: string;
    type: string;
    content: RecommendationContent; // This matches the C# JSONB mapping
    version: number;
    created_at: string;
}

export default function RecommendationsPage() {
    const params = useParams();
    const router = useRouter();

    // --- State ---
    const [isLoadingButtons, setIsLoadingButtons] = useState<boolean>(false);
    const [recommendations, setRecommendations] = useState<DBRecommendation[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Helper: Get Clean ID
    const getCleanId = () => {
        const rawParam = params?.d || params?.id;
        if (!rawParam) return null;
        const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        return decodeURIComponent(rawId).replace(/\s/g, '');
    };
    const cleanId = getCleanId();

    // ---------------------------------------------------------
    // 1. Fetch Recommendations on Load
    // ---------------------------------------------------------
    useEffect(() => {
        const fetchData = async () => {
            if (!cleanId) return;

            try {
                // Fetch type='idea_check' (or change to 'document_review' if this page is for documents)
                const response = await fetch(`https://localhost:7155/api/Recommendations/${cleanId}/idea_check`);

                if (response.ok) {
                    const data: DBRecommendation[] = await response.json();
                    setRecommendations(data);
                }
            } catch (error) {
                console.error("Error fetching recommendations:", error);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [cleanId]);

    // ---------------------------------------------------------
    // 2. Logic: Complete Stage
    // ---------------------------------------------------------
    const handleComplete = async () => {
        setIsLoadingButtons(true);
        if (!cleanId) return;

        try {
            // Get current status to preserve other flags
            const getRes = await fetch(`https://localhost:7155/api/StartupWorkflow/${cleanId}`);
            let currentData = { ideaCheck: false, marketResearch: false, evaluation: false, recommendation: false, documents: false, pitchDeck: false };
            if (getRes.ok) {
                const json = await getRes.json();
                currentData = {
                    ideaCheck: json.ideaCheck || json.IdeaCheck,
                    marketResearch: json.marketResearch || json.MarketResearch,
                    evaluation: json.evaluation || json.Evaluation,
                    recommendation: json.recommendation || json.Recommendation,
                    documents: json.documents || json.Documents,
                    pitchDeck: json.pitchDeck || json.PitchDeck,
                };
            }

            const updatePayload = {
                StartupId: cleanId,
                IdeaCheck: currentData.ideaCheck,
                MarketResearch: currentData.marketResearch,
                Evaluation: currentData.evaluation,
                Recommendation: true, // <--- Set this to TRUE
                Documents: currentData.documents,
                PitchDeck: currentData.pitchDeck
            };

            await fetch(`https://localhost:7155/api/StartupWorkflow/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            router.push(`/founder/startup/${cleanId}`);

        } catch (error) {
            console.error("Error completing stage:", error);
        } finally {
            setIsLoadingButtons(false);
        }
    };

    // ---------------------------------------------------------
    // 3. Logic: Loop Back (Reset)
    // ---------------------------------------------------------
    const handleLoopBack = async () => {
        setIsLoadingButtons(true);
        if (!cleanId) return;

        try {
            // Reset ALL to false to force restart
            const resetPayload = {
                StartupId: cleanId,
                IdeaCheck: false,
                MarketResearch: false,
                Evaluation: false,
                Recommendation: false,
                Documents: false,
                PitchDeck: false
            };

            await fetch(`https://localhost:7155/api/StartupWorkflow/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resetPayload),
            });

            router.push(`/founder/startup/${cleanId}/idea-check`);

        } catch (error) {
            console.error("Error looping back:", error);
        } finally {
            setIsLoadingButtons(false);
        }
    };

    // Helper for Priority Colors (Based on key phrases in the text)
    const getPriorityColor = (text: string) => {
        if (text.includes("High") || text.includes("Critical") || text.includes("Risk")) return "text-red-600 bg-red-50 border-red-200";
        if (text.includes("Medium") || text.includes("Moderate")) return "text-yellow-600 bg-yellow-50 border-yellow-200";
        return "text-green-600 bg-green-50 border-green-200";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${cleanId}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">
                                ✨ Recommendations & Refinement
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Stage 5 of 6 - Improve your startup
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">

                    {/* Generate Button (Static for now, hooks into AI later) */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="mb-6 border-2 border-[#FFD95D]">
                            <CardHeader className="bg-gradient-to-r from-[#FFD95D]/20 to-transparent">
                                <CardTitle className="text-[#576238] flex items-center gap-2">
                                    <Sparkles className="h-5 w-5" />
                                    Generate New Recommendations
                                </CardTitle>
                                <CardDescription>
                                    Get AI-powered suggestions based on your latest evaluation
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-center space-y-4">
                                    <div className="text-6xl mb-4">💡</div>
                                    <p className="text-muted-foreground mb-6">
                                        Generate personalized recommendations to strengthen your
                                        startup and address weaknesses
                                    </p>
                                    <Button className="bg-[#576238] hover:bg-[#6b7c3f]" size="lg">
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        Generate Recommendations
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Recommendations History List */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="text-[#576238]">Recommendations History</CardTitle>
                                <CardDescription>Track iterations and improvements</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoadingData ? (
                                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#576238]" /></div>
                                ) : recommendations.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground border-dashed border-2 rounded">
                                        No recommendations found. Generate one to start!
                                    </div>
                                ) : (
                                    recommendations.map((rec) => (
                                        <div key={rec.rid} className="space-y-4 mb-8 border-b pb-8 last:border-0 last:pb-0">
                                            {/* Version Header */}
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#576238] text-lg">Version {rec.version}</span>
                                                    <p className="text-sm text-muted-foreground">
                                                        Generated on {new Date(rec.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            
                                            </div>

                                            {/* Summary */}
                                            <div className="bg-gray-50 p-4 rounded-lg border">
                                                <p className="text-sm text-gray-700 italic">"{rec.content.summary}"</p>
                                            </div>

                                            {/* Key Points List */}
                                            <div className="space-y-3">
                                                <h4 className="font-semibold text-sm text-[#576238]">Key Findings:</h4>
                                                {rec.content.keyPoints?.map((point, index) => (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className="p-3 rounded-lg border hover:border-[#FFD95D] transition-all bg-white flex justify-between items-start gap-4"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(point)}`}>
                                                                    Insight
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-700">{point}</p>
                                                        </div>
                                                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-1" />
                                                    </motion.div>
                                                ))}
                                            </div>

                                            {/* Action Plan */}
                                            {rec.content.actionPlan && (
                                                <div className="mt-4 p-4 bg-[#FFD95D]/10 rounded-lg border border-[#FFD95D]/30">
                                                    <h4 className="font-semibold text-sm text-[#576238] mb-2 flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4" /> Recommended Action Plan
                                                    </h4>
                                                    <p className="text-sm whitespace-pre-line text-gray-800">{rec.content.actionPlan}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-6 flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <Button
                            size="lg"
                            variant="outline"
                            className="font-semibold"
                            onClick={handleLoopBack}
                            disabled={isLoadingButtons}
                        >
                            {isLoadingButtons ? <Loader2 className="animate-spin" /> : (
                                <>
                                    <RefreshCw className="mr-2 h-5 w-5" />
                                    Loop Back to Idea Stage
                                </>
                            )}
                        </Button>

                        <Button
                            size="lg"
                            className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold"
                            onClick={handleComplete}
                            disabled={isLoadingButtons}
                        >
                            {isLoadingButtons ? <Loader2 className="animate-spin" /> : "Complete & Continue"}
                        </Button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}