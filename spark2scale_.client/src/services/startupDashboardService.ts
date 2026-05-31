// src/services/startupDashboardService.ts

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
<<<<<<< HEAD
    logoPath?: string | null;
=======
    logoPath: string | null;
>>>>>>> 39a4a5fcac3104a30e216f6bb7710f482b848703
}

export const startupDashboardService = {
    // 1. Fetch All Dashboard Data safely without crashing the whole page
    async getDashboardData(startupId: string, userId: string): Promise<DashboardData> {

        // Define safe fallback defaults
        const result: DashboardData = {
            workflow: null,
            startupName: "Error Loading Data",
            role: "Viewer",
            docCount: 0,
            meetings: [],
            videoCount: 0,
            logoPath: null
        };

<<<<<<< HEAD
        // Fire all five lookups in parallel; allSettled keeps a single failure
        // from torpedoing the rest of the dashboard. Previously these ran in
        // strict series so the page had to wait for the sum of all five.
        const [startupResRaw, wfResRaw, docCountResRaw, meetingsResRaw, videoCountRaw] = await Promise.allSettled([
            apiClient.get(`/api/Startups/${startupId}`),
            apiClient.get(`/api/StartupWorkflow/${startupId}`),
            apiClient.get(`/api/DocumentVersions/count/${startupId}`),
            apiClient.get(`/api/Meetings?startupId=${startupId}`),
            pitchDeckService.getPitchCount(startupId),
        ]);

        if (startupResRaw.status === "fulfilled" && startupResRaw.value?.data) {
            const startupData = startupResRaw.value.data;
            result.startupName = startupData.startupname;
            result.role = startupData.current_role || "Viewer";
            if (startupData.founder_id === userId) result.role = "Founder";
            result.logoPath = startupData.logo_path ?? null;
        } else if (startupResRaw.status === "rejected") {
            console.error("Failed to load startup details", startupResRaw.reason);
=======
        try {
            // ---------------------------------------------------------
            // STEP 1: Load Core Startup Info (Most Important)
            // ---------------------------------------------------------
            try {
                const startupRes = await apiClient.get(`/api/Startups/${startupId}`);
                if (startupRes.data) {
                    result.startupName = startupRes.data.startupname;
                    result.role = startupRes.data.current_role || "Viewer";
                    result.logoPath = startupRes.data.logo_path || null;

                    // FRONTEND FALLBACK: If backend misses the role mapping, 
                    // we strictly check the founder_id against your logged-in user ID!
                    if (startupRes.data.founder_id === userId) {
                        result.role = "Founder";
                    }
                }
            } catch (e: any) {
                console.error("Failed to load startup details", e);
                const msg = e.message || "";
                if (msg.includes("403") || msg.includes("401")) {
                    throw e;
                }
            }

            // ---------------------------------------------------------
            // STEP 2: Load Workflow Data
            // ---------------------------------------------------------
            try {
                const wfRes = await apiClient.get(`/api/StartupWorkflow/${startupId}`);
                if (wfRes.data) {
                    const rawWf = wfRes.data;
                    result.workflow = {
                        startupId: rawWf.startupId || rawWf.StartupId,
                        ideaCheck: rawWf.ideaCheck || rawWf.IdeaCheck || false,
                        marketResearch: rawWf.marketResearch || rawWf.MarketResearch || false,
                        evaluation: rawWf.evaluation || rawWf.Evaluation || false,
                        recommendation: rawWf.recommendation || rawWf.Recommendation || false,
                        documents: rawWf.documents || rawWf.Documents || false,
                        pitchDeck: rawWf.pitchDeck || rawWf.PitchDeck || false
                    };
                }
            } catch (e) {
                console.warn("Failed to load workflow", e);
            }

            // ---------------------------------------------------------
            // STEP 3: Load Document Count
            // ---------------------------------------------------------
            try {
                const docCountRes = await apiClient.get(`/api/DocumentVersions/count/${startupId}`);
                if (docCountRes.data) {
                    result.docCount = docCountRes.data.count || 0;
                }
            } catch (e) {
                console.warn("Failed to load document count", e);
            }

            // ---------------------------------------------------------
            // STEP 4: Load Meetings
            // ---------------------------------------------------------
            try {
                // Testing against startupId since it usually dictates the context
                const meetingsRes = await apiClient.get(`/api/Meetings?startupId=${startupId}`);
                if (meetingsRes.data) {
                    result.meetings = meetingsRes.data;
                }
            } catch (e) {
                console.warn("Failed to load meetings", e);
            }

            // ---------------------------------------------------------
            // STEP 5: Load Video Count
            // ---------------------------------------------------------
            try {
                const videoCount = await pitchDeckService.getPitchCount(startupId);
                result.videoCount = videoCount || 0;
            } catch (e) {
                console.warn("Failed to load video count", e);
            }

            return result;

        } catch (error: any) {
            console.error("Fatal error assembling dashboard data:", error);
            const msg = error.message || "";
            if (msg.includes("403") || msg.includes("401")) {
                throw error;
            }
            return result; // Returns whatever parts successfully loaded instead of crashing!
>>>>>>> 39a4a5fcac3104a30e216f6bb7710f482b848703
        }

        if (wfResRaw.status === "fulfilled" && wfResRaw.value?.data) {
            const rawWf = wfResRaw.value.data;
            result.workflow = {
                startupId: rawWf.startupId || rawWf.StartupId,
                ideaCheck: rawWf.ideaCheck || rawWf.IdeaCheck || false,
                marketResearch: rawWf.marketResearch || rawWf.MarketResearch || false,
                evaluation: rawWf.evaluation || rawWf.Evaluation || false,
                recommendation: rawWf.recommendation || rawWf.Recommendation || false,
                documents: rawWf.documents || rawWf.Documents || false,
                pitchDeck: rawWf.pitchDeck || rawWf.PitchDeck || false,
            };
        } else if (wfResRaw.status === "rejected") {
            console.warn("Failed to load workflow", wfResRaw.reason);
        }

        if (docCountResRaw.status === "fulfilled" && docCountResRaw.value?.data) {
            result.docCount = docCountResRaw.value.data.count || 0;
        } else if (docCountResRaw.status === "rejected") {
            console.warn("Failed to load document count", docCountResRaw.reason);
        }

        if (meetingsResRaw.status === "fulfilled" && meetingsResRaw.value?.data) {
            result.meetings = meetingsResRaw.value.data;
        } else if (meetingsResRaw.status === "rejected") {
            console.warn("Failed to load meetings", meetingsResRaw.reason);
        }

        if (videoCountRaw.status === "fulfilled") {
            result.videoCount = videoCountRaw.value || 0;
        } else {
            console.warn("Failed to load video count", videoCountRaw.reason);
        }

        return result;
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
                const errResponse = (error as { response?: { data?: string } }).response?.data;
                if (errResponse) message = errResponse;
            }
            else if (error instanceof Error) {
                message = error.message;
            }
            return { success: false, message: typeof message === 'string' ? message : JSON.stringify(message) };
        }
    }
};