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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    document_name: string;
    type: string;
    current_path: string;
    updated_at: string;
    is_current: boolean;
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

    // Version Selection State: { type_name: "vid_of_version" }
    // Note: We key by 'type' now since we are grouping by type
    const [selectedVersions, setSelectedVersions] = useState<{ [type: string]: string }>({});

    const API_BASE_URL = "https://localhost:7155";

    useEffect(() => {
        if (startupId) fetchDocuments();
        else setLoading(false);
    }, [startupId]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);

            // 1. Fetch All Docs
            const res = await fetch(`${API_BASE_URL}/api/documents/all?startupId=${startupId}`);
            if (!res.ok) throw new Error("Failed to fetch documents");
            const docs: DocumentData[] = await res.json();

            // 2. Fetch History for each
            const docsWithHistory = await Promise.all(
                docs.map(async (doc) => {
                    try {
                        const hRes = await fetch(`${API_BASE_URL}/api/documents/history/${doc.did}`);
                        const history: DocumentVersion[] = hRes.ok ? await hRes.json() : [];
                        return { ...doc, versions: history };
                    } catch (err) {
                        console.warn(`Could not load history for ${doc.did}`, err);
                        return { ...doc, versions: [] };
                    }
                })
            );

            // 3. GROUP BY TYPE (The Logic You Requested)
            const groupedDocs = processAndGroupDocuments(docsWithHistory);

            setDocuments(groupedDocs);
        } catch (error) {
            console.error("Error fetching docs:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- GROUPING HELPER ---
    const processAndGroupDocuments = (rawDocs: DocumentData[]): DocumentData[] => {
        const groups: Record<string, DocumentData> = {};

        rawDocs.forEach(doc => {
            const type = doc.type; // Grouping Key (e.g., "Financials")

            if (!groups[type]) {
                // First time seeing this type, initialize it
                groups[type] = { ...doc, versions: [...doc.versions] };
            } else {
                // We already have a "Financials" card. 
                // 1. Merge the versions
                groups[type].versions = [...groups[type].versions, ...doc.versions];

                // 2. Check if this new doc is NEWER than what we stored. 
                // If so, update the "Main Card" info to match this newer file.
                if (new Date(doc.updated_at) > new Date(groups[type].updated_at)) {
                    groups[type].did = doc.did;
                    groups[type].document_name = doc.document_name;
                    groups[type].current_path = doc.current_path;
                    groups[type].updated_at = doc.updated_at;
                    groups[type].is_current = doc.is_current;
                }
            }
        });

        // Convert back to array and Clean up versions
        return Object.values(groups).map(group => {
            // Sort versions by date descending (Newest first)
            group.versions.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            // Optional: Remove duplicate version IDs if any exist due to data overlap
            const uniqueVersions = Array.from(new Map(group.versions.map(v => [v.vid, v])).values());
            group.versions = uniqueVersions;

            return group;
        });
    };

    const handleUploadSubmit = async () => {
        if (!uploadFile || !uploadName || !uploadType || !startupId) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("File", uploadFile);
        formData.append("StartupId", startupId as string);
        formData.append("DocName", uploadName);
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
        // Use 'doc.type' as key because that's unique now per card
        const selectedVid = selectedVersions[doc.type];

        // Find specific version in the merged list
        const specificVersion = doc.versions.find(v => v.vid === selectedVid);

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
            {/* Nav */}
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
                            <div className="flex justify-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-[#576238]" />
                            </div>
                        ) : documents.map((doc, index) => (
                            <motion.div
                                key={doc.type} // Changed Key to Type since distinct by type
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                {/* REMOVED "Archived" styling logic. It's now always "active" style. */}
                                <Card className="p-6 border-2 transition-all bg-white hover:border-[#FFD95D]">
                                    <div className="flex flex-col md:flex-row gap-6">

                                        {/* LEFT SIDE: Document Info */}
                                        <div className="flex items-start gap-4 md:w-1/3">
                                            <div className="text-5xl">{getIcon(doc.type)}</div>
                                            <div className="flex-grow">
                                                <h3 className="font-bold text-[#576238] text-lg mb-1">
                                                    {doc.type}
                                                </h3>

                                                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
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
                                                    // Key select state by Type
                                                    value={selectedVersions[doc.type] || "latest"}
                                                    onValueChange={(val) => setSelectedVersions({ ...selectedVersions, [doc.type]: val })}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Latest Version" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {/* Default Option: Latest */}
                                                        <SelectItem value="latest">
                                                            Current (Latest)
                                                        </SelectItem>

                                                        {/* History Options (Merged) */}
                                                        {doc.versions.map((v) => (
                                                            <SelectItem key={v.vid} value={v.vid}>
                                                                {/* Show Date + Version Number if available */}
                                                                {new Date(v.created_at).toLocaleDateString()} - Version {v.version_number}
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

            {/* Upload Dialog */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
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