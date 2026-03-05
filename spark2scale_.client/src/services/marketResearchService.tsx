// src/services/marketResearchService.tsx

import apiClient from "@/lib/apiClient";

export interface MarketResearchDoc {
    did: string;
    document_name: string;
    type: string;
    current_path: string;
    current_version: number;
    updated_at: string;
    is_current?: boolean;
    json_response?: any;
}

export const marketResearchService = {
    // 1. Fetch Research
    async getCurrentResearch(startupId: string): Promise<any | null> {
        try {
            const response = await apiClient.get<MarketResearchDoc[]>(`/api/Documents?startupId=${startupId}`);
            const docs = response.data;

            console.log("Fetched Docs:", docs); // DEBUG

            const activeDoc = docs.find(d => {
                const type = d.type.toLowerCase();
                const isMatch = type.includes("market");
                console.log(`Checking doc: ${d.document_name} (${type}) -> Match: ${isMatch}`); // DEBUG
                return isMatch;
            });

            if (!activeDoc) return null;

            if (activeDoc.json_response) {
                let parsedData = activeDoc.json_response;
                if (typeof parsedData === 'string') {
                    try { parsedData = JSON.parse(parsedData); } catch { }
                }

                let contentToMerge = parsedData;
                if (parsedData && typeof parsedData === 'object' && 'data' in parsedData && parsedData.data) {
                    console.log("Unwrapping 'data' property from response...");
                    if (!Array.isArray(parsedData.data) && typeof parsedData.data === 'object') {
                        contentToMerge = parsedData.data;
                    }
                }

                const merged = { ...activeDoc, ...contentToMerge };
                console.log("Merged Data Keys:", Object.keys(merged)); // DEBUG
                return merged;
            }

            if (activeDoc.current_path && !activeDoc.document_name.endsWith(".pdf")) {
                try {
                    const fileRes = await fetch(activeDoc.current_path);
                    if (fileRes.ok) {
                        const jsonContent = await fileRes.json();
                        return { ...activeDoc, ...jsonContent };
                    }
                } catch (err) {
                    console.warn("Download failed:", err);
                }
            }

            return activeDoc;
        } catch (error) {
            console.error("Error fetching research:", error);
            return null;
        }
    },

    // 2. Workflow Status
    async getWorkflowStatus(startupId: string): Promise<boolean> {
        try {
            const response = await apiClient.get<any>(`/api/StartupWorkflow/${startupId}`);
            const data = response.data;
            return data.marketResearch || data.MarketResearch || false;
        } catch (error) {
            return false;
        }
    },

    // 3. Generate Research
    async generateResearch(startupId: string, region: string): Promise<any> {
        try {
            const response = await apiClient.post(`/api/Startups/${startupId}/generate-market-research`, {
                region: region
            }, {
                timeout: 180000
            });

            let result = response.data;

            if (result && typeof result === 'object' && 'data' in result && result.data) {
                console.log("[generateResearch] Unwrapping 'data' property...");
                if (!Array.isArray(result.data) && typeof result.data === 'object') {
                    result = result.data;
                }
            }

            return result;

        } catch (error) {
            console.error("Error generating research:", error);
            throw error;
        }
    },

    // 4. Complete Stage
    async completeStage(startupId: string): Promise<boolean> {
        try {
            const getRes = await apiClient.get<any>(`/api/StartupWorkflow/${startupId}`);
            const current = getRes.data;
            await apiClient.post(`/api/StartupWorkflow/update`, {
                StartupId: startupId,
                IdeaCheck: current.ideaCheck || current.IdeaCheck,
                MarketResearch: true,
                Evaluation: current.evaluation || current.Evaluation,
                Recommendation: current.recommendation || current.Recommendation,
                Documents: current.documents || current.Documents,
                PitchDeck: current.pitchDeck || current.PitchDeck
            });
            return true;
        } catch (error) {
            return false;
        }
    }
};