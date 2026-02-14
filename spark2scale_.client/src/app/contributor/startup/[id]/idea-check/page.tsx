"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, MessageSquare, History } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ideaCheckService,
    SessionSummary,
    ChatMessage
} from "@/services/ideaCheckService";

export default function ContributorIdeaCheckPage() {
    const params = useParams();

    // --- State: General Data ---
    const [startupName, setStartupName] = useState("Loading...");
    const [idea, setIdea] = useState("");

    // --- State: Status Flags ---
    const [isLoading, setIsLoading] = useState(true);
    const [isStageCompleted, setIsStageCompleted] = useState(false);

    // --- State: Chat & Sessions ---
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);

    // --- Helper: Robust ID Getter ---
    const getCleanId = () => {
        // Handle both [id] (contributor route) and [d] (founder route copy) just in case
        const rawParam = params?.id || params?.d;
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
                const startupData = await ideaCheckService.getStartupDetails(cleanId);
                if (startupData) {
                    setStartupName(startupData.startupname);
                    setIdea(startupData.idea_description);
                }

                // B. Fetch Workflow Status
                const wfData = await ideaCheckService.getWorkflowStatus(cleanId);
                const isLocked = wfData.ideaCheck;
                setIsStageCompleted(isLocked);

                // C. Fetch Chat Sessions
                const sessionList = await ideaCheckService.getSessions(cleanId);
                setSessions(sessionList);

                if (sessionList.length > 0) {
                    loadSessionMessages(sessionList[0].sessionId);
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
    // 2. Chat Logic (View Only)
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

    // ---------------------------------------------------------
    // 3. Render
    // ---------------------------------------------------------
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 flex flex-col">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">

                        <Link href={`/contributor/startup/${cleanId}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>

                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">💡 Idea Check (Read-Only)</h1>
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
                        <p className="text-sm font-semibold text-[#576238]">AI Sessions</p>
                    </div>

                    <div className="flex-1 p-3 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
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
                                    <MessageSquare className="h-4 w-4 opacity-70 flex-shrink-0" />
                                    <div className="truncate flex-1">
                                        <div className="truncate">{sess.sessionName}</div>
                                        <div className="text-[10px] text-gray-400">
                                            {new Date(sess.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

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
                                <h2 className="text-xl font-bold text-[#576238]">Startup Idea</h2>
                                {/* No Edit Button for Contributor */}
                            </div>

                            {isLoading ? (
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground whitespace-pre-wrap">{idea}</p>
                            )}
                        </Card>
                    </motion.div>

                    {/* 2. Chat Interface (Read Only) */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="border-2 h-[500px] flex flex-col">
                            <div className="p-4 border-b bg-[#576238] text-white flex justify-between items-center">
                                <div>
                                    <h2 className="font-bold">AI Advisor Chat</h2>
                                    <p className="text-xs text-white/80">Validation & Feedback (View Only)</p>
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
                                        <p>Select a session to view conversation history.</p>
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

                            <div className="p-4 border-t bg-gray-50/50 text-center text-muted-foreground text-sm">
                                Read-only mode. You cannot send messages or start new sessions.
                            </div>
                        </Card>
                    </motion.div>

                </div>
            </main>
        </div>
    );
}
