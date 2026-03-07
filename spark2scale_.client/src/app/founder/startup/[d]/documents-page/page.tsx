"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Eye, Users, Loader2, Globe, Lock, Download } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import JSZip from "jszip";
import { documentService } from "@/services/documentService";

export default function DocumentsHistoryPage() {
    const params = useParams();
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Track which document is currently being generated dynamically
    const [generatingDocId, setGeneratingDocId] = useState<string | null>(null);

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

    const loadDocuments = async () => {
        if (!startupId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await documentService.getGroupedDocuments(startupId);
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

    const handleToggleVisibility = async (docType: string, versionId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;

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

        const success = await documentService.toggleVersionVisibility(versionId, newStatus);
        if (!success) {
            alert("Failed to change visibility settings.");
            loadDocuments();
        }
    };

    const handleUploadSubmit = async () => {
        if (!uploadFile || !uploadName || !uploadType || !startupId) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("StartupId", startupId);
            formData.append("DocName", uploadName);
            formData.append("Type", uploadType);
            formData.append("File", uploadFile);

            const result = await documentService.uploadDocument(formData);

            if (result) {
                setIsUploadOpen(false);
                setUploadFile(null);
                setUploadName("");
                setUploadType("");
                loadDocuments();
            }
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const getCurrentVersionObj = (doc: any) => {
        if (!doc.versions || doc.versions.length === 0) return null;
        const selectedVid = selectedVersions[doc.type];
        if (!selectedVid) return doc.versions[0];
        return doc.versions.find((v: any) => v.vid === selectedVid) || doc.versions[0];
    };

    // ============================================================================
    // 🧠 DYNAMIC AI GENERATION LOGIC
    // ============================================================================
    const handleDynamicRender = async (doc: any, action: 'view' | 'download') => {
        try {
            setGeneratingDocId(doc.did);

            // 1. Parse the stored JSON
            const parsedJson = typeof doc.json_response === 'string'
                ? JSON.parse(doc.json_response)
                : doc.json_response;

            // 2. Call the Python endpoint to generate the ZIP
            const pdfRes = await fetch('https://spark2scale-ai-server.azurewebsites.net/api/v1/evaluation/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsedJson)
            });

            if (!pdfRes.ok) throw new Error("Failed to generate PDF from AI Server");

            // 3. Unzip the file
            const zipBlob = await pdfRes.blob();
            const zip = new JSZip();
            const unzipped = await zip.loadAsync(zipBlob);

            // 4. Find the correct PDF based on the document type
            let fileKey;
            if (doc.type.toLowerCase().includes("founder")) {
                fileKey = Object.keys(unzipped.files).find(name => name.includes("Founder_Report"));
            } else if (doc.type.toLowerCase().includes("investor")) {
                fileKey = Object.keys(unzipped.files).find(name => name.includes("Investor_Memo"));
            }

            if (!fileKey) throw new Error("Target PDF not found in the generated ZIP");

            // 5. Extract it and create a temporary URL
            // 5. Extract it as an ArrayBuffer and force the PDF MIME type
            const pdfBuffer = await unzipped.files[fileKey].async("arraybuffer");
            const properPdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(properPdfBlob);

            // 6. Execute action
            if (action === 'view') {
                window.open(blobUrl, "_blank");
            } else {
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = doc.document_name || `${doc.type}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            // Clean up the URL after a short delay
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

        } catch (error) {
            console.error("Dynamic generation failed:", error);
            alert("Failed to generate document dynamically. Ensure AI server is running.");
        } finally {
            setGeneratingDocId(null);
        }
    };

    // ============================================================================
    // 🚦 ROUTING LOGIC FOR VIEW & DOWNLOAD
    // ============================================================================
    const handleAction = (doc: any, action: 'view' | 'download') => {
        // Condition A: It is an AI Evaluation Document with JSON attached
        const isAIEvaluation = (doc.type.toLowerCase().includes('evaluation') || doc.type.toLowerCase() === 'recommendation') && doc.json_response;

        if (isAIEvaluation) {
            handleDynamicRender(doc, action);
            return;
        }

        // Condition B: Standard File (Uploaded PPT, Business Plan, etc.)
        const version = getCurrentVersionObj(doc);
        const pathToOpen = version?.path || doc.current_path;

        if (pathToOpen) {
            const isPPT = pathToOpen.toLowerCase().includes('.ppt') ||
                doc.type?.toLowerCase().includes('ppt') ||
                doc.type?.toLowerCase().includes('pitch deck');

            if (action === 'view' && isPPT) {
                // Open PPT in Microsoft Viewer
                const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(pathToOpen)}`;
                window.open(viewerUrl, "_blank");
            } else if (action === 'view') {
                // Open normal file in browser
                window.open(pathToOpen, "_blank");
            } else if (action === 'download') {
                // Force download
                const a = document.createElement('a');
                a.href = pathToOpen;
                a.download = doc.document_name || "document";
                a.target = "_blank";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
                <div className="flex w-full items-center px-6 md:px-12 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${startupId}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-xl font-bold text-[#576238] leading-tight flex items-center gap-2">
                                Documents
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Document version history and access control
                            </p>
                        </div>
                    </div>
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
                            const isGenerating = generatingDocId === doc.did;

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
                                                        <span>Created: {new Date(activeVersion?.created_at || doc.updated_at || Date.now()).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RIGHT SIDE */}
                                            <div className="md:w-2/3 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-grow">
                                                        <Label className="text-xs text-muted-foreground mb-1 block">Select Version</Label>
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

                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAction(doc, 'view')}
                                                        disabled={isGenerating}
                                                        className="flex-1 md:flex-none"
                                                    >
                                                        {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                                                        {isGenerating ? "Generating..." : "View File"}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAction(doc, 'download')}
                                                        disabled={isGenerating}
                                                        className="flex-1 md:flex-none"
                                                    >
                                                        {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                                                        Download
                                                    </Button>
                                                    <Button variant="outline" size="sm" disabled={!activeVersion} className="flex-1 md:flex-none">
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