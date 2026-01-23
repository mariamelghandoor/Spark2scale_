// services/ideaCheckService.ts

const API_BASE_URL = "https://localhost:7155/api";

// --- Types ---

export interface SessionSummary {
    sessionId: string;
    sessionName: string;
    createdAt: string;
}

export interface ChatMessage {
    role: string;
    content: string;
    timestamp?: string;
}

export interface StartupDetails {
    startupname: string;
    idea_description: string;
}

export interface WorkflowState {
    ideaCheck: boolean;
    marketResearch: boolean;
    evaluation: boolean;
    recommendation: boolean;
    documents: boolean;
    pitchDeck: boolean;
}

export interface WorkflowUpdatePayload {
    StartupId: string;
    IdeaCheck: boolean;
    MarketResearch: boolean;
    Evaluation: boolean;
    Recommendation: boolean;
    Documents: boolean;
    PitchDeck: boolean;
}

export const ideaCheckService = {
    // 1. Get Basic Startup Info
    async getStartupDetails(startupId: string): Promise<StartupDetails | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/startups/${startupId}`);
            if (response.ok) return await response.json();
            return null;
        } catch (error) {
            console.error("Error fetching startup details:", error);
            throw error;
        }
    },

    // 2. Workflow Management
    async getWorkflowStatus(startupId: string): Promise<WorkflowState> {
        // Default state
        const defaultState: WorkflowState = {
            ideaCheck: false, marketResearch: false, evaluation: false,
            recommendation: false, documents: false, pitchDeck: false
        };

        try {
            const response = await fetch(`${API_BASE_URL}/StartupWorkflow/${startupId}`);
            if (response.ok) {
                const json = await response.json();
                // Normalize keys (handle PascalCase vs camelCase from API)
                return {
                    ideaCheck: json.ideaCheck || json.IdeaCheck || false,
                    marketResearch: json.marketResearch || json.MarketResearch || false,
                    evaluation: json.evaluation || json.Evaluation || false,
                    recommendation: json.recommendation || json.Recommendation || false,
                    documents: json.documents || json.Documents || false,
                    pitchDeck: json.pitchDeck || json.PitchDeck || false,
                };
            }
            return defaultState;
        } catch (error) {
            console.error("Error fetching workflow:", error);
            return defaultState;
        }
    },

    async updateWorkflow(payload: WorkflowUpdatePayload): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/StartupWorkflow/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            return response.ok;
        } catch (error) {
            console.error("Error updating workflow:", error);
            return false;
        }
    },

    async resetWorkflow(startupId: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/StartupWorkflow/reset/${startupId}`, {
                method: 'POST',
            });
            return response.ok;
        } catch (error) {
            console.error("Error resetting workflow:", error);
            return false;
        }
    },

    // 3. Idea Management
    async updateIdea(startupId: string, description: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/startups/update-idea/${startupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ideaDescription: description }),
            });
            return response.ok;
        } catch (error) {
            console.error("Error updating idea:", error);
            return false;
        }
    },

    // 4. Chat Management
    async getSessions(startupId: string): Promise<SessionSummary[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/Chat/sessions/${startupId}/idea_check`);
            if (response.ok) return await response.json();
            return [];
        } catch (error) {
            console.error("Error fetching sessions:", error);
            return [];
        }
    },

    async getMessages(sessionId: string): Promise<ChatMessage[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/Chat/messages/${sessionId}`);
            if (response.ok) return await response.json();
            return [];
        } catch (error) {
            console.error("Error fetching messages:", error);
            return [];
        }
    },

    async startNewSession(startupId: string): Promise<SessionSummary | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/Chat/start-new`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    StartupId: startupId,
                    FeatureType: 'idea_check'
                })
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    sessionId: data.sessionId,
                    sessionName: data.sessionName,
                    createdAt: new Date().toISOString()
                };
            }
            return null;
        } catch (error) {
            console.error("Error creating session:", error);
            return null;
        }
    },

    async sendMessage(sessionId: string, content: string): Promise<void> {
        try {
            await fetch(`${API_BASE_URL}/Chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SessionId: sessionId,
                    Role: "user",
                    Content: content
                })
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    }
};