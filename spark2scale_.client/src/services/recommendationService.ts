// services/recommendationService.ts

import apiClient from "@/lib/apiClient";

// --- Types ---

// 1. Response from Recommendation API
export interface RecommendationContent {
    summary: string;
    score: number;
    keyPoints: string[];
    actionPlan: string;
}

export interface DBRecommendation {
    rid: string;
    startup_id: string;
    type: string;
    content: RecommendationContent;
    version: number;
    created_at: string;
    is_current: boolean;
}

// 2. Internal State (Normalized camelCase)
export interface WorkflowState {
    startupId: string;
    ideaCheck: boolean;
    marketResearch: boolean;
    evaluation: boolean;
    recommendation: boolean;
    documents: boolean;
    pitchDeck: boolean;
}

// 3. Payload for Updating Workflow (Matches C# DTO PascalCase)
export interface WorkflowUpdatePayload {
    StartupId: string;
    IdeaCheck: boolean;
    MarketResearch: boolean;
    Evaluation: boolean;
    Recommendation: boolean;
    Documents: boolean;
    PitchDeck: boolean;
}

export const recommendationService = {
    // 1. Fetch Recommendations for the specific Startup ID
    async getRecommendations(startupId: string): Promise<DBRecommendation[]> {
        try {
            const response = await apiClient.get<DBRecommendation[]>(`/api/Recommendations/${startupId}/idea_check`);
            return response.data;
        } catch (error) {
            console.error("Error in getRecommendations:", error);
            return [];
        }
    },

    // --- Workflow Helper: Fetch Current State ---
    async _getWorkflowState(startupId: string): Promise<WorkflowState> {
        const defaultState: WorkflowState = {
            startupId, ideaCheck: false, marketResearch: false, evaluation: false,
            recommendation: false, documents: false, pitchDeck: false
        };

        try {
            const response = await apiClient.get<any>(`/api/StartupWorkflow/${startupId}`);
            const json = response.data;

            // Normalize data (API might return PascalCase or camelCase)
            return {
                startupId,
                ideaCheck: json.ideaCheck || json.IdeaCheck || false,
                marketResearch: json.marketResearch || json.MarketResearch || false,
                evaluation: json.evaluation || json.Evaluation || false,
                recommendation: json.recommendation || json.Recommendation || false,
                documents: json.documents || json.Documents || false,
                pitchDeck: json.pitchDeck || json.PitchDeck || false,
            };
        } catch (error) {
            console.error("Error fetching workflow state:", error);
            return defaultState;
        }
    },

    // --- Workflow Helper: Update State ---
    // FIX: Replaced 'any' with 'WorkflowUpdatePayload'
    async _updateWorkflow(payload: WorkflowUpdatePayload): Promise<void> {
        await apiClient.post(`/api/StartupWorkflow/update`, payload);
    },

    // 2. Action: Complete Stage
    async completeStage(startupId: string): Promise<boolean> {
        try {
            const current = await this._getWorkflowState(startupId);

            // Create the payload
            const payload: WorkflowUpdatePayload = {
                StartupId: startupId,
                IdeaCheck: current.ideaCheck,
                MarketResearch: current.marketResearch,
                Evaluation: current.evaluation,
                Recommendation: true, // Mark Complete
                Documents: current.documents,
                PitchDeck: current.pitchDeck
            };

            // Use the payload (Fixes "assigned but never used")
            await this._updateWorkflow(payload);

            return true;
        } catch (error) {
            console.error("Error completing stage:", error);
            return false;
        }
    },

    // 3. Action: Loop Back (Restart)
    async loopBackToStart(startupId: string): Promise<boolean> {
        try {
            // A. Start New Chat Session
            await apiClient.post(`/api/Chat/start-new`, {
                StartupId: startupId,
                FeatureType: 'idea_check'
            });

            // B. Reset Workflow
            const payload: WorkflowUpdatePayload = {
                StartupId: startupId,
                IdeaCheck: false,
                MarketResearch: false,
                Evaluation: false,
                Recommendation: false,
                Documents: false,
                PitchDeck: false
            };

            // Use the payload
            await this._updateWorkflow(payload);

            return true;
        } catch (error) {
            console.error("Error looping back:", error);
            return false;
        }
    },

    // 4. Action: Regenerate
    async regenerateRecommendation(startupId: string): Promise<boolean> {
        try {
            const current = await this._getWorkflowState(startupId);

            const payload: WorkflowUpdatePayload = {
                StartupId: startupId,
                IdeaCheck: current.ideaCheck,
                MarketResearch: current.marketResearch,
                Evaluation: current.evaluation,
                Recommendation: false, // Reset this stage
                Documents: current.documents,
                PitchDeck: current.pitchDeck
            };

            // Use the payload
            await this._updateWorkflow(payload);

            return true;
        } catch (error) {
            console.error("Error regenerating:", error);
            return false;
        }
    }
};