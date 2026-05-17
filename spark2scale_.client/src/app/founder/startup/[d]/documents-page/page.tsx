"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft, Eye, Users, Globe, Lock, Download, X,
    TrendingUp, TrendingDown, Lightbulb, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

import JSZip from "jszip";
import { documentService } from "@/services/documentService";
import LegoSpinner from "@/components/lego/LegoSpinner";

// ---------------------------------------------------------------------------
// Viewer Modal
// ---------------------------------------------------------------------------

interface SwotData {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
    [key: string]: unknown;
}

function parseSwot(raw: unknown): SwotData | null {
    if (!raw) return null;
    try {
        const obj: Record<string, unknown> =
            typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);

        const unwrapped =
            (obj.swot_document as Record<string, unknown>) ||
            (obj.swot_analysis as Record<string, unknown>) ||
            (obj.swot as Record<string, unknown>) ||
            obj;

        const cleanItem = (s: string): string =>
            s.replace(/\*\*[^*]+\*\*:?\s*/g, "").replace(/\*\*/g, "").trim();

        const toArray = (v: unknown): string[] => {
            if (Array.isArray(v)) return v.map(i => cleanItem(String(i))).filter(Boolean);
            if (typeof v === "string") return v.split("\n").map(cleanItem).filter(Boolean);
            return [];
        };

        return {
            strengths: toArray(unwrapped.strengths ?? unwrapped.Strengths),
            weaknesses: toArray(unwrapped.weaknesses ?? unwrapped.Weaknesses),
            opportunities: toArray(unwrapped.opportunities ?? unwrapped.Opportunities),
            threats: toArray(unwrapped.threats ?? unwrapped.Threats),
        };
    } catch {
        return null;
    }
}

const SWOT_QUADRANTS = [
    { key: "strengths" as const, label: "Strengths", icon: TrendingUp, border: "border-emerald-200", bg: "bg-emerald-50/60", headerBg: "bg-emerald-100", iconColor: "text-emerald-600", countClass: "bg-emerald-200 text-emerald-800", bullet: "bg-emerald-500" },
    { key: "weaknesses" as const, label: "Weaknesses", icon: TrendingDown, border: "border-red-200", bg: "bg-red-50/60", headerBg: "bg-red-100", iconColor: "text-red-500", countClass: "bg-red-200 text-red-800", bullet: "bg-red-400" },
    { key: "opportunities" as const, label: "Opportunities", icon: Lightbulb, border: "border-blue-200", bg: "bg-blue-50/60", headerBg: "bg-blue-100", iconColor: "text-blue-500", countClass: "bg-blue-200 text-blue-800", bullet: "bg-blue-400" },
    { key: "threats" as const, label: "Threats", icon: AlertTriangle, border: "border-orange-200", bg: "bg-orange-50/60", headerBg: "bg-orange-100", iconColor: "text-orange-500", countClass: "bg-orange-200 text-orange-800", bullet: "bg-orange-400" },
];

interface CompetitorData {
    name: string;
    company_website?: string | null;
    sw_profile?: string | null;
    linkedin_url?: string | null;
    physical_location?: string | null;
    competitor_type?: string;
    target_audience?: string;
    value_proposition?: string;
    pricing_model?: string;
    core_features?: string;
    strengths?: string;
    weaknesses?: string;
}

function parseCompetitorMatrix(raw: unknown): CompetitorData[] | null {
    if (!raw) return null;
    try {
        let obj: any = raw;
        while (typeof obj === "string") {
            obj = JSON.parse(obj);
        }
        const out = obj?.competitor_analysis_document?.json_data || obj?.json_data || obj;
        if (Array.isArray(out)) {
            return out as CompetitorData[];
        }
        return null;
    } catch {
        return null;
    }
}

interface ViewerPayload {
    type: "swot" | "pdf" | "competitor_matrix";
    data?: unknown;
    url?: string;
    name: string;
}

