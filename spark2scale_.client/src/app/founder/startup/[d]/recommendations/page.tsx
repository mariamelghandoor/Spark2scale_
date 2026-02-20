"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Sparkles, Bot, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { recommendationService, DBRecommendation } from "@/services/recommendationService";
import { startupService } from "@/services/startupService";
import { evaluationService } from "@/services/evaluationService";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";

export default function RecommendationsPage() {
    const params = useParams();
    const [isGenerating, setIsGenerating]     = useState(false);
    const [recommendation, setRecommendation] = useState<DBRecommendation | null>(null);

    // -----------------------------------------------------------------------
    // Derive clean startup ID from URL params
    // -----------------------------------------------------------------------
    const getCleanId = () => {
        const rawParam = params?.d ?? params?.id;
        if (!rawParam) return null;
        const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        return decodeURIComponent(rawId).replace(/\s/g, "");
    };
    const cleanId = getCleanId();

    // -----------------------------------------------------------------------
    // Generate / Regenerate analysis
    // -----------------------------------------------------------------------
    const handleGenerate = async () => {
        if (!cleanId) return;
        setIsGenerating(true);
        try {
            const [startupData, evalContent] = await Promise.all([
                startupService.getById(cleanId),
                evaluationService.getEvaluationContent(cleanId),
            ]);

            const aiResult = await recommendationService.generateAIRecommendation(startupData, evalContent);
            if (!aiResult) {
                alert("Failed to generate recommendations. Please try again.");
                return;
            }

            const savedRec = await recommendationService.saveRecommendation(cleanId, aiResult);
            const savedDoc = await recommendationService.saveToDocuments(cleanId, aiResult);

            if (savedRec) {
                if (!savedDoc) {
                    alert("Analysis generated but failed to save to Documents.");
                }
                // Fetch the freshly-saved record from the DB so the card
                // displays the stored `created_at` timestamp correctly.
                const data = await recommendationService.getRecommendations(cleanId);
                const latest =
                    data.find(
                        r => r.IsCurrent === true ||
                            (r as any).isCurrent === true ||
                            (r as any).is_current === true,
                    ) ?? data[0] ?? null;
                setRecommendation(latest);
            } else {
                alert("Analysis generated but failed to save to server.");
            }
        } catch (error) {
            console.error("AI Generation failed:", error);
            alert("An error occurred while communicating with the AI agent.");
        } finally {
            setIsGenerating(false);
        }
    };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[#F4F1EA] font-sans">
            {/* ── Top bar ── */}
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${cleanId}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">Recommendation Agent</h1>
                            <p className="text-sm text-muted-foreground">AI-Powered Strategic Analysis</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                {/* ── Hero / Generate card ── */}
                <div className="bg-white rounded-xl border shadow-sm p-8 text-center mb-8">
                    <div className="bg-[#576238]/10 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                        {isGenerating
                            ? <Sparkles className="h-8 w-8 text-[#576238] animate-spin" />
                            : <Bot className="h-8 w-8 text-[#576238]" />}
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {recommendation
                            ? "Recommendation Agent Analysis Complete"
                            : "Recommendation Agent Ready"}
                    </h2>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                        {recommendation
                            ? "The agent has analysed your startup. You can view, download, or regenerate the report below."
                            : "Activate the Recommendation Agent to generate a comprehensive strategy and scorecard for your startup."}
                    </p>

                    <Button
                        className="bg-[#576238] hover:bg-[#464f2d] text-white px-6"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analysing…
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {recommendation ? "Regenerate Analysis" : "Generate Analysis"}
                            </>
                        )}
                    </Button>
                </div>

                {/* ── Recommendation card — only shown after the user generates ── */}
                {recommendation && (
                    <RecommendationCard
                        recommendation={recommendation}
                        startupId={cleanId ?? ""}
                    />
                )}
            </main>
        </div>
    );
}
