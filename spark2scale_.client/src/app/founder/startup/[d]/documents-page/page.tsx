"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Eye, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// --- Interfaces ---
interface DocumentVersion {
    vid: string;
    version_number: number;
    path: string;
    created_at: string;
    generated_by: string;
}

interface DocumentData {
    did: string;
    document_name: string; // This is the LATEST filename
    type: string;          // This is the Category (e.g., Business Plan)
    current_path: string;  // This is the LATEST path
    updated_at: string;
    versions: DocumentVersion[];
}

export default function DocumentsPage() {
    const params = useParams();
    const [documents, setDocuments] = useState<DocumentData[]>([]);
    const [loading, setLoading] = useState(true);

    // ID Logic
    const startupId = params?.id || params?.d;

    // Upload State
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadName, setUploadName] = useState("");
    const [uploadType, setUploadType] = useState("");

    // Version Selection State: { docId: "vid_of_version" }
    const [selectedVersions, setSelectedVersions] = useState<{ [docId: string]: string }>({});

    const API_BASE_URL = "https://localhost:7155";

    useEffect(() => {
        if (startupId) fetchDocuments();
        else setLoading(false);
    }, [startupId]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);

            // 1. Get Parents (Latest Version Info)
            const res = await fetch(`${API_BASE_URL}/api/documents?startupId=${startupId}`);
            if (!res.ok) throw new Error("Failed");
            const docs: DocumentData[] = await res.json();

            // 2. Get Versions for each Parent
            const docsWithHistory = await Promise.all(
                docs.map(async (doc) => {
                    const hRes = await fetch(`${API_BASE_URL}/api/documents/history/${doc.did}`);
                    const history: DocumentVersion[] = hRes.ok ? await hRes.json() : [];
                    history.sort((a, b) => b.version_number - a.version_number);
                    return { ...doc, versions: history };
                })
            );

            setDocuments(docsWithHistory);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadSubmit = async () => {
        if (!uploadFile || !uploadName || !uploadType || !startupId) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("File", uploadFile);
        formData.append("StartupId", startupId as string);
        formData.append("DocName", uploadName); // This is just for initial name, backend uses filename
        formData.append("Type", uploadType);

        try {
            const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error("Upload failed");

            setIsUploadOpen(false);
            setUploadFile(null);
            setUploadName("");
            setUploadType("");
            fetchDocuments();
        } catch (error) {
            console.error(error);
            alert("Failed to upload");
        } finally {
            setIsUploading(false);
        }
    };

    // --- VIEW LOGIC ---
    const handleView = (doc: DocumentData) => {
        const selectedVid = selectedVersions[doc.did];

        // If user picked a specific version in dropdown, find it
        const specificVersion = doc.versions.find(v => v.vid === selectedVid);

        // If specific version found, use its path. Otherwise use the PARENT (Latest) path.
        const urlToOpen = specificVersion ? specificVersion.path : doc.current_path;

        if (urlToOpen) window.open(urlToOpen, "_blank");
    };

    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes("pdf")) return "📄";
        if (t.includes("excel") || t.includes("financial")) return "📊";
        return "📈";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Nav ... */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href={`/founder/startup/${startupId}`}>
                        <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-[#576238]">📁 Documents</h1>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto space-y-8">
                    <div className="grid md:grid-cols-1 gap-6">
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#576238]" /></div>
                        ) : documents.map((doc, index) => (
                            <motion.div
                                key={doc.did}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="p-6 border-2 hover:border-[#FFD95D] bg-white transition-all">
                                    <div className="flex flex-col md:flex-row gap-6">

                                        {/* LEFT SIDE: Document Info */}
                                        <div className="flex items-start gap-4 md:w-1/3">
                                            <div className="text-5xl">{getIcon(doc.type)}</div>
                                            <div className="flex-grow">
                                                {/* 1. Main Title = Document Type (e.g. "Business Plan") */}
                                                <h3 className="font-bold text-[#576238] text-lg mb-1">{doc.type}</h3>

                                                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                    {/* 2. Subtitle = Actual Filename (Latest) */}
                                                    <div className="flex items-center gap-2" title={doc.document_name}>
                                                        <span className="font-semibold text-gray-500">Latest File:</span>
                                                        <span className="truncate max-w-[150px]">{doc.document_name}</span>
                                                    </div>
                                                    <span>Updated: {new Date(doc.updated_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT SIDE: Controls */}
                                        <div className="md:w-2/3 space-y-4">
                                            <div>
                                                <Label className="text-xs text-muted-foreground mb-2 block">
                                                    Version History
                                                </Label>
                                                <Select
                                                    value={selectedVersions[doc.did] || "latest"}
                                                    onValueChange={(val) => setSelectedVersions({ ...selectedVersions, [doc.did]: val })}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Latest Version" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {/* Default Option: Latest */}
                                                        <SelectItem value="latest">
                                                            Current (Latest)
                                                        </SelectItem>

                                                        {/* History Options */}
                                                        {doc.versions.map((v) => (
                                                            <SelectItem key={v.vid} value={v.vid}>
                                                                Version {v.version_number} - {new Date(v.created_at).toLocaleDateString()}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleView(doc)}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View / Download
                                                </Button>
                                                <Button variant="outline" size="sm">
                                                    <Users className="h-4 w-4 mr-2" />
                                                    Manage Access
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Card onClick={() => setIsUploadOpen(true)} className="p-6 h-full flex flex-col items-center justify-center border-2 border-dashed border-[#576238]/30 bg-white/50 hover:bg-[#F0EADC]/30 cursor-pointer min-h-[150px]">
                                <div className="text-5xl mb-4 opacity-50">➕</div>
                                <h3 className="font-bold text-[#576238]">Upload New Document</h3>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </main>

            {/* Upload Dialog (Standard) */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Fields for Name, Type, File... */}
                        <div className="grid gap-2">
                            <Label>Document Name</Label>
                            <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Type</Label>
                            <Select onValueChange={setUploadType} value={uploadType}>
                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pitch Deck">Pitch Deck</SelectItem>
                                    <SelectItem value="Business Plan">Business Plan</SelectItem>
                                    <SelectItem value="Financials">Financials</SelectItem>
                                    <SelectItem value="Legal Docs">Legal Docs</SelectItem>
                                    <SelectItem value="Cap Table">Cap Table</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>File</Label>
                            <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUploadSubmit} disabled={isUploading || !uploadFile} className="bg-[#576238] text-white">
                            {isUploading ? "Uploading..." : "Upload"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}