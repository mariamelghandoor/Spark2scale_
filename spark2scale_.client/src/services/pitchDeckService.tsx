// src/services/pitchDeckService.ts

import apiClient from "@/lib/apiClient";

export interface AnalysisData {
    // Support lowercase (standard JSON)
    short?: {
        score: number;
        summary: string;
        keyFeedback: Array<{ aspect: string; score: number; comment: string }>;
    };
    detailed?: {
        tone: string;
        pacing: string;
        sections: Array<{ aspect: string; score: number; comment: string }>;
        transcriptHighlights: string[];
    };

    // Support PascalCase (C# default if not configured)
    Short?: {
        Score: number;
        Summary: string;
        KeyFeedback: Array<{ Aspect: string; Score: number; Comment: string }>;
    };
    Detailed?: {
        Tone: string;
        Pacing: string;
        Sections: Array<{ Aspect: string; Score: number; Comment: string }>;
        TranscriptHighlights: string[];
    };
}

export interface PitchDeck {
    pitchdeckid: string;
    startup_id: string;
    video_url: string;
    pitchname: string;
    is_current: boolean;
    canaccess: boolean;
    analysis?: AnalysisData;
    created_at: string;
    tags?: string[];
    countlikes?: number;
    format?: string;
    size?: string;
    uploadedBy?: string;
    version_number?: number;
    extracted_subtags?: string[];
    // jsonb object returned directly from Supabase
    session_report?: Record<string, unknown>;
}

export const pitchDeckService = {
    // 1. Upload Video
    uploadVideo: async (startupId: string, file: File): Promise<PitchDeck> => {
        const formData = new FormData();
        formData.append("startup_id", startupId);
        formData.append("file", file);

        try {
            const response = await apiClient.post(`/api/PitchDecks/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data as PitchDeck;
        } catch (error: unknown) {
            let errorText = "Failed to upload video";
            if (error && typeof error === 'object' && 'response' in error) {
                const errResponse = (error as { response?: { data?: string } }).response?.data;
                if (errResponse) errorText = errResponse;
            }
            throw new Error(typeof errorText === 'string' ? errorText : JSON.stringify(errorText));
        }
    },

    // 2. Get All Pitches for a Startup
    getPitches: async (startupId: string): Promise<PitchDeck[]> => {
        if (!startupId || startupId === "undefined") {
            console.warn("Skipping fetch: Invalid Startup ID");
            return [];
        }

        const response = await apiClient.get(`/api/PitchDecks/${startupId}`);
        return response.data as PitchDeck[];
    },

    // 3. Generate Analysis (Mock AI)
    generateAnalysis: async (pitchDeckId: string): Promise<PitchDeck> => {
        const response = await apiClient.post(`/api/PitchDecks/analyze/${pitchDeckId}`);
        return response.data as PitchDeck;
    },

    getPitchById: async (pitchDeckId: string): Promise<PitchDeck> => {
        const response = await apiClient.get(`/api/PitchDecks/details/${pitchDeckId}`);
        return response.data as PitchDeck;
    },

    updatePitchTitle: async (pitchId: string, newTitle: string): Promise<void> => {
        try {
            await apiClient.patch(`/api/PitchDecks/rename/${pitchId}`, { newTitle: newTitle });
        } catch (error: unknown) {
            let errorText = "Failed to update pitch name";
            if (error && typeof error === 'object' && 'response' in error) {
                const errResponse = (error as { response?: { data?: string } }).response?.data;
                if (errResponse) errorText = errResponse;
            }
            throw new Error(typeof errorText === 'string' ? errorText : JSON.stringify(errorText));
        }
    },

    togglePitchVisibility: async (pitchDeckId: string, startupId: string, isPublic: boolean) => {
        try {
            const response = await apiClient.patch(`/api/PitchDecks/visibility`, { pitchDeckId, startupId, isPublic });
            return response.data as any;
        } catch (error: unknown) {
            let errorText = "Failed to update visibility";
            if (error && typeof error === 'object' && 'response' in error) {
                const errResponse = (error as { response?: { data?: string } }).response?.data;
                if (errResponse) errorText = errResponse;
            }
            throw new Error(typeof errorText === 'string' ? errorText : JSON.stringify(errorText));
        }
    },

    getPitchCount: async (startupId: string): Promise<number> => {
        try {
            const response = await apiClient.get(`/api/PitchDecks/count/${startupId}`);
            return (response.data as any).count;
        } catch (error) {
            console.error(error);
            return 0;
        }
    },

    // --- NEW: Workflow Logic moved here ---

    // Check if stage is complete
    getWorkflowStatus: async (startupId: string): Promise<boolean> => {
        try {
            const response = await apiClient.get(`/api/StartupWorkflow/${startupId}`);
            const data = response.data as any;
            // Check PascalCase or camelCase
            return data.pitchDeck === true || data.PitchDeck === true;
        } catch (error) {
            console.error("Failed to check workflow status", error);
            return false;
        }
    },

    // Mark stage as complete
    completeStage: async (startupId: string): Promise<boolean> => {
        try {
            // A. Fetch current state
            const getRes = await apiClient.get(`/api/StartupWorkflow/${startupId}`);
            const currentData = getRes.data as any;

            // B. Prepare Update
            const updatedPayload = {
                StartupId: startupId,
                IdeaCheck: currentData.ideaCheck || currentData.IdeaCheck,
                MarketResearch: currentData.marketResearch || currentData.MarketResearch,
                Evaluation: currentData.evaluation || currentData.Evaluation,
                Recommendation: currentData.recommendation || currentData.Recommendation,
                Documents: currentData.documents || currentData.Documents,
                PitchDeck: true // <--- Set this to TRUE
            };

            // C. Send Update
            const postRes = await apiClient.post(`/api/StartupWorkflow/update`, updatedPayload);

            return (postRes as any).status === 200 || postRes !== undefined;
        } catch (error) {
            console.error("Error completing pitch stage:", error);
            return false;
        }
    }
};