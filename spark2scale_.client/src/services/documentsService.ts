// services/documentsService.ts

import { Presentation, Table, Users, Scale, FileText } from "lucide-react";
import apiClient from "@/lib/apiClient";

// --- Configuration: Required Documents ---
export const REQUIRED_DOCS = [
    {
        id: "pitch_deck",
        name: "Pitch Deck",
        icon: Presentation,
        desc: "PDF (Preferred) or PPTX. Ensures design consistency.",
        accept: ".pdf,.ppt,.pptx",
        aiPrompt: "Help me generate a structure for my Pitch Deck based on my other documents."
    },
    {
        id: "financials",
        name: "Financials",
        icon: Table,
        desc: "Excel (.xlsx) or CSV. Investors need to audit formulas.",
        accept: ".xlsx,.xls,.csv",
        aiPrompt: "Help me create 3-year Financial Projections."
    },
    {
        id: "cap_table",
        name: "Cap Table",
        icon: Users,
        desc: "Excel or PDF. Ownership structure.",
        accept: ".xlsx,.xls,.pdf",
        aiPrompt: "Explain how to structure my Cap Table."
    },
    {
        id: "legal_docs",
        name: "Legal Docs",
        icon: Scale,
        desc: "PDF. Standard for signed legal docs.",
        accept: ".pdf",
        aiPrompt: "What legal documents do I need for incorporation?"
    },
    {
        id: "business_plan",
        name: "Business Plan",
        icon: FileText,
        desc: "PDF. Detailed execution strategy.",
        accept: ".pdf,.doc,.docx",
        aiPrompt: "Draft an Executive Summary for my Business Plan."
    }
];

// --- Types ---

// 1. Basic DB Document (Flat)
export interface DBDocument {
    did: string;
    master_id: string;
    document_name: string;
    type: string;
    current_path: string;
    current_version: number;
    created_at: string;
}

// 2. Document Version (History)
export interface DocumentVersion {
    vid: string;
    version_number: number;
    path: string;
    created_at: string;
    generated_by: string;
    is_public: boolean;
}

// 3. Grouped Document Data (For Documents Page List)
export interface DocumentData {
    did: string;
    document_name: string;
    type: string;
    current_path: string;
    updated_at: string;
    is_current: boolean;
    versions: DocumentVersion[];
}

// 4. UI State (For Upload/Status Cards)
export interface DocState {
    configId: string;
    dbId?: string;
    isUploaded: boolean;
    name: string;
    path?: string;
    version?: number;
    date?: string;
}

// 5. Chat Types
export interface SessionSummary {
    sessionId: string;
    sessionName: string;
    createdAt: string;
}

export interface ChatMessage {
    role: string;
    content: string;
}

// 6. Interfaces for API Responses
interface WorkflowData {
    [key: string]: unknown;
}

interface ChatSessionResponse {
    sessionId?: string;
    SessionId?: string;
    sessionName?: string;
    SessionName?: string;
    createdAt?: string;
    CreatedAt?: string;
}

interface ChatMessageResponse {
    role?: string;
    Role?: string;
    content?: string;
    Content?: string;
}

