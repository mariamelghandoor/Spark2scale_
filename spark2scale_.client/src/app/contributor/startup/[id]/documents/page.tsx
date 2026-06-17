"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Presentation, ArrowLeft, Upload, FileText, Plus, Eye, Send,
    Trash2, Sparkles, Bot, History, X, User, Maximize2, Minimize2,
    TrendingUp, TrendingDown, Lightbulb, AlertTriangle, Download,
    CheckCircle2, XCircle, Info,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import LegoSpinner from "@/components/lego/LegoSpinner";

import {
    documentsService,
    REQUIRED_DOCS,
    DocState,
    SessionSummary,
    ChatMessage,
} from "@/services/documentsService";
import { generateSwotPDF } from "@/pdf-formats/swotPdf";
import { clearStaleStage } from "@/lib/refinementState";
import { MarketResearchViewer } from "@/components/market-research/MarketResearchViewer";
import { InvestmentMemoView } from "@/components/recommendations/ReportView";

// ---------------------------------------------------------------------------
// Friendly error mapping
// Backend rejections come through apiClient as
//   Error("Request failed (400): \"Market Research document is required...\"")
// so a raw .message would dump the wrapper + JSON-quoted body in the chat.
// This helper pulls the backend message out and maps the well-known ones to
// guidance the user can act on.
// ---------------------------------------------------------------------------
function friendlyDocsError(err: unknown, action: string): string {
    const raw = err instanceof Error ? err.message : "";
    const stripped = raw
        .replace(/^Request failed \(\d+\):\s*/i, "")
        .replace(/^"|"$/g, "")
        .trim();
    const lower = stripped.toLowerCase();

    if (lower.includes("market research document is required")) {
        return "Please complete the Market Research stage first — that report is needed before AI can build this document.";
    }
    if (lower.includes("no actionable changes")) {
        return "There are no pending BMC changes to apply yet. Use Enhance after sending updates in the chat, then try Apply again.";
    }
    if (lower.includes("unauthorized") || raw.includes("(401)") || raw.includes("(403)")) {
        return "You don't have permission to perform this action.";
    }
    if (raw.includes("(404)")) {
        return "We couldn't find the resource needed to continue. Please refresh and try again.";
    }
    if (raw.toLowerCase().includes("fetch") || raw.toLowerCase().includes("network") || raw === "") {
        return `We couldn't reach the server to ${action}. Please check your connection and try again.`;
    }
    return `We couldn't ${action} right now. Please try again in a moment.`;
}

// ---------------------------------------------------------------------------
// Toast System
// ---------------------------------------------------------------------------

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
    id: string;
    type: ToastType;
    title: string;
    message: string;
}

