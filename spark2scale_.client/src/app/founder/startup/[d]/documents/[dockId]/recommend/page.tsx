"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, RefreshCw, Download, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DocumentRecommendPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const version = searchParams.get("version") || "v1";
    const [refining, setRefining] = useState(false);

    const [recommendations] = useState([
        {
            id: 1,
            category: "Market Analysis",
            priority: "High",
            title: "Expand Competitor Analysis",
            description:
                "Include a detailed comparison matrix showing how your solution differs from top 3-5 competitors in the market.",
            aiSuggestion:
                "Based on market data, consider analyzing: CompanyA (market leader, 35% share), CompanyB (emerging player, 15% share), and CompanyC (niche specialist).",
            impact: "High - Investors want to see clear differentiation",
        },
        {
            id: 2,
            category: "Team Information",
            priority: "High",
            title: "Enhance Team Backgrounds",
            description:
                "Add more detailed backgrounds for each team member, highlighting relevant experience and achievements in the industry.",
            aiSuggestion:
                "For each team member, include: Years of experience, Previous companies/roles, Key achievements, Relevant expertise for this venture.",
            impact: "High - Team credibility is crucial for early-stage investments",
        },
        {
            id: 3,
            category: "Validation",
            priority: "Medium",
            title: "Add Customer Testimonials",
            description:
                "Include 2-3 customer testimonials or case studies demonstrating product-market fit and early traction.",
            aiSuggestion:
                "Structure each testimonial with: Customer name/company, Problem they faced, How your solution helped, Quantifiable results (e.g., '30% cost reduction').",
            impact: "Medium - Demonstrates real-world validation",
        },
        {
            id: 4,
            category: "Go-to-Market",
            priority: "Medium",
            title: "Detail GTM Strategy",
            description:
                "Expand the go-to-market section with specific channels, tactics, and timelines for customer acquisition.",
            aiSuggestion:
                "Break down by: Q1-Q2 activities, Customer acquisition channels (paid/organic), Expected CAC and LTV, Partnership strategies.",
            impact: "Medium - Shows execution readiness",
        },
        {
            id: 5,
            category: "Financial Model",
            priority: "Low",
            title: "Add Scenario Planning",
            description:
                "Include best-case, base-case, and worst-case scenarios in your financial projections.",
            aiSuggestion:
                "Show three scenarios with different growth rates: Conservative (50% growth), Base (100% growth), Optimistic (150% growth). Explain assumptions for each.",
            impact: "Low - Provides comprehensive financial picture",
        },
    ]);

    const handleAutoRefine = () => {
        setRefining(true);
        // Simulate AI refinement process
        setTimeout(() => {
            setRefining(false);
            alert("Document has been refined! A new version has been created.");
        }, 3000);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "High":
                return "bg-red-100 text-red-700 border-red-200";
            case "Medium":
                return "bg-orange-100 text-orange-700 border-orange-200";
            case "Low":
                return "bg-blue-100 text-blue-700 border-blue-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
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
                                ✨ AI Recommendations & Refinement
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Improve your document with AI-powered suggestions - {version.toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleAutoRefine}
                        disabled={refining}
                        className="bg-[#FFD95D] hover:bg-[#ffe89a] text-[#576238] font-semibold"
                    >
                        {refining ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Refining...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Auto-Refine Document
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Info Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="p-6 bg-gradient-to-r from-[#FFD95D]/20 to-transparent border-2 border-[#FFD95D]">
                            <div className="flex items-start gap-4">
                                <div className="text-4xl">💡</div>
                                <div>
                                    <h3 className="font-bold text-[#576238] mb-2">
                                        AI-Powered Document Enhancement
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Our AI has analyzed your document and identified key areas for improvement. You can either:
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            <span className="font-medium">Let AI automatically refine the document</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            <span className="font-medium">Manually implement suggestions below</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Tabs for filtering recommendations */}
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="grid w-full max-w-md grid-cols-4">
                            <TabsTrigger value="all">All ({recommendations.length})</TabsTrigger>
                            <TabsTrigger value="high">
                                High ({recommendations.filter((r) => r.priority === "High").length})
                            </TabsTrigger>
                            <TabsTrigger value="medium">
                                Medium ({recommendations.filter((r) => r.priority === "Medium").length})
                            </TabsTrigger>
                            <TabsTrigger value="low">
                                Low ({recommendations.filter((r) => r.priority === "Low").length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="mt-6 space-y-4">
                            {recommendations.map((rec, index) => (
                                <motion.div
                                    key={rec.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="p-6 border-2 hover:border-[#FFD95D] transition-all">
                                        <div className="space-y-4">
                                            {/* Header */}
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(
                                                                rec.priority
                                                            )}`}
                                                        >
                                                            {rec.priority} Priority
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {rec.category}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-lg font-bold text-[#576238]">
                                                        {rec.title}
                                                    </h4>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <p className="text-sm text-muted-foreground">
                                                {rec.description}
                                            </p>

                                            {/* AI Suggestion */}
                                            <div className="bg-[#F0EADC]/50 rounded-lg p-4 border-l-4 border-[#576238]">
                                                <div className="flex items-start gap-2 mb-2">
                                                    <Sparkles className="h-4 w-4 text-[#576238] mt-0.5" />
                                                    <span className="font-semibold text-sm text-[#576238]">
                                                        AI Suggestion:
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 pl-6">
                                                    {rec.aiSuggestion}
                                                </p>
                                            </div>

                                            {/* Impact */}
                                            <div className="flex items-center justify-between pt-2">
                                                <span className="text-xs text-muted-foreground">
                                                    <strong>Expected Impact:</strong> {rec.impact}
                                                </span>
                                                <Button variant="outline" size="sm">
                                                    <CheckCircle2 className="mr-2 h-3 w-3" />
                                                    Mark as Done
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </TabsContent>

                        <TabsContent value="high" className="mt-6 space-y-4">
                            {recommendations
                                .filter((r) => r.priority === "High")
                                .map((rec, index) => (
                                    <motion.div
                                        key={rec.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <Card className="p-6 border-2 hover:border-[#FFD95D] transition-all">
                                            <div className="space-y-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span
                                                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(
                                                                    rec.priority
                                                                )}`}
                                                            >
                                                                {rec.priority} Priority
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {rec.category}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-lg font-bold text-[#576238]">
                                                            {rec.title}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {rec.description}
                                                </p>
                                                <div className="bg-[#F0EADC]/50 rounded-lg p-4 border-l-4 border-[#576238]">
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <Sparkles className="h-4 w-4 text-[#576238] mt-0.5" />
                                                        <span className="font-semibold text-sm text-[#576238]">
                                                            AI Suggestion:
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 pl-6">
                                                        {rec.aiSuggestion}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between pt-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        <strong>Expected Impact:</strong> {rec.impact}
                                                    </span>
                                                    <Button variant="outline" size="sm">
                                                        <CheckCircle2 className="mr-2 h-3 w-3" />
                                                        Mark as Done
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                        </TabsContent>

                        <TabsContent value="medium" className="mt-6 space-y-4">
                            {recommendations
                                .filter((r) => r.priority === "Medium")
                                .map((rec, index) => (
                                    <motion.div
                                        key={rec.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <Card className="p-6 border-2 hover:border-[#FFD95D] transition-all">
                                            <div className="space-y-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span
                                                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(
                                                                    rec.priority
                                                                )}`}
                                                            >
                                                                {rec.priority} Priority
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {rec.category}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-lg font-bold text-[#576238]">
                                                            {rec.title}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {rec.description}
                                                </p>
                                                <div className="bg-[#F0EADC]/50 rounded-lg p-4 border-l-4 border-[#576238]">
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <Sparkles className="h-4 w-4 text-[#576238] mt-0.5" />
                                                        <span className="font-semibold text-sm text-[#576238]">
                                                            AI Suggestion:
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 pl-6">
                                                        {rec.aiSuggestion}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between pt-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        <strong>Expected Impact:</strong> {rec.impact}
                                                    </span>
                                                    <Button variant="outline" size="sm">
                                                        <CheckCircle2 className="mr-2 h-3 w-3" />
                                                        Mark as Done
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                        </TabsContent>

                        <TabsContent value="low" className="mt-6 space-y-4">
                            {recommendations
                                .filter((r) => r.priority === "Low")
                                .map((rec, index) => (
                                    <motion.div
                                        key={rec.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <Card className="p-6 border-2 hover:border-[#FFD95D] transition-all">
                                            <div className="space-y-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span
                                                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(
                                                                    rec.priority
                                                                )}`}
                                                            >
                                                                {rec.priority} Priority
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {rec.category}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-lg font-bold text-[#576238]">
                                                            {rec.title}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {rec.description}
                                                </p>
                                                <div className="bg-[#F0EADC]/50 rounded-lg p-4 border-l-4 border-[#576238]">
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <Sparkles className="h-4 w-4 text-[#576238] mt-0.5" />
                                                        <span className="font-semibold text-sm text-[#576238]">
                                                            AI Suggestion:
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 pl-6">
                                                        {rec.aiSuggestion}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between pt-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        <strong>Expected Impact:</strong> {rec.impact}
                                                    </span>
                                                    <Button variant="outline" size="sm">
                                                        <CheckCircle2 className="mr-2 h-3 w-3" />
                                                        Mark as Done
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                        </TabsContent>
                    </Tabs>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex gap-4 justify-center pt-8 border-t"
                    >
                        <Button variant="outline" size="lg" asChild>
                            <Link href={`/founder/startup/${params.id}/documents-page`}>
                                Back to Documents
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg">
                            <Download className="mr-2 h-4 w-4" />
                            Export Recommendations
                        </Button>
                        <Button
                            onClick={handleAutoRefine}
                            disabled={refining}
                            size="lg"
                            className="bg-[#576238] hover:bg-[#6b7c3f] text-white"
                        >
                            {refining ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Refining Document...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Apply All & Refine
                                </>
                            )}
                        </Button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