function DocumentViewerModal({ payload, onClose }: { payload: ViewerPayload; onClose: () => void }) {
    const swot = payload.type === "swot" ? parseSwot(payload.data) : null;
    const competitors = payload.type === "competitor_matrix" ? parseCompetitorMatrix(payload.data) : null;

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent
                aria-describedby={undefined}
                style={(payload.type === "competitor_matrix" || payload.type === "swot") ? { width: "95vw", maxWidth: "95vw", height: "94vh" } : undefined}
                className={(payload.type === "competitor_matrix" || payload.type === "swot") ? "p-0 bg-[#F4F1EA] overflow-hidden flex flex-col" : "max-w-[90vw] w-[90vw] h-[90vh] p-0 overflow-hidden flex flex-col"}
            >
                {(payload.type === "competitor_matrix" || payload.type === "swot") && (competitors || swot) ? (
                    <>
                        <DialogHeader className="sr-only">
                            <DialogTitle>{payload.name}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                            <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 bg-black/5 hover:bg-black/10 rounded-full h-8 w-8 z-10 text-[#576238]">
                                <X className="h-4 w-4" />
                            </Button>
                            <div className="bg-white text-black w-full max-w-5xl mx-auto shadow-2xl rounded overflow-hidden relative">
                                {/* Olive header band */}
                                <div className="bg-[#576238] text-white px-10 py-6">
                                    <p className="text-xs uppercase tracking-widest opacity-70 mb-1 font-sans">Spark2Scale</p>
                                    <h1 className="text-xl font-bold font-sans">
                                        {payload.type === "swot" ? "SWOT Analysis" : "Competitor Matrix Analysis"}
                                    </h1>
                                    <p className="text-sm opacity-75 mt-1">{payload.name}</p>
                                </div>
                                {/* Mustard accent stripe */}
                                <div className="h-1.5 bg-[#ffd95d]" />

                                <div className="px-6 md:px-10 py-8 space-y-10">
                                    <p className="text-xs text-gray-400 mb-6">
                                        Generated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                    </p>

                                    {/* Competitor Matrix Content */}
                                    {payload.type === "competitor_matrix" && competitors && (
                                        <div className="space-y-10">
                                            {competitors.map((comp, idx) => (
                                                <section key={idx}>
                                                    <div className="bg-[#576238] text-white px-4 py-2 font-bold text-xs uppercase tracking-widest font-sans rounded-sm flex items-center justify-between mb-2">
                                                        <span>{comp.name}</span>
                                                        {comp.competitor_type && (
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider ${comp.competitor_type.toLowerCase() === 'direct' ? 'bg-red-500/20 text-red-100' : 'bg-white/20 text-white'}`}>
                                                                {comp.competitor_type}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {comp.company_website && (
                                                        <a href={comp.company_website} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mb-2 block ml-1">
                                                            {comp.company_website}
                                                        </a>
                                                    )}
                                                    <table className="w-full border-collapse text-sm mt-1">
                                                        <tbody>
                                                            {[
                                                                ["Value Proposition", comp.value_proposition],
                                                                ["Target Audience", comp.target_audience],
                                                                ["Pricing Model", comp.pricing_model],
                                                                ["Core Features", comp.core_features],
                                                                ["Strengths", comp.strengths],
                                                                ["Weaknesses", comp.weaknesses],
                                                            ].filter(row => row[1]).map(([label, val], i) => (
                                                                <tr key={JSON.stringify(label)} className={i % 2 === 0 ? "bg-[#F4F1EA]" : "bg-white"}>
                                                                    <td className="font-bold text-[#576238] px-4 py-2.5 w-40 border border-gray-200 align-top">
                                                                        {label}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-gray-700 border border-gray-200">
                                                                        {val}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </section>
                                            ))}
                                            {competitors.length === 0 && (
                                                <div className="py-12 text-center text-gray-500 italic">No competitors found.</div>
                                            )}
                                        </div>
                                    )}

                                    {/* SWOT Analysis Content */}
                                    {payload.type === "swot" && swot && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                                            {SWOT_QUADRANTS.map(({ key, label, icon: Icon, border, bg, headerBg, iconColor, countClass, bullet }) => {
                                                const items = swot[key] ?? [];
                                                return (
                                                    <div key={key} className={`rounded-xl border-2 ${border} ${bg} overflow-hidden shadow-sm`}>
                                                        <div className={`${headerBg} px-4 py-3 flex items-center gap-2 border-b ${border}`}>
                                                            <Icon className={`h-4 w-4 ${iconColor}`} />
                                                            <span className="font-semibold text-sm text-gray-800">{label}</span>
                                                            <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${countClass}`}>{items.length}</span>
                                                        </div>
                                                        <ul className="p-4 space-y-3">
                                                            {items.length === 0 ? (
                                                                <li className="text-xs text-muted-foreground italic">No items found.</li>
                                                            ) : items.map((item, i) => (
                                                                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed font-sans">
                                                                    <span className={`mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full ${bullet}`} />
                                                                    {item}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Mustard footer */}
                                <div className="bg-[#ffd95d] px-10 py-3 text-center text-xs font-medium text-[#2c3e50]">
                                    Generated by Spark2Scale AI
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Header fallback for PDF / unknown */}
                        <DialogHeader className="flex-shrink-0 px-6 py-4 bg-[#576238] text-white flex flex-row items-center justify-between">
                            <div>
                                <DialogTitle className="text-base font-bold text-white leading-tight">
                                    Document Viewer — {payload.name}
                                </DialogTitle>
                                <p className="text-xs text-white/60 mt-0.5">
                                    {payload.type === "pdf" ? "PDF Preview" : "Raw Data Viewer"}
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-8 w-8 flex-shrink-0">
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogHeader>

                        {/* Body fallback */}
                        <div className="flex-1 overflow-hidden">
                            {payload.type === "pdf" && payload.url ? (
                                <iframe src={payload.url} className="w-full h-full border-0" title={payload.name} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                    <pre className="bg-gray-50 border rounded p-3 text-xs text-left max-w-lg overflow-auto max-h-64">
                                        {JSON.stringify(payload.data, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DocumentsHistoryPage() {
    const params = useParams();
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewerPayload, setViewerPayload] = useState<ViewerPayload | null>(null);

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
        if (!startupId) { setLoading(false); return; }
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

    useEffect(() => { loadDocuments(); }, [startupId]);

    const getCurrentVersionObj = (doc: any) => {
        if (!doc.versions || doc.versions.length === 0) return null;
        const selectedVid = selectedVersions[doc.type];
        if (!selectedVid) return doc.versions[0];
        return doc.versions.find((v: any) => v.vid === selectedVid) || doc.versions[0];
    };

    const isJsonOnlyDoc = (doc: any) => {
        const version = getCurrentVersionObj(doc);
        const path = version?.path || doc.current_path;
        return !path || path.trim() === "";
    };

    const handleToggleVisibility = async (docType: string, versionId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        setDocuments(documents.map(doc => {
            if (doc.type !== docType) return doc;
            return { ...doc, versions: (doc.versions || []).map((v: any) => v.vid === versionId ? { ...v, is_public: newStatus } : v) };
        }));
        const success = await documentService.toggleVersionVisibility(versionId, newStatus);
        if (!success) { alert("Failed to change visibility settings."); loadDocuments(); }
    };

    const handleUploadSubmit = async () => {
        if (!uploadFile || !uploadName || !uploadType || !startupId) return;

        setIsUploading(true);
        try {
            // 1. Pack the data into FormData exactly as your C# backend expects
            const formData = new FormData();
            formData.append("StartupId", startupId);
            formData.append("DocName", uploadName);
            formData.append("Type", uploadType);
            formData.append("File", uploadFile);

            // 2. Pass the single formData object to the singular documentService
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

    // ============================================================================
    // 🧠 DYNAMIC AI GENERATION LOGIC
    // ============================================================================
    const handleDynamicRender = async (doc: any, action: 'view' | 'download') => {
        try {
            setGeneratingDocId(doc.did);

            const parsedJson = typeof doc.json_response === 'string'
                ? JSON.parse(doc.json_response)
                : doc.json_response;

            // Routed through the .NET backend to avoid the AI server's CORS block.
            const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231').replace(/\/$/, '').replace(/\/api$/, '');
            const reportHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
            if (typeof window !== 'undefined') {
                const t = localStorage.getItem('auth_token');
                if (t) reportHeaders['Authorization'] = `Bearer ${t}`;
            }
            const pdfRes = await fetch(`${apiBase}/api/Pdf/generate-report`, {
                method: 'POST',
                headers: reportHeaders,
                body: JSON.stringify(parsedJson)
            });

            if (!pdfRes.ok) throw new Error("Failed to generate PDF from AI Server");

            const zipBlob = await pdfRes.blob();
            const zip = new JSZip();
            const unzipped = await zip.loadAsync(zipBlob);

            let fileKey;
            if (doc.type.toLowerCase().includes("founder")) {
                fileKey = Object.keys(unzipped.files).find(name => name.includes("F"));
            } else if (doc.type.toLowerCase().includes("investor")) {
                fileKey = Object.keys(unzipped.files).find(name => name.includes("I"));
            }

            if (!fileKey) throw new Error("Target PDF not found in the generated ZIP");

            const pdfBuffer = await unzipped.files[fileKey].async("arraybuffer");
            const properPdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(properPdfBlob);

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
        const isAIEvaluation = (doc.type.toLowerCase().includes('evaluation') || doc.type.toLowerCase() === 'recommendation') && doc.json_response;

        // Condition A: Dynamic Evaluation Generate Document
        if (isAIEvaluation) {
            handleDynamicRender(doc, action);
            return;
        }

        // Condition B: JSON only / SWOT Viewer Base Logic
        if (isJsonOnlyDoc(doc)) {
            if (action === 'view') {
                const docType = doc.type && doc.type.toLowerCase().includes("competitor") ? "competitor_matrix" : "swot";
                setViewerPayload({ type: docType, data: doc.json_response, name: doc.document_name || doc.type });
            } else {
                const jsonStr = typeof doc.json_response === "string" ? doc.json_response : JSON.stringify(doc.json_response, null, 2);
                const blob = new Blob([jsonStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${doc.document_name || doc.type || "document"}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
            return;
        }

        // Condition C: Standard File Open / PDF Viewer (PPT, PDF, etc.)
        const version = getCurrentVersionObj(doc);
        const pathToOpen = version?.path || doc.current_path;

        if (pathToOpen) {
            const isPPT = pathToOpen.toLowerCase().includes('.ppt') ||
                doc.type?.toLowerCase().includes('ppt') ||
                doc.type?.toLowerCase().includes('pitch deck');

            if (action === 'view') {
                if (isPPT) {
                    const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(pathToOpen)}`;
                    window.open(viewerUrl, "_blank");
                } else {
                    setViewerPayload({ type: "pdf", url: pathToOpen, name: doc.document_name || doc.type });
                }
            } else if (action === 'download') {
                window.open(pathToOpen, "_blank");
            }
        } else {
            alert("This document is still processing or has no file attached.");
        }
    };

    const getIcon = (type: string) => {
        const t = type?.toLowerCase() || "";
        if (t.includes("swot")) return "📊";
        if (t.includes("pdf") || t.includes("evaluation") || t.includes("report")) return "📄";
        if (t.includes("excel") || t.includes("financial") || t.includes("cap")) return "📊";
        if (t.includes("ppt") || t.includes("deck")) return "📽️";
        return "📁";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {viewerPayload && (
                <DocumentViewerModal payload={viewerPayload} onClose={() => setViewerPayload(null)} />
            )}

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
                            <p className="text-sm text-muted-foreground">Document version history and access control</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto space-y-8">
                    <div className="grid md:grid-cols-1 gap-6">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <LegoSpinner className="h-8 w-8 animate-spin text-[#576238]" />
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No documents available. Wait for AI to finish or upload one below.
                            </div>
                        ) : documents.map((doc, index) => {
                            const activeVersion = getCurrentVersionObj(doc);
                            const jsonOnly = isJsonOnlyDoc(doc);
                            const isGenerating = generatingDocId === doc.did;
                            const isAIEvaluation = (doc.type.toLowerCase().includes('evaluation') || doc.type.toLowerCase() === 'recommendation') && doc.json_response;

                            return (
                                <motion.div key={doc.did || doc.type || index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                                    <Card className="p-6 border-2 transition-all bg-white hover:border-[#FFD95D]">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="flex items-start gap-4 md:w-1/3">
                                                <div className="text-5xl">{getIcon(doc.type)}</div>
                                                <div className="flex-grow">
                                                    <h3 className="font-bold text-[#576238] text-lg mb-1">{doc.document_name || doc.type}</h3>
                                                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-gray-500">Version:</span>
                                                            <span className="truncate max-w-[150px]">v{activeVersion ? activeVersion.version_number : doc.current_version}</span>
                                                        </div>
                                                        <span>Created: {new Date(activeVersion?.created_at || doc.updated_at || Date.now()).toLocaleDateString()}</span>
                                                        {jsonOnly && (
                                                            <span className="mt-1 inline-flex items-center text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full w-fit">
                                                                AI JSON output
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="md:w-2/3 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-grow">
                                                        <Label className="text-xs text-muted-foreground mb-1 block">Select Version</Label>
                                                        {doc.versions && doc.versions.length > 0 ? (
                                                            <Select
                                                                value={selectedVersions[doc.type] || doc.versions[0]?.vid}
                                                                onValueChange={val => setSelectedVersions({ ...selectedVersions, [doc.type]: val })}
                                                            >
                                                                <SelectTrigger className="w-full h-9"><SelectValue placeholder="Select Version" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {doc.versions.map((v: any) => (
                                                                        <SelectItem key={v.vid} value={v.vid}>
                                                                            v{v.version_number} - {new Date(v.created_at).toLocaleDateString()}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <div className="w-full h-9 border rounded-md bg-gray-50 flex items-center px-3 text-sm text-gray-500">Latest AI Output</div>
                                                        )}
                                                    </div>

                                                    {activeVersion && (
                                                        <div className="flex flex-col items-center">
                                                            <Label className="text-xs text-muted-foreground mb-1 block">Visibility</Label>
                                                            <div className="flex items-center gap-2 border p-1 px-2 rounded-md h-9 bg-gray-50">
                                                                {activeVersion.is_public ? <Globe className="h-4 w-4 text-[#576238]" /> : <Lock className="h-4 w-4 text-gray-400" />}
                                                                <Switch
                                                                    checked={activeVersion.is_public}
                                                                    onCheckedChange={() => handleToggleVisibility(doc.type, activeVersion.vid, activeVersion.is_public)}
                                                                    className="scale-75 data-[state=checked]:bg-[#576238]"
                                                                />
                                                                <span className="text-xs font-medium w-12">{activeVersion.is_public ? "Public" : "Private"}</span>
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
                                                        {isGenerating ? <LegoSpinner className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                                                        {isGenerating ? "Generating..." : (jsonOnly && !isAIEvaluation ? "View Analysis" : "View File")}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAction(doc, 'download')}
                                                        disabled={isGenerating}
                                                        className="flex-1 md:flex-none"
                                                    >
                                                        {isGenerating ? <LegoSpinner className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                                                        Download
                                                    </Button>
                                                    <Button variant="outline" size="sm" disabled={!activeVersion} className="flex-1 md:flex-none">
                                                        <Users className="h-4 w-4 mr-2" /> Permissions
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
                                <div className="text-5xl mb-4 opacity-50">+</div>
                                <h3 className="font-bold text-[#576238]">Upload New Document</h3>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </main>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent aria-describedby={undefined}>
                    <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Document Name</Label>
                            <Input value={uploadName} onChange={e => setUploadName(e.target.value)} />
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
                            <Input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
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