"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { clearStaleStage } from "@/lib/refinementState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft, Upload, FileText, Mic, Eye, Download, X,
    Maximize2, Brain, CheckCircle2, AlertTriangle, Presentation, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { APP_CONFIG_DEFAULTS } from "@/app-config";
import { App } from "@/components/livekit-app/app";
import { pitchDeckService } from "@/services/pitchDeckService";
import LegoSpinner from "@/components/lego/LegoSpinner";

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'https://spark2scale-ai-api-server.azurewebsites.net';

// Python pitch-analyzer endpoints require a Supabase Bearer JWT and are cross-origin,
// so the auth_token cookie is not sent — attach it explicitly from localStorage.
function pythonApiHeaders(json = false): Record<string, string> {
    const headers: Record<string, string> = {};
    if (json) headers["Content-Type"] = "application/json";
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
}

// ─── Types ────────────────────────────────────────────────────────
type PagePhase = "management" | "session" | "report" | "fetching_report";

interface UploadedFile {
    name: string;
    size: number;
    url: string;
    uploadedAt: string;
}

// Shape returned by build_investment_readiness_report in tools.py
interface AgentReport {
    grade?: string;
    score?: number;
    max_score?: number;
    final_verdict?: string;
    strengths?: string[];
    critical_weaknesses?: string[];
    rubric?: Record<string, { score: number; notes: string }>;
    essentials_checklist?: { covered: string[]; missing: string[] };
    investor_killer_moments?: { timestamp_s: number; type: string; detail: string }[];
    grammar_issues?: number;
    full_transcript?: string;
    [key: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generatePdf(report: AgentReport, startupId: string) {
    const rubric = report.rubric || {};
    const rubricRows = Object.entries(rubric).map(([k, v]) =>
        `<tr><td style="padding:6px 8px;font-weight:600;color:#576238;">${k.replace(/_/g, ' ')}</td><td style="padding:6px 8px;">${v.score ?? '-'}</td><td style="padding:6px 8px;color:#555;">${v.notes ?? ''}</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Pitch Analysis Report</title>
    <style>
        body{font-family:Arial,sans-serif;max-width:860px;margin:40px auto;color:#333}
        h1{color:#576238;border-bottom:3px solid #FFD95D;padding-bottom:8px}
        h2{color:#576238;margin-top:28px}
        .badge{display:inline-block;background:#576238;color:#FFD95D;font-size:2rem;font-weight:bold;padding:8px 24px;border-radius:12px;margin:12px 0}
        table{border-collapse:collapse;width:100%;margin-top:12px}
        th{background:#576238;color:#FFD95D;padding:8px;text-align:left}
        td{border-bottom:1px solid #f0f0f0}
        .footer{margin-top:40px;font-size:0.8rem;color:#999;border-top:1px solid #eee;padding-top:12px}
    </style></head><body>
    <h1>🎯 Investment Readiness Report</h1>
    <p>Startup ID: <strong>${startupId}</strong> · Generated: <strong>${new Date().toLocaleString()}</strong></p>
    <div class="badge">Grade: ${report.grade ?? '?'} &nbsp;|&nbsp; Score: ${report.score ?? 0}/${report.max_score ?? 100}</div>
    <h2>Final Verdict</h2><p>${report.final_verdict ?? 'N/A'}</p>
    <h2>Strengths</h2><p>${(report.strengths ?? []).join(', ') || 'None noted.'}</p>
    <h2>Critical Weaknesses</h2><p>${(report.critical_weaknesses ?? []).join(', ') || 'None noted.'}</p>
    <h2>Rubric Breakdown</h2>
    <table><tr><th>Category</th><th>Score</th><th>Notes</th></tr>${rubricRows}</table>
    <h2>Full Transcript</h2>
    <pre style="white-space:pre-wrap;font-size:0.85rem;color:#444;background:#f9f9f9;padding:16px;border-radius:8px;">${report.full_transcript ?? 'Not available.'}</pre>
    <div class="footer">Spark2Scale AI Pitch Analyzer — Confidential Report</div>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 500); }
}

// ─── Main Component ───────────────────────────────────────────────
export default function PitchDeckPage() {
    const params = useParams();
    const router = useRouter();
    const rawId = params?.d || params?.id;
    const startupId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId).toString() : "";

    // Phase
    const [phase, setPhase] = useState<PagePhase>("management");
    
    // ── Current pitch deck ID (fetched from backend on mount) ─────────────────
    // Used to link session_report to the correct Supabase row via /extract.
    const [pitchDeckId, setPitchDeckId] = useState<string | null>(null);

    // Upload
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Extraction
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionDone, setExtractionDone] = useState(false);

    // Mark complete
    const [isMarkingComplete, setIsMarkingComplete] = useState(false);
    const [isStageCompleted, setIsStageCompleted] = useState(false);

    // Real report from AI agent
    const [report, setReport] = useState<AgentReport | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);
    const [isFullView, setIsFullView] = useState(false);
    // Block start without pitch deck + inline msg
    const [pitchBlockMsg, setPitchBlockMsg] = useState<string | null>(null);
    // Upload error
    const [uploadError, setUploadError] = useState<string | null>(null);
    // ── Fetch current pitchdeckid for this startup on mount ─────────────────
    // We need this to link the session report to the correct Supabase row.
    // The current pitch deck is the one with is_current=true (returned first by getPitches).
    useEffect(() => {
        if (!startupId) return;
        pitchDeckService.getPitches(startupId).then((decks) => {
            const current = decks.find((d) => d.is_current) ?? decks[0] ?? null;
            if (current?.pitchdeckid) {
                setPitchDeckId(current.pitchdeckid);
            }
        }).catch(() => {
            // Non-critical: session will still work, report just won't be persisted
            console.warn("[PitchDeck] Could not fetch pitchdeckid — report won't be saved to Supabase.");
        });
    }, [startupId]);

    // ── Fetch last cached report (GET /get-report) — no LLM call ──
    const fetchCachedReport = useCallback(async (): Promise<boolean> => {
        try {
            const url = pitchDeckId
                ? `${PYTHON_API_URL}/api/v1/pitch-analyzer/get-report?pitchdeckid=${pitchDeckId}`
                : `${PYTHON_API_URL}/api/v1/pitch-analyzer/get-report`;
            const res = await fetch(url, { headers: pythonApiHeaders() });
            if (res.ok) {
                // Redirect to dedicated report page
                if (pitchDeckId) {
                    router.push(`/founder/startup/${startupId}/pitch-deck/report`);
                    return true;
                }
                const data: AgentReport = await res.json();
                setReport(data);
                setPhase("report");
                return true;
            }
        } catch (_) { /* ignore */ }
        return false;
    }, [pitchDeckId, startupId, router]);

    // ── Fetch report from Python API using POST /generate-report ──
    const fetchReport = useCallback(async () => {
        setPhase("fetching_report");
        setReportError(null);

        try {
            // Generate report from the synchronously saved state
            const res = await fetch(`${PYTHON_API_URL}/api/v1/pitch-analyzer/generate-report`, {
                method: "POST",
                headers: pythonApiHeaders(),
            });

            if (res.ok) {
                // ── Redirect to the dedicated report page ───────────────────────
                // The report was already saved to Supabase inside /generate-report.
                // The report page fetches it from there.
                router.push(`/founder/startup/${startupId}/pitch-deck/report`);
            } else {
                let errMsg: string;
                try {
                    const body = await res.json();
                    errMsg = body?.detail || `Report generation failed (${res.status}).`;
                } catch {
                    errMsg = `Report generation failed (${res.status}).`;
                }
                if (res.status === 404 || res.status === 422) {
                    errMsg = "Session was too short — no speech was captured. Please try a full session.";
                }
                setReportError(errMsg);
                setPhase("report");
            }
        } catch (e) {
            setReportError("Network error while generating report. Please check your connection.");
            setPhase("report");
        }
    }, [startupId, router]);

    // Stop the backend worker (kills subprocess so next /start is fresh)
    const stopWorker = useCallback(async () => {
        try {
            await fetch(`${PYTHON_API_URL}/api/v1/pitch-analyzer/stop`, { method: 'POST', headers: pythonApiHeaders() });
        } catch (e) {
            console.warn('stopWorker: fetch failed (non-critical)', e);
        }
    }, []);

    // Trigger extraction when entering session
    useEffect(() => {
        if (!startupId) return;
        pitchDeckService.getPitches(startupId).then((decks) => {
            const current = decks.find((d) => d.is_current) ?? decks[0] ?? null;
            if (current?.pitchdeckid) {
                setPitchDeckId(current.pitchdeckid);
                setPitchBlockMsg(null);

                // CRITICAL FIX: Add the fetched video to the UI state so it survives refreshes
                setUploadedFiles([{
                    name: current.pitchname !== "Untitled Pitch" ? current.pitchname : "Saved Pitch Video",
                    size: 0, // Size isn't stored in your DB model, so we fallback to 0
                    url: current.video_url,
                    uploadedAt: new Date(current.created_at).toLocaleString(),
                }]);
            }
        }).catch(() => {
            console.warn("[PitchDeck] Could not fetch pitchdeckid — report won't be saved to Supabase.");
        });
    }, [startupId]);

    // File Handlers — Video only, upload to Supabase via C# backend
    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
        const fileArray = Array.from(files).filter(f =>
            videoTypes.includes(f.type) ||
            f.name.endsWith('.mp4') || f.name.endsWith('.mov') ||
            f.name.endsWith('.webm') || f.name.endsWith('.avi') || f.name.endsWith('.mkv')
        );
        if (fileArray.length === 0) { alert('Please upload a video file (MP4, MOV, WebM, AVI, MKV).'); return; }

        setIsUploading(true);
        setUploadError(null);

        for (const file of fileArray) {
            try {
                // Upload to Supabase via C# backend → returns the new PitchDeck row
                const deck = await pitchDeckService.uploadVideo(startupId, file);

                // Update local state with the real row from Supabase
                setUploadedFiles([{
                    name: file.name,
                    size: file.size,
                    url: deck.video_url || URL.createObjectURL(file),
                    uploadedAt: new Date().toLocaleString(),
                }]);

                // Store the new pitchdeckid so Start button unlocks immediately
                if (deck.pitchdeckid) {
                    setPitchDeckId(deck.pitchdeckid);
                    // Clear any "upload first" warning since we now have a deck
                    setPitchBlockMsg(null);
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
                setUploadError(msg);
            }
        }

        setIsUploading(false);
    }, [startupId, setPitchDeckId]);


    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const removeFile = (index: number) => setUploadedFiles(prev => prev.filter((_, i) => i !== index));

    // Mark Complete handler (mirrors other stage pages)
    const handleMarkComplete = async () => {
        setIsMarkingComplete(true);
        try {
            // TODO: connect to real workflow update service
            await new Promise(res => setTimeout(res, 1000));
            setIsStageCompleted(true);
            if (startupId) clearStaleStage(startupId, "pitchDeck");
            router.push(`/founder/startup/${startupId}`);
        } catch (err) {
            console.error("Mark complete failed:", err);
        } finally {
            setIsMarkingComplete(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // PHASE: Fetching Report (loading screen)
    // ─────────────────────────────────────────────────────────────
    if (phase === "fetching_report") {
        return (
            <div className="min-h-screen bg-[#576238] flex flex-col items-center justify-center gap-6 text-white">
                <LegoSpinner className="h-12 w-12 animate-spin text-[#FFD95D]" />
                <div className="text-center">
                    <h2 className="text-2xl font-black">Generating Your Report</h2>
                    <p className="text-white/70 mt-2 text-sm">The AI is compiling your Investment Readiness Review…</p>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE: Management
    // ─────────────────────────────────────────────────────────────
    if (phase === "management") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-white to-[#FFD95D]/10">

                {/* Navbar — same style as other stage pages */}
                <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
                    <div className="flex w-full items-center justify-between px-6 md:px-12 py-4">
                        <div className="flex items-center gap-4">
                            <Link href={`/founder/startup/${startupId}`}>
                                <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div className="flex flex-col justify-center">
                                <h1 className="text-xl font-bold text-[#576238] leading-tight">Pitch Deck</h1>
                                <p className="text-sm text-muted-foreground">Upload & manage your pitch materials</p>
                            </div>
                        </div>
                        {isStageCompleted && (
                            <div className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200">
                                ✓ Verified & Completed
                            </div>
                        )}
                    </div>
                </div>

                <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">

                    {/* Live Pitch Analyzer Hero CTA */}
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <Card className="border-2 border-[#576238] bg-gradient-to-r from-[#576238] to-[#6b7c3f] text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD95D]/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <CardContent className="p-8 relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-[#FFD95D] rounded-2xl">
                                        <Brain className="h-7 w-7 text-[#576238]" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black">Live Pitch Analyzer</h2>
                                        <p className="text-white/80 text-sm">Real-time AI feedback on your pitch delivery</p>
                                    </div>
                                </div>
                                <p className="text-white/90 mb-6 max-w-lg">
                                    Practice your pitch with an AI investor that listens, interrupts, and gives you comprehensive feedback — just like a real VC meeting.
                                </p>
                                {/* Block message */}
                                {pitchBlockMsg && (
                                    <div className="flex items-center gap-2 mt-3 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-sm font-medium">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        {pitchBlockMsg}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-3 mt-6">
                                    <Button
                                        onClick={() => {
                                            if (!pitchDeckId) {
                                                setPitchBlockMsg("Please upload a video pitch first before starting the analyzer.");
                                                return;
                                            }
                                            setPitchBlockMsg(null);
                                            setPhase("session");
                                        }}
                                        className="bg-[#FFD95D] hover:bg-[#ffe89a] text-[#576238] font-bold text-base px-6 h-12"
                                    >
                                        <Mic className="mr-2 h-5 w-5" />
                                        Start Live Pitch Analyzer Session
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-semibold h-12 px-5"
                                        onClick={fetchCachedReport}
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Last Report
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Upload Section */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-[#576238]">
                                    <Presentation className="h-5 w-5" />
                                    Your Pitch Deck Files
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Drop Zone */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200",
                                        isDragging
                                            ? "border-[#576238] bg-[#576238]/5 scale-[1.01]"
                                            : "border-gray-200 hover:border-[#576238]/50 hover:bg-[#F0EADC]/30"
                                    )}
                                >
                                    <input ref={fileInputRef} type="file" accept="video/*,.mp4,.mov,.webm,.avi,.mkv" multiple className="hidden"
                                        onChange={e => e.target.files && handleFiles(e.target.files)} />
                                    {isUploading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <LegoSpinner className="h-10 w-10 animate-spin text-[#576238]" />
                                            <p className="text-[#576238] font-semibold">Uploading...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-[#F0EADC] rounded-2xl">
                                                <Upload className="h-8 w-8 text-[#576238]" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#576238]">Drop your pitch video here</p>
                                                <p className="text-sm text-muted-foreground mt-1">MP4, MOV, WebM, AVI, MKV · Click to browse</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* File List */}
                                <AnimatePresence>
                                    {uploadedFiles.map((file, i) => (
                                        <motion.div key={file.name + i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                                            <div className="flex items-center gap-3 p-4 rounded-xl border border-[#576238]/20 bg-[#F0EADC]/30 group">
                                                <div className="p-2 bg-[#576238] rounded-lg">
                                                    <FileText className="h-4 w-4 text-[#FFD95D]" />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <p className="font-semibold text-[#576238] truncate text-sm">{file.name}</p>
                                                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} · Uploaded {file.uploadedAt}</p>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                                                    </a>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => removeFile(i)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {uploadedFiles.length === 0 && !isUploading && (
                                    <p className="text-center text-sm text-muted-foreground py-2">No video uploaded yet.</p>
                                )}

                                {/* Upload error */}
                                {uploadError && (
                                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium mt-2">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        {uploadError}
                                    </div>
                                )}

                                {/* Success: linked to pitch deck row */}
                                {pitchDeckId && uploadedFiles.length > 0 && (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium mt-2">
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                        Video saved — AI analyzer is now unlocked.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Mark as Complete */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                        className="text-center pb-4">
                        {!isStageCompleted ? (
                            <Button
                                size="lg"
                                className="bg-[#FFD95D] hover:bg-[#ffe07a] text-black font-semibold px-8 shadow-md"
                                onClick={handleMarkComplete}
                                disabled={isMarkingComplete}
                            >
                                {isMarkingComplete
                                    ? <><LegoSpinner className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                                    : "Mark as Complete & Continue →"
                                }
                            </Button>
                        ) : (
                            <Button size="lg" variant="outline" className="font-semibold" asChild>
                                <Link href={`/founder/startup/${startupId}`}>Continue to Dashboard →</Link>
                            </Button>
                        )}
                    </motion.div>
                </main>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE: Session — olive green background + sticky nav
    // ─────────────────────────────────────────────────────────────
    if (phase === "session") {
        return (
            <div className="pitch-session-theme flex flex-col h-screen" style={{ background: '#576238' }}>

                {/* Sticky navbar */}
                <div className="flex-shrink-0 w-full z-50" style={{ background: '#576238', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                    <div className="flex w-full items-center justify-between px-6 py-3 gap-4">

                        {/* Left: session status */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-widest text-white/70">Live AI Session</span>
                            </div>
                            {isExtracting && (
                                <div className="flex items-center gap-1.5 text-xs text-[#FFD95D]/80 font-medium">
                                    <LegoSpinner className="h-3 w-3 animate-spin" />
                                    Preparing AI context...
                                </div>
                            )}
                            {extractionDone && (
                                <div className="flex items-center gap-1.5 text-xs text-green-300 font-medium">
                                    <CheckCircle2 className="h-3 w-3" />
                                    AI ready
                                </div>
                            )}
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-3">
                            <Button
                                size="sm"
                                className="font-bold uppercase text-xs tracking-widest bg-red-600 hover:bg-red-700 text-white rounded-full px-5 py-2 shadow-lg border border-red-400"
                                onClick={async () => {
                                    // 1. Set phase to fetching_report immediately. 
                                    // This unmounts the <App /> component, which legally disconnects the founder from the LiveKit room.
                                    setPhase("fetching_report");

                                    // 2. Wait 3.5 seconds. 
                                    // The Python worker will instantly detect the disconnect and use this time to safely write the transcript to /tmp/session_state.json.
                                    await new Promise(r => setTimeout(r, 6000));

                                    // 3. Request the report. 
                                    // The backend will now successfully find and read the saved JSON file.
                                    fetchReport();

                                    // 4. Force-kill the worker in the background to free up Azure memory.
                                    stopWorker();
                                }}
                            >
                                End Session &amp; Get Report
                            </Button>
                        </div>
                    </div>
                </div>

                {/* LiveKit App — fills remaining space */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    <App appConfig={{ ...APP_CONFIG_DEFAULTS, showLeaveButton: false }} />
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE: Report
    // ─────────────────────────────────────────────────────────────
    if (phase === "report") {
        // Error state — session ended but no report was found
        if (reportError || !report) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-white to-[#FFD95D]/10 flex items-center justify-center">
                    <Card className="max-w-md w-full p-8 text-center space-y-4">
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                        <h2 className="text-xl font-bold text-[#576238]">Report Not Available</h2>
                        <p className="text-sm text-muted-foreground">{reportError || "No report data was returned."}</p>
                        <div className="flex gap-3 justify-center pt-2">
                            <Button variant="outline" onClick={() => setPhase("management")}>Back</Button>
                            <Button className="bg-[#576238] text-white" onClick={async () => {
                                setPhase("fetching_report");
                                setReportError(null);
                                // Try cached report first (fast path, no LLM call)
                                const got = await fetchCachedReport();
                                if (!got) await fetchReport();
                            }}>
                                <RefreshCw className="h-4 w-4 mr-2" /> Retry
                            </Button>
                        </div>
                    </Card>
                </div>
            );
        }

        const score = report.score ?? 0;
        const maxScore = report.max_score ?? 45;
        const scoreColor = score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-500" : "text-red-500";
        const rubric = report.rubric ?? {};
        const rubricEntries = Object.entries(rubric);

        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-white to-[#FFD95D]/10">

                {/* Navbar */}
                <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
                    <div className="flex w-full items-center justify-between px-6 md:px-12 py-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10" onClick={() => setPhase("management")}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold text-[#576238]">Pitch Analysis Report</h1>
                                <p className="text-sm text-muted-foreground">Generated {new Date().toLocaleString()}</p>
                            </div>
                        </div>
                        <Button
                            onClick={async () => {
                                // Stop the old worker first — prevents 2 agents in the new room
                                await stopWorker();
                                setExtractionDone(false);
                                setPhase("session");
                            }}
                            className="bg-[#576238] hover:bg-[#6b7c3f] text-white"
                        >
                            <Mic className="mr-2 h-4 w-4" /> Practice Again
                        </Button>
                    </div>
                </div>

                <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

                        {/* Document View Card */}
                        <Card className="border-2 border-[#576238]/20 shadow-xl overflow-hidden">
                            {/* Card Header with Actions */}
                            <div className="bg-gradient-to-r from-[#576238] to-[#6b7c3f] px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3 text-white">
                                    <Brain className="h-6 w-6" />
                                    <div>
                                        <h2 className="font-black text-lg">Investment Readiness Report</h2>
                                        <p className="text-white/70 text-xs">Live Pitch Analyzer · Grade: {report.grade ?? '?'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" className="bg-white hover:bg-white/90 text-[#576238] font-semibold gap-2 border-0 shadow" onClick={() => setIsFullView(true)}>
                                        <Maximize2 className="h-4 w-4" /> Full View
                                    </Button>
                                    <Button size="sm" className="bg-[#d4941a] hover:bg-[#b87d12] text-white font-bold gap-2 shadow" onClick={() => generatePdf(report, startupId)}>
                                        <Download className="h-4 w-4" /> Download PDF
                                    </Button>
                                </div>
                            </div>

                            <CardContent className="p-6 space-y-6">
                                {/* Overall Score */}
                                <div className="flex items-center gap-6 p-4 bg-[#F0EADC]/50 rounded-xl border border-[#576238]/10">
                                    <div className="text-center">
                                        <div className={cn("text-5xl font-black", scoreColor)}>{score}</div>
                                        <div className="text-xs text-muted-foreground font-medium">out of {maxScore}</div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#576238] text-lg mb-1">Overall Score — Grade {report.grade ?? '?'}</p>
                                        <p className="text-muted-foreground text-sm italic">{report.final_verdict ?? ''}</p>
                                    </div>
                                </div>

                                {/* Rubric Bars */}
                                {rubricEntries.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-[#576238]">Rubric Breakdown</h3>
                                        {rubricEntries.map(([key, val]) => (
                                            <div key={key} className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-semibold text-[#576238] capitalize">{key.replace(/_/g, ' ')}</span>
                                                    <span className={cn("text-sm font-bold", (val.score ?? 0) >= 4 ? "text-green-600" : (val.score ?? 0) >= 2.5 ? "text-amber-500" : "text-red-500")}>
                                                        {val.score ?? 0}/{5}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${((val.score ?? 0) / 5) * 100}%` }}
                                                        transition={{ duration: 0.8, delay: 0.1 }}
                                                        className={cn("h-full rounded-full", (val.score ?? 0) >= 4 ? "bg-green-500" : (val.score ?? 0) >= 2.5 ? "bg-amber-400" : "bg-red-400")}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground">{val.notes}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Strengths & Weaknesses */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                        <h4 className="font-bold text-green-700 text-sm mb-2">✅ Strengths</h4>
                                        <ul className="space-y-1">{(report.strengths ?? []).map((s, i) => <li key={i} className="text-xs text-green-700 capitalize">{s.replace(/_/g, ' ')}</li>)}</ul>
                                    </div>
                                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                        <h4 className="font-bold text-red-700 text-sm mb-2">⚠️ Critical Weaknesses</h4>
                                        <ul className="space-y-1">{(report.critical_weaknesses ?? []).map((w, i) => <li key={i} className="text-xs text-red-700 capitalize">{w.replace(/_/g, ' ')}</li>)}</ul>
                                    </div>
                                </div>

                                {/* Killer Moments */}
                                {(report.investor_killer_moments ?? []).length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-[#576238] mb-3 flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-[#FFD95D]" /> Key Moments
                                        </h3>
                                        <ul className="space-y-2">
                                            {(report.investor_killer_moments ?? []).slice(0, 4).map((m, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                    <span className="text-[#FFD95D] font-bold mt-0.5 shrink-0">[{m.timestamp_s}s]</span>
                                                    <span><strong>{m.type}:</strong> {m.detail}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Mark as Complete */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center pb-4">
                        {!isStageCompleted ? (
                            <Button size="lg" className="bg-[#FFD95D] hover:bg-[#ffe07a] text-black font-semibold px-8 shadow-md"
                                onClick={handleMarkComplete} disabled={isMarkingComplete}>
                                {isMarkingComplete
                                    ? <><LegoSpinner className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                                    : "Mark as Complete & Continue →"}
                            </Button>
                        ) : (
                            <Button size="lg" variant="outline" className="font-semibold" asChild>
                                <Link href={`/founder/startup/${startupId}`}>Continue to Dashboard →</Link>
                            </Button>
                        )}
                    </motion.div>
                </main>

                {/* Full View Modal */}
                <Dialog open={isFullView} onOpenChange={setIsFullView}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-[#576238]">
                                <Brain className="h-5 w-5" />
                                Investment Readiness Report — Grade {report.grade ?? '?'}
                                <Button size="sm" className="ml-auto bg-[#FFD95D] hover:bg-[#ffe89a] text-[#576238] font-bold gap-2"
                                    onClick={() => generatePdf(report, startupId)}>
                                    <Download className="h-4 w-4" /> Download PDF
                                </Button>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 pt-2">
                            <div className="flex items-center gap-6 p-6 bg-[#576238] text-white rounded-xl">
                                <div className="text-center">
                                    <div className="text-6xl font-black text-[#FFD95D]">{score}</div>
                                    <div className="text-xs text-white/70">Score / {maxScore}</div>
                                </div>
                                <div>
                                    <p className="font-black text-xl mb-1">Grade: {report.grade ?? '?'}</p>
                                    <p className="text-white/80 italic">{report.final_verdict ?? ''}</p>
                                </div>
                            </div>

                            {/* Full rubric */}
                            {rubricEntries.map(([key, val]) => (
                                <Card key={key} className="border border-[#576238]/10">
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold text-[#576238] text-base capitalize">{key.replace(/_/g, ' ')}</h3>
                                            <span className={cn("text-lg font-black", (val.score ?? 0) >= 4 ? "text-green-600" : (val.score ?? 0) >= 2.5 ? "text-amber-500" : "text-red-500")}>
                                                {val.score ?? 0}/5
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{val.notes}</p>
                                    </CardContent>
                                </Card>
                            ))}

                            <div>
                                <h3 className="font-bold text-[#576238] mb-3">Full Transcript</h3>
                                <pre className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border whitespace-pre-wrap leading-relaxed">
                                    {report.full_transcript ?? 'Not available.'}
                                </pre>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return null;
}