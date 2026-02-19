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
    json_response?: any; // <--- Critical: Maps to DB column
}

export const marketResearchService = {
    // 1. Fetch Research
    async getCurrentResearch(startupId: string): Promise<any | null> {
        try {
            // Fetch all documents for this startup
            const response = await apiClient.get<MarketResearchDoc[]>(`/api/Documents?startupId=${startupId}`);
            const docs = response.data;

            console.log("Fetched Docs:", docs); // DEBUG

            // Find the one marked 'is_current: true' by the backend
            // UPDATE: User confirmed no 'is_current' column in docs table or DTO.
            // Backend sorts by updated_at DESC, so the first match is the latest.
            const activeDoc = docs.find(d => {
                const type = d.type.toLowerCase();
                const isMatch = type.includes("market");
                console.log(`Checking doc: ${d.document_name} (${type}) -> Match: ${isMatch}`); // DEBUG
                return isMatch;
            });

            if (!activeDoc) return null;

            // A. Check Database JSON Column (Best)
            if (activeDoc.json_response) {
                // If it's a string (sometimes happens with double serialization), parse it
                let parsedData = activeDoc.json_response;
                if (typeof parsedData === 'string') {
                    try { parsedData = JSON.parse(parsedData); } catch { }
                }

                // Merge metadata with the actual report data
                // FIX: Some API responses wrap the content in a "data" property. Unwrap it if needed.
                let contentToMerge = parsedData;
                if (parsedData && typeof parsedData === 'object' && 'data' in parsedData && parsedData.data) {
                    console.log("Unwrapping 'data' property from response...");
                    // Check if 'data' is the actual object we want (has opportunity_analysis etc)
                    // or if it's just an array (some logs showed arrays).
                    // For now, let's try to merge 'data' if it's an object.
                    if (!Array.isArray(parsedData.data) && typeof parsedData.data === 'object') {
                        contentToMerge = parsedData.data;
                    }
                }

                const merged = { ...activeDoc, ...contentToMerge };
                console.log("Merged Data Keys:", Object.keys(merged)); // DEBUG
                return merged;
            }

            // B. Fallback: Download from File (Old versions)
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
    async generateResearch(startupId: string, region: string, category: string): Promise<any> {
        try {
            // 10 min timeout
            const response = await apiClient.post(`/api/Startups/${startupId}/generate-market-research`, {
                region: region,
                category: category
            }, {
                timeout: 600000
            });

            // The backend returns Content(json, "application/json")
            // So response.data IS the JSON object.
            let result = response.data;

            // FIX: Unwrap 'data' property if present (consistency with getCurrentResearch)
            if (result && typeof result === 'object' && 'data' in result && result.data) {
                console.log("[generateResearch] Unwrapping 'data' property...");
                if (!Array.isArray(result.data) && typeof result.data === 'object') {
                    result = result.data;
                }
            }

            return result;

        } catch (error) {
            console.error("Error generating research:", error);
            throw error; // Throw so the UI can show an alert
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