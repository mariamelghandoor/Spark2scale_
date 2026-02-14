import apiClient from '@/lib/apiClient';

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

interface SessionApiResponse {
    sessionId?: string;
    SessionId?: string;
    sessionName?: string;
    SessionName?: string;
    createdAt?: string;
    CreatedAt?: string;
}

interface MessageApiResponse {
    role?: string;
    Role?: string;
    content?: string;
    Content?: string;
    timestamp?: string;
    Timestamp?: string;
}

export const ideaCheckService = {
    // 1. Get Basic Startup Info
    async getStartupDetails(startupId: string): Promise<StartupDetails | null> {
        try {
            const response = await apiClient.get<StartupDetails>(`/api/startups/${startupId}`);
            return response.data;
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
            const response = await apiClient.get<WorkflowApiResponse>(`/api/StartupWorkflow/${startupId}`);
            const json = response.data;

            // Normalize keys (handle PascalCase vs camelCase from API)
            return {
                ideaCheck: json.ideaCheck || json.IdeaCheck || false,
                marketResearch: json.marketResearch || json.MarketResearch || false,
                evaluation: json.evaluation || json.Evaluation || false,
                recommendation: json.recommendation || json.Recommendation || false,
                documents: json.documents || json.Documents || false,
                pitchDeck: json.pitchDeck || json.PitchDeck || false,
            };
        } catch (error) {
            console.error("Error fetching workflow:", error);
            return defaultState;
        }
    },

    async updateWorkflow(payload: WorkflowUpdatePayload): Promise<boolean> {
        try {
            await apiClient.post('/api/StartupWorkflow/update', payload);
            return true;
        } catch (error) {
            console.error("Error updating workflow:", error);
            return false;
        }
    },

    async resetWorkflow(startupId: string): Promise<boolean> {
        try {
            await apiClient.post(`/api/StartupWorkflow/reset/${startupId}`);
            return true;
        } catch (error) {
            console.error("Error resetting workflow:", error);
            return false;
        }
    },

    // 3. Idea Management
    async updateIdea(startupId: string, description: string): Promise<boolean> {
        try {
            await apiClient.put(`/api/startups/update-idea/${startupId}`, { ideaDescription: description });
            return true;
        } catch (error) {
            console.error("Error updating idea:", error);
            return false;
        }
    },

    // 4. Chat Management
    async getSessions(startupId: string): Promise<SessionSummary[]> {
        try {
            const response = await apiClient.get<SessionApiResponse[]>(`/api/Chat/sessions/${startupId}/idea_check`);
            return response.data.map(s => ({
                sessionId: s.sessionId || s.SessionId || "",
                sessionName: s.sessionName || s.SessionName || "New Session",
                createdAt: s.createdAt || s.CreatedAt || new Date().toISOString()
            }));
        } catch (error) {
            console.error("Error fetching sessions:", error);
            return [];
        }
    },

    async getMessages(sessionId: string): Promise<ChatMessage[]> {
        try {
            const response = await apiClient.get<MessageApiResponse[]>(`/api/Chat/messages/${sessionId}`);
            return response.data.map(m => ({
                role: m.role || m.Role || "user",
                content: m.content || m.Content || "",
                timestamp: m.timestamp || m.Timestamp
            }));
        } catch (error) {
            console.error("Error fetching messages:", error);
            return [];
        }
    },

    async startNewSession(startupId: string): Promise<SessionSummary | null> {
        try {
            const response = await apiClient.post<SessionApiResponse>('/api/Chat/start-new', {
                StartupId: startupId,
                FeatureType: 'idea_check'
            });

            const data = response.data;
            return {
                sessionId: data.sessionId || data.SessionId || "",
                sessionName: data.sessionName || data.SessionName || "",
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error("Error creating session:", error);
            return null;
        }
    },

    async sendMessage(sessionId: string, content: string): Promise<void> {
        try {
            await apiClient.post('/api/Chat/send', {
                SessionId: sessionId,
                Role: "user",
                Content: content
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    }
};