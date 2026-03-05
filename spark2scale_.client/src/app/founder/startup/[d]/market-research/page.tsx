"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Filter, Sparkles, CheckCircle, RotateCcw, TrendingUp, DollarSign, Users, Target } from "lucide-react";
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
            const jsonResult = await marketResearchService.generateResearch(startupId, region, category);

            if (jsonResult) {
                setResearchData(jsonResult);
                setIsWorkflowComplete(false);
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
        // Look for "Label:" patterns to color them green
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

        // Fallback for standard **bold** tags
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
    // --- ADVANCED MARKDOWN RENDERER ---
    const renderMarkdown = (text: string) => {
        if (!text) return null;

        const lines = text.split('\n');

        const filteredLines = lines.filter(line => {
            const trimmed = line.trim();
            // Removed the filter that was hiding the Investment Memo!
            if (/^(\*\*|#+\s*)?Executive Summary/i.test(trimmed) && trimmed.length < 25) return false;
            return true;
        });

        return filteredLines.map((line, index) => {
            const trimmed = line.trim();

            // Skip empty or junk lines
            if (!trimmed || trimmed === '*' || trimmed.match(/^-{3,}$/)) return null;

            // 1. Detect and Style the "Investment Memo" Title
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

            // 2. Detect and Style the Metadata (Date, Prepared For, Prepared By)
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

            // 3. Detect Major Numbered Sections (e.g., "1. Executive Summary") or Markdown Headers
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
                        {/* Two-Tone Divider */}
                        <div className="flex h-[3px] w-full rounded-full overflow-hidden opacity-80">
                            <div className="bg-[#576238] w-[80%]" />
                            <div className="bg-[#FFD95D] w-[20%]" />
                        </div>
                    </motion.div>
                );
            }

            // 4. Detect Bullet Points
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

            // 5. Standard Paragraph
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
            <div className="border-b bg-white/80 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-6xl">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${startupId}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">📊 Market Intelligence</h1>
                            <p className="text-xs text-muted-foreground font-medium">Stage 3 of 6 • {userRole} View</p>
                        </div>
                    </div>
                    {researchData && !isGenerating && (
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" onClick={handleRegenerateClick} className="hover:bg-gray-50">
                                <RotateCcw className="h-4 w-4 mr-2" /> Regenerate
                            </Button>
                            <Button onClick={handleDownloadReport} variant="outline" className="border-[#576238] text-[#576238] hover:bg-[#576238] hover:text-white transition-colors">
                                <Download className="h-4 w-4 mr-2" /> Download PDF
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 max-w-6xl">
                {isGenerating && (
                    <div className="flex justify-center w-full py-20">
                        <LegoResearchLoader />
                    </div>
                )}

                {!researchData && !isGenerating && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto mt-10">
                        <Card className="border-2 border-[#FFD95D] shadow-lg overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-[#FFD95D]/20 via-white to-transparent pb-8 border-b border-[#FFD95D]/30">
                                <CardTitle className="flex items-center gap-2 text-[#576238] text-2xl">
                                    <Sparkles className="h-6 w-6 text-[#FFD95D]" /> Generate Market Analysis
                                </CardTitle>
                                <CardDescription className="text-gray-600 text-base">Select parameters to guide the AI market research engine.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-8 space-y-8 bg-white">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-[#576238] font-bold"><Filter className="inline h-4 w-4 mr-1.5" />Target Region</Label>
                                        <Select value={region} onValueChange={setRegion}>
                                            <SelectTrigger className="h-12 border-gray-200 focus:ring-[#576238]"><SelectValue placeholder="Select Region" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Global">Global</SelectItem>
                                                <SelectItem value="North America">North America</SelectItem>
                                                <SelectItem value="Europe">Europe</SelectItem>
                                                <SelectItem value="MENA">MENA</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[#576238] font-bold"><Target className="inline h-4 w-4 mr-1.5" />Analysis Category</Label>
                                        <Select value={category} onValueChange={setCategory}>
                                            <SelectTrigger className="h-12 border-gray-200 focus:ring-[#576238]"><SelectValue placeholder="Select Category" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Market Size">Market Size</SelectItem>
                                                <SelectItem value="Competition">Competition Analysis</SelectItem>
                                                <SelectItem value="Trends">Industry Trends</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button onClick={handleGenerate} className="w-full bg-[#576238] h-14 text-lg hover:bg-[#464f2d] shadow-md transition-all">
                                    <Sparkles className="mr-2 h-5 w-5 text-[#FFD95D]" /> Generate Comprehensive Report
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {researchData && !isGenerating && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">

                        {/* KPI Metrics Dashboard */}
                        {/* KPI Metrics Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Opportunity Score Card */}
                            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-xl">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-[#576238]/10 rounded-lg">
                                                <Target className="w-5 h-5 text-[#576238]" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Opportunity Score</p>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2 mb-3">
                                        <h3 className="text-5xl font-black text-gray-900 tracking-tight">
                                            {researchData.opportunity_analysis?.opportunity_score ?? "N/A"}
                                        </h3>
                                        <span className="text-xl font-bold text-gray-400">/100</span>
                                    </div>
                                    <Badge className="bg-[#576238]/10 text-[#576238] hover:bg-[#576238]/20 border-none font-bold px-3 py-1.5 shadow-none rounded-md">
                                        Grade {researchData.opportunity_analysis?.grade ?? "N/A"} (Solid Opportunity)
                                    </Badge>
                                </CardContent>
                            </Card>

                            {/* Market Growth Card */}
                            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-xl">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2.5 bg-rose-100 rounded-lg">
                                            <TrendingUp className="w-5 h-5 text-rose-600" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Market Growth</p>
                                    </div>
                                    <div className="flex items-baseline gap-2 mt-4">
                                        <h3 className="text-5xl font-black text-gray-900 tracking-tight">
                                            {researchData.opportunity_analysis?.breakdown?.growth_pct
                                                ? `${researchData.opportunity_analysis.breakdown.growth_pct.toFixed(1)}%`
                                                : "N/A"}
                                        </h3>
                                        <span className="text-xl font-bold text-gray-400">YoY</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Serviceable Market Card */}
                            <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-xl">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2.5 bg-[#FFD95D]/30 rounded-lg">
                                            <DollarSign className="w-5 h-5 text-[#c7a42e]" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Market Size</p>
                                    </div>
                                    <div className="mt-4">
                                        <h3 className="text-5xl font-black text-gray-900 tracking-tight">
                                            {researchData.market_sizing?.sam_value ?? "N/A"}
                                        </h3>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>

                        {/* Executive Report Content */}
                        <Card className="shadow-md border-gray-200 overflow-hidden">
                            <CardContent className="p-8 md:p-12 bg-white">
                                {renderMarkdown(researchData.executive_summary)}
                            </CardContent>
                        </Card>

                        {/* Competitor Landscape */}
                        <Card className="shadow-md border-gray-200">
                            <CardHeader className="bg-gray-50/50 border-b pb-6">
                                <CardTitle className="flex items-center gap-2 text-2xl text-[#576238] font-bold">
                                    <Users className="h-6 w-6 text-[#FFD95D]" /> Competitor Landscape
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 bg-white">
                                <div className="grid md:grid-cols-2 gap-6">
                                    {researchData.competitors?.map((comp: any, i: number) => (
                                        <div key={i} className="p-5 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all border-l-4 border-l-[#576238] group">
                                            <p className="font-extrabold text-lg text-gray-900 group-hover:text-[#576238] transition-colors">{comp.Name}</p>
                                            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{comp.Features}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-center pt-8 pb-10">
                            <Button
                                onClick={handleFinalize}
                                disabled={isWorkflowComplete}
                                className={`min-w-[320px] h-14 text-lg font-bold shadow-lg transition-all ${isWorkflowComplete
                                        ? "bg-gray-100 text-gray-500 hover:bg-gray-100 cursor-not-allowed"
                                        : "bg-[#FFD95D] text-black hover:bg-[#ffe58a] hover:-translate-y-1 hover:shadow-xl"
                                    }`}
                            >
                                {isWorkflowComplete ? <CheckCircle className="mr-2 h-6 w-6 text-green-500" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                                {isWorkflowComplete ? "Stage Completed" : "Finalize Research Stage"}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}