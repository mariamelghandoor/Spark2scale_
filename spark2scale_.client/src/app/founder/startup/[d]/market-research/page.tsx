"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Filter, Sparkles, CheckCircle, RotateCcw, TrendingUp, DollarSign, Users, Target, AlertCircle } from "lucide-react";
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

// Import your custom Loaders
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

    // user-friendly error
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Persisted Selection Inputs (Category Removed)
    const [region, setRegion] = useState("");

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
        // Validation now only checks for Region
        if (!region) {
            alert("Please select a Target Region");
            return;
        }

        setErrorMessage(null);
        setIsGenerating(true);
        try {
            // Category argument removed from frontend call
            const jsonResult = await marketResearchService.generateResearch(startupId, region);

            if (jsonResult) {
                setResearchData(jsonResult);
                setIsWorkflowComplete(false);
            }
        } catch (error: any) {
            console.error("Full Error:", error);
            if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
                setErrorMessage("Market data is heavy! 📊 Our AI is crunching a lot of numbers right now and needs a breather. Please wait a moment and try again.");
            } else {
                // User-friendly generic error
                setErrorMessage("We hit a slight snag while assembling your report. Please double-check your connection and try again!");
            }
            // Extract the real error message sent from your C# backend
            const serverMessage = error.response?.data?.error
                || error.response?.data
                || error.message
                || "Unknown error occurred";
            console.error("Generation failed! Server says:", serverMessage);
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

    const handleFinalize = async () => {
        const success = await marketResearchService.completeStage(startupId);
        if (success) {
            setIsWorkflowComplete(true);
        } else {
            alert("Failed to mark stage as complete.");
        }
    };

    // --- SMART INLINE BOLDING ---
    const renderInlineText = (text: string) => {
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 45) {
            const label = text.substring(0, colonIdx + 1).replace(/\*\*/g, '');
            const rest = text.substring(colonIdx + 1).replace(/\*\*/g, '');
            return (
                <span>
                    <strong className="text-[#576238] font-bold">{label}</strong>
                    <span className="text-gray-700">{rest}</span>
                </span>
            );
        }

        const parts = text.split(/(\*\*.*?\*\*)/g);
        return (
            <span>
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
            </span>
        );
    };

    // --- ADVANCED MARKDOWN RENDERER ---
    const renderMarkdown = (text: string) => {
        if (!text) return null;

        const lines = text.split('\n');

        const filteredLines = lines.filter(line => {
            const trimmed = line.trim();
            if (/^(\*\*|#+\s*)?Executive Summary/i.test(trimmed) && trimmed.length < 25) return false;
            return true;
        });

        return filteredLines.map((line, index) => {
            const trimmed = line.trim();

            if (!trimmed || trimmed === '*' || trimmed.match(/^-{3,}$/)) return null;

            if (/^(\*\*|#+\s*)?Investment Memo/i.test(trimmed)) {
                const titleText = trimmed.replace(/^(\*\*|#+\s*)/g, '').replace(/\*\*$/g, '');
                return (
                    <div key={index} className="mb-6 pt-2">
                        <span className="text-xs font-bold tracking-widest text-[#FFD95D] uppercase mb-2 block">Official Report</span>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-snug">
                            {titleText}
                        </h1>
                    </div>
                );
            }

            if (/^(Date|Prepared For|Prepared By|Prepared by):/i.test(trimmed.replace(/\*\*/g, ''))) {
                const cleanLine = trimmed.replace(/\*\*/g, '');
                const colonIdx = cleanLine.indexOf(':');
                const label = cleanLine.substring(0, colonIdx);
                const value = cleanLine.substring(colonIdx + 1).trim();

                return (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 bg-gray-50 p-2.5 px-4 rounded-lg border border-gray-100 max-w-xl">
                        <span className="text-xs font-extrabold text-[#576238] uppercase tracking-wider w-32">{label}</span>
                        <span className="text-sm font-semibold text-gray-800">{value}</span>
                    </div>
                );
            }

            if (trimmed.match(/^\d+\.\s+[A-Z]/) || trimmed.startsWith('#')) {
                const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
                return (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={index}
                        className="mt-12 mb-6"
                    >
                        <h2 className="text-2xl font-extrabold text-[#576238] mb-4 tracking-tight">
                            {headingText}
                        </h2>
                        <div className="flex h-[3px] w-full rounded-full overflow-hidden opacity-80">
                            <div className="bg-[#576238] w-[80%]" />
                            <div className="bg-[#FFD95D] w-[20%]" />
                        </div>
                    </motion.div>
                );
            }

            if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                const bulletText = trimmed.replace(/^[-*•]\s*/, '');
                return (
                    <div key={index} className="flex items-start gap-3 mb-3 ml-2">
                        <span className="text-[#FFD95D] font-black text-xl leading-none mt-1 shadow-sm">
                            •
                        </span>
                        <p className="text-gray-700 leading-relaxed text-[15px]">
                            {renderInlineText(bulletText)}
                        </p>
                    </div>
                );
            }

            return (
                <p key={index} className="mb-4 text-gray-700 leading-relaxed text-[15px]">
                    {renderInlineText(trimmed)}
                </p>
            );
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
                <LegoLoader />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCFB] pb-16">
            <div className="border-b bg-white/80 sticky top-0 z-50 backdrop-blur-md shadow-sm">
                <div className="flex h-16 w-full items-center justify-between px-6 md:px-12">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${startupId}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238] h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
                                Market Intelligence
                            </h1>
                            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Stage 3 of 6 • {userRole}</p>
                        </div>
                    </div>
                    {researchData && !isGenerating && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleRegenerateClick} className="hover:bg-gray-50 h-8 text-xs font-semibold">
                                <RotateCcw className="h-3 w-3 mr-1.5" /> Regenerate
                            </Button>
                            <Button onClick={handleDownloadReport} variant="outline" size="sm" className="border-[#576238] text-[#576238] hover:bg-[#576238] hover:text-white transition-colors h-8 text-xs font-semibold">
                                <Download className="h-3 w-3 mr-1.5" /> Download PDF
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                {isGenerating && (
                    <div className="flex justify-center w-full py-20">
                        <LegoResearchLoader />
                    </div>
                )}

                {!researchData && !isGenerating && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto mt-10">
                        <Card className="border-2 border-[#FFD95D] shadow-md overflow-hidden rounded-xl">
                            <CardHeader className="bg-gradient-to-r from-[#FFD95D]/20 via-white to-transparent pb-6 border-b border-[#FFD95D]/30">
                                <CardTitle className="flex items-center gap-2 text-[#576238] text-xl">
                                    <Sparkles className="h-5 w-5 text-[#FFD95D]" /> Generate Market Analysis
                                </CardTitle>
                                <CardDescription className="text-gray-600 text-sm">Select a target region to guide the AI market research engine.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6 bg-white">

                                <div className="space-y-2">
                                    <Label className="text-[#576238] font-bold text-xs uppercase"><Filter className="inline h-3 w-3 mr-1" />Target Region</Label>
                                    <Select value={region} onValueChange={setRegion}>
                                        <SelectTrigger className="h-10 border-gray-200 focus:ring-[#576238] text-sm"><SelectValue placeholder="Select Region" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Global">Global</SelectItem>
                                            <SelectItem value="North America">North America</SelectItem>
                                            <SelectItem value="Europe">Europe</SelectItem>
                                            <SelectItem value="MENA">MENA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>


                                {errorMessage && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                                        <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 text-red-600">
                                            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm font-medium leading-relaxed">{errorMessage}</p>
                                        </div>
                                    </motion.div>
                                )}

                                <Button onClick={handleGenerate} className="w-full bg-[#576238] h-12 text-base font-bold hover:bg-[#464f2d] shadow-sm transition-all rounded-lg">
                                    <Sparkles className="mr-2 h-4 w-4 text-[#FFD95D]" /> Generate Report
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {researchData && !isGenerating && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                        {/* KPI Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                            <Card className="relative overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-xl">
                                <div className="absolute top-0 left-0 w-full h-1 bg-[#576238]"></div>
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-[#576238]/10 rounded-md">
                                            <Target className="w-4 h-4 text-[#576238]" />
                                        </div>
                                        <span className="font-extrabold text-gray-400 uppercase tracking-widest text-[10px]">Opportunity Score</span>
                                    </div>

                                    <div className="flex items-baseline gap-1 mb-2">
                                        <h3 className="text-4xl font-black text-[#576238] tracking-tight">
                                            {researchData.opportunity_analysis?.opportunity_score ?? "N/A"}
                                        </h3>
                                        <span className="text-lg font-bold text-gray-300">/100</span>
                                    </div>

                                    <Badge className="bg-[#FFD95D] text-[#576238] hover:bg-[#ffe58a] font-black px-2.5 py-0.5 text-xs shadow-none w-fit border-none rounded-md">
                                        Grade {researchData.opportunity_analysis?.grade ?? "N/A"}
                                    </Badge>
                                </CardContent>
                            </Card>

                            <Card className="relative overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-xl">
                                <div className="absolute top-0 left-0 w-full h-1 bg-[#8b9c5a]"></div>
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-[#8b9c5a]/10 rounded-md">
                                            <TrendingUp className="w-4 h-4 text-[#8b9c5a]" />
                                        </div>
                                        <span className="font-extrabold text-gray-400 uppercase tracking-widest text-[10px]">Market Growth</span>
                                    </div>

                                    <div className="flex items-baseline gap-1 mt-6">
                                        <h3 className="text-4xl font-black text-gray-800 tracking-tight">
                                            {researchData.opportunity_analysis?.breakdown?.growth_pct
                                                ? `${researchData.opportunity_analysis.breakdown.growth_pct.toFixed(1)}%`
                                                : "N/A"}
                                        </h3>
                                        <span className="text-sm font-bold text-gray-400">YoY</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="relative overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-xl">
                                <div className="absolute top-0 left-0 w-full h-1 bg-[#FFD95D]"></div>
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-[#FFD95D]/30 rounded-md">
                                            <DollarSign className="w-4 h-4 text-[#c7a42e]" />
                                        </div>
                                        <span className="font-extrabold text-gray-400 uppercase tracking-widest text-[10px]">Serviceable Market</span>
                                    </div>

                                    <div className="mt-6">
                                        <h3 className="text-4xl font-black text-gray-800 tracking-tight">
                                            {researchData.market_sizing?.sam_value ?? "N/A"}
                                        </h3>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>

                        <Card className="shadow-sm border-gray-200 overflow-hidden rounded-xl">
                            <CardContent className="p-6 md:p-10 bg-white">
                                {renderMarkdown(researchData.executive_summary)}
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-gray-200 rounded-xl">
                            <CardHeader className="bg-gray-50/50 border-b pb-4 pt-5">
                                <CardTitle className="flex items-center gap-2 text-xl text-[#576238] font-bold">
                                    <Users className="h-5 w-5 text-[#FFD95D]" /> Competitor Landscape
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 bg-white">
                                <div className="grid md:grid-cols-2 gap-4">
                                    {researchData.competitors?.map((comp: any, i: number) => (
                                        <div key={i} className="p-4 rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all border-l-4 border-l-[#576238] group">
                                            <p className="font-extrabold text-base text-gray-900 group-hover:text-[#576238] transition-colors">{comp.Name}</p>
                                            <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">{comp.Features}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-center pt-4 pb-8">
                            <Button
                                onClick={handleFinalize}
                                disabled={isWorkflowComplete}
                                className={`min-w-[280px] h-12 text-base font-bold shadow-md transition-all rounded-lg ${isWorkflowComplete
                                    ? "bg-gray-100 text-gray-500 hover:bg-gray-100 cursor-not-allowed"
                                    : "bg-[#FFD95D] text-black hover:bg-[#ffe58a] hover:-translate-y-0.5 hover:shadow-lg"
                                    }`}
                            >
                                {isWorkflowComplete ? <CheckCircle className="mr-2 h-5 w-5 text-green-500" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                {isWorkflowComplete ? "Stage Completed" : "Finalize Research Stage"}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}