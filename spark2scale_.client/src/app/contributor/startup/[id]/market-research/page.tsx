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
import { startupService } from "@/services/startupService";
import ContributorHeader from "@/components/contributor/ContributorHeader";

export default function ContributorMarketResearchPage() {
    const params = useParams();
    // Startups under contributor route use [id]
    const startupId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";

    // State
    const [researchDoc, setResearchDoc] = useState<MarketResearchDoc | null>(null);
    const [isWorkflowComplete, setIsWorkflowComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>("Contributor"); // Default to Contributor

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            if (!startupId) return;
            setIsLoading(true);
            try {
                // Use service to fetch data in parallel
                const [doc, isComplete, startupDetails] = await Promise.all([
                    marketResearchService.getCurrentResearch(startupId),
                    marketResearchService.getWorkflowStatus(startupId),
                    startupService.getById(startupId)
                ]);

                setResearchDoc(doc);
                setIsWorkflowComplete(isComplete);
                // Ensure we distinguish contributor from founder
                // Even if fetching details, we treat this page as Read-Only for sure.
                if (startupDetails) {
                    // Force non-founder role for UI logic just in case
                    const role = startupDetails.current_role === 'Founder' ? 'Contributor' : (startupDetails.current_role || "Contributor");
                    setUserRole(role);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [startupId]);

    // Handle "Regenerate" click -> Disabled for Contributor but kept for consistent UI structure if needed
    const handleRegenerateClick = () => {
        // Did nothing
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
                title="📊 Market Research"
                subtitle="Stage 3 of 6 - Analyze your market • Read-Only View"
            />

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">

                    {/* SCENARIO 1: No Document -> Show Empty State */}
                    {!researchDoc && (
                        <div className="text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed">
                            <p className="text-gray-500">No market research generated yet.</p>
                        </div>
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
                                    {/* No Regenerate Button for Contributor */}
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

                                            {/* DOWNLOAD BUTTON */}
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={researchDoc.current_path} download>
                                                    <Download className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* No Complete Button for Contributor */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mt-8 text-center"
                            >
                                {isWorkflowComplete ? (
                                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-700 font-medium text-sm">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Stage Completed by Founder
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                        This stage is currently in progress.
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
