"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ArrowLeft, Brain, Trophy, CheckCircle, XCircle, AlertTriangle,
    RefreshCw, Download, Star, AlertCircle, Mic
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { pitchDeckService } from "@/services/pitchDeckService";
import LegoSpinner from "@/components/lego/LegoSpinner";
import LegoLoader from "@/components/lego/LegoLoader";

const PYTHON_API_URL =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_PYTHON_API_URL) ||
    "https://spark2scale-ai-api-server.azurewebsites.net";

// /get-report requires a Supabase Bearer JWT (Depends(get_current_user)) and is
// cross-origin, so the auth_token cookie is not sent — attach it from localStorage.
function pythonApiAuthHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Report JSON shape from Python backend ────────────────────────────────────
interface RubricEntry {
    score: number;
    notes: string;
}

interface SessionReport {
    grade: string;
    score: number;
    max_score: number;
    rubric: Record<string, RubricEntry>;
    strengths: string[];
    critical_weaknesses: string[];
    essentials_checklist: { covered: string[]; missing: string[] };
    investor_killer_moments: { timestamp_s: number; type: string; detail: string }[];
    recommended_actions: string[];
    final_verdict: string;
    _supabase_linked?: boolean;
    [key: string]: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function gradeColor(grade: string) {
    if (["A+", "A", "A-"].includes(grade)) return "text-emerald-600";
    if (["B+", "B", "B-"].includes(grade)) return "text-blue-600";
    if (["C+", "C", "C-"].includes(grade)) return "text-amber-600";
    return "text-red-600";
}

function gradeEmoji(grade: string) {
    if (["A+", "A", "A-"].includes(grade)) return "🏆";
    if (["B+", "B", "B-"].includes(grade)) return "👍";
    if (["C+", "C", "C-"].includes(grade)) return "⚠️";
    return "🚧";
}

function generatePdf(report: SessionReport, startupId: string) {
    const rubric = report.rubric || {};
    const rubricRows = Object.entries(rubric).map(([k, v]) =>
        `<tr><td style="padding:6px 8px;font-weight:600;color:#576238;">${k.replace(/_/g, ' ')}</td><td style="padding:6px 8px;">${v.score ?? '-'}</td><td style="padding:6px 8px;color:#555;">${v.notes ?? ''}</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Pitch Session Report</title>
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
    <h1>🎯 Investment Readiness Session Report</h1>
    <p>Startup ID: <strong>${startupId}</strong> · Generated: <strong>${new Date().toLocaleString()}</strong></p>
    <div class="badge">Grade: ${report.grade ?? '?'} &nbsp;|&nbsp; Score: ${report.score ?? 0}/${report.max_score ?? 45}</div>
    <h2>Final Verdict</h2><p>${report.final_verdict ?? 'N/A'}</p>
    <h2>Strengths</h2><p>${(report.strengths ?? []).join(', ') || 'None noted.'}</p>
    <h2>Critical Weaknesses</h2><p>${(report.critical_weaknesses ?? []).join(', ') || 'None noted.'}</p>
    <h2>Rubric Breakdown</h2>
    <table><tr><th>Category</th><th>Score</th><th>Notes</th></tr>${rubricRows}</table>
    <div class="footer">Spark2Scale AI Pitch Analyzer — Confidential Report</div>
    </body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 500); }
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PitchSessionReportPage() {
    const params = useParams();
    const router = useRouter();
    const rawId = params?.d || params?.id;
    const startupId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId).toString() : "";

    const [report, setReport] = useState<SessionReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pitchDeckId, setPitchDeckId] = useState<string | null>(null);
    const [notLinked, setNotLinked] = useState(false);

    // ── Step 1: Fetch pitchdeckid, then load session_report from Supabase ──────
    const loadReport = useCallback(async () => {
        setLoading(true);
        setError(null);

        // 1a. Get the current pitch deck id from the C# backend
        let deckId: string | null = null;
        try {
            const decks = await pitchDeckService.getPitches(startupId);
            const current = decks.find((d) => d.is_current) ?? decks[0] ?? null;
            deckId = current?.pitchdeckid ?? null;
            setPitchDeckId(deckId);
        } catch {
            // Continue — will fall back to local file
        }

        // 1b. Fetch the report
        // Priority: Supabase (via /get-report?pitchdeckid=...) → local temp file
        try {
            const url = deckId
                ? `${PYTHON_API_URL}/api/v1/pitch-analyzer/get-report?pitchdeckid=${deckId}`
                : `${PYTHON_API_URL}/api/v1/pitch-analyzer/get-report`;

            const res = await fetch(url, { headers: pythonApiAuthHeaders() });
            if (res.ok) {
                const data: SessionReport = await res.json();
                setReport(data);
                // If _supabase_linked is explicitly false, show the soft warning
                if (data._supabase_linked === false || !deckId) {
                    setNotLinked(true);
                }
            } else if (res.status === 404) {
                setError("No session report found. Please complete a pitch session first.");
            } else {
                setError(`Failed to load report (${res.status}). Please try again.`);
            }
        } catch {
            setError("Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, [startupId]);

    useEffect(() => {
        if (startupId) loadReport();
    }, [startupId, loadReport]);

    // ── Loading state ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-white to-[#FFD95D]/10 flex flex-col items-center justify-center gap-6">
                <div className="mb-6 flex justify-center">
                    <LegoLoader />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-black text-[#576238]">Loading Your Report</h2>
                    <p className="text-muted-foreground mt-2 text-sm">Fetching your Investment Readiness Report…</p>
                </div>
            </div>
        );
    }

    // ── Error / empty state ───────────────────────────────────────────────────
    if (error || !report) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-white to-[#FFD95D]/10 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-5">
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                    <h2 className="text-xl font-bold text-[#576238]">Report Not Available</h2>
                    <p className="text-sm text-muted-foreground">{error || "No report data was returned."}</p>
                    <div className="flex gap-3 justify-center pt-2">
                        <Link href={`/founder/startup/${startupId}/pitch-deck`}>
                            <Button variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pitch Deck
                            </Button>
                        </Link>
                        <Button className="bg-[#576238] text-white" onClick={loadReport}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Retry
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    // ── Report view ───────────────────────────────────────────────────────────
    const rubricEntries = Object.entries(report.rubric ?? {});

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-white to-[#FFD95D]/10">

            {/* Sticky navbar */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
                <div className="flex w-full items-center justify-between px-6 md:px-12 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${startupId}/pitch-deck`}>
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">Session Report</h1>
                            <p className="text-sm text-muted-foreground">Investment Readiness Review · {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => generatePdf(report, startupId)}
                        >
                            <Download className="h-4 w-4" /> Download PDF
                        </Button>
                        
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-10 max-w-4xl space-y-6">

                {/* Soft warning: not linked to pitch deck */}
                {notLinked && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl"
                    >
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-semibold text-amber-800 text-sm">Report not linked to a pitch deck</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                This report was generated but couldn't be saved to your pitch deck — no pitch deck video has been uploaded yet.
                                Upload your pitch deck video to permanently link future reports.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Grade hero */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <Card className="border-2 border-[#576238]/20 overflow-hidden shadow-xl">
                        <div className="bg-gradient-to-r from-[#576238] to-[#6b7c3f] px-8 py-10 text-white text-center">
                            <div className={cn("text-7xl font-black mb-2", gradeColor(report.grade))}>
                                <span className="text-white">{gradeEmoji(report.grade)} {report.grade}</span>
                            </div>
                            <p className="text-2xl font-bold text-[#FFD95D]">
                                Investment Readiness Score: {report.score}/{report.max_score}
                            </p>
                            <p className="text-white/80 mt-3 max-w-lg mx-auto italic text-sm leading-relaxed">
                                {report.final_verdict}
                            </p>
                        </div>

                        {/* Score bar */}
                        <CardContent className="p-6">
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(report.score / report.max_score) * 100}%` }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                    className={cn(
                                        "h-full rounded-full",
                                        report.score >= 70 ? "bg-emerald-500" :
                                        report.score >= 50 ? "bg-amber-500" : "bg-red-500"
                                    )}
                                />
                            </div>
                            <p className="text-right text-xs text-muted-foreground mt-1">{report.score} / {report.max_score}</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Rubric breakdown */}
                {rubricEntries.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="border-2 border-[#576238]/10 bg-white p-6">
                            <h3 className="font-bold text-[#576238] mb-5 flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-[#FFD95D]" /> Detailed Rubric
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {rubricEntries.map(([key, val]) => (
                                    <div key={key} className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-[#576238] capitalize">
                                                {key.replace(/_/g, ' ')}
                                            </span>
                                            <span className={cn(
                                                "text-sm font-bold",
                                                (val.score ?? 0) >= 4 ? "text-emerald-600" :
                                                (val.score ?? 0) >= 2.5 ? "text-amber-500" : "text-red-500"
                                            )}>
                                                {val.score}/5
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${((val.score ?? 0) / 5) * 100}%` }}
                                                transition={{ duration: 0.8, delay: 0.2 }}
                                                className={cn(
                                                    "h-full rounded-full",
                                                    (val.score ?? 0) >= 4 ? "bg-emerald-500" :
                                                    (val.score ?? 0) >= 2.5 ? "bg-amber-400" : "bg-red-400"
                                                )}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">{val.notes}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Strengths & Weaknesses */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="grid md:grid-cols-2 gap-6">

                    {report.strengths.length > 0 && (
                        <Card className="p-6 border-2 border-emerald-200 bg-emerald-50">
                            <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-emerald-800">
                                <CheckCircle className="h-5 w-5" /> Strengths
                            </h3>
                            <ul className="space-y-2">
                                {report.strengths.map((s, i) => (
                                    <li key={i} className="text-sm text-emerald-900 font-medium capitalize flex items-start gap-2">
                                        <Star className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                                        {s.replace(/_/g, ' ')}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {report.critical_weaknesses.length > 0 && (
                        <Card className="p-6 border-2 border-red-200 bg-red-50">
                            <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-red-800">
                                <XCircle className="h-5 w-5" /> Critical Weaknesses
                            </h3>
                            <ul className="space-y-2">
                                {report.critical_weaknesses.map((w, i) => (
                                    <li key={i} className="text-sm text-red-900 font-medium capitalize flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                                        {w.replace(/_/g, ' ')}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </motion.div>

                {/* Investor Killer Moments */}
                {report.investor_killer_moments.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="p-6 border-2 border-amber-200 bg-amber-50">
                            <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-amber-800">
                                <AlertTriangle className="h-5 w-5" /> Investor Killer Moments
                            </h3>
                            <div className="space-y-2">
                                {report.investor_killer_moments.slice(0, 6).map((m, i) => (
                                    <div key={i} className="flex items-start gap-3 text-sm">
                                        <span className="font-mono text-xs bg-amber-200 text-amber-900 rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                                            {Math.floor(m.timestamp_s)}s
                                        </span>
                                        <div>
                                            <span className="font-bold text-amber-900">{m.type}: </span>
                                            <span className="text-amber-800">{m.detail}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Recommended Actions */}
                {(report.recommended_actions ?? []).length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <Card className="p-6 border-2 border-blue-200 bg-blue-50">
                            <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-blue-800">
                                <RefreshCw className="h-5 w-5" /> Recommended Actions
                            </h3>
                            <ol className="space-y-2 list-decimal list-inside">
                                {report.recommended_actions.map((a, i) => (
                                    <li key={i} className="text-sm text-blue-900">{a}</li>
                                ))}
                            </ol>
                        </Card>
                    </motion.div>
                )}

                {/* Essentials checklist */}
                {(report.essentials_checklist?.missing ?? []).length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="p-6 border-2 border-[#576238]/10 bg-white">
                            <h3 className="font-bold text-base mb-4 text-[#576238]">Investor Essentials Checklist</h3>
                            <div className="grid sm:grid-cols-2 gap-2">
                                {(report.essentials_checklist?.covered ?? []).map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-emerald-700">
                                        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                                        <span className="capitalize">{item}</span>
                                    </div>
                                ))}
                                {(report.essentials_checklist?.missing ?? []).map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-red-700">
                                        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                                        <span className="capitalize">{item} — not covered</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

          

            </main>
        </div>
    );
}
