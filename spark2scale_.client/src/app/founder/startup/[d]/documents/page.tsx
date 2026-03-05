"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Presentation, Table, Scale, ArrowLeft, Upload, FileText, Plus, Eye, Send, Star, Users, Edit, Loader2, Trash2, Sparkles, RefreshCw, Bot, History, X, Download } from "lucide-react";
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
    const token = auth?.token;
    const userRole = auth?.user?.role;
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    // --- State ---
    const [docStates, setDocStates] = useState<DocState[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);

    // PPT State
    const [isPptGenerating, setIsPptGenerating] = useState(false);
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
    // 1. Fetch Data
    // ---------------------------------------------------------
    const fetchData = async () => {
        if (!cleanId) return;
        setIsLoadingData(true);
        try {
            const dbDocs = await documentsService.getDocuments(cleanId);

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
        } finally {
            setIsLoadingData(false);
        }
    };
    useEffect(() => { fetchData(); }, [cleanId]);

    // ---------------------------------------------------------
    // 2. PPT Generation — calls deployed endpoint
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
        } catch (err) {
            alert("Connection error. Please try again.");
        } finally {
            setIsPptGenerating(false);
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
            setMessages([{ role: "assistant", content: "Hello! Select a document above and I can help you generate it." }]);
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
    // 4. Other Doc Generation
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
                setMessages(prev => [...prev, { role: "assistant", content: "❌ Error: Could not generate document." }]);
            }
        } catch {
            setMessages(prev => [...prev, { role: "assistant", content: "❌ Connection error." }]);
        } finally {
            setIsGeneratingDoc(false);
        }
    };

    const triggerUpload = (configId: string) => {
        fileInputRefs.current[configId]?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, config: typeof REQUIRED_DOCS[0]) => {
        if (!e.target.files || e.target.files.length === 0 || !cleanId) return;
        const file = e.target.files[0];
        setUploadingId(config.id);
        try {
            const success = await documentsService.uploadDocument(cleanId, config.name, file);
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

    const handleView = (path?: string) => { if (path) window.open(path, "_blank"); };
    const handleEvaluate = (dbId?: string) => { if (dbId) router.push(`/founder/startup/${cleanId}/documents/${dbId}/evaluate`); };
    const handleRecommend = (dbId?: string) => { if (dbId) router.push(`/founder/startup/${cleanId}/documents/${dbId}/recommend`); };
    const handleGenerateClick = (docId: string, prompt: string) => { setChatContext(docId); handleSendMessage(prompt); };

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
                </div>
            </div>

            <main className="container mx-auto px-6 py-8">
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Left Column */}
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

                        {/* ── PPT Generation Row — same style as other doc cards ── */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className={`group overflow-hidden border transition-all duration-200 ${pptUrl ? "bg-white border-green-100 shadow-sm" : "bg-white border-gray-200 hover:border-[#576238]/50 hover:shadow-md"}`}>
                                <div className="p-5 flex flex-col sm:flex-row gap-5">
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${pptUrl ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                        <Presentation className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-bold text-[#576238] truncate">Pitch Deck (PPT)</h3>
                                            {pptUrl && (
                                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                    Generated
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                                            AI-generated PPTX from your evaluation & market research. Requires Idea Check and Market Research docs.
                                        </p>
                                        <input
                                            type="file"
                                            accept=".pptx,.ppt,.pdf"
                                            className="hidden"
                                            ref={(el) => { fileInputRefs.current["ppt_generation"] = el; }}
                                            onChange={async (e) => {
                                                if (!e.target.files?.[0] || !cleanId) return;
                                                const file = e.target.files[0];
                                                setUploadingId("ppt_generation");
                                                try {
                                                    const success = await documentsService.uploadDocument(cleanId, "Pitch Deck (PPT)", file);
                                                    if (success) await fetchData();
                                                    else alert("Upload failed");
                                                } finally {
                                                    setUploadingId(null);
                                                }
                                            }}
                                        />
                                        <div className="flex flex-wrap items-center gap-2">
                                            {pptUrl ? (
                                                <>
                                                    <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => window.open(pptUrl, "_blank")}>
                                                        <Eye className="h-3 w-3 mr-1.5" /> View
                                                    </Button>
                                                    <a href={pptUrl} download>
                                                        <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">
                                                            <Download className="h-3 w-3 mr-1.5" /> Download
                                                        </Button>
                                                    </a>
                                                    {isFounder && (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#576238] ml-auto" title="Re-upload" onClick={() => fileInputRefs.current["ppt_generation"]?.click()} disabled={uploadingId === "ppt_generation"}>
                                                                {uploadingId === "ppt_generation" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#576238]" title="Regenerate" onClick={handleGeneratePPT} disabled={isPptGenerating}>
                                                                {isPptGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                                            </Button>
                                                        </>
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
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        {/* ── Required Docs List ── */}
                        {isLoadingData ? (
                            <div className="text-center py-20">
                                <Loader2 className="h-10 w-10 animate-spin mx-auto text-[#576238] opacity-50" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {REQUIRED_DOCS.map((config, index) => {
                                    const state = docStates.find(d => d.configId === config.id);
                                    const isUploaded = state?.isUploaded || false;
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
                                                            {isUploaded && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">V{state?.version}</span>}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{config.desc}</p>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <input
                                                                type="file"
                                                                ref={(el) => { fileInputRefs.current[config.id] = el; }}
                                                                className="hidden"
                                                                onChange={(e) => handleFileChange(e, config)}
                                                            />
                                                            {isUploaded ? (
                                                                <>
                                                                    <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => handleView(state?.path)}><Eye className="h-3 w-3 mr-1.5" /> View</Button>
                                                                    <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => handleEvaluate(state?.dbId)}><Star className="h-3 w-3 mr-1.5" /> Evaluate</Button>
                                                                    <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => handleRecommend(state?.dbId)}><Edit className="h-3 w-3 mr-1.5" /> Recommend</Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 ml-auto" onClick={() => handleDelete(state?.dbId)}>
                                                                        {deletingId === state?.dbId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#576238]" onClick={() => triggerUpload(config.id)}><RefreshCw className="h-3 w-3" /></Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button variant="outline" size="sm" className="h-8 text-xs border-gray-300 hover:bg-gray-50" onClick={() => triggerUpload(config.id)} disabled={uploadingId === config.id}>
                                                                        {uploadingId === config.id ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Upload className="h-3 w-3 mr-1.5" />} Upload
                                                                    </Button>
                                                                    <Button size="sm" className="h-8 text-xs bg-[#576238] hover:bg-[#464f2d] text-white shadow-sm" onClick={() => handleGenerateClick(config.id, config.aiPrompt)}>
                                                                        <Sparkles className="h-3 w-3 mr-1.5" /> AI Generate
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

                        <div className="pt-4 text-center">
                            <Button size="lg" className="w-full sm:w-auto bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold px-8" onClick={handleCompleteStage} disabled={isCompleting}>
                                {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Complete Documents Stage"}
                            </Button>
                        </div>
                    </div>

                    {/* Right Column — AI Chat */}
                    <div className="lg:col-span-5">
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="sticky top-24">
                            <Card className="border border-gray-300 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-120px)] bg-white">
                                <div className="p-4 bg-[#576238] text-white flex-shrink-0">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2"><Bot className="h-5 w-5" /><h2 className="font-bold text-sm">AI Assistant</h2></div>
                                        <Button variant="ghost" size="sm" onClick={() => setShowChatHistory(!showChatHistory)} className="text-white text-xs">
                                            {showChatHistory ? <X className="h-4 w-4 mr-1" /> : <History className="h-4 w-4 mr-1" />}
                                            {showChatHistory ? "Close" : "History"}
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/20 p-1 rounded-md">
                                        <span className="text-[10px] uppercase tracking-wider opacity-70 pl-2">Context:</span>
                                        <Select value={chatContext} onValueChange={setChatContext}>
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
                                                <Button className="w-full mb-4 bg-[#576238]" size="sm" onClick={startNewChatSession}><Plus className="h-4 w-4 mr-2" /> New Chat</Button>
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
                                            <div className="flex justify-center items-center h-full opacity-50"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                        ) : (
                                            <div className="space-y-4">
                                                {messages.map((m, i) => (
                                                    <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                                                        <div className={`px-4 py-3 text-sm rounded-2xl max-w-[85%] shadow-sm ${m.role === "user" ? "bg-[#576238] text-white rounded-br-none" : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"}`}>
                                                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                                        </div>
                                                        {m.role === "assistant" && i === messages.length - 1 && (
                                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={isGeneratingDoc}
                                                                    className="mt-2 h-7 text-[10px] border-[#576238] text-[#576238] hover:bg-[#576238] hover:text-white transition-colors"
                                                                    onClick={() => handleGenerateAction(chatContext)}
                                                                >
                                                                    {isGeneratingDoc ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1.5" />}
                                                                    Generate {getCurrentContextName()}
                                                                </Button>
                                                            </motion.div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>

                                <div className="p-3 bg-white border-t flex-shrink-0">
                                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative flex items-center">
                                        <Input
                                            placeholder={`Ask about ${getCurrentContextName()}...`}
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            className="pr-10 py-5 text-sm bg-gray-50 focus-visible:ring-[#576238]"
                                            disabled={!chatSessionId || isChatLoading}
                                        />
                                        <Button type="submit" size="icon" className="absolute right-1 h-8 w-8 bg-[#576238] hover:bg-[#464f2d] rounded-full" disabled={!chatSessionId || isChatLoading || !newMessage.trim()}>
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </main>
        </div>
    );
}