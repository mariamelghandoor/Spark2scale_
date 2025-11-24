"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, FileText, Download, Sparkles, Plus, Eye, Send } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DocumentsPage() {
    const params = useParams();
    const [documents, setDocuments] = useState([
        { id: 1, name: "Business Model Canvas", uploaded: true, required: true, type: "PDF", size: "2.4 MB", date: "2024-01-15", icon: "📄" },
        { id: 2, name: "Financial Projections", uploaded: false, required: true, type: "Excel", size: "1.8 MB", date: "2024-01-14", icon: "📊" },
        { id: 3, name: "Market Analysis", uploaded: true, required: true, type: "Word", size: "3.2 MB", date: "2024-01-12", icon: "📈" },
        { id: 4, name: "Team Bios", uploaded: false, required: false, type: "PDF", size: "890 KB", date: "2024-01-10", icon: "👥" },
        { id: 5, name: "Product Roadmap", uploaded: true, required: false, type: "PDF", size: "1.5 MB", date: "2024-01-08", icon: "🗺️" },
    ]);

    const [selectedDocs, setSelectedDocs] = useState<number[]>([1, 3]);
    const [showGenerateForm, setShowGenerateForm] = useState(false);

    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "Hello! I'm your AI document assistant. I can help you generate professional business documents or answer questions about your existing documents. What would you like to create today?",
        },
    ]);
    const [newMessage, setNewMessage] = useState("");

    const toggleDocSelection = (docId: number) => {
        setSelectedDocs((prev) =>
            prev.includes(docId)
                ? prev.filter((id) => id !== docId)
                : [...prev, docId]
        );
    };

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
                            <h1 className="text-xl font-bold text-[#576238]">
                                📄 Documents
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Stage 2 of 6 - Upload or generate documents
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left & Center Columns - Documents Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Document List */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-2">
                                <CardHeader>
                                    <CardTitle className="text-[#576238]">
                                        Required Documents
                                    </CardTitle>
                                    <CardDescription>
                                        Upload existing files or generate them using AI
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {documents.map((doc, index) => (
                                            <motion.div
                                                key={doc.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className={`flex items-center justify-between p-4 rounded-lg border-2 ${doc.uploaded
                                                        ? "bg-green-50 border-green-200"
                                                        : "bg-white border-gray-200"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`doc-${doc.id}`}
                                                            checked={selectedDocs.includes(doc.id)}
                                                            onCheckedChange={() => toggleDocSelection(doc.id)}
                                                            disabled={!doc.uploaded}
                                                        />
                                                        <FileText
                                                            className={`h-5 w-5 ${doc.uploaded ? "text-green-600" : "text-gray-400"
                                                                }`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[#576238]">
                                                            {doc.name}
                                                            {doc.required && (
                                                                <span className="ml-2 text-xs text-red-600">
                                                                    *Required
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {doc.uploaded ? "✓ Uploaded" : "Not uploaded"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {doc.uploaded ? (
                                                        <Button variant="outline" size="sm">
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Download
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="bg-white"
                                                        >
                                                            <Upload className="h-4 w-4 mr-2" />
                                                            Upload
                                                        </Button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* AI Generation Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="border-2 border-[#FFD95D]">
                                <CardHeader className="bg-gradient-to-r from-[#FFD95D]/20 to-transparent">
                                    <CardTitle className="text-[#576238] flex items-center gap-2">
                                        <Sparkles className="h-5 w-5" />
                                        AI Document Generator
                                    </CardTitle>
                                    <CardDescription>
                                        Generate professional documents based on your uploaded data
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-[#576238] mb-3">
                                                Generate Presentation (PPT)
                                            </h4>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Select documents to include in your presentation:
                                            </p>
                                            <div className="space-y-2 mb-4">
                                                {documents
                                                    .filter((doc) => doc.uploaded)
                                                    .map((doc) => (
                                                        <div
                                                            key={doc.id}
                                                            className="flex items-center space-x-2"
                                                        >
                                                            <Checkbox
                                                                id={`gen-${doc.id}`}
                                                                checked={selectedDocs.includes(doc.id)}
                                                                onCheckedChange={() => toggleDocSelection(doc.id)}
                                                            />
                                                            <Label
                                                                htmlFor={`gen-${doc.id}`}
                                                                className="text-sm font-normal cursor-pointer"
                                                            >
                                                                {doc.name}
                                                            </Label>
                                                        </div>
                                                    ))}
                                            </div>
                                            <Button className="w-full bg-[#576238] hover:bg-[#6b7c3f]">
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Generate Presentation
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Document Templates Grid */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <h2 className="text-xl font-bold text-[#576238] mb-4">
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
                                        onClick={() => setShowGenerateForm(true)}
                                    >
                                        <div className="text-4xl mb-2">{template.icon}</div>
                                        <h4 className="font-semibold text-[#576238] text-sm">
                                            {template.name}
                                        </h4>
                                    </Card>
                                ))}
                            </div>
                        </motion.div>

                        {/* Add Document Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Card
                                className="p-8 border-2 border-dashed border-[#576238] bg-white/50 hover:bg-[#F0EADC]/30 transition-all cursor-pointer"
                                onClick={() => setShowGenerateForm(true)}
                            >
                                <div className="flex flex-col items-center justify-center">
                                    <Plus className="h-12 w-12 text-[#576238] mb-3" />
                                    <h3 className="font-bold text-[#576238] text-lg mb-2">
                                        Add Document
                                    </h3>
                                    <p className="text-sm text-muted-foreground text-center">
                                        Upload or generate a new document with AI
                                    </p>
                                </div>
                            </Card>
                        </motion.div>
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

                {/* Complete Stage Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 text-center"
                >
                    <Button
                        size="lg"
                        className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold"
                        asChild
                    >
                        <Link href={`/founder/startup/${params.id}`}>
                            Complete Documents Stage
                        </Link>
                    </Button>
                </motion.div>
            </main>
        </div>
    );
}