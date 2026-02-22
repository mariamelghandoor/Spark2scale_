"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Eye, Users, Loader2, Globe, Lock } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// --- Import Merged Service ---
import { documentsService, DocumentData } from "@/services/documentsService";

export default function DocumentsHistoryPage() {
    const params = useParams();
    const [documents, setDocuments] = useState<any[]>([]); // Relaxed type slightly to allow dynamic fallback
    const [loading, setLoading] = useState(true);

    const getCleanId = () => {
        const raw = params?.id || params?.d;
        if (!raw) return "";
        return Array.isArray(raw) ? raw[0] : raw;
    };
    const startupId = getCleanId();

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadName, setUploadName] = useState("");
    const [uploadType, setUploadType] = useState("");

    const [selectedVersions, setSelectedVersions] = useState<{ [type: string]: string }>({});

    // 1. Fetch Data
    const loadDocuments = async () => {
        if (!startupId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await documentsService.getGroupedDocuments(startupId);
            setDocuments(data || []);
        } catch (error) {
            console.error("Failed to load documents", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDocuments();
    }, [startupId]);

    // 2. Handlers
    const handleToggleVisibility = async (docType: string, versionId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;

        // Safely map versions (prevents crash if doc.versions is undefined)
        const updatedDocs = documents.map(doc => {
            if (doc.type === docType) {
                return {
                    ...doc,
                    versions: (doc.versions || []).map((v: any) =>
                        v.vid === versionId ? { ...v, is_public: newStatus } : v
                    )
                };
            }
            return doc;
        });
        setDocuments(updatedDocs);

        const success = await documentsService.toggleVersionVisibility(versionId, newStatus);
        if (!success) {
            alert("Failed to change visibility settings.");
            loadDocuments();
        }
    };

    const handleUploadSubmit = async () => {
        if (!uploadFile || !uploadName || !uploadType || !startupId) return;

        setIsUploading(true);
        try {
            const success = await documentsService.uploadDocument(startupId, uploadType, uploadFile);
            if (success) {
                setIsUploadOpen(false);
                setUploadFile(null);
                setUploadName("");
                setUploadType("");
                loadDocuments();
            } else {
                alert("Upload failed. Please try again.");
            }
        } finally {
            setIsUploading(false);
        }
    };

    // 👇 FIX: Bulletproof function to prevent React crashes if AI docs lack a versions array
    const getCurrentVersionObj = (doc: any) => {
        if (!doc.versions || doc.versions.length === 0) return null;

        const selectedVid = selectedVersions[doc.type];
        if (!selectedVid) return doc.versions[0];

        return doc.versions.find((v: any) => v.vid === selectedVid) || doc.versions[0];
    };

    // 👇 FIX: Safely fallback to the main document path if the version path is missing
    const handleView = (doc: any) => {
        const version = getCurrentVersionObj(doc);
        const pathToOpen = version?.path || doc.current_path;

        if (pathToOpen) {
            window.open(pathToOpen, "_blank");
        } else {
            alert("This document is still processing or has no file attached.");
        }
    };

    const getIcon = (type: string) => {
        const t = type?.toLowerCase() || "";
        if (t.includes("pdf") || t.includes("evaluation") || t.includes("report")) return "📄";
        if (t.includes("excel") || t.includes("financial") || t.includes("cap")) return "📊";
        if (t.includes("ppt") || t.includes("deck")) return "📽️";
        return "📁";
    };

    // 3. Render
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
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
                        ) : documents.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No documents available. Wait for AI to finish or upload one below.
                            </div>
                        ) : documents.map((doc, index) => {
                            const activeVersion = getCurrentVersionObj(doc);

                            return (
                                <motion.div
                                    key={doc.did || doc.type || index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="p-6 border-2 transition-all bg-white hover:border-[#FFD95D]">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* LEFT SIDE */}
                                            <div className="flex items-start gap-4 md:w-1/3">
                                                <div className="text-5xl">{getIcon(doc.type)}</div>
                                                <div className="flex-grow">
                                                    <h3 className="font-bold text-[#576238] text-lg mb-1">
                                                        {doc.document_name || doc.type}
                                                    </h3>
                                                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-gray-500">Version:</span>
                                                            <span className="truncate max-w-[150px]">
                                                                v{activeVersion ? activeVersion.version_number : doc.current_version}
                                                            </span>
                                                        </div>
                                                        {/* 👇 FIX: Safe date parsing fallback */}
                                                        <span>Created: {new Date(activeVersion?.created_at || doc.updated_at || Date.now()).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RIGHT SIDE */}
                                            <div className="md:w-2/3 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-grow">
                                                        <Label className="text-xs text-muted-foreground mb-1 block">Select Version</Label>

                                                        {/* 👇 FIX: Conditionally render Select ONLY if versions exist */}
                                                        {doc.versions && doc.versions.length > 0 ? (
                                                            <Select
                                                                value={selectedVersions[doc.type] || (doc.versions[0]?.vid)}
                                                                onValueChange={(val) => setSelectedVersions({ ...selectedVersions, [doc.type]: val })}
                                                            >
                                                                <SelectTrigger className="w-full h-9">
                                                                    <SelectValue placeholder="Select Version" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {doc.versions.map((v: any) => (
                                                                        <SelectItem key={v.vid} value={v.vid}>
                                                                            v{v.version_number} - {new Date(v.created_at).toLocaleDateString()}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <div className="w-full h-9 border rounded-md bg-gray-50 flex items-center px-3 text-sm text-gray-500">
                                                                Latest AI Output
                                                            </div>
                                                        )}
                                                    </div>

                                                    {activeVersion && (
                                                        <div className="flex flex-col items-center">
                                                            <Label className="text-xs text-muted-foreground mb-1 block">Visibility</Label>
                                                            <div className="flex items-center gap-2 border p-1 px-2 rounded-md h-9 bg-gray-50">
                                                                {activeVersion.is_public ? (
                                                                    <Globe className="h-4 w-4 text-[#576238]" />
                                                                ) : (
                                                                    <Lock className="h-4 w-4 text-gray-400" />
                                                                )}
                                                                <Switch
                                                                    checked={activeVersion.is_public}
                                                                    onCheckedChange={() => handleToggleVisibility(doc.type, activeVersion.vid, activeVersion.is_public)}
                                                                    className="scale-75 data-[state=checked]:bg-[#576238]"
                                                                />
                                                                <span className="text-xs font-medium w-12">
                                                                    {activeVersion.is_public ? "Public" : "Private"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleView(doc)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View File
                                                    </Button>
                                                    <Button variant="outline" size="sm" disabled={!activeVersion}>
                                                        <Users className="h-4 w-4 mr-2" />
                                                        Permissions
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}

                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Card onClick={() => setIsUploadOpen(true)} className="p-6 h-full flex flex-col items-center justify-center border-2 border-dashed border-[#576238]/30 bg-white/50 hover:bg-[#F0EADC]/30 cursor-pointer min-h-[150px]">
                                <div className="text-5xl mb-4 opacity-50">➕</div>
                                <h3 className="font-bold text-[#576238]">Upload New Document</h3>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </main>

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