import apiClient from "@/lib/apiClient";

export interface EvaluationDocument {
    did: string;
    startup_id: string;
    document_name: string;
    type: string;
    current_path: string;
    current_version: number;
    updated_at: string;
}

interface WorkflowData {
    [key: string]: unknown;
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

export const evaluationService = {
    // 1. Fetch the specific Evaluation Document
    async getCurrentEvaluation(startupId: string): Promise<EvaluationDocument | null> {
        try {
            const response = await apiClient.get<EvaluationDocument[]>(`/api/Documents?startupId=${startupId}`);
            const docs = response.data;
            const evalDoc = docs.find(d => d.type.toLowerCase() === "evaluation");

            return evalDoc || null;
        } catch (error) {
            console.error("Error fetching evaluation:", error);
            return null;
        }
    },

    // 2. Check if the "Evaluation" stage is complete
    async getWorkflowStatus(startupId: string): Promise<boolean> {
        try {
            const response = await apiClient.get<WorkflowData>(`/api/StartupWorkflow/${startupId}`);
            const workflow = response.data;
            // Handle potential casing (camelCase vs PascalCase)
            return workflow.evaluation === true || workflow.Evaluation === true;
        } catch (error) {
            console.error("Error fetching workflow:", error);
            return false;
        }
    },

    // 3. Mark the stage as Complete (Logic moved here)
    async markAsComplete(startupId: string): Promise<boolean> {
        try {
            // A. Fetch current state to preserve other flags
            const getRes = await apiClient.get<WorkflowData>(`/api/StartupWorkflow/${startupId}`);
            const currentData = getRes.data;

            // B. Construct Payload (Mapping to C# DTO structure)
            const updatePayload = {
                StartupId: startupId,
                IdeaCheck: currentData.ideaCheck || currentData.IdeaCheck,
                MarketResearch: currentData.marketResearch || currentData.MarketResearch,
                Evaluation: true, // <--- The change
                Recommendation: currentData.recommendation || currentData.Recommendation,
                Documents: currentData.documents || currentData.Documents,
                PitchDeck: currentData.pitchDeck || currentData.PitchDeck
            };

            // C. Send Update
            await apiClient.post(`/api/StartupWorkflow/update`, updatePayload);

            return true;
        } catch (error) {
            console.error("Error marking complete:", error);
            return false;
        }
    },

    // 4. Trigger Generation
    async generateEvaluation(startupId: string): Promise<boolean> {
        try {
            await apiClient.post(`/api/Documents/generate-mock`, {
                startupId: startupId,
                type: "Evaluation"
            });
            return true;
        } catch (error) {
            console.error("Error generating evaluation:", error);
            return false;
        }
    }
};