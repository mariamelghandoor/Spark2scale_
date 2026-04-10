"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, PlayCircle, CheckCircle, FileText, Loader2, Trash2, AlertTriangle, Target, Info } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { evaluationService, EvaluationDocument } from "@/services/evaluationService";
import { startupService } from "@/services/startupService";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

// Import the Lego Loader
import LegoResearchLoader from "@/components/lego/LegoResearchLoader";

/* =========================================
   FOUNDER VIEW COMPONENT
   ========================================= */
const FounderView = ({ data }: { data: any }) => {
    const content = data.Content;
    const dimensionAnalysis = content["Dimension Analysis"] || [];
    const [activeDimension, setActiveDimension] = useState(dimensionAnalysis[0]?.dimension || "Problem");

    const chartData = useMemo(() => {
        return dimensionAnalysis.map((dim: any) => ({
            subject: dim.dimension.toUpperCase(),
            originalName: dim.dimension,
            score: dim.score,
            fullMark: 5,
        }));
    }, [dimensionAnalysis]);

    const activeData = useMemo(() => {
        return dimensionAnalysis.find((d: any) => d.dimension === activeDimension) || dimensionAnalysis[0];
    }, [activeDimension, dimensionAnalysis]);

    const getScoreColor = (score: number) => {
        if (score >= 4) return "text-emerald-600 bg-emerald-50 border-emerald-200";
        if (score >= 3) return "text-blue-600 bg-blue-50 border-blue-200";
        if (score >= 2) return "text-amber-600 bg-amber-50 border-amber-200";
        return "text-rose-600 bg-rose-50 border-rose-200";
    };

    const getScoreBadgeColor = (score: number) => {
        if (score >= 4) return "bg-emerald-500";
        if (score >= 3) return "bg-blue-500";
        if (score >= 2) return "bg-amber-500";
        return "bg-rose-500";
    };

    if (!content) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-left">
            {/* Executive Summary & Priorities */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="text-[#576238] w-6 h-6" />
                        <h2 className="text-xl font-bold text-slate-800">Founder Feedback Summary</h2>
                    </div>
                    <p className="text-slate-600 text-lg leading-relaxed font-serif">{content["Executive Summary"]}</p>

                    <div className="mt-8">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                            <Target className="w-4 h-4" /> Top 3 Priorities to Fix
                        </h3>
                        <div className="grid gap-3">
                            {(content["Top 3 Priorities"] || []).map((priority: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 bg-[#F4F1EA]/50 p-4 rounded-xl border border-[#F4F1EA]">
                                    <div className="flex-shrink-0 w-6 h-6 bg-[#F4F1EA] text-[#576238] rounded-full flex items-center justify-center font-bold text-sm">
                                        {i + 1}
                                    </div>
                                    <p className="text-slate-700 font-medium">{priority}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-[#576238] rounded-2xl p-6 md:p-8 text-white shadow-md flex flex-col justify-center">
                    <h3 className="text-[#FFD95D]/80 font-semibold uppercase tracking-wider text-sm mb-2">Evaluation Context</h3>
                    <p className="text-xl font-light leading-relaxed mb-6">
                        This report provides direct, constructive <span className="font-bold text-[#FFD95D]">"Tough Love"</span> to help you identify critical blind spots before pitching.
                    </p>
                    <div className="bg-[#4a532f] p-4 rounded-xl text-sm border border-[#FFD95D]/20">
                        <p className="flex items-start gap-2">
                            <Info className="w-5 h-5 text-[#FFD95D] flex-shrink-0" />
                            <span>Scores below 2.0 represent existential risks or "deal-breakers" that must be resolved.</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Interactive Deep Dive */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Visual Map Column */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col h-full">
                    <div className="mb-5 text-center sm:text-left">
                        <h2 className="text-lg font-bold text-slate-800 mb-1">Dimension Map</h2>
                        <p className="text-sm text-slate-500">Select a dimension to explore details.</p>
                    </div>

                    {/* MOVED BUTTONS HERE: Top-down user flow */}
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-6">
                        {chartData.map((dim: any) => {
                            const isActive = activeDimension === dim.originalName;
                            return (
                                <button key={dim.originalName} onClick={() => setActiveDimension(dim.originalName)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${isActive ? 'bg-[#576238] text-white border-[#576238] scale-105 shadow-md' : 'bg-white text-[#576238] border-slate-200 hover:bg-[#F4F1EA]'}`}
                                >
                                    {dim.originalName}
                                    <span className={`ml-1.5 inline-block w-2 h-2 rounded-full ${getScoreBadgeColor(dim.score)}`}></span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Chart takes the rest of the space below the buttons */}
                    <div className="flex-grow w-full min-h-[280px] mt-auto flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData} onClick={(e) => { if (e?.activePayload?.length > 0) setActiveDimension(e.activePayload[0].payload.originalName); }}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [`${value} / 5`, 'Score']} />
                                <Radar name="Score" dataKey="score" stroke="#576238" strokeWidth={2} fill="#FFD95D" fillOpacity={0.5} activeDot={{ r: 6, fill: '#576238', stroke: '#fff', strokeWidth: 2 }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Details Column */}
                <div className="lg:col-span-7 flex flex-col">
                    {activeData && (
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 flex-grow relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 capitalize mb-2">{activeData.dimension}</h2>
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="font-medium text-slate-500 uppercase tracking-wider">Confidence:</span>
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold">{activeData.confidence_level}</span>
                                    </div>
                                </div>
                                <div className={`flex flex-col items-end p-3 rounded-xl border ${getScoreColor(activeData.score)}`}>
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Score</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black leading-none">{activeData.score}</span>
                                        <span className="text-lg opacity-60 font-medium">/5</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8 relative z-10">
                                <section>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Info className="w-4 h-4" /> Justification</h3>
                                    <p className="text-slate-700 leading-relaxed text-lg bg-[#F4F1EA]/40 p-5 rounded-xl border border-[#F4F1EA] font-serif">{activeData.justification}</p>
                                </section>

                                {activeData.red_flags && activeData.red_flags.length > 0 && (
                                    <section>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-rose-500 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Critical Risks (Red Flags)</h3>
                                        <div className="space-y-3">
                                            {activeData.red_flags.map((flag: string, idx: number) => (
                                                <div key={idx} className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl flex gap-3 items-start group">
                                                    <div className="mt-0.5 w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-sm"><span className="text-xs font-bold">!</span></div>
                                                    <p className="text-slate-800 text-sm leading-relaxed">{flag}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


/* =========================================
   MAIN APP / PAGE COMPONENT
   ========================================= */
export default function EvaluatePage() {
    const params = useParams();
    const startupId = params?.d as string;

    const [evalDoc, setEvalDoc] = useState<EvaluationDocument | null>(null);
    const [isWorkflowComplete, setIsWorkflowComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userRole, setUserRole] = useState<string>("Viewer");
    const [startupStage, setStartupStage] = useState<string>("Pre-Seed");

    useEffect(() => {
        const loadData = async () => {
            if (!startupId) return;
            setIsLoading(true);
            try {
                const [doc, isComplete, startupDetails] = await Promise.all([
                    evaluationService.getCurrentEvaluation(startupId).catch(() => null),
                    evaluationService.getWorkflowStatus(startupId).catch(() => false),
                    startupService.getById(startupId).catch(() => null)
                ]);

                setEvalDoc(doc);
                if (startupDetails) {
                    setUserRole(startupDetails.current_role || "Viewer");
                    setStartupStage(startupDetails.startup_stage || "Pre-Seed");
                }
                setIsWorkflowComplete(isComplete || false);
            } catch (error) {
                console.error("Failed to load startup data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [startupId]);

    const handleRunEvaluation = async () => {
        setIsGenerating(true);
        try {
            const success = await evaluationService.generateEvaluation(startupId);
            if (success) {
                const newDoc = await evaluationService.getCurrentEvaluation(startupId);
                setEvalDoc(newDoc);
                setIsWorkflowComplete(false);
            }
        } catch (error) {
            console.error("Evaluation generation failed:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCompleteStage = async () => {
        if (!startupId) return;
        try {
            const success = await evaluationService.markAsComplete(startupId);
            if (success) setIsWorkflowComplete(true);
        } catch (error) {
            console.error("Failed to mark workflow as complete:", error);
        }
    };

    const handleDelete = async () => {
        if (!evalDoc?.did) return;
        if (confirm("Are you sure you want to delete this evaluation report?")) {
            setIsDeleting(true);
            try {
                const success = await evaluationService.deleteEvaluation(evalDoc.did);
                if (success) {
                    setEvalDoc(null);
                    setIsWorkflowComplete(false);
                }
            } catch (error) {
                console.error("Failed to delete", error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // =========================================================================
    // BULLETPROOF PARSER: Ignores spaces, casing, and ASP.NET mutations
    // =========================================================================
    const findKey = (obj: any, target: string) => {
        if (!obj || typeof obj !== 'object') return null;
        const normalizedTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const key in obj) {
            if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedTarget) {
                return obj[key];
            }
        }
        return null;
    };

    let parsedData: any = null;

    // Catch json_response regardless of how C# serialized it
    const rawJson = evalDoc?.json_response || (evalDoc as any)?.jsonResponse || (evalDoc as any)?.JsonResponse;

    if (rawJson) {
        let temp = rawJson;
        for (let i = 0; i < 3; i++) { // Safely unpack nested strings up to 3 layers deep
            if (typeof temp === 'string') {
                try { temp = JSON.parse(temp); } catch { break; }
            }
        }
        parsedData = temp;
    }

    // Extract the raw payload
    let founderContent = null;
    if (parsedData) {
        const finalObj = findKey(parsedData, "finalreport") || parsedData;
        const founderObj = findKey(finalObj, "founderoutput") || finalObj;
        founderContent = findKey(founderObj, "content") || founderObj;
    }

    // Normalize the parsed payload so the UI component receives EXACTLY the schema it expects
    const normalizedFounderData = useMemo(() => {
        if (!founderContent) return null;

        const rawDimensions = findKey(founderContent, "dimensionanalysis") || [];
        const normalizedDimensions = rawDimensions.map((dim: any) => ({
            dimension: findKey(dim, "dimension") || "Unknown",
            score: findKey(dim, "score") || 0,
            confidence_level: findKey(dim, "confidencelevel") || "Unknown",
            justification: findKey(dim, "justification") || findKey(dim, "feedback") || "",
            red_flags: findKey(dim, "redflags") || []
        }));

        return {
            Content: {
                "Executive Summary": findKey(founderContent, "executivesummary") || "Summary unavailable.",
                "Top 3 Priorities": findKey(founderContent, "top3priorities") || [],
                "Dimension Analysis": normalizedDimensions,
                "Verdict": findKey(founderContent, "verdict") || "Pass",
                "Weighted Score": findKey(founderContent, "weightedscore") || 0
            }
        };
    }, [founderContent]);

    // Header Display Variables
    const verdict = normalizedFounderData?.Content?.Verdict || "EVALUATED";
    const rawScore = normalizedFounderData?.Content?.["Weighted Score"] || 0;
    const displayScore = typeof rawScore === 'number' ? rawScore.toFixed(1) : parseFloat(rawScore || "0").toFixed(1);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#F0EADC]"><Loader2 className="h-8 w-8 animate-spin text-[#576238]" /></div>;
    if (!startupId) return <div className="min-h-screen flex items-center justify-center bg-[#F0EADC]"><p className="text-red-500 font-bold">Error: No Startup ID provided in URL.</p></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
                <div className="flex w-full items-center justify-between px-6 md:px-12 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${startupId}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-xl font-bold text-[#576238] leading-tight flex items-center gap-2">
                                Evaluate
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Stage 4 of 6 - Get comprehensive evaluation • {userRole} View
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto">

                    {/* Loading State */}
                    {isGenerating && (
                        <div className="flex justify-center w-full py-12">
                            <LegoResearchLoader type="Evaluate" />
                        </div>
                    )}

                    {/* Empty State */}
                    {!evalDoc && userRole === 'Founder' && !isGenerating && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
                            <Card className="mb-6 border-2 border-[#FFD95D]">
                                <CardHeader className="bg-gradient-to-r from-[#FFD95D]/20 to-transparent">
                                    <CardTitle className="text-[#576238]">Run New Evaluation</CardTitle>
                                    <CardDescription>Get an AI-powered assessment of your startup's current state</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="text-center space-y-4">
                                        <div className="text-6xl mb-4">🎯</div>
                                        <p className="text-muted-foreground mb-6">Our AI will analyze your documents, market research, and business model.</p>
                                        <Button onClick={handleRunEvaluation} disabled={isGenerating} className="bg-[#576238] hover:bg-[#6b7c3f] min-w-[250px]" size="lg">
                                            {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlayCircle className="mr-2 h-5 w-5" />}
                                            {isGenerating ? "Analyzing Data..." : "Run Evaluation"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Dashboard / Inline Report State */}
                    {evalDoc && !isGenerating && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

                            {/* Clean Action Buttons Row (Replaces the Document Card) */}
                            <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-end gap-3 mb-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-[#F4F1EA] hover:bg-[#e8e4db] text-[#576238] border-none font-medium shadow-sm transition-colors"
                                    onClick={handleRunEvaluation}
                                    disabled={isGenerating || userRole !== 'Founder'}
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                                    {isGenerating ? "Regenerating..." : "Regenerate Evaluation"}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-[#F4F1EA] hover:bg-[#e8e4db] text-[#576238] border-none font-medium shadow-sm transition-colors"
                                    asChild
                                >
                                    <a href={evalDoc.current_path} target="_blank" download>
                                        <Download className="h-4 w-4 mr-2" /> Download PDF
                                    </a>
                                </Button>

                                {userRole === 'Founder' && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="bg-red-50 text-red-600 hover:text-red-700 hover:bg-red-100 border-none font-medium shadow-sm transition-colors"
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                        Delete Report
                                    </Button>
                                )}
                            </div>

                            {/* INLINED REPORT SECTION */}
                            {normalizedFounderData ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                                    {/* Score Summary Header */}
                                    <div className="bg-[#576238] text-white rounded-2xl px-6 py-6 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg border border-[#6b7c3f]">
                                        <div>
                                            <p className="text-xs uppercase tracking-widest text-[#FFD95D]/80 mb-1 font-sans font-semibold">Spark2Scale Evaluation</p>
                                            <h2 className="text-3xl font-bold font-sans">Founder Report</h2>
                                        </div>
                                        <div className="text-left md:text-right flex flex-col items-start md:items-end mt-4 md:mt-0">
                                            <div className="text-4xl font-black text-[#FFD95D] font-serif leading-none tracking-tighter">
                                                {displayScore} <span className="text-xl text-white/60 font-medium">/ 45</span>
                                            </div>
                                            <div className={`text-xs uppercase tracking-widest font-bold mt-2 px-3 py-1 rounded-md shadow-sm border ${verdict?.includes('Ready') ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' : 'bg-rose-500/20 text-rose-200 border-rose-500/30'}`}>
                                                {verdict}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main Content Render */}
                                    <FounderView data={normalizedFounderData} />

                                </div>
                            ) : (
                                <div className="flex items-center justify-center p-12 bg-white/60 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-sm max-w-4xl mx-auto">
                                    <div className="text-center">
                                        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3 opacity-80" />
                                        <p className="text-slate-600 font-medium">Could not process evaluation data. The report may be incomplete or still generating.</p>
                                    </div>
                                </div>
                            )}

                            {/* Completion Action */}
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="max-w-4xl mx-auto mt-12 text-center pt-8 border-t border-slate-200">
                                <Button size="lg" onClick={handleCompleteStage} disabled={isWorkflowComplete || userRole !== 'Founder'} className={`font-semibold shadow-md transition-all duration-300 min-w-[280px] h-14 text-base rounded-xl ${isWorkflowComplete ? "bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200" : "bg-[#FFD95D] hover:bg-[#f5cf53] text-slate-900"}`}>
                                    {isWorkflowComplete ? <><CheckCircle className="mr-2 h-6 w-6" /> Evaluation Stage Completed</> : "Mark Evaluation as Complete"}
                                </Button>
                            </motion.div>

                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}