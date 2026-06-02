"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft, Edit3, Save, Send, MessageSquare, Plus, History, Trash2, CheckSquare, Square, X
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
    ideaCheckService,
    SessionSummary,
    ChatMessage,
    WorkflowUpdatePayload
} from "@/services/ideaCheckService";
import { startupService } from "@/services/startupService";
import LegoSpinner from "@/components/lego/LegoSpinner";

export default function IdeaCheckPage() {
    const params = useParams();
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- General Data ---
    const [startupName, setStartupName] = useState("Loading...");
    const [idea, setIdea] = useState("");
    const [userRole, setUserRole] = useState<string>("Viewer");
    const [startupData, setStartupData] = useState<object>({});

    // --- Status Flags ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isMarkingComplete, setIsMarkingComplete] = useState(false);
    const [isStageCompleted, setIsStageCompleted] = useState(false);

    // --- Chat & Sessions ---
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    // --- Delete Mode ---
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
    const [isDeletingSessions, setIsDeletingSessions] = useState(false);

    // --- Helper ---
    const getCleanId = () => {
        const rawParam = params?.d || params?.id;
        if (!rawParam) return null;
        const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        return decodeURIComponent(rawId).replace(/\s/g, '');
    };
    const cleanId = getCleanId();

    // Auto-scroll to bottom whenever messages change
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isSendingMessage]);

    // ---------------------------------------------------------
    // 1. INITIAL FETCH
    // ---------------------------------------------------------
    useEffect(() => {
        const initPage = async () => {
            if (!cleanId) return;
            try {
                const sd = await startupService.getById(cleanId);
                if (sd) {
                    setStartupName(sd.startupname);
                    setIdea(sd.idea_description);
                    setUserRole(sd.current_role || "Viewer");

                    // Build the proper nested startup_data shape for the AI API
                    setStartupData({
                        meta_data: {
                            form_type: "Pre-Seed & Seed Evaluation",
                            last_updated: new Date().toISOString().split('T')[0]
                        },
                        company_snapshot: {
                            company_name: sd.startupname || "",
                            current_stage: sd.startup_stage || "",
                            hq_location: sd.region || "",
                            amount_raised_to_date: "USD 0",
                            current_round: { target_amount: "", target_close_date: "" }
                        },
                        problem_definition: {
                            problem_statement: sd.idea_description || "",
                            customer_profile: { role: "", company_size: "", industry: sd.field || "" }
                        },
                        product_and_solution: {},
                        market_and_scope: {},
                        traction_metrics: { user_count: 0, active_users_monthly: 0 },
                        gtm_strategy: {},
                        business_model: {
                            pricing_model: "", average_price_per_customer: 0,
                            gross_margin: 0, monthly_burn: 0, runway_months: 0
                        },
                        vision_and_strategy: {},
                        founder_and_team: {
                            founders: [],
                            execution: { full_time_start_date: "", key_shipments: [] }
                        }
                    });
                }

                const wfData = await ideaCheckService.getWorkflowStatus(cleanId);
                setIsStageCompleted(wfData.ideaCheck);

                const sessionList = await ideaCheckService.getSessions(cleanId);
                setSessions(sessionList);

                if (sessionList.length > 0) {
                    await loadSessionMessages(sessionList[0].sessionId);
                } else if (!wfData.ideaCheck) {
                    await handleNewSession(cleanId);
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
    // 2. CHAT LOGIC
    // ---------------------------------------------------------
    const loadSessionMessages = async (sessionId: string) => {
        setIsChatLoading(true);
        setCurrentSessionId(sessionId);
        try {
            const msgs = await ideaCheckService.getMessages(sessionId);
            setMessages(msgs);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleNewSession = async (startupId: string) => {
        try {
            const newSession = await ideaCheckService.startNewSession(startupId);
            if (newSession) {
                setSessions(prev => [newSession, ...prev]);
                setCurrentSessionId(newSession.sessionId);
                setMessages([]);
            }
        } catch (err) {
            console.error("Error creating session:", err);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentSessionId || isStageCompleted || !cleanId || isSendingMessage) return;

        const msgContent = newMessage.trim();
        setNewMessage("");

        // Optimistic UI — show user message immediately
        const userMsg: ChatMessage = { role: "user", content: msgContent };
        setMessages(prev => [...prev, userMsg]);
        setIsSendingMessage(true);

        try {
            const assistantReply = await ideaCheckService.sendMessage(
                currentSessionId,
                msgContent,
                messages,
                cleanId,
                startupData
            );

            if (assistantReply) {
                setMessages(prev => [...prev, { role: "assistant", content: assistantReply }]);
            }
        } catch (err: any) {
            console.error("Send error:", err);
            const isRateLimited = err?.message === "RATE_LIMITED";
            setMessages(prev => [...prev, {
                role: "assistant",
                content: isRateLimited
                    ? "You're sending messages a bit too fast — please wait a moment before trying again."
                    : "Sorry, something went wrong. Please try again."
            }]);
        } finally {
            setIsSendingMessage(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // ---------------------------------------------------------
    // 3. DELETE LOGIC
    // ---------------------------------------------------------
    const toggleDeleteMode = () => {
        setIsDeleteMode(prev => !prev);
        setSelectedSessionIds(new Set());
    };

    const toggleSelectSession = (sessionId: string) => {
        setSelectedSessionIds(prev => {
            const next = new Set(prev);
            if (next.has(sessionId)) next.delete(sessionId);
            else next.add(sessionId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedSessionIds.size === sessions.length) {
            setSelectedSessionIds(new Set());
        } else {
            setSelectedSessionIds(new Set(sessions.map(s => s.sessionId)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedSessionIds.size === 0) return;
        setIsDeletingSessions(true);

        try {
            // Delete each selected session
            await Promise.all(
                Array.from(selectedSessionIds).map(id =>
                    ideaCheckService.deleteSession(id)
                )
            );

            // Remove from local state
            const remaining = sessions.filter(s => !selectedSessionIds.has(s.sessionId));
            setSessions(remaining);

            // If current session was deleted, switch to first remaining or create new
            if (currentSessionId && selectedSessionIds.has(currentSessionId)) {
                if (remaining.length > 0) {
                    await loadSessionMessages(remaining[0].sessionId);
                } else if (cleanId && !isStageCompleted) {
                    await handleNewSession(cleanId);
                } else {
                    setCurrentSessionId(null);
                    setMessages([]);
                }
            }

            setSelectedSessionIds(new Set());
            setIsDeleteMode(false);
        } catch (err) {
            console.error("Error deleting sessions:", err);
        } finally {
            setIsDeletingSessions(false);
        }
    };

    // ---------------------------------------------------------
    // 4. IDEA & WORKFLOW LOGIC
    // ---------------------------------------------------------
    const handleToggleEdit = async () => {
        if (isEditing) {
            if (!cleanId) return;
            setIsSaving(true);
            try {
                const updateSuccess = await ideaCheckService.updateIdea(cleanId, idea);
                if (updateSuccess) {
                    setIsEditing(false);
                    const resetSuccess = await ideaCheckService.resetWorkflow(cleanId);
                    if (resetSuccess) {
                        setIsStageCompleted(false);
                        await handleNewSession(cleanId);
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
            // IMPORTANT: Do NOT rewrite startups.json_response here.
            // That column holds the founder's submitted form — the raw_input that
            // every document generator (evaluation, market research, recommendation,
            // BMC, SWOT, pitch deck) reads. The previous Step 1/2 rebuilt a stripped
            // skeleton from the scalar startup columns (ignoring the rich
            // json_response) and PUT it via update-json, wiping differentiation,
            // vision, founders, target raise, etc. Idea Check only needs to mark the
            // stage complete; the founder's form must stay intact.

            // STEP 3: Get current workflow flags (to preserve other stages)
            console.log("🔄 Step 3: Fetching current workflow state...");
            const currentData = await ideaCheckService.getWorkflowStatus(cleanId);

            // STEP 4: Mark IdeaCheck as complete in workflow
            console.log("🔄 Step 4: Marking IdeaCheck complete in workflow...");
            const updatePayload: WorkflowUpdatePayload = {
                StartupId: cleanId,
                IdeaCheck: true,
                MarketResearch: currentData.marketResearch,
                Evaluation: currentData.evaluation,
                Recommendation: currentData.recommendation,
                Documents: currentData.documents,
                PitchDeck: currentData.pitchDeck
            };

            const success = await ideaCheckService.updateWorkflow(updatePayload);

            if (success) {
                console.log("🎉 All steps complete — redirecting to dashboard");
                router.push(`/founder/startup/${cleanId}`);
            } else {
                alert("Workflow update failed. Please try again.");
            }

        } catch (error) {
            console.error("❌ Error in handleMarkComplete:", error);
        } finally {
            setIsMarkingComplete(false);
        }
    };

    // ---------------------------------------------------------
    // 5. RENDER
    // ---------------------------------------------------------
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 flex flex-col">

            {/* 👇 FIX: 100% full width (w-full) Navbar! */}
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
                {/* 👇 Restored py-4 padding to make it thicker, but kept w-full for edge-to-edge! */}
                <div className="flex w-full items-center justify-between px-6 md:px-12 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${cleanId}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]">
                                {/* 👇 Restored larger h-5 w-5 back button */}
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex flex-col justify-center">
                            {/* 👇 Restored text-xl and text-[#576238] colors */}
                            <h1 className="text-xl font-bold text-[#576238] leading-tight flex items-center gap-2">
                                Idea Check
                            </h1>
                            {/* 👇 Restored text-sm without the uppercase/tracking */}
                            <p className="text-sm text-muted-foreground">
                                {startupName} • {userRole} View
                            </p>
                        </div>
                    </div>
                    {isStageCompleted && (
                        <div className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200">
                            ✓ Verified & Completed
                        </div>
                    )}
                </div>
            </div>

            <main className="flex-1 container mx-auto px-4 py-8 flex gap-6 overflow-hidden">

                {/* ── LEFT SIDEBAR ── */}
                <div className="w-64 flex-shrink-0 flex flex-col gap-0" style={{ height: 'calc(100vh - 130px)' }}>
                    <Card className="flex-1 border-2 flex flex-col bg-white/50 backdrop-blur-sm overflow-hidden">

                        {/* New Chat + Delete toggle */}
                        <div className="p-3 border-b flex gap-2">
                            <Button
                                className="flex-1 bg-[#576238] hover:bg-[#464f2d] text-sm h-9"
                                onClick={() => cleanId && handleNewSession(cleanId)}
                                disabled={isStageCompleted || userRole !== 'Founder' || isDeleteMode}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                New Chat
                            </Button>
                            <Button
                                variant={isDeleteMode ? "destructive" : "outline"}
                                size="icon"
                                className="h-9 w-9 flex-shrink-0"
                                onClick={toggleDeleteMode}
                                title={isDeleteMode ? "Cancel" : "Delete sessions"}
                            >
                                {isDeleteMode ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </div>

                        {/* Delete mode actions */}
                        <AnimatePresence>
                            {isDeleteMode && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-b overflow-hidden"
                                >
                                    <div className="p-2 flex gap-2 items-center bg-red-50">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs h-7 px-2 flex-1 text-gray-600"
                                            onClick={toggleSelectAll}
                                        >
                                            {selectedSessionIds.size === sessions.length ? (
                                                <><CheckSquare className="h-3 w-3 mr-1" /> Deselect All</>
                                            ) : (
                                                <><Square className="h-3 w-3 mr-1" /> Select All</>
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-7 px-2 text-xs bg-red-500 hover:bg-red-600 text-white"
                                            onClick={handleDeleteSelected}
                                            disabled={selectedSessionIds.size === 0 || isDeletingSessions}
                                        >
                                            {isDeletingSessions
                                                ? <LegoSpinner className="h-3 w-3 animate-spin" />
                                                : `Delete (${selectedSessionIds.size})`
                                            }
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Session list */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1
                            [&::-webkit-scrollbar]:w-1.5
                            [&::-webkit-scrollbar-track]:bg-transparent
                            [&::-webkit-scrollbar-thumb]:bg-gray-300
                            [&::-webkit-scrollbar-thumb]:rounded-full">
                            {sessions.length === 0 && (
                                <p className="text-xs text-center text-muted-foreground mt-6">No sessions yet</p>
                            )}
                            {sessions.map((sess) => {
                                const isActive = currentSessionId === sess.sessionId;
                                const isSelected = selectedSessionIds.has(sess.sessionId);
                                return (
                                    <button
                                        key={sess.sessionId}
                                        onClick={() => {
                                            if (isDeleteMode) {
                                                toggleSelectSession(sess.sessionId);
                                            } else {
                                                loadSessionMessages(sess.sessionId);
                                            }
                                        }}
                                        className={`w-full text-left p-2.5 rounded-lg text-sm transition-all flex items-center gap-2
                                            ${isActive && !isDeleteMode
                                                ? "bg-[#FFD95D]/30 border border-[#FFD95D] font-medium text-[#576238]"
                                                : isSelected
                                                    ? "bg-red-100 border border-red-300 text-red-700"
                                                    : "hover:bg-gray-100 text-gray-600 border border-transparent"
                                            }`}
                                    >
                                        {isDeleteMode ? (
                                            isSelected
                                                ? <CheckSquare className="h-4 w-4 text-red-500 flex-shrink-0" />
                                                : <Square className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        ) : (
                                            <MessageSquare className="h-4 w-4 opacity-60 flex-shrink-0" />
                                        )}
                                        <div className="truncate flex-1 min-w-0">
                                            <div className="truncate text-xs font-medium">{sess.sessionName}</div>
                                            <div className="text-[10px] text-gray-400">
                                                {new Date(sess.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-2 border-t text-center text-xs text-muted-foreground">
                            <History className="h-3 w-3 inline mr-1" /> History
                        </div>
                    </Card>
                </div>

                {/* ── MAIN CONTENT ── */}
                <div className="flex-1 min-w-0 flex flex-col gap-4" style={{ height: 'calc(100vh - 130px)' }}>

                    {/* Idea Card — fixed height */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-shrink-0">
                        <Card className="p-5 border-2">
                            <div className="flex justify-between items-start mb-3">
                                <h2 className="text-lg font-bold text-[#576238]">Your Startup Idea</h2>
                                <Button
                                    variant={isEditing ? "default" : "outline"}
                                    size="sm"
                                    onClick={handleToggleEdit}
                                    disabled={isSaving || userRole !== 'Founder'}
                                    className={isEditing ? "bg-[#576238] hover:bg-[#464f2d] text-white" : ""}
                                >
                                    {isSaving ? (
                                        <><LegoSpinner className="h-3 w-3 mr-1 animate-spin" /> Saving...</>
                                    ) : isEditing ? (
                                        <><Save className="h-3 w-3 mr-1" /> Save & Reset</>
                                    ) : (
                                        <><Edit3 className="h-3 w-3 mr-1" /> Edit Idea</>
                                    )}
                                </Button>
                            </div>
                            {isLoading ? (
                                <div className="space-y-2">
                                    <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                                </div>
                            ) : isEditing ? (
                                <textarea
                                    className="w-full p-3 border rounded-lg min-h-[80px] max-h-[120px] focus:ring-2 focus:ring-[#576238] focus:border-transparent outline-none text-sm resize-none"
                                    value={idea}
                                    onChange={(e) => setIdea(e.target.value)}
                                    placeholder="Describe your startup idea..."
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground leading-relaxed">{idea}</p>
                            )}
                        </Card>
                    </motion.div>

                    {/* Chat Card — takes remaining space */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex-1 min-h-0 flex flex-col"
                    >
                        <Card className="flex-1 min-h-0 border-2 flex flex-col overflow-hidden">

                            {/* Chat header */}
                            <div className="flex-shrink-0 px-5 py-3 bg-[#576238] text-white flex justify-between items-center">
                                <div>
                                    <h2 className="font-bold text-sm">AI Advisor Chat</h2>
                                    <p className="text-xs text-white/70">Validation & Feedback</p>
                                </div>
                                <div className="text-xs px-2.5 py-1 bg-white/20 rounded-full">
                                    {sessions.find(s => s.sessionId === currentSessionId)?.sessionName || "Session"}
                                </div>
                            </div>

                            {/* Messages area — scrollable */}
                            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4
                                [&::-webkit-scrollbar]:w-1.5
                                [&::-webkit-scrollbar-track]:bg-transparent
                                [&::-webkit-scrollbar-thumb]:bg-gray-200
                                [&::-webkit-scrollbar-thumb]:rounded-full">

                                {isChatLoading ? (
                                    <div className="flex justify-center items-center h-full">
                                        <LegoSpinner className="h-6 w-6 animate-spin text-gray-300" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                                        <div className="w-10 h-10 rounded-full bg-[#576238]/10 flex items-center justify-center">
                                            <MessageSquare className="h-5 w-5 text-[#576238]/40" />
                                        </div>
                                        <p className="text-sm text-gray-400">Start the conversation...</p>
                                        <p className="text-xs text-gray-300">Ask the AI to validate your idea</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map((message, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                            >
                                                {/* Avatar for assistant */}
                                                {message.role === "assistant" && (
                                                    <div className="w-7 h-7 rounded-full bg-[#576238] flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0">
                                                        AI
                                                    </div>
                                                )}
                                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm
                                                    ${message.role === "user"
                                                        ? "bg-[#576238] text-white rounded-tr-sm"
                                                        : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                                                    }`}
                                                >
                                                    {message.content}
                                                </div>
                                            </motion.div>
                                        ))}

                                        {/* Typing indicator */}
                                        {isSendingMessage && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex justify-start items-end gap-2"
                                            >
                                                <div className="w-7 h-7 rounded-full bg-[#576238] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                    AI
                                                </div>
                                                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Scroll anchor */}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </div>

                            {/* Input area — always pinned to bottom */}
                            <div className="flex-shrink-0 border-t bg-white px-4 py-3">
                                {isStageCompleted ? (
                                    <div className="flex items-center justify-center py-2 px-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm">
                                        🔒 Stage complete. Edit idea above to unlock.
                                    </div>
                                ) : (
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            ref={inputRef}
                                            placeholder={userRole !== 'Founder' ? "View only" : "Ask a question... (Enter to send)"}
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            disabled={!currentSessionId || userRole !== 'Founder' || isSendingMessage}
                                            className="flex-1 border-gray-200 focus:border-[#576238] focus:ring-1 focus:ring-[#576238] rounded-xl"
                                        />
                                        <Button
                                            onClick={handleSendMessage}
                                            className="bg-[#576238] hover:bg-[#464f2d] rounded-xl px-4"
                                            disabled={!currentSessionId || userRole !== 'Founder' || isSendingMessage || !newMessage.trim()}
                                        >
                                            {isSendingMessage
                                                ? <LegoSpinner className="h-4 w-4 animate-spin" />
                                                : <Send className="h-4 w-4" />
                                            }
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Bottom Action */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                        className="flex-shrink-0 text-center pb-2"
                    >
                        {!isStageCompleted ? (
                            <Button
                                size="lg"
                                className="bg-[#FFD95D] hover:bg-[#ffe07a] text-black font-semibold px-8 shadow-md"
                                onClick={handleMarkComplete}
                                disabled={isMarkingComplete || userRole !== 'Founder'}
                            >
                                {isMarkingComplete
                                    ? <><LegoSpinner className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                                    : "Mark as Complete & Continue →"
                                }
                            </Button>
                        ) : (
                            <Button size="lg" variant="outline" className="font-semibold" asChild>
                                <Link href={`/founder/startup/${cleanId}`}>Continue to Dashboard →</Link>
                            </Button>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    );
}