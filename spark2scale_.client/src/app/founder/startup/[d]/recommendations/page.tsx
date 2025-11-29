"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";

// --- Types ---
interface RecItem {
    category: string;
    recommendation: string;
    priority: string;
}

interface Recommendation {
    id: string | number;
    date: string;
    version: number;
    items: RecItem[];
}

interface DocumentResponse {
    did: string;
    master_id: string;
    startup_id: string;
    document_name: string;
    type: string;
    path: string;
    version: number;
    canaccess: number;
    created_at: string;
}

interface WorkflowStatus {
    ideaCheck: boolean;
    marketResearch: boolean;
    evaluation: boolean;
    recommendation: boolean;
    documents: boolean;
    pitchDeck: boolean;
}

export default function RecommendationsPage() {
    const params = useParams();
    const router = useRouter();

    const [isLoadingButtons, setIsLoadingButtons] = useState<boolean>(false);

    // Default state (Placeholder)
    const [recommendations, setRecommendations] = useState<Recommendation[]>([
        {
            id: "static-1",
            date: new Date().toISOString(),
            version: 1,
            items: [
                {
                    category: "System",
                    recommendation: "Loading data from database...",
                    priority: "Low"
                }
            ],
        },
    ]);

    // --- FIX: Robust ID Getter ---
    const getStartupId = (): string | null => {
        // 1. Check what params we actually have
        // console.log("Current Params:", params); 

        // 2. Try 'd' (from your previous code) OR 'id' (standard convention)
        const rawParam = params?.d || params?.id;

        if (!rawParam) {
            console.error("No Startup ID found in URL parameters");
            return null;
        }

        const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        return decodeURIComponent(rawId).replace(/\s/g, '');
    };

    const cleanId = getStartupId();

    // 1. Fetch Recommendations on Load
    useEffect(() => {
        const fetchDocs = async () => {
            if (!cleanId) return;

            console.log("Fetching recommendations for ID:", cleanId); // Debug Log

            try {
                const response = await fetch(`https://localhost:7155/api/documents/recommendations/${cleanId}`);

                if (response.ok) {
                    const data: DocumentResponse[] = await response.json();
                    console.log("Data received from DB:", data); // Debug Log

                    if (data.length > 0) {
                        const mappedDocs: Recommendation[] = data.map((doc) => ({
                            id: doc.did,
                            date: doc.created_at,
                            version: doc.version,
                            items: [
                                {
                                    category: "File Record",
                                    // Use the document_name from DB
                                    recommendation: doc.document_name || "Untitled Recommendation",
                                    priority: "High"
                                }
                            ]
                        }));
                        setRecommendations(mappedDocs);
                    } else {
                        // If API works but returns empty array
                        setRecommendations([{
                            id: "empty",
                            date: new Date().toISOString(),
                            version: 0,
                            items: [{ category: "System", recommendation: "No recommendations found in DB.", priority: "Low" }]
                        }]);
                    }
                } else {
                    console.error("API Error:", response.statusText);
                }
            } catch (error) {
                console.error("Error fetching recommendations:", error);
            }
        };

        fetchDocs();
    }, [cleanId]);

    // 2. Handle "Complete & Continue"
    const handleComplete = async () => {
        setIsLoadingButtons(true);
        if (!cleanId) return;

        try {
            const getResponse = await fetch(`https://localhost:7155/api/StartupWorkflow/${cleanId}`);

            let currentData: WorkflowStatus = {
                ideaCheck: false, marketResearch: false, evaluation: false,
                recommendation: false, documents: false, pitchDeck: false
            };

            if (getResponse.ok) {
                const json = await getResponse.json();
                // Handle different casing (Pascal vs Camel)
                currentData = {
                    ideaCheck: json.ideaCheck || json.IdeaCheck,
                    marketResearch: json.marketResearch || json.MarketResearch,
                    evaluation: json.evaluation || json.Evaluation,
                    recommendation: json.recommendation || json.Recommendation,
                    documents: json.documents || json.Documents,
                    pitchDeck: json.pitchDeck || json.PitchDeck,
                };
            }

            const updatePayload = {
                StartupId: cleanId,
                IdeaCheck: currentData.ideaCheck,
                MarketResearch: currentData.marketResearch,
                Evaluation: currentData.evaluation,
                Recommendation: true,
                Documents: currentData.documents,
                PitchDeck: currentData.pitchDeck
            };

            await fetch(`https://localhost:7155/api/StartupWorkflow/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            router.push(`/founder/startup/${cleanId}`); // Fixed: Using cleanId

        } catch (error) {
            console.error("Error completing stage:", error);
        } finally {
            setIsLoadingButtons(false);
        }
    };

    // 3. Handle "Loop Back to Idea Stage"
    const handleLoopBack = async () => {
        setIsLoadingButtons(true);
        if (!cleanId) return;

        try {
            const resetPayload = {
                StartupId: cleanId,
                IdeaCheck: false,
                MarketResearch: false,
                Evaluation: false,
                Recommendation: false,
                Documents: false,
                PitchDeck: false
            };

            await fetch(`https://localhost:7155/api/StartupWorkflow/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resetPayload),
            });

            router.push(`/founder/startup/${cleanId}/idea-check`); // Fixed: Using cleanId

        } catch (error) {
            console.error("Error looping back:", error);
        } finally {
            setIsLoadingButtons(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "High": return "text-red-600 bg-red-50 border-red-200";
            case "Medium": return "text-yellow-600 bg-yellow-50 border-yellow-200";
            case "Low": return "text-green-600 bg-green-50 border-green-200";
            default: return "text-gray-600 bg-gray-50 border-gray-200";
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {/* Fixed Link to use cleanId */}
                        <Link href={`/founder/startup/${cleanId}`}>
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
                                {recommendations.map((rec) => (
                                    <div key={rec.id} className="space-y-4 mb-8 border-b pb-4 last:border-0">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[#576238]">Version {rec.version}</span>
                                                <p className="text-sm text-muted-foreground">
                                                    Generated on {new Date(rec.date).toLocaleDateString()}
                                                </p>
                                            </div>
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
                                                    className="p-4 rounded-lg border-2 hover:border-[#FFD95D] transition-all"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="font-semibold text-[#576238]">
                                                                    {item.category}
                                                                </span>
                                                                <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(item.priority)}`}>
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
                            onClick={handleLoopBack}
                            disabled={isLoadingButtons}
                        >
                            {isLoadingButtons ? <Loader2 className="animate-spin" /> : (
                                <>
                                    <RefreshCw className="mr-2 h-5 w-5" />
                                    Loop Back to Idea Stage
                                </>
                            )}
                        </Button>

                        <Button
                            size="lg"
                            className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold"
                            onClick={handleComplete}
                            disabled={isLoadingButtons}
                        >
                            {isLoadingButtons ? <Loader2 className="animate-spin" /> : "Complete & Continue"}
                        </Button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}