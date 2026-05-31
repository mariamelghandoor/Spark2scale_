"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, User, ArrowLeft, ArrowRight, Info, Sparkles, FileUp, CheckCircle2, Trash2, AlertCircle, Search, BarChart2, Heart, AlertTriangle, Lightbulb, Settings, Compass, Trophy } from "lucide-react";
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
                                <FormField label="HQ Location *"><Input value={data.hq_location} onChange={e => updateField('hq_location', e.target.value)} placeholder="e.g. Egypt" /></FormField>
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
                            <div className="space-y-6">
                                <SectionHeader num="2" title="Founder & Team" subtitle="Detail your team, commitment, and execution velocity." />

                                {/* Founders list — drives startup_evaluation.founder_and_team.founders[].
                                    The recommendation/evaluation agents use names, roles, ownership,
                                    experience, and market-fit statement when scoring the Team dimension
                                    and matching founder-related risk patterns. */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[#576238] font-semibold">Founders *</Label>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs border-[#576238] text-[#576238] hover:bg-[#576238] hover:text-white"
                                            onClick={() => updateField('founders', [...(data.founders ?? []), { name: "", role: "", ownership_percentage: 0, prior_experience: "", years_direct_experience: 0, founder_market_fit_statement: "" }])}
                                        >
                                            + Add founder
                                        </Button>
                                    </div>

                                    {(data.founders ?? []).map((f: any, idx: number) => {
                                        const updateFounder = (key: string, value: any) => {
                                            const next = [...(data.founders ?? [])];
                                            next[idx] = { ...next[idx], [key]: value };
                                            updateField('founders', next);
                                        };
                                        const removeFounder = () => {
                                            const next = (data.founders ?? []).filter((_: any, i: number) => i !== idx);
                                            updateField('founders', next);
                                        };
                                        return (
                                            <div key={idx} className="rounded-xl border border-[#576238]/20 bg-[#F0EADC]/30 p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-[#576238]/70">Founder #{idx + 1}</span>
                                                    {(data.founders ?? []).length > 1 && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 text-[10px] text-red-600 hover:bg-red-50 hover:text-red-700"
                                                            onClick={removeFounder}
                                                        >
                                                            Remove
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <FormField label="Full Name *">
                                                        <Input value={f.name ?? ""} onChange={e => updateFounder('name', e.target.value)} placeholder="Doha Hemdan" />
                                                    </FormField>
                                                    <FormField label="Role *">
                                                        <Input value={f.role ?? ""} onChange={e => updateFounder('role', e.target.value)} placeholder="CEO, CTO, COO…" />
                                                    </FormField>
                                                    <FormField label="Ownership % *">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={f.ownership_percentage ?? 0}
                                                            onChange={e => updateFounder('ownership_percentage', Number(e.target.value))}
                                                        />
                                                    </FormField>
                                                    <FormField label="Years of Direct Experience">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            value={f.years_direct_experience ?? 0}
                                                            onChange={e => updateFounder('years_direct_experience', Number(e.target.value))}
                                                        />
                                                    </FormField>
                                                </div>
                                                <FormField label="Prior Experience *" hint="Roles, companies, and domain expertise.">
                                                    <Input value={f.prior_experience ?? ""} onChange={e => updateFounder('prior_experience', e.target.value)} placeholder="AI Engineer at Tabaani; 4 years building startup-eval tooling" />
                                                </FormField>
                                                <FormField label="Founder–Market Fit Statement *" hint="Why this founder uniquely solves this problem.">
                                                    <Textarea
                                                        value={f.founder_market_fit_statement ?? ""}
                                                        onChange={e => updateFounder('founder_market_fit_statement', e.target.value)}
                                                        placeholder="Built and shipped two pre-seed evaluation tools; interviewed 40+ MENA founders before writing a line of code."
                                                    />
                                                </FormField>
                                            </div>
                                        );
                                    })}

                                    {(data.founders ?? []).length === 0 && (
                                        <p className="text-xs text-[#576238]/70 italic">Click <span className="font-semibold">Add founder</span> to add at least one team member. The AI uses these details to score the Team dimension.</p>
                                    )}
                                </div>

                                {/* Execution */}
                                <div className="grid grid-cols-2 gap-6 pt-2 border-t border-[#576238]/10">
                                    <FormField label="Full-time Start Date"><Input type="date" value={data.full_time_start} onChange={e => updateField('full_time_start', e.target.value)} /></FormField>
                                    <div className="col-span-2">
                                        <FormField label="What have you shipped so far? (with dates)" hint="List key milestones or product releases.">
                                            <Textarea value={data.shipments} onChange={e => updateField('shipments', e.target.value)} placeholder={"2025-07: Project Kickoff\n2026-02: MVP Live"} />
                                        </FormField>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <SectionHeader num="3" title="Problem Definition" subtitle="Who is the customer and why is their pain urgent?" />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField label="Primary Customer Profile *"><Input value={data.customer_profile} onChange={e => updateField('customer_profile', e.target.value)} placeholder="Role, Company Size, Industry" /></FormField>
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
                                <FormField label="Cost of NOT solving this problem *"><Input value={data.cost_of_not_solving} onChange={e => updateField('cost_of_not_solving', e.target.value)} placeholder="Time, Money, or Risk" /></FormField>
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
                                <FormField label="Core use case users come back for *"><Input value={data.core_use_case} onChange={e => updateField('core_use_case', e.target.value)} /></FormField>
                                <FormField label="Meaningful Differentiation *"><Textarea value={data.differentiation} onChange={e => updateField('differentiation', e.target.value)} placeholder="Why are you better than alternatives?" /></FormField>
                                <FormField label="Hardest part to replicate (Moat)"><Input value={data.defensibility} onChange={e => updateField('defensibility', e.target.value)} /></FormField>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="space-y-6">
                                <SectionHeader num="5" title="Market & Scope" />
                                <FormField label="Beachhead Market *"><Input value={data.beachhead_market} onChange={e => updateField('beachhead_market', e.target.value)} /></FormField>
                                <FormField label="Estimated Market Size (USD)"><Input value={data.market_size} onChange={e => updateField('market_size', e.target.value)} /></FormField>
                                <FormField label="Long-term Vision *"><Textarea value={data.vision} onChange={e => updateField('vision', e.target.value)} placeholder="How this becomes big..." /></FormField>
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
                                        <FormField label="Monthly Burn ($) *"><Input value={data.monthly_burn} onChange={e => updateField('monthly_burn', e.target.value)} /></FormField>
                                        <FormField label="Runway (Months) *"><Input value={data.runway} onChange={e => updateField('runway', e.target.value)} /></FormField>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 8 && (
                            <div className="space-y-6">
                                <SectionHeader num="9" title="Vision & Strategy" />
                                <FormField label="Category Creating/Redefining"><Input value={data.category_definition} onChange={e => updateField('category_definition', e.target.value)} /></FormField>
                                <FormField label="Biggest Risk to Success *"><Textarea value={data.primary_risk} onChange={e => updateField('primary_risk', e.target.value)} /></FormField>
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

// Required fields drive both the wizard's submit-time validation and the *
// markers shown next to each label. Every field listed here is an AI-critical
// input — if it's blank, downstream agents (evaluation, recommendation, BMC,
// SWOT) start producing "Unknown" cells and shallow reports.
const REQUIRED_FIELDS = [
    // Step 1 — Company Snapshot
    { id: "name",                 name: "Company Name",                              step: 1 },
    { id: "hq_location",          name: "HQ Location",                               step: 1 },
    { id: "stage",                name: "Current Stage",                             step: 1 },

    // Step 3 — Problem Definition
    { id: "customer_profile",     name: "Primary Customer Profile",                  step: 3 },
    { id: "problem_statement",    name: "Specific Problem (1-2 sentences)",          step: 3 },
    { id: "gap_analysis",         name: "What is broken about current solutions?",   step: 3 },
    { id: "cost_of_not_solving",  name: "Cost of NOT solving this problem",          step: 3 },

    // Step 4 — Product & Solution
    { id: "product_status",       name: "Product Status",                            step: 4 },
    { id: "core_use_case",        name: "Core use case users come back for",         step: 4 },
    { id: "differentiation",      name: "Meaningful differentiation",                step: 4 },

    // Step 5 — Market & Scope
    { id: "beachhead_market",     name: "Beachhead market",                          step: 5 },
    { id: "vision",               name: "Long-term Vision",                          step: 5 },

    // Step 7 — GTM Strategy + Business Model
    { id: "acquisition_channel",  name: "Primary acquisition channel",               step: 7 },
    { id: "sales_motion",         name: "Sales motion",                              step: 7 },
    { id: "pricing_model",        name: "Pricing model",                             step: 7 },
    { id: "monthly_burn",         name: "Monthly Burn ($)",                          step: 7 },
    { id: "runway",               name: "Runway (Months)",                           step: 7 },

    // Step 8 — Vision & Strategy
    { id: "primary_risk",         name: "Biggest Risk to Success",                   step: 8 },
];

const TIPS = [
    {
        title: "Pitch Deck Speedup",
        desc: "Startups that upload high-fidelity pitch decks complete evaluation stages 45% faster."
    },
    {
        title: "Financial Validation",
        desc: "Validate your financial model early to increase investor interest by up to 60%."
    },
    {
        title: "Market Sizing TAM/SAM",
        desc: "Add clear market size metrics (TAM, SAM, SOM) in Step 2 to stand out to VCs."
    },
    {
        title: "Synergy & Experience",
        desc: "Keep your team profiles up to date. Backers look for synergy and domain experience."
    },
    {
        title: "Resolve Validation Gaps",
        desc: "Fix validation gaps promptly. Investors filter out startups with incomplete workspaces."
    }
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

    const [searchQuery, setSearchQuery] = useState("");
    const [stageFilter, setStageFilter] = useState("all");
    const [currentTipIndex, setCurrentTipIndex] = useState(0);

    // Computed metrics
    const totalStartups = startups.length;
    const avgProgress = startups.length
        ? Math.round((startups.reduce((acc, s) => acc + (s.progress || 0), 0) / (startups.length * 6)) * 100)
        : 0;
    const totalLikes = startups.reduce((acc, s) => acc + (s.likes || 0), 0);
    const startupsWithGaps = startups.filter(s => s.isBroken).length;

    const filteredStartups = startups.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             s.field.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStage = stageFilter === "all" || s.stage.toLowerCase() === stageFilter.toLowerCase();
        return matchesSearch && matchesStage;
    });

    const getAiRecommendations = () => {
        const recs = [];
        if (startups.length === 0) {
            recs.push({
                title: "Initialize your first project",
                desc: "Get started by building your first startup workspace. You can upload a pitch deck to auto-fill details!",
                action: "Add Startup",
                type: "info"
            });
        } else {
            const lowProgress = startups.find(s => s.progress < 4);
            if (lowProgress) {
                recs.push({
                    title: `Complete Evaluation for ${lowProgress.name}`,
                    desc: `[[${lowProgress.name}]] has completed ${lowProgress.progress} out of 6 stages. Complete stage 4 to increase investor engagement.`,
                    action: `Open ${lowProgress.name}`,
                    link: `/founder/startup/${lowProgress.id}`,
                    type: "progress"
                });
            }
            const hasGaps = startups.find(s => s.isBroken);
            if (hasGaps) {
                recs.push({
                    title: `Resolve validation gaps in ${hasGaps.name}`,
                    desc: `[[${hasGaps.name}]] has active verification gaps. Resolve them to boost its investment readiness score.`,
                    action: `Fix ${hasGaps.name} Gaps`,
                    link: `/founder/startup/${hasGaps.id}`,
                    type: "warning"
                });
            }
            const noLikes = startups.find(s => s.likes === 0);
            if (noLikes) {
                recs.push({
                    title: `Share ${noLikes.name} Profile`,
                    desc: `Share [[${noLikes.name}]] with investors to start receiving feedback and tracking likes.`,
                    action: `Get ${noLikes.name} Link`,
                    link: `/founder/startup/${noLikes.id}`,
                    type: "share"
                });
            }
        }
        recs.push({
            title: "Schedule a mock review",
            desc: "Book a 1-on-1 session with a mentor to dry-run your evaluation and deck.",
            action: "Schedule Mock",
            link: "/schedule",
            type: "calendar"
        });
        return recs;
    };

    const [newStartup, setNewStartup] = useState<Record<string, any>>({
        name: "", field: "Technology", region: "MENA", stage: "Pre-Seed", description: "",
        website_url: "", hq_location: "", date_founded: "", raised_to_date: "0",
        current_round_size: "0", target_close_date: "",
        full_time_start: "", shipments: "",
        founders: [{ name: "", role: "", ownership_percentage: 0, prior_experience: "", years_direct_experience: 0, founder_market_fit_statement: "" }],
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
        const interval = setInterval(() => {
            setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

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
            const response = (await pdfService.extractFromPdf(file)) as any;
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
            // Read business_model (the canonical name used by every other
            // part of the stack). The previous code read business_data, which
            // silently dropped pricing_model / monthly_burn / runway etc.
            const biz = evaluation.business_model ?? evaluation.business_data ?? {};
            const vis = evaluation.vision_and_strategy ?? {};

            // Map extracted founders into the wizard's founders[] state shape.
            // Without this, founders pulled from the pitch deck were lost and
            // the Team dimension scored 0/5 every time.
            const extractedFounders: any[] = Array.isArray(founder.founders)
                ? founder.founders
                    .map((f: any) => ({
                        name: f?.name ?? "",
                        role: f?.role ?? "",
                        ownership_percentage: Number(f?.ownership_percentage ?? f?.ownership ?? 0) || 0,
                        prior_experience: f?.prior_experience ?? f?.experience ?? "",
                        years_direct_experience: Number(f?.years_direct_experience ?? f?.years_experience ?? 0) || 0,
                        founder_market_fit_statement: f?.founder_market_fit_statement ?? f?.market_fit ?? "",
                    }))
                    .filter((f: any) => (f.name || "").trim() !== "")
                : [];

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
                full_time_start: founder.execution?.full_time_start_date || founder.full_time_start || prev.full_time_start,
                shipments: typeof founder.execution === "string" ? founder.execution : Array.isArray(founder.execution?.key_shipments) ? founder.execution.key_shipments.join("\n") : founder.shipments || prev.shipments,
                founders: extractedFounders.length > 0 ? extractedFounders : prev.founders,
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
            founders: [{ name: "", role: "", ownership_percentage: 0, prior_experience: "", years_direct_experience: 0, founder_market_fit_statement: "" }],
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

        // Founder array isn't a flat field, so it needs its own check.
        // The Recommendation/Evaluation agents score Team on founder details,
        // so at least one founder with name + role + prior experience + market-fit
        // statement is required to avoid the "Sarasero / OFFLINE" empty-data trap.
        const founders = Array.isArray(newStartup.founders) ? newStartup.founders : [];
        const firstFounder = founders[0];
        if (!firstFounder
            || !String(firstFounder.name ?? "").trim()
            || !String(firstFounder.role ?? "").trim()
            || !String(firstFounder.prior_experience ?? "").trim()
            || !String(firstFounder.founder_market_fit_statement ?? "").trim()
        ) {
            errors.push({
                id: "founders",
                name: "Founders (name, role, prior experience, founder–market fit statement)",
                step: 2,
            });
        }

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
                        founders: (Array.isArray(newStartup.founders) ? newStartup.founders : [])
                            .filter((f: any) => f && (f.name || "").trim() !== "")
                            .map((f: any) => ({
                                name: (f.name || "").trim(),
                                role: (f.role || "").trim(),
                                ownership_percentage: Number(f.ownership_percentage) || 0,
                                prior_experience: (f.prior_experience || "").trim(),
                                years_direct_experience: Number(f.years_direct_experience) || 0,
                                founder_market_fit_statement: (f.founder_market_fit_statement || "").trim(),
                            })),
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

            {/* MAIN WIZARD DIALOG DEFINED ONCE */}
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

            {/* Header bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-40 shadow-sm">
                <div className="flex w-full items-center justify-between px-6 md:px-12 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#576238] to-[#6b7c3f] flex items-center justify-center text-white shadow-md font-bold">
                            {userName[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-[#576238] leading-tight">Hello, {userName} 👋</h1>
                            <p className="text-xs text-muted-foreground">Founder Space</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/schedule">
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238] transition-colors rounded-xl">
                                <Calendar className="h-5 w-5" />
                            </Button>
                        </Link>
                        <NotificationsDropdown />
                        <Link href="/profile">
                            <Button variant="ghost" size="icon" className="hover:bg-[#576238]/10 hover:text-[#576238] transition-colors rounded-xl">
                                <User className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 pb-20">
                {/* DYNAMIC ANALYTICS STATS ROW */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                >
                    {/* Stat Card 1: Active Projects */}
                    <div className="bg-white/50 backdrop-blur-md border border-white/40 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Startup Projects</span>
                            <span className="text-2xl font-black text-[#576238] block">{totalStartups}</span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-[#576238]/10 text-[#576238] flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Compass className="h-6 w-6" />
                        </div>
                    </div>

                    {/* Stat Card 2: Average Completion */}
                    <div className="bg-white/50 backdrop-blur-md border border-white/40 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Average Progress</span>
                            <span className="text-2xl font-black text-[#576238] block">{avgProgress}%</span>
                        </div>
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="24" cy="24" r="20" className="text-gray-200" strokeWidth="3.5" stroke="currentColor" fill="transparent" />
                                <circle cx="24" cy="24" r="20" className="text-[#576238] transition-all duration-700 ease-out" strokeWidth="3.5" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - avgProgress / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" />
                            </svg>
                            <span className="absolute text-[10px] font-black text-[#576238]">{avgProgress}%</span>
                        </div>
                    </div>

                    {/* Stat Card 3: Total Investor Likes */}
                    <div className="bg-white/50 backdrop-blur-md border border-white/40 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Investor Likes</span>
                            <span className="text-2xl font-black text-[#576238] block">{totalLikes}</span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center relative">
                            <Heart className={`h-6 w-6 ${totalLikes > 0 ? "animate-pulse" : ""} group-hover:scale-110 transition-transform`} fill={totalLikes > 0 ? "currentColor" : "none"} />
                        </div>
                    </div>

                    {/* Stat Card 4: Validation Gaps */}
                    <div className="bg-white/50 backdrop-blur-md border border-white/40 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Action Items</span>
                            <span className={`text-2xl font-black block ${startupsWithGaps > 0 ? "text-amber-600" : "text-[#576238]"}`}>{startupsWithGaps}</span>
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${startupsWithGaps > 0 ? "bg-amber-50 text-amber-600 animate-bounce" : "bg-green-50 text-green-600"}`}>
                            {startupsWithGaps > 0 ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                        </div>
                    </div>
                </motion.div>

                {/* SEARCH AND FILTER BAR */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8 bg-white/40 backdrop-blur-sm border border-white/20 p-4 rounded-2xl shadow-sm">
                    {/* Search Field */}
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#576238]/60" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search startup projects..." 
                            className="pl-10 h-11 border-[#576238]/20 bg-white/80 rounded-xl focus-visible:ring-[#576238]"
                        />
                    </div>

                    {/* Filters and Add Button */}
                    <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto">
                        <div className="bg-white/80 border border-[#576238]/10 p-1 rounded-xl flex gap-1 shadow-inner">
                            {(["all", "pre-seed", "seed"] as const).map(stage => (
                                <button
                                    key={stage}
                                    onClick={() => setStageFilter(stage)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${stageFilter === stage ? "bg-[#576238] text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}
                                >
                                    {stage}
                                </button>
                            ))}
                        </div>
                        <Button 
                            onClick={handleTriggerClick}
                            className="bg-[#576238] hover:bg-[#6b7c3f] font-bold h-11 px-5 rounded-xl text-white shadow-md hover:shadow-lg transition-all"
                        >
                            <Plus className="mr-1.5 h-5 w-5" strokeWidth={2.5} /> Add Startup
                        </Button>
                    </div>
                </div>

                {/* DASHBOARD CONTENT GRID */}
                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Left Column: Startup Grid */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-[#FFD95D]" />
                            <h2 className="text-xl font-bold text-[#576238]">Active Workspaces</h2>
                        </div>

                        {filteredStartups.length === 0 ? (
                            <div className="bg-white/30 backdrop-blur-md border-2 border-dashed border-[#576238]/20 rounded-3xl p-12 text-center min-h-[350px] flex flex-col justify-center items-center">
                                {startups.length === 0 ? (
                                    <>
                                        <LegoAddTrigger isDropped={isBlockDropped} onTrigger={handleTriggerClick} />
                                        <p className="text-[#576238] font-bold text-lg mt-6 mb-2">Build your first startup</p>
                                        <p className="text-gray-600 text-sm max-w-sm mb-6">Drop the block to initialize Spark2Scale's AI evaluation modules and start building.</p>
                                        <Button onClick={handleTriggerClick} className="bg-[#576238] hover:bg-[#6b7c3f] text-white rounded-xl py-5 px-6 font-bold">
                                            Initialize Builder Workspace
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="h-12 w-12 text-[#576238]/40 mb-4" />
                                        <p className="text-[#576238] font-bold text-lg">No matches found</p>
                                        <p className="text-gray-600 text-sm max-w-sm">No projects match "{searchQuery}" or selected stage filter.</p>
                                        <Button variant="outline" onClick={() => { setSearchQuery(""); setStageFilter("all"); }} className="mt-4 border-[#576238]/30">
                                            Clear Filters
                                        </Button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-6">
                                {filteredStartups.map((startup, index) => {
                                    const stageAccent = startup.stage === "Seed" ? "from-[#FFD95D]/10 to-amber-500/5" : "from-[#576238]/10 to-green-500/5";
                                    return (
                                        <motion.div 
                                            key={startup.id || index} 
                                            initial={{ opacity: 0, y: 20 }} 
                                            animate={{ opacity: 1, y: 0 }} 
                                            transition={{ delay: index * 0.05 }} 
                                            whileHover={{ y: -6, scale: 1.01 }}
                                            className="relative group h-full"
                                        >
                                            <Link href={`/founder/startup/${startup.id}`} className="block h-full">
                                                <Card className={`h-full border border-white/40 bg-gradient-to-br ${stageAccent} backdrop-blur-md shadow-sm hover:shadow-xl hover:border-[#FFD95D]/75 transition-all overflow-hidden flex flex-col justify-between rounded-2xl`}>
                                                    <CardHeader className="pb-4">
                                                        <div className="flex items-center gap-3">
                                                            {startup.logo_path ? (
                                                                <img src={startup.logo_path} alt={startup.name} className="h-12 w-12 rounded-2xl object-cover border-2 border-white/60 shadow-inner shrink-0" />
                                                            ) : (
                                                                <div className="h-12 w-12 rounded-2xl bg-[#576238] text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                                                                    {startup.name?.[0]?.toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <CardTitle className="text-lg font-black text-[#576238] truncate">{startup.name}</CardTitle>
                                                                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/80 text-gray-700 border border-gray-100">
                                                                    {startup.stage}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    
                                                    <CardContent className="space-y-4 pt-0">
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="font-semibold text-muted-foreground">Evaluation Process</span>
                                                                <span className={`font-bold ${startup.isBroken ? 'text-amber-600' : 'text-[#576238]'}`}>
                                                                    {startup.progress}/6 stages {startup.isBroken && "(Gaps)"}
                                                                </span>
                                                            </div>
                                                            {/* Custom glowing progress bar */}
                                                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200/50">
                                                                <div 
                                                                    className={`h-2.5 rounded-full transition-all duration-500 shadow-sm ${startup.isBroken ? 'bg-amber-500 shadow-amber-500/50' : 'bg-[#576238] shadow-green-900/40'}`} 
                                                                    style={{ width: `${(startup.progress / 6) * 100}%` }} 
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Stage Tracker Indicators */}
                                                        <div className="flex items-center justify-between bg-white/40 p-2.5 rounded-xl border border-white/50">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Stages:</span>
                                                            <div className="flex gap-1.5">
                                                                {Array.from({ length: 6 }).map((_, i) => (
                                                                    <div 
                                                                        key={i} 
                                                                        title={`Stage ${i+1}`}
                                                                        className={`w-3.5 h-3.5 rounded-md transition-colors ${
                                                                            i < startup.progress 
                                                                                ? (startup.isBroken && i === startup.progress - 1 ? "bg-amber-500 animate-pulse" : "bg-[#576238]")
                                                                                : "bg-gray-200"
                                                                        }`} 
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-2 border-t border-[#576238]/10 text-xs font-bold">
                                                            <span className="text-gray-500 flex items-center gap-1">
                                                                <Heart className="h-4.5 w-4.5 text-red-500" fill={startup.likes > 0 ? "currentColor" : "none"} /> 
                                                                {startup.likes} likes
                                                            </span>
                                                            <span className="text-[#576238] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                                                Workspace Open →
                                                            </span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                            
                                            {/* Confirmation Delete Popover Overlay */}
                                            <AnimatePresence mode="wait">
                                                {confirmDeleteId === startup.id ? (
                                                    <motion.div
                                                        key="confirm"
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="absolute inset-0 bg-[#F0EADC]/95 backdrop-blur-sm rounded-2xl p-6 z-20 flex flex-col justify-center items-center text-center gap-4 border border-[#576238]/20"
                                                    >
                                                        <div>
                                                            <h4 className="font-black text-red-700 text-sm">Delete {startup.name}?</h4>
                                                            <p className="text-xs text-gray-600 mt-1">This action cannot be undone. All evaluation data will be removed.</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button size="sm" variant="outline" className="px-4 py-2 text-xs bg-white hover:bg-gray-100 border-[#576238]/20 rounded-lg" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(null); }}>
                                                                Cancel
                                                            </Button>
                                                            <Button size="sm" className="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold" onClick={(e) => handleDeleteStartup(e, startup.id)} disabled={isDeleting}>
                                                                {isDeleting ? "Deleting..." : "Delete Project"}
                                                            </Button>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(startup.id); }}
                                                        className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm border border-gray-100"
                                                        title="Delete Startup Workspace"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Column: AI Suggestions Sidebar */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-[#FFD95D]" />
                            <h2 className="text-xl font-bold text-[#576238]">AI Insights & Tasks</h2>
                        </div>

                        <div className="bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl p-5 shadow-sm space-y-4">
                            <h3 className="text-sm font-black text-[#576238] uppercase tracking-wider pb-2 border-b border-[#576238]/10">
                                Next Steps Recommendations
                            </h3>

                            <div className="space-y-4">
                                {getAiRecommendations().map((rec, i) => {
                                    let icon = <Lightbulb className="h-5 w-5 text-[#FFD95D]" />;
                                    let borderStyle = "border-gray-200/50 bg-white/60";
                                    
                                    if (rec.type === "warning") {
                                        icon = <AlertTriangle className="h-5 w-5 text-amber-500 animate-bounce" />;
                                        borderStyle = "border-amber-200/50 bg-amber-50/40";
                                    } else if (rec.type === "progress") {
                                        icon = <Compass className="h-5 w-5 text-blue-500" />;
                                        borderStyle = "border-blue-200/50 bg-blue-50/40";
                                    } else if (rec.type === "share") {
                                        icon = <Trophy className="h-5 w-5 text-[#576238]" />;
                                        borderStyle = "border-[#576238]/20 bg-green-50/40";
                                    } else if (rec.type === "calendar") {
                                        icon = <Calendar className="h-5 w-5 text-indigo-500" />;
                                        borderStyle = "border-indigo-200/50 bg-indigo-50/40";
                                    }

                                    return (
                                        <motion.div 
                                            key={i} 
                                            whileHover={{ x: 4 }}
                                            className={`p-4 rounded-xl border ${borderStyle} shadow-sm space-y-3 flex flex-col justify-between`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="shrink-0 mt-0.5">{icon}</div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-bold text-[#576238] leading-tight">{rec.title}</h4>
                                                    <p className="text-xs text-gray-500 mt-1 leading-normal">
                                                        {rec.desc.split(/(\[\[.*?\]\])/g).map((part: string, pi: number) => {
                                                            const match = part.match(/^\[\[(.*?)\]\]$/);
                                                            return match
                                                                ? <strong key={pi} className="font-bold text-[#576238]">{match[1]}</strong>
                                                                : <span key={pi}>{part}</span>;
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    if (rec.action === "Add Startup") {
                                                        handleTriggerClick();
                                                    } else if (rec.link) {
                                                        router.push(rec.link);
                                                    }
                                                }}
                                                className="self-end text-xs font-bold border-[#576238]/30 hover:bg-[#576238] hover:text-white rounded-lg h-8 cursor-pointer transition-all"
                                            >
                                                {rec.action}
                                            </Button>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Animated Tips Carousel */}
                            <div className="bg-[#576238] text-white rounded-xl p-5 shadow-sm relative overflow-hidden min-h-[130px] flex flex-col justify-between">
                                {/* Decorative blobs */}
                                <div className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full bg-white/10" />
                                <div className="absolute -left-4 -top-4 w-16 h-16 rounded-full bg-white/5" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-1.5 mb-3">
                                        <Sparkles className="h-4 w-4 text-[#FFD95D] shrink-0" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFD95D]">Pro Tip</span>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentTipIndex}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.35, ease: "easeInOut" }}
                                        >
                                            <h4 className="text-sm font-black mb-1 leading-tight">{TIPS[currentTipIndex].title}</h4>
                                            <p className="text-[11px] text-white/80 leading-relaxed">{TIPS[currentTipIndex].desc}</p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Dot navigation */}
                                <div className="flex items-center justify-center gap-1.5 mt-4 relative z-10">
                                    {TIPS.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentTipIndex(i)}
                                            className={`rounded-full transition-all duration-300 ${i === currentTipIndex ? "w-5 h-1.5 bg-[#FFD95D]" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
