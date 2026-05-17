"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, User, ArrowLeft, ArrowRight, Info, Sparkles, FileUp, CheckCircle2, Trash2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startupService } from "@/services/startupService";
import { pdfService } from "@/services/pdfService";
import LegoLoader from "@/components/lego/LegoLoader";
import LegoSpinner from "@/components/lego/LegoSpinner";
import LegoAddTrigger from "@/components/lego/LegoAddTrigger";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";
import { useAuth } from "@/context/AuthContext";

// ============================================================================
// 1. HELPER COMPONENTS (MUST BE OUTSIDE MAIN COMPONENT TO PREVENT FOCUS LOSS)
// ============================================================================

const SectionHeader = ({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) => (
    <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-full bg-[#576238] text-white flex items-center justify-center text-xs font-bold">{num}</div>
            <h3 className="font-bold text-[#576238] uppercase tracking-wider text-sm">{title}</h3>
        </div>
        {subtitle && <p className="text-xs text-muted-foreground ml-8">{subtitle}</p>}
    </div>
);

const FormField = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
            {label}
            {hint && <span title={hint} className="cursor-help flex items-center"><Info className="h-3 w-3 text-muted-foreground" /></span>}
        </Label>
        {children}
    </div>
);

// ============================================================================
// 2. THE WIZARD COMPONENT (Handles the 8 Steps & Scrolling)
// ============================================================================

function EvaluationWizard({ data, setData, loading, onSubmit, step, setStep, pendingLogoPreview, onLogoChange }: any) {
    const totalSteps = 8;

    const updateField = (field: string, value: any) => {
        setData((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-6 py-4 border-b bg-gray-50/80 flex justify-between items-center shrink-0">
                <div>
                    <DialogTitle className="text-base font-bold text-[#576238]">Startup Form</DialogTitle>
                    <DialogDescription className="text-xs hidden sm:block">Complete all blocks to generate your investor-ready profile.</DialogDescription>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-bold text-[#576238] uppercase block mb-1">Step {step} of {totalSteps}</span>
                    <div className="flex gap-1">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-300 ${step > i ? "bg-[#576238]" : "bg-gray-200"}`} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">

                        {step === 1 && (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2"><SectionHeader num="1" title="Company Snapshot" /></div>
                                <FormField label="Company Name *"><Input value={data.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g. Spark2Scale" /></FormField>
                                <FormField label="HQ Location"><Input value={data.hq_location} onChange={e => updateField('hq_location', e.target.value)} placeholder="e.g. Egypt" /></FormField>
                                <FormField label="Website / Demo Link"><Input value={data.website_url} onChange={e => updateField('website_url', e.target.value)} placeholder="https://..." /></FormField>
                                <FormField label="Date Founded"><Input type="date" value={data.date_founded} onChange={e => updateField('date_founded', e.target.value)} /></FormField>
                                <FormField label="Current Stage *">
                                    <Select value={data.stage} onValueChange={v => updateField('stage', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="Pre-Seed">Pre-Seed</SelectItem><SelectItem value="Seed">Seed</SelectItem></SelectContent>
                                    </Select>
                                </FormField>
                                <FormField label="Amount Raised to Date (USD)"><Input value={data.raised_to_date} onChange={e => updateField('raised_to_date', e.target.value)} /></FormField>
                                <FormField label="Current Round Size (USD)"><Input value={data.current_round_size} onChange={e => updateField('current_round_size', e.target.value)} /></FormField>
                                <FormField label="Target Close Date"><Input type="date" value={data.target_close_date} onChange={e => updateField('target_close_date', e.target.value)} /></FormField>

                                <div className="col-span-2">
                                    <FormField label="Logo (optional)">
                                        <div className="flex items-center gap-4">
                                            {pendingLogoPreview ? (
                                                <img src={pendingLogoPreview} alt="Logo preview" className="h-16 w-16 rounded-full object-cover border-2 border-[#576238]" />
                                            ) : (
                                                <div className="h-16 w-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">Logo</div>
                                            )}
                                            <label className="cursor-pointer text-sm text-[#576238] underline">
                                                {pendingLogoPreview ? "Change logo" : "Upload logo"}
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) onLogoChange(f);
                                                }} />
                                            </label>
                                        </div>
                                    </FormField>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2"><SectionHeader num="2" title="Founder & Team" subtitle="Detail your commitment and execution velocity." /></div>
                                <FormField label="Full-time Start Date"><Input type="date" value={data.full_time_start} onChange={e => updateField('full_time_start', e.target.value)} /></FormField>
                                <div className="col-span-2">
                                    <FormField label="What have you shipped so far? (with dates)" hint="List key milestones or product releases.">
                                        <Textarea value={data.shipments} onChange={e => updateField('shipments', e.target.value)} placeholder={"2025-07: Project Kickoff\n2026-02: MVP Live"} />
                                    </FormField>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <SectionHeader num="3" title="Problem Definition" subtitle="Who is the customer and why is their pain urgent?" />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField label="Primary Customer Profile"><Input value={data.customer_profile} onChange={e => updateField('customer_profile', e.target.value)} placeholder="Role, Company Size, Industry" /></FormField>
                                    <FormField label="Problem Frequency">
                                        <Select value={data.problem_frequency} onValueChange={v => updateField('problem_frequency', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Hourly">Hourly</SelectItem>
                                                <SelectItem value="Daily">Daily</SelectItem>
                                                <SelectItem value="Weekly">Weekly</SelectItem>
                                                <SelectItem value="Monthly">Monthly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormField>
                                </div>
                                <FormField label="Specific Problem (1-2 sentences) *"><Textarea value={data.problem_statement} onChange={e => updateField('problem_statement', e.target.value)} /></FormField>
                                <FormField label="What is broken about current solutions? *"><Textarea value={data.gap_analysis} onChange={e => updateField('gap_analysis', e.target.value)} /></FormField>
                                <FormField label="Cost of NOT solving this problem"><Input value={data.cost_of_not_solving} onChange={e => updateField('cost_of_not_solving', e.target.value)} placeholder="Time, Money, or Risk" /></FormField>
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField label="Interviews Conducted"><Input type="number" value={data.interviews_conducted} onChange={e => updateField('interviews_conducted', Number(e.target.value))} /></FormField>
                                    <FormField label="Verbatim Quotes (Top 3)"><Textarea value={data.customer_quotes} onChange={e => updateField('customer_quotes', e.target.value)} placeholder={"Quote 1...\nQuote 2..."} /></FormField>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6">
                                <SectionHeader num="4" title="Product & Solution" subtitle="Detail your unique approach and defensibility." />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField label="Product Status *">
                                        <Select value={data.product_status} onValueChange={v => updateField('product_status', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Concept">Concept</SelectItem>
                                                <SelectItem value="Prototype">Prototype</SelectItem>
                                                <SelectItem value="MVP">MVP</SelectItem>
                                                <SelectItem value="Live">Live</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormField>
                                    <FormField label="Demo Link / Screenshots"><Input value={data.demo_link} onChange={e => updateField('demo_link', e.target.value)} /></FormField>
                                </div>
                                <FormField label="Core use case users come back for"><Input value={data.core_use_case} onChange={e => updateField('core_use_case', e.target.value)} /></FormField>
                                <FormField label="Meaningful Differentiation *"><Textarea value={data.differentiation} onChange={e => updateField('differentiation', e.target.value)} placeholder="Why are you better than alternatives?" /></FormField>
                                <FormField label="Hardest part to replicate (Moat)"><Input value={data.defensibility} onChange={e => updateField('defensibility', e.target.value)} /></FormField>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="space-y-6">
                                <SectionHeader num="5" title="Market & Scope" />
                                <FormField label="Beachhead Market *"><Input value={data.beachhead_market} onChange={e => updateField('beachhead_market', e.target.value)} /></FormField>
                                <FormField label="Estimated Market Size (USD)"><Input value={data.market_size} onChange={e => updateField('market_size', e.target.value)} /></FormField>
                                <FormField label="Long-term Vision"><Textarea value={data.vision} onChange={e => updateField('vision', e.target.value)} placeholder="How this becomes big..." /></FormField>
                                <FormField label="Expansion Strategy"><Textarea value={data.expansion_strategy} onChange={e => updateField('expansion_strategy', e.target.value)} placeholder="New users, products, or segments" /></FormField>
                            </div>
                        )}

                        {step === 6 && (
                            <div className="space-y-6">
                                <SectionHeader num="6" title={`Traction (${data.stage})`} />
                                {data.stage === "Pre-Seed" ? (
                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField label="Active Users (Weekly/Monthly)"><Input type="number" value={data.active_users} onChange={e => updateField('active_users', Number(e.target.value))} /></FormField>
                                        <FormField label="Early Revenue (USD)"><Input value={data.early_revenue} onChange={e => updateField('early_revenue', e.target.value)} /></FormField>
                                        <div className="col-span-2"><FormField label="Design Partners / LOIs"><Textarea value={data.design_partners} onChange={e => updateField('design_partners', e.target.value)} placeholder="List names if possible" /></FormField></div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField label="Revenue Growth Rate (MoM/QoQ)"><Input value={data.rev_growth} onChange={e => updateField('rev_growth', e.target.value)} /></FormField>
                                        <FormField label="Number of Paying Customers"><Input type="number" value={data.paying_customers} onChange={e => updateField('paying_customers', Number(e.target.value))} /></FormField>
                                        <FormField label="Average Contract Value (ACV)"><Input value={data.acv} onChange={e => updateField('acv', e.target.value)} /></FormField>
                                        <FormField label="Retention Metrics"><Input value={data.retention_metrics} onChange={e => updateField('retention_metrics', e.target.value)} placeholder="Cohort, usage, etc." /></FormField>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 7 && (
                            <div className="space-y-8">
                                <div>
                                    <SectionHeader num="7" title="GTM Strategy" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Buyer vs End User"><Input value={data.buyer_vs_user} onChange={e => updateField('buyer_vs_user', e.target.value)} /></FormField>
                                        <FormField label="Primary Acquisition Channel *"><Input value={data.acquisition_channel} onChange={e => updateField('acquisition_channel', e.target.value)} /></FormField>
                                        <FormField label="Sales Motion *">
                                            <Select value={data.sales_motion} onValueChange={v => updateField('sales_motion', v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Self-serve">Self-serve</SelectItem>
                                                    <SelectItem value="Founder-led">Founder-led</SelectItem>
                                                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormField>
                                        <FormField label="Avg Sales Cycle"><Input value={data.avg_sales_cycle} onChange={e => updateField('avg_sales_cycle', e.target.value)} /></FormField>
                                    </div>
                                </div>
                                <div>
                                    <SectionHeader num="8" title="Business Model" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Pricing Model *"><Input value={data.pricing_model} onChange={e => updateField('pricing_model', e.target.value)} /></FormField>
                                        <FormField label="Gross Margin %"><Input value={data.gross_margin} onChange={e => updateField('gross_margin', e.target.value)} /></FormField>
                                        <FormField label="Monthly Burn ($)"><Input value={data.monthly_burn} onChange={e => updateField('monthly_burn', e.target.value)} /></FormField>
                                        <FormField label="Runway (Months)"><Input value={data.runway} onChange={e => updateField('runway', e.target.value)} /></FormField>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 8 && (
                            <div className="space-y-6">
                                <SectionHeader num="9" title="Vision & Strategy" />
                                <FormField label="Category Creating/Redefining"><Input value={data.category_definition} onChange={e => updateField('category_definition', e.target.value)} /></FormField>
                                <FormField label="Biggest Risk to Success"><Textarea value={data.primary_risk} onChange={e => updateField('primary_risk', e.target.value)} /></FormField>
                                <SectionHeader num="10" title="Fundraising" />
                                <FormField label="Key Round Milestones"><Textarea value={data.round_milestones} onChange={e => updateField('round_milestones', e.target.value)} /></FormField>
                                <FormField label="Existing Investors"><Input value={data.existing_investors} onChange={e => updateField('existing_investors', e.target.value)} /></FormField>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between items-center shrink-0">
                <Button variant="ghost" onClick={() => setStep((s: number) => s - 1)} disabled={step === 1}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                {step < totalSteps
                    ? <Button onClick={() => setStep((s: number) => s + 1)} className="bg-[#576238] hover:bg-[#6b7c3f]">Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    : <Button onClick={onSubmit} disabled={loading} className="bg-[#576238] hover:bg-[#6b7c3f] px-8">{loading ? "Submitting..." : "Finish & Create Startup"}</Button>
                }
            </div>
        </div>
    );
}

// ============================================================================
// 3. MAIN DASHBOARD PAGE
// ============================================================================

const REQUIRED_FIELDS = [
    { id: "name", name: "Company Name", step: 1 },
    { id: "stage", name: "Current Stage", step: 1 },
    { id: "problem_statement", name: "Specific Problem (1-2 sentences)", step: 3 },
    { id: "gap_analysis", name: "What is broken about current solutions?", step: 3 },
    { id: "product_status", name: "Product Status", step: 4 },
    { id: "differentiation", name: "Meaningful differentiation", step: 4 },
    { id: "beachhead_market", name: "Beachhead market", step: 5 },
    { id: "acquisition_channel", name: "Primary acquisition channel", step: 7 },
    { id: "sales_motion", name: "Sales motion", step: 7 },
    { id: "pricing_model", name: "Pricing model", step: 7 },
];

export default function FounderDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [userName, setUserName] = useState("");
    const [startups, setStartups] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [showLoader, setShowLoader] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionSuccess, setExtractionSuccess] = useState(false);

    // Dialog and Form States
    const [open, setOpen] = useState(false);
    const [formStep, setFormStep] = useState(1);
    const [showCancelAlert, setShowCancelAlert] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{ id: string, name: string, step: number }[]>([]);

    const [isBlockDropped, setIsBlockDropped] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
    const [pendingLogoPreview, setPendingLogoPreview] = useState<string | null>(null);

    const [newStartup, setNewStartup] = useState<Record<string, any>>({
        name: "", field: "Technology", region: "MENA", stage: "Pre-Seed", description: "",
        website_url: "", hq_location: "", date_founded: "", raised_to_date: "0",
        current_round_size: "0", target_close_date: "",
        full_time_start: "", shipments: "",
        customer_profile: "", problem_statement: "", current_solution: "", gap_analysis: "",
        problem_frequency: "Daily", cost_of_not_solving: "", interviews_conducted: 0, customer_quotes: "",
        product_status: "MVP", demo_link: "", core_use_case: "", differentiation: "", defensibility: "",
        beachhead_market: "", market_size: "", vision: "", expansion_strategy: "",
        active_users: 0, design_partners: "", early_revenue: "0",
        rev_growth: "0", retention_metrics: "", paying_customers: 0, acv: "0",
        buyer_vs_user: "", acquisition_channel: "", sales_motion: "Self-serve",
        avg_sales_cycle: "", deal_closer: "Founder",
        pricing_model: "", avg_price: "0", gross_margin: "0", monthly_burn: "0", runway: "0",
        category_definition: "", primary_risk: "", round_milestones: "", funds_priorities: "", existing_investors: ""
    });

    useEffect(() => {
        if (!authLoading && !user) { router.push('/signin'); return; }
        if (user) setUserName(user.fname || "User");
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user?.id) return;
        const CACHE_KEY = `dashboard_data_${user.id}`;
        const loaderTimer = setTimeout(() => setShowLoader(true), 200);

        const loadData = async () => {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.length > 0) {
                        setStartups(parsed);
                        clearTimeout(loaderTimer);
                        setIsFetching(false);
                    }
                } catch (e) { console.error("Cache error", e); }
            }

            try {
                const data = await startupService.getByFounder(user.id);
                const enriched = await Promise.all(
                    data.map(async (s: any) => {
                        const [wfResult, pitchResult] = await Promise.allSettled([
                            fetch(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5231").replace(/\/$/, "").replace(/\/api$/, "")}/api/StartupWorkflow/${s.sid}`).then(r => r.ok ? r.json() : null),
                            fetch(`${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5231").replace(/\/$/, "").replace(/\/api$/, "")}/api/PitchDecks/${s.sid}`).then(r => r.ok ? r.json() : []),
                        ]);

                        let progress = s.progress_count ?? 0;
                        let isBroken = s.progress_has_gap ?? false;

                        if (wfResult.status === "fulfilled" && wfResult.value) {
                            const wf = wfResult.value;
                            const stages = [
                                wf.ideaCheck ?? wf.idea_check ?? wf.IdeaCheck ?? false,
                                wf.marketResearch ?? wf.market_research ?? wf.MarketResearch ?? false,
                                wf.evaluation ?? wf.Evaluation ?? false,
                                wf.recommendation ?? wf.Recommendation ?? false,
                                wf.documents ?? wf.Documents ?? false,
                                wf.pitchDeck ?? wf.pitch_deck ?? wf.PitchDeck ?? false,
                            ];
                            progress = stages.filter(Boolean).length;
                            let seenIncomplete = false;
                            isBroken = stages.some(completed => {
                                if (!completed) { seenIncomplete = true; return false; }
                                return seenIncomplete;
                            });
                        }

                        let likes = s.total_likes ?? 0;
                        if (pitchResult.status === "fulfilled" && Array.isArray(pitchResult.value)) {
                            likes = pitchResult.value.reduce((sum: number, p: any) => sum + (p.countlikes ?? 0), 0);
                        }

                        return {
                            id: s.sid, name: s.startupname, field: s.field, region: s.region,
                            stage: s.startup_stage, progress, likes, isBroken, logo_path: s.logo_path ?? null
                        };
                    })
                );
                setStartups(enriched);
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(enriched));
                clearTimeout(loaderTimer);
            } catch (error) {
                console.error("Failed to load startups", error);
            } finally {
                setIsFetching(false);
            }
        };

        loadData();
        return () => clearTimeout(loaderTimer);
    }, [user]);

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtracting(true);
        setExtractionSuccess(false);

        try {
            console.log("🚀 Starting extraction flow...");
            const response = await pdfService.extractFromPdf(file);
            const evaluation = response?.data?.startup_evaluation ?? response?.startup_evaluation ?? response?.data ?? response;

            if (!evaluation || Object.keys(evaluation).length === 0) {
                throw new Error("Server returned empty or unrecognized data structure.");
            }

            const snap = evaluation.company_snapshot ?? {};
            const founder = evaluation.founder_and_team ?? {};
            const problem = evaluation.problem_definition ?? {};
            const product = evaluation.product_and_solution ?? {};
            const market = evaluation.market_and_scope ?? {};
            const traction = evaluation.traction_metrics ?? {};
            const gtm = evaluation.gtm_strategy ?? {};
            const biz = evaluation.business_data ?? {};
            const vis = evaluation.vision_and_strategy ?? {};

            setNewStartup(prev => ({
                ...prev,
                name: snap.company_name || snap.name || prev.name,
                website_url: snap.website_url || snap.website || prev.website_url,
                hq_location: snap.hq_location || snap.hq || prev.hq_location,
                date_founded: snap.date_founded || snap.founded_date || prev.date_founded,
                stage: snap.stage || prev.stage,
                raised_to_date: snap.amount_raised || snap.raised_to_date || prev.raised_to_date,
                current_round_size: snap.round_size || snap.current_round_size || prev.current_round_size,
                target_close_date: snap.target_close_date || prev.target_close_date,
                existing_investors: snap.existing_investors || vis.existing_investors || prev.existing_investors,
                full_time_start: founder.full_time_start || prev.full_time_start,
                shipments: typeof founder.execution === "string" ? founder.execution : Array.isArray(founder.execution?.key_shipments) ? founder.execution.key_shipments.join("\n") : founder.shipments || prev.shipments,
                customer_profile: (typeof problem.customer_profile === "object" ? problem.customer_profile?.description : problem.customer_profile) || problem.target_customer || prev.customer_profile,
                problem_statement: problem.problem_statement || problem.problem || prev.problem_statement,
                current_solution: problem.current_solution || prev.current_solution,
                gap_analysis: problem.gap_analysis || problem.broken_solutions || prev.gap_analysis,
                problem_frequency: problem.problem_frequency || problem.frequency || prev.problem_frequency,
                cost_of_not_solving: problem.cost_of_not_solving || problem.cost || prev.cost_of_not_solving,
                interviews_conducted: Number(problem.interviews_conducted || problem.interviews || prev.interviews_conducted),
                customer_quotes: Array.isArray(problem.customer_quotes) ? problem.customer_quotes.join("\n") : (problem.customer_quotes || prev.customer_quotes),
                product_status: product.product_stage || product.product_status || prev.product_status,
                demo_link: product.demo_link || prev.demo_link,
                core_use_case: product.core_stickiness || product.core_use_case || prev.core_use_case,
                differentiation: product.differentiation || prev.differentiation,
                defensibility: product.defensibility || product.moat || prev.defensibility,
                beachhead_market: market.beachhead_market || market.beachhead || prev.beachhead_market,
                market_size: market.market_size || prev.market_size,
                vision: vis.five_year_vision || vis.long_term_vision || vis.vision || prev.vision,
                expansion_strategy: market.expansion_strategy || prev.expansion_strategy,
                active_users: Number(traction.user_count || traction.active_users_monthly || traction.active_users || prev.active_users),
                design_partners: Array.isArray(traction.design_partners) ? traction.design_partners.join(", ") : (traction.design_partners || prev.design_partners),
                early_revenue: traction.early_revenue || traction.revenue || prev.early_revenue,
                rev_growth: traction.revenue_growth || traction.rev_growth || prev.rev_growth,
                retention_metrics: traction.retention_metrics || prev.retention_metrics,
                paying_customers: Number(traction.paying_customers || prev.paying_customers),
                acv: traction.acv || prev.acv,
                buyer_vs_user: gtm.buyer_persona || gtm.buyer_vs_user || prev.buyer_vs_user,
                acquisition_channel: gtm.primary_acquisition_channel || gtm.acquisition_channel || prev.acquisition_channel,
                sales_motion: gtm.sales_motion || prev.sales_motion,
                avg_sales_cycle: gtm.avg_sales_cycle || prev.avg_sales_cycle,
                deal_closer: gtm.deal_closer || prev.deal_closer,
                pricing_model: biz.pricing_model || prev.pricing_model,
                avg_price: String(biz.average_price_per_customer || biz.avg_price || prev.avg_price),
                gross_margin: String(biz.gross_margin || prev.gross_margin),
                monthly_burn: String(biz.monthly_burn || prev.monthly_burn),
                runway: String(biz.runway_months || biz.runway || prev.runway),
                category_definition: vis.category_definition || prev.category_definition,
                primary_risk: vis.primary_risk || vis.risk || prev.primary_risk,
                round_milestones: vis.round_milestones || vis.milestones || prev.round_milestones,
                funds_priorities: vis.funds_priorities || vis.use_of_funds || prev.funds_priorities,
            }));

            setExtractionSuccess(true);
        } catch (error: any) {
            console.error("Extraction error:", error);
            alert(`Could not extract data: ${error.message || "Unknown error"}`);
        } finally {
            setIsExtracting(false);
            e.target.value = '';
        }
    };

    const resetForm = () => {
        setNewStartup({
            name: "", field: "Technology", region: "MENA", stage: "Pre-Seed", description: "",
            website_url: "", hq_location: "", date_founded: "", raised_to_date: "0",
            current_round_size: "0", target_close_date: "",
            full_time_start: "", shipments: "",
            customer_profile: "", problem_statement: "", current_solution: "", gap_analysis: "",
            problem_frequency: "Daily", cost_of_not_solving: "", interviews_conducted: 0, customer_quotes: "",
            product_status: "MVP", demo_link: "", core_use_case: "", differentiation: "", defensibility: "",
            beachhead_market: "", market_size: "", vision: "", expansion_strategy: "",
            active_users: 0, design_partners: "", early_revenue: "0",
            rev_growth: "0", retention_metrics: "", paying_customers: 0, acv: "0",
            buyer_vs_user: "", acquisition_channel: "", sales_motion: "Self-serve",
            avg_sales_cycle: "", deal_closer: "Founder",
            pricing_model: "", avg_price: "0", gross_margin: "0", monthly_burn: "0", runway: "0",
            category_definition: "", primary_risk: "", round_milestones: "", funds_priorities: "", existing_investors: ""
        });
        setFormStep(1);
        setValidationErrors([]);
        setExtractionSuccess(false);
        setPendingLogoFile(null);
        setPendingLogoPreview(null);
    };

    const handleTriggerClick = () => { setIsBlockDropped(true); setTimeout(() => setOpen(true), 600); };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            if (validationErrors.length > 0) return;
            setShowCancelAlert(true);
        } else {
            setOpen(true);
            setFormStep(1); // Ensure it resets to step 1 on fresh open
        }
    };

    const confirmCancelCreation = () => {
        setShowCancelAlert(false);
        setOpen(false);
        resetForm();
        if (startups.length === 0) setTimeout(() => setIsBlockDropped(false), 200);
    };

    const handleAddStartup = async () => {
        // Run field validation based on the required fields map
        const errors = REQUIRED_FIELDS.filter(f => !newStartup[f.id] || String(newStartup[f.id]).trim() === "");

        if (errors.length > 0) {
            setValidationErrors(errors);
            return; // Stop submission and show error alert
        }

        if (!user?.id) { alert("User not authenticated."); return; }
        setIsCreating(true);
        try {
            const desc = newStartup.problem_statement?.trim() || newStartup.description || "None";

            const structuredJson = {
                startup_evaluation: {
                    meta_data: { form_type: `${newStartup.stage} Evaluation`, last_updated: new Date().toISOString().split("T")[0] },
                    company_snapshot: {
                        company_name: newStartup.name, website_url: newStartup.website_url, hq_location: newStartup.hq_location,
                        date_founded: newStartup.date_founded, current_stage: newStartup.stage, amount_raised_to_date: newStartup.raised_to_date,
                        current_round: { target_amount: newStartup.current_round_size, target_close_date: newStartup.target_close_date },
                        existing_investors: newStartup.existing_investors,
                    },
                    founder_and_team: {
                        execution: { full_time_start_date: newStartup.full_time_start, key_shipments: newStartup.shipments ? newStartup.shipments.split("\n").filter(Boolean) : [] },
                    },
                    problem_definition: {
                        customer_profile: { description: newStartup.customer_profile }, problem_statement: newStartup.problem_statement,
                        current_solution: newStartup.current_solution, gap_analysis: newStartup.gap_analysis, frequency: newStartup.problem_frequency,
                        impact_metrics: { cost_type: newStartup.cost_of_not_solving }, evidence: { interviews_conducted: newStartup.interviews_conducted, customer_quotes: newStartup.customer_quotes ? newStartup.customer_quotes.split("\n").filter(Boolean) : [] },
                    },
                    product_and_solution: {
                        product_stage: newStartup.product_status, demo_link: newStartup.demo_link, core_stickiness: newStartup.core_use_case,
                        differentiation: newStartup.differentiation, defensibility_moat: newStartup.defensibility,
                    },
                    market_and_scope: {
                        beachhead_market: newStartup.beachhead_market, market_size_estimate: newStartup.market_size,
                        long_term_vision: newStartup.vision, expansion_strategy: newStartup.expansion_strategy,
                    },
                    traction_metrics: {
                        stage_context: newStartup.stage, user_count: newStartup.active_users, active_users_monthly: newStartup.active_users,
                        early_revenue: newStartup.early_revenue, partnerships_and_lois: newStartup.design_partners ? newStartup.design_partners.split("\n").filter(Boolean) : [],
                        revenue_growth: newStartup.rev_growth, paying_customers: newStartup.paying_customers, acv: newStartup.acv, retention_metrics: newStartup.retention_metrics,
                    },
                    gtm_strategy: {
                        buyer_persona: newStartup.buyer_vs_user, primary_acquisition_channel: newStartup.acquisition_channel,
                        sales_motion: newStartup.sales_motion, average_sales_cycle: newStartup.avg_sales_cycle, deal_closer: newStartup.deal_closer,
                    },
                    business_model: {
                        pricing_model: newStartup.pricing_model, average_price_per_customer: Number(newStartup.avg_price) || 0,
                        gross_margin: Number(newStartup.gross_margin) || 0, monthly_burn: Number(newStartup.monthly_burn) || 0, runway_months: Number(newStartup.runway) || 0,
                    },
                    vision_and_strategy: {
                        five_year_vision: newStartup.vision, category_definition: newStartup.category_definition, primary_risk: newStartup.primary_risk,
                        round_milestones: newStartup.round_milestones, use_of_funds: newStartup.funds_priorities ? (Array.isArray(newStartup.funds_priorities) ? newStartup.funds_priorities : String(newStartup.funds_priorities).split("\n").filter(Boolean)) : [],
                    },
                },
            };

            const payload = {
                startupname: newStartup.name, field: newStartup.field, region: newStartup.region,
                startup_stage: newStartup.stage, idea_description: desc, founder_id: user.id, json_response: structuredJson,
            };

            const createdStartup = await startupService.create(payload);

            let finalLogoPath: string | undefined;
            if (pendingLogoFile && createdStartup.sid) {
                try {
                    finalLogoPath = await startupService.uploadLogo(createdStartup.sid, pendingLogoFile);
                } catch (e) {
                    console.warn("Logo upload failed, continuing without logo", e);
                }
            }

            const newStartupUI = {
                id: createdStartup.sid,
                name: createdStartup.startupname,
                field: createdStartup.field,
                region: createdStartup.region,
                stage: createdStartup.startup_stage,
                progress: 0,
                likes: 0,
                isBroken: false,
                logo_path: finalLogoPath ?? null,
            };

            const updatedList = [...startups, newStartupUI];
            setStartups(updatedList);
            sessionStorage.setItem(`dashboard_data_${user.id}`, JSON.stringify(updatedList));
            resetForm();
            setOpen(false);
        } catch (error) { console.error("Error creating startup:", error); alert("Failed. Check console."); }
        finally { setIsCreating(false); }
    };

    const handleDeleteStartup = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();

        setIsDeleting(true);
        try {
            await startupService.delete(id);
            const updatedList = startups.filter(s => s.id !== id);
            setStartups(updatedList);
            if (user?.id) sessionStorage.setItem(`dashboard_data_${user.id}`, JSON.stringify(updatedList));
            setConfirmDeleteId(null);
        } catch (error) {
            console.error("Error deleting startup:", error);
            alert("Failed to delete startup. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (authLoading || isFetching) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#F0EADC]">
                <LegoLoader />
            </div>
        );
    }

    return (
        <div className="h-screen w-full overflow-y-auto bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 relative">
            {/* Validations Alert Dialog */}
            <Dialog open={validationErrors.length > 0} onOpenChange={(open) => !open && setValidationErrors([])}>
                <DialogContent className="sm:max-w-md bg-white border border-[#576238]">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <AlertCircle className="h-7 w-7 text-[#FFD95D]" />
                            <DialogTitle className="text-xl text-[#576238]">Missing Required Info</DialogTitle>
                        </div>
                        <DialogDescription className="text-gray-600">
                            You're almost there! We just need you to complete a few more fields to build your investor-ready profile.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[40vh] overflow-y-auto mt-4 space-y-4 pr-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(stepNum => {
                            const stepErrors = validationErrors.filter(e => e.step === stepNum);
                            if (stepErrors.length === 0) return null;
                            return (
                                <div key={stepNum} className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-[#576238] text-sm uppercase tracking-wider">
                                            Step {stepNum}
                                        </h4>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs bg-white hover:bg-[#576238]/10 hover:text-[#576238]"
                                            onClick={() => { setFormStep(stepNum); setValidationErrors([]); }}
                                        >
                                            Go to Step
                                        </Button>
                                    </div>
                                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                                        {stepErrors.map(e => <li key={e.id}>{e.name}</li>)}
                                    </ul>
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex justify-end mt-4 pt-2 border-t">
                        <Button onClick={() => setValidationErrors([])} className="bg-[#576238] hover:bg-[#6b7c3f]">Got it</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancel Edit Alert Dialog */}
            <Dialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
                <DialogContent className="sm:max-w-sm bg-white border border-gray-200">
                    <DialogHeader>
                        <DialogTitle className="text-lg text-gray-900">Discard Startup?</DialogTitle>
                        <DialogDescription className="text-gray-600 mt-2">
                            Are you sure you don't want to continue making this startup? Any unsaved progress will be completely lost.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" className="border-gray-200" onClick={() => setShowCancelAlert(false)}>No, continue editing</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmCancelCreation}>Yes, discard</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-40 shadow-sm">
                <div className="flex w-full items-center justify-between px-6 md:px-12 py-4">
                    <h1 className="text-xl font-bold text-[#576238] leading-tight">Hello {userName} 👋</h1>
                    <div className="flex items-center gap-2">
                        <Link href="/schedule"><Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]"><Calendar className="h-5 w-5" /></Button></Link>
                        <NotificationsDropdown />
                        <Link href="/profile"><Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238]"><User className="h-5 w-5" /></Button></Link>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 pb-20">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-[#576238]">Startup Projects</h2>
                    {startups.length > 0 && (
                        <Dialog open={open} onOpenChange={handleOpenChange}>
                            <DialogTrigger asChild><Button className="bg-[#576238] hover:bg-[#6b7c3f]"><Plus className="mr-2 h-4 w-4" /> Add Startup</Button></DialogTrigger>

                            <DialogContent className="sm:max-w-[850px] w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden bg-white border-none shadow-2xl rounded-2xl"
                                onInteractOutside={(e) => {
                                    e.preventDefault();
                                    if (validationErrors.length === 0) {
                                        handleOpenChange(false);
                                    }
                                }}>
                                <div className="bg-[#576238] px-6 py-5 shrink-0">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="h-5 w-5 text-[#FFD95D]" />
                                        <h3 className="font-bold text-white text-base tracking-tight">AI Startup Builder</h3>
                                    </div>
                                    <label htmlFor="pdf-upload-main" className={`group relative flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-5 px-4 text-center ${isExtracting ? "border-[#FFD95D]/60 bg-[#FFD95D]/10 cursor-wait" : extractionSuccess ? "border-green-400/70 bg-green-500/10" : "border-white/30 bg-white/10 hover:bg-white/20 hover:border-[#FFD95D]/60"}`}>
                                        <input id="pdf-upload-main" type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={isExtracting} />
                                        <AnimatePresence mode="wait">
                                            {isExtracting ? (
                                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                                                    <LegoSpinner className="h-7 w-7 animate-spin text-[#FFD95D]" />
                                                    <p className="text-[#FFD95D] text-sm font-semibold">Analysing your pitch deck…</p>
                                                </motion.div>
                                            ) : extractionSuccess ? (
                                                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-1">
                                                    <CheckCircle2 className="h-7 w-7 text-green-400" />
                                                    <p className="text-green-300 font-semibold text-sm">Fields auto-filled from your deck!</p>
                                                </motion.div>
                                            ) : (
                                                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-row items-center gap-3">
                                                    <FileUp className="h-6 w-6 text-white" />
                                                    <div>
                                                        <p className="text-white font-semibold text-sm">Upload pitch deck to auto-fill</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </label>
                                </div>
                                <div className="flex-1 overflow-hidden relative">
                                    <EvaluationWizard
                                        data={newStartup}
                                        setData={setNewStartup}
                                        loading={isCreating}
                                        onSubmit={handleAddStartup}
                                        step={formStep}
                                        setStep={setFormStep}
                                        pendingLogoPreview={pendingLogoPreview}
                                        onLogoChange={(f: File) => {
                                            setPendingLogoFile(f);
                                            setPendingLogoPreview(URL.createObjectURL(f));
                                        }}
                                    />
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Rest of the startup list grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]">
                    {startups.length === 0 ? (
                        <>
                            <LegoAddTrigger isDropped={isBlockDropped} onTrigger={handleTriggerClick} />
                            <Dialog open={open} onOpenChange={handleOpenChange}>
                                <DialogContent className="sm:max-w-[850px] w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden bg-white border-none shadow-2xl rounded-2xl"
                                    onInteractOutside={(e) => {
                                        e.preventDefault();
                                        if (validationErrors.length === 0) {
                                            handleOpenChange(false);
                                        }
                                    }}>
                                    <div className="bg-[#576238] px-6 py-5 shrink-0">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles className="h-5 w-5 text-[#FFD95D]" />
                                            <h3 className="font-bold text-white text-base tracking-tight">AI Startup Builder</h3>
                                        </div>
                                        <label htmlFor="pdf-upload-main-empty" className={`group relative flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-5 px-4 text-center ${isExtracting ? "border-[#FFD95D]/60 bg-[#FFD95D]/10 cursor-wait" : extractionSuccess ? "border-green-400/70 bg-green-500/10" : "border-white/30 bg-white/10 hover:bg-white/20 hover:border-[#FFD95D]/60"}`}>
                                            <input id="pdf-upload-main-empty" type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={isExtracting} />
                                            <AnimatePresence mode="wait">
                                                {isExtracting ? (
                                                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                                                        <LegoSpinner className="h-7 w-7 animate-spin text-[#FFD95D]" />
                                                        <p className="text-[#FFD95D] text-sm font-semibold">Analysing your pitch deck…</p>
                                                    </motion.div>
                                                ) : extractionSuccess ? (
                                                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-1">
                                                        <CheckCircle2 className="h-7 w-7 text-green-400" />
                                                        <p className="text-green-300 font-semibold text-sm">Fields auto-filled from your deck!</p>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-row items-center gap-3">
                                                        <FileUp className="h-6 w-6 text-white" />
                                                        <div>
                                                            <p className="text-white font-semibold text-sm">Upload pitch deck to auto-fill</p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </label>
                                    </div>
                                    <div className="flex-1 overflow-hidden relative">
                                        <EvaluationWizard
                                            data={newStartup}
                                            setData={setNewStartup}
                                            loading={isCreating}
                                            onSubmit={handleAddStartup}
                                            step={formStep}
                                            setStep={setFormStep}
                                            pendingLogoPreview={pendingLogoPreview}
                                            onLogoChange={(f: File) => {
                                                setPendingLogoFile(f);
                                                setPendingLogoPreview(URL.createObjectURL(f));
                                            }}
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </>
                    ) : (
                        startups.map((startup, index) => (
                            <motion.div key={startup.id || index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="relative group">
                                <Link href={`/founder/startup/${startup.id}`} className="block h-full">
                                    <Card className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-[#FFD95D] h-full">
                                        <CardHeader>
                                            <div className="flex items-center gap-3">
                                                {startup.logo_path ? (
                                                    <img src={startup.logo_path} alt={startup.name} className="h-10 w-10 rounded-full object-cover border border-gray-200 shrink-0" />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-[#576238]/10 flex items-center justify-center shrink-0">
                                                        <span className="text-[#576238] font-bold text-sm">{startup.name?.[0]?.toUpperCase()}</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <CardTitle className="text-[#576238]">{startup.name}</CardTitle>
                                                    <CardDescription>{startup.field} • {startup.region}</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-muted-foreground">Progress</span>
                                                    <span className={`text-sm font-semibold ${startup.isBroken ? 'text-red-600' : 'text-[#576238]'}`}>
                                                        {startup.progress}/6 stages {startup.isBroken && "(Gaps!)"}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className={`${startup.isBroken ? 'bg-red-500' : 'bg-[#576238]'} h-2 rounded-full transition-all`} style={{ width: `${(startup.progress / 6) * 100}%` }} />
                                                </div>
                                                <div className="flex items-center justify-between pt-2">
                                                    <span className="text-sm text-muted-foreground">❤️ {startup.likes} likes</span>
                                                    <Button size="sm" className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black">Open →</Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                                <AnimatePresence mode="wait">
                                    {confirmDeleteId === startup.id ? (
                                        <motion.div
                                            key="confirm"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="absolute top-4 right-4 bg-red-50 p-3 rounded-xl border-2 border-red-200 shadow-lg z-20 flex flex-col items-end gap-2"
                                        >
                                            <p className="text-xs text-red-700 font-bold mb-1">Delete startup?</p>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" className="h-7 text-xs bg-white hover:bg-gray-100 border-red-200" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(null); }}>No</Button>
                                                <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={(e) => handleDeleteStartup(e, startup.id)} disabled={isDeleting}>{isDeleting ? "..." : "Yes"}</Button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(startup.id); }}
                                            className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm border border-gray-200"
                                            title="Delete Startup"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
