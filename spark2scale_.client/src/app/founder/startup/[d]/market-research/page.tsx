"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Filter, Sparkles, CheckCircle, RotateCcw, Loader2, TrendingUp, DollarSign, Users, Code } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Services and PDF Formatter
import { marketResearchService } from "@/services/marketResearchService";
import { startupService } from "@/services/startupService";
import { generateMarketResearchPDF } from "@/pdf-formats/marketResearchPdf";

// Import your custom LegoLoader
import LegoLoader from "@/components/lego/LegoLoader";
import LegoResearchLoader from "@/components/lego/LegoResearchLoader";

export default function MarketResearchPage() {
    const params = useParams();
    const router = useRouter();
    const startupId = params.d as string;

    // State
    const [researchData, setResearchData] = useState<any>(null);
    const [isWorkflowComplete, setIsWorkflowComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [userRole, setUserRole] = useState<string>("Viewer");

    // Persisted Selection Inputs
    const [region, setRegion] = useState("");
    const [category, setCategory] = useState("");

    useEffect(() => {
        const loadData = async () => {
            if (!startupId) return;
            setIsLoading(true);
            try {
                const [doc, isComplete, startupDetails] = await Promise.all([
                    marketResearchService.getCurrentResearch(startupId),
                    marketResearchService.getWorkflowStatus(startupId),
                    startupService.getById(startupId)
                ]);

                if (doc) setResearchData(doc);
                setIsWorkflowComplete(isComplete);
                if (startupDetails) setUserRole(startupDetails.current_role || "Viewer");
            } catch (err) {
                console.error("Initialization error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [startupId]);

    const handleGenerate = async () => {
        if (!region || !category) {
            alert("Please select a Region and Category");
            return;
        }

        setIsGenerating(true);
        try {
            // Pass parameters to the service
            const jsonResult = await marketResearchService.generateResearch(startupId, region, category);

            if (jsonResult) {
                setResearchData(jsonResult);
                setIsWorkflowComplete(false);

                // Optional: Automatically trigger PDF download
                // generateMarketResearchPDF(jsonResult);
            }
        } catch (error) {
            alert("Generation failed. Please verify your startup idea exists in the database.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadReport = () => {
        if (researchData) generateMarketResearchPDF(researchData);
    };

    const handleRegenerateClick = () => {
        setResearchData(null);
        setIsWorkflowComplete(false);
    };

    const renderMarkdown = (text: string) => {
        if (!text) return null;

        // Simple parser for headers, bold, and paragraphs
        const lines = text.split('\n');
        const filteredLines = lines.filter(line => {
            const trimmed = line.trim();
            // Filter out standard headers that are redundant
            if (/^(\*\*|#+\s*)?Investment Memo/i.test(trimmed)) return false;
            // Filter out "Executive Summary" only if it's a header, to avoid removing it from text body if pertinent
            if (/^(\*\*|#+\s*)?Executive Summary/i.test(trimmed)) return false;
            if (/^(\*\*|#+\s*)?1\.\s*Executive Summary/i.test(trimmed)) return false;
            return true;
        });

        // 2. Reduce multiple empty lines to single
        const reducedLines: string[] = [];
        let lastWasEmpty = false;
        for (const line of filteredLines) {
            const isEmpty = line.trim().length === 0;
            if (isEmpty && lastWasEmpty) continue;
            reducedLines.push(line);
            lastWasEmpty = isEmpty;
        }

        // 3. Remove leading empty lines
        while (reducedLines.length > 0 && reducedLines[0].trim().length === 0) {
            reducedLines.shift();
        }

        return reducedLines.map((line, index) => {
            // Headers
            if (line.startsWith('### ')) {
                return <h3 key={index} className="text-lg font-bold mt-4 mb-2 text-[#576238]">{line.replace('### ', '')}</h3>;
            }
            if (line.startsWith('## ')) {
                return <h2 key={index} className="text-xl font-bold mt-6 mb-3 text-[#576238] border-b pb-1">{line.replace('## ', '')}</h2>;
            }
            if (line.startsWith('# ')) {
                return <h1 key={index} className="text-2xl font-bold mt-6 mb-4 text-[#576238]">{line.replace('# ', '')}</h1>;
            }
            if (line.trim() === '---') {
                return <hr key={index} className="my-4 border-gray-300" />;
            }

            // Paragraphs with Bold parsing
            if (line.trim().length === 0) {
                return <br key={index} />;
            }

            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
                <p key={index} className="mb-2 text-gray-800 leading-relaxed">
                    {parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </p>
            );
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F0EADC]">
                {/* Use LegoLoader here for initial load as well if desired, or standard spinner */}
                <LegoLoader />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCFB]">
            {/* Top Navigation */}
            <div className="border-b bg-white/80 sticky top-0 z-10 backdrop-blur-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${startupId}`}>
                            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">📊 Market Intelligence</h1>
                            <p className="text-xs text-muted-foreground">Stage 3 of 6 • {userRole} View</p>
                        </div>
                    </div>
                    {researchData && !isGenerating && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleRegenerateClick} disabled={isWorkflowComplete}>
                                <RotateCcw className="h-4 w-4 mr-2" /> Regenerate
                            </Button>
                            <Button onClick={handleDownloadReport} variant="outline" className="border-[#576238] text-[#576238]">
                                <Download className="h-4 w-4 mr-2" /> Download PDF
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 max-w-5xl">

                {/* 1. Generating State: Show Lego Research Loader */}
                {isGenerating && (
                    <div className="flex justify-center w-full">
                        <LegoResearchLoader />
                    </div>
                )}

                {/* 2. Form State: Show Inputs if no data and not generating */}
                {!researchData && !isGenerating && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="border-2 border-[#FFD95D]">
                            <CardHeader className="bg-gradient-to-r from-[#FFD95D]/10 to-transparent">
                                <CardTitle className="flex items-center gap-2 text-[#576238]">
                                    <Sparkles className="h-5 w-5" /> Generate Market Analysis
                                </CardTitle>
                                <CardDescription>Select parameters to guide the AI market research engine.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label><Filter className="inline h-4 w-4 mr-2" />Region</Label>
                                        <Select value={region} onValueChange={setRegion}>
                                            <SelectTrigger><SelectValue placeholder="Select Region" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Global">Global</SelectItem>
                                                <SelectItem value="North America">North America</SelectItem>
                                                <SelectItem value="Europe">Europe</SelectItem>
                                                <SelectItem value="MENA">MENA</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label><Filter className="inline h-4 w-4 mr-2" />Category</Label>
                                        <Select value={category} onValueChange={setCategory}>
                                            <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Market Size">Market Size</SelectItem>
                                                <SelectItem value="Competition">Competition Analysis</SelectItem>
                                                <SelectItem value="Trends">Industry Trends</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button onClick={handleGenerate} className="w-full bg-[#576238] h-12 text-lg hover:bg-[#464f2d]">
                                    <Sparkles className="mr-2" /> Generate AI Report
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* 3. Results State: Show Data if available */}
                {researchData && !isGenerating && (
                    <div className="space-y-8">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-[#576238] text-white">
                                <CardContent className="pt-6 text-center">
                                    <p className="text-sm opacity-80 uppercase">Opportunity Score</p>
                                    <h2 className="text-5xl font-bold mt-2">{researchData.opportunity_analysis?.opportunity_score ?? "N/A"}</h2>
                                    <Badge className="mt-2 bg-white/20">{researchData.opportunity_analysis?.grade ?? "N/A"}</Badge>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingUp className="h-4 w-4" /> Growth</div>
                                    <p className="text-2xl font-bold text-red-500">
                                        {researchData.opportunity_analysis?.breakdown?.growth_pct
                                            ? `${researchData.opportunity_analysis.breakdown.growth_pct.toFixed(1)}% YoY`
                                            : "N/A"}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-1"><DollarSign className="h-4 w-4" /> Market Size</div>
                                    <p className="text-2xl font-bold">{researchData.market_sizing?.sam_value ?? "N/A"}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Executive Summary */}
                        <Card>
                            <CardHeader><CardTitle className="text-[#576238] font-bold">Executive Summary</CardTitle></CardHeader>
                            <CardContent className="text-gray-700 leading-relaxed">
                                {renderMarkdown(researchData.executive_summary)}
                            </CardContent>
                        </Card>

                        {/* Competitors */}
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Competitors</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {researchData.competitors?.map((comp: any, i: number) => (
                                        <div key={i} className="p-4 rounded-lg border bg-gray-50/50">
                                            <p className="font-bold text-[#576238]">{comp.Name}</p>
                                            <p className="text-sm text-gray-600 mt-1">{comp.Features}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Workflow Action */}
                        <div className="flex justify-center pt-4">
                            <Button
                                onClick={() => marketResearchService.completeStage(startupId)}
                                disabled={isWorkflowComplete}
                                className="min-w-[300px] bg-[#FFD95D] text-black hover:bg-[#ffe58a] font-bold"
                            >
                                {isWorkflowComplete ? <CheckCircle className="mr-2" /> : null}
                                {isWorkflowComplete ? "Stage Completed" : "Finalize Research Stage"}
                            </Button>
                        </div>



                    </div>
                )}
            </main>
        </div>
    );
}