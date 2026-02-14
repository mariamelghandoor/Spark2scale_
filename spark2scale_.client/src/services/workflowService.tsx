// services/workflowService.tsx

import apiClient from "@/lib/apiClient";

export const workflowService = {
    completePitchStage: async (startupId: string) => {
        try {
            const response = await apiClient.post(`/api/StartupWorkflow/complete-pitch/${startupId}`);
            return response.data;
        } catch (error: any) {
            const errorText = error.response?.data || "Failed to update workflow.";
            throw new Error(typeof errorText === 'string' ? errorText : JSON.stringify(errorText));
        }
    }
};