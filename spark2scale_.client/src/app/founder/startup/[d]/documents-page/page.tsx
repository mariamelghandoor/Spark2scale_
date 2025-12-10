"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Upload, FileText, Plus, Eye, Send, Star, Users, Globe, Mail, Edit3 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function DocumentsPage() {
    const params = useParams();
    const router = useRouter();
    const [documents] = useState([
        {
            id: 1,
            name: "Business Model Canvas",
            type: "PDF",
            size: "2.4 MB",
            date: "2024-01-15",
            icon: "📄",
            versions: [
                { id: "v3", label: "Version 3 (Current)", date: "2024-01-15" },
                { id: "v2", label: "Version 2", date: "2024-01-10" },
                { id: "v1", label: "Version 1", date: "2024-01-05" },
            ],
        },
        {
            id: 2,
            name: "Financial Projections",
            type: "Excel",
            size: "1.8 MB",
            date: "2024-01-14",
            icon: "📊",
            versions: [
                { id: "v2", label: "Version 2 (Current)", date: "2024-01-14" },
                { id: "v1", label: "Version 1", date: "2024-01-08" },
            ],
        },
        {
            id: 3,
            name: "Market Analysis Report",
            type: "Word",
            size: "3.2 MB",
            date: "2024-01-12",
            icon: "📈",
            versions: [
                { id: "v1", label: "Version 1 (Current)", date: "2024-01-12" },
            ],
        },
    ]);

    const [selectedVersions, setSelectedVersions] = useState<{ [key: number]: string }>({});
    const [manageAccessDialog, setManageAccessDialog] = useState(false);
    const [selectedDocForAccess, setSelectedDocForAccess] = useState<number | null>(null);
    const [accessEmail, setAccessEmail] = useState("");
    const [isPublic, setIsPublic] = useState(false);

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

    const handleEvaluate = (docId: number) => {
        const version = selectedVersions[docId];
        if (!version) {
            alert("Please select a version first");
            return;
        }
        router.push(`/founder/startup/${params.id}/documents/${docId}/evaluate?version=${version}`);
    };

    const handleRecommend = (docId: number) => {
        const version = selectedVersions[docId];
        if (!version) {
            alert("Please select a version first");
            return;
        }
        router.push(`/founder/startup/${params.id}/documents/${docId}/recommend?version=${version}`);
    };

    const handleManageAccess = (docId: number) => {
        setSelectedDocForAccess(docId);
        setManageAccessDialog(true);
    };

    const handleAddAccess = () => {
        console.log("Adding access for:", accessEmail, "to document:", selectedDocForAccess);
        setAccessEmail("");
    };

    const handleTogglePublic = () => {
        setIsPublic(!isPublic);
        console.log("Document is now:", !isPublic ? "public" : "private");
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
                                        Document Resources with Version Control
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Select a version to evaluate, get recommendations, or manage access. Each document maintains a complete version history.
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Documents Grid */}
                        <div className="grid md:grid-cols-1 gap-6">
                            {documents.map((doc, index) => (
                                <motion.div
                                    key={doc.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="p-6 border-2 hover:border-[#FFD95D] bg-white transition-all">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Icon & Basic Info */}
                                            <div className="flex items-start gap-4 md:w-1/3">
                                                <div className="text-5xl">{doc.icon}</div>
                                                <div className="flex-grow">
                                                    <h3 className="font-bold text-[#576238] mb-2">
                                                        {doc.name}
                                                    </h3>
                                                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                        <span className="bg-[#576238] text-white px-2 py-1 rounded-full w-fit">
                                                            {doc.type}
                                                        </span>
                                                        <span>{doc.size}</span>
                                                        <span>{doc.date}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Version Selection & Actions */}
                                            <div className="md:w-2/3 space-y-4">
                                                {/* Version Selector */}
                                                <div>
                                                    <Label className="text-xs text-muted-foreground mb-2 block">
                                                        Select Version (Required) *
                                                    </Label>
                                                    <Select
                                                        value={selectedVersions[doc.id]}
                                                        onValueChange={(value) =>
                                                            setSelectedVersions({ ...selectedVersions, [doc.id]: value })
                                                        }
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Choose a version..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {doc.versions.map((version) => (
                                                                <SelectItem key={version.id} value={version.id}>
                                                                    {version.label} - {version.date}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEvaluate(doc.id)}
                                                        className="text-xs"
                                                    >
                                                        <Star className="h-3 w-3 mr-1" />
                                                        Evaluate
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRecommend(doc.id)}
                                                        className="text-xs"
                                                    >
                                                        <Edit3 className="h-3 w-3 mr-1" />
                                                        Recommend
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs"
                                                    >
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        View
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs"
                                                    >
                                                        <Download className="h-3 w-3 mr-1" />
                                                        Download
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleManageAccess(doc.id)}
                                                        className="text-xs col-span-2 md:col-span-1"
                                                    >
                                                        <Users className="h-3 w-3 mr-1" />
                                                        Manage Access
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
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

            {/* Manage Access Dialog */}
            <Dialog open={manageAccessDialog} onOpenChange={setManageAccessDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-[#576238]">Manage Document Access</DialogTitle>
                        <DialogDescription>
                            Control who can view and edit this document
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Public Toggle */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Globe className="h-5 w-5 text-[#576238]" />
                                <div>
                                    <p className="font-semibold text-sm">Public Access</p>
                                    <p className="text-xs text-muted-foreground">
                                        Anyone with the link can view
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant={isPublic ? "default" : "outline"}
                                size="sm"
                                onClick={handleTogglePublic}
                                className={isPublic ? "bg-[#576238]" : ""}
                            >
                                {isPublic ? "Enabled" : "Disabled"}
                            </Button>
                        </div>

                        {/* Add User by Email */}
                        <div className="space-y-2">
                            <Label htmlFor="access-email" className="text-[#576238]">
                                Add User by Email
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="access-email"
                                    type="email"
                                    placeholder="user@example.com"
                                    value={accessEmail}
                                    onChange={(e) => setAccessEmail(e.target.value)}
                                />
                                <Button
                                    onClick={handleAddAccess}
                                    disabled={!accessEmail}
                                    className="bg-[#576238] hover:bg-[#6b7c3f]"
                                >
                                    <Mail className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Current Access List */}
                        <div className="space-y-2">
                            <Label className="text-[#576238]">Current Access</Label>
                            <div className="border rounded-lg divide-y">
                                <div className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">you@startup.com (Owner)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setManageAccessDialog(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}