const TOAST_CONFIG: Record<ToastType, {
    border: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
}> = {
    success: {
        border: "border-l-[#639922]",
        iconBg: "bg-[#EAF3DE]",
        iconColor: "text-[#3B6D11]",
        titleColor: "text-[#27500A]",
    },
    error: {
        border: "border-l-[#E24B4A]",
        iconBg: "bg-[#FCEBEB]",
        iconColor: "text-[#A32D2D]",
        titleColor: "text-[#791F1F]",
    },
    warning: {
        border: "border-l-[#BA7517]",
        iconBg: "bg-[#FAEEDA]",
        iconColor: "text-[#854F0B]",
        titleColor: "text-[#633806]",
    },
    info: {
        border: "border-l-[#576238]",
        iconBg: "bg-[#F0EADC]",
        iconColor: "text-[#576238]",
        titleColor: "text-[#576238]",
    },
};

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void; }) {
    return (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
            <AnimatePresence>
                {toasts.map((t) => {
                    const cfg = TOAST_CONFIG[t.type];
                    const iconMap: Record<ToastType, React.ReactNode> = {
                        error: <XCircle className={`h-4 w-4 ${cfg.iconColor}`} />,
                        success: <CheckCircle2 className={`h-4 w-4 ${cfg.iconColor}`} />,
                        warning: <AlertTriangle className={`h-4 w-4 ${cfg.iconColor}`} />,
                        info: <Info className={`h-4 w-4 ${cfg.iconColor}`} />,
                    };
                    return (
                        <motion.div
                            key={t.id}
                            initial={{ x: 120, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 120, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className={`pointer-events-auto flex items-start gap-3 bg-white rounded-xl px-4 py-3.5 min-w-[300px] max-w-[380px] shadow-xl border border-gray-100 border-l-4 ${cfg.border}`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.iconBg}`}>
                                {iconMap[t.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[13px] font-semibold ${cfg.titleColor}`}>{t.title}</p>
                                <p className="text-[12px] text-gray-500 leading-relaxed mt-0.5">{t.message}</p>
                            </div>
                            <button onClick={() => onDismiss(t.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const toast = useCallback((type: ToastType, title: string, message: string, duration = 5000) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }, []);
    const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
    return { toast, toasts, dismissToast };
}

// ---------------------------------------------------------------------------
// Missing Docs Dialog
// ---------------------------------------------------------------------------

function MissingDocsDialog({ open, missingDocs, onClose }: { open: boolean; missingDocs: string[]; onClose: () => void; }) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="p-0 max-w-sm overflow-hidden border-0 shadow-2xl" aria-describedby={undefined}>
                <DialogHeader className="sr-only">
                    <DialogTitle>Cannot Complete Stage</DialogTitle>
                </DialogHeader>
                <div className="bg-[#576238] px-6 py-5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#FFD95D]/25 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-[#FFD95D]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Cannot Complete Stage</h2>
                        <p className="text-xs text-white/65 mt-0.5">Some required documents are missing</p>
                    </div>
                </div>
                <div className="h-[3px] bg-[#FFD95D]" />
                <div className="px-6 py-5">
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                        Please upload or generate the following documents before marking this stage as complete:
                    </p>
                    <div className="bg-[#FCEBEB] border border-[#F7C1C1] rounded-lg px-4 py-3 mb-5">
                        <p className="text-[11px] font-semibold text-[#791F1F] uppercase tracking-wide mb-2">Missing Documents</p>
                        {missingDocs.map((doc, i) => (
                            <div key={i} className="flex items-center gap-2 py-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#E24B4A] flex-shrink-0" />
                                <span className="text-[13px] text-[#A32D2D]">{doc}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={onClose} className="bg-[#576238] hover:bg-[#464f2d] text-white text-sm h-9 px-5">Got it</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Document Viewers & Parsers (Minified for brevity)
// ---------------------------------------------------------------------------
interface SwotData { strengths?: string[]; weaknesses?: string[]; opportunities?: string[]; threats?: string[];[key: string]: unknown; }
function parseSwot(raw: unknown): SwotData | null {
    if (!raw) return null;
    try {
        const obj: Record<string, unknown> = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
        const unwrapped = (obj.swot_document as Record<string, unknown>) || (obj.swot_analysis as Record<string, unknown>) || (obj.swot as Record<string, unknown>) || obj;
        const cleanItem = (s: string): string => s.replace(/\*\*[^*]+\*\*:?\s*/g, "").replace(/\*\*/g, "").trim();
        const toArray = (v: unknown): string[] => { if (Array.isArray(v)) return v.map(i => cleanItem(String(i))).filter(Boolean); if (typeof v === "string") return v.split("\n").map(cleanItem).filter(Boolean); return []; };
        return { strengths: toArray(unwrapped.strengths ?? unwrapped.Strengths), weaknesses: toArray(unwrapped.weaknesses ?? unwrapped.Weaknesses), opportunities: toArray(unwrapped.opportunities ?? unwrapped.Opportunities), threats: toArray(unwrapped.threats ?? unwrapped.Threats) };
    } catch { return null; }
}

const SWOT_QUADRANTS = [
    { key: "strengths" as const, label: "Strengths", icon: TrendingUp, border: "border-emerald-200", bg: "bg-emerald-50/60", headerBg: "bg-emerald-100", iconColor: "text-emerald-600", countClass: "bg-emerald-200 text-emerald-800", bullet: "bg-emerald-500" },
    { key: "weaknesses" as const, label: "Weaknesses", icon: TrendingDown, border: "border-red-200", bg: "bg-red-50/60", headerBg: "bg-red-100", iconColor: "text-red-500", countClass: "bg-red-200 text-red-800", bullet: "bg-red-400" },
    { key: "opportunities" as const, label: "Opportunities", icon: Lightbulb, border: "border-blue-200", bg: "bg-blue-50/60", headerBg: "bg-blue-100", iconColor: "text-blue-500", countClass: "bg-blue-200 text-blue-800", bullet: "bg-blue-400" },
    { key: "threats" as const, label: "Threats", icon: AlertTriangle, border: "border-orange-200", bg: "bg-orange-50/60", headerBg: "bg-orange-100", iconColor: "text-orange-500", countClass: "bg-orange-200 text-orange-800", bullet: "bg-orange-400" },
];

interface CompetitorData { name: string; company_website?: string | null; sw_profile?: string | null; linkedin_url?: string | null; physical_location?: string | null; competitor_type?: string; target_audience?: string; value_proposition?: string; pricing_model?: string; core_features?: string; strengths?: string; weaknesses?: string; }
function parseCompetitorMatrix(raw: unknown): CompetitorData[] | null {
    if (!raw) return null;
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let obj: any = raw;
        while (typeof obj === "string") obj = JSON.parse(obj);
        const out = obj?.competitor_analysis_document?.json_data || obj?.json_data || obj;
        if (Array.isArray(out)) return out as CompetitorData[];
        return null;
    } catch { return null; }
}

interface BmcData { value_proposition?: string[]; customer_segments?: string[]; revenue_streams?: string[]; channels?: string[]; customer_relationships?: string[]; key_resources?: string[]; key_activities?: string[]; key_partnerships?: string[]; cost_structure?: string[];[key: string]: unknown; }
function parseBmc(raw: unknown): BmcData | null {
    if (!raw) return null;
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let obj: any = raw;
        while (typeof obj === "string") obj = JSON.parse(obj);
        const canvas = (obj?.business_model_canvas as Record<string, unknown>) || obj;
        const toArray = (v: unknown): string[] => { if (Array.isArray(v)) return v.map(i => String(i).trim()).filter(Boolean); if (typeof v === "string") return v.split("\n").map(s => s.trim()).filter(Boolean); return []; };
        return { value_proposition: toArray(canvas?.value_proposition), customer_segments: toArray(canvas?.customer_segments), revenue_streams: toArray(canvas?.revenue_streams), channels: toArray(canvas?.channels), customer_relationships: toArray(canvas?.customer_relationships), key_resources: toArray(canvas?.key_resources), key_activities: toArray(canvas?.key_activities), key_partnerships: toArray(canvas?.key_partnerships), cost_structure: toArray(canvas?.cost_structure) };
    } catch { return null; }
}

const BMC_BOXES: { key: keyof BmcData; label: string; col: string; row: string; }[] = [
    { key: "key_partnerships", label: "Key Partnerships", col: "1 / 3", row: "1 / 5" },
    { key: "key_activities", label: "Key Activities", col: "3 / 5", row: "1 / 3" },
    { key: "key_resources", label: "Key Resources", col: "3 / 5", row: "3 / 5" },
    { key: "value_proposition", label: "Value Proposition", col: "5 / 7", row: "1 / 5" },
    { key: "customer_relationships", label: "Customer Relationships", col: "7 / 9", row: "1 / 3" },
    { key: "channels", label: "Channels", col: "7 / 9", row: "3 / 5" },
    { key: "customer_segments", label: "Customer Segments", col: "9 / 11", row: "1 / 5" },
    { key: "cost_structure", label: "Cost Structure", col: "1 / 6", row: "5 / 7" },
    { key: "revenue_streams", label: "Revenue Streams", col: "6 / 11", row: "5 / 7" },
];

function renderBmcCanvas(bmc: BmcData, ideaName: string): HTMLCanvasElement {
    const W = 2000; const H = 1300; const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas 2D not supported");
    const PRIMARY = "#576238"; const ACCENT = "#ffd95d"; const PAGE_BG = "#F0EADC"; const BODY_BG = "#FAF6EC"; const TEXT = "#2c3e50";
    ctx.fillStyle = PAGE_BG; ctx.fillRect(0, 0, W, H);
    const GRID_COLS = 10; const GRID_ROWS = 6; const HEADER_UNITS = 1.2; const TOTAL_UNITS_Y = GRID_ROWS + HEADER_UNITS;
    const MARGIN_X = 50; const MARGIN_Y = 50; const innerW = W - 2 * MARGIN_X; const innerH = H - 2 * MARGIN_Y;
    const unitX = innerW / GRID_COLS; const unitY = innerH / TOTAL_UNITS_Y;
    const toY = (y: number, h: number) => MARGIN_Y + (TOTAL_UNITS_Y - (y + h)) * unitY;
    const headerCenterY = MARGIN_Y + (HEADER_UNITS / 2) * unitY;
    ctx.fillStyle = PRIMARY; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold 44px Arial, sans-serif";
    ctx.fillText("Business Model Canvas", W / 2, headerCenterY - 18);
    ctx.fillStyle = TEXT; ctx.font = "bold 28px Arial, sans-serif";
    const prettyIdea = (ideaName || "").split(/\s+/).map(w => (w ? w[0].toUpperCase() + w.slice(1) : "")).join(" ");
    ctx.fillText(prettyIdea, W / 2, headerCenterY + 22);
    const TITLE_H = 40; const ACCENT_H = 6; const PAD = 16; const LINE_H = 22;
    const BODY_FONT = "16px Arial, sans-serif"; const TITLE_FONT = "bold 18px Arial, sans-serif";
    const wrapLine = (text: string, maxWidth: number): string[] => {
        const words = text.split(/\s+/); const lines: string[] = []; let cur = "";
        for (const w of words) { const test = cur ? `${cur} ${w}` : w; if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; } else { cur = test; } }
        if (cur) lines.push(cur); return lines;
    };
    for (const { key, label, col, row } of BMC_BOXES) {
        const [colStart, colEnd] = col.split("/").map(s => parseInt(s.trim(), 10)); const [rowStart, rowEnd] = row.split("/").map(s => parseInt(s.trim(), 10));
        const x = colStart - 1; const w = colEnd - colStart; const mplH = rowEnd - rowStart; const mplY = GRID_ROWS - (rowEnd - 1);
        const px = MARGIN_X + x * unitX; const py = toY(mplY, mplH); const pw = w * unitX; const ph = mplH * unitY;
        ctx.fillStyle = BODY_BG; ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = PRIMARY; ctx.lineWidth = 2; ctx.strokeRect(px, py, pw, ph);
        ctx.fillStyle = PRIMARY; ctx.fillRect(px, py, pw, TITLE_H);
        ctx.fillStyle = ACCENT; ctx.fillRect(px, py + TITLE_H, pw, ACCENT_H);
        ctx.fillStyle = ACCENT; ctx.font = TITLE_FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(label, px + pw / 2, py + TITLE_H / 2);
        const items = (bmc[key] as string[] | undefined) ?? [];
        ctx.font = BODY_FONT; ctx.textAlign = "left"; ctx.textBaseline = "top";
        const bodyX = px + PAD; const maxTextW = pw - 2 * PAD; const bodyTop = py + TITLE_H + ACCENT_H + PAD; const bodyBottom = py + ph - PAD; let cursorY = bodyTop;
        if (items.length === 0) { ctx.fillStyle = "#888"; ctx.fillText("(no data)", bodyX, cursorY); continue; }
        ctx.fillStyle = TEXT;
        for (const item of items) {
            const lines = wrapLine(`• ${String(item)}`, maxTextW);
            for (let i = 0; i < lines.length; i++) { if (cursorY + LINE_H > bodyBottom) break; const text = i === 0 ? lines[i] : `   ${lines[i]}`; ctx.fillText(text, bodyX, cursorY); cursorY += LINE_H; }
            if (cursorY + LINE_H > bodyBottom) break;
        }
    }
    return canvas;
}

interface ViewerPayload { type: "swot" | "pdf" | "competitor_matrix" | "bmc" | "json" | "recommendation" | "market_research"; data?: unknown; url?: string; name: string; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GenericJsonRenderer = ({ data }: { data: any }) => {
    if (typeof data !== 'object' || data === null) {
        return <p className="text-sm text-gray-700 whitespace-pre-wrap">{String(data)}</p>;
    }
    if (Array.isArray(data)) {
        return (
            <ul className="list-disc pl-5 space-y-2">
                {data.map((item, i) => (
                    <li key={i}><GenericJsonRenderer data={item} /></li>
                ))}
            </ul>
        );
    }
    return (
        <div className="space-y-4">
            {Object.entries(data).map(([key, value]) => {
                // Skip rendering empty objects or internal ids if desired, but we render all for safety
                if (value === null || value === undefined) return null;
                return (
                    <div key={key} className="mb-2">
                        <h4 className="font-bold text-[#576238] capitalize mb-1 text-sm border-b pb-1">
                            {key.replace(/_/g, ' ')}
                        </h4>
                        <div className="pt-1">
                            {typeof value === 'object' ? (
                                <div className="pl-4 border-l-2 border-[#ffd95d] mt-2">
                                    <GenericJsonRenderer data={value} />
                                </div>
                            ) : (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{String(value)}</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

function DocumentViewerModal({ payload, onClose }: { payload: ViewerPayload; onClose: () => void; }) {
    const swot = payload.type === "swot" ? parseSwot(payload.data) : null;
    const competitors = payload.type === "competitor_matrix" ? parseCompetitorMatrix(payload.data) : null;
    const bmc = payload.type === "bmc" ? parseBmc(payload.data) : null;
    const isStructured = payload.type === "competitor_matrix" || payload.type === "swot" || payload.type === "bmc" || payload.type === "json" || payload.type === "recommendation" || payload.type === "market_research";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedPayloadData = (() => { try { let obj: any = payload.data; while (typeof obj === "string") obj = JSON.parse(obj); return obj || {}; } catch { return {}; } })();

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent aria-describedby={undefined} style={isStructured ? { width: "95vw", maxWidth: "95vw", height: "94vh" } : undefined} className={isStructured ? "p-0 bg-[#F4F1EA] overflow-hidden flex flex-col [&>button]:hidden" : "max-w-[90vw] w-[90vw] h-[90vh] p-0 overflow-hidden flex flex-col [&>button]:hidden"}>
                {isStructured && (competitors || swot || bmc || payload.type === "json" || payload.type === "recommendation" || payload.type === "market_research") ? (
                    <>
                        <DialogHeader className="sr-only"><DialogTitle>{payload.name}</DialogTitle></DialogHeader>
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                            <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 bg-black/5 hover:bg-black/10 rounded-full h-8 w-8 z-10 text-[#576238]"><X className="h-4 w-4" /></Button>
                            <div className="bg-white text-black w-full max-w-5xl mx-auto shadow-2xl rounded overflow-hidden relative">
                                <div className="bg-[#576238] text-white px-10 py-6">
                                    <p className="text-xs uppercase tracking-widest opacity-70 mb-1 font-sans">Spark2Scale</p>
                                    <h1 className="text-xl font-bold font-sans">
                                        {payload.type === "swot" ? "SWOT Analysis" : payload.type === "bmc" ? "Business Model Canvas" : payload.type === "competitor_matrix" ? "Competitor Matrix Analysis" : payload.type === "recommendation" ? "Recommendation (AI Analysis)" : payload.type === "market_research" ? "Market Research Analysis" : "Document Data View"}
                                    </h1>
                                    <p className="text-sm opacity-75 mt-1">{payload.name}</p>
                                </div>
                                <div className="h-1.5 bg-[#ffd95d]" />
                                <div className="px-6 md:px-10 py-8 space-y-10">
                                    <p className="text-xs text-gray-400 mb-6">Generated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", })}</p>
                                    {payload.type === "competitor_matrix" && competitors && (
                                        <div className="space-y-10">
                                            {competitors.map((comp, idx) => (
                                                <section key={idx}>
                                                    <div className="bg-[#576238] text-white px-4 py-2 font-bold text-xs uppercase tracking-widest font-sans rounded-sm flex items-center justify-between mb-2">
                                                        <span>{comp.name}</span>
                                                        {comp.competitor_type && (
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider ${comp.competitor_type.toLowerCase() === "direct" ? "bg-red-500/20 text-red-100" : "bg-white/20 text-white"}`}>
                                                                {comp.competitor_type}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {comp.company_website && <a href={comp.company_website} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mb-2 block ml-1">{comp.company_website}</a>}
                                                    <table className="w-full border-collapse text-sm mt-1">
                                                        <tbody>
                                                            {[
                                                                ["Value Proposition", comp.value_proposition], ["Target Audience", comp.target_audience], ["Pricing Model", comp.pricing_model], ["Core Features", comp.core_features], ["Strengths", comp.strengths], ["Weaknesses", comp.weaknesses],
                                                            ].filter(row => row[1]).map(([label, val], i) => (
                                                                <tr key={JSON.stringify(label)} className={i % 2 === 0 ? "bg-[#F4F1EA]" : "bg-white"}>
                                                                    <td className="font-bold text-[#576238] px-4 py-2.5 w-40 border border-gray-200 align-top">{label}</td>
                                                                    <td className="px-4 py-2.5 text-gray-700 border border-gray-200">{val}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </section>
                                            ))}
                                            {competitors.length === 0 && <div className="py-12 text-center text-gray-500 italic">No competitors found.</div>}
                                        </div>
                                    )}
                                    {payload.type === "bmc" && bmc && (
                                        <div className="pb-6" style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gridTemplateRows: "repeat(6, minmax(90px, 1fr))", gap: "6px", minHeight: "720px", }}>
                                            {BMC_BOXES.map(({ key, label, col, row }) => {
                                                const items = (bmc[key] as string[] | undefined) ?? [];
                                                return (
                                                    <div key={String(key)} className="flex flex-col overflow-hidden border border-[#576238]" style={{ gridColumn: col, gridRow: row, backgroundColor: "#FAF6EC", }}>
                                                        <div className="px-3 py-2 flex items-center justify-center" style={{ backgroundColor: "#576238" }}>
                                                            <span className="font-bold text-xs uppercase tracking-wider" style={{ color: "#ffd95d" }}>{label}</span>
                                                        </div>
                                                        <div style={{ height: "4px", backgroundColor: "#ffd95d" }} />
                                                        <ul className="p-3 space-y-1.5 flex-1 overflow-auto">
                                                            {items.length === 0 ? <li className="text-[11px] italic" style={{ color: "#888" }}>(no data)</li> : items.map((item, i) => (
                                                                <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug" style={{ color: "#2c3e50" }}><span className="flex-shrink-0">•</span><span>{item}</span></li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
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
                                                            {items.length === 0 ? <li className="text-xs text-muted-foreground italic">No items found.</li> : items.map((item, i) => (
                                                                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed font-sans"><span className={`mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full ${bullet}`} />{item}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {payload.type === "json" && payload.data && (
                                        <div className="pb-6">
                                            <GenericJsonRenderer data={payload.data} />
                                        </div>
                                    )}
                                    {payload.type === "recommendation" && parsedPayloadData && (
                                        <div className="pb-6"><InvestmentMemoView data={parsedPayloadData} /></div>
                                    )}
                                    {payload.type === "market_research" && parsedPayloadData && (
                                        <div className="pb-6 -mt-8"><MarketResearchViewer data={parsedPayloadData} /></div>
                                    )}
                                </div>
                                <div className="bg-[#ffd95d] px-10 py-3 text-center text-xs font-medium text-[#2c3e50]">Generated by Spark2Scale AI</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <DialogHeader className="flex-shrink-0 px-6 py-4 bg-[#576238] text-white flex flex-row items-center justify-between">
                            <div>
                                <DialogTitle className="text-base font-bold text-white leading-tight">Document Viewer — {payload.name}</DialogTitle>
                                <p className="text-xs text-white/60 mt-0.5">{payload.type === "pdf" ? "Presentation Preview" : "Raw Data Viewer"}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-8 w-8 flex-shrink-0"><X className="h-4 w-4" /></Button>
                        </DialogHeader>
                        <div className="flex-1 overflow-hidden bg-white">
                            {payload.type === "pdf" && payload.url ? <iframe src={payload.url} className="w-full h-full border-0" title={payload.name} /> : (
                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                    <div className="text-center space-y-2"><p>Could not load the document view.</p></div>
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

export default function DocumentsPage() {
    const params = useParams();
    const router = useRouter();
    const auth = useAuth();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const userRole = auth?.user?.role;

    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const editPptInputRef = useRef<HTMLInputElement | null>(null);

    const { toast, toasts, dismissToast } = useToast();
    const [missingDocsDialog, setMissingDocsDialog] = useState<{ open: boolean; docs: string[]; }>({ open: false, docs: [] });

    const [docStates, setDocStates] = useState<DocState[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isWorkflowComplete, setIsWorkflowComplete] = useState(false);

    // PPT State
    const [isPptGenerating, setIsPptGenerating] = useState(false);
    const [isPptEditing, setIsPptEditing] = useState(false);
    const [pptUrl, setPptUrl] = useState<string | null>(null);
    const [viewerPayload, setViewerPayload] = useState<ViewerPayload | null>(null);

    // Chat State
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [chatSessionId, setChatSessionId] = useState<string | null>(null);
    const [chatContext, setChatContext] = useState<string>(REQUIRED_DOCS[0]?.id || "pitch_deck");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [showChatHistory, setShowChatHistory] = useState(false);
    const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isChatMaximized, setIsChatMaximized] = useState(false);

    const [manageAccessDialog, setManageAccessDialog] = useState(false);
    const [accessEmail, setAccessEmail] = useState("");

    const getCleanId = () => {
        const rawParam = params.id;
        if (!rawParam) return null;
    const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
        return decodeURIComponent(rawId).replace(/\s/g, "");
    };
    const cleanId = getCleanId();
    
    const primaryBtn = "bg-[#576238] hover:bg-[#464f2d] text-white shadow-sm";
    const outlineBtn = "border-gray-200 hover:bg-[#576238]/5 hover:border-[#576238]/40 hover:text-[#576238]";

    const fetchData = async () => {
        if (!cleanId) return;
        setIsLoadingData(true);
        try {
            const [dbDocs, workflowState] = await Promise.all([
                documentsService.getDocuments(cleanId),
                documentsService.getWorkflow(cleanId),
            ]);

            const pptDoc = dbDocs.find((d) => d.type.toLowerCase() === "pitch deck (ppt)");
            if (pptDoc?.current_path) setPptUrl(pptDoc.current_path);

            const matchedDocIds = new Set<string>();

            const mergedState: DocState[] = REQUIRED_DOCS.map((req) => {
                const match = dbDocs.find((d) => d.type.toLowerCase() === req.name.toLowerCase());
                if (match) {
                    matchedDocIds.add(match.did);
                    return {
                        configId: req.id,
                        dbId: match.did,
                        isUploaded: true,
                        name: match.document_name || match.type,
                        path: match.current_path,
                        version: match.current_version,
                        date: match.created_at,
                        jsonResponse: match.json_response,
                    };
                }
                return { configId: req.id, isUploaded: false, name: req.name };
            });

            setDocStates(mergedState);
            if (workflowState) {
                setIsWorkflowComplete(workflowState.documents === true || workflowState.Documents === true);
            }
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [cleanId]);

    // -----------------------------------------------------------------------
    // Chat System Integration
    // -----------------------------------------------------------------------
    useEffect(() => {
        const initChat = async () => {
            if (!cleanId) return;
            const list = await documentsService.getChatSessions(cleanId);
            setSessions(list);

            // If they have previous sessions, let's load the latest one.
            // If list.length === 0, we intentionally DO NOT auto-create a session anymore.
            // This leaves chatSessionId = null, triggering our Zero State UI.
            if (list.length > 0 && !chatSessionId) {
                loadChatMessages(list[0].sessionId);
            }
        };
        initChat();
    }, [cleanId]);

    // Helper to ensure a session is open for a specific document context
    // This is used by the 'Generate' buttons to automatically open the chat
    const ensureSessionForDocument = async (docId: string): Promise<string | null> => {
        const docConfig = REQUIRED_DOCS.find((d) => d.id === docId);
        if (!docConfig || !cleanId) return null;

        setChatContext(docId);

        let targetSessionId = chatSessionId;
        const existingSession = sessions.find((s) => s.sessionName.startsWith(docConfig.name));

        if (existingSession) {
            targetSessionId = existingSession.sessionId;
            if (chatSessionId !== existingSession.sessionId) {
                await loadChatMessages(existingSession.sessionId);
            }
        } else {
            setIsChatLoading(true);
            const newSession = await documentsService.startNewSession(cleanId, docConfig.name);
            if (newSession) {
                setSessions((prev) => [newSession, ...prev]);
                targetSessionId = newSession.sessionId;
                setChatSessionId(newSession.sessionId);
                setMessages([]);
            }
            setIsChatLoading(false);
        }
        return targetSessionId;
    };

    const handleContextSwitch = (newContextId: string) => {
        setChatContext(newContextId);
        const docConfig = REQUIRED_DOCS.find((d) => d.id === newContextId);
        const docName = docConfig ? docConfig.name : "Document";
        const existingSession = sessions.find((s) => s.sessionName.startsWith(docName));

        if (existingSession) {
            loadChatMessages(existingSession.sessionId);
        } else {
            // Document context switched to one with no session. 
            // Clear current chat to display the Zero State UI
            setChatSessionId(null);
            setMessages([]);
        }
    };

    const startNewChatSession = async (contextOverride?: string) => {
        if (!cleanId) return;
        const targetContextId = contextOverride || chatContext;
        const docConfig = REQUIRED_DOCS.find((d) => d.id === targetContextId);
        const docName = docConfig ? docConfig.name : "Document";

        setIsChatLoading(true);
        const newSession = await documentsService.startNewSession(cleanId, docName);

        if (newSession) {
            setSessions((prev) => [newSession, ...prev]);
            setChatSessionId(newSession.sessionId);
            setMessages([
                {
                    role: "assistant",
                    content: `Hello! I am your AI Assistant. Let's talk about your ${docName}.`,
                },
            ]);
            setShowChatHistory(false);
        }
        setIsChatLoading(false);
    };

    const loadChatMessages = async (sessionId: string) => {
        setIsChatLoading(true);
        setChatSessionId(sessionId);
        setShowChatHistory(false);
        try {
            const history = await documentsService.getMessages(sessionId);
            setMessages(history);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleSendMessage = async (textOverride?: string) => {
        const contentToSend = textOverride || newMessage;
        if (!contentToSend.trim() || !chatSessionId) return;

        if (!textOverride) setNewMessage("");

        setMessages((prev) => [...prev, { role: "user", content: contentToSend }]);
        await documentsService.sendMessage(chatSessionId, contentToSend, "user");
        setIsTyping(true);

        try {
            const selectedDoc = docStates.find((d) => d.configId === chatContext);

            let fileData = "";
            if (selectedDoc?.jsonResponse) {
                fileData = typeof selectedDoc.jsonResponse === "string" ? selectedDoc.jsonResponse : JSON.stringify(selectedDoc.jsonResponse);
            } else if (selectedDoc?.path) {
                fileData = selectedDoc.path;
            } else if (chatContext === "pitch_deck" && pptUrl) {
                fileData = pptUrl;
            } else {
                throw new Error("No data found for this document.");
            }

            const aiResponse = await fetch("https://spark2scale-ai-api-server.azurewebsites.net/api/v1/document-chat/test-document-qa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file_path: fileData,
                    query: contentToSend,
                    provider: "modal",
                    document_type: chatContext,
                    chat_history: messages.slice(-5)
                })
            });

            if (!aiResponse.ok) throw new Error("AI Server Error");

            const aiData = await aiResponse.json();
            const finalAnswer = aiData.answer || "I couldn't find an answer in this document.";

            setMessages((prev) => [...prev, { role: "assistant", content: finalAnswer }]);
            await documentsService.sendMessage(chatSessionId, finalAnswer, "assistant");
        } catch {
            toast("error", "AI Assistant Error", "Could not connect to the AI Assistant. Please try again.");
            setMessages((prev) => [...prev, { role: "assistant", content: "Error: Could not connect to the AI Assistant or document is empty." }]);
        } finally {
            setIsTyping(false);
        }
    };

    // -----------------------------------------------------------------------
    // Generation Handlers
    // -----------------------------------------------------------------------
    const handleGeneratePPT = async () => {
        if (!cleanId) return;

        // 1. Force the chat UI to open and connect to the Pitch Deck session
        const activeSessionId = await ensureSessionForDocument("pitch_deck");

        setIsPptGenerating(true);

        // 2. Add the user prompt to the chat organically
        const userMsg = "Generate the Pitch Deck (PPT) for me.";
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        if (activeSessionId) await documentsService.sendMessage(activeSessionId, userMsg, "user");
        setIsTyping(true);

        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
            const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5231";
            const response = await fetch(`${API_BASE}/api/PptGeneration/generate/${cleanId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                setPptUrl(data.url || data.ppt_url || null);
                await fetchData();

                // 3. AI responds directly in chat with success
                const assistantMsg = "Successfully generated the Pitch Deck (PPT). It is now available in your documents list.";
                setMessages((prev) => [...prev, { role: "assistant", content: assistantMsg }]);
                if (activeSessionId) await documentsService.sendMessage(activeSessionId, assistantMsg, "assistant");
                toast("success", "Pitch Deck Generated", "Your PPT has been generated successfully.");
            } else {
                const errText = await response.text();
                const failMsg = `Error: Could not generate document. ${errText}`;
                setMessages((prev) => [...prev, { role: "assistant", content: failMsg }]);
                if (activeSessionId) await documentsService.sendMessage(activeSessionId, failMsg, "assistant");
                toast("error", "Generation Failed", errText || "Something went wrong. Please try again.");
            }
        } catch {
            const netErr = "Connection error while trying to generate Pitch Deck.";
            setMessages((prev) => [...prev, { role: "assistant", content: netErr }]);
            if (activeSessionId) await documentsService.sendMessage(activeSessionId, netErr, "assistant");
            toast("error", "Connection Error", "Could not reach the server. Please try again.");
        }
    };

    const handleSimulateGeneration = async (docId: string) => {
        if (!cleanId) return;
        const docConfig = REQUIRED_DOCS.find((d) => d.id === docId);
        if (!docConfig) return;

        // 1. Force chat UI to link and open the correct document session
        const activeSessionId = await ensureSessionForDocument(docId);

        setIsGeneratingDoc(true);

        // 2. Add organic user request prompt
        const userMsg = `Generate the ${docConfig.name} for me.`;
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        if (activeSessionId) await documentsService.sendMessage(activeSessionId, userMsg, "user");
        setIsTyping(true);

        try {
            let success = false;
            if (docId === "swot") {
                success = await documentsService.generateSwot(cleanId);
            } else if (docId === "competitor_matrix") {
                success = await documentsService.generateCompetitorMatrix(cleanId);
            } else if (docId === "bmc") {
                success = await documentsService.generateBmc(cleanId);
            } else {
                success = await documentsService.generateMockDocument(cleanId, docConfig.name);
            }

            if (success) {
                await fetchData();
                // Regenerating any doc clears the "refresh suggested" hint on
                // the Documents stage in the dashboard.
                if (cleanId) clearStaleStage(cleanId, "documents");
                // 3. AI responds with success in the chat
                const assistantMsg = `Successfully generated the ${docConfig.name}. It is now available in your documents list.`;
                setMessages((prev) => [...prev, { role: "assistant", content: assistantMsg }]);
                if (activeSessionId) await documentsService.sendMessage(activeSessionId, assistantMsg, "assistant");

                toast("success", "Document Generated", `${docConfig.name} has been generated successfully.`);
            } else {
                const failMsg = `We couldn't generate the ${docConfig.name} right now. Please try again in a moment.`;
                setMessages((prev) => [...prev, { role: "assistant", content: failMsg }]);
                if (activeSessionId) await documentsService.sendMessage(activeSessionId, failMsg, "assistant");

                toast("error", "Generation Failed", failMsg);
            }
        } catch (err) {
            const friendly = friendlyDocsError(err, `generate the ${docConfig.name}`);
            setMessages((prev) => [...prev, { role: "assistant", content: friendly }]);
            if (activeSessionId) await documentsService.sendMessage(activeSessionId, friendly, "assistant");
            toast("error", "Generation Failed", friendly);
        } finally {
            setIsGeneratingDoc(false);
            setIsTyping(false);
        }
    };

    const handleEditPPT = async (file: File) => {
        if (!cleanId) return;
        setIsPptEditing(true);
        try {
            const formData = new FormData();
            formData.append("startup_id", cleanId);
            formData.append("ppt_file", file);
            formData.append("use_default_colors", "true");

            const response = await fetch("https://spark2scale-ai-api-server.azurewebsites.net/api/v1/ppt/edit", { method: "POST", body: formData });

            if (response.ok) {
                const data = await response.json();
                setPptUrl(data.ppt_path ?? data.ppt_url ?? null);
                await fetchData();
                toast("success", "Pitch Deck Enhanced", "Your PPT has been enhanced with AI styles.");
            } else {
                const errText = await response.text();
                toast("error", "Enhancement Failed", errText || "Could not enhance the file. Please try again.");
            }
        } catch {
            toast("error", "Connection Error", "Could not reach the server. Please try again.");
        } finally {
            setIsPptEditing(false);
        }
    };

    // -----------------------------------------------------------------------
    // Chat Enhancement Handlers
    // -----------------------------------------------------------------------
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isApplyingBmc, setIsApplyingBmc] = useState(false);

    const handleApplyBmcChanges = async () => {
        if (!cleanId || !chatSessionId || isApplyingBmc) return;
        setIsApplyingBmc(true);
        try {
            const result = await documentsService.applyBmcChanges(cleanId, chatSessionId);
            if (!result) {
                setMessages(prev => [...prev, { role: "assistant", content: "We couldn't apply the BMC changes right now. Please try again in a moment." }]);
                return;
            }

            const changeLog = Array.isArray(result.change_log) ? result.change_log : [];
            const header = "BMC updated. Change log:";
            const body = changeLog.length > 0 ? changeLog.map(c => `• ${c}`).join("\n") : "• (no change log returned)";

            setMessages(prev => [...prev, { role: "assistant", content: `${header}\n\n${body}` }]);
            await fetchData();
        } catch (err) {
            setMessages(prev => [...prev, { role: "assistant", content: friendlyDocsError(err, "apply the BMC changes") }]);
        } finally {
            setIsApplyingBmc(false);
        }
    };

    const handleEnhanceMessage = async () => {
        if (!chatSessionId || isEnhancing) return;
        setIsEnhancing(true);
        try {
            const result = await documentsService.enhanceSession(chatSessionId);
            if (!result) {
                setMessages(prev => [...prev, { role: "assistant", content: "We couldn't enhance this chat right now. Please try again in a moment." }]);
                return;
            }
            if (result.status === "NoChanges") {
                setMessages(prev => [...prev, { role: "assistant", content: "No new messages to summarize since the last enhancement." }]);
                return;
            }

            let changes: string[] = [];
            try {
                const parsed = result.summarizedChat ? (typeof result.summarizedChat === "string" ? JSON.parse(result.summarizedChat) : result.summarizedChat) : null;
                if (parsed && Array.isArray(parsed.document_changes)) changes = parsed.document_changes as string[];
            } catch {
                // Ignore parse errors if summarizedChat is not valid JSON
            }

            if (changes.length === 0) {
                // Empty document_changes is a normal outcome — the chat didn't include
                // anything actionable. Don't dump the raw summary JSON on the user.
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: "No new BMC changes were detected in the recent chat. Share specific updates you'd like applied (e.g. \"change the customer segment to enterprise teams\") and try Enhance again."
                }]);
                return;
            }

            const summaryText = changes.map((c, i) => `${i + 1}. ${c}`).join("\n");
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `Enhanced summary — requested document changes:\n\n${summaryText}\n\nClick **Apply changes to BMC** to update the canvas.`
            }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: "assistant", content: friendlyDocsError(err, "enhance this chat") }]);
        } finally {
            setIsEnhancing(false);
        }
    };

    // -----------------------------------------------------------------------
    // Utility Status
    // -----------------------------------------------------------------------
    const isCurrentDocGenerated = chatContext === "pitch_deck" ? !!pptUrl : docStates.find((d) => d.configId === chatContext)?.isUploaded || false;
    const getCurrentContextName = () => REQUIRED_DOCS.find((d) => d.id === chatContext)?.name || "Document";

    // -----------------------------------------------------------------------
    // Actions (Upload, Delete, View)
    // -----------------------------------------------------------------------
    const triggerUpload = (configId: string) => fileInputRefs.current[configId]?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, config: (typeof REQUIRED_DOCS)[0]) => {
        if (!e.target.files || e.target.files.length === 0 || !cleanId) return;
        const file = e.target.files[0];
        setUploadingId(config.id);
        const currentState = docStates.find((d) => d.configId === config.id);
        const existingDbId = currentState?.isUploaded && currentState.dbId ? currentState.dbId : undefined;
        try {
            const success = await documentsService.uploadDocument(cleanId, config.name, file, existingDbId);
            if (success) {
                await fetchData();
                toast("success", "Upload Successful", `${config.name} has been uploaded successfully.`);
            } else {
                toast("error", "Upload Failed", "The file could not be uploaded. Please try again.");
            }
        } finally {
            setUploadingId(null);
        }
    };

    const handleDelete = async (dbId?: string) => {
        if (!dbId) return;
        const docStateToDelete = docStates.find((d) => d.dbId === dbId);
        const deletedConfigId = docStateToDelete?.configId;
        setDeletingId(dbId);
        try {
            const success = await documentsService.deleteDocument(dbId);
            if (success) {
                await fetchData();
                toast("info", "Document Deleted", "The document has been removed.");
                if (deletedConfigId) {
                    setChatSessionId(null);
                    setChatContext(deletedConfigId);
                    setMessages([]);
                }
            } else {
                toast("error", "Delete Failed", "Could not delete the document. Please try again.");
            }
        } finally {
            setDeletingId(null);
        }
    };

    const handleView = (state: DocState) => {
        if (state.path && state.path.trim() !== "") {
            setViewerPayload({ type: "pdf", url: state.path, name: state.name });
            return;
        }
        if (state.jsonResponse) {
            if (state.configId === "competitor_matrix") {
                setViewerPayload({ type: "competitor_matrix", data: state.jsonResponse, name: state.name });
                return;
            }
            if (state.configId === "bmc") {
                setViewerPayload({ type: "bmc", data: state.jsonResponse, name: state.name });
                return;
            }
            if (state.configId === "swot") {
                setViewerPayload({ type: "swot", data: state.jsonResponse, name: state.name });
                return;
            }
            if (state.configId === "market_research" || (state.name && state.name.toLowerCase().includes("market"))) {
                setViewerPayload({ type: "market_research", data: state.jsonResponse, name: state.name });
                return;
            }
            if (state.configId === "recommendation" || state.configId === "evaluation" || (state.name && (state.name.toLowerCase().includes("recommendation") || state.name.toLowerCase().includes("evaluation")))) {
                setViewerPayload({ type: "recommendation", data: state.jsonResponse, name: state.name });
                return;
            }
            // Fallback to generic JSON viewer for Idea Check, etc.
            setViewerPayload({ type: "json", data: state.jsonResponse, name: state.name });
            return;
        }
        toast("warning", "Nothing to Preview", "This document has no file or data to view yet.");
    };

    const handleDownloadBmc = (state: DocState) => {
        if (!state.jsonResponse) { alert("Nothing to download yet."); return; }
        const parsed = parseBmc(state.jsonResponse);
        if (!parsed) { alert("Could not read the BMC content."); return; }
        try {
            const canvas = renderBmcCanvas(parsed, state.name);
            canvas.toBlob((blob) => {
                if (!blob) { alert("Failed to encode image."); return; }
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${state.name.replace(/\s+/g, "_")}_v${state.version ?? 1}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            }, "image/png");
        } catch {
            alert("Failed to prepare download.");
        }
    };

    const handleDownload = (state: DocState) => {
        if (state.path && state.path.trim() !== "") {
            const a = document.createElement("a");
            a.href = state.path;
            a.download = state.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
        }

        if (state.jsonResponse) {
            if (state.configId === "swot") {
                generateSwotPDF(state.jsonResponse);
                return;
            }
            // Download as raw JSON file for Competitor Matrix, Idea Check, Market Research, etc.
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(state.jsonResponse, null, 2)
            )}`;
            const a = document.createElement("a");
            a.href = jsonString;
            a.download = `${state.name.replace(/\s+/g, "_")}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
        }
        alert("Nothing to download yet.");
    };

    const handleCompleteStage = async () => {
        setIsCompleting(true);
        if (!cleanId) return;

        try {
            const checkData = await documentsService.checkCompletion(cleanId);
            if (!checkData) {
                toast("error", "Server Error", "Could not verify documents with the server. Please try again.");
                setIsCompleting(false);
                return;
            }
            if (!checkData.isComplete) {
                const missingList: string[] = checkData.missingDocs || ["Unknown documents"];
                setMissingDocsDialog({ open: true, docs: missingList });
                setIsCompleting(false);
                return;
            }

            const currentWorkflow = await documentsService.getWorkflow(cleanId);
            const success = await documentsService.updateWorkflow({
                StartupId: cleanId,
                IdeaCheck: currentWorkflow.ideaCheck || currentWorkflow.IdeaCheck,
                MarketResearch: currentWorkflow.marketResearch || currentWorkflow.MarketResearch,
                Evaluation: currentWorkflow.evaluation || currentWorkflow.Evaluation,
                Recommendation: currentWorkflow.recommendation || currentWorkflow.Recommendation,
                Documents: true,
                PitchDeck: currentWorkflow.pitchDeck || currentWorkflow.PitchDeck,
            });

            if (success) {
                setIsWorkflowComplete(true);
                toast("success", "Stage Complete!", "All documents submitted. Moving to the next stage.");
                router.push(`/founder/startup/${cleanId}`);
            } else {
                toast("error", "Update Failed", "Could not mark the stage as complete. Please try again.");
            }
        } catch {
            toast("error", "Error", "An unexpected error occurred.");
        } finally {
            setIsCompleting(false);
        }
    };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[#F5F7F2]">
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
            <MissingDocsDialog open={missingDocsDialog.open} missingDocs={missingDocsDialog.docs} onClose={() => setMissingDocsDialog({ open: false, docs: [] })} />
            {viewerPayload && <DocumentViewerModal payload={viewerPayload} onClose={() => setViewerPayload(null)} />}

            {/* Nav */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
                <div className="flex w-full items-center justify-between px-6 md:px-12 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${cleanId}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238] leading-tight">Documents</h1>
                            <p className="text-sm text-muted-foreground">Manage and generate your startup files</p>
                        </div>
                    </div>
                    {isWorkflowComplete && <div className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">Stage Completed</div>}
                </div>
            </div>

            <main className="container mx-auto px-6 py-8">
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN: Documents List */}
                    <div className="lg:col-span-12 space-y-6">
                        <Card className="p-6 bg-gradient-to-r from-[#F0EADC] to-white border border-[#576238]/20">
                            <div className="flex items-start gap-4">
                                <div className="bg-[#576238]/10 p-3 rounded-full"><FileText className="h-6 w-6 text-[#576238]" /></div>
                                <div>
                                    <h3 className="font-bold text-[#576238] mb-1">Required Documentation</h3>
                                    <p className="text-sm text-muted-foreground">Investors require these documents. Use the AI Assistant to generate drafts or upload your existing files.</p>
                                </div>
                            </div>
                        </Card>

                        {/* PPT Card */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className={`group border transition-all duration-200 ${pptUrl ? "bg-white border-green-100 shadow-sm" : "bg-white border-gray-200 shadow-sm"}`}>
                                <div className="p-5 flex flex-col sm:flex-row gap-5">
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${pptUrl ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                        <Presentation className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-bold text-[#576238] truncate">Pitch Deck (PPT)</h3>
                                            {pptUrl && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Generated</span>}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-4">AI-generated PPTX or upload your own to enhance with AI styles.</p>

                                        <input type="file" accept=".pptx,.ppt,.pdf" className="hidden" ref={(el) => { fileInputRefs.current["ppt_generation"] = el; }}
                                            onChange={async (e) => {
                                                if (!e.target.files?.[0] || !cleanId) return;
                                                setUploadingId("ppt_generation");
                                                const success = await documentsService.uploadDocument(cleanId, "Pitch Deck (PPT)", e.target.files[0]);
                                                setUploadingId(null);
                                                if (success) { fetchData(); toast("success", "Upload Successful", "Pitch Deck has been uploaded."); }
                                                else { toast("error", "Upload Failed", "Could not upload the Pitch Deck. Please try again."); }
                                            }} />
                                        <input type="file" accept=".pptx,.ppt" className="hidden" ref={editPptInputRef}
                                            onChange={(e) => { if (e.target.files?.[0]) handleEditPPT(e.target.files[0]); }} />

                                        <div className="flex flex-wrap items-center gap-2">
                                            {pptUrl ? (
                                                <>
                                                    <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => {
                                                        const encodedUrl = encodeURIComponent(pptUrl);
                                                        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
                                                        setViewerPayload({ type: "pdf", url: viewerUrl, name: "Pitch Deck (PPT)" });
                                                    }}>
                                                        <Eye className="h-3 w-3 mr-1.5" /> View
                                                    </Button>
                                                    <a href={pptUrl} download>
                                                        <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`}><Download className="h-3 w-3 mr-1.5" /> Download</Button>
                                                    </a>

                                                </>
                                            ) : (
                                                <>



                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        {isLoadingData ? (
                            <div className="text-center py-20"><LegoSpinner className="h-10 w-10 animate-spin mx-auto text-[#576238] opacity-50" /></div>
                        ) : (
                            <div className="space-y-4">
                                {docStates.filter((d) => d.configId !== "pitch_deck").map((state, index) => {
                                    const config = REQUIRED_DOCS.find(r => r.id === state.configId) || {
                                        id: state.configId,
                                        name: state.name || "Unknown Document",
                                        icon: FileText,
                                        desc: "",
                                        accept: "*/*",
                                        aiPrompt: ""
                                    };
                                    const isUploaded = state?.isUploaded || false;
                                    const isJsonOnly = isUploaded && (!state?.path || state.path.trim() === "") && !!state?.jsonResponse;

                                    return (
                                        <motion.div key={state.dbId || config.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                                            <Card className={`group overflow-hidden border transition-all duration-200 ${isUploaded ? "bg-white border-green-100 shadow-sm" : "bg-white border-gray-200 hover:border-[#576238]/50 hover:shadow-md"}`}>
                                                <div className="p-5 flex flex-col sm:flex-row gap-5">
                                                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${isUploaded ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                                        <config.icon className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h3 className="font-bold text-[#576238] truncate">{config.name}</h3>
                                                            {isUploaded && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Available</span>}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{config.desc}</p>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <input type="file" ref={el => { fileInputRefs.current[config.id] = el; }} className="hidden" accept={config.accept} onChange={e => handleFileChange(e, config)} />
                                                            {isUploaded && (
                                                                <>
                                                                    <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => state && handleView(state)}>
                                                                        <Eye className="h-3 w-3 mr-1.5" />{isJsonOnly ? "View Analysis" : "View"}
                                                                    </Button>
                                                                    {config.id === "bmc" && state?.jsonResponse && (
                                                                        <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => state && handleDownloadBmc(state)}>
                                                                            <Download className="h-3 w-3 mr-1.5" /> Download
                                                                        </Button>
                                                                    )}
                                                                    {config.id !== "bmc" && (
                                                                        <>
                                                                            <Button variant="outline" size="sm" className={`h-8 text-xs ${outlineBtn}`} onClick={() => state && handleDownload(state)}>
                                                                                <Download className="h-3 w-3 mr-1.5" /> Download
                                                                            </Button>
                                                                        </>
                                                                    )}

                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="pt-8 text-center">
                            {isWorkflowComplete ? (
                                <Button size="lg" variant="outline" className="font-semibold" asChild>
                                    <Link href={`/contributor/startup/${cleanId}`}>Continue to Dashboard</Link>
                                </Button>
                            ) : (
                                <Button size="lg" className="w-full sm:w-auto bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold px-8" onClick={handleCompleteStage} disabled={isCompleting}>
                                    {isCompleting ? <LegoSpinner className="mr-2 h-4 w-4 animate-spin" /> : "Mark as Complete & Continue"}
                                </Button>
                            )}
                            {isWorkflowComplete && <p className="text-xs text-muted-foreground mt-2">Stage previously marked as complete.</p>}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}