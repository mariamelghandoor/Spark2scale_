"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";

export default function RecommendationsPage() {
    const params = useParams();
    const [recommendations, setRecommendations] = useState([
        {
            id: 1,
            date: "2024-02-12",
            items: [
                {
                    category: "Market Strategy",
                    recommendation: "Focus on enterprise customers first before targeting SMBs",
                    priority: "High",
                },
                {
                    category: "Product",
                    recommendation: "Add mobile app support to increase user engagement",
                    priority: "Medium",
                },
                {
                    category: "Team",
                    recommendation: "Consider hiring a CTO with AI/ML expertise",
                    priority: "High",
                },
                {
                    category: "Financial",
                    recommendation: "Extend runway by reducing customer acquisition costs",
                    priority: "Medium",
                },
            ],
        },
    ]);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "High":
                return "text-red-600 bg-red-50 border-red-200";
            case "Medium":
                return "text-yellow-600 bg-yellow-50 border-yellow-200";
            case "Low":
                return "text-green-600 bg-green-50 border-green-200";
            default:
                return "text-gray-600 bg-gray-50 border-gray-200";
        }
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
                    {/* Generate Recommendations */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
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
                                    <Button
                                        className="bg-[#576238] hover:bg-[#6b7c3f]"
                                        size="lg"
                                    >
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        Generate Recommendations
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Recommendations History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="text-[#576238]">
                                    Recommendations History
                                </CardTitle>
                                <CardDescription>
                                    Track iterations and improvements
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recommendations.map((rec, recIndex) => (
                                    <div key={rec.id} className="space-y-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-sm text-muted-foreground">
                                                Generated on{" "}
                                                {new Date(rec.date).toLocaleDateString()}
                                            </p>
                                            <Button variant="outline" size="sm">
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                Refine Again
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {rec.items.map((item, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.3 + index * 0.1 }}
                                                    className="p-4 rounded-lg border-2 hover:border-[#FFD95D] transition-all"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="font-semibold text-[#576238]">
                                                                    {item.category}
                                                                </span>
                                                                <span
                                                                    className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(
                                                                        item.priority
                                                                    )}`}
                                                                >
                                                                    {item.priority} Priority
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                {item.recommendation}
                                                            </p>
                                                        </div>
                                                        <Button variant="ghost" size="sm">
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
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
                            asChild
                        >
                            <Link href={`/founder/startup/${params.id}/idea-check`}>
                                <RefreshCw className="mr-2 h-5 w-5" />
                                Loop Back to Idea Stage
                            </Link>
                        </Button>
                        <Button
                            size="lg"
                            className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold"
                            asChild
                        >
                            <Link href={`/founder/startup/${params.id}`}>
                                Complete & Continue
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
