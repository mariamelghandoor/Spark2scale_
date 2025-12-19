// services/marketResearchService.ts

export interface MarketResearchDoc {
    did: string;
    document_name: string;
    type: string;
    current_path: string;
    current_version: number;
    updated_at: string;
    is_current?: boolean; // Make this optional
}

const API_BASE_URL = "https://localhost:7155/api";

export const marketResearchService = {
    // 1. Fetch the specific Market Research Document
    async getCurrentResearch(startupId: string): Promise<MarketResearchDoc | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/Documents?startupId=${startupId}`);
            if (!response.ok) throw new Error("Failed to fetch documents");

            const docs: MarketResearchDoc[] = await response.json();

            // --- THE FIX ---
            const doc = docs.find(d => {
                const type = d.type.toLowerCase();
                const isTypeMatch = type.includes("market");

                // FIX: If 'is_current' is undefined, it means the API implicitly returned current docs.
                // So we accept it if it's true OR undefined.
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
            const response = await fetch(`${API_BASE_URL}/StartupWorkflow/${startupId}`);
            if (!response.ok) return false;

            const workflow = await response.json();
            return workflow.marketResearch === true;
        } catch (error) {
            console.error("Error fetching workflow:", error);
            return false;
        }
    },

    // 3. Generate New Research
    async generateResearch(startupId: string, region: string, category: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/Documents/generate-mock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    startupId: startupId,
                    type: "Market Research",
                    region: region,
                    category: category
                })
            });
            return response.ok;
        } catch (error) {
            console.error("Error generating research:", error);
            return false;
        }
    },

    // 4. Mark Stage as Complete
    async completeStage(startupId: string): Promise<boolean> {
        try {
            const getRes = await fetch(`${API_BASE_URL}/StartupWorkflow/${startupId}`);
            const currentWorkflow = await getRes.json();

            const updatedWorkflow = {
                ...currentWorkflow,
                marketResearch: true,
                startupId: startupId
            };

            const postRes = await fetch(`${API_BASE_URL}/StartupWorkflow/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedWorkflow)
            });

            return postRes.ok;
        } catch (error) {
            console.error("Error completing stage:", error);
            return false;
        }
    }
};