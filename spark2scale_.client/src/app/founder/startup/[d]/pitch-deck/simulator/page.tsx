"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ArrowLeft, Mic, MicOff, PhoneOff, Clock, User, CheckCircle2,
    UserCircle2, Brain, TrendingUp, ShieldCheck, Zap, Target, Trophy,
    AlertTriangle, ChevronRight, FileText, XCircle, Star,
    AlertCircle, CheckCircle, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { App } from "@/components/livekit-app/app";
import { APP_CONFIG_DEFAULTS } from "@/app-config";
import { pitchDeckService } from "@/services/pitchDeckService";
import LegoSpinner from "@/components/lego/LegoSpinner";
import LegoLoader from "@/components/lego/LegoLoader";

type SimulationPhase = "setup" | "preparing" | "meeting" | "ending" | "evaluation";

interface Persona {
    id: string;
    name: string;
    avatar: string;
    color: string;
    description: string;
}

// ── Report JSON shape from the Python backend ────────────────────────────────
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
}

const PERSONAS: Persona[] = [
    { id: "ruthless-vc", name: "The Ruthless VC", avatar: "👔", color: "bg-slate-900", description: "Focuses purely on ROI and margins." },
    { id: "chatty-mentor", name: "The Chatty Mentor", avatar: "☕", color: "bg-blue-500", description: "Friendly but asks deep 'why' questions." },
    { id: "skeptical-analyst", name: "The Skeptical Analyst", avatar: "🧐", color: "bg-amber-600", description: "Pick apart your assumptions." }
];

const STRATEGIC_FOCUS = [
    { id: "market-size", label: "Market Size", icon: TrendingUp },
    { id: "business-model", label: "Business Model", icon: Target },
    { id: "tech-moat", label: "Technical Moat", icon: ShieldCheck },
    { id: "scalability", label: "Scalability", icon: Zap }
];

const PYTHON_API_URL =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_PYTHON_API_URL) ||
    "https://spark2scale-ai-api-server.azurewebsites.net";

// ── Grade → colour mapping ───────────────────────────────────────────────────
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

