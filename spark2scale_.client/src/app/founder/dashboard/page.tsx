"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, User, ArrowLeft, ArrowRight, Info, Sparkles, FileUp, CheckCircle2 } from "lucide-react";
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
import LegoAddTrigger from "@/components/lego/LegoAddTrigger";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";
import { useAuth } from "@/context/AuthContext";

export default function FounderDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [userName, setUserName] = useState("");
    const [startups, setStartups] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [showLoader, setShowLoader] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionSuccess, setExtractionSuccess] = useState(false);
    const [open, setOpen] = useState(false);
    const [isBlockDropped, setIsBlockDropped] = useState(false);
    const router = useRouter();

    const [newStartup, setNewStartup] = useState({
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
        buyer_vs_user: "", acquisition_channel: "Social Media", sales_motion: "Self-serve",
        avg_sales_cycle: "", deal_closer: "Founder",
        pricing_model: "Subscription", avg_price: "0", gross_margin: "0", monthly_burn: "0", runway: "0",
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
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.length > 0) { setStartups(parsed); clearTimeout(loaderTimer); setIsFetching(false); }
                } catch (e) { console.error("Cache error", e); }
            }
            try {
                const data = await startupService.getByFounder(user.id);
                const formattedStartups = data.map((s: any) => ({
                    id: s.sid, name: s.startupname, field: s.field, region: s.region,
                    stage: s.startup_stage, progress: s.progress_count, likes: s.total_likes, isBroken: s.progress_has_gap
                }));
                setStartups(formattedStartups);
                localStorage.setItem(CACHE_KEY, JSON.stringify(formattedStartups));
                clearTimeout(loaderTimer);
            } catch (error) { console.error("Failed to load startups", error); }
            finally { setIsFetching(false); }
        };
        loadData();
        return () => clearTimeout(loaderTimer);
    }, [user]);

    // ─── FIXED: Correctly destructure the nested API response ───────────────────
    // API shape: { data: { startup_evaluation: { company_snapshot, problem_definition, ... } } }
    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtracting(true);
        setExtractionSuccess(false);

        try {
            console.log("🚀 Starting extraction flow...");
            const response = await pdfService.extractFromPdf(file);

            // Unwrap nested structure
            const evaluation =
                response?.data?.startup_evaluation ??
                response?.startup_evaluation ??
                response?.data ??
                response;

            if (!evaluation || Object.keys(evaluation).length === 0) {
                throw new Error("Server returned empty or unrecognized data structure.");
            }

            console.log("✅ Parsed evaluation object:", evaluation);

            // Destructure all sub-sections with safe fallbacks
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

                // ── 1. Company Snapshot ──────────────────────────────────────
                name: snap.company_name || snap.name || prev.name,
                website_url: snap.website_url || snap.website || prev.website_url,
                hq_location: snap.hq_location || snap.hq || prev.hq_location,
                date_founded: snap.date_founded || snap.founded_date || prev.date_founded,
                stage: snap.stage || prev.stage,
                raised_to_date: snap.amount_raised || snap.raised_to_date || prev.raised_to_date,
                current_round_size: snap.round_size || snap.current_round_size || prev.current_round_size,
                target_close_date: snap.target_close_date || prev.target_close_date,
                existing_investors: snap.existing_investors || vis.existing_investors || prev.existing_investors,

                // ── 2. Founder & Team ────────────────────────────────────────
                full_time_start: founder.full_time_start || prev.full_time_start,
                shipments: typeof founder.execution === "string"
                    ? founder.execution
                    : Array.isArray(founder.execution?.key_shipments)
                        ? founder.execution.key_shipments.join("\n")
                        : founder.shipments || prev.shipments,

                // ── 3. Problem Definition ────────────────────────────────────
                customer_profile:
                    (typeof problem.customer_profile === "object"
                        ? problem.customer_profile?.description
                        : problem.customer_profile)
                    || problem.target_customer || prev.customer_profile,
                problem_statement: problem.problem_statement || problem.problem || prev.problem_statement,
                current_solution: problem.current_solution || prev.current_solution,
                gap_analysis: problem.gap_analysis || problem.broken_solutions || prev.gap_analysis,
                problem_frequency: problem.problem_frequency || problem.frequency || prev.problem_frequency,
                cost_of_not_solving: problem.cost_of_not_solving || problem.cost || prev.cost_of_not_solving,
                interviews_conducted: Number(problem.interviews_conducted || problem.interviews || prev.interviews_conducted),
                customer_quotes: Array.isArray(problem.customer_quotes)
                    ? problem.customer_quotes.join("\n")
                    : (problem.customer_quotes || prev.customer_quotes),

                // ── 4. Product & Solution ────────────────────────────────────
                product_status: product.product_stage || product.product_status || prev.product_status,
                demo_link: product.demo_link || prev.demo_link,
                core_use_case: product.core_stickiness || product.core_use_case || prev.core_use_case,
                differentiation: product.differentiation || prev.differentiation,
                defensibility: product.defensibility || product.moat || prev.defensibility,

                // ── 5. Market & Scope ────────────────────────────────────────
                beachhead_market: market.beachhead_market || market.beachhead || prev.beachhead_market,
                market_size: market.market_size || prev.market_size,
                vision: vis.five_year_vision || vis.long_term_vision || vis.vision || prev.vision,
                expansion_strategy: market.expansion_strategy || prev.expansion_strategy,

                // ── 6. Traction ──────────────────────────────────────────────
                active_users: Number(traction.user_count || traction.active_users_monthly || traction.active_users || prev.active_users),
                design_partners: Array.isArray(traction.design_partners)
                    ? traction.design_partners.join(", ")
                    : (traction.design_partners || prev.design_partners),
                early_revenue: traction.early_revenue || traction.revenue || prev.early_revenue,
                rev_growth: traction.revenue_growth || traction.rev_growth || prev.rev_growth,
                retention_metrics: traction.retention_metrics || prev.retention_metrics,
                paying_customers: Number(traction.paying_customers || prev.paying_customers),
                acv: traction.acv || prev.acv,

                // ── 7. GTM ───────────────────────────────────────────────────
                buyer_vs_user: gtm.buyer_persona || gtm.buyer_vs_user || prev.buyer_vs_user,
                acquisition_channel: gtm.primary_acquisition_channel || gtm.acquisition_channel || prev.acquisition_channel,
                sales_motion: gtm.sales_motion || prev.sales_motion,
                avg_sales_cycle: gtm.avg_sales_cycle || prev.avg_sales_cycle,
                deal_closer: gtm.deal_closer || prev.deal_closer,

                // ── 8. Business Model ────────────────────────────────────────
                pricing_model: biz.pricing_model || prev.pricing_model,
                avg_price: String(biz.average_price_per_customer || biz.avg_price || prev.avg_price),
                gross_margin: String(biz.gross_margin || prev.gross_margin),
                monthly_burn: String(biz.monthly_burn || prev.monthly_burn),
                runway: String(biz.runway_months || biz.runway || prev.runway),

                // ── 9. Vision & Fundraising ──────────────────────────────────
                category_definition: vis.category_definition || prev.category_definition,
                primary_risk: vis.primary_risk || vis.risk || prev.primary_risk,
                round_milestones: vis.round_milestones || vis.milestones || prev.round_milestones,
                funds_priorities: vis.funds_priorities || vis.use_of_funds || prev.funds_priorities,
            }));

            setExtractionSuccess(true);
            console.log("✨ Fields populated from nested API response.");
        } catch (error: any) {
            console.error("Extraction error:", error);
            alert(`Could not extract data: ${error.message || "Unknown error"}`);
        } finally {
            setIsExtracting(false);
            e.target.value = '';
        }
    };

    const resetForm = () => setNewStartup({
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
        buyer_vs_user: "", acquisition_channel: "Social Media", sales_motion: "Self-serve",
        avg_sales_cycle: "", deal_closer: "Founder",
        pricing_model: "Subscription", avg_price: "0", gross_margin: "0", monthly_burn: "0", runway: "0",
        category_definition: "", primary_risk: "", round_milestones: "", funds_priorities: "", existing_investors: ""
    });

    const handleTriggerClick = () => { setIsBlockDropped(true); setTimeout(() => setOpen(true), 600); };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setExtractionSuccess(false);
            if (startups.length === 0) setTimeout(() => setIsBlockDropped(false), 200);
        }
    };

    const handleAddStartup = async () => {
        if (!newStartup.name || !newStartup.field || !newStartup.region || !newStartup.stage) {
            alert("Please fill in Name, Region, Stage, and Field."); return;
        }
        if (!user?.id) { alert("User not authenticated."); return; }
        setIsCreating(true);
        try {
            const desc = newStartup.problem_statement?.trim() || newStartup.description || "None";

            // ─── Build the nested startup_evaluation structure ─────────────────
            const structuredJson = {
                startup_evaluation: {
                    meta_data: {
                        form_type: `${newStartup.stage} Evaluation`,
                        last_updated: new Date().toISOString().split("T")[0],
                    },
                    company_snapshot: {
                        company_name: newStartup.name,
                        website_url: newStartup.website_url,
                        hq_location: newStartup.hq_location,
                        date_founded: newStartup.date_founded,
                        current_stage: newStartup.stage,
                        amount_raised_to_date: newStartup.raised_to_date,
                        current_round: {
                            target_amount: newStartup.current_round_size,
                            target_close_date: newStartup.target_close_date,
                        },
                        existing_investors: newStartup.existing_investors,
                    },
                    founder_and_team: {
                        execution: {
                            full_time_start_date: newStartup.full_time_start,
                            key_shipments: newStartup.shipments
                                ? newStartup.shipments.split("\n").filter(Boolean)
                                : [],
                        },
                    },
                    problem_definition: {
                        customer_profile: {
                            description: newStartup.customer_profile,
                        },
                        problem_statement: newStartup.problem_statement,
                        current_solution: newStartup.current_solution,
                        gap_analysis: newStartup.gap_analysis,
                        frequency: newStartup.problem_frequency,
                        impact_metrics: {
                            cost_type: newStartup.cost_of_not_solving,
                        },
                        evidence: {
                            interviews_conducted: newStartup.interviews_conducted,
                            customer_quotes: newStartup.customer_quotes
                                ? newStartup.customer_quotes.split("\n").filter(Boolean)
                                : [],
                        },
                    },
                    product_and_solution: {
                        product_stage: newStartup.product_status,
                        demo_link: newStartup.demo_link,
                        core_stickiness: newStartup.core_use_case,
                        differentiation: newStartup.differentiation,
                        defensibility_moat: newStartup.defensibility,
                    },
                    market_and_scope: {
                        beachhead_market: newStartup.beachhead_market,
                        market_size_estimate: newStartup.market_size,
                        long_term_vision: newStartup.vision,
                        expansion_strategy: newStartup.expansion_strategy,
                    },
                    traction_metrics: {
                        stage_context: newStartup.stage,
                        user_count: newStartup.active_users,
                        active_users_monthly: newStartup.active_users,
                        early_revenue: newStartup.early_revenue,
                        partnerships_and_lois: newStartup.design_partners
                            ? newStartup.design_partners.split("\n").filter(Boolean)
                            : [],
                        revenue_growth: newStartup.rev_growth,
                        paying_customers: newStartup.paying_customers,
                        acv: newStartup.acv,
                        retention_metrics: newStartup.retention_metrics,
                    },
                    gtm_strategy: {
                        buyer_persona: newStartup.buyer_vs_user,
                        primary_acquisition_channel: newStartup.acquisition_channel,
                        sales_motion: newStartup.sales_motion,
                        average_sales_cycle: newStartup.avg_sales_cycle,
                        deal_closer: newStartup.deal_closer,
                    },
                    business_model: {
                        pricing_model: newStartup.pricing_model,
                        average_price_per_customer: Number(newStartup.avg_price) || 0,
                        gross_margin: Number(newStartup.gross_margin) || 0,
                        monthly_burn: Number(newStartup.monthly_burn) || 0,
                        runway_months: Number(newStartup.runway) || 0,
                    },
                    vision_and_strategy: {
                        five_year_vision: newStartup.vision,
                        category_definition: newStartup.category_definition,
                        primary_risk: newStartup.primary_risk,
                        round_milestones: newStartup.round_milestones,
                        use_of_funds: newStartup.funds_priorities
                            ? (Array.isArray(newStartup.funds_priorities)
                                ? newStartup.funds_priorities
                                : String(newStartup.funds_priorities).split("\n").filter(Boolean))
                            : [],
                    },
                },
            };

            const payload = {
                startupname: newStartup.name,
                field: newStartup.field,
                region: newStartup.region,
                startup_stage: newStartup.stage,
                idea_description: desc,
                founder_id: user.id,
                json_response: structuredJson,
            };
            const createdStartup = await startupService.create(payload);
            const newStartupUI = {
                id: createdStartup.sid, name: createdStartup.startupname, field: createdStartup.field,
                region: createdStartup.region, stage: createdStartup.startup_stage,
                progress: 0, likes: 0, isBroken: false
            };
            const updatedList = [...startups, newStartupUI];
            setStartups(updatedList);
            localStorage.setItem(`dashboard_data_${user.id}`, JSON.stringify(updatedList));
            resetForm();
            setOpen(false);
        } catch (error) { console.error("Error creating startup:", error); alert("Failed. Check console."); }
        finally { setIsCreating(false); }
    };

    if (authLoading) return <div className="h-screen w-full flex items-center justify-center bg-[#F0EADC]"><LegoLoader /></div>;

    // ── Shared modal content (used in both empty-state and list-state dialogs) ──
    const ModalContent = () => (
        <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl">
            {/* ─── Redesigned Upload Header ─────────────────────────────────── */}
            <div className="bg-[#576238] px-6 pt-5 pb-5">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-[#FFD95D]" />
                    <h3 className="font-bold text-white text-base tracking-tight">AI Startup Builder</h3>
                </div>

                {/* Prominent drag-target upload zone */}
                <label
                    htmlFor="pdf-upload-main"
                    className={`
                        group relative flex flex-col items-center justify-center gap-2
                        w-full rounded-xl border-2 border-dashed cursor-pointer
                        transition-all duration-200 py-7 px-4 text-center
                        ${isExtracting
                            ? "border-[#FFD95D]/60 bg-[#FFD95D]/10 cursor-wait"
                            : extractionSuccess
                                ? "border-green-400/70 bg-green-500/10"
                                : "border-white/30 bg-white/10 hover:bg-white/20 hover:border-[#FFD95D]/60"
                        }
                    `}
                >
                    <input
                        id="pdf-upload-main"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handlePdfUpload}
                        disabled={isExtracting}
                    />

                    <AnimatePresence mode="wait">
                        {isExtracting ? (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                                <div className="h-9 w-9 rounded-full border-[3px] border-[#FFD95D] border-t-transparent animate-spin" />
                                <p className="text-[#FFD95D] text-sm font-semibold">Analysing your pitch deck…</p>
                                <p className="text-white/50 text-xs">This may take a few seconds</p>
                            </motion.div>
                        ) : extractionSuccess ? (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-1.5">
                                <CheckCircle2 className="h-9 w-9 text-green-400" />
                                <p className="text-green-300 font-semibold text-sm">Fields auto-filled from your deck!</p>
                                <p className="text-white/50 text-xs">Click to upload a different file and replace</p>
                            </motion.div>
                        ) : (
                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                                <div className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                                    <FileUp className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">Upload your pitch deck (PDF)</p>
                                    <p className="text-white/55 text-xs mt-0.5">AI will read it and auto-fill all fields below</p>
                                </div>
                                <span className="mt-1 inline-block rounded-full bg-[#FFD95D] text-[#576238] text-xs font-bold px-3 py-1 group-hover:bg-[#ffe88a] transition-colors">
                                    Choose PDF
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </label>

                <p className="text-white/35 text-[10px] text-center mt-2">
                    Or skip and fill in the 8-step form below manually
                </p>
            </div>

            <EvaluationWizard data={newStartup} setData={setNewStartup} loading={isCreating} onSubmit={handleAddStartup} />
        </DialogContent>
    );

    return (
        <div className="h-screen w-full overflow-y-auto bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[#576238]">Hello {userName} 👋</h1>
                    <div className="flex items-center gap-4">
                        <Link href="/schedule"><Button variant="ghost" size="icon"><Calendar className="h-5 w-5" /></Button></Link>
                        <NotificationsDropdown />
                        <Link href="/profile"><Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button></Link>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 pb-20">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-[#576238]">Startup Projects</h2>
                    {startups.length > 0 && (
                        <Dialog open={open} onOpenChange={handleOpenChange}>
                            <DialogTrigger asChild>
                                <Button className="bg-[#576238] hover:bg-[#6b7c3f]"><Plus className="mr-2 h-4 w-4" /> Add Startup</Button>
                            </DialogTrigger>
                            <ModalContent />
                        </Dialog>
                    )}
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]">
                    {isFetching && showLoader ? (
                        <div className="col-span-full flex justify-center items-center"><LegoLoader /></div>
                    ) : startups.length === 0 && !isFetching ? (
                        <>
                            <LegoAddTrigger isDropped={isBlockDropped} onTrigger={handleTriggerClick} />
                            <Dialog open={open} onOpenChange={handleOpenChange}>
                                <ModalContent />
                            </Dialog>
                        </>
                    ) : (
                        startups.map((startup, index) => (
                            <motion.div key={startup.id || index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                                <Link href={`/founder/startup/${startup.id}`}>
                                    <Card className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-[#FFD95D]">
                                        <CardHeader>
                                            <CardTitle className="text-[#576238]">{startup.name}</CardTitle>
                                            <CardDescription>{startup.field} • {startup.region}</CardDescription>
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
                            </motion.div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}

// ─── EVALUATION WIZARD ───────────────────────────────────────────────────────
function EvaluationWizard({ data, setData, loading, onSubmit }: any) {
    const [step, setStep] = useState(1);
    const totalSteps = 8;

    return (
        <div className="flex flex-col bg-white rounded-b-2xl">
            <div className="px-6 py-4 border-b bg-gray-50/80 flex justify-between items-center">
                <div>
                    <DialogTitle className="text-base font-bold text-[#576238]">Startup Form</DialogTitle>
                    <DialogDescription className="text-xs">Complete all blocks to generate your investor-ready profile.</DialogDescription>
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

            <div className="p-8 min-h-[400px] max-h-[55vh] overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">

                        {step === 1 && (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2"><SectionHeader num="1" title="Company Snapshot" /></div>
                                <FormField label="Company Name *"><Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="e.g. Spark2Scale" /></FormField>
                                <FormField label="HQ Location"><Input value={data.hq_location} onChange={e => setData({ ...data, hq_location: e.target.value })} placeholder="e.g. Egypt" /></FormField>
                                <FormField label="Website / Demo Link"><Input value={data.website_url} onChange={e => setData({ ...data, website_url: e.target.value })} placeholder="https://..." /></FormField>
                                <FormField label="Date Founded"><Input type="date" value={data.date_founded} onChange={e => setData({ ...data, date_founded: e.target.value })} /></FormField>
                                <FormField label="Current Stage">
                                    <Select value={data.stage} onValueChange={v => setData({ ...data, stage: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="Pre-Seed">Pre-Seed</SelectItem><SelectItem value="Seed">Seed</SelectItem></SelectContent>
                                    </Select>
                                </FormField>
                                <FormField label="Amount Raised to Date (USD)"><Input value={data.raised_to_date} onChange={e => setData({ ...data, raised_to_date: e.target.value })} /></FormField>
                                <FormField label="Current Round Size (USD)"><Input value={data.current_round_size} onChange={e => setData({ ...data, current_round_size: e.target.value })} /></FormField>
                                <FormField label="Target Close Date"><Input type="date" value={data.target_close_date} onChange={e => setData({ ...data, target_close_date: e.target.value })} /></FormField>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2"><SectionHeader num="2" title="Founder & Team" subtitle="Detail your commitment and execution velocity." /></div>
                                <FormField label="Full-time Start Date"><Input type="date" value={data.full_time_start} onChange={e => setData({ ...data, full_time_start: e.target.value })} /></FormField>
                                <div className="col-span-2">
                                    <FormField label="What have you shipped so far? (with dates)" hint="List key milestones or product releases.">
                                        <Textarea value={data.shipments} onChange={e => setData({ ...data, shipments: e.target.value })} placeholder={"2025-07: Project Kickoff\n2026-02: MVP Live"} />
                                    </FormField>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <SectionHeader num="3" title="Problem Definition" subtitle="Who is the customer and why is their pain urgent?" />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField label="Primary Customer Profile"><Input value={data.customer_profile} onChange={e => setData({ ...data, customer_profile: e.target.value })} placeholder="Role, Company Size, Industry" /></FormField>
                                    <FormField label="Problem Frequency">
                                        <Select value={data.problem_frequency} onValueChange={v => setData({ ...data, problem_frequency: v })}>
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
                                <FormField label="Specific Problem (1-2 sentences)"><Textarea value={data.problem_statement} onChange={e => setData({ ...data, problem_statement: e.target.value })} /></FormField>
                                <FormField label="What is broken about current solutions?"><Textarea value={data.gap_analysis} onChange={e => setData({ ...data, gap_analysis: e.target.value })} /></FormField>
                                <FormField label="Cost of NOT solving this problem"><Input value={data.cost_of_not_solving} onChange={e => setData({ ...data, cost_of_not_solving: e.target.value })} placeholder="Time, Money, or Risk" /></FormField>
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField label="Interviews Conducted"><Input type="number" value={data.interviews_conducted} onChange={e => setData({ ...data, interviews_conducted: Number(e.target.value) })} /></FormField>
                                    <FormField label="Verbatim Quotes (Top 3)"><Textarea value={data.customer_quotes} onChange={e => setData({ ...data, customer_quotes: e.target.value })} placeholder={"Quote 1...\nQuote 2..."} /></FormField>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6">
                                <SectionHeader num="4" title="Product & Solution" subtitle="Detail your unique approach and defensibility." />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField label="Product Status">
                                        <Select value={data.product_status} onValueChange={v => setData({ ...data, product_status: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Concept">Concept</SelectItem>
                                                <SelectItem value="Prototype">Prototype</SelectItem>
                                                <SelectItem value="MVP">MVP</SelectItem>
                                                <SelectItem value="Live">Live</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormField>
                                    <FormField label="Demo Link / Screenshots"><Input value={data.demo_link} onChange={e => setData({ ...data, demo_link: e.target.value })} /></FormField>
                                </div>
                                <FormField label="Core use case users come back for"><Input value={data.core_use_case} onChange={e => setData({ ...data, core_use_case: e.target.value })} /></FormField>
                                <FormField label="Meaningful Differentiation"><Textarea value={data.differentiation} onChange={e => setData({ ...data, differentiation: e.target.value })} placeholder="Why are you better than alternatives?" /></FormField>
                                <FormField label="Hardest part to replicate (Moat)"><Input value={data.defensibility} onChange={e => setData({ ...data, defensibility: e.target.value })} /></FormField>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="space-y-6">
                                <SectionHeader num="5" title="Market & Scope" />
                                <FormField label="Beachhead Market"><Input value={data.beachhead_market} onChange={e => setData({ ...data, beachhead_market: e.target.value })} /></FormField>
                                <FormField label="Estimated Market Size (USD)"><Input value={data.market_size} onChange={e => setData({ ...data, market_size: e.target.value })} /></FormField>
                                <FormField label="Long-term Vision"><Textarea value={data.vision} onChange={e => setData({ ...data, vision: e.target.value })} placeholder="How this becomes big..." /></FormField>
                                <FormField label="Expansion Strategy"><Textarea value={data.expansion_strategy} onChange={e => setData({ ...data, expansion_strategy: e.target.value })} placeholder="New users, products, or segments" /></FormField>
                            </div>
                        )}

                        {step === 6 && (
                            <div className="space-y-6">
                                <SectionHeader num="6" title={`Traction (${data.stage})`} />
                                {data.stage === "Pre-Seed" ? (
                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField label="Active Users (Weekly/Monthly)"><Input type="number" value={data.active_users} onChange={e => setData({ ...data, active_users: Number(e.target.value) })} /></FormField>
                                        <FormField label="Early Revenue (USD)"><Input value={data.early_revenue} onChange={e => setData({ ...data, early_revenue: e.target.value })} /></FormField>
                                        <div className="col-span-2"><FormField label="Design Partners / LOIs"><Textarea value={data.design_partners} onChange={e => setData({ ...data, design_partners: e.target.value })} placeholder="List names if possible" /></FormField></div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-6">
                                        <FormField label="Revenue Growth Rate (MoM/QoQ)"><Input value={data.rev_growth} onChange={e => setData({ ...data, rev_growth: e.target.value })} /></FormField>
                                        <FormField label="Number of Paying Customers"><Input type="number" value={data.paying_customers} onChange={e => setData({ ...data, paying_customers: Number(e.target.value) })} /></FormField>
                                        <FormField label="Average Contract Value (ACV)"><Input value={data.acv} onChange={e => setData({ ...data, acv: e.target.value })} /></FormField>
                                        <FormField label="Retention Metrics"><Input value={data.retention_metrics} onChange={e => setData({ ...data, retention_metrics: e.target.value })} placeholder="Cohort, usage, etc." /></FormField>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 7 && (
                            <div className="space-y-8">
                                <div>
                                    <SectionHeader num="7" title="GTM Strategy" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Buyer vs End User"><Input value={data.buyer_vs_user} onChange={e => setData({ ...data, buyer_vs_user: e.target.value })} /></FormField>
                                        <FormField label="Primary Acquisition Channel"><Input value={data.acquisition_channel} onChange={e => setData({ ...data, acquisition_channel: e.target.value })} /></FormField>
                                        <FormField label="Sales Motion">
                                            <Select value={data.sales_motion} onValueChange={v => setData({ ...data, sales_motion: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Self-serve">Self-serve</SelectItem>
                                                    <SelectItem value="Founder-led">Founder-led</SelectItem>
                                                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormField>
                                        <FormField label="Avg Sales Cycle"><Input value={data.avg_sales_cycle} onChange={e => setData({ ...data, avg_sales_cycle: e.target.value })} /></FormField>
                                    </div>
                                </div>
                                <div>
                                    <SectionHeader num="8" title="Business Model" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Pricing Model"><Input value={data.pricing_model} onChange={e => setData({ ...data, pricing_model: e.target.value })} /></FormField>
                                        <FormField label="Gross Margin %"><Input value={data.gross_margin} onChange={e => setData({ ...data, gross_margin: e.target.value })} /></FormField>
                                        <FormField label="Monthly Burn ($)"><Input value={data.monthly_burn} onChange={e => setData({ ...data, monthly_burn: e.target.value })} /></FormField>
                                        <FormField label="Runway (Months)"><Input value={data.runway} onChange={e => setData({ ...data, runway: e.target.value })} /></FormField>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 8 && (
                            <div className="space-y-6">
                                <SectionHeader num="9" title="Vision & Strategy" />
                                <FormField label="Category Creating/Redefining"><Input value={data.category_definition} onChange={e => setData({ ...data, category_definition: e.target.value })} /></FormField>
                                <FormField label="Biggest Risk to Success"><Textarea value={data.primary_risk} onChange={e => setData({ ...data, primary_risk: e.target.value })} /></FormField>
                                <SectionHeader num="10" title="Fundraising" />
                                <FormField label="Key Round Milestones"><Textarea value={data.round_milestones} onChange={e => setData({ ...data, round_milestones: e.target.value })} /></FormField>
                                <FormField label="Existing Investors"><Input value={data.existing_investors} onChange={e => setData({ ...data, existing_investors: e.target.value })} /></FormField>
                            </div>
                        )}

                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="p-6 border-t bg-gray-50/80 flex justify-between rounded-b-2xl">
                <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                {step < totalSteps
                    ? <Button onClick={() => setStep(s => s + 1)} className="bg-[#576238] hover:bg-[#6b7c3f]">Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    : <Button onClick={onSubmit} disabled={loading} className="bg-[#576238] hover:bg-[#6b7c3f] px-8">{loading ? "Submitting..." : "Finish & Create Startup"}</Button>
                }
            </div>
        </div>
    );
}

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