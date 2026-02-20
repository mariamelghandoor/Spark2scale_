"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, PlayCircle, CheckCircle, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { evaluationService, EvaluationDocument } from "@/services/evaluationService";
import { startupService } from "@/services/startupService";

export default function EvaluatePage() {
    const params = useParams();
    const startupId = params.d as string;

    // State
    const [evalDoc, setEvalDoc] = useState<EvaluationDocument | null>(null);
    const [isWorkflowComplete, setIsWorkflowComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [userRole, setUserRole] = useState<string>("Viewer");

    // Initial Data Fetch
    useEffect(() => {
        const loadData = async () => {
            if (!startupId) return;
            setIsLoading(true);

            // Parallel fetch for speed
            const [doc, isComplete, startupDetails] = await Promise.all([
                evaluationService.getCurrentEvaluation(startupId),
                evaluationService.getWorkflowStatus(startupId),
                startupService.getById(startupId)
            ]);

            setEvalDoc(doc);
            if (startupDetails) setUserRole(startupDetails.current_role || "Viewer");
            setIsWorkflowComplete(isComplete);
            setIsLoading(false);
        };

        loadData();
    }, [startupId]);

    // Handle "Run Evaluation" (Generates the file)
    const handleRunEvaluation = async () => {
        setIsGenerating(true);
        const success = await evaluationService.generateEvaluation(startupId);

        if (success) {
            // Refresh document
            const newDoc = await evaluationService.getCurrentEvaluation(startupId);
            setEvalDoc(newDoc);

            // CRITICAL: Reset complete status so user can re-approve the new version
            setIsWorkflowComplete(false);
        }
        setIsGenerating(false);
    };

    // Handle "Complete Evaluation" Button
    const handleCompleteStage = async () => {
        if (!startupId) return;

        // Call the service to handle the data logic
        const success = await evaluationService.markAsComplete(startupId);

        if (success) {
            setIsWorkflowComplete(true); // Update UI state
        }
    };

    // Hardcoded demo data for visual score
    const demoScoreData = {
        overallScore: 85,
        categories: [
            { name: "Market Viability", score: 90 },
            { name: "Team Strength", score: 85 },
            { name: "Financial Health", score: 80 },
            { name: "Product Readiness", score: 85 },
        ]
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F0EADC]">
                <Loader2 className="h-8 w-8 animate-spin text-[#576238]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
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
                            <h1 className="text-xl font-bold text-[#576238]">🎯 Evaluate</h1>
                            <p className="text-sm text-muted-foreground">
                                Stage 4 of 6 - Get comprehensive evaluation • {userRole} View
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">

                    {/* SCENARIO 1: No Document Exists - Show "Run Evaluation" */}
                    {!evalDoc && userRole === 'Founder' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="mb-6 border-2 border-[#FFD95D]">
                                <CardHeader className="bg-gradient-to-r from-[#FFD95D]/20 to-transparent">
                                    <CardTitle className="text-[#576238]">
                                        Run New Evaluation
                                    </CardTitle>
                                    <CardDescription>
                                        Get an AI-powered assessment of your startup's current state
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="text-center space-y-4">
                                        <div className="text-6xl mb-4">🎯</div>
                                        <p className="text-muted-foreground mb-6">
                                            Our AI will analyze your documents, market research, and
                                            business model to provide a comprehensive evaluation.
                                        </p>
                                        <Button
                                            onClick={handleRunEvaluation}
                                            disabled={isGenerating}
                                            className="bg-[#576238] hover:bg-[#6b7c3f] min-w-[250px]"
                                            size="lg"
                                        >
                                            {isGenerating ? (
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            ) : (
                                                <PlayCircle className="mr-2 h-5 w-5" />
                                            )}
                                            {isGenerating ? "Analyzing Data..." : "Run Evaluation"}
                                        </Button>

                                        {/* Warning text for the 150-second wait time */}
                                        {isGenerating && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-sm text-amber-600 font-medium mt-4 animate-pulse"
                                            >
                                                This process takes about 2 to 3 minutes. <br />
                                                Please do not refresh or close this page.
                                            </motion.p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* SCENARIO 2: Document Exists - Show Report */}
                    {evalDoc && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {/* Regenerate Option */}
                            <div className="flex flex-col items-end mb-4">
                                <Button
                                    variant="outline"
                                    onClick={handleRunEvaluation}
                                    disabled={isGenerating || userRole !== 'Founder'}
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                                    {isGenerating ? "Regenerating..." : "Regenerate Evaluation"}
                                </Button>

                                {/* Warning text for regenerating */}
                                {isGenerating && (
                                    <p className="text-xs text-amber-600 mt-2 animate-pulse">
                                        Generating new AI reports (~2 mins). Do not refresh.
                                    </p>
                                )}
                            </div>

                            <Card className="border-2 border-[#576238]/20">
                                <CardHeader>
                                    <CardTitle className="text-[#576238] flex justify-between items-center">
                                        <span>Evaluation Report</span>
                                        <span className="text-sm font-normal text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
                                            v{evalDoc.current_version}
                                        </span>
                                    </CardTitle>
                                    <CardDescription>
                                        Generated on {new Date(evalDoc.updated_at).toLocaleDateString()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {/* Visual Score Representation */}
                                    <div className="p-4 rounded-lg border-2 hover:border-[#FFD95D] transition-all bg-white">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[#576238]">
                                                        {evalDoc.document_name}
                                                    </p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 px-3 text-xs mt-1 border-[#576238]/30 text-[#576238] hover:bg-[#576238]/10 hover:text-[#576238]"
                                                        asChild
                                                    >
                                                        <a
                                                            href={evalDoc.current_path}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            View PDF
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-3xl font-bold text-[#576238]">
                                                    {demoScoreData.overallScore}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Overall Score</p>
                                            </div>

                                            <Button variant="outline" size="sm" asChild>
                                                <a href={evalDoc.current_path} target="_blank" download>
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {demoScoreData.categories.map((category) => (
                                                <div key={category.name}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-muted-foreground">{category.name}</span>
                                                        <span className="font-semibold">{category.score}%</span>
                                                    </div>
                                                    <Progress value={category.score} className="h-2" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* COMPLETE BUTTON LOGIC */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mt-6 text-center"
                            >
                                <Button
                                    size="lg"
                                    onClick={handleCompleteStage}
                                    disabled={isWorkflowComplete || userRole !== 'Founder'}
                                    className={`
                                        font-semibold transition-all duration-300
                                        ${isWorkflowComplete
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
                                            : "bg-[#FFD95D] hover:bg-[#ffe89a] text-black"
                                        }
                                    `}
                                >
                                    {isWorkflowComplete ? (
                                        <>
                                            <CheckCircle className="mr-2 h-5 w-5" />
                                            Evaluation Completed
                                        </>
                                    ) : (
                                        "Complete Evaluation Stage"
                                    )}
                                </Button>
                                {isWorkflowComplete && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Stage marked as complete. Regenerate to unlock.
                                    </p>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}