"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Edit3, Save, Send, Loader2, MessageSquare, Plus, History } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Types ---
interface SessionSummary {
    sessionId: string;
    sessionName: string;
    createdAt: string;
}

interface ChatMessage {
    role: string;
    content: string;
    timestamp?: string;
}

export default function IdeaCheckPage() {
    const params = useParams();
    const router = useRouter();

    // --- State: General Data ---
    const [startupName, setStartupName] = useState("Loading...");
    const [idea, setIdea] = useState("");

    // --- State: Status Flags ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isMarkingComplete, setIsMarkingComplete] = useState(false);
    const [isStageCompleted, setIsStageCompleted] = useState(false);

    // --- State: Chat & Sessions ---
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);

    // --- Helper: Robust ID Getter ---
    const getCleanId = () => {
        const rawParam = params?.d || params?.id;
        if (!rawParam) return null;
        const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        return decodeURIComponent(rawId).replace(/\s/g, '');
    };

    const cleanId = getCleanId();

    // ---------------------------------------------------------
    // 1. INITIAL FETCH
    // ---------------------------------------------------------
    useEffect(() => {
        const initPage = async () => {
            if (!cleanId) return;

            try {
                // A. Fetch Basic Startup Info
                const startupRes = await fetch(`https://localhost:7155/api/startups/${cleanId}`);
                if (startupRes.ok) {
                    const data = await startupRes.json();
                    setStartupName(data.startupname);
                    setIdea(data.idea_description);
                }

                // B. Fetch Workflow Status
                const wfRes = await fetch(`https://localhost:7155/api/StartupWorkflow/${cleanId}`);
                let isLocked = false;
                if (wfRes.ok) {
                    const wfData = await wfRes.json();
                    isLocked = wfData.ideaCheck || wfData.IdeaCheck || false;
                    setIsStageCompleted(isLocked);
                }

                // C. Fetch Chat Sessions
                const sessionRes = await fetch(`https://localhost:7155/api/Chat/sessions/${cleanId}/idea_check`);
                if (sessionRes.ok) {
                    const sessionList: SessionSummary[] = await sessionRes.json();
                    setSessions(sessionList);

                    if (sessionList.length > 0) {
                        loadSessionMessages(sessionList[0].sessionId);
                    } else if (!isLocked) {
                        await handleNewSession(cleanId);
                    }
                }

            } catch (error) {
                console.error("Initialization error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initPage();
    }, [cleanId]);

    // ---------------------------------------------------------
    // 2. Chat Logic
    // ---------------------------------------------------------
    const loadSessionMessages = async (sessionId: string) => {
        setIsChatLoading(true);
        setCurrentSessionId(sessionId);
        try {
            const res = await fetch(`https://localhost:7155/api/Chat/messages/${sessionId}`);
            if (res.ok) {
                const msgs = await res.json();
                setMessages(msgs);
            }
        } catch (err) {
            console.error("Error loading messages:", err);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleNewSession = async (startupId: string) => {
        // Prevent new session ONLY if stage is completed AND we are not currently forcing a reset
        // (This check is handled by the UI button disabled state mainly)

        try {
            const res = await fetch(`https://localhost:7155/api/Chat/start-new`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    StartupId: startupId,
                    FeatureType: 'idea_check'
                })
            });

            if (res.ok) {
                const newSess = await res.json();
                const newSummary: SessionSummary = {
                    sessionId: newSess.sessionId,
                    sessionName: newSess.sessionName,
                    createdAt: new Date().toISOString()
                };

                // Prepend new session to list
                setSessions(prev => [newSummary, ...prev]);
                // Select it
                setCurrentSessionId(newSess.sessionId);
                // Clear messages view
                setMessages([]);
            }
        } catch (err) {
            console.error("Error creating session:", err);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentSessionId || isStageCompleted) return;

        const msgContent = newMessage;
        setNewMessage("");

        setMessages(prev => [...prev, { role: "user", content: msgContent }]);

        try {
            await fetch(`https://localhost:7155/api/Chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SessionId: currentSessionId,
                    Role: "user",
                    Content: msgContent
                })
            });
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    // ---------------------------------------------------------
    // 3. Idea & Workflow Logic (UPDATED: Force New Session)
    // ---------------------------------------------------------
    const handleToggleEdit = async () => {
        if (isEditing) {
            setIsSaving(true);
            try {
                // 1. Update the Idea Text
                const response = await fetch(`https://localhost:7155/api/startups/update-idea/${cleanId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ideaDescription: idea }),
                });

                if (response.ok) {
                    setIsEditing(false);

                    // 2. CALL THE RESET ENDPOINT (This archives documents & resets workflow)
                    const resetResponse = await fetch(`https://localhost:7155/api/StartupWorkflow/reset/${cleanId}`, {
                        method: 'POST',
                    });

                    if (resetResponse.ok) {
                        setIsStageCompleted(false);
                        // Optional: Start new chat context
                        if (cleanId) await handleNewSession(cleanId);
                    }
                } else {
                    alert("Failed to save changes.");
                }
            } catch (error) {
                console.error("Error updating idea:", error);
            } finally {
                setIsSaving(false);
            }
        } else {
            setIsEditing(true);
        }
    };

    const handleMarkComplete = async () => {
        setIsMarkingComplete(true);
        if (!cleanId) return;

        try {
            const getRes = await fetch(`https://localhost:7155/api/StartupWorkflow/${cleanId}`);
            let currentData = { marketResearch: false, evaluation: false, recommendation: false, documents: false, pitchDeck: false };
            if (getRes.ok) currentData = await getRes.json();

            const updatePayload = {
                StartupId: cleanId,
                IdeaCheck: true,
                MarketResearch: currentData.marketResearch,
                Evaluation: currentData.evaluation,
                Recommendation: currentData.recommendation,
                Documents: currentData.documents,
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
            console.error("Error marking complete:", error);
        } finally {
            setIsMarkingComplete(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 flex flex-col">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">

                        <Link href={`/founder/startup/${cleanId}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>

                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">💡 Idea Check</h1>
                            <p className="text-sm text-muted-foreground">{startupName}</p>
                        </div>
                    </div>
                    {isStageCompleted && (
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200">
                            ✓ Verified & Completed
                        </div>
                    )}
                </div>
            </div>

            <main className="flex-1 container mx-auto px-4 py-8 flex gap-6">

                {/* LEFT SIDEBAR: Session History */}
                <Card className="w-64 flex-shrink-0 h-[calc(100vh-150px)] border-2 flex flex-col bg-white/50 backdrop-blur-sm">
                    <div className="p-4 border-b">
                        <Button
                            className="w-full bg-[#576238] hover:bg-[#464f2d]"
                            onClick={() => cleanId && handleNewSession(cleanId)}
                            disabled={isStageCompleted}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Chat
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 p-3">
                        <div className="space-y-2">
                            {sessions.length === 0 && (
                                <p className="text-xs text-center text-muted-foreground mt-4">No history yet</p>
                            )}
                            {sessions.map((sess) => (
                                <button
                                    key={sess.sessionId}
                                    onClick={() => loadSessionMessages(sess.sessionId)}
                                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors flex items-center gap-2
                                        ${currentSessionId === sess.sessionId
                                            ? "bg-[#FFD95D]/30 border border-[#FFD95D] font-medium text-[#576238]"
                                            : "hover:bg-gray-100 text-gray-600"
                                        }`}
                                >
                                    <MessageSquare className="h-4 w-4 opacity-70" />
                                    <div className="truncate">
                                        <div>{sess.sessionName}</div>
                                        <div className="text-[10px] text-gray-400">
                                            {new Date(sess.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                    <div className="p-3 border-t text-center text-xs text-muted-foreground">
                        <History className="h-3 w-3 inline mr-1" /> History
                    </div>
                </Card>

                {/* MAIN CONTENT AREA */}
                <div className="flex-1 max-w-4xl space-y-6">

                    {/* 1. Idea Description Card */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="p-6 border-2 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold text-[#576238]">Your Startup Idea</h2>

                                <Button
                                    variant={isEditing ? "default" : "outline"}
                                    size="sm"
                                    onClick={handleToggleEdit}
                                    disabled={isSaving}
                                    className={isEditing ? "bg-[#576238] hover:bg-[#464f2d] text-white" : ""}
                                >
                                    {isSaving ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                                    ) : isEditing ? (
                                        <><Save className="h-4 w-4 mr-2" /> Save & Reset Workflow</>
                                    ) : (
                                        <><Edit3 className="h-4 w-4 mr-2" /> Edit Idea</>
                                    )}
                                </Button>
                            </div>

                            {isLoading ? (
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                                </div>
                            ) : isEditing ? (
                                <textarea
                                    className="w-full p-3 border rounded-lg min-h-[100px] focus:ring-2 focus:ring-[#576238] focus:border-transparent outline-none"
                                    value={idea}
                                    onChange={(e) => setIdea(e.target.value)}
                                    placeholder="Describe your startup idea..."
                                />
                            ) : (
                                <p className="text-muted-foreground whitespace-pre-wrap">{idea}</p>
                            )}
                        </Card>
                    </motion.div>

                    {/* 2. Chat Interface */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="border-2 h-[500px] flex flex-col">
                            <div className="p-4 border-b bg-[#576238] text-white flex justify-between items-center">
                                <div>
                                    <h2 className="font-bold">AI Advisor Chat</h2>
                                    <p className="text-xs text-white/80">Validation & Feedback</p>
                                </div>
                                <div className="text-xs px-2 py-1 bg-white/20 rounded">
                                    {sessions.find(s => s.sessionId === currentSessionId)?.sessionName || "Session"}
                                </div>
                            </div>

                            <ScrollArea className="flex-1 p-6">
                                {isChatLoading ? (
                                    <div className="flex justify-center items-center h-full">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-gray-400 mt-10">
                                        <p>Start the conversation...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map((message, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                            >
                                                <div className={`max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-line shadow-sm
                                                    ${message.role === "user" ? "bg-[#576238] text-white" : "bg-white border-2"}`}
                                                >
                                                    {message.content}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>

                            <div className="p-4 border-t bg-gray-50/50">
                                {isStageCompleted ? (
                                    <div className="flex items-center justify-center p-3 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md text-sm">
                                        🔒 Stage Complete. Edit the idea above to unlock chat.
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Ask a question..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                                            disabled={!currentSessionId}
                                        />
                                        <Button
                                            onClick={handleSendMessage}
                                            className="bg-[#576238] hover:bg-[#6b7c3f]"
                                            disabled={!currentSessionId}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* 3. Bottom Action Button */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                        className="text-center"
                    >
                        {!isStageCompleted ? (
                            <Button
                                size="lg"
                                className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold"
                                onClick={handleMarkComplete}
                                disabled={isMarkingComplete}
                            >
                                {isMarkingComplete ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Mark as Complete & Continue"}
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                variant="outline"
                                className="font-semibold"
                                asChild
                            >
                                {/* FIX: Use cleanId here as well */}
                                <Link href={`/founder/startup/${cleanId}`}>
                                    Continue to Dashboard
                                </Link>
                            </Button>
                        )}
                    </motion.div>

                </div>
            </main>
        </div>
    );
}