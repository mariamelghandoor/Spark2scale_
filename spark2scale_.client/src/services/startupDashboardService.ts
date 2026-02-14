// services/startupDashboardService.ts

import apiClient from "@/lib/apiClient";
import { pitchDeckService } from "./pitchDeckService";

// --- Types ---
export interface WorkflowData {
    startupId: string;
    ideaCheck: boolean;
    marketResearch: boolean;
    evaluation: boolean;
    recommendation: boolean;
    documents: boolean;
    pitchDeck: boolean;
}

export interface Meeting {
    meeting_id: string;
    sender_id: string;
    receiver_id: string;
    meeting_date: string; // ISO String
    meeting_time: string; // HH:mm:ss
    meeting_link?: string;
    with_whom_name: string;
    status: "pending" | "accepted" | "rejected" | "canceled";
}

export interface DashboardData {
    workflow: WorkflowData | null;
    startupName: string;
    role: string;
    docCount: number;
    meetings: Meeting[];
    videoCount: number;
}

export const startupDashboardService = {
    // 1. Fetch All Dashboard Data in one go
    async getDashboardData(startupId: string, userId: string): Promise<DashboardData> {
        try {
            // Execute all requests in parallel for performance
            const [workflowRes, startupRes, docCountRes, meetingsRes, videoCount] = await Promise.all([
                apiClient.get(`/api/StartupWorkflow/${startupId}`),
                apiClient.get(`/api/startups/${startupId}`),
                apiClient.get(`/api/DocumentVersions/count/${startupId}`),
                apiClient.get(`/api/Meetings?userId=${userId}`),
                pitchDeckService.getPitchCount(startupId) // Reusing existing service method
            ]);

            // --- Process Workflow ---
            const rawWf = workflowRes.data;
            const workflow: WorkflowData = {
                startupId: rawWf.startupId || rawWf.StartupId,
                ideaCheck: rawWf.ideaCheck || rawWf.IdeaCheck,
                marketResearch: rawWf.marketResearch || rawWf.MarketResearch,
                evaluation: rawWf.evaluation || rawWf.Evaluation,
                recommendation: rawWf.recommendation || rawWf.Recommendation,
                documents: rawWf.documents || rawWf.Documents,
                pitchDeck: rawWf.pitchDeck || rawWf.PitchDeck
            };

            // --- Process Startup Name ---
            let startupName = "Unknown Startup";
            let role = "Viewer";
            if (startupRes.data) {
                startupName = startupRes.data.startupname;
                role = startupRes.data.current_role || "Viewer";
            }

            // --- Process Doc Count ---
            let docCount = 0;
            if (docCountRes.data) {
                docCount = docCountRes.data.count;
            }

            // --- Process Meetings ---
            const meetings = meetingsRes.data || [];

            return {
                workflow,
                startupName,
                role,
                docCount,
                meetings,
                videoCount
            };

        } catch (error) {
            console.error("Error loading dashboard data:", error);
            // Return safe defaults so the UI doesn't crash
            return {
                workflow: null,
                startupName: "Error Loading Data",
                role: "Viewer",
                docCount: 0,
                meetings: [],
                videoCount: 0
            };
        }
    },

    // 2. Invite Team Member Action
    async inviteTeamMember(email: string, startupId: string, userId: string): Promise<{ success: boolean; message?: string }> {
        try {
            await apiClient.post(`/api/Invitation/send`, {
                email: email,
                startupId: startupId,
                role: "Contributor",
                InvitedBy: userId
            });

            return { success: true };
        } catch (error: unknown) {
            console.error("Invite error:", error);
            let message = "Network error occurred.";
            if (error && typeof error === 'object' && 'response' in error) {
                const errResponse = (error as any).response?.data;
                if (errResponse) message = errResponse;
            }
            else if (error instanceof Error) {
                message = error.message;
            }
            return { success: false, message: typeof message === 'string' ? message : JSON.stringify(message) };
        }
    }
};