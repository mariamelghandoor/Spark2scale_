"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Presentation, ArrowLeft, Upload, FileText, Plus, Eye, Send, Star, Edit, Loader2, Trash2, Sparkles, RefreshCw, Bot, History, X, Download } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function DocumentsPage() {
    const params = useParams();
    const router = useRouter();
    const auth = useAuth() as any;
    const userRole = auth?.user?.role;
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const editPptInputRef = useRef<HTMLInputElement | null>(null);

    // --- State ---
    const [docStates, setDocStates] = useState<DocState[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isWorkflowComplete, setIsWorkflowComplete] = useState(false); // Workflow integration state

    // PPT Generation/Enhancement State
    const [isPptGenerating, setIsPptGenerating] = useState(false);
    const [isPptEditing, setIsPptEditing] = useState(false);
    const [pptUrl, setPptUrl] = useState<string | null>(null);

    // Chat & History State
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [chatSessionId, setChatSessionId] = useState<string | null>(null);
    const [chatContext, setChatContext] = useState<string>(REQUIRED_DOCS[0]?.id || "");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [showChatHistory, setShowChatHistory] = useState(false);
    const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

    const getCleanId = () => {
        const rawParam = params?.d || params?.id;
        if (!rawParam) return null;
        const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        return decodeURIComponent(rawId).replace(/\s/g, '');
    };
    const cleanId = getCleanId();
    const isFounder = userRole === "Founder";

    // ---------------------------------------------------------
    // 1. Fetch Data (Documents + Workflow Status)
    // ---------------------------------------------------------
    const fetchData = async () => {
        if (!cleanId) return;
        setIsLoadingData(true);
        try {
            const [dbDocs, workflowState] = await Promise.all([
                documentsService.getDocuments(cleanId),
                documentsService.getWorkflow(cleanId)
            ]);

            // Check for existing PPT
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
                        date: match.created_at
                    };
                } else {
                    return { configId: req.id, isUploaded: false, name: req.name };
                }
            });
            setDocStates(mergedState);

            // Set Workflow completeness
            if (workflowState) {
                const isComplete = workflowState.documents === true || workflowState.Documents === true;
                setIsWorkflowComplete(isComplete);
            }
        } catch (error) {
            console.error("Failed to fetch documents:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => { fetchData(); }, [cleanId]);

    // ---------------------------------------------------------
    // 2. PPT Actions (Generation & Enhancement)
    // ---------------------------------------------------------
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

            const response = await fetch("https://spark2scale-ai-server.azurewebsites.net/api/v1/ppt/edit", {
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

    // ---------------------------------------------------------
    // 3. Chat Logic
    // ---------------------------------------------------------
    useEffect(() => {
        const initChat = async () => {
            if (!cleanId) return;
            const list = await documentsService.getChatSessions(cleanId);
            setSessions(list);
            if (list.length > 0 && !chatSessionId) {
                loadChatMessages(list[0].sessionId);
            } else if (list.length === 0) {
                startNewChatSession();
            }
        };
        initChat();
    }, [cleanId]);

    const startNewChatSession = async () => {
        if (!cleanId) return;
        const newSession = await documentsService.startNewSession(cleanId);
        if (newSession) {
            setSessions(prev => [newSession, ...prev]);
            setChatSessionId(newSession.sessionId);
            setMessages([{ role: "assistant", content: "Hello! Select a document and I can help you generate it." }]);
            setShowChatHistory(false);
        }
    };

    const loadChatMessages = async (sessionId: string) => {
        setIsChatLoading(true);
        setChatSessionId(sessionId);
        setShowChatHistory(false);
        try {
            const history = await documentsService.getMessages(sessionId);
            setMessages(history.length ? history : [{ role: "assistant", content: "Hello!" }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleSendMessage = async (textOverride?: string) => {
        const contentToSend = textOverride || newMessage;
        if (!contentToSend.trim() || !chatSessionId) return;
        if (!textOverride) setNewMessage("");
        setMessages(prev => [...prev, { role: "user", content: contentToSend }]);
        await documentsService.sendMessage(chatSessionId, contentToSend);
    };

    // ---------------------------------------------------------
    // 4. Document Operations
    // ---------------------------------------------------------
    const handleGenerateAction = async (docId: string) => {
        if (!cleanId) return;
        const docConfig = REQUIRED_DOCS.find(d => d.id === docId);
        if (!docConfig) return;
        setIsGeneratingDoc(true);
        setMessages(prev => [...prev, { role: "user", content: `Generate the ${docConfig.name} for me.` }]);
        try {
            const success = await documentsService.generateMockDocument(cleanId, docConfig.name);
            if (success) {
                await fetchData();
                setMessages(prev => [...prev, { role: "assistant", content: `✅ Successfully generated ${docConfig.name}.` }]);
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: "❌ Could not generate document." }]);
            }
        } finally {
            setIsGeneratingDoc(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, config: typeof REQUIRED_DOCS[0]) => {
        if (!e.target.files?.[0] || !cleanId) return;
        setUploadingId(config.id);
        try {
            const success = await documentsService.uploadDocument(cleanId, config.name, e.target.files[0]);
            if (success) await fetchData();
            else alert("Upload failed");
        } finally {
            setUploadingId(null);
        }
    };

    const handleDelete = async (dbId?: string) => {
        if (!dbId || !confirm("Delete this document?")) return;
        setDeletingId(dbId);
        try {
            const success = await documentsService.deleteDocument(dbId);
            if (success) await fetchData();
        } finally {
            setDeletingId(null);
        }
    };

    const handleCompleteStage = async () => {
        setIsCompleting(true);
        if (!cleanId) return;
        try {
            const checkData = await documentsService.checkCompletion(cleanId);
            if (!checkData || !checkData.isComplete) {
                alert("⚠️ Missing required documents.");
                setIsCompleting(false);
                return;
            }
            const currentWorkflow = await documentsService.getWorkflow(cleanId);
            const success = await documentsService.updateWorkflow({ ...currentWorkflow, Documents: true, StartupId: cleanId });
            if (success) router.push(`/founder/startup/${cleanId}`);
        } finally {
            setIsCompleting(false);
        }
    };

    const getCurrentContextName = () => REQUIRED_DOCS.find(d => d.id === chatContext)?.name || "Document";

    return (
        <div className="min-h-screen bg-[#F5F7F2]">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${cleanId}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">Documents</h1>
                            <p className="text-xs text-muted-foreground">Manage and generate startup files</p>
                        </div>
                    </div>
                    {isWorkflowComplete && (
                        <div className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">Stage Completed</div>
                    )}
                </div>
            </div>

            <main className="container mx-auto px-6 py-8">
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Left: Documents List */}
                    <div className="lg:col-span-7 space-y-6">
                        <Card className="p-6 bg-gradient-to-r from-[#F0EADC] to-white border border-[#576238]/20">
                            <div className="flex items-start gap-4">
                                <div className="bg-[#576238]/10 p-3 rounded-full"><FileText className="h-6 w-6 text-[#576238]" /></div>
                                <div>
                                    <h3 className="font-bold text-[#576238] mb-1">Required Documentation</h3>
                                    <p className="text-sm text-muted-foreground">Investors require these specific documents. Use AI Assistant to generate or upload your own.</p>
                                </div>
                            </div>
                        </Card>

                        {/* PPT Row */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className={`group border transition-all duration-200 ${pptUrl ? "bg-white border-green-100 shadow-sm" : "bg-white border-gray-200"}`}>
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

                                        {/* Hidden inputs for PPT */}
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
                                                    <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => window.open(pptUrl, "_blank")}><Eye className="h-3 w-3 mr-1.5" /> View</Button>
                                                    <a href={pptUrl} download><Button variant="outline" size="sm" className="h-8 text-xs border-gray-200"><Download className="h-3 w-3 mr-1.5" /> Download</Button></a>

                                                    {/* UPDATED: Icon changed to Sparkles to match Generate style */}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-xs border-gray-200 hover:bg-[#576238]/5 hover:border-[#576238]/40"
                                                        onClick={() => editPptInputRef.current?.click()}
                                                        disabled={isPptEditing}
                                                        title="Upload a PPT file to enhance with AI"
                                                    >
                                                        {isPptEditing
                                                            ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Enhancing…</>
                                                            : <><Sparkles className="h-3 w-3 mr-1.5" /> Enhance</>
                                                        }
                                                    </Button>

                                                    {isFounder && (
                                                        <div className="flex gap-1 ml-auto">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#576238]" title="Re-upload" onClick={() => fileInputRefs.current["ppt_generation"]?.click()} disabled={uploadingId === "ppt_generation"}>
                                                                {uploadingId === "ppt_generation" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#576238]" title="Regenerate from scratch" onClick={handleGeneratePPT} disabled={isPptGenerating}>
                                                                {isPptGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-xs border-gray-300 hover:bg-gray-50"
                                                        onClick={() => fileInputRefs.current["ppt_generation"]?.click()}
                                                        disabled={uploadingId === "ppt_generation"}
                                                    >
                                                        {uploadingId === "ppt_generation"
                                                            ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Uploading…</>
                                                            : <><Upload className="h-3 w-3 mr-1.5" /> Upload</>
                                                        }
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 text-xs bg-[#576238] hover:bg-[#464f2d] text-white shadow-sm"
                                                        onClick={handleGeneratePPT}
                                                        disabled={isPptGenerating}
                                                    >
                                                        {isPptGenerating
                                                            ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Generating…</>
                                                            : <><Sparkles className="h-3 w-3 mr-1.5" /> AI Generate</>
                                                        }
                                                    </Button>

                                                    {/* UPDATED: Icon changed to Sparkles here as well */}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-xs border-gray-300 hover:bg-gray-50"
                                                        onClick={() => editPptInputRef.current?.click()}
                                                        disabled={isPptEditing}
                                                        title="Upload your existing PPT to enhance it with AI"
                                                    >
                                                        {isPptEditing
                                                            ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Enhancing…</>
                                                            : <><Sparkles className="h-3 w-3 mr-1.5" /> Enhance</>
                                                        }
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        {/* Required Docs */}
                        <div className="space-y-4">
                            {REQUIRED_DOCS.map((config, idx) => {
                                const state = docStates.find(d => d.configId === config.id);
                                const isUploaded = state?.isUploaded || false;
                                return (
                                    <Card key={config.id} className={`p-5 border ${isUploaded ? "border-green-100" : "border-gray-200"}`}>
                                        <div className="flex gap-5">
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><config.icon className="h-6 w-6" /></div>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <h3 className="font-bold text-[#576238]">{config.name}</h3>
                                                    {isUploaded && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">V{state?.version}</span>}
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-4">{config.desc}</p>
                                                <div className="flex gap-2">
                                                    <input type="file" ref={(el) => { fileInputRefs.current[config.id] = el; }} className="hidden" onChange={(e) => handleFileChange(e, config)} />
                                                    {isUploaded ? (
                                                        <>
                                                            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => window.open(state?.path, "_blank")}>View</Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 ml-auto" onClick={() => handleDelete(state?.dbId)}>{deletingId === state?.dbId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}</Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => fileInputRefs.current[config.id]?.click()} disabled={uploadingId === config.id}>Upload</Button>
                                                            <Button size="sm" className="h-7 text-[10px] bg-[#576238] text-white" onClick={() => { setChatContext(config.id); handleSendMessage(config.aiPrompt); }}>AI Generate</Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        <div className="pt-4 text-center">
                            <Button size="lg" className="w-full bg-[#FFD95D] text-black font-semibold" onClick={handleCompleteStage} disabled={isCompleting}>
                                {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Complete Documents Stage"}
                            </Button>
                        </div>
                    </div>

                    {/* Right: AI Chat */}
                    <div className="lg:col-span-5 h-[calc(100vh-120px)] sticky top-24">
                        <Card className="h-full flex flex-col overflow-hidden border-gray-300">
                            <div className="p-4 bg-[#576238] text-white flex justify-between items-center">
                                <div className="flex items-center gap-2"><Bot className="h-5 w-5" /><h2 className="font-bold text-sm">AI Assistant</h2></div>
                                <Button variant="ghost" size="sm" onClick={() => setShowChatHistory(!showChatHistory)} className="text-xs">{showChatHistory ? "Close" : "History"}</Button>
                            </div>
                            <div className="flex-1 relative bg-gray-50 overflow-hidden">
                                <AnimatePresence>
                                    {showChatHistory && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute inset-0 z-10 bg-white p-4 overflow-auto">
                                            <Button className="w-full mb-4 bg-[#576238]" size="sm" onClick={startNewChatSession}>New Chat</Button>
                                            {sessions.map(s => <button key={s.sessionId} onClick={() => loadChatMessages(s.sessionId)} className="w-full text-left p-3 text-xs border-b">{s.sessionName}</button>)}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <ScrollArea className="h-full p-4">
                                    <div className="space-y-4">
                                        {messages.map((m, i) => (
                                            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                                                <div className={`px-4 py-2 text-sm rounded-xl max-w-[90%] ${m.role === "user" ? "bg-[#576238] text-white" : "bg-white border text-gray-800"}`}>{m.content}</div>
                                                {m.role === "assistant" && i === messages.length - 1 && (
                                                    <Button size="sm" variant="outline" className="mt-2 h-6 text-[10px]" onClick={() => handleGenerateAction(chatContext)}>
                                                        {isGeneratingDoc ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />} Generate {getCurrentContextName()}
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                            <div className="p-3 border-t bg-white">
                                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                                    <Input placeholder={`Ask about ${getCurrentContextName()}...`} value={newMessage} onChange={e => setNewMessage(e.target.value)} className="text-sm" disabled={isChatLoading} />
                                    <Button type="submit" size="icon" className="bg-[#576238]" disabled={!newMessage.trim()}><Send className="h-4 w-4" /></Button>
                                </form>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}