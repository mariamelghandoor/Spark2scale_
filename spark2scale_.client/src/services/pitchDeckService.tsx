// src/services/pitchDeckService.ts

// 1. CHANGE 7123 TO 7155 (Your actual backend port)
const API_BASE_URL = "https://localhost:7155/api/PitchDecks";

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
    pitchname: string; // <--- NEW PROPERTY
    is_current: boolean;
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
        // Add a check to prevent fetching "undefined"
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
        // Now calls the dedicated rename endpoint
        const response = await fetch(`${API_BASE_URL}/rename/${pitchId}`, {
            method: "PATCH",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ newTitle: newTitle })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Failed to update pitch name");
        }
    }
};