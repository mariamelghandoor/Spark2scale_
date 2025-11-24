"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, PlayCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Progress } from "@/components/ui/progress";

export default function EvaluatePage() {
    const params = useParams();
    const [evaluations, setEvaluations] = useState([
        {
            id: 1,
            date: "2024-02-12",
            overallScore: 85,
            categories: [
                { name: "Market Viability", score: 90 },
                { name: "Team Strength", score: 85 },
                { name: "Financial Health", score: 80 },
                { name: "Product Readiness", score: 85 },
            ],
        },
        {
            id: 2,
            date: "2024-02-05",
            overallScore: 78,
            categories: [
                { name: "Market Viability", score: 85 },
                { name: "Team Strength", score: 75 },
                { name: "Financial Health", score: 70 },
                { name: "Product Readiness", score: 82 },
            ],
        },
    ]);

    const handleRunEvaluation = () => {
        console.log("Running evaluation...");
        // Simulate evaluation
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${params.id}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">🎯 Evaluate</h1>
                            <p className="text-sm text-muted-foreground">
                                Stage 4 of 6 - Get comprehensive evaluation
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Run Evaluation */}
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
                                        business model to provide a comprehensive evaluation
                                    </p>
                                    <Button
                                        onClick={handleRunEvaluation}
                                        className="bg-[#576238] hover:bg-[#6b7c3f]"
                                        size="lg"
                                    >
                                        <PlayCircle className="mr-2 h-5 w-5" />
                                        Run Evaluation
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Evaluation History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="text-[#576238]">
                                    Evaluation History
                                </CardTitle>
                                <CardDescription>
                                    Track your progress over time
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {evaluations.map((evaluation, index) => (
                                        <motion.div
                                            key={evaluation.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + index * 0.1 }}
                                            className="p-4 rounded-lg border-2 hover:border-[#FFD95D] transition-all"
                                        >
                                            <div className="flex justify-between items-center mb-4">
                                                <div>
                                                    <p className="font-semibold text-[#576238]">
                                                        Evaluation Report
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {new Date(evaluation.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-3xl font-bold text-[#576238]">
                                                            {evaluation.overallScore}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Overall Score
                                                        </p>
                                                    </div>
                                                    <Button variant="outline" size="sm">
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {evaluation.categories.map((category) => (
                                                    <div key={category.name}>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="text-muted-foreground">
                                                                {category.name}
                                                            </span>
                                                            <span className="font-semibold">
                                                                {category.score}%
                                                            </span>
                                                        </div>
                                                        <Progress
                                                            value={category.score}
                                                            className="h-2"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-6 text-center"
                    >
                        <Button
                            size="lg"
                            className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold"
                            asChild
                        >
                            <Link href={`/founder/startup/${params.id}`}>
                                Complete Evaluation
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
