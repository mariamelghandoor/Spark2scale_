"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Edit3, Save, Send, Loader2 } from "lucide-react"; // Added Loader2 and Save icon
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";

export default function IdeaCheckPage() {
    const params = useParams();

    // 1. State for Data
    const [startupName, setStartupName] = useState("Loading...");
    const [idea, setIdea] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false); // State for saving process

    const [isEditing, setIsEditing] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "Hello! I'm your AI startup advisor. Let's review and validate your idea. What's your startup concept?",
        },
    ]);
    const [newMessage, setNewMessage] = useState("");

    // 2. Fetch Data
    useEffect(() => {
        const fetchStartupInfo = async () => {
            if (!params || !params.d) return;

            const rawId = Array.isArray(params.d) ? params.d[0] : params.d;
            const cleanId = decodeURIComponent(rawId).replace(/\s/g, '');

            try {
                // Ensure this port matches your running backend
                const response = await fetch(`https://localhost:7155/api/startups/${cleanId}`);

                if (response.ok) {
                    const data = await response.json();
                    setStartupName(data.startupname);
                    setIdea(data.idea_description);

                    setMessages(prev => [
                        ...prev,
                        { role: "user", content: data.idea_description },
                        {
                            role: "assistant",
                            content: "Great concept! This addresses the growing demand for sustainability solutions. Let me analyze a few key aspects:\n\n✅ Market Need: High\n✅ Scalability: Strong\n⚠️ Competition: Moderate\n\nWould you like me to dive deeper into any specific area?"
                        }
                    ]);
                } else {
                    console.error("Failed to fetch startup info");
                    setStartupName("Error loading name");
                }
            } catch (error) {
                console.error("Connection error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStartupInfo();
    }, [params]);

    // 3. Handle Save Logic
    const handleToggleEdit = async () => {
        // If we are currently editing, the user clicked "Save"
        if (isEditing) {
            setIsSaving(true);

            if (!params || !params.d) return;
            const rawId = Array.isArray(params.d) ? params.d[0] : params.d;
            const cleanId = decodeURIComponent(rawId).replace(/\s/g, '');

            try {
                // --- STEP 1: Update the Idea Description ---
                const response = await fetch(`https://localhost:7155/api/startups/update-idea/${cleanId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ideaDescription: idea }),
                });

                if (response.ok) {

                    // --- STEP 2: Reset Startup Workflow (New Code) ---
                    try {
                        // We define the DTO object exactly as the C# controller expects it
                        const workflowResetData = {
                            StartupId: cleanId, // Needs to be a string GUID
                            IdeaCheck: false,   // Setting all to false as requested
                            MarketResearch: false,
                            Evaluation: false,
                            Recommendation: false,
                            Documents: false,
                            PitchDeck: false
                        };

                        const workflowResponse = await fetch(`https://localhost:7155/api/StartupWorkflow/update`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(workflowResetData),
                        });

                        if (!workflowResponse.ok) {
                            console.warn("Idea saved, but failed to reset workflow status.");
                        } else {
                            console.log("Workflow status reset to false.");
                        }

                    } catch (workflowError) {
                        console.error("Error resetting workflow:", workflowError);
                    }
                    // --------------------------------------------------

                    setIsEditing(false); // Exit edit mode
                    console.log("Idea updated successfully");
                } else {
                    alert("Failed to save changes. Please try again.");
                }
            } catch (error) {
                console.error("Error updating idea:", error);
                alert("Connection error while saving.");
            } finally {
                setIsSaving(false);
            }
        } else {
            // If we are NOT editing, the user clicked "Edit"
            setIsEditing(true);
        }
    };

    const router = useRouter(); // Initialize router
    const [isMarkingComplete, setIsMarkingComplete] = useState(false);

    const handleMarkComplete = async () => {
        setIsMarkingComplete(true);
        if (!params || !params.d) return;

        const rawId = Array.isArray(params.d) ? params.d[0] : params.d;
        const cleanId = decodeURIComponent(rawId).replace(/\s/g, '');

        try {
            // STEP 1: Fetch current status first (so we don't lose progress on other steps)
            const getResponse = await fetch(`https://localhost:7155/api/StartupWorkflow/${cleanId}`);
            let currentData = {
                marketResearch: false,
                evaluation: false,
                recommendation: false,
                documents: false,
                pitchDeck: false
            };

            if (getResponse.ok) {
                currentData = await getResponse.json();
            }

            // STEP 2: Prepare the update with IdeaCheck = true
            // We preserve the other values found in currentData
            const updatePayload = {
                StartupId: cleanId,
                IdeaCheck: true, // <--- THIS IS THE KEY CHANGE
                MarketResearch: currentData.marketResearch,
                Evaluation: currentData.evaluation,
                Recommendation: currentData.recommendation,
                Documents: currentData.documents,
                PitchDeck: currentData.pitchDeck
            };

            // STEP 3: Send the update
            const updateResponse = await fetch(`https://localhost:7155/api/StartupWorkflow/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (updateResponse.ok) {
                // STEP 4: Navigate after success
                router.push(`/founder/startup/${params.d}`);
            } else {
                console.error("Failed to update workflow");
                alert("Could not mark as complete. Please try again.");
            }

        } catch (error) {
            console.error("Error marking complete:", error);
        } finally {
            setIsMarkingComplete(false);
        }
    };

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;

        setMessages([
            ...messages,
            { role: "user", content: newMessage },
            { role: "assistant", content: "That's an interesting point! Let me provide some insights on that aspect..." },
        ]);
        setNewMessage("");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${params.d}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">
                                💡 Idea Check
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {startupName}
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
                                    variant={isEditing ? "default" : "outline"}
                                    size="sm"
                                    onClick={handleToggleEdit}
                                    disabled={isSaving}
                                    className={isEditing ? "bg-[#576238] hover:bg-[#464f2d] text-white" : ""}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : isEditing ? (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Changes
                                        </>
                                    ) : (
                                        <>
                                            <Edit3 className="h-4 w-4 mr-2" />
                                            Edit Idea
                                        </>
                                    )}
                                </Button>
                            </div>
                            {isLoading ? (
                                <p className="text-muted-foreground">Loading idea...</p>
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
                                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
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
                            onClick={handleMarkComplete}
                            disabled={isMarkingComplete}
                        >
                            {isMarkingComplete ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Mark as Complete & Continue"
                            )}
                        </Button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}