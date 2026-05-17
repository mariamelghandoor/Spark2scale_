"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft, Calendar, Download, FileText, Lock, Clock,
    Ban, AlertTriangle, RefreshCw, Briefcase,
    ShieldAlert, HelpCircle, ArrowRight, CheckCircle, Target
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { meetingService } from "@/services/meetingService";
import { userService } from "@/services/userService";
import { evaluationService, EvaluationDocument } from "@/services/evaluationService";

// --- Use React-to-Print for Native, High-Quality PDFs ---
import { useReactToPrint } from 'react-to-print';
import LegoSpinner from "@/components/lego/LegoSpinner";

interface Startup {
    sid: string;
    startupname: string;
    field: string;
    idea_description: string;
    region?: string;
    startup_stage?: string;
    created_at?: string;
    founder_id?: string;
}

interface PitchDeck {
    pitchdeckid: string;
    pitchname: string;
    video_url: string;
    is_current: boolean;
    created_at: string;
}

interface StartupDocument {
    did: string;
    document_name: string;
    type: string;
    current_path: string | null;
    updated_at: string;
    canaccess: number;
    access_status: "public" | "locked" | "pending" | "granted";
}

interface RouteParams {
    id: string;
}

/* =========================================
   INVESTOR VIEW COMPONENT
   ========================================= */
