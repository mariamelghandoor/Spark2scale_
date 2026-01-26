// MAKE SURE THIS MATCHES YOUR CONTROLLER ROUTE
// Your controller says: [Route("api/[controller]")] -> api/StartupWorkflow
const API_BASE_URL = "https://localhost:7155/api/StartupWorkflow";

export const workflowService = {
    completePitchStage: async (startupId: string) => {
        const response = await fetch(`${API_BASE_URL}/complete-pitch/${startupId}`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Failed to update workflow.");
        }

        return await response.json();
    }
};