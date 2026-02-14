// services/marketResearchService.tsx

import apiClient from "@/lib/apiClient";

export interface MarketResearchDoc {
    did: string;
    document_name: string;
    type: string;
    current_path: string;
    current_version: number;
    updated_at: string;
    is_current?: boolean; // Optional property
}

interface WorkflowApiResponse {
    ideaCheck?: boolean;
    IdeaCheck?: boolean;
    marketResearch?: boolean;
    MarketResearch?: boolean;
    evaluation?: boolean;
    Evaluation?: boolean;
    recommendation?: boolean;
    Recommendation?: boolean;
    documents?: boolean;
    Documents?: boolean;
    pitchDeck?: boolean;
    PitchDeck?: boolean;
}

export const marketResearchService = {
    // 1. Fetch the specific Market Research Document
    async getCurrentResearch(startupId: string): Promise<MarketResearchDoc | null> {
        try {
            const response = await apiClient.get<MarketResearchDoc[]>(`/api/Documents?startupId=${startupId}`);
            const docs = response.data;

            // Find the correct document (flexible logic for 'is_current')
            const doc = docs.find(d => {
                const type = d.type.toLowerCase();
                const isTypeMatch = type.includes("market");

                // If 'is_current' is missing, assume it's current (API behavior), otherwise check true
                const isCurrent = d.is_current === undefined || d.is_current === true;

                return isTypeMatch && isCurrent;
            });

            return doc || null;
        } catch (error) {
            console.error("Error fetching market research:", error);
            return null;
        }
    },

    // 2. Check Workflow Status
    async getWorkflowStatus(startupId: string): Promise<boolean> {
        try {
            const response = await apiClient.get<WorkflowApiResponse>(`/api/StartupWorkflow/${startupId}`);
            const workflow = response.data;
            // Handle casing variations
            return workflow.marketResearch === true || workflow.MarketResearch === true;
        } catch (error) {
            console.error("Error fetching workflow:", error);
            return false;
        }
    },

    // 3. Generate New Research
    async generateResearch(startupId: string, region: string, category: string): Promise<boolean> {
        try {
            await apiClient.post(`/api/Documents/generate-mock`, {
                startupId: startupId,
                type: "Market Research",
                region: region,
                category: category
            });
            return true;
        } catch (error) {
            console.error("Error generating research:", error);
            return false;
        }
    },

    // 4. Mark Stage as Complete
    async completeStage(startupId: string): Promise<boolean> {
        try {
            // A. Get current state to preserve flags
            const getRes = await apiClient.get<WorkflowApiResponse>(`/api/StartupWorkflow/${startupId}`);
            const currentData = getRes.data;

            // B. Construct update payload
            const updatedWorkflow = {
                StartupId: startupId,
                IdeaCheck: currentData.ideaCheck || currentData.IdeaCheck,
                MarketResearch: true, // <--- Set to TRUE
                Evaluation: currentData.evaluation || currentData.Evaluation,
                Recommendation: currentData.recommendation || currentData.Recommendation,
                Documents: currentData.documents || currentData.Documents,
                PitchDeck: currentData.pitchDeck || currentData.PitchDeck
            };

            // C. Send Update
            await apiClient.post(`/api/StartupWorkflow/update`, updatedWorkflow);

            return true;
        } catch (error) {
            console.error("Error completing stage:", error);
            return false;
        }
    }
};
