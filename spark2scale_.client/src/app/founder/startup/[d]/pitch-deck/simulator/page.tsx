"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ArrowLeft, Mic, MicOff, PhoneOff, Clock, User, CheckCircle2,
    UserCircle2, Brain, TrendingUp, ShieldCheck, Zap, Target, Trophy,
    AlertTriangle, ChevronRight, Loader2
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { App } from "@/components/livekit-app/app";
import { APP_CONFIG_DEFAULTS } from "@/app-config";

type SimulationPhase = "setup" | "preparing" | "meeting" | "evaluation";

interface Persona {
    id: string;
    name: string;
    avatar: string;
    color: string;
    description: string;
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

export default function PitchSimulator() {
    const params = useParams();
    const rawId = params?.d || params?.id;
    const startupId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId).toString() : "";

    // State Management
    const [phase, setPhase] = useState<SimulationPhase>("setup");
    const [duration, setDuration] = useState(10);
    const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
    const [focusAreas, setFocusAreas] = useState<string[]>(["market-size", "business-model"]);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(10 * 60);
    const [prepProgress, setPrepProgress] = useState(0);
    const [isExtracting, setIsExtracting] = useState(true);

    // Phase 1: Pre-flight Extraction (Trigger in background while they pick settings!)
    useEffect(() => {
        if (phase === "setup") {
            setIsExtracting(true);
            // Kick off the 60-second extraction on the Python server while the user interacts with the UI
            const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'https://spark2scale-ai-api-server.azurewebsites.net';
            fetch(`${pythonApiUrl}/api/v1/pitch-analyzer/extract`, { method: 'POST' })
                .then(async (response) => {
                    if (!response.ok) {
                        const errText = await response.text();
                        throw new Error(`Server returned ${response.status}: ${errText}`);
                    }
                    console.log('Background extraction completed successfully!');
                    setIsExtracting(false);
                })
                .catch(e => {
                    console.error('Extraction trigger failed:', e);
                    setIsExtracting(false); // Make sure to unblock the UI even if it fails
                });
        }
    }, [phase]);

    // Phase 2: Preparation Timer
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

    // Phase 3: Meeting Timer (Optimized to prevent re-renders)
    useEffect(() => {
        if (phase === "meeting") {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setPhase("evaluation");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [phase]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className={cn("min-h-screen transition-colors duration-500", phase === "meeting" ? "bg-neutral-900" : "bg-[#F0EADC]")}>
            <AnimatePresence mode="wait">

                {/* PHASE 1: SETUP */}
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
                                                onClick={() => {
                                                    setDuration(d);
                                                    setTimeLeft(d * 60); // Fix: Set time directly on click instead of using useEffect
                                                }}
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
                                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing AI Context...</>
                                        ) : (
                                            <>Start Simulation <ChevronRight className="ml-2 h-4 w-4" /></>
                                        )}
                                    </Button>
                                </Card>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* PHASE 2: PREPARING */}
                {phase === "preparing" && (
                    <motion.div key="preparing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-screen text-center">
                        <div className="w-64 h-2 bg-[#576238]/10 rounded-full overflow-hidden mb-4">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${prepProgress}%` }} className="h-full bg-[#FFD95D]" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#576238] uppercase italic tracking-tighter">Preparing Your Meeting...</h2>
                        <p className="text-muted-foreground mt-2">Briefing {selectedPersona.name} on your startup context.</p>
                    </motion.div>
                )}

                {/* PHASE 3: MEETING */}
                {phase === "meeting" && (
                    <motion.div key="meeting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-screen bg-[#050505]">
                        <div className="p-4 flex justify-between items-center bg-black/40 text-white backdrop-blur-md absolute top-0 left-0 right-0 z-50">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-widest">Live Voice Session ({selectedPersona.name})</span>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="bg-neutral-800 px-4 py-1 rounded-full border border-neutral-700 font-mono">
                                    {formatTime(timeLeft)}
                                </div>
                                <Button variant="destructive" size="sm" className="rounded-full font-black italic uppercase text-xs" onClick={() => setPhase("evaluation")}>
                                    <PhoneOff className="mr-2 h-4 w-4" /> End
                                </Button>
                            </div>
                        </div>
                        <div className="flex-grow w-full h-full relative" style={{ height: "100svh" }}>
                            <App appConfig={APP_CONFIG_DEFAULTS} />
                        </div>
                    </motion.div>
                )}

                {/* PHASE 4: EVALUATION */}
                {phase === "evaluation" && (
                    <motion.div key="evaluation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto px-4 py-12 max-w-4xl">
                        <div className="text-center mb-12">
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                                <CheckCircle2 className="h-10 w-10 text-white" />
                            </div>
                            <h1 className="text-4xl font-black text-[#576238] italic uppercase">Simulation Complete</h1>
                            <p className="text-muted-foreground mt-2">Comprehensive feedback from {selectedPersona.name}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <Card className="p-6 border-2 border-[#576238]/10 bg-white">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-[#576238]">
                                    <Trophy className="text-[#FFD95D]" /> Performance Score: 84
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <TrendingUp className="h-5 w-5 text-green-500 mt-1" />
                                        <p className="text-sm font-medium">Strong articulation of the <span className="text-[#576238] font-bold">Problem Statement</span>.</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-1" />
                                        <p className="text-sm font-medium">Projections in the <span className="text-[#576238] font-bold">Financials</span> section felt slightly optimistic.</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 border-2 border-[#576238]/10 bg-[#FFD95D] text-[#576238]">
                                <h3 className="font-black italic uppercase text-lg mb-4">New Block Unlocked!</h3>
                                <p className="font-bold leading-tight">Great intensity! A new red LEGO block has been added to your workflow stack for completing this session.</p>
                                <Link href={`/founder/startup/${startupId}/pitch-deck`}>
                                    <Button className="w-full mt-6 bg-[#576238] text-white hover:bg-[#576238]/90">Return to Dashboard</Button>
                                </Link>
                            </Card>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}