const InvestorView = ({ data }: { data: any }) => {
    const content = data.Content;
    const scorecard = content["Scorecard Grid"] || {};

    const chartData = useMemo(() => {
        return Object.entries(scorecard).map(([key, value]) => ({
            subject: key.toUpperCase(),
            score: value as number,
            fullMark: 5,
        }));
    }, [scorecard]);

    const verdict = content.Verdict || "Evaluated";
    const rawScore = content["Weighted Score"] || 0;
    const displayScore = typeof rawScore === 'number' ? rawScore.toFixed(1) : parseFloat(rawScore || "0").toFixed(1);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-left print:p-8 print:bg-white">

            {/* Investor Memo Header */}
            <div className="bg-[#576238] rounded-2xl p-6 md:p-8 shadow-lg text-white flex flex-col md:flex-row print:flex-row gap-6 md:items-center print:items-center justify-between border border-[#6b7c3f] print:break-inside-avoid">
                <div className="max-w-2xl">
                    <div className="flex items-center gap-2 mb-3 opacity-80">
                        <Briefcase className="text-[#FFD95D] w-5 h-5" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-[#FFD95D]">Internal Investment Memo</h2>
                    </div>
                    <h1 className="text-3xl font-black mb-4">Deal Diligence Summary</h1>
                    <p className="text-white/90 text-lg leading-relaxed font-serif">{content["Executive Summary"]}</p>
                </div>

                <div className="bg-[#4a532f] p-6 rounded-xl border border-[#FFD95D]/20 text-center min-w-[200px] print:min-w-[180px]">
                    <span className="block text-sm uppercase tracking-widest text-white/70 font-bold mb-2">Deal Verdict</span>
                    <span className={`inline-block px-4 py-2 border rounded-lg text-lg font-black ${verdict?.includes('Ready') ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                        {verdict}
                    </span>
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <span className="block text-xs uppercase tracking-widest text-white/60 mb-1">Score</span>
                        <span className="text-3xl font-black text-[#FFD95D]">{displayScore}</span><span className="text-white/50 font-medium">/45</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 print:break-inside-avoid">
                {/* Deal Breakers */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="bg-rose-50 border-b border-rose-100 p-6 flex items-center gap-3">
                        <ShieldAlert className="text-rose-600 w-6 h-6" />
                        <h2 className="text-xl font-bold text-rose-900">Critical Deal Breakers</h2>
                    </div>
                    <div className="p-6 flex-grow">
                        {content["Deal Breakers"] && content["Deal Breakers"].length > 0 ? (
                            <ul className="space-y-4">
                                {content["Deal Breakers"].map((breaker: string, idx: number) => (
                                    <li key={idx} className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                                            {idx + 1}
                                        </div>
                                        <p className="text-slate-700 leading-relaxed pt-1 font-serif text-sm">{breaker}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-500 italic">No critical deal breakers identified.</p>
                        )}
                    </div>
                </div>

                {/* Diligence Questions */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="bg-[#F4F1EA] border-b border-[#e8e4db] p-6 flex items-center gap-3">
                        <HelpCircle className="text-[#576238] w-6 h-6" />
                        <h2 className="text-xl font-bold text-[#576238]">Key Diligence Questions</h2>
                    </div>
                    <div className="p-6 flex-grow">
                        <ul className="space-y-4">
                            {(content["Diligence Questions"] || []).map((question: string, idx: number) => (
                                <li key={idx} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-[#576238]/30 transition-colors">
                                    <ArrowRight className="text-[#576238] w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p className="text-slate-800 font-medium text-sm">{question}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Visual Map and Dimension Rationales Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 gap-8 pt-4">

                {/* Radar Chart for Investors */}
                <div className="lg:col-span-5 print:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col print:break-inside-avoid">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Target className="text-slate-400 w-5 h-5" /> Dimension Map
                    </h2>
                    <div className="w-full h-72 print:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [`${value} / 5`, 'Score']} />
                                <Radar name="Score" dataKey="score" stroke="#576238" strokeWidth={2} fill="#FFD95D" fillOpacity={0.5} activeDot={{ r: 4, fill: '#576238' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Rationales Matrix */}
                <div className="lg:col-span-7 print:col-span-7">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <FileText className="text-slate-400 w-5 h-5" /> Dimension Analysis Matrix
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4">
                        {/* Map over the SCORECARD to guarantee all 9 dimensions render */}
                        {Object.entries(scorecard).map(([key, scoreValue], idx) => {
                            const dimName = key.toUpperCase();
                            const score = scoreValue as number;
                            const isRedFlag = score < 2;

                            // Safely look up the rationale if the AI provided one
                            const rationaleObj = (content["Dimension Rationales"] || []).find(
                                (r: any) => (r.dimension || "").toLowerCase() === key.toLowerCase()
                            );
                            const rationaleText = rationaleObj?.rationale || "No detailed rationale provided for this dimension.";

                            return (
                                <div key={idx} className={`p-5 rounded-xl border ${isRedFlag ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200'} shadow-sm print:break-inside-avoid`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold text-slate-800 uppercase tracking-wide text-sm">{dimName}</h3>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isRedFlag ? 'bg-rose-100 text-rose-700' : 'bg-[#F4F1EA] text-[#576238]'}`}>
                                            Score: {score}
                                        </span>
                                    </div>
                                    <p className={`text-sm leading-relaxed font-serif ${isRedFlag ? 'text-rose-900/80' : 'text-slate-600'}`}>
                                        {rationaleText}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};


/* =========================================
   MAIN APP COMPONENT
   ========================================= */
export default function InvestorStartupProfile() {
    const rawParams = useParams();
    const params = rawParams as unknown as RouteParams;
    const id = params?.id;

    // TODO: Replace with real logged-in investor ID
    const investorId = "7da8b0c8-9adc-446b-b7f0-218f84a81f1b";

    const [startup, setStartup] = useState<Startup | null>(null);
    const [pitchDecks, setPitchDecks] = useState<PitchDeck[]>([]);
    const [documents, setDocuments] = useState<StartupDocument[]>([]);
    const [evalDoc, setEvalDoc] = useState<EvaluationDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requestLoading, setRequestLoading] = useState(false);

    // --- PDF GENERATION REF ---
    const reportRef = useRef<HTMLDivElement>(null);

    // --- SCHEDULING STATE ---
    const [founderEmail, setFounderEmail] = useState<string>("");
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleError, setScheduleError] = useState("");
    const [newMeeting, setNewMeeting] = useState({
        date: "",
        time: "",
        link: ""
    });
    const todayStr = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (!id) {
            setError("Invalid Startup ID.");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const startupRes = await apiClient.get<Startup>(`/api/startups/${id}`);
                setStartup(startupRes.data);

                // --- FETCH FOUNDER EMAIL FOR SCHEDULING ---
                if (startupRes.data.founder_id) {
                    try {
                        const profile = await userService.getProfile(startupRes.data.founder_id);
                        if (profile?.user?.email) {
                            setFounderEmail(profile.user.email);
                        }
                    } catch (err) {
                        console.warn("Failed to fetch founder email", err);
                    }
                }

                // Fetch pitches
                try {
                    const pitchesRes = await apiClient.get<PitchDeck[]>(`/api/pitchdecks/${id}?onlyPublic=true`);
                    setPitchDecks(pitchesRes.data);
                } catch (err: unknown) {
                    console.warn("Failed to load pitches", err);
                }

                // Fetch documents
                try {
                    const docsRes = await apiClient.get<StartupDocument[]>(`/api/documents?startupId=${id}&investorId=${investorId}`);
                    setDocuments(docsRes.data);
                } catch (err: unknown) {
                    console.warn("Failed to load documents", err);
                }

                // Fetch Evaluation Document explicitly
                try {
                    const evalRes = await evaluationService.getCurrentEvaluation(id);
                    setEvalDoc(evalRes);
                } catch (err: unknown) {
                    console.warn("No evaluation document found", err);
                }

            } catch (err: unknown) {
                console.error("Critical error fetching startup data:", err);
                setError("Failed to load startup profile. Please check your connection.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, investorId]);

    const handleRequestAccess = async () => {
        if (!startup) return;
        setRequestLoading(true);
        try {
            await apiClient.post("/api/investordocumentaccess/request", {
                investorId: investorId,
                startupId: startup.sid
            });

            toast.success("Access requested! The founder has been notified.");

            const docsRes = await apiClient.get<StartupDocument[]>(`/api/documents?startupId=${id}&investorId=${investorId}`);
            setDocuments(docsRes.data);
        } catch (err) {
            console.error("Request failed", err);
            toast.error("Failed to request access.");
        } finally {
            setRequestLoading(false);
        }
    };

    // --- ONE-CLICK PDF GENERATION LOGIC (NATIVE) ---
    const handleDownloadPdf = useReactToPrint({
        content: () => reportRef.current,
        documentTitle: `${startup?.startupname?.replace(/\s+/g, '_') || 'Startup'}_Investment_Memo`,
        onAfterPrint: () => toast.success("PDF Downloaded successfully!"),
    });

    // --- SCHEDULING LOGIC ---
    const generateMeetLink = () => {
        const roomName = `Spark2Scale-${Math.random().toString(36).substring(7)}`;
        setNewMeeting({ ...newMeeting, link: `https://meet.jit.si/${roomName}` });
    };

    const handleScheduleMeeting = async () => {
        setScheduleError("");
        if (!newMeeting.date || !newMeeting.time || !newMeeting.link) {
            setScheduleError("Please fill in all fields.");
            return;
        }

        const inputDate = new Date(newMeeting.date + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (inputDate < today) {
            setScheduleError("Cannot schedule in the past.");
            return;
        }

        if (!founderEmail) {
            setScheduleError("Founder contact information is missing.");
            return;
        }

        setIsScheduling(true);
        try {
            await meetingService.createMeeting({
                sender_id: investorId,
                invitee_email: founderEmail,
                meeting_date: newMeeting.date,
                meeting_time: newMeeting.time + ":00",
                meeting_link: newMeeting.link
            });

            toast.success("Meeting invitation sent successfully!");
            setIsScheduleOpen(false);
            setNewMeeting({ date: "", time: "", link: "" });
        } catch (error: any) {
            console.error("Error scheduling:", error);
            const msg = error.response?.data?.title || "Failed to schedule meeting.";
            setScheduleError(msg);
            toast.error(msg);
        } finally {
            setIsScheduling(false);
        }
    };

    // --- BULLETPROOF EVALUATION PARSER ---
    const findKey = (obj: any, target: string) => {
        if (!obj || typeof obj !== 'object') return null;
        const normalizedTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const key in obj) {
            if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedTarget) {
                return obj[key];
            }
        }
        return null;
    };

    const normalizedInvestorData = useMemo(() => {
        let parsedData: any = null;
        const rawJson = evalDoc?.json_response || (evalDoc as any)?.jsonResponse || (evalDoc as any)?.JsonResponse;

        if (rawJson) {
            let temp = rawJson;
            for (let i = 0; i < 3; i++) {
                if (typeof temp === 'string') {
                    try { temp = JSON.parse(temp); } catch { break; }
                }
            }
            parsedData = temp;
        }

        let investorContent = null;
        if (parsedData) {
            const finalObj = findKey(parsedData, "finalreport") || parsedData;
            const investorObj = findKey(finalObj, "investoroutput") || finalObj;
            investorContent = findKey(investorObj, "content") || investorObj;
        }

        if (!investorContent) return null;

        return {
            Content: {
                "Executive Summary": findKey(investorContent, "executivesummary") || "Summary unavailable.",
                "Deal Breakers": findKey(investorContent, "dealbreakers") || [],
                "Diligence Questions": findKey(investorContent, "diligencequestions") || [],
                "Dimension Rationales": findKey(investorContent, "dimensionrationales") || [],
                "Verdict": findKey(investorContent, "verdict") || "Pass",
                "Weighted Score": findKey(investorContent, "weightedscore") || 0,
                "Scorecard Grid": findKey(investorContent, "scorecardgrid") || {}
            }
        };
    }, [evalDoc]);


    const hasDocuments = documents.length > 0;
    const hasLockedDocs = documents.some(d => d.access_status === "locked");
    const hasPendingDocs = documents.some(d => d.access_status === "pending");

    if (loading) return <div className="min-h-screen flex items-center justify-center"><LegoSpinner className="animate-spin text-[#576238] w-8 h-8" /></div>;
    if (error || !startup) return <div className="p-20 text-center text-red-500 font-bold">{error}</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-20 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/investor/feed">
                        <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-[#576238]">Startup Profile</h1>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="overflow-hidden border-2 border-slate-200 mb-6 shadow-md bg-white">
                            <CardContent className="p-8">
                                <div className="mb-6">
                                    <h1 className="text-4xl font-bold mb-2 text-[#576238]">{startup.startupname}</h1>
                                    <p className="text-lg text-gray-600 line-clamp-2">{startup.idea_description}</p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                    <div className="text-center p-4 bg-[#F4F1EA]/50 rounded-lg border border-[#F4F1EA]">
                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">Region</p>
                                        <p className="font-semibold text-[#576238]">{startup.region || "Not specified"}</p>
                                    </div>
                                    <div className="text-center p-4 bg-[#F4F1EA]/50 rounded-lg border border-[#F4F1EA]">
                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">Field</p>
                                        <p className="font-semibold text-[#576238]">{startup.field || "Not specified"}</p>
                                    </div>
                                    <div className="text-center p-4 bg-[#F4F1EA]/50 rounded-lg border border-[#F4F1EA]">
                                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">Stage</p>
                                        <p className="font-semibold text-[#576238]">{startup.startup_stage || "Not specified"}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    {/* --- DYNAMIC ACCESS BUTTONS --- */}
                                    {!hasDocuments ? (
                                        <Button disabled className="flex-1 bg-gray-100 text-gray-400 border-gray-200">
                                            <Ban className="mr-2 h-4 w-4" />
                                            No Documents Available
                                        </Button>
                                    ) : hasLockedDocs ? (
                                        <Button
                                            onClick={handleRequestAccess}
                                            disabled={requestLoading}
                                            className="flex-1 bg-[#576238] hover:bg-[#6b7c3f] transition-all text-white shadow-sm"
                                        >
                                            {requestLoading ? <LegoSpinner className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                                            Request Full Access
                                        </Button>
                                    ) : hasPendingDocs ? (
                                        <Button disabled className="flex-1 bg-amber-100 text-amber-700 cursor-not-allowed">
                                            <Clock className="mr-2 h-4 w-4" />
                                            Full Access request is pending
                                        </Button>
                                    ) : (
                                        <Button variant="outline" className="flex-1 border-emerald-600 text-emerald-700 cursor-default bg-emerald-50">
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Full Access Granted
                                        </Button>
                                    )}

                                    {/* --- SCHEDULE MEETING BUTTON --- */}
                                    <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="flex-1 border-[#576238] text-[#576238] hover:bg-[#576238]/10 bg-white"
                                                onClick={() => {
                                                    setScheduleError("");
                                                    if (!founderEmail) toast.warning("Founder contact info unavailable.");
                                                }}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                Schedule Meeting
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Schedule Meeting</DialogTitle>
                                                <DialogDescription>
                                                    Send a meeting invite to <strong>{startup.startupname}</strong>'s founder.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                {scheduleError && (
                                                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200 flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4" /> {scheduleError}
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <Label>Founder Email</Label>
                                                    <Input value={founderEmail || "Loading..."} disabled className="bg-gray-100" />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="date">Date</Label>
                                                        <Input
                                                            id="date"
                                                            type="date"
                                                            min={todayStr}
                                                            value={newMeeting.date}
                                                            onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="time">Time</Label>
                                                        <Input
                                                            id="time"
                                                            type="time"
                                                            value={newMeeting.time}
                                                            onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="link">Meeting Link</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            id="link"
                                                            placeholder="https://meet.jit.si/..."
                                                            value={newMeeting.link}
                                                            readOnly
                                                            className="bg-gray-50 flex-grow"
                                                        />
                                                        <Button type="button" variant="outline" size="icon" onClick={generateMeetLink}>
                                                            <RefreshCw className="h-4 w-4 text-[#576238]" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleScheduleMeeting}
                                                disabled={isScheduling || !founderEmail}
                                                className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                            >
                                                {isScheduling ? <LegoSpinner className="h-4 w-4 animate-spin mr-2" /> : null}
                                                {isScheduling ? "Sending Invite..." : "Send Invite"}
                                            </Button>
                                        </DialogContent>
                                    </Dialog>

                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* TABS SECTION */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Tabs defaultValue="about" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-white border border-slate-200 h-auto p-1 shadow-sm rounded-xl">
                                <TabsTrigger value="videos" className="py-2.5 rounded-lg data-[state=active]:bg-[#576238] data-[state=active]:text-white font-medium">Pitches</TabsTrigger>
                                <TabsTrigger value="about" className="py-2.5 rounded-lg data-[state=active]:bg-[#576238] data-[state=active]:text-white font-medium">Evaluation Analysis</TabsTrigger>
                                <TabsTrigger value="documents" className="py-2.5 rounded-lg data-[state=active]:bg-[#576238] data-[state=active]:text-white font-medium">Data Room</TabsTrigger>
                            </TabsList>

                            <TabsContent value="videos" className="mt-6">
                                {pitchDecks.length === 0 ? <p className="text-center text-gray-500 py-10 bg-white rounded-xl shadow-sm border border-slate-200">No pitches found.</p> : (
                                    <div className="grid md:grid-cols-2 gap-6">{pitchDecks.map(p => (
                                        <Card key={p.pitchdeckid} className="p-4 shadow-sm"><h3 className="font-bold text-[#576238]">{p.pitchname}</h3></Card>
                                    ))}</div>
                                )}
                            </TabsContent>

                            <TabsContent value="about" className="mt-6">
                                {normalizedInvestorData ? (
                                    <div className="space-y-6">
                                        <div className="flex justify-end">
                                            {/* ONE CLICK DOWNLOAD BUTTON */}
                                            <Button
                                                variant="outline"
                                                className="border-[#576238] text-[#576238] hover:bg-[#F4F1EA] shadow-sm bg-white"
                                                onClick={handleDownloadPdf}
                                            >
                                                <Download className="h-4 w-4 mr-2" /> Download Full Report
                                            </Button>
                                        </div>

                                        {/* --- WRAP REPORT IN A REF DIV FOR PRINTING --- */}
                                        <div ref={reportRef} className="bg-[#fcfaf7] p-2 sm:p-6 rounded-2xl print:bg-[#fcfaf7] print:p-8">
                                            <InvestorView data={normalizedInvestorData} />
                                        </div>

                                    </div>
                                ) : (
                                    <Card className="p-8 shadow-sm border-2 border-slate-200 bg-white">
                                        <h3 className="text-xl font-bold text-[#576238] mb-4">Startup Idea Description</h3>
                                        <p className="text-slate-700 leading-relaxed font-serif text-lg">{startup.idea_description}</p>
                                        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                            <p className="text-amber-800 text-sm">Detailed AI evaluation metrics are not yet available for this startup.</p>
                                        </div>
                                    </Card>
                                )}
                            </TabsContent>

                            <TabsContent value="documents" className="mt-6">
                                <Card className="border-2 shadow-sm bg-white">
                                    <CardHeader className="bg-slate-50 border-b border-slate-100"><CardTitle className="text-[#576238]">Data Room</CardTitle></CardHeader>
                                    <CardContent className="p-6">
                                        {documents.length === 0 ? <p className="text-center text-gray-400 py-4">No documents available.</p> : documents.map(doc => (
                                            <div key={doc.did} className="flex justify-between p-4 border border-slate-200 rounded-xl mb-3 items-center hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-[#F4F1EA] rounded-lg">
                                                        {doc.access_status === 'locked' ? <Lock className="text-gray-400 w-5 h-5" /> : <FileText className="text-[#576238] w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{doc.document_name}</p>
                                                        <p className={`text-xs uppercase font-bold mt-1 ${doc.access_status === 'granted' || doc.access_status === 'public' ? 'text-emerald-600' : 'text-amber-500'}`}>{doc.access_status}</p>
                                                    </div>
                                                </div>
                                                {doc.current_path && (doc.access_status === 'granted' || doc.access_status === 'public') ? (
                                                    <a href={doc.current_path} target="_blank"><Button size="sm" variant="outline" className="border-[#576238] text-[#576238]">View Document</Button></a>
                                                ) : (
                                                    <Button size="sm" variant="ghost" disabled className="text-slate-400"><Lock className="h-4 w-4 mr-1" /> Locked</Button>
                                                )}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}