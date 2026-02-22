"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, FileText, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { evaluationService, EvaluationDocument } from "@/services/evaluationService";
import { startupService } from "@/services/startupService";
import ContributorHeader from "@/components/contributor/ContributorHeader";

export default function ContributorEvaluatePage() {
    const params = useParams();
    const startupId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";

    // State
    const [evalDoc, setEvalDoc] = useState<EvaluationDocument | null>(null);
    const [isWorkflowComplete, setIsWorkflowComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Data Fetch
    useEffect(() => {
        const loadData = async () => {
            if (!startupId) return;
            setIsLoading(true);

            // Parallel fetch
            const [doc, isComplete] = await Promise.all([
                evaluationService.getCurrentEvaluation(startupId),
                evaluationService.getWorkflowStatus(startupId)
            ]);

            setEvalDoc(doc);
            setIsWorkflowComplete(isComplete);
            setIsLoading(false);
        };

        loadData();
    }, [startupId]);

    // Hardcoded demo data for visual score (keeping consistent with Founder view)
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
            <ContributorHeader
                backLink={`/contributor/startup/${startupId}`}
                title="🎯 Evaluate"
                subtitle="Stage 4 of 6 - Evaluation • Read-Only View"
            />

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">

                    {/* SCENARIO 1: No Document Exists */}
                    {!evalDoc && (
                        <div className="text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed">
                            <p className="text-gray-500">No evaluation generated yet.</p>
                        </div>
                    )}

                    {/* SCENARIO 2: Document Exists - Show Report */}
                    {evalDoc && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {/* No Regenerate Option */}

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

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mt-6 text-center"
                            >
                                {isWorkflowComplete ? (
                                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-700 font-medium text-sm">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Evaluation Stage Completed
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                        Evaluation in progress.
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
