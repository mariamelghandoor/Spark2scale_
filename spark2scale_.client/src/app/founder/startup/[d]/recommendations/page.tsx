"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Sparkles, Bot, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { recommendationService, DBRecommendation } from "@/services/recommendationService";
import { startupService } from "@/services/startupService";
import { evaluationService } from "@/services/evaluationService";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";

interface NamedRecommendation {
    rec:  DBRecommendation;
    name: string;
    /** DB primary key — used for deletion; may be undefined for local-only items */
    rid?: string;
}

// ── Map raw Supabase snake_case row to DBRecommendation ──────────────────────
function mapRaw(raw: any, index: number, total: number): NamedRecommendation {
    const rec: DBRecommendation = {
        Id:        raw.rid   ?? raw.Id    ?? `db-${index}`,
        StartupId: raw.startup_id ?? raw.StartupId ?? "",
        Type:      raw.type  ?? raw.Type  ?? "recommendation",
        Content:   raw.content ?? raw.Content,
        Version:   raw.version ?? raw.Version ?? index + 1,
        CreatedAt: raw.created_at ?? raw.CreatedAt ?? "",
        IsCurrent: raw.is_current ?? raw.IsCurrent ?? false,
    };
    return {
        rec,
        name: `Recommendation ${total - index}`,
        rid:  raw.rid ?? undefined,
    };
}

