"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Upload, FileText, Plus, Eye, Send } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DocumentsPage() {
    const params = useParams();
    const [documents] = useState([
        {
            id: 1,
            name: "Business Model Canvas",
            type: "PDF",
            size: "2.4 MB",
            date: "2024-01-15",
            icon: "📄",
        },
        {
            id: 2,
            name: "Financial Projections",
            type: "Excel",
            size: "1.8 MB",
            date: "2024-01-14",
            icon: "📊",
        },
        {
            id: 3,
            name: "Market Analysis Report",
            type: "Word",
            size: "3.2 MB",
            date: "2024-01-12",
            icon: "📈",
        },
        {
            id: 4,
            name: "Product Roadmap",
            type: "PDF",
            size: "1.5 MB",
            date: "2024-01-10",
            icon: "🗺️",
        },
        {
            id: 5,
            name: "Team Bios",
            type: "PDF",
            size: "890 KB",
            date: "2024-01-08",
            icon: "👥",
        },
        {
            id: 6,
            name: "Legal Documents",
            type: "PDF",
            size: "4.1 MB",
            date: "2024-01-05",
            icon: "⚖️",
        },
    ]);

    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "Hello! I'm your AI document assistant. I can help you generate professional business documents or answer questions about your existing documents. What would you like to create today?",
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
                    "I can help you with that! Let me assist you in creating or editing that document. Would you like me to use your existing Business Model Canvas as a reference?",
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
                            <h1 className="text-2xl font-bold text-[#576238]">
                                📁 Documents
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Manage all your startup documents
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                        </Button>
                        <Button className="bg-[#576238] hover:bg-[#6b7c3f] text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Generate New
                        </Button>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Documents Grid */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Info Section */}
                        <Card className="p-6 bg-[#F0EADC]/50 border-2 border-[#FFD95D]">
                            <div className="flex items-start gap-4">
                                <div className="text-4xl">💡</div>
                                <div>
                                    <h3 className="font-bold text-[#576238] mb-2">
                                        Organize Your Documents
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Upload existing documents or use our AI to generate professional
                                        business documents. Keep everything organized in one place.
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Documents Grid */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {documents.map((doc, index) => (
                                <motion.div
                                    key={doc.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-[#FFD95D] bg-[#F0EADC]/30">
                                        <div className="flex flex-col h-full">
                                            {/* Icon & Type Badge */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="text-5xl">{doc.icon}</div>
                                                <span className="text-xs bg-[#576238] text-white px-2 py-1 rounded-full">
                                                    {doc.type}
                                                </span>
                                            </div>

                                            {/* Document Info */}
                                            <div className="flex-grow mb-4">
                                                <h3 className="font-bold text-[#576238] mb-2 line-clamp-2">
                                                    {doc.name}
                                                </h3>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span>{doc.size}</span>
                                                    <span>•</span>
                                                    <span>{doc.date}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                >
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    View
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="flex-1 bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                                >
                                                    <Download className="h-3 w-3 mr-1" />
                                                    Download
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}

                            {/* Add New Document Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: documents.length * 0.1 }}
                            >
                                <Card className="p-6 h-full flex flex-col items-center justify-center border-2 border-dashed border-[#576238] bg-white/50 hover:bg-[#F0EADC]/30 transition-all cursor-pointer">
                                    <div className="text-5xl mb-4">➕</div>
                                    <h3 className="font-bold text-[#576238] mb-2">
                                        Add Document
                                    </h3>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Upload or generate a new document
                                    </p>
                                </Card>
                            </motion.div>
                        </div>

                        {/* Generation Options */}
                        <div>
                            <h2 className="text-2xl font-bold text-[#576238] mb-6">
                                Generate Documents with AI
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { name: "Business Plan", icon: "📋" },
                                    { name: "Pitch Deck", icon: "🎤" },
                                    { name: "Financial Model", icon: "💰" },
                                    { name: "Marketing Plan", icon: "📢" },
                                ].map((template, index) => (
                                    <Card
                                        key={index}
                                        className="p-4 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-[#FFD95D] text-center"
                                    >
                                        <div className="text-4xl mb-2">{template.icon}</div>
                                        <h4 className="font-semibold text-[#576238] text-sm">
                                            {template.name}
                                        </h4>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - AI Chatbot Assistant */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="sticky top-8"
                        >
                            <Card className="border-2">
                                <div className="p-6 border-b bg-[#576238] text-white">
                                    <h2 className="text-xl font-bold">AI Document Assistant</h2>
                                    <p className="text-sm text-white/80">
                                        Get help with document generation
                                    </p>
                                </div>

                                <ScrollArea className="h-[500px] p-6">
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
                                                    className={`max-w-[85%] rounded-lg p-4 ${message.role === "user"
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
                                            placeholder="Ask about documents or request generation..."
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
                    </div>
                </div>
            </main>
        </div>
    );
}