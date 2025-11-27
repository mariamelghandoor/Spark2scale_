"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Star, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useSearchParams } from "next/navigation";
import { Progress } from "@/components/ui/progress";

export default function DocumentEvaluatePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const version = searchParams.get("version") || "v1";

    const [evaluation] = useState({
        overallScore: 85,
        categories: [
            {
                name: "Content Quality",
                score: 88,
                description: "Well-structured and comprehensive",
                status: "excellent",
            },
            {
                name: "Market Analysis",
                score: 82,
                description: "Good coverage, could include more competitor data",
                status: "good",
            },
            {
                name: "Financial Projections",
                score: 90,
                description: "Realistic and well-documented assumptions",
                status: "excellent",
            },
            {
                name: "Team Information",
                score: 75,
                description: "Basic information provided, needs more detail",
                status: "needs-improvement",
            },
            {
                name: "Business Model",
                score: 87,
                description: "Clear value proposition and revenue model",
                status: "excellent",
            },
        ],
        strengths: [
            "Clear and compelling value proposition",
            "Well-researched market opportunity",
            "Strong financial projections with realistic assumptions",
            "Comprehensive risk analysis",
        ],
        improvements: [
            "Add more detailed competitor analysis",
            "Expand team backgrounds and expertise",
            "Include customer testimonials or case studies",
            "Provide more detailed go-to-market strategy",
        ],
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "excellent":
                return "text-green-600 bg-green-50";
            case "good":
                return "text-blue-600 bg-blue-50";
            case "needs-improvement":
                return "text-orange-600 bg-orange-50";
            default:
                return "text-gray-600 bg-gray-50";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "excellent":
                return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            case "good":
                return <TrendingUp className="h-5 w-5 text-blue-600" />;
            case "needs-improvement":
                return <AlertCircle className="h-5 w-5 text-orange-600" />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${params.id}/documents-page`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-[#576238]">
                                📊 Document Evaluation
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Viewing {version.toUpperCase()} evaluation scores
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Overall Score Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="p-8 bg-gradient-to-br from-[#576238] to-[#6b7c3f] text-white border-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold mb-2 text-white/90">
                                        Overall Document Score
                                    </h2>
                                    <p className="text-sm text-white/70">
                                        Based on comprehensive AI analysis
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center justify-center w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30">
                                        <div className="text-center">
                                            <div className="text-5xl font-bold">{evaluation.overallScore}</div>
                                            <div className="text-sm text-white/80">/ 100</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-5 w-5 ${i < Math.floor(evaluation.overallScore / 20)
                                                        ? "fill-[#FFD95D] text-[#FFD95D]"
                                                        : "text-white/40"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Category Scores */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <h3 className="text-2xl font-bold text-[#576238] mb-4">
                            Category Breakdown
                        </h3>
                        <div className="space-y-4">
                            {evaluation.categories.map((category, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                >
                                    <Card className="p-6 border-2 hover:border-[#FFD95D] transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0">
                                                {getStatusIcon(category.status)}
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-bold text-[#576238]">
                                                        {category.name}
                                                    </h4>
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                                            category.status
                                                        )}`}
                                                    >
                                                        {category.score}/100
                                                    </span>
                                                </div>
                                                <Progress value={category.score} className="h-2 mb-3" />
                                                <p className="text-sm text-muted-foreground">
                                                    {category.description}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Strengths and Improvements */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Strengths */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="p-6 border-2 border-green-200 bg-green-50/50">
                                <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Key Strengths
                                </h3>
                                <ul className="space-y-3">
                                    {evaluation.strengths.map((strength, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm">
                                            <span className="text-green-600 mt-0.5">✓</span>
                                            <span className="text-gray-700">{strength}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        </motion.div>

                        {/* Improvements */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="p-6 border-2 border-orange-200 bg-orange-50/50">
                                <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Areas for Improvement
                                </h3>
                                <ul className="space-y-3">
                                    {evaluation.improvements.map((improvement, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm">
                                            <span className="text-orange-600 mt-0.5">→</span>
                                            <span className="text-gray-700">{improvement}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex gap-4 justify-center"
                    >
                        <Button
                            size="lg"
                            variant="outline"
                            asChild
                        >
                            <Link href={`/founder/startup/${params.id}/documents-page`}>
                                Back to Documents
                            </Link>
                        </Button>
                        <Button
                            size="lg"
                            className="bg-[#576238] hover:bg-[#6b7c3f] text-white"
                            asChild
                        >
                            <Link href={`/founder/startup/${params.id}/documents/${params.docId}/recommend?version=${version}`}>
                                Get Recommendations
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