export default function RecommendationsPage() {
    const params  = useParams();
    const router  = useRouter();

    // ── Stable startup ID (derived once from URL params) ────────────────────
    const [cleanId] = useState<string | null>(() => {
        const rawParam = params?.d ?? params?.id;
        if (!rawParam) return null;
        const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        return decodeURIComponent(rawId).replace(/\s/g, "");
    });

    // ── Page states ──────────────────────────────────────────────────────────
    const [isLoadingHistory,  setIsLoadingHistory]  = useState(true);
    const [isGenerating,      setIsGenerating]      = useState(false);
    const [isMarkingComplete, setIsMarkingComplete] = useState(false);
    const [isCompleted,       setIsCompleted]       = useState(false);
    /** true when startup_workflow.recommendation is already true in the DB */
    const [isAlreadyComplete, setIsAlreadyComplete] = useState(false);
    const [items,             setItems]             = useState<NamedRecommendation[]>([]);

    // ── Load history on mount ────────────────────────────────────────────────
    useEffect(() => {
        if (!cleanId) { setIsLoadingHistory(false); return; }

        (async () => {
            try {
                const wf = await recommendationService._getWorkflowState(cleanId);
                if (wf.recommendation) {
                    setIsAlreadyComplete(true);
                    const recs: any[] = await recommendationService.getRecommendations(cleanId);
                    if (recs.length > 0) {
                        setItems(recs.map((r, i) => mapRaw(r, i, recs.length)));
                    }
                }
            } catch (e) {
                console.error("[RecommendationsPage] Failed to load history:", e);
            } finally {
                setIsLoadingHistory(false);
            }
        })();
    }, [cleanId]);

    // ── Generate ─────────────────────────────────────────────────────────────
    const handleGenerate = async () => {
        if (!cleanId) return;
        setIsGenerating(true);
        try {
            const [startupData, evalContent] = await Promise.all([
                startupService.getById(cleanId),
                evaluationService.getEvaluationContent(cleanId),
            ]);

            const aiResult = await recommendationService.generateAIRecommendation(startupData, evalContent);
            if (!aiResult) { alert("Failed to generate recommendations. Please try again."); return; }

            const [rid] = await Promise.all([
                recommendationService.saveRecommendation(cleanId, aiResult),
                recommendationService.saveToDocuments(cleanId, aiResult),
            ]);

            if (rid) {
                const nextNumber = items.length + 1;
                const newEntry: NamedRecommendation = {
                    name: `Recommendation ${nextNumber}`,
                    rid:  rid !== "saved" ? rid : undefined,
                    rec: {
                        Id:        rid ?? `local-${nextNumber}`,
                        StartupId: cleanId,
                        Type:      "recommendation",
                        Content:   aiResult,
                        Version:   nextNumber,
                        CreatedAt: new Date().toISOString(),
                        IsCurrent: true,
                    },
                };
                setItems(prev => [newEntry, ...prev]);
                // A new report was generated — re-enable "Mark as Complete" regardless
                // of whether the stage was already marked complete before.
                setIsCompleted(false);
                setIsAlreadyComplete(false);
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

    // ── Delete a specific recommendation ─────────────────────────────────────
    const handleDelete = useCallback(async (entry: NamedRecommendation) => {
        if (entry.rid) {
            const ok = await recommendationService.deleteRecommendation(entry.rid);
            if (!ok) { alert("Failed to delete the report. Please try again."); return; }
        }
        // Remove from list and re-number
        setItems(prev => {
            const filtered = prev.filter(it => it !== entry);
            return filtered.map((it, i) => ({
                ...it,
                name: `Recommendation ${filtered.length - i}`,
            }));
        });
    }, []);

    // ── Mark as Complete ──────────────────────────────────────────────────────
    const handleMarkComplete = async () => {
        if (!cleanId || isCompleted) return;
        setIsMarkingComplete(true);
        try {
            const success = await recommendationService.completeStage(cleanId);
            if (!success) throw new Error("The server returned an error while updating the workflow.");
            setIsCompleted(true);
            setIsAlreadyComplete(true);
            setTimeout(() => router.push(`/founder/startup/${cleanId}`), 700);
        } catch (err) {
            console.error("Failed to mark stage complete:", err);
            alert("Could not update workflow. Please try again.");
        } finally {
            setIsMarkingComplete(false);
        }
    };

    const hasItems        = items.length > 0;
    const stageIsComplete = isAlreadyComplete || isCompleted;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#F4F1EA] font-sans pb-24">

            {/* ── Top navigation bar ── */}
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href={`/founder/startup/${cleanId}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-[#576238]">Recommendation Agent</h1>
                        <p className="text-sm text-muted-foreground">AI-Powered Strategic Analysis</p>
                    </div>
                    {/* Stage-complete badge in top bar */}
                    {stageIsComplete && (
                        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Stage Completed
                        </span>
                    )}
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">

                {/* ── Loading skeleton ── */}
                {isLoadingHistory && (
                    <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
                        <Loader2 className="h-8 w-8 text-[#576238] animate-spin mx-auto mb-3" />
                        <p className="text-sm text-gray-400">Loading your recommendation history…</p>
                    </div>
                )}

                {/* ── Hero / Generate card (shown once history is loaded) ── */}
                {!isLoadingHistory && (
                    <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
                        <div className="bg-[#576238]/10 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                            {isGenerating
                                ? <Sparkles className="h-8 w-8 text-[#576238] animate-spin" />
                                : stageIsComplete
                                    ? <CheckCircle2 className="h-8 w-8 text-green-600" />
                                    : <Bot className="h-8 w-8 text-[#576238]" />}
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {stageIsComplete
                                ? "Recommendation Stage Complete"
                                : hasItems
                                    ? "Recommendation Agent Analysis Complete"
                                    : "Recommendation Agent Ready"}
                        </h2>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">
                            {stageIsComplete
                                ? "This stage has been marked as complete. You can still regenerate a new analysis and review or delete previous reports."
                                : hasItems
                                    ? "The agent has analysed your startup. View, download, or regenerate a new report below. When satisfied, mark this stage as complete."
                                    : "Activate the Recommendation Agent to generate a comprehensive strategy and scorecard for your startup."}
                        </p>

                        <Button
                            className="bg-[#576238] hover:bg-[#464f2d] text-white px-6"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analysing…</>
                            ) : (
                                <><RefreshCw className="mr-2 h-4 w-4" />
                                {hasItems ? "Regenerate Analysis" : "Generate Analysis"}</>
                            )}
                        </Button>
                    </div>
                )}

                {/* ── Recommendation history (newest first) ── */}
                {!isLoadingHistory && hasItems && (
                    <div className="space-y-4">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1">
                            {items.length} Report{items.length > 1 ? "s" : ""} · newest first
                        </p>
                        {items.map(item => (
                            <RecommendationCard
                                key={item.rec.Id}
                                recommendation={item.rec}
                                startupId={cleanId ?? ""}
                                name={item.name}
                                onDelete={() => handleDelete(item)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* ── Fixed bottom bar ─────────────────────────────────────────────
                • Grey + disabled:   no reports generated yet
                • Mustard + active:  reports exist but stage not yet marked complete
                • Green + disabled:  already marked complete (this session or from DB)   */}
            <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center
                            bg-white/80 backdrop-blur border-t border-gray-200
                            py-4 px-4 shadow-lg">
                <Button
                    size="lg"
                    disabled={!hasItems || isMarkingComplete || stageIsComplete}
                    onClick={handleMarkComplete}
                    className={`px-12 font-semibold text-base transition-all duration-300 ${
                        stageIsComplete
                            ? "bg-green-600 hover:bg-green-600 text-white cursor-default"
                            : hasItems
                                ? "bg-[#ffd95d] hover:bg-[#f0cc40] text-[#2c3e50] shadow-md"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                    }`}
                >
                    {isMarkingComplete ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Saving…</>
                    ) : stageIsComplete ? (
                        <><CheckCircle2 className="mr-2 h-5 w-5" />Stage Completed</>
                    ) : (
                        "Mark as Complete & Continue"
                    )}
                </Button>
            </div>
        </div>
    );
}