// --- Service Methods ---
export const documentsService = {

    // ------------------------------------------------------------------
    // 1. Basic Document Operations (Upload, Delete, Generate)
    // ------------------------------------------------------------------

    async getDocuments(startupId: string): Promise<DBDocument[]> {
        try {
            const res = await apiClient.get<DBDocument[]>(`/api/documents?startupId=${startupId}`);
            return res.data;
        } catch (error) {
            console.error("Error fetching documents:", error);
            return [];
        }
    },

    async uploadDocument(startupId: string, docType: string, file: File, dbId?: string): Promise<boolean> {
        const formData = new FormData();
        formData.append("File", file); // Note: C# usually expects "File" capitalized or lowercase depending on config
        formData.append("StartupId", startupId);
        formData.append("Type", docType);
        formData.append("DocName", file.name);
        if (dbId) formData.append("documentId", dbId);

        try {
            await apiClient.post(`/api/documents/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return true;
        } catch (error) {
            console.error("Error uploading document:", error);
            return false;
        }
    },

    async deleteDocument(dbId: string): Promise<boolean> {
        try {
            await apiClient.delete(`/api/documents/${dbId}`);
            return true;
        } catch (error) {
            console.error("Error deleting document:", error);
            return false;
        }
    },

    async generateMockDocument(startupId: string, type: string): Promise<boolean> {
        try {
            await apiClient.post(`/api/documents/generate-mock`, { StartupId: startupId, Type: type });
            return true;
        } catch (error) {
            console.error("Error generating mock:", error);
            return false;
        }
    },

    // ------------------------------------------------------------------
    // 2. Advanced Fetching & Grouping (For Documents List Page)
    // ------------------------------------------------------------------

    async getGroupedDocuments(startupId: string): Promise<DocumentData[]> {
        try {
            // A. Fetch All Docs
            const res = await apiClient.get<DocumentData[]>(`/api/documents/all?startupId=${startupId}`);
            const docs = res.data;

            // B. Fetch History for each (Parallel)
            const docsWithHistory = await Promise.all(
                docs.map(async (doc) => {
                    try {
                        const hRes = await apiClient.get<DocumentVersion[]>(`/api/documentversions/${doc.did}`);
                        const history = hRes.data || [];
                        return { ...doc, versions: history };
                    } catch (err) {
                        console.warn(`Could not load history for ${doc.did}`, err);
                        return { ...doc, versions: [] };
                    }
                })
            );

            // C. Process & Group
            return this._processAndGroupDocuments(docsWithHistory);
        } catch (error) {
            console.error("Error in getGroupedDocuments:", error);
            return [];
        }
    },

    // Internal Helper: Group logic
    _processAndGroupDocuments(rawDocs: DocumentData[]): DocumentData[] {
        const groups: Record<string, DocumentData> = {};

        rawDocs.forEach(doc => {
            const type = doc.type;
            if (!groups[type]) {
                groups[type] = { ...doc, versions: [...doc.versions] };
            } else {
                groups[type].versions = [...groups[type].versions, ...doc.versions];
                // Update parent info if this doc is newer
                if (new Date(doc.updated_at) > new Date(groups[type].updated_at)) {
                    groups[type].did = doc.did;
                    groups[type].document_name = doc.document_name;
                    groups[type].current_path = doc.current_path;
                    groups[type].updated_at = doc.updated_at;
                    groups[type].is_current = doc.is_current;
                }
            }
        });

        return Object.values(groups).map(group => {
            // Sort versions descending by date
            group.versions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Deduplicate versions by VID
            const uniqueVersions = Array.from(new Map(group.versions.map(v => [v.vid, v])).values());
            group.versions = uniqueVersions;

            return group;
        });
    },

    async toggleVersionVisibility(versionId: string, newStatus: boolean): Promise<boolean> {
        try {
            await apiClient.patch(`/api/documentversions/visibility/${versionId}`, newStatus, {
                headers: { "Content-Type": "application/json" }
            });
            return true;
        } catch (error) {
            console.error("Error toggling visibility:", error);
            return false;
        }
    },

    // ------------------------------------------------------------------
    // 3. Workflow & Completion Checks
    // ------------------------------------------------------------------

    async checkCompletion(startupId: string): Promise<{ isComplete: boolean; missingDocs?: string[] } | null> {
        try {
            const res = await apiClient.get<{ isComplete: boolean; missingDocs?: string[] }>(`/api/documents/check-completion/${startupId}`);
            return res.data;
        } catch (error) {
            console.error("Error checking completion:", error);
            return null;
        }
    },

    async checkStepCompletion(startupId: string, stepName: string): Promise<boolean | null> {
        try {
            const res = await apiClient.get<WorkflowData>(`/api/StartupWorkflow/${startupId}`);
            const data = res.data;

            // Check both camelCase (JSON) and PascalCase (C# DTO)
            const keyCamel = stepName.charAt(0).toLowerCase() + stepName.slice(1);
            const keyPascal = stepName.charAt(0).toUpperCase() + stepName.slice(1);

            if (data[keyCamel] === true || data[keyPascal] === true) {
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error checking completion:", error);
            return null;
        }
    },

    async getWorkflow(startupId: string): Promise<WorkflowData> {
        try {
            const res = await apiClient.get<WorkflowData>(`/api/StartupWorkflow/${startupId}`);
            return res.data;
        } catch (error) {
            console.error("Error fetching workflow:", error);
            return {};
        }
    },

    async updateWorkflow(payload: unknown): Promise<boolean> {
        try {
            await apiClient.post(`/api/StartupWorkflow/update`, payload);
            return true;
        } catch (error) {
            console.error("Error updating workflow:", error);
            return false;
        }
    },

    // ------------------------------------------------------------------
    // 4. Chat System (AI Assistant)
    // ------------------------------------------------------------------

    async getChatSessions(startupId: string): Promise<SessionSummary[]> {
        try {
            const res = await apiClient.get<ChatSessionResponse[]>(`/api/Chat/sessions/${startupId}/document_gen`);
            return res.data.map(s => ({
                sessionId: s.sessionId || s.SessionId || "",
                sessionName: s.sessionName || s.SessionName || "New Session",
                createdAt: s.createdAt || s.CreatedAt || new Date().toISOString()
            }));
        } catch (error) {
            console.error("Error fetching chat sessions:", error);
            return [];
        }
    },

    async startNewSession(startupId: string): Promise<SessionSummary | null> {
        try {
            const res = await apiClient.post<ChatSessionResponse>(`/api/Chat/start-new`, { StartupId: startupId, FeatureType: 'document_gen' });

            const data = res.data;
            return {
                sessionId: data.sessionId || data.SessionId || "",
                sessionName: data.sessionName || data.SessionName || "New Session",
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error("Error starting session:", error);
            return null;
        }
    },

    async getMessages(sessionId: string): Promise<ChatMessage[]> {
        try {
            const res = await apiClient.get<ChatMessageResponse[]>(`/api/Chat/messages/${sessionId}`);
            return res.data.map(m => ({
                role: m.role || m.Role || "system",
                content: m.content || m.Content || ""
            }));
        } catch (error) {
            console.error("Error fetching messages:", error);
            return [];
        }
    },

    async sendMessage(sessionId: string, content: string): Promise<void> {
        try {
            await apiClient.post(`/api/Chat/send`, { SessionId: sessionId, Role: "user", Content: content });
        } catch (error) {
            console.error("Error sending message:", error);
        }
    }
};