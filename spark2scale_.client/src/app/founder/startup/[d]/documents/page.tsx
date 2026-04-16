"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Presentation, ArrowLeft, Upload, FileText, Plus, Eye, Send, Star, Users, Edit,
    Loader2, Trash2, Sparkles, RefreshCw, Bot, History, X, User, Maximize2, Minimize2,
    TrendingUp, TrendingDown, Lightbulb, AlertTriangle, Download
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";

import {
    documentsService,
    REQUIRED_DOCS,
    DocState,
    SessionSummary,
    ChatMessage
} from "@/services/documentsService";

// ---------------------------------------------------------------------------
// Document Viewer Modal
// ---------------------------------------------------------------------------

interface SwotData {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
    [key: string]: unknown;
}

function parseSwot(raw: unknown): SwotData | null {
    if (!raw) return null;
    try {
        const obj: Record<string, unknown> =
            typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);

        const unwrapped =
            (obj.swot_document as Record<string, unknown>) ||
            (obj.swot_analysis as Record<string, unknown>) ||
            (obj.swot as Record<string, unknown>) ||
            obj;

        const cleanItem = (s: string): string =>
            s.replace(/\*\*[^*]+\*\*:?\s*/g, "").replace(/\*\*/g, "").trim();

        const toArray = (v: unknown): string[] => {
            if (Array.isArray(v)) return v.map(i => cleanItem(String(i))).filter(Boolean);
            if (typeof v === "string") return v.split("\n").map(cleanItem).filter(Boolean);
            return [];
        };

        return {
            strengths: toArray(unwrapped.strengths ?? unwrapped.Strengths),
            weaknesses: toArray(unwrapped.weaknesses ?? unwrapped.Weaknesses),
            opportunities: toArray(unwrapped.opportunities ?? unwrapped.Opportunities),
            threats: toArray(unwrapped.threats ?? unwrapped.Threats),
        };
    } catch {
        return null;
    }
}

const SWOT_QUADRANTS = [
    {
        key: "strengths" as const,
        label: "Strengths",
        icon: TrendingUp,
        border: "border-emerald-200",
        bg: "bg-emerald-50/60",
        headerBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        countClass: "bg-emerald-200 text-emerald-800",
        bullet: "bg-emerald-500",
    },
    {
        key: "weaknesses" as const,
        label: "Weaknesses",
        icon: TrendingDown,
        border: "border-red-200",
        bg: "bg-red-50/60",
        headerBg: "bg-red-100",
        iconColor: "text-red-500",
        countClass: "bg-red-200 text-red-800",
        bullet: "bg-red-400",
    },
    {
        key: "opportunities" as const,
        label: "Opportunities",
        icon: Lightbulb,
        border: "border-blue-200",
        bg: "bg-blue-50/60",
        headerBg: "bg-blue-100",
        iconColor: "text-blue-500",
        countClass: "bg-blue-200 text-blue-800",
        bullet: "bg-blue-400",
    },
    {
        key: "threats" as const,
        label: "Threats",
        icon: AlertTriangle,
        border: "border-orange-200",
        bg: "bg-orange-50/60",
        headerBg: "bg-orange-100",
        iconColor: "text-orange-500",
        countClass: "bg-orange-200 text-orange-800",
        bullet: "bg-orange-400",
    },
];

interface CompetitorData {
    name: string;
    company_website?: string | null;
    sw_profile?: string | null;
    linkedin_url?: string | null;
    physical_location?: string | null;
    competitor_type?: string;
    target_audience?: string;
    value_proposition?: string;
    pricing_model?: string;
    core_features?: string;
    strengths?: string;
    weaknesses?: string;
}

function parseCompetitorMatrix(raw: unknown): CompetitorData[] | null {
    if (!raw) return null;
    try {
        let obj: any = raw;
        while (typeof obj === "string") {
            obj = JSON.parse(obj);
        }
        const out = obj?.competitor_analysis_document?.json_data || obj?.json_data || obj;
        if (Array.isArray(out)) {
            return out as CompetitorData[];
        }
        return null;
    } catch {
        return null;
    }
}

interface ViewerPayload {
    type: "swot" | "pdf" | "competitor_matrix";
    data?: unknown;
    url?: string;
    name: string;
}

function DocumentViewerModal({
    payload,
    onClose,
}: {
    payload: ViewerPayload;
    onClose: () => void;
}) {
    const swot = payload.type === "swot" ? parseSwot(payload.data) : null;
    const competitors = payload.type === "competitor_matrix" ? parseCompetitorMatrix(payload.data) : null;

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent
                aria-describedby={undefined}
                style={(payload.type === "competitor_matrix" || payload.type === "swot") ? { width: "95vw", maxWidth: "95vw", height: "94vh" } : undefined}
                className={(payload.type === "competitor_matrix" || payload.type === "swot") ? "p-0 bg-[#F4F1EA] overflow-hidden flex flex-col" : "max-w-[90vw] w-[90vw] h-[90vh] p-0 overflow-hidden flex flex-col"}
            >
                {(payload.type === "competitor_matrix" || payload.type === "swot") && (competitors || swot) ? (
                    <>
                        <DialogHeader className="sr-only">
                            <DialogTitle>{payload.name}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                            <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 bg-black/5 hover:bg-black/10 rounded-full h-8 w-8 z-10 text-[#576238]">
                                <X className="h-4 w-4" />
                            </Button>
                            <div className="bg-white text-black w-full max-w-5xl mx-auto shadow-2xl rounded overflow-hidden relative">
                                {/* Olive header band */}
                                <div className="bg-[#576238] text-white px-10 py-6">
                                    <p className="text-xs uppercase tracking-widest opacity-70 mb-1 font-sans">Spark2Scale</p>
                                    <h1 className="text-xl font-bold font-sans">
                                        {payload.type === "swot" ? "SWOT Analysis" : "Competitor Matrix Analysis"}
                                    </h1>
                                    <p className="text-sm opacity-75 mt-1">{payload.name}</p>
                                </div>
                                {/* Mustard accent stripe */}
                                <div className="h-1.5 bg-[#ffd95d]" />

                                <div className="px-6 md:px-10 py-8 space-y-10">
                                    <p className="text-xs text-gray-400 mb-6">
                                        Generated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                    </p>

                                    {/* Competitor Matrix Content */}
                                    {payload.type === "competitor_matrix" && competitors && (
                                        <div className="space-y-10">
                                            {competitors.map((comp, idx) => (
                                                <section key={idx}>
                                                    <div className="bg-[#576238] text-white px-4 py-2 font-bold text-xs uppercase tracking-widest font-sans rounded-sm flex items-center justify-between mb-2">
                                                        <span>{comp.name}</span>
                                                        {comp.competitor_type && (
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider ${comp.competitor_type.toLowerCase() === 'direct' ? 'bg-red-500/20 text-red-100' : 'bg-white/20 text-white'}`}>
                                                                {comp.competitor_type}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {comp.company_website && (
                                                        <a href={comp.company_website} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mb-2 block ml-1">
                                                            {comp.company_website}
                                                        </a>
                                                    )}
                                                    <table className="w-full border-collapse text-sm mt-1">
                                                        <tbody>
                                                            {[
                                                                ["Value Proposition", comp.value_proposition],
                                                                ["Target Audience", comp.target_audience],
                                                                ["Pricing Model", comp.pricing_model],
                                                                ["Core Features", comp.core_features],
                                                                ["Strengths", comp.strengths],
                                                                ["Weaknesses", comp.weaknesses],
                                                            ].filter(row => row[1]).map(([label, val], i) => (
                                                                <tr key={JSON.stringify(label)} className={i % 2 === 0 ? "bg-[#F4F1EA]" : "bg-white"}>
                                                                    <td className="font-bold text-[#576238] px-4 py-2.5 w-40 border border-gray-200 align-top">
                                                                        {label}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-gray-700 border border-gray-200">
                                                                        {val}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </section>
                                            ))}
                                            {competitors.length === 0 && (
                                                <div className="py-12 text-center text-gray-500 italic">No competitors found.</div>
                                            )}
                                        </div>
                                    )}

                                    {/* SWOT Analysis Content */}
                                    {payload.type === "swot" && swot && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                                            {SWOT_QUADRANTS.map(({ key, label, icon: Icon, border, bg, headerBg, iconColor, countClass, bullet }) => {
                                                const items = swot[key] ?? [];
                                                return (
                                                    <div key={key} className={`rounded-xl border-2 ${border} ${bg} overflow-hidden shadow-sm`}>
                                                        <div className={`${headerBg} px-4 py-3 flex items-center gap-2 border-b ${border}`}>
                                                            <Icon className={`h-4 w-4 ${iconColor}`} />
                                                            <span className="font-semibold text-sm text-gray-800">{label}</span>
                                                            <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${countClass}`}>{items.length}</span>
                                                        </div>
                                                        <ul className="p-4 space-y-3">
                                                            {items.length === 0 ? (
                                                                <li className="text-xs text-muted-foreground italic">No items found.</li>
                                                            ) : items.map((item, i) => (
                                                                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed font-sans">
                                                                    <span className={`mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full ${bullet}`} />
                                                                    {item}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Mustard footer */}
                                <div className="bg-[#ffd95d] px-10 py-3 text-center text-xs font-medium text-[#2c3e50]">
                                    Generated by Spark2Scale AI
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Header fallback for PDF / unknown */}
                        <DialogHeader className="flex-shrink-0 px-6 py-4 bg-[#576238] text-white flex flex-row items-center justify-between">
                            <div>
                                <DialogTitle className="text-base font-bold text-white leading-tight">
                                    Document Viewer — {payload.name}
                                </DialogTitle>
                                <p className="text-xs text-white/60 mt-0.5">
                                    {payload.type === "pdf" ? "PDF Preview" : "Raw Data Viewer"}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="text-white hover:bg-white/20 h-8 w-8 flex-shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogHeader>

                        {/* Body fallback */}
                        <div className="flex-1 overflow-hidden">
                            {payload.type === "pdf" && payload.url ? (
                                <iframe
                                    src={payload.url}
                                    className="w-full h-full border-0"
                                    title={payload.name}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                    <div className="text-center space-y-2">
                                        <p>Could not parse document structure.</p>
                                        <pre className="bg-gray-50 border rounded p-3 text-xs text-left max-w-lg overflow-auto max-h-64">
                                            {JSON.stringify(payload.data, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DocumentsPage() {
    const params = useParams();
    const router = useRouter();
    const auth = useAuth() as any;
    const userRole = auth?.user?.role;

    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const editPptInputRef = useRef<HTMLInputElement | null>(null);

    const [docStates, setDocStates] = useState<DocState[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isWorkflowComplete, setIsWorkflowComplete] = useState(false);

    // PPT State
    const [isPptGenerating, setIsPptGenerating] = useState(false);
    const [isPptEditing, setIsPptEditing] = useState(false);
    const [pptUrl, setPptUrl] = useState<string | null>(null);

    const [viewerPayload, setViewerPayload] = useState<ViewerPayload | null>(null);

    // Chat State
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [chatSessionId, setChatSessionId] = useState<string | null>(null);
    const [chatContext, setChatContext] = useState<string>(REQUIRED_DOCS[0]?.id || "pitch_deck");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [showChatHistory, setShowChatHistory] = useState(false);
    const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

    // NEW CHAT UI STATES
    const [isTyping, setIsTyping] = useState(false);
    const [isChatMaximized, setIsChatMaximized] = useState(false);

    const [manageAccessDialog, setManageAccessDialog] = useState(false);
    const [accessEmail, setAccessEmail] = useState("");

    const getCleanId = () => {
        const rawParam = params?.d || params?.id;
        if (!rawParam) return null;
        const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        return decodeURIComponent(rawId).replace(/\s/g, "");
    };
    const cleanId = getCleanId();
    const isFounder = userRole === "Founder";

    // Standard Styles
    const primaryBtn = "bg-[#576238] hover:bg-[#464f2d] text-white shadow-sm";
    const outlineBtn = "border-gray-200 hover:bg-[#576238]/5 hover:border-[#576238]/40 hover:text-[#576238]";

    // -----------------------------------------------------------------------
    // Fetch
    // -----------------------------------------------------------------------
    const fetchData = async () => {
        if (!cleanId) return;
        setIsLoadingData(true);
        try {
            const [dbDocs, workflowState] = await Promise.all([
                documentsService.getDocuments(cleanId),
                documentsService.getWorkflow(cleanId),
            ]);

            const pptDoc = dbDocs.find(d => d.type.toLowerCase() === "pitch deck (ppt)");
            if (pptDoc?.current_path) setPptUrl(pptDoc.current_path);

            const mergedState: DocState[] = REQUIRED_DOCS.map(req => {
                const match = dbDocs.find(d => d.type.toLowerCase() === req.name.toLowerCase());
                if (match) {
                    return {
                        configId: req.id,
                        dbId: match.did,
                        isUploaded: true,
                        name: match.document_name,
                        path: match.current_path,
                        version: match.current_version,
                        date: match.created_at,
                        jsonResponse: match.json_response,
                    };
                }
                return { configId: req.id, isUploaded: false, name: req.name };
            });

            setDocStates(mergedState);

            if (workflowState) {
                setIsWorkflowComplete(
                    workflowState.documents === true || workflowState.Documents === true
                );
            }
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => { fetchData(); }, [cleanId]);

    // -----------------------------------------------------------------------
    // PPT Handlers
    // -----------------------------------------------------------------------
    const handleGeneratePPT = async () => {
        if (!cleanId) return;
        setIsPptGenerating(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
            const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5231";
            const response = await fetch(`${API_BASE}/api/PptGeneration/generate/${cleanId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                setPptUrl(data.url || data.ppt_url || null);
                await fetchData();
            } else {
                const errText = await response.text();
                alert(`Generation failed: ${errText}`);
            }
        } catch {
            alert("Connection error. Please try again.");
        } finally {
            setIsPptGenerating(false);
        }
    };

    const handleEditPPT = async (file: File) => {
        if (!cleanId) return;
        setIsPptEditing(true);
        try {
            const formData = new FormData();
            formData.append("startup_id", cleanId);
            formData.append("ppt_file", file);
            formData.append("use_default_colors", "true");

            const response = await fetch("https://spark2scale-ai-api-server.azurewebsites.net/api/v1/ppt/edit", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setPptUrl(data.ppt_path ?? data.ppt_url ?? null);
                await fetchData();
            } else {
                const errText = await response.text();
                alert(`Enhancement failed: ${errText}`);
            }
        } catch {
            alert("Connection error. Please try again.");
        } finally {
            setIsPptEditing(false);
        }
    };

    // -----------------------------------------------------------------------
    // Chat
    // -----------------------------------------------------------------------
    useEffect(() => {
        const initChat = async () => {
            if (!cleanId) return;
            const list = await documentsService.getChatSessions(cleanId);
            setSessions(list);
            if (list.length > 0 && !chatSessionId) loadChatMessages(list[0].sessionId);
            else if (list.length === 0) startNewChatSession();
        };
        initChat();
    }, [cleanId]);

    // NEW: Smart Context Switcher (Memory)
    const handleContextSwitch = (newContextId: string) => {
        setChatContext(newContextId);

        const docConfig = REQUIRED_DOCS.find(d => d.id === newContextId);
        const docName = docConfig ? docConfig.name : "Document";

        // Look for an existing session that belongs to this document
        const existingSession = sessions.find(s => s.sessionName.startsWith(docName));

        if (existingSession) {
            // If found, load the previous history
            loadChatMessages(existingSession.sessionId);
        } else {
            // If not found, start a brand new one
            startNewChatSession(newContextId);
        }
    };

    // Accept an optional context to bypass state delays, and a flag if we know it was deleted
    const startNewChatSession = async (contextOverride?: string, forceMissingMessage?: boolean) => {
        if (!cleanId) return;

        // Find the human-readable name of the document
        const targetContextId = contextOverride || chatContext;
        const docConfig = REQUIRED_DOCS.find(d => d.id === targetContextId);
        const docName = docConfig ? docConfig.name : "Document";

        setIsChatLoading(true);
        const newSession = await documentsService.startNewSession(cleanId, docName);

        if (newSession) {
            setSessions(prev => [newSession, ...prev]);
            setChatSessionId(newSession.sessionId);

            // Check if this document is currently uploaded
            const isDocUploaded = targetContextId === "pitch_deck"
                ? !!pptUrl
                : (docStates.find(d => d.configId === targetContextId)?.isUploaded || false);

            // Personalize the greeting based on document existence
            if (forceMissingMessage || !isDocUploaded) {
                setMessages([{ role: "assistant", content: `Please generate or upload the ${docName} to start chatting about it.` }]);
            } else {
                setMessages([{ role: "assistant", content: `Hello! I am your AI Assistant. Let's talk about your ${docName}.` }]);
            }

            setShowChatHistory(false);
        }
        setIsChatLoading(false);
    };

    const loadChatMessages = async (sessionId: string) => {
        setIsChatLoading(true);
        setChatSessionId(sessionId);
        setShowChatHistory(false);
        try {
            const history = await documentsService.getMessages(sessionId);
            setMessages(history.length ? history : [{ role: "assistant", content: "Hello! I am your AI Assistant. Select a document context above to chat about it or generate a new one." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleSendMessage = async (textOverride?: string) => {
        const contentToSend = textOverride || newMessage;
        if (!contentToSend.trim() || !chatSessionId) return;

        if (!textOverride) setNewMessage("");

        // 1. Add User message to UI & DB
        setMessages(prev => [...prev, { role: "user", content: contentToSend }]);

        // 2. Save user message
        await documentsService.sendMessage(chatSessionId, contentToSend, "user");

        // 3. Set the bubble typing indicator instead of full loading
        setIsTyping(true);

        try {
            // Find the selected document data
            const selectedDoc = docStates.find(d => d.configId === chatContext);

            // Extract the data (Prefer JSON if available, fallback to URL)
            let fileData = "";
            if (selectedDoc?.jsonResponse) {
                fileData = typeof selectedDoc.jsonResponse === 'string'
                    ? selectedDoc.jsonResponse
                    : JSON.stringify(selectedDoc.jsonResponse);
            } else if (selectedDoc?.path) {
                fileData = selectedDoc.path;
            } else {
                throw new Error("No data found for this document.");
            }

            // Call Python FastAPI Endpoint
            const aiResponse = await fetch("https://spark2scale-ai-api-server.azurewebsites.net/api/v1/document-chat/test-document-qa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file_path: fileData,
                    query: contentToSend,
                    provider: "gemini",
                    // ADD THIS LINE: Pass the last few messages so the AI remembers context
                    chat_history: messages.slice(-5)
                })
            });

            if (!aiResponse.ok) throw new Error("AI Server Error");

            const aiData = await aiResponse.json();
            const finalAnswer = aiData.answer || "I couldn't find an answer in this document.";

            // Add AI message to UI & DB
            setMessages(prev => [...prev, { role: "assistant", content: finalAnswer }]);
            await documentsService.sendMessage(chatSessionId, finalAnswer, "assistant");

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: "assistant", content: "Error: Could not connect to the AI Assistant or document is empty." }]);
        } finally {
            // Turn off typing indicator
            setIsTyping(false);
        }
    };

    // --- NEW: Handle Enhance Message ---
    const handleEnhanceMessage = (messageContent: string) => {
        // Doing nothing for now as requested.
    };

    // --- Helper variable for context state ---
    const isCurrentDocGenerated = chatContext === "pitch_deck"
        ? !!pptUrl
        : (docStates.find(d => d.configId === chatContext)?.isUploaded || false);

    // -----------------------------------------------------------------------
    // Generate Generic Document (SWOT / Others)
    // -----------------------------------------------------------------------
    const handleSimulateGeneration = async (docId: string) => {
        if (!cleanId) return;
        const docConfig = REQUIRED_DOCS.find(d => d.id === docId);
        if (!docConfig) return;

        setIsGeneratingDoc(true);
        setMessages(prev => [...prev, { role: "user", content: `Generate the ${docConfig.name} for me.` }]);

        try {
            let success = false;
            if (docId === "swot") {
                success = await documentsService.generateSwot(cleanId);
            } else if (docId === "competitor_matrix") {
                success = await documentsService.generateCompetitorMatrix(cleanId);
            } else {
                success = await documentsService.generateMockDocument(cleanId, docConfig.name);
            }

            if (success) {
                await fetchData();
                setMessages(prev => [...prev, { role: "assistant", content: `Successfully generated the ${docConfig.name}. It is now available in your documents list.` }]);
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: "Error: Could not generate document." }]);
            }
        } catch {
            setMessages(prev => [...prev, { role: "assistant", content: "Connection error." }]);
        } finally {
            setIsGeneratingDoc(false);
        }
    };

    // -----------------------------------------------------------------------
    // Actions (Upload, Delete, View)
    // -----------------------------------------------------------------------
    const triggerUpload = (configId: string) => {
        fileInputRefs.current[configId]?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, config: typeof REQUIRED_DOCS[0]) => {
        if (!e.target.files || e.target.files.length === 0 || !cleanId) return;
        const file = e.target.files[0];
        setUploadingId(config.id);
        const currentState = docStates.find(d => d.configId === config.id);
        const existingDbId = currentState?.isUploaded && currentState.dbId ? currentState.dbId : undefined;
        try {
            const success = await documentsService.uploadDocument(cleanId, config.name, file, existingDbId);
            if (success) await fetchData();
            else alert("Upload failed");
        } finally {
            setUploadingId(null);
        }
    };

    const handleDelete = async (dbId?: string) => {
        if (!dbId || !confirm("Delete this document?")) return;

        // 1. Find which document type this dbId belongs to before it's gone
        const docStateToDelete = docStates.find(d => d.dbId === dbId);
        const deletedConfigId = docStateToDelete?.configId;

        setDeletingId(dbId);
        try {
            const success = await documentsService.deleteDocument(dbId);
            if (success) {
                await fetchData(); // Refreshes the UI list

                // 2. Instantly reset the chat for the deleted document
                if (deletedConfigId) {
                    setChatContext(deletedConfigId);
                    // The 'true' flag forces the "Please generate..." message
                    await startNewChatSession(deletedConfigId, true);
                }
            }
        } finally {
            setDeletingId(null);
        }
    };

    const handleView = (state: DocState) => {
        if (state.path && state.path.trim() !== "") {
            setViewerPayload({ type: "pdf", url: state.path, name: state.name });
            return;
        }
        if (state.jsonResponse) {
            if (state.configId === "competitor_matrix") {
                setViewerPayload({ type: "competitor_matrix", data: state.jsonResponse, name: state.name });
                return;
            }
            setViewerPayload({ type: "swot", data: state.jsonResponse, name: state.name });
            return;
        }
        alert("This document has no file or data to view.");
    };

    const handleEvaluate = (dbId?: string) => { if (dbId) router.push(`/founder/startup/${cleanId}/documents/${dbId}/evaluate`); };
    const handleRecommend = (dbId?: string) => { if (dbId) router.push(`/founder/startup/${cleanId}/documents/${dbId}/recommend`); };

    // -----------------------------------------------------------------------
    // Complete Stage
    // -----------------------------------------------------------------------
    const handleCompleteStage = async () => {
        setIsCompleting(true);
        if (!cleanId) return;
        try {
            const checkData = await documentsService.checkCompletion(cleanId);
            if (!checkData || !checkData.isComplete) {
                const missingList = checkData?.missingDocs?.join(", ") || "documents";
                alert(`Cannot Complete Stage.\n\nYou are missing: ${missingList}`);
                setIsCompleting(false);
                return;
            }
            const currentWorkflow = await documentsService.getWorkflow(cleanId);
            const success = await documentsService.updateWorkflow({
                StartupId: cleanId,
                IdeaCheck: currentWorkflow.ideaCheck || currentWorkflow.IdeaCheck,
                MarketResearch: currentWorkflow.marketResearch || currentWorkflow.MarketResearch,
                Evaluation: currentWorkflow.evaluation || currentWorkflow.Evaluation,
                Recommendation: currentWorkflow.recommendation || currentWorkflow.Recommendation,
                Documents: true,
                PitchDeck: currentWorkflow.pitchDeck || currentWorkflow.PitchDeck,
            });
            if (success) {
                setIsWorkflowComplete(true);
                router.push(`/founder/startup/${cleanId}`);
            }
        } finally {
            setIsCompleting(false);
        }
    };

    const getCurrentContextName = () => REQUIRED_DOCS.find(d => d.id === chatContext)?.name || "Document";

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[#F5F7F2]">
            {viewerPayload && (
                <DocumentViewerModal
                    payload={viewerPayload}
                    onClose={() => setViewerPayload(null)}
                />
            )}

            {/* Nav */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
                <div className="flex w-full items-center justify-between px-6 md:px-12 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${cleanId}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238] leading-tight">Documents</h1>
                            <p className="text-sm text-muted-foreground">Manage and generate your startup files</p>
                        </div>
                    </div>
                    {isWorkflowComplete && (
                        <div className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                            Stage Completed
                        </div>
                    )}
                </div>
            </div>

            <main className="container mx-auto px-6 py-8">
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN: Documents List */}
                    <div className="lg:col-span-7 space-y-6">
                        <Card className="p-6 bg-gradient-to-r from-[#F0EADC] to-white border border-[#576238]/20">
                            <div className="flex items-start gap-4">
                                <div className="bg-[#576238]/10 p-3 rounded-full">
                                    <FileText className="h-6 w-6 text-[#576238]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#576238] mb-1">Required Documentation</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Investors require these documents. Use the AI Assistant to generate drafts or upload your existing files.
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* PPT specific Card Component */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className={`group border transition-all duration-200 ${pptUrl ? "bg-white border-green-100 shadow-sm" : "bg-white border-gray-200 shadow-sm"}`}>
                                <div className="p-5 flex flex-col sm:flex-row gap-5">
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${pptUrl ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                        <Presentation className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-bold text-[#576238] truncate">Pitch Deck (PPT)</h3>
                                            {pptUrl && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Generated</span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-4">AI-generated PPTX or upload your own to enhance with AI styles.</p>

                                        <input type="file" accept=".pptx,.ppt,.pdf" className="hidden" ref={(el) => { fileInputRefs.current["ppt_generation"] = el; }}
                                            onChange={async (e) => {
                                                if (!e.target.files?.[0] || !cleanId) return;
                                                setUploadingId("ppt_generation");
                                                await documentsService.uploadDocument(cleanId, "Pitch Deck (PPT)", e.target.files[0]);
                                                setUploadingId(null);
                                                fetchData();
                                            }}
                                        />
                                        <input type="file" accept=".pptx,.ppt" className="hidden" ref={editPptInputRef}
                                            onChange={(e) => { if (e.target.files?.[0]) handleEditPPT(e.target.files[0]); }}
                                        />

                                        <div className="flex flex-wrap items-center gap-2">
                                            {pptUrl ? (
                                                <>
                                                    <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => window.open(pptUrl, "_blank")}><Eye className="h-3 w-3 mr-1.5" /> View</Button>
                                                    <a href={pptUrl} download><Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`}><Download className="h-3 w-3 mr-1.5" /> Download</Button></a>
                                                    <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => editPptInputRef.current?.click()} disabled={isPptEditing}>
                                                        {isPptEditing ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Enhancing…</> : <><Sparkles className="h-3 w-3 mr-1.5" /> Enhance</>}
                                                    </Button>
                                                    {isFounder && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#576238] ml-auto" onClick={handleGeneratePPT} disabled={isPptGenerating}>
                                                            {isPptGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                                        </Button>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => fileInputRefs.current["ppt_generation"]?.click()} disabled={uploadingId === "ppt_generation"}>
                                                        {uploadingId === "ppt_generation" ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Upload className="h-3 w-3 mr-1.5" />} Upload
                                                    </Button>
                                                    <Button size="sm" className={`h-8 text-xs ${primaryBtn}`} onClick={handleGeneratePPT} disabled={isPptGenerating}>
                                                        {isPptGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <><Sparkles className="h-3 w-3 mr-1.5" /> AI Generate</>}
                                                    </Button>
                                                    <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => editPptInputRef.current?.click()} disabled={isPptEditing}>
                                                        {isPptEditing ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <><Sparkles className="h-3 w-3 mr-1.5" /> Enhance</>}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        {isLoadingData ? (
                            <div className="text-center py-20">
                                <Loader2 className="h-10 w-10 animate-spin mx-auto text-[#576238] opacity-50" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {REQUIRED_DOCS.filter(doc => doc.id !== "pitch_deck").map((config, index) => {
                                    const state = docStates.find(d => d.configId === config.id);
                                    const isUploaded = state?.isUploaded || false;
                                    const isJsonOnly = isUploaded && (!state?.path || state.path.trim() === "") && !!state?.jsonResponse;

                                    return (
                                        <motion.div key={config.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                                            <Card className={`group overflow-hidden border transition-all duration-200 ${isUploaded ? "bg-white border-green-100 shadow-sm" : "bg-white border-gray-200 hover:border-[#576238]/50 hover:shadow-md"}`}>
                                                <div className="p-5 flex flex-col sm:flex-row gap-5">
                                                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${isUploaded ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                                        <config.icon className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h3 className="font-bold text-[#576238] truncate">{config.name}</h3>
                                                            {isUploaded
                                                                ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Users className="h-3 w-3" /> V{state?.version}</span>
                                                                : <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Required</span>}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{config.desc}</p>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <input
                                                                type="file"
                                                                ref={el => { fileInputRefs.current[config.id] = el; }}
                                                                className="hidden"
                                                                accept={config.accept}
                                                                onChange={e => handleFileChange(e, config)}
                                                            />
                                                            {isUploaded ? (
                                                                <>
                                                                    <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => state && handleView(state)}>
                                                                        <Eye className="h-3 w-3 mr-1.5" />
                                                                        {isJsonOnly ? "View Analysis" : "View"}
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => handleEvaluate(state?.dbId)}>
                                                                        <Star className="h-3 w-3 mr-1.5" /> Evaluate
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => handleRecommend(state?.dbId)}>
                                                                        <Edit className="h-3 w-3 mr-1.5" /> Recommend
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 ml-auto" onClick={() => handleDelete(state?.dbId)}>
                                                                        {deletingId === state?.dbId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#576238]" onClick={() => triggerUpload(config.id)}>
                                                                        <RefreshCw className="h-3 w-3" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => triggerUpload(config.id)} disabled={uploadingId === config.id}>
                                                                        {uploadingId === config.id ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Upload className="h-3 w-3 mr-1.5" />} Upload
                                                                    </Button>
                                                                    <Button size="sm" className={`h-8 text-xs ${primaryBtn}`} onClick={() => handleSimulateGeneration(config.id)} disabled={isGeneratingDoc}>
                                                                        {isGeneratingDoc ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1.5" />} Generate
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="pt-8 text-center">
                            {isWorkflowComplete ? (
                                <Button size="lg" variant="outline" className="font-semibold" asChild>
                                    <Link href={`/founder/startup/${cleanId}`}>Continue to Dashboard</Link>
                                </Button>
                            ) : (
                                <Button size="lg" className="w-full sm:w-auto bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold px-8" onClick={handleCompleteStage} disabled={isCompleting}>
                                    {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Mark as Complete & Continue"}
                                </Button>
                            )}
                            {isWorkflowComplete && <p className="text-xs text-muted-foreground mt-2">Stage previously marked as complete.</p>}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Chat Assistant */}
                    <div className="lg:col-span-5">
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="sticky top-24">

                            {/* MAXIMIZE TOGGLE WRAPPER */}
                            <Card className={`border border-gray-300 shadow-2xl overflow-hidden flex flex-col bg-white transition-all duration-300 ${isChatMaximized
                                ? "fixed inset-4 md:inset-10 z-[100]"
                                : "h-[calc(100vh-120px)]"
                                }`}>
                                <div className="p-4 bg-[#576238] text-white flex-shrink-0">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Bot className="h-5 w-5" />
                                            <h2 className="font-bold text-sm">AI Assistant</h2>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => setShowChatHistory(!showChatHistory)} className="text-white/80 hover:text-white hover:bg-white/10 h-7 px-2 text-xs">
                                                {showChatHistory ? <X className="h-4 w-4 mr-1" /> : <History className="h-4 w-4 mr-1" />}
                                                {showChatHistory ? "Close" : "History"}
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setIsChatMaximized(!isChatMaximized)} className="text-white/80 hover:text-white hover:bg-white/10 h-7 w-7 p-0">
                                                {isChatMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 bg-black/20 p-1 rounded-md">
                                        <span className="text-[10px] uppercase tracking-wider opacity-70 pl-2">Context:</span>
                                        <Select
                                            value={chatContext}
                                            onValueChange={handleContextSwitch}
                                        >
                                            <SelectTrigger className="h-6 bg-transparent border-none text-white text-xs focus:ring-0 p-0 pl-1 gap-1 shadow-none">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {REQUIRED_DOCS.map(doc => (
                                                    <SelectItem key={doc.id} value={doc.id} className="text-xs">
                                                        <div className="flex items-center gap-2"><doc.icon className="h-3 w-3" /> {doc.name}</div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex-1 relative overflow-hidden bg-gray-50">
                                    <AnimatePresence>
                                        {showChatHistory && (
                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute inset-0 z-10 bg-white p-4 overflow-auto">
                                                <Button className="w-full mb-4 bg-[#576238] hover:bg-[#464f2d]" size="sm" onClick={() => startNewChatSession()}>
                                                    <Plus className="h-4 w-4 mr-2" /> New Chat
                                                </Button>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Recent Sessions</Label>
                                                    {sessions.map(s => (
                                                        <button key={s.sessionId} onClick={() => loadChatMessages(s.sessionId)} className={`w-full text-left p-3 rounded-lg text-xs border transition-colors ${chatSessionId === s.sessionId ? "border-[#576238] bg-[#576238]/5 text-[#576238] font-medium" : "border-transparent hover:bg-gray-100"}`}>
                                                            <div className="truncate">{s.sessionName}</div>
                                                            <div className="text-[10px] text-muted-foreground mt-1">{new Date(s.createdAt).toLocaleString()}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <ScrollArea className="h-full p-4">
                                        {isChatLoading ? (
                                            <div className="flex justify-center items-center h-full opacity-50">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="space-y-6 pb-4">
                                                {messages.map((m, i) => (
                                                    <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 w-full ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>

                                                        {/* Avatar Icon */}
                                                        <div className={`flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full ${m.role === "user" ? "bg-[#464f2d] text-white" : "bg-white border border-gray-200 text-[#576238] shadow-sm"}`}>
                                                            {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                                        </div>

                                                        {/* Message Bubble & Actions Container */}
                                                        <div className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"} max-w-[75%]`}>
                                                            <div className={`px-4 py-3 text-sm rounded-2xl shadow-sm ${m.role === "user" ? "bg-[#576238] text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"}`}>
                                                                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                                            </div>

                                                            {/* Action Buttons Container */}
                                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                {/* Existing Generate Button (Only on the last message if doc isn't generated) */}
                                                                {m.role === "assistant" && i === messages.length - 1 && !isCurrentDocGenerated && (
                                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            disabled={chatContext === "pitch_deck" ? isPptGenerating : isGeneratingDoc}
                                                                            className="h-7 text-[10px] border-[#576238] text-[#576238] hover:bg-[#576238] hover:text-white transition-colors"
                                                                            onClick={() => chatContext === "pitch_deck" ? handleGeneratePPT() : handleSimulateGeneration(chatContext)}
                                                                        >
                                                                            {(chatContext === "pitch_deck" ? isPptGenerating : isGeneratingDoc) ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1.5" />}
                                                                            Generate {getCurrentContextName()}
                                                                        </Button>
                                                                    </motion.div>
                                                                )}

                                                                {/* NEW: Enhance Button (Available on all AI messages) */}
                                                                {m.role === "assistant" && (
                                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            disabled={isChatLoading || isTyping}
                                                                            className="h-7 text-[10px] border-[#576238] text-[#576238] hover:bg-[#576238] hover:text-white transition-colors"
                                                                            onClick={() => handleEnhanceMessage(m.content)}
                                                                        >
                                                                            <Sparkles className="h-3 w-3 mr-1.5" />
                                                                            Enhance
                                                                        </Button>
                                                                    </motion.div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}

                                                {/* The Typing Indicator Bubble */}
                                                {isTyping && (
                                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 w-full flex-row">
                                                        <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 text-[#576238] shadow-sm">
                                                            <Bot className="h-4 w-4" />
                                                        </div>
                                                        <div className="px-4 py-4 bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-[44px]">
                                                            <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                                            <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                                            <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>

                                <div className="p-3 bg-white border-t flex-shrink-0">
                                    <form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} className="relative flex items-center">
                                        <Input
                                            placeholder={isCurrentDocGenerated ? `Ask about ${getCurrentContextName()}...` : `Please generate ${getCurrentContextName()} first...`}
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            className="pr-10 py-5 text-sm bg-gray-50 focus-visible:ring-[#576238]"
                                            disabled={!chatSessionId || isChatLoading || !isCurrentDocGenerated || isTyping}
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            className="absolute right-1 h-8 w-8 bg-[#576238] hover:bg-[#464f2d] rounded-full"
                                            disabled={!chatSessionId || isChatLoading || !newMessage.trim() || !isCurrentDocGenerated || isTyping}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </main>

            <Dialog open={manageAccessDialog} onOpenChange={setManageAccessDialog}>
                <DialogContent aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>Share Document</DialogTitle>
                        <DialogDescription>Invite team members to view or edit.</DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 mt-2">
                        <Input placeholder="email@company.com" value={accessEmail} onChange={e => setAccessEmail(e.target.value)} />
                        <Button onClick={() => setAccessEmail("")} className="bg-[#576238]">Invite</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}