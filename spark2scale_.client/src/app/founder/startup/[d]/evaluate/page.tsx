"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, PlayCircle, CheckCircle, FileText, Loader2, Eye, Trash2, AlertTriangle, Target } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { evaluationService, EvaluationDocument } from "@/services/evaluationService";
import { startupService } from "@/services/startupService";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function EvaluatePage() {
    const params = useParams();
    const startupId = params?.d as string;

    const [evalDoc, setEvalDoc] = useState<EvaluationDocument | null>(null);
    const [isWorkflowComplete, setIsWorkflowComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
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
    // SMART JSON PARSER: Target Founder Output Only
    // =========================================================================
    let parsedData: any = null;
    if (evalDoc?.json_response) {
        try {
            let temp = evalDoc.json_response;
            while (typeof temp === 'string') {
                temp = JSON.parse(temp);
            }
            parsedData = temp;
        } catch (e) {
            console.error("Failed to parse JSON response", e);
        }
    }

    // Extract ONLY the FOUNDER Content
    const founderContent = parsedData?.final_report?.founder_output?.Content || null;

    // Map fields directly from the Founder Content JSON structure
    const execSummary = founderContent?.["Executive Summary"] || "No executive summary available.";
    const verdict = founderContent?.["Verdict"] || "EVALUATED";

    const rawScore = founderContent?.["Weighted Score"] || 0;
    const displayScore = typeof rawScore === 'number' ? rawScore.toFixed(1) : parseFloat(rawScore).toFixed(1);

    const priorities = founderContent?.["Top 3 Priorities"] || [];
    const dimensionAnalysis = founderContent?.["Dimension Analysis"] || [];
    const scorecard = founderContent?.["Scorecard Grid"] || {};

    // Build Radar Chart Data from Scorecard Grid
    const radarData = Object.keys(scorecard).map(key => ({
        subject: key.toUpperCase(),
        score: scorecard[key] || 0,
        fullMark: 5
    }));

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#F0EADC]"><Loader2 className="h-8 w-8 animate-spin text-[#576238]" /></div>;
    if (!startupId) return <div className="min-h-screen flex items-center justify-center bg-[#F0EADC]"><p className="text-red-500 font-bold">Error: No Startup ID provided in URL.</p></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${startupId}`}>
                            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">🎯 Evaluate</h1>
                            <p className="text-sm text-muted-foreground">Stage 4 of 6 - Get comprehensive evaluation • {userRole} View</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* SCENARIO 1: No Document */}
                    {!evalDoc && userRole === 'Founder' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                                        {isGenerating && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-amber-600 font-medium mt-4 animate-pulse">This process takes about 2 to 3 minutes. <br />Please do not refresh or close this page.</motion.p>}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* SCENARIO 2: Document Exists - Show Small Card */}
                    {evalDoc && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className="flex flex-col items-end mb-4">
                                <Button variant="outline" onClick={handleRunEvaluation} disabled={isGenerating || userRole !== 'Founder'}>
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                                    {isGenerating ? "Regenerating..." : "Regenerate Evaluation"}
                                </Button>
                                {isGenerating && <p className="text-xs text-amber-600 mt-2 animate-pulse">Generating new AI reports (~2 mins). Do not refresh.</p>}
                            </div>

                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-[#F4F1EA] rounded-xl flex items-center justify-center text-[#576238]">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#576238] text-base">{evalDoc.document_name.replace('.pdf', '')}</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Generated {new Date(evalDoc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {startupStage}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline" size="sm"
                                        className="bg-[#F4F1EA] hover:bg-[#e8e4db] text-[#576238] border-none"
                                        onClick={() => setIsViewModalOpen(true)}
                                        disabled={!founderContent}
                                    >
                                        <Eye className="h-4 w-4 mr-2" /> View
                                    </Button>
                                    <Button variant="outline" size="sm" className="bg-[#F4F1EA] hover:bg-[#e8e4db] text-[#576238] border-none" asChild>
                                        <a href={evalDoc.current_path} target="_blank" download>
                                            <Download className="h-4 w-4 mr-2" /> PDF
                                        </a>
                                    </Button>
                                    {userRole === 'Founder' && (
                                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 ml-1" onClick={handleDelete} disabled={isDeleting}>
                                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-8 text-center pt-8 border-t border-gray-200">
                                <Button size="lg" onClick={handleCompleteStage} disabled={isWorkflowComplete || userRole !== 'Founder'} className={`font-semibold transition-all duration-300 min-w-[250px] ${isWorkflowComplete ? "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300" : "bg-[#FFD95D] hover:bg-[#ffe89a] text-black"}`}>
                                    {isWorkflowComplete ? <><CheckCircle className="mr-2 h-5 w-5" /> Evaluation Completed</> : "Complete Evaluation Stage"}
                                </Button>
                            </motion.div>
                        </motion.div>
                    )}
                </div>
            </main>

            {/* --- NATIVE WEB VIEW MODAL --- */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                {/* 👇 FIX: Updated width to max-w-[95vw] w-full and height to h-[95vh] */}
                <DialogContent aria-describedby="evaluation-dialog-description" className="!max-w-[95vw] !w-[95vw] !h-[95vh] p-0 overflow-hidden bg-[#F4F1EA] border-none shadow-2xl flex flex-col rounded-xl">

                    {/* Thematic Header */}
                    <div className="bg-[#576238] text-white px-8 py-6 shrink-0 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1 font-sans">Spark2Scale</p>
                            <DialogTitle className="text-2xl font-bold font-sans">Founder Evaluation Report</DialogTitle>
                            <DialogDescription id="evaluation-dialog-description" className="text-sm opacity-75 mt-0.5 text-white/80">
                                Comprehensive Startup Feedback & Priority Actions
                            </DialogDescription>
                        </div>
                        {founderContent && (
                            <div className="text-right flex flex-col items-end">
                                <div className="text-4xl font-black text-[#FFD95D] font-serif leading-none tracking-tighter">
                                    {displayScore} <span className="text-xl text-white/60">/ 45</span>
                                </div>
                                <div className={`text-[10px] uppercase tracking-widest font-bold mt-2 px-2.5 py-1 rounded shadow-sm ${verdict?.includes('Ready') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {verdict}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="h-1.5 bg-[#ffd95d] shrink-0" />

                    {/* Scrollable Content View */}
                    <div className="flex-1 w-full overflow-y-auto px-8 py-8 space-y-8">
                        {founderContent ? (
                            <>
                                {/* Executive Summary */}
                                <section>
                                    <div className="bg-[#576238] text-white px-4 py-2 font-bold text-xs uppercase tracking-widest font-sans rounded-sm inline-block mb-3">
                                        Executive Summary
                                    </div>
                                    <p className="text-sm text-gray-800 leading-relaxed font-serif bg-white p-5 rounded border border-gray-200 shadow-sm">
                                        {execSummary}
                                    </p>
                                </section>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Radar Chart */}
                                    {radarData.length > 0 && (
                                        <section className="bg-white p-6 rounded border border-gray-200 shadow-sm flex flex-col items-center">
                                            <h3 className="font-bold text-[#576238] uppercase tracking-wider text-sm mb-4">Scorecard Grid</h3>
                                            <div className="h-[250px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                                        <PolarGrid stroke="#e5e7eb" />
                                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#576238', fontSize: 10, fontWeight: 700 }} />
                                                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                                        <Radar name="Score" dataKey="score" stroke="#576238" strokeWidth={2} fill="#FFD95D" fillOpacity={0.6} />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </section>
                                    )}

                                    {/* Top 3 Priorities */}
                                    <div className="space-y-6">
                                        {priorities.length > 0 && (
                                            <section className="bg-blue-50/50 p-5 rounded border border-blue-200 shadow-sm h-full">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <Target className="h-5 w-5 text-blue-600" />
                                                    <h3 className="font-bold text-blue-800 uppercase tracking-wider text-sm">Top 3 Priorities</h3>
                                                </div>
                                                <ul className="space-y-4">
                                                    {priorities.map((p: string, i: number) => (
                                                        <li key={i} className="flex gap-3 text-sm text-blue-900/90 font-serif leading-relaxed">
                                                            <span className="font-bold text-blue-600 mt-0.5">•</span>
                                                            {p}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}
                                    </div>
                                </div>

                                {/* Dimension Analysis (Detailed Sections) */}
                                {dimensionAnalysis.length > 0 && (
                                    <section className="space-y-4">
                                        <div className="bg-[#576238] text-white px-4 py-2 font-bold text-xs uppercase tracking-widest font-sans rounded-sm inline-block mb-2">
                                            Detailed Section Analysis
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {dimensionAnalysis.map((item: any, idx: number) => (
                                                <div key={idx} className="bg-white border border-gray-200 rounded overflow-hidden shadow-sm flex flex-col">
                                                    <div className="bg-[#F4F1EA] px-4 py-3 flex justify-between items-center border-b border-gray-200">
                                                        <h3 className="font-bold text-[#576238] uppercase tracking-wider text-sm">{item.dimension}</h3>
                                                        <span className="font-bold text-gray-700 bg-white px-2 py-1 rounded shadow-sm text-[11px] border border-gray-200">
                                                            Score: <span className="text-[#576238]">{item.score}</span> / 5
                                                        </span>
                                                    </div>
                                                    <div className="p-5 flex-1 space-y-4">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Feedback</p>
                                                            <p className="text-sm text-gray-700 leading-relaxed font-serif whitespace-pre-wrap">
                                                                {item.justification}
                                                            </p>
                                                        </div>
                                                        {item.red_flags && item.red_flags.length > 0 && (
                                                            <div className="bg-red-50/50 p-4 rounded border border-red-100 mt-4">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <AlertTriangle className="h-3 w-3 text-red-600" />
                                                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Identified Risks</p>
                                                                </div>
                                                                <ul className="list-disc pl-5 text-xs text-red-900/80 space-y-1.5 font-serif">
                                                                    {item.red_flags.map((flag: string, i: number) => <li key={i}>{flag}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <FileText className="h-12 w-12 mb-4 opacity-20" />
                                <p>No Founder Output found in this evaluation.</p>
                            </div>
                        )}
                    </div>

                    {/* Thematic Footer */}
                    <div className="bg-[#ffd95d] px-8 py-3 flex justify-between items-center text-xs font-medium text-[#2c3e50] shrink-0 border-t border-yellow-500/20">
                        <span>Generated by Spark2Scale AI Evaluator</span>
                        <span>{startupStage} Stage</span>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}