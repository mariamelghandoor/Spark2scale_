// services/startupDashboardService.ts

import { pitchDeckService } from "./pitchDeckService";

const API_BASE_URL = "https://localhost:7155/api";

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
                fetch(`${API_BASE_URL}/StartupWorkflow/${startupId}`),
                fetch(`${API_BASE_URL}/startups/${startupId}`),
                fetch(`${API_BASE_URL}/DocumentVersions/count/${startupId}`),
                fetch(`${API_BASE_URL}/Meetings?userId=${userId}`),
                pitchDeckService.getPitchCount(startupId) // Reusing existing service method
            ]);

            // --- Process Workflow ---
            const workflow = workflowRes.ok ? await workflowRes.json() : null;

            // --- Process Startup Name ---
            let startupName = "Unknown Startup";
            if (startupRes.ok) {
                const data = await startupRes.json();
                startupName = data.startupname;
            }

            // --- Process Doc Count ---
            let docCount = 0;
            if (docCountRes.ok) {
                const data = await docCountRes.json();
                docCount = data.count;
            }

            // --- Process Meetings ---
            const meetings = meetingsRes.ok ? await meetingsRes.json() : [];

            return {
                workflow,
                startupName,
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
                docCount: 0,
                meetings: [],
                videoCount: 0
            };
        }
    },

    // 2. Invite Team Member Action
    async inviteTeamMember(email: string, startupId: string): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await fetch(`${API_BASE_URL}/Contributor/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email,
                    startupId: startupId
                })
            });

            if (response.ok) {
                return { success: true };
            } else {
                const errorText = await response.text();
                return { success: false, message: errorText };
            }
        } catch (error) {
            console.error("Invite error:", error);
            return { success: false, message: "Network error occurred." };
        }
    }
};