export default function PitchSimulator() {
    const params = useParams();
    const router = useRouter();
    const rawId = params?.d || params?.id;
    const startupId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId).toString() : "";

    // ── Phase & UI state ─────────────────────────────────────────────────────
    const [phase, setPhase] = useState<SimulationPhase>("setup");
    const [duration, setDuration] = useState(10);
    const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
    const [focusAreas, setFocusAreas] = useState<string[]>(["market-size", "business-model"]);
    const [timeLeft, setTimeLeft] = useState(10 * 60);
    const [prepProgress, setPrepProgress] = useState(0);
    const [isExtracting, setIsExtracting] = useState(true);

    // -- Current pitch deck ID (fetched from backend on mount) ---
    const [pitchDeckId, setPitchDeckId] = useState<string | null>(null);

    // -- Report state ---
    const [reportData, setReportData] = useState<SessionReport | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);

    // -- Fetch pitchdeckid on mount ---
    useEffect(() => {
        if (!startupId) return;
        pitchDeckService.getPitches(startupId).then((decks) => {
            const current = decks.find((d) => d.is_current) ?? decks[0] ?? null;
            if (current?.pitchdeckid) setPitchDeckId(current.pitchdeckid);
        }).catch(() => {
            console.warn("[Simulator] Could not fetch pitchdeckid — report won't be saved to Supabase.");
        });
    }, [startupId]);

    // -- Pre-flight Extraction (runs while user picks settings) ---
    useEffect(() => {
        if (phase === "setup") {
            setIsExtracting(true);
            fetch(`${PYTHON_API_URL}/api/v1/pitch-analyzer/extract`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pitchdeckid: pitchDeckId ?? null, startup_id: startupId ?? null }),
            })
                .then(async (res) => {
                    if (!res.ok) throw new Error(`Server returned ${res.status}`);
                    setIsExtracting(false);
                })
                .catch((e) => {
                    console.error("Extraction trigger failed:", e);
                    setIsExtracting(false);
                });
        }
    }, [phase, pitchDeckId, startupId]);

    // ── Preparation timer ────────────────────────────────────────────────────
    useEffect(() => {
        if (phase === "preparing") {
            const interval = setInterval(() => {
                setPrepProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => setPhase("meeting"), 500);
                        return 100;
                    }
                    return prev + 2;
                });
            }, 100);
            return () => clearInterval(interval);
        }
    }, [phase]);

    // Latest-handler ref so the interval below always calls the freshest
    // version of handleGetReportAndEnd without re-creating the timer when the
    // handler identity changes (and without stale-closure bugs).
    const handleGetReportAndEndRef = useRef<() => void>(() => {});

    // ── Meeting countdown timer ──────────────────────────────────────────────
    useEffect(() => {
        if (phase !== "meeting") return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleGetReportAndEndRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [phase]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // BUTTON 1: "End Call"
    // Stops the agent worker but keeps the user in the meeting phase.
    // They can restart the agent by clicking elsewhere / refreshing.
    // ─────────────────────────────────────────────────────────────────────────
    const handleEndCallOnly = async () => {
        // Fire-and-forget — we stay in the meeting phase
        fetch(`${PYTHON_API_URL}/api/v1/pitch-analyzer/stop`, { method: "POST" }).catch(() => {});
    };

    // ─────────────────────────────────────────────────────────────────────────
    // BUTTON 2: "Get Report & End"
    // 1. POST /stop  → worker process exits, job process saves state.json first
    // 2. POST /generate-report → FastAPI builds LLM report from saved state
    //    (runs in the long-lived FastAPI process, not the killed job subprocess)
    // 3. Transition to "evaluation" phase with the real data
    // ─────────────────────────────────────────────────────────────────────────
    const handleGetReportAndEnd = async () => {
        if (phase === "ending") return; // prevent double-click
        setPhase("ending");
        setReportData(null);
        setReportError(null);

        const apiUrl = PYTHON_API_URL;

        // 1. Stop the worker — this triggers on_participant_disconnected which
        //    synchronously saves session_state.json before the job process is killed
        try {
            await fetch(`${apiUrl}/api/v1/pitch-analyzer/stop`, { method: "POST" });
        } catch (e) {
            console.warn("Stop call failed (worker may have already exited):", e);
        }

        // 2. Small buffer — let the state file be fully flushed before we read it
        await new Promise(r => setTimeout(r, 2000));

        // 3. POST /generate-report — runs the LLM in the FastAPI main process.
        //    The backend saves the report to Supabase (pitchdecks.session_report)
        //    if a pitchdeckid was passed during /extract.
        try {
            const res = await fetch(`${apiUrl}/api/v1/pitch-analyzer/generate-report`, { method: "POST" });
            if (res.ok) {
                // Always redirect to the dedicated report page
                setPhase("evaluation"); // brief transition state
                router.push(`/founder/startup/${startupId}/pitch-deck/report`);
            } else {
                const errText = await res.text();
                if (res.status === 422) {
                    setReportError(errText || "Session too short to generate a report.");
                } else {
                    setReportError(`Report generation failed (${res.status}). Please try again.`);
                }
                setPhase("evaluation");
            }
        } catch (e) {
            setReportError("Network error while generating report. Please check your connection.");
            setPhase("evaluation");
        }
    };

    useEffect(() => {
        handleGetReportAndEndRef.current = handleGetReportAndEnd;
    });


    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className={cn("min-h-screen transition-colors duration-500", phase === "meeting" || phase === "ending" ? "bg-neutral-900" : "bg-[#F0EADC]")}>
            <AnimatePresence mode="wait">

                {/* ── PHASE 1: SETUP ── */}
                {phase === "setup" && (
                    <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="container mx-auto px-4 py-8 max-w-5xl">
                        <div className="flex items-center gap-4 mb-8">
                            <Link href={`/founder/startup/${startupId}/pitch-deck`}>
                                <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
                            </Link>
                            <h1 className="text-3xl font-bold text-[#576238]">Build Your AI Investor</h1>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                {/* Duration */}
                                <section>
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#576238]">
                                        <Clock className="h-5 w-5 text-[#FFD95D]" /> Meeting Duration
                                    </h3>
                                    <div className="flex gap-2 p-1 bg-white/50 rounded-xl w-fit border-2 border-[#576238]/10">
                                        {[5, 10, 15].map(d => (
                                            <Button
                                                key={d}
                                                variant={duration === d ? "default" : "ghost"}
                                                className={cn(duration === d ? "bg-[#576238] text-white" : "text-[#576238]")}
                                                onClick={() => { setDuration(d); setTimeLeft(d * 60); }}
                                            >
                                                {d} Min
                                            </Button>
                                        ))}
                                    </div>
                                </section>

                                {/* Persona */}
                                <section>
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#576238]">
                                        <UserCircle2 className="h-5 w-5 text-[#FFD95D]" /> Select AI Personality
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {PERSONAS.map(p => (
                                            <Card
                                                key={p.id}
                                                className={cn(
                                                    "cursor-pointer transition-all border-2",
                                                    selectedPersona.id === p.id ? "border-[#576238] shadow-md" : "border-transparent"
                                                )}
                                                onClick={() => setSelectedPersona(p)}
                                            >
                                                <CardContent className="p-4 flex gap-4 items-center">
                                                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-2xl", p.color)}>
                                                        {p.avatar}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-[#576238]">{p.name}</h4>
                                                        <p className="text-xs text-muted-foreground">{p.description}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {/* Sidebar: Strategic Focus */}
                            <div className="space-y-6">
                                <Card className="p-6 border-2 border-[#576238]/10 bg-white/80">
                                    <h3 className="font-bold mb-4 flex items-center gap-2 text-[#576238]">
                                        <Brain className="h-5 w-5 text-[#FFD95D]" /> Strategic Focus
                                    </h3>
                                    <div className="space-y-3">
                                        {STRATEGIC_FOCUS.map(focus => (
                                            <div key={focus.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={focus.id}
                                                    checked={focusAreas.includes(focus.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setFocusAreas([...focusAreas, focus.id]);
                                                        else setFocusAreas(focusAreas.filter(id => id !== focus.id));
                                                    }}
                                                />
                                                <Label htmlFor={focus.id} className="text-sm font-medium flex items-center gap-2">
                                                    <focus.icon className="h-3.5 w-3.5" /> {focus.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        className="w-full mt-8 bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-bold h-14"
                                        onClick={() => setPhase("preparing")}
                                        disabled={isExtracting}
                                    >
                                        {isExtracting ? (
                                            <><LegoSpinner className="mr-2 h-5 w-5 animate-spin" /> Preparing AI Context...</>
                                        ) : (
                                            <>Start Simulation <ChevronRight className="ml-2 h-4 w-4" /></>
                                        )}
                                    </Button>
                                </Card>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── PHASE 2: PREPARING ── */}
                {phase === "preparing" && (
                    <motion.div key="preparing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-screen text-center">
                        <div className="w-64 h-2 bg-[#576238]/10 rounded-full overflow-hidden mb-4">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${prepProgress}%` }} className="h-full bg-[#FFD95D]" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#576238] uppercase italic tracking-tighter">Preparing Your Meeting...</h2>
                        <p className="text-muted-foreground mt-2">Briefing {selectedPersona.name} on your startup context.</p>
                    </motion.div>
                )}

                {/* ── PHASE 3: MEETING ── */}
                {phase === "meeting" && (
                    <motion.div key="meeting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-screen bg-[#050505]">
                        {/* Top bar with timer + TWO action buttons */}
                        <div className="p-4 flex justify-between items-center bg-black/40 text-white backdrop-blur-md absolute top-0 left-0 right-0 z-50">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-widest">Live Voice Session ({selectedPersona.name})</span>
                            </div>
                            <div className="flex gap-3 items-center">
                                <div className="bg-neutral-800 px-4 py-1 rounded-full border border-neutral-700 font-mono">
                                    {formatTime(timeLeft)}
                                </div>

                                {/* BUTTON 1: End Call — stops worker, stays in meeting */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full font-black italic uppercase text-xs border-neutral-600 text-white hover:bg-neutral-700 hover:text-white bg-transparent"
                                    onClick={handleEndCallOnly}
                                    title="Stop the AI agent but stay in this session"
                                >
                                    <PhoneOff className="mr-2 h-4 w-4" /> End Call
                                </Button>

                                {/* BUTTON 2: Get Report & End — stops + fetches report + transitions */}
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="rounded-full font-black italic uppercase text-xs"
                                    onClick={handleGetReportAndEnd}
                                    title="End the session and generate your Investment Readiness Report"
                                >
                                    <FileText className="mr-2 h-4 w-4" /> Get Report &amp; End
                                </Button>
                            </div>
                        </div>

                        {/* LiveKit room */}
                        <div className="flex-grow w-full h-full relative" style={{ height: "100svh" }}>
                            <App appConfig={APP_CONFIG_DEFAULTS} />
                        </div>
                    </motion.div>
                )}

                {/* ── PHASE 3.5: ENDING (report being generated) ── */}
                {phase === "ending" && (
                    <motion.div key="ending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white text-center px-4">
                        <div className="mb-8 flex justify-center">
                            <LegoLoader />
                        </div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#FFD95D]">
                            Generating Your Report...
                        </h2>
                        <p className="text-neutral-400 mt-3 text-sm max-w-sm">
                            The AI is compiling your Investment Readiness Report. This usually takes 10–30 seconds.
                        </p>
                    </motion.div>
                )}

                {/* ── PHASE 4: EVALUATION (real report data) ── */}
                {phase === "evaluation" && (
                    <motion.div key="evaluation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto px-4 py-12 max-w-4xl">

                        {/* Error fallback */}
                        {reportError && (
                            <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-red-800">Report Unavailable</p>
                                    <p className="text-sm text-red-600 mt-1">{reportError}</p>
                                </div>
                            </div>
                        )}

                        {/* Header */}
                        <div className="text-center mb-10">
                            {reportData ? (
                                <>
                                    <div className={cn("text-7xl font-black mb-2", gradeColor(reportData.grade))}>
                                        {gradeEmoji(reportData.grade)} {reportData.grade}
                                    </div>
                                    <p className="text-2xl font-bold text-[#576238]">
                                        Investment Readiness Score: {reportData.score}/{reportData.max_score}
                                    </p>
                                    <p className="text-muted-foreground mt-1">Comprehensive feedback from {selectedPersona.name}</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                                        <CheckCircle2 className="h-10 w-10 text-white" />
                                    </div>
                                    <h1 className="text-4xl font-black text-[#576238] italic uppercase">Simulation Complete</h1>
                                    <p className="text-muted-foreground mt-2">Session ended. Report data unavailable.</p>
                                </>
                            )}
                        </div>

                        {reportData && (
                            <div className="space-y-6">
                                {/* Score bar */}
                                <Card className="p-6 border-2 border-[#576238]/10 bg-white">
                                    <h3 className="font-bold text-base mb-3 text-[#576238]">Overall Score</h3>
                                    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(reportData.score / reportData.max_score) * 100}%` }}
                                            transition={{ duration: 1.2, ease: "easeOut" }}
                                            className={cn(
                                                "h-full rounded-full",
                                                reportData.score >= 70 ? "bg-emerald-500" :
                                                reportData.score >= 50 ? "bg-amber-500" : "bg-red-500"
                                            )}
                                        />
                                    </div>
                                    <p className="text-right text-sm text-muted-foreground mt-1">{reportData.score} / {reportData.max_score}</p>
                                </Card>

                                {/* Rubric scores */}
                                {Object.keys(reportData.rubric).length > 0 && (
                                    <Card className="p-6 border-2 border-[#576238]/10 bg-white">
                                        <h3 className="font-bold text-base mb-4 text-[#576238] flex items-center gap-2">
                                            <Trophy className="h-5 w-5 text-[#FFD95D]" /> Detailed Rubric
                                        </h3>
                                        <div className="grid sm:grid-cols-2 gap-3">
                                            {Object.entries(reportData.rubric).map(([key, val]) => (
                                                <div key={key} className="flex flex-col gap-1">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-semibold capitalize text-[#576238]">{key}</span>
                                                        <span className="text-sm font-bold">{val.score}/5</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                        <div
                                                            className={cn("h-full rounded-full", val.score >= 4 ? "bg-emerald-500" : val.score >= 3 ? "bg-amber-400" : "bg-red-400")}
                                                            style={{ width: `${(val.score / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{val.notes}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* Strengths & Weaknesses */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    {reportData.strengths.length > 0 && (
                                        <Card className="p-6 border-2 border-emerald-200 bg-emerald-50">
                                            <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-emerald-800">
                                                <CheckCircle className="h-5 w-5" /> Strengths
                                            </h3>
                                            <ul className="space-y-2">
                                                {reportData.strengths.map((s, i) => (
                                                    <li key={i} className="text-sm text-emerald-900 font-medium capitalize flex items-start gap-2">
                                                        <Star className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </Card>
                                    )}

                                    {reportData.critical_weaknesses.length > 0 && (
                                        <Card className="p-6 border-2 border-red-200 bg-red-50">
                                            <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-red-800">
                                                <XCircle className="h-5 w-5" /> Critical Weaknesses
                                            </h3>
                                            <ul className="space-y-2">
                                                {reportData.critical_weaknesses.map((w, i) => (
                                                    <li key={i} className="text-sm text-red-900 font-medium capitalize flex items-start gap-2">
                                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                                                        {w}
                                                    </li>
                                                ))}
                                            </ul>
                                        </Card>
                                    )}
                                </div>

                                {/* Investor Killer Moments */}
                                {reportData.investor_killer_moments.length > 0 && (
                                    <Card className="p-6 border-2 border-amber-200 bg-amber-50">
                                        <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-amber-800">
                                            <AlertTriangle className="h-5 w-5" /> Investor Killer Moments
                                        </h3>
                                        <div className="space-y-2">
                                            {reportData.investor_killer_moments.slice(0, 5).map((m, i) => (
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
                                )}

                                {/* Recommended Actions */}
                                {reportData.recommended_actions.length > 0 && (
                                    <Card className="p-6 border-2 border-blue-200 bg-blue-50">
                                        <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-blue-800">
                                            <RefreshCw className="h-5 w-5" /> Recommended Actions
                                        </h3>
                                        <ol className="space-y-2 list-decimal list-inside">
                                            {reportData.recommended_actions.map((a, i) => (
                                                <li key={i} className="text-sm text-blue-900">{a}</li>
                                            ))}
                                        </ol>
                                    </Card>
                                )}

                                {/* Final Verdict */}
                                <Card className="p-6 border-2 border-[#576238]/20 bg-[#FFD95D]">
                                    <h3 className="font-black italic uppercase text-lg mb-3 text-[#576238]">Final Verdict</h3>
                                    <p className="font-semibold text-[#576238] leading-relaxed">{reportData.final_verdict}</p>
                                    <Link href={`/founder/startup/${startupId}/pitch-deck`}>
                                        <Button className="w-full mt-6 bg-[#576238] text-white hover:bg-[#576238]/90">
                                            Return to Dashboard
                                        </Button>
                                    </Link>
                                </Card>
                            </div>
                        )}

                        {/* When there's no report and no error (very short session) */}
                        {!reportData && !reportError && (
                            <div className="grid md:grid-cols-2 gap-8">
                                <Card className="p-6 border-2 border-[#576238]/10 bg-white">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-[#576238]">
                                        <AlertCircle className="text-amber-500" /> No Report Data
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        The session may have been too short to generate a report. Try running a full {duration}-minute session.
                                    </p>
                                </Card>
                                <Card className="p-6 border-2 border-[#576238]/10 bg-[#FFD95D] text-[#576238]">
                                    <h3 className="font-black italic uppercase text-lg mb-4">Session Complete</h3>
                                    <Link href={`/founder/startup/${startupId}/pitch-deck`}>
                                        <Button className="w-full mt-2 bg-[#576238] text-white hover:bg-[#576238]/90">Return to Dashboard</Button>
                                    </Link>
                                </Card>
                            </div>
                        )}
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}