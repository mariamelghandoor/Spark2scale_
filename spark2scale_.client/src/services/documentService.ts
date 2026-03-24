// src/services/documentService.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5231";

export interface DocumentDto {
    did: string;
    startup_id: string;
    document_name: string;
    type: string;
    current_path: string;
    current_version: number;
    canaccess: number;
    updated_at: string;
    created_at: string;
    is_current?: boolean;
    jsonResponse?: any;
}

export interface DocumentVersionDto {
    vid: string;
    document_id: string;
    version_number: number;
    path: string;
    created_at: string;
    generated_by: string;
    jsonResponse?: any;
    is_public?: boolean;
}


export interface DocumentData extends DocumentDto {
    versions: DocumentVersionDto[];
    access_status?: string;
    json_response?: string;
}

export const documentService = {
    /**
     * Get all current documents for a startup
     */
    getDocuments: async (startupId: string): Promise<DocumentDto[]> => {
        if (!startupId || startupId === "undefined") {
            console.warn("Skipping fetch: Invalid Startup ID");
            return [];
        }

        const cleanUrl = API_BASE_URL.replace(/\/$/, "").replace(/\/api$/, "");
        const response = await fetch(`${cleanUrl}/api/Documents?startupId=${startupId}`, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to fetch documents");
        }

        return await response.json();
    },

    /**
     * Get grouped documents (Document + its Versions) - REQUIRED FOR UI
     */
    getGroupedDocuments: async (startupId: string): Promise<DocumentData[]> => {
        if (!startupId || startupId === "undefined") return [];

        const cleanUrl = API_BASE_URL.replace(/\/$/, "").replace(/\/api$/, "");
        const response = await fetch(`${cleanUrl}/api/Documents/grouped?startupId=${startupId}`, {
            method: "GET",
        });

        if (!response.ok) throw new Error("Failed to fetch grouped documents");

        return await response.json();
    },

    /**
     * Get all documents including archived ones
     */
    getAllDocuments: async (startupId: string): Promise<DocumentDto[]> => {
        if (!startupId || startupId === "undefined") return [];

        const cleanUrl = API_BASE_URL.replace(/\/$/, "").replace(/\/api$/, "");
        const response = await fetch(`${cleanUrl}/api/Documents/all?startupId=${startupId}`, {
            method: "GET",
        });

        if (!response.ok) throw new Error("Failed to fetch all documents");

        return await response.json();
    },

    /**
     * Get version history for a specific document
     */
    getDocumentHistory: async (documentId: string): Promise<DocumentVersionDto[]> => {
        const cleanUrl = API_BASE_URL.replace(/\/$/, "").replace(/\/api$/, "");
        const response = await fetch(`${cleanUrl}/api/Documents/history/${documentId}`, {
            method: "GET",
        });

        if (!response.ok) throw new Error("Failed to fetch document history");

        return await response.json();
    },

    /**
     * Check if all required documents are uploaded
     */
    checkCompletion: async (startupId: string): Promise<{ isComplete: boolean; missingDocs?: string[] }> => {
        const cleanUrl = API_BASE_URL.replace(/\/$/, "").replace(/\/api$/, "");
        const response = await fetch(`${cleanUrl}/api/Documents/check-completion/${startupId}`, {
            method: "GET",
        });

        if (!response.ok) throw new Error("Failed to check document completion");

        return await response.json();
    },

    /**
     * Upload a new document or new version
     */
    uploadDocument: async (formData: FormData): Promise<{ message: string; version: number }> => {
        const cleanUrl = API_BASE_URL.replace(/\/$/, "").replace(/\/api$/, "");
        const response = await fetch(`${cleanUrl}/api/Documents/upload`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Failed to upload document");
        }

        return await response.json();
    },

    /**
     * Toggle Visibility - REQUIRED FOR UI
     */
    toggleVersionVisibility: async (vid: string, isPublic: boolean): Promise<boolean> => {
        const cleanUrl = API_BASE_URL.replace(/\/$/, "").replace(/\/api$/, "");
        try {
            const response = await fetch(`${cleanUrl}/api/DocumentVersions/visibility/${vid}`, {
                method: "PATCH",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isPublic)
            });
            return response.ok;
        } catch {
            return false;
        }
    },

    /**
     * Delete a document
     */
    deleteDocument: async (documentId: string): Promise<void> => {
        const cleanUrl = API_BASE_URL.replace(/\/$/, "").replace(/\/api$/, "");
        const response = await fetch(`${cleanUrl}/api/Documents/${documentId}`, {
            method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete document");
    }


};