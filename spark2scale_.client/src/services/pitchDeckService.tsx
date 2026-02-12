// src/services/pitchDeckService.ts

const API_BASE_URL = "https://localhost:7155/api/PitchDecks";
const WORKFLOW_API_URL = "https://localhost:7155/api/StartupWorkflow";

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
}

export const pitchDeckService = {
    // 1. Upload Video
    uploadVideo: async (startupId: string, file: File): Promise<PitchDeck> => {
        const formData = new FormData();
        formData.append("startup_id", startupId);
        formData.append("file", file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Failed to upload video");
        }

        return await response.json();
    },

    // 2. Get All Pitches for a Startup
    getPitches: async (startupId: string): Promise<PitchDeck[]> => {
        if (!startupId || startupId === "undefined") {
            console.warn("Skipping fetch: Invalid Startup ID");
            return [];
        }

        const response = await fetch(`${API_BASE_URL}/${startupId}`, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to fetch pitches");
        }

        return await response.json();
    },

    // 3. Generate Analysis (Mock AI)
    generateAnalysis: async (pitchDeckId: string): Promise<PitchDeck> => {
        const response = await fetch(`${API_BASE_URL}/analyze/${pitchDeckId}`, {
            method: "POST",
        });

        if (!response.ok) {
            throw new Error("Failed to generate analysis");
        }

        return await response.json();
    },

    getPitchById: async (pitchDeckId: string): Promise<PitchDeck> => {
        const response = await fetch(`${API_BASE_URL}/details/${pitchDeckId}`, {
            method: "GET",
        });

        if (!response.ok) throw new Error("Failed to fetch pitch details");

        return await response.json();
    },

    updatePitchTitle: async (pitchId: string, newTitle: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/rename/${pitchId}`, {
            method: "PATCH",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newTitle: newTitle })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Failed to update pitch name");
        }
    },

    togglePitchVisibility: async (pitchDeckId: string, startupId: string, isPublic: boolean) => {
        const response = await fetch(`${API_BASE_URL}/visibility`, {
            method: "PATCH",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pitchDeckId, startupId, isPublic })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Failed to update visibility");
        }

        return await response.json();
    },

    getPitchCount: async (startupId: string): Promise<number> => {
        try {
            const response = await fetch(`${API_BASE_URL}/count/${startupId}`, { method: "GET" });
            if (!response.ok) return 0;
            const data = await response.json();
            return data.count;
        } catch (error) {
            console.error(error);
            return 0;
        }
    },

    // --- NEW: Workflow Logic moved here ---

    // Check if stage is complete
    getWorkflowStatus: async (startupId: string): Promise<boolean> => {
        try {
            const response = await fetch(`${WORKFLOW_API_URL}/${startupId}`);
            if (!response.ok) return false;
            const data = await response.json();
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
            const getRes = await fetch(`${WORKFLOW_API_URL}/${startupId}`);
            if (!getRes.ok) throw new Error("Failed to fetch workflow");
            const currentData = await getRes.json();

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
            const postRes = await fetch(`${WORKFLOW_API_URL}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPayload)
            });

            return postRes.ok;
        } catch (error) {
            console.error("Error completing pitch stage:", error);
            return false;
        }
    }
};