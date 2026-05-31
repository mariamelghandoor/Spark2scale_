"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { recommendationService, DBRecommendation } from "@/services/recommendationService";
import ContributorHeader from "@/components/contributor/ContributorHeader";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import LegoSpinner from "@/components/lego/LegoSpinner";

export default function ContributorRecommendationsPage() {
    const params = useParams();

    const [recommendations, setRecommendations] = useState<DBRecommendation[]>([]);
    const [isLoadingData, setIsLoadingData]     = useState(true);

    const cleanId = params?.id
        ? Array.isArray(params.id) ? params.id[0] : params.id
        : "";

    // -----------------------------------------------------------------------
    // Fetch recommendations
    // -----------------------------------------------------------------------
    useEffect(() => {
        const fetchData = async () => {
            if (!cleanId) return;
            setIsLoadingData(true);
            try {
                const data = await recommendationService.getRecommendations(cleanId);
                setRecommendations(data);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchData();
    }, [cleanId]);

    const hasRecommendations = recommendations.length > 0;

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[#F4F1EA]">
            <ContributorHeader
                backLink={`/contributor/startup/${cleanId}`}
                title="✨ Recommendations"
                subtitle="Stage 5 of 6 — Refinement · Read-Only View"
                className="sticky top-0 z-10"
            />

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                {isLoadingData ? (
                    <div className="text-center py-20">
                        <LegoSpinner className="h-10 w-10 animate-spin mx-auto text-[#576238] mb-4" />
                        <p className="text-muted-foreground">Loading analysis…</p>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        {!hasRecommendations ? (
                            /* Empty state */
                            <div className="text-center p-12 bg-white rounded-xl border shadow-sm">
                                <p className="text-gray-500 text-lg">No investment memo available yet.</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    The founder needs to generate the analysis first.
                                </p>
                            </div>
                        ) : (
                            /* Single current recommendation card */
                            <RecommendationCard
                                recommendation={recommendations[0]}
                                startupId={cleanId}
                            />
                        )}
                    </motion.div>
                )}
            </main>
        </div>
    );
}
