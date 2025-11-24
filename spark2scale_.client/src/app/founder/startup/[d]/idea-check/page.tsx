"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Edit3, Send } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function IdeaCheckPage() {
    const params = useParams();
    const [idea, setIdea] = useState(
        "A sustainable tech platform that helps businesses reduce their carbon footprint through AI-powered analytics and recommendations."
    );
    const [isEditing, setIsEditing] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "Hello! I'm your AI startup advisor. Let's review and validate your idea. What's your startup concept?",
        },
        {
            role: "user",
            content: idea,
        },
        {
            role: "assistant",
            content:
                "Great concept! This addresses the growing demand for sustainability solutions. Let me analyze a few key aspects:\n\n✅ Market Need: High - Carbon reduction is a priority for businesses\n✅ Scalability: Strong - AI-powered solutions can scale globally\n⚠️ Competition: Moderate - Several players in the space\n\nWould you like me to dive deeper into any specific area?",
        },
    ]);
    const [newMessage, setNewMessage] = useState("");

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;

        setMessages([
            ...messages,
            {
                role: "user",
                content: newMessage,
            },
            {
                role: "assistant",
                content:
                    "That's an interesting point! Let me provide some insights on that aspect...",
            },
        ]);
        setNewMessage("");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${params.id}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">
                                💡 Idea Check
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Stage 1 of 6 - Validate your concept
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Idea Display/Edit */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="p-6 mb-6 border-2">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold text-[#576238]">
                                    Your Startup Idea
                                </h2>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(!isEditing)}
                                >
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    {isEditing ? "Save" : "Edit"}
                                </Button>
                            </div>
                            {isEditing ? (
                                <textarea
                                    className="w-full p-3 border rounded-lg min-h-[100px]"
                                    value={idea}
                                    onChange={(e) => setIdea(e.target.value)}
                                />
                            ) : (
                                <p className="text-muted-foreground">{idea}</p>
                            )}
                        </Card>
                    </motion.div>

                    {/* AI Chat Interface */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="border-2">
                            <div className="p-6 border-b bg-[#576238] text-white">
                                <h2 className="text-xl font-bold">AI Advisor Chat</h2>
                                <p className="text-sm text-white/80">
                                    Get real-time feedback and validation
                                </p>
                            </div>

                            <ScrollArea className="h-[400px] p-6">
                                <div className="space-y-4">
                                    {messages.map((message, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                                                }`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-lg p-4 ${message.role === "user"
                                                        ? "bg-[#576238] text-white"
                                                        : "bg-white border-2"
                                                    }`}
                                            >
                                                <p className="text-sm whitespace-pre-line">
                                                    {message.content}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </ScrollArea>

                            <div className="p-4 border-t">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ask a question or request feedback..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        className="bg-[#576238] hover:bg-[#6b7c3f]"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-6 text-center"
                    >
                        <Button
                            size="lg"
                            className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold"
                            asChild
                        >
                            <Link href={`/founder/startup/${params.id}`}>
                                Mark as Complete & Continue
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
