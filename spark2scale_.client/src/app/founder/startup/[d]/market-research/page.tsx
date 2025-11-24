"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Filter, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function MarketResearchPage() {
    const params = useParams();
    const [region, setRegion] = useState("");
    const [category, setCategory] = useState("");
    const [researches, setResearches] = useState([
        {
            id: 1,
            title: "Sustainability Market Analysis",
            date: "2024-02-10",
            region: "North America",
            category: "Green Technology",
        },
        {
            id: 2,
            title: "Competitive Landscape Report",
            date: "2024-02-08",
            region: "Global",
            category: "Green Technology",
        },
    ]);

    const handleGenerate = () => {
        console.log("Generating research with:", { region, category });
        // Add new research to list
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
                    {/* Generate New Research */}
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
                                    Get AI-powered insights about your target market
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
                                                    <SelectItem value="global">Global</SelectItem>
                                                    <SelectItem value="north-america">
                                                        North America
                                                    </SelectItem>
                                                    <SelectItem value="europe">Europe</SelectItem>
                                                    <SelectItem value="asia">Asia</SelectItem>
                                                    <SelectItem value="africa">Africa</SelectItem>
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
                                                    <SelectItem value="market-size">
                                                        Market Size
                                                    </SelectItem>
                                                    <SelectItem value="competition">
                                                        Competition Analysis
                                                    </SelectItem>
                                                    <SelectItem value="trends">Industry Trends</SelectItem>
                                                    <SelectItem value="customer-segments">
                                                        Customer Segments
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleGenerate}
                                        className="w-full bg-[#576238] hover:bg-[#6b7c3f]"
                                        size="lg"
                                    >
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate Market Research
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Research History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="text-[#576238]">
                                    Research History
                                </CardTitle>
                                <CardDescription>
                                    Your previously generated market research reports
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {researches.map((research, index) => (
                                        <motion.div
                                            key={research.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + index * 0.1 }}
                                            className="flex items-center justify-between p-4 rounded-lg border-2 hover:border-[#FFD95D] transition-all"
                                        >
                                            <div>
                                                <p className="font-semibold text-[#576238]">
                                                    {research.title}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {research.region} • {research.category} •{" "}
                                                    {new Date(research.date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    PDF
                                                </Button>
                                                <Button variant="outline" size="sm">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Word
                                                </Button>
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
                                Complete Market Research
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
