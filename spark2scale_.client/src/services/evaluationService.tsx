export interface EvaluationDocument {
    did: string;
    startup_id: string;
    document_name: string;
    type: string;
    current_path: string;
    current_version: number;
    updated_at: string;
}

const API_BASE_URL = "https://localhost:7155/api";

export const evaluationService = {
    // 1. Fetch the specific Evaluation Document
    async getCurrentEvaluation(startupId: string): Promise<EvaluationDocument | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/Documents?startupId=${startupId}`);
            if (!response.ok) throw new Error("Failed to fetch documents");

            const docs: EvaluationDocument[] = await response.json();
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
            const response = await fetch(`${API_BASE_URL}/StartupWorkflow/${startupId}`);
            if (!response.ok) return false;

            const workflow = await response.json();
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
            const getRes = await fetch(`${API_BASE_URL}/StartupWorkflow/${startupId}`);
            if (!getRes.ok) throw new Error("Failed to fetch current workflow");

            const currentData = await getRes.json();

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
            const updateRes = await fetch(`${API_BASE_URL}/StartupWorkflow/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            return updateRes.ok;
        } catch (error) {
            console.error("Error marking complete:", error);
            return false;
        }
    },

    // 4. Trigger Generation
    async generateEvaluation(startupId: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/Documents/generate-mock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    startupId: startupId,
                    type: "Evaluation"
                })
            });
            return response.ok;
        } catch (error) {
            console.error("Error generating evaluation:", error);
            return false;
        }
    }
};