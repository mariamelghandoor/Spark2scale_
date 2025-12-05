"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card} from "@/components/ui/card";
import { ArrowLeft, Upload, FileText, Eye, Send, Star, Users,  Edit3, Loader2, Trash2, Sparkles, Presentation, Table, Scale } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// --- Configuration: Required Documents ---
const REQUIRED_DOCS = [
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
        desc: "PDF. Standard for signed legal docs (Incorporation, etc).",
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
interface DBDocument {
    did: string;
    master_id: string;
    document_name: string;
    type: string;
    path: string;
    version: number;
    created_at: string;
}

// UI State Object
interface DocState {
    configId: string; // matches REQUIRED_DOCS id
    dbId?: string;    // The actual Document ID (did) from DB
    masterId?: string;
    isUploaded: boolean;
    name: string;
    path?: string;
    version?: number;
    date?: string;
}

interface ChatMessage {
    role: string;
    content: string;
}

export default function DocumentsPage() {
    const params = useParams();
    const router = useRouter();

    // We use a Map to handle multiple file inputs refs dynamically
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    // --- State ---
    const [docStates, setDocStates] = useState<DocState[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null); // Track which doc is uploading
    const [isCompleting, setIsCompleting] = useState(false);

    // Chat
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [chatSessionId, setChatSessionId] = useState<string | null>(null);

    // Access Dialog (UI Stub)
    const [manageAccessDialog, setManageAccessDialog] = useState(false);
    const [accessEmail, setAccessEmail] = useState("");

    // Helper: Clean ID
    const getCleanId = () => {
        const rawParam = params?.d || params?.id;
        if (!rawParam) return null;
        const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        return decodeURIComponent(rawId).replace(/\s/g, '');
    };
    const cleanId = getCleanId();

    // ---------------------------------------------------------
    // 1. Fetch & Merge Data
    // ---------------------------------------------------------
    useEffect(() => {
        const fetchData = async () => {
            if (!cleanId) return;

            try {
                // Fetch actual files from DB
                const res = await fetch(`https://localhost:7155/api/documents?startupId=${cleanId}`);
                let dbDocs: DBDocument[] = [];
                if (res.ok) {
                    dbDocs = await res.json();
                }

                // Merge Static Config with DB Data
                // We look for the *latest* file that matches the document type
                const mergedState: DocState[] = REQUIRED_DOCS.map(req => {
                    // Find matching doc in DB by Type name (Case insensitive check)
                    // We assume the DB 'type' stores "Pitch Deck", "Financials", etc.
                    const match = dbDocs.find(d => d.type.toLowerCase() === req.name.toLowerCase());

                    if (match) {
                        return {
                            configId: req.id,
                            dbId: match.did,
                            masterId: match.master_id,
                            isUploaded: true,
                            name: match.document_name,
                            path: match.path,
                            version: match.version,
                            date: match.created_at
                        };
                    } else {
                        return {
                            configId: req.id,
                            isUploaded: false,
                            name: req.name
                        };
                    }
                });

                setDocStates(mergedState);
            } catch (error) {
                console.error("Error loading docs:", error);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [cleanId]);

    // ---------------------------------------------------------
    // 2. Chat Init
    // ---------------------------------------------------------
    useEffect(() => {
        const initChat = async () => {
            if (!cleanId) return;
            const res = await fetch(`https://localhost:7155/api/Chat/sessions/${cleanId}/document_gen`);
            if (res.ok) {
                const sessions = await res.json();
                if (sessions.length > 0) {
                    loadChatMessages(sessions[0].sessionId);
                } else {
                    startNewChatSession();
                }
            }
        };
        initChat();
    }, [cleanId]);

    const startNewChatSession = async () => {
        if (!cleanId) return;
        const res = await fetch(`https://localhost:7155/api/Chat/start-new`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ StartupId: cleanId, FeatureType: 'document_gen' })
        });
        if (res.ok) {
            const data = await res.json();
            setChatSessionId(data.sessionId);
            setMessages([{ role: "assistant", content: "Hello! I'm your AI document assistant." }]);
        }
    };

    const loadChatMessages = async (sessionId: string) => {
        setChatSessionId(sessionId);
        const res = await fetch(`https://localhost:7155/api/Chat/messages/${sessionId}`);
        if (res.ok) {
            const history = await res.json();
            setMessages(history.length ? history : [{ role: "assistant", content: "Hello! I'm your AI document assistant." }]);
        }
    };

    const handleSendMessage = async (textOverride?: string) => {
        const contentToSend = textOverride || newMessage;
        if (!contentToSend.trim() || !chatSessionId) return;

        if (!textOverride) setNewMessage("");

        setMessages(prev => [...prev, { role: "user", content: contentToSend }]);

        await fetch(`https://localhost:7155/api/Chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ SessionId: chatSessionId, Role: "user", Content: contentToSend })
        });
        // AI Logic would respond here
    };

    // ---------------------------------------------------------
    // 3. Actions
    // ---------------------------------------------------------

    // Trigger hidden file input
    const triggerUpload = (configId: string) => {
        fileInputRefs.current[configId]?.click();
    };

    // Handle File Selection
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, config: typeof REQUIRED_DOCS[0]) => {
        if (!e.target.files || e.target.files.length === 0 || !cleanId) return;

        const file = e.target.files[0];
        setUploadingId(config.id);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("startupId", cleanId);
        formData.append("type", config.name); // Sends "Pitch Deck", "Financials" etc.
        formData.append("docName", file.name);

        // Check if we are updating an existing one (Logic: Find current state)
        const currentState = docStates.find(d => d.configId === config.id);
        if (currentState?.isUploaded && currentState.dbId) {
            formData.append("documentId", currentState.dbId);
        }

        try {
            const res = await fetch("https://localhost:7155/api/documents/upload", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                window.location.reload(); // Refresh to show new state
            } else {
                alert("Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
        } finally {
            setUploadingId(null);
        }
    };

    const handleView = (path?: string) => {
        if (path) window.open(path, '_blank');
    };

    const handleEvaluate = (dbId?: string) => {
        if (!dbId) return;
        // Assuming Version 1 for simplicity if not tracking version in state
        router.push(`/founder/startup/${cleanId}/documents/${dbId}/evaluate`);
    };

    const handleRecommend = (dbId?: string) => {
        if (!dbId) return;
        router.push(`/founder/startup/${cleanId}/documents/${dbId}/recommend`);
    };

    const handleGenerate = (prompt: string) => {
        // Just put prompt in chat for now
        handleSendMessage(prompt);
    };

    const handleDelete = async (dbId?: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return;
        // Stub for delete functionality
        alert("Delete API not implemented yet in backend.");
    };

    const handleCompleteStage = async () => {
        setIsCompleting(true);
        if (!cleanId) return;

        try {
            // Fetch current to preserve
            const getRes = await fetch(`https://localhost:7155/api/StartupWorkflow/${cleanId}`);
            let currentData = { ideaCheck: false, marketResearch: false, evaluation: false, recommendation: false, documents: false, pitchDeck: false };
            if (getRes.ok) {
                const json = await getRes.json();
                currentData = {
                    ideaCheck: json.ideaCheck || json.IdeaCheck,
                    marketResearch: json.marketResearch || json.MarketResearch,
                    evaluation: json.evaluation || json.Evaluation,
                    recommendation: json.recommendation || json.Recommendation,
                    documents: json.documents || json.Documents,
                    pitchDeck: json.pitchDeck || json.PitchDeck,
                };
            }

            const updatePayload = {
                StartupId: cleanId,
                IdeaCheck: currentData.ideaCheck,
                MarketResearch: currentData.marketResearch,
                Evaluation: currentData.evaluation,
                Recommendation: currentData.recommendation,
                Documents: true, // <--- SETTING THIS TO TRUE
                PitchDeck: currentData.pitchDeck
            };

            const updateRes = await fetch(`https://localhost:7155/api/StartupWorkflow/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (updateRes.ok) {
                router.push(`/founder/startup/${cleanId}`);
            }
        } catch (error) {
            console.error("Error completing stage:", error);
        } finally {
            setIsCompleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${cleanId}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-[#576238]">📁 Documents</h1>
                            <p className="text-sm text-muted-foreground">Manage your startup documents</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Documents List */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Info Card */}
                        <Card className="p-6 bg-[#F0EADC]/50 border-2 border-[#FFD95D]">
                            <div className="flex items-start gap-4">
                                <div className="text-4xl">💡</div>
                                <div>
                                    <h3 className="font-bold text-[#576238] mb-2">Required Documents</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Investors need these 5 key documents to validate your startup. Upload existing files or ask AI to help generate them.
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Dynamic Document Cards */}
                        {isLoadingData ? (
                            <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#576238]" /></div>
                        ) : (
                            <div className="space-y-4">
                                {REQUIRED_DOCS.map((config, index) => {
                                    // Find current state for this doc type
                                    const state = docStates.find(d => d.configId === config.id);
                                    const isUploaded = state?.isUploaded || false;

                                    return (
                                        <motion.div
                                            key={config.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <Card className={`p-6 border-2 transition-all ${isUploaded ? "bg-white border-green-200" : "bg-white border-gray-200 hover:border-[#FFD95D]"}`}>
                                                <div className="flex flex-col md:flex-row gap-6 items-start">

                                                    {/* Icon Section */}
                                                    <div className="flex items-center gap-4 md:w-1/3">
                                                        <div className={`p-3 rounded-lg ${isUploaded ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                                            <config.icon className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-[#576238]">{config.name}</h3>
                                                            {isUploaded ? (
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                                                        <Sparkles className="h-3 w-3" /> Uploaded
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground">{new Date(state?.date!).toLocaleDateString()}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-red-500 font-medium">* Required</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Description & Actions */}
                                                    <div className="md:w-2/3 w-full">
                                                        <p className="text-xs text-muted-foreground mb-4">{config.desc}</p>

                                                        <div className="flex flex-wrap gap-2">
                                                            {/* Hidden File Input for this specific card */}
                                                            <input
                                                                type="file"
                                                                ref={(el) => { fileInputRefs.current[config.id] = el; }}
                                                                className="hidden"
                                                                accept={config.accept}
                                                                onChange={(e) => handleFileChange(e, config)}
                                                            />

                                                            {isUploaded ? (
                                                                // STATE B: Uploaded -> Show Actions
                                                                <>
                                                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleView(state?.path)}>
                                                                        <Eye className="h-3 w-3 mr-1" /> View
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleEvaluate(state?.dbId)}>
                                                                        <Star className="h-3 w-3 mr-1" /> Evaluate
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleRecommend(state?.dbId)}>
                                                                        <Edit3 className="h-3 w-3 mr-1" /> Recommend
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(state?.dbId)}>
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                    {/* Allow Re-upload */}
                                                                    <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={() => triggerUpload(config.id)}>
                                                                        <Upload className="h-3 w-3 mr-1" /> Update
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                // STATE A: Not Uploaded -> Upload or Generate
                                                                <>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => triggerUpload(config.id)}
                                                                        disabled={uploadingId === config.id}
                                                                    >
                                                                        {uploadingId === config.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                                                                        Upload
                                                                    </Button>
                                                                    <Button
                                                                        className="bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                                                        size="sm"
                                                                        onClick={() => handleGenerate(config.aiPrompt)}
                                                                    >
                                                                        <Sparkles className="h-3 w-3 mr-1" /> Generate
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

                        {/* Bottom Generation Templates */}
                        <div>
                            <h2 className="text-xl font-bold text-[#576238] mb-4 mt-8">Generation Templates</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {REQUIRED_DOCS.map((doc) => (
                                    <Card
                                        key={doc.id}
                                        className="p-4 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-[#FFD95D] text-center bg-white"
                                        onClick={() => handleGenerate(doc.aiPrompt)}
                                    >
                                        <div className="flex justify-center mb-2 text-[#576238]">
                                            <doc.icon className="h-6 w-6" />
                                        </div>
                                        <h4 className="font-semibold text-[#576238] text-xs">
                                            Generate {doc.name}
                                        </h4>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Chat */}
                    <div className="lg:col-span-1">
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="sticky top-8">
                            <Card className="border-2 flex flex-col h-[600px]">
                                <div className="p-6 border-b bg-[#576238] text-white">
                                    <h2 className="text-xl font-bold">AI Assistant</h2>
                                    <p className="text-sm text-white/80">Get help generating documents</p>
                                </div>
                                <ScrollArea className="flex-1 p-4">
                                    {messages.map((m, i) => (
                                        <div key={i} className={`mb-3 p-3 text-sm rounded-lg ${m.role === 'user' ? 'bg-[#576238] text-white ml-auto' : 'bg-gray-100'} max-w-[85%]`}>
                                            {m.content}
                                        </div>
                                    ))}
                                </ScrollArea>
                                <div className="p-4 border-t flex gap-2">
                                    <Input
                                        placeholder="Ask AI..."
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <Button onClick={() => handleSendMessage()} className="bg-[#576238]"><Send className="h-4 w-4" /></Button>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </div>

                {/* Complete Stage Button */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 text-center">
                    <Button
                        size="lg"
                        className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold"
                        onClick={handleCompleteStage}
                        disabled={isCompleting}
                    >
                        {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Complete Documents Stage"}
                    </Button>
                </motion.div>
            </main>

            {/* Manage Access Dialog Stub */}
            <Dialog open={manageAccessDialog} onOpenChange={setManageAccessDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Access</DialogTitle>
                        <DialogDescription>Share this document with team members.</DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <Input placeholder="email@example.com" value={accessEmail} onChange={e => setAccessEmail(e.target.value)} />
                        <Button onClick={() => setAccessEmail("")}>Invite</Button>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setManageAccessDialog(false)}>Close</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}