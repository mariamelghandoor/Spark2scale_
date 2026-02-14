"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Sparkles, CheckCircle2, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { recommendationService, DBRecommendation } from "@/services/recommendationService"; // Adjust import path
import { startupService } from "@/services/startupService";

export default function RecommendationsPage() {
    const params = useParams();
    const router = useRouter();

    // --- State ---
    const [isLoadingButtons, setIsLoadingButtons] = useState<boolean>(false);
    const [recommendations, setRecommendations] = useState<DBRecommendation[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [userRole, setUserRole] = useState<string>("Viewer");

    // Helper: Get Clean ID
    const getCleanId = () => {
        const rawParam = params?.d || params?.id;
        if (!rawParam) return null;
        const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        return decodeURIComponent(rawId).replace(/\s/g, '');
    };
    const cleanId = getCleanId();

    // ---------------------------------------------------------
    // 1. Fetch Data
    // ---------------------------------------------------------
    useEffect(() => {
        const fetchData = async () => {
            if (!cleanId) return;
            setIsLoadingData(true);
            try {
                const [data, startupDetails] = await Promise.all([
                    recommendationService.getRecommendations(cleanId),
                    startupService.getById(cleanId)
                ]);
                setRecommendations(data);
                if (startupDetails) setUserRole(startupDetails.current_role || "Viewer");
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [cleanId]);

    // ---------------------------------------------------------
    // 2. Data Splitting Logic
    // ---------------------------------------------------------
    const activeRecommendation = recommendations.find(r => r.is_current === true);

    // ---------------------------------------------------------
    // 3. Workflow Actions
    // ---------------------------------------------------------
    const handleComplete = async () => {
        if (!cleanId) return;
        setIsLoadingButtons(true);
        const success = await recommendationService.completeStage(cleanId);
        if (success) {
            router.push(`/founder/startup/${cleanId}`);
        }
        setIsLoadingButtons(false);
    };

    const handleLoopBack = async () => {
        if (!cleanId) return;
        setIsLoadingButtons(true);
        const success = await recommendationService.loopBackToStart(cleanId);
        if (success) {
            router.push(`/founder/startup/${cleanId}/idea-check`);
        }
        setIsLoadingButtons(false);
    };

    const handleRegenerate = async () => {
        if (!cleanId) return;
        setIsLoadingButtons(true);
        const success = await recommendationService.regenerateRecommendation(cleanId);
        if (success) {
            window.location.reload();
        }
        setIsLoadingButtons(false);
    };

    // ---------------------------------------------------------
    // 4. Helper UI Functions
    // ---------------------------------------------------------
    const getPriorityColor = (text: string) => {
        if (text.includes("High") || text.includes("Critical") || text.includes("Risk")) return "text-red-600 bg-red-50 border-red-200";
        if (text.includes("Medium") || text.includes("Moderate")) return "text-yellow-600 bg-yellow-50 border-yellow-200";
        return "text-green-600 bg-green-50 border-green-200";
    };

    const RecommendationView = ({ data }: { data: DBRecommendation }) => (
        <Card className="mb-6 border-2 border-[#576238] shadow-md">
            <CardHeader className="bg-gradient-to-r from-[#576238]/5 to-transparent pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-[#576238]">Current Recommendation</CardTitle>
                        <CardDescription>Generated on {new Date(data.created_at).toLocaleDateString()}</CardDescription>
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">Active Strategy</div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="bg-white p-4 rounded-lg border mb-4 shadow-sm">
                    <p className="text-sm italic text-gray-700">"{data.content.summary}"</p>
                </div>

                <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-[#576238]">Key Findings:</h4>
                    {data.content.keyPoints?.map((point, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                            className="flex items-start gap-3 p-3 rounded-lg bg-white border hover:border-[#FFD95D] transition-all"
                        >
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border mb-1 inline-block ${getPriorityColor(point)}`}>Insight</span>
                                <p className="text-sm text-gray-800">{point}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {data.content.actionPlan && (
                    <div className="mt-4 p-4 bg-[#FFD95D]/10 rounded-lg border border-[#FFD95D]/30">
                        <h4 className="font-semibold text-sm text-[#576238] flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4" /> Action Plan
                        </h4>
                        <p className="text-sm whitespace-pre-line text-gray-800">{data.content.actionPlan}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    // ---------------------------------------------------------
    // 5. Main Render
    // ---------------------------------------------------------
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${cleanId}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">✨ Recommendations & Refinement</h1>
                            <p className="text-sm text-muted-foreground">Stage 5 of 6 - Improve your startup • {userRole} View</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">

                    {isLoadingData ? (
                        <div className="text-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin mx-auto text-[#576238] mb-4" />
                            <p className="text-muted-foreground">Loading analysis...</p>
                        </div>
                    ) : (
                        <>
                            {/* SECTION A: ACTIVE STATE OR GENERATE STATE */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                {!activeRecommendation && userRole === 'Founder' ? (
                                    // A1. NO ACTIVE DATA -> SHOW GENERATE BUTTON ("Brand New" Look)
                                    <Card className="mb-8 border-2 border-[#FFD95D] shadow-lg">
                                        <CardHeader className="bg-gradient-to-r from-[#FFD95D]/20 to-transparent">
                                            <CardTitle className="text-[#576238] flex items-center gap-2">
                                                <Sparkles className="h-5 w-5" /> Generate New Recommendations
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-8 pb-8 text-center">
                                            <div className="text-7xl mb-6">💡</div>
                                            <h3 className="text-lg font-semibold text-[#576238] mb-2">Ready for Fresh Insights?</h3>
                                            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                                                You've updated your startup idea! Generate a new AI analysis to see how these changes impact your strategy and next steps.
                                            </p>
                                            <Button className="bg-[#576238] hover:bg-[#6b7c3f] px-8 py-6 text-lg h-auto" size="lg">
                                                <Sparkles className="mr-2 h-5 w-5" />
                                                Generate Analysis
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : !activeRecommendation ? (
                                    <div className="text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed">
                                        <p className="text-gray-500">No recommendations generated yet.</p>
                                    </div>
                                ) : (
                                    // A2. ACTIVE DATA EXISTS -> SHOW RESULTS
                                    <RecommendationView data={activeRecommendation} />
                                )}
                            </motion.div>

                            {/* SECTION B: ACTION BUTTONS (Only if Active exists) */}
                            {activeRecommendation && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                                    className="my-8 flex flex-col sm:flex-row gap-4 justify-center"
                                >
                                    <Button
                                        size="lg" variant="outline"
                                        onClick={handleLoopBack} disabled={isLoadingButtons || userRole !== 'Founder'}
                                        className="border-gray-300 text-gray-600 hover:bg-gray-100"
                                    >
                                        {isLoadingButtons ? <Loader2 className="animate-spin" /> : (
                                            <><RotateCcw className="mr-2 h-4 w-4" /> Loop Back</>
                                        )}
                                    </Button>

                                    {/* REGENERATE BUTTON */}
                                    <Button
                                        size="lg" variant="outline"
                                        onClick={handleRegenerate} disabled={isLoadingButtons || userRole !== 'Founder'}
                                        className="border-[#576238] text-[#576238] hover:bg-[#576238]/10"
                                    >
                                        {isLoadingButtons ? <Loader2 className="animate-spin" /> : (
                                            <><RefreshCw className="mr-2 h-4 w-4" /> Regenerate</>
                                        )}
                                    </Button>

                                    <Button
                                        size="lg"
                                        className="bg-[#FFD95D] text-black hover:bg-[#ffe89a] font-semibold"
                                        onClick={handleComplete} disabled={isLoadingButtons || userRole !== 'Founder'}
                                    >
                                        {isLoadingButtons ? <Loader2 className="animate-spin" /> : "Complete & Continue"}
                                    </Button>
                                </motion.div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}