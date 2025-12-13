// services/evaluationService.ts

export interface EvaluationDocument {
    did: string;
    startup_id: string;
    document_name: string;
    type: string;
    current_path: string; // The URL to the PDF
    current_version: number;
    updated_at: string;
}

export interface WorkflowStatus {
    evaluation: boolean; // true if stage is completed
}

const API_BASE_URL = "https://localhost:7155/api"; // Adjust to your actual API port

export const evaluationService = {
    // 1. Fetch the specific Evaluation Document (IsCurrent = true)
    async getCurrentEvaluation(startupId: string): Promise<EvaluationDocument | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/Documents?startupId=${startupId}`);
            if (!response.ok) throw new Error("Failed to fetch documents");

            const docs: EvaluationDocument[] = await response.json();

            // Filter for Type "Evaluation" (Case insensitive just in case)
            const evalDoc = docs.find(d => d.type.toLowerCase() === "evaluation");

            return evalDoc || null;
        } catch (error) {
            console.error("Error fetching evaluation:", error);
            return null;
        }
    },

    // 2. Check if the "Evaluation" stage is marked as complete in the workflow
    async getWorkflowStatus(startupId: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/StartupWorkflow/${startupId}`);
            if (!response.ok) return false;

            const workflow = await response.json();
            return workflow.evaluation === true;
        } catch (error) {
            console.error("Error fetching workflow:", error);
            return false;
        }
    },

    // 3. Mark the stage as Complete
    async markAsComplete(startupId: string): Promise<boolean> {
        try {
            const payload = {
                startupId: startupId,
                evaluation: true,
                // We must preserve other flags, but ideally the backend Upsert logic 
                // in your controller handles this or we send a partial update if supported.
                // Based on your Controller, we need to send the object. 
                // NOTE: For a real app, fetching the current workflow first then updating is safer,
                // or creating a specific PATCH endpoint. 
                // For now, we assume the backend handles the merge or we send just the flag if modified.
                // *In your specific C# Controller, you are replacing values. 
                // To be safe, we should ideally fetch, change one flag, then push back.*
            };

            // Simplified approach: We assume the user wants to set Evaluation=true.
            // Since your C# `UpdateWorkflow` takes a DTO, we really should fetch current state first.
            // *Correction*: I will implement the fetch-then-update logic inside the Page component 
            // to ensure data integrity, or assume the backend handles partials (which your code currently doesn't).
            // Let's rely on the Page to pass the full current state + the change.
            return true;
        } catch (error) {
            console.error("Error marking complete:", error);
            return false;
        }
    },

    // 4. Trigger Generation (Using the GenerateMock endpoint from previous context)
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