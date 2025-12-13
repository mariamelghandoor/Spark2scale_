"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Filter, Sparkles, Eye, CheckCircle, RotateCcw, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { marketResearchService, MarketResearchDoc } from "@/services/marketResearchService";

export default function MarketResearchPage() {
    const params = useParams();
    const startupId = params.d as string;

    // State
    const [researchDoc, setResearchDoc] = useState<MarketResearchDoc | null>(null);
    const [isWorkflowComplete, setIsWorkflowComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Form Inputs
    const [region, setRegion] = useState("");
    const [category, setCategory] = useState("");

    // Initial Load
    // Inside MarketResearchPage.tsx

    useEffect(() => {
        const loadData = async () => {
            if (!startupId) return;
            setIsLoading(true);
            try {
                // DEBUG: Fetch raw list first to see what's actually coming back
                const response = await fetch(`https://localhost:7155/api/Documents?startupId=${startupId}`);
                const allDocs = await response.json();

                console.log("🔥 DEBUG: All Documents from API:", allDocs);

                // Check specifically for your file
                const found = allDocs.find((d: any) =>
                    d.type.toLowerCase().includes("market") && d.is_current === true
                );
                console.log("🔥 DEBUG: Found Market Doc:", found);

                // Now run the service logic
                const [doc, isComplete] = await Promise.all([
                    marketResearchService.getCurrentResearch(startupId),
                    marketResearchService.getWorkflowStatus(startupId)
                ]);

                setResearchDoc(doc);
                setIsWorkflowComplete(isComplete);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [startupId]);

    // Handle Generation
    const handleGenerate = async () => {
        if (!region || !category) {
            alert("Please select a Region and Category");
            return;
        }

        setIsGenerating(true);
        const success = await marketResearchService.generateResearch(startupId, region, category);

        if (success) {
            // Refresh Data
            const newDoc = await marketResearchService.getCurrentResearch(startupId);
            setResearchDoc(newDoc);

            // Reset completion status so user can re-approve new data
            setIsWorkflowComplete(false);
        }
        setIsGenerating(false);
    };

    // Handle Complete
    const handleComplete = async () => {
        const success = await marketResearchService.completeStage(startupId);
        if (success) setIsWorkflowComplete(true);
    };

    // Handle "Regenerate" click (Just clears the doc view so form reappears)
    const handleRegenerateClick = () => {
        setResearchDoc(null); // This reveals the form again
        setIsWorkflowComplete(false);
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
                            <h1 className="text-xl font-bold text-[#576238]">
                                📊 Market Research
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Stage 3 of 6 - Analyze your market
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">

                    {/* SCENARIO 1: No Document -> Show Generator Form */}
                    {!researchDoc && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="mb-6 border-2 border-[#FFD95D]">
                                <CardHeader className="bg-gradient-to-r from-[#FFD95D]/20 to-transparent">
                                    <CardTitle className="text-[#576238] flex items-center gap-2">
                                        <Sparkles className="h-5 w-5" />
                                        Generate Market Research
                                    </CardTitle>
                                    <CardDescription>
                                        Select your parameters to generate an AI-powered market report.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="region">
                                                    <Filter className="inline h-4 w-4 mr-2" />
                                                    Region
                                                </Label>
                                                <Select value={region} onValueChange={setRegion}>
                                                    <SelectTrigger id="region">
                                                        <SelectValue placeholder="Select region" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Global">Global</SelectItem>
                                                        <SelectItem value="North America">North America</SelectItem>
                                                        <SelectItem value="Europe">Europe</SelectItem>
                                                        <SelectItem value="Asia">Asia</SelectItem>
                                                        <SelectItem value="Africa">Africa</SelectItem>
                                                        <SelectItem value="MENA">MENA</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="category">
                                                    <Filter className="inline h-4 w-4 mr-2" />
                                                    Category
                                                </Label>
                                                <Select value={category} onValueChange={setCategory}>
                                                    <SelectTrigger id="category">
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Market Size">Market Size</SelectItem>
                                                        <SelectItem value="Competition Analysis">Competition Analysis</SelectItem>
                                                        <SelectItem value="Industry Trends">Industry Trends</SelectItem>
                                                        <SelectItem value="Customer Segments">Customer Segments</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleGenerate}
                                            disabled={isGenerating}
                                            className="w-full bg-[#576238] hover:bg-[#6b7c3f]"
                                            size="lg"
                                        >
                                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                            {isGenerating ? "Generating Report..." : "Generate Market Research"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* SCENARIO 2: Document Exists -> Show Report Card */}
                    {researchDoc && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-2 border-[#576238]/20 bg-white">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div>
                                        <CardTitle className="text-[#576238] text-xl">
                                            {researchDoc.document_name}
                                        </CardTitle>
                                        <CardDescription>
                                            Generated on {new Date(researchDoc.updated_at).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRegenerateClick}
                                            disabled={isWorkflowComplete} // Optional: Lock regen if completed?
                                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                        >
                                            <RotateCcw className="h-4 w-4 mr-2" />
                                            Regenerate
                                        </Button>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-4">
                                    <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">Analysis PDF</p>
                                                <p className="text-xs text-muted-foreground">Version {researchDoc.current_version}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            {/* VIEW BUTTON */}
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={researchDoc.current_path} target="_blank" rel="noopener noreferrer">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View
                                                </a>
                                            </Button>

                                            {/* DOWNLOAD BUTTON (Icon Only) */}
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={researchDoc.current_path} download>
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* COMPLETE BUTTON */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mt-8 text-center"
                            >
                                <Button
                                    size="lg"
                                    onClick={handleComplete}
                                    disabled={isWorkflowComplete}
                                    className={`
                                        min-w-[250px] font-semibold transition-all duration-300
                                        ${isWorkflowComplete
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
                                            : "bg-[#FFD95D] hover:bg-[#ffe89a] text-black"
                                        }
                                    `}
                                >
                                    {isWorkflowComplete ? (
                                        <>
                                            <CheckCircle className="mr-2 h-5 w-5" />
                                            Research Completed
                                        </>
                                    ) : (
                                        "Complete Research Stage"
                                    )}
                                </Button>
                            </motion.div>

                        </motion.div>
                    )}

                </div>
            </main>
        </div>
    );
}