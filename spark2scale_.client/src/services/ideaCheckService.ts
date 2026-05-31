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

// --- External AI API base URL ---
const AI_API_BASE = 'https://spark2scale-ai-api-server.azurewebsites.net/api/v1';

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
        const defaultState: WorkflowState = {
            ideaCheck: false, marketResearch: false, evaluation: false,
            recommendation: false, documents: false, pitchDeck: false
        };

        try {
            const response = await apiClient.get<WorkflowApiResponse>(`/api/StartupWorkflow/${startupId}`);
            const json = response.data;

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

    /**
     * Sends a user message to the external AI chat API and returns the assistant reply.
     * Also persists both messages to the local DB via the Chat/send endpoint.
     */
    async sendMessage(
        sessionId: string,
        content: string,
        history: ChatMessage[],
        startupId: string,
        startupData: object
    ): Promise<string> {
        // 1. Persist user message to local DB
        try {
            await apiClient.post('/api/Chat/send', {
                SessionId: sessionId,
                Role: "user",
                Content: content
            });
        } catch (error) {
            console.error("Error persisting user message:", error);
        }

        // 2. Call external AI chat API
        // Wrap startup_data to match the nesting the AI extraction prompt expects:
        // { data: { startup_evaluation: { ...flatFields } } }
        let assistantReply = "";
        try {
            console.log("Calling AI API with:", { content, historyLength: history.length, startupData });

            const aiResponse = await fetch(`${AI_API_BASE}/chat/chat`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_message: content,
                    chat_history: history.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    // Issue 1 fix: wrap in the nesting the AI extraction prompt expects
                    startup_data: { data: { startup_evaluation: startupData } }
                })
            });

            console.log("AI response status:", aiResponse.status);
            const rawText = await aiResponse.text();
            console.log("AI raw response:", rawText);

            // Issue 3 fix: surface rate-limit errors distinctly
            if (aiResponse.status === 429) {
                throw new Error("RATE_LIMITED");
            }

            if (!aiResponse.ok) {
                console.error("AI API error:", rawText);
                throw new Error(`AI API responded with ${aiResponse.status}`);
            }

            const aiData = JSON.parse(rawText);
            console.log("AI parsed response keys:", Object.keys(aiData));

            assistantReply =
                aiData.ai_reply ??
                aiData.assistant_message ??
                aiData.reply ??
                aiData.response ??
                aiData.content ??
                aiData.message ??
                aiData.output ??
                aiData.result ??
                (typeof aiData === "string" ? aiData : "");

            console.log("Assistant reply extracted:", assistantReply);

        } catch (error: any) {
            console.error("Error calling AI chat API:", error);
            if (error?.message === "RATE_LIMITED") {
                throw error; // re-throw so page.tsx can show specific UX
            }
            assistantReply = "Sorry, I couldn't get a response. Please try again.";
        }

        // 3. Persist assistant reply to local DB
        if (assistantReply) {
            try {
                await apiClient.post('/api/Chat/send', {
                    SessionId: sessionId,
                    Role: "assistant",
                    Content: assistantReply
                });
            } catch (error) {
                console.error("Error persisting assistant message:", error);
            }
        }

        return assistantReply;
    },

    /**
     * Calls the update-startup-data endpoint with the full chat history
     * when the user marks the Idea Check phase as complete.
     */
    // Add this new method — saves the AI-updated startup data back to your DB
    async updateStartupInDatabase(startupId: string, updatedData: object): Promise<boolean> {
        try {
            console.log("Saving updated startup data to DB:", JSON.stringify(updatedData, null, 2));

            // 👇 ADD THESE TWO LINES to attach the Auth Token
            const token = localStorage.getItem('auth_token');
            await apiClient.put(
                `/api/startups/update-json/${startupId}`,
                { jsonResponse: updatedData },
                { headers: { Authorization: `Bearer ${token}` } } // <-- Attach it here
            );

            console.log("Startup data saved to DB successfully");
            return true;
        } catch (error: any) {
            console.error("Failed to save startup data to DB:", error.response?.data || error.message);
            return false;
        }
    },

    async updateStartupDataFromChat(
        startupId: string,
        chatHistory: ChatMessage[],
        startupData: object
    ): Promise<object | null> {
        try {
            console.log("📤 Sending to AI update endpoint...");
            console.log("BEFORE startup_data:", JSON.stringify(startupData, null, 2));

            const response = await fetch(`${AI_API_BASE}/chat/update-startup-data`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_history: chatHistory.map(m => ({ role: m.role, content: m.content })),
                    // Issue 1 fix: wrap to match the AI extraction prompt's expected nesting
                    startup_data: { data: { startup_evaluation: startupData } }
                })
            });

            const rawText = await response.text();

            if (!response.ok) {
                console.error("❌ update-startup-data API error:", rawText);
                return null;
            }

            const rawData = JSON.parse(rawText);

            // Issue 2 fix: backend returns { updated_startup_data: { data: { startup_evaluation: {...} } } }
            // Unwrap back to the flat shape so the state and DB receive the original flat structure.
            // No extra wrapping here — the caller (handleMarkComplete) uses it as-is.
            const fullMerged = rawData.updated_startup_data ?? rawData;
            const flatData = fullMerged?.data?.startup_evaluation ?? fullMerged;

            console.log("AFTER startup_data (from AI, flat):", JSON.stringify(flatData, null, 2));

            return flatData;

        } catch (error) {
            console.error("❌ Error calling update-startup-data:", error);
            return null;
        }
    },

    async updateWorkflow(payload: WorkflowUpdatePayload): Promise<boolean> {
        try {
            // Explicitly attach token to bypass any interceptor issues
            const token = localStorage.getItem('auth_token');
            await apiClient.post('/api/StartupWorkflow/update', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("✅ Workflow updated successfully");
            return true;
        } catch (error: any) {
            console.error("❌ updateWorkflow failed:", error.response?.status, error.response?.data);
            return false;
        }
    },
    // Add inside the ideaCheckService object, e.g. after startNewSession
    async deleteSession(sessionId: string): Promise<boolean> {
        try {
            await apiClient.delete(`/api/Chat/session/${sessionId}`);
            console.log("✅ Session deleted:", sessionId);
            return true;
        } catch (error: any) {
            console.error("❌ Failed to delete session:", error.response?.data);
            return false;
        }
    }
};