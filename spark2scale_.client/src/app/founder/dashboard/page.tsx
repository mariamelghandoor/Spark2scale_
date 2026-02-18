"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, User, ArrowLeft, ArrowRight, Info, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startupService } from "@/services/startupService";
import { pdfService } from "@/services/pdfService"; // Imported PDF service
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
    const [isExtracting, setIsExtracting] = useState(false); // State for PDF extraction progress

    const [open, setOpen] = useState(false);
    const [isBlockDropped, setIsBlockDropped] = useState(false);
    const router = useRouter();

    // Updated State to support Evaluation Wizard
    const [newStartup, setNewStartup] = useState({
        // 1. Snapshot
        name: "", field: "Technology", region: "MENA", stage: "Pre-Seed", description: "",
        website_url: "", hq_location: "", date_founded: "", raised_to_date: "0",
        current_round_size: "0", target_close_date: "",

        // 2. Founder & Execution
        full_time_start: "", shipments: "",

        // 3. Problem Definition
        customer_profile: "", problem_statement: "", current_solution: "", gap_analysis: "",
        problem_frequency: "Daily", cost_of_not_solving: "", interviews_conducted: 0, customer_quotes: "",

        // 4. Product & Solution
        product_status: "MVP", demo_link: "", core_use_case: "", differentiation: "", defensibility: "",

        // 5. Market & Scope
        beachhead_market: "", market_size: "", vision: "", expansion_strategy: "",

        // 6. Traction (Stage-Specific)
        active_users: 0, design_partners: "", early_revenue: "0",
        rev_growth: "0", retention_metrics: "", paying_customers: 0, acv: "0",

        // 7. GTM & Business Model
        buyer_vs_user: "", acquisition_channel: "Social Media", sales_motion: "Self-serve",
        avg_sales_cycle: "", deal_closer: "Founder",
        pricing_model: "Subscription", avg_price: "0", gross_margin: "0", monthly_burn: "0", runway: "0",

        // 8. Vision & Funding
        category_definition: "", primary_risk: "", round_milestones: "", funds_priorities: "", existing_investors: ""
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/signin');
            return;
        }

        if (user) {
            setUserName(user.fname || "User");
        }
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
                    if (parsed.length > 0) {
                        setStartups(parsed);
                        clearTimeout(loaderTimer);
                        setIsFetching(false);
                    }
                } catch (e) { console.error("Cache error", e); }
            }

            try {
                const data = await startupService.getByFounder(user.id);
                const formattedStartups = data.map((s: any) => ({
                    id: s.sid,
                    name: s.startupname,
                    field: s.field,
                    region: s.region,
                    stage: s.startup_stage,
                    progress: s.progress_count,
                    likes: s.total_likes,
                    isBroken: s.progress_has_gap
                }));

                setStartups(formattedStartups);
                localStorage.setItem(CACHE_KEY, JSON.stringify(formattedStartups));
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

    // Handle PDF Extraction and field population
    // Handle PDF Extraction and field population
    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtracting(true);
        try {
            console.log("🚀 Starting extraction flow...");
            const response = await pdfService.extractFromPdf(file);

            // Handle potential response wrappers (some APIs wrap data in a 'data' or 'result' key)
            const extractedData = response.data || response.result || response;

            console.log("✅ Final Processed Data for Form:", extractedData);

            if (!extractedData || Object.keys(extractedData).length === 0) {
                throw new Error("Server returned empty data.");
            }

            setNewStartup(prev => {
                const newState = {
                    ...prev,

                    // --- 1. Snapshot Mapping ---
                    // We explicitly check both snake_case (AI) and camelCase (JS)
                    name: extractedData.company_name || extractedData.name || prev.name,
                    website_url: extractedData.website || extractedData.website_url || prev.website_url,
                    hq_location: extractedData.hq || extractedData.location || extractedData.hq_location || prev.hq_location,
                    date_founded: extractedData.founded_date || extractedData.date_founded || prev.date_founded,
                    stage: extractedData.stage || prev.stage,
                    raised_to_date: extractedData.amount_raised || extractedData.raised_to_date || prev.raised_to_date,
                    current_round_size: extractedData.round_size || extractedData.current_round_size || prev.current_round_size,
                    target_close_date: extractedData.target_close_date || prev.target_close_date,

                    // --- 2. Founder Mapping ---
                    full_time_start: extractedData.full_time_start || prev.full_time_start,
                    shipments: extractedData.shipments || extractedData.key_shipments || prev.shipments,

                    // --- 3. Problem Mapping ---
                    customer_profile: extractedData.customer_profile || extractedData.target_customer || prev.customer_profile,
                    problem_statement: extractedData.problem_statement || extractedData.problem || prev.problem_statement,
                    current_solution: extractedData.current_solution || prev.current_solution,
                    gap_analysis: extractedData.gap_analysis || extractedData.broken_solutions || prev.gap_analysis,
                    problem_frequency: extractedData.frequency || extractedData.problem_frequency || prev.problem_frequency,
                    cost_of_not_solving: extractedData.cost_of_not_solving || extractedData.cost || prev.cost_of_not_solving,
                    interviews_conducted: Number(extractedData.interviews_conducted || extractedData.interviews || prev.interviews_conducted),
                    customer_quotes: extractedData.customer_quotes || extractedData.quotes || prev.customer_quotes,

                    // --- 4. Product Mapping ---
                    product_status: extractedData.product_status || prev.product_status,
                    demo_link: extractedData.demo_link || prev.demo_link,
                    core_use_case: extractedData.core_use_case || prev.core_use_case,
                    differentiation: extractedData.differentiation || prev.differentiation,
                    defensibility: extractedData.defensibility || extractedData.moat || prev.defensibility,

                    // --- 5. Market Mapping ---
                    beachhead_market: extractedData.beachhead_market || extractedData.beachhead || prev.beachhead_market,
                    market_size: extractedData.market_size || prev.market_size,
                    vision: extractedData.long_term_vision || extractedData.vision || prev.vision,
                    expansion_strategy: extractedData.expansion_strategy || prev.expansion_strategy,

                    // --- 6. Traction Mapping ---
                    active_users: Number(extractedData.active_users || prev.active_users),
                    design_partners: extractedData.design_partners || prev.design_partners,
                    early_revenue: extractedData.early_revenue || prev.early_revenue,
                    rev_growth: extractedData.revenue_growth || extractedData.rev_growth || prev.rev_growth,
                    retention_metrics: extractedData.retention_metrics || prev.retention_metrics,
                    paying_customers: Number(extractedData.paying_customers || prev.paying_customers),
                    acv: extractedData.acv || prev.acv,

                    // --- 7. GTM Mapping ---
                    buyer_vs_user: extractedData.buyer_vs_user || prev.buyer_vs_user,
                    acquisition_channel: extractedData.acquisition_channel || extractedData.channel || prev.acquisition_channel,
                    sales_motion: extractedData.sales_motion || prev.sales_motion,
                    avg_sales_cycle: extractedData.avg_sales_cycle || prev.avg_sales_cycle,
                    deal_closer: extractedData.deal_closer || prev.deal_closer,

                    // --- 8. Economics & Strategy Mapping ---
                    pricing_model: extractedData.pricing_model || prev.pricing_model,
                    avg_price: extractedData.average_price_per_customer || extractedData.avg_price || prev.avg_price,
                    gross_margin: extractedData.gross_margin || prev.gross_margin,
                    monthly_burn: extractedData.monthly_burn || prev.monthly_burn,
                    runway: extractedData.runway_months || extractedData.runway || prev.runway,
                    category_definition: extractedData.category_definition || prev.category_definition,
                    primary_risk: extractedData.primary_risk || extractedData.risk || prev.primary_risk,
                    round_milestones: extractedData.round_milestones || extractedData.milestones || prev.round_milestones,
                    funds_priorities: extractedData.funds_priorities || extractedData.use_of_funds || prev.funds_priorities,
                    existing_investors: extractedData.existing_investors || prev.existing_investors
                };

                // Log the new state to verify mapping worked
                console.log("✨ Mapped State:", newState);
                return newState;
            });

            alert("Pitch deck analyzed! Fields have been auto-populated.");
        } catch (error: any) {
            console.error("Extraction error details:", error);
            alert(`Could not extract data: ${error.message || "Unknown error"}`);
        } finally {
            setIsExtracting(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleTriggerClick = () => {
        setIsBlockDropped(true);
        setTimeout(() => setOpen(true), 600);
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen && startups.length === 0) {
            setTimeout(() => setIsBlockDropped(false), 200);
        }
    };

    const handleAddStartup = async () => {
        if (!newStartup.name || !newStartup.field || !newStartup.region || !newStartup.stage) {
            alert("Please fill in Name, Region, Stage, and Field.");
            return;
        }

        if (!user?.id) {
            alert("User not authenticated.");
            return;
        }

        setIsCreating(true);

        try {
            const desc = (newStartup.problem_statement && newStartup.problem_statement.trim() !== "")
                ? newStartup.problem_statement
                : (newStartup.description || "None");

            const payload = {
                startupname: newStartup.name,
                field: newStartup.field,
                region: newStartup.region,
                startup_stage: newStartup.stage,
                idea_description: desc,
                founder_id: user.id,
            };

            const createdStartup = await startupService.create(payload);

            const newStartupUI = {
                id: createdStartup.sid,
                name: createdStartup.startupname,
                field: createdStartup.field,
                region: createdStartup.region,
                stage: createdStartup.startup_stage,
                progress: 0,
                likes: 0,
                isBroken: false
            };

            const updatedList = [...startups, newStartupUI];
            setStartups(updatedList);

            const CACHE_KEY = `dashboard_data_${user.id}`;
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));

            // Reset state
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
                buyer_vs_user: "", acquisition_channel: "Social Media", sales_motion: "Self-serve",
                avg_sales_cycle: "", deal_closer: "Founder",
                pricing_model: "Subscription", avg_price: "0", gross_margin: "0", monthly_burn: "0", runway: "0",
                category_definition: "", primary_risk: "", round_milestones: "", funds_priorities: "", existing_investors: ""
            });
            setOpen(false);

        } catch (error) {
            console.error("Error creating startup:", error);
            alert("Failed. Check console.");
        } finally {
            setIsCreating(false);
        }
    };

    if (authLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#F0EADC]">
                <LegoLoader />
            </div>
        );
    }

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
                            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-lg">
                                {/* Auto-Fill Header */}
                                <div className="bg-[#576238] p-4 flex justify-between items-center">
                                    <div className="text-white">
                                        <h3 className="font-bold flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Startup Builder</h3>
                                        <p className="text-[10px] opacity-80">Populate fields by uploading your pitch deck.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input type="file" id="pdf-input" className="hidden" accept=".pdf" onChange={handlePdfUpload} disabled={isExtracting} />
                                        <Button asChild variant="secondary" size="sm" className="bg-white text-[#576238] hover:bg-white/90">
                                            <label htmlFor="pdf-input" className="cursor-pointer">
                                                {isExtracting ? "Analysing PDF..." : <><Upload className="h-4 w-4 mr-2" /> Auto-Fill PDF</>}
                                            </label>
                                        </Button>
                                    </div>
                                </div>
                                <EvaluationWizard
                                    data={newStartup}
                                    setData={setNewStartup}
                                    loading={isCreating}
                                    onSubmit={handleAddStartup}
                                />
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]">
                    {isFetching && showLoader ? (
                        <div className="col-span-full flex justify-center items-center">
                            <LegoLoader />
                        </div>
                    ) : startups.length === 0 && !isFetching ? (
                        <>
                            <LegoAddTrigger isDropped={isBlockDropped} onTrigger={handleTriggerClick} />
                            <Dialog open={open} onOpenChange={handleOpenChange}>
                                <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-white border-none shadow-2xl rounded-lg">
                                    <div className="bg-[#576238] p-4 flex justify-between items-center">
                                        <div className="text-white">
                                            <h3 className="font-bold flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Startup Builder</h3>
                                            <p className="text-[10px] opacity-80">Populate fields by uploading your pitch deck.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input type="file" id="pdf-input-empty" className="hidden" accept=".pdf" onChange={handlePdfUpload} disabled={isExtracting} />
                                            <Button asChild variant="secondary" size="sm" className="bg-white text-[#576238] hover:bg-white/90">
                                                <label htmlFor="pdf-input-empty" className="cursor-pointer">
                                                    {isExtracting ? "Analysing PDF..." : <><Upload className="h-4 w-4 mr-2" /> Auto-Fill PDF</>}
                                                </label>
                                            </Button>
                                        </div>
                                    </div>
                                    <EvaluationWizard
                                        data={newStartup}
                                        setData={setNewStartup}
                                        loading={isCreating}
                                        onSubmit={handleAddStartup}
                                    />
                                </DialogContent>
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

// --- EVALUATION WIZARD COMPONENTS ---

function EvaluationWizard({ data, setData, loading, onSubmit }: any) {
    const [step, setStep] = useState(1);
    const totalSteps = 8;

    return (
        <div className="flex flex-col h-full bg-white rounded-lg">
            {/* Steps Indicator */}
            <div className="p-6 border-b bg-gray-50/80 flex justify-between items-center">
                <div>
                    <DialogTitle className="text-xl font-bold text-[#576238]">Startup Form</DialogTitle>
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

            {/* Form Content */}
            <div className="p-8 min-h-[500px] overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">

                        {/* STEP 1: Snapshot */}
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

                        {/* STEP 2: Founder & Execution */}
                        {step === 2 && (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2"><SectionHeader num="2" title="Founder & Team" subtitle="Detail your commitment and execution velocity." /></div>
                                <FormField label="Full-time Start Date"><Input type="date" value={data.full_time_start} onChange={e => setData({ ...data, full_time_start: e.target.value })} /></FormField>
                                <div className="col-span-2"><FormField label="What have you shipped so far? (with dates)" hint="List key milestones or product releases."><Textarea value={data.shipments} onChange={e => setData({ ...data, shipments: e.target.value })} placeholder="2025-07: Project Kickoff&#10;2026-02: MVP Live" /></FormField></div>
                            </div>
                        )}

                        {/* STEP 3: Problem Definition */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <SectionHeader num="3" title="Problem Definition" subtitle="Who is the customer and why is their pain urgent?" />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField label="Primary Customer Profile"><Input value={data.customer_profile} onChange={e => setData({ ...data, customer_profile: e.target.value })} placeholder="Role, Company Size, Industry" /></FormField>
                                    <FormField label="Problem Frequency">
                                        <Select value={data.problem_frequency} onValueChange={v => setData({ ...data, problem_frequency: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="Hourly">Hourly</SelectItem><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Monthly">Monthly</SelectItem></SelectContent>
                                        </Select>
                                    </FormField>
                                </div>
                                <FormField label="Specific Problem (1-2 sentences)"><Textarea value={data.problem_statement} onChange={e => setData({ ...data, problem_statement: e.target.value })} /></FormField>
                                <FormField label="What is broken about current solutions?"><Textarea value={data.gap_analysis} onChange={e => setData({ ...data, gap_analysis: e.target.value })} /></FormField>
                                <FormField label="Cost of NOT solving this problem"><Input value={data.cost_of_not_solving} onChange={e => setData({ ...data, cost_of_not_solving: e.target.value })} placeholder="Time, Money, or Risk" /></FormField>
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField label="Interviews Conducted"><Input type="number" value={data.interviews_conducted} onChange={e => setData({ ...data, interviews_conducted: Number(e.target.value) })} /></FormField>
                                    <FormField label="Verbatim Quotes (Top 3)"><Textarea value={data.customer_quotes} onChange={e => setData({ ...data, customer_quotes: e.target.value })} placeholder="Quote 1...&#10;Quote 2..." /></FormField>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: Product & Solution */}
                        {step === 4 && (
                            <div className="space-y-6">
                                <SectionHeader num="4" title="Product & Solution" subtitle="Detail your unique approach and defensibility." />
                                <div className="grid grid-cols-2 gap-6">
                                    <FormField label="Product Status">
                                        <Select value={data.product_status} onValueChange={v => setData({ ...data, product_status: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="Concept">Concept</SelectItem><SelectItem value="Prototype">Prototype</SelectItem><SelectItem value="MVP">MVP</SelectItem><SelectItem value="Live">Live</SelectItem></SelectContent>
                                        </Select>
                                    </FormField>
                                    <FormField label="Demo Link / Screenshots"><Input value={data.demo_link} onChange={e => setData({ ...data, demo_link: e.target.value })} /></FormField>
                                </div>
                                <FormField label="Core use case users come back for"><Input value={data.core_use_case} onChange={e => setData({ ...data, core_use_case: e.target.value })} /></FormField>
                                <FormField label="Meaningful Differentiation"><Textarea value={data.differentiation} onChange={e => setData({ ...data, differentiation: e.target.value })} placeholder="Why are you better than alternatives?" /></FormField>
                                <FormField label="Hardest part to replicate (Moat)"><Input value={data.defensibility} onChange={e => setData({ ...data, defensibility: e.target.value })} /></FormField>
                            </div>
                        )}

                        {/* STEP 5: Market Scope */}
                        {step === 5 && (
                            <div className="space-y-6">
                                <SectionHeader num="5" title="Market & Scope" />
                                <FormField label="Beachhead Market"><Input value={data.beachhead_market} onChange={e => setData({ ...data, beachhead_market: e.target.value })} /></FormField>
                                <FormField label="Estimated Market Size (USD)"><Input value={data.market_size} onChange={e => setData({ ...data, market_size: e.target.value })} /></FormField>
                                <FormField label="Long-term Vision"><Textarea value={data.vision} onChange={e => setData({ ...data, vision: e.target.value })} placeholder="How this becomes big..." /></FormField>
                                <FormField label="Expansion Strategy"><Textarea value={data.expansion_strategy} onChange={e => setData({ ...data, expansion_strategy: e.target.value })} placeholder="New users, products, or segments" /></FormField>
                            </div>
                        )}

                        {/* STEP 6: Traction (Conditional) */}
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

                        {/* STEP 7: GTM & Economics */}
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
                                                <SelectContent><SelectItem value="Self-serve">Self-serve</SelectItem><SelectItem value="Founder-led">Founder-led</SelectItem><SelectItem value="Enterprise">Enterprise</SelectItem></SelectContent>
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

                        {/* STEP 8: Vision & Funding */}
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

            {/* Footer Navigation */}
            <div className="p-6 border-t bg-gray-50/80 flex justify-between rounded-b-lg">
                <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 1}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                {step < totalSteps ?
                    <Button onClick={() => setStep(s => s + 1)} className="bg-[#576238] hover:bg-[#6b7c3f]">Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button> :
                    <Button onClick={onSubmit} disabled={loading} className="bg-[#576238] hover:bg-[#6b7c3f] px-8">{loading ? "Submitting..." : "Finish & Create Startup"}</Button>
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
            {hint && (
                <span title={hint} className="cursor-help flex items-center">
                    <Info className="h-3 w-3 text-muted-foreground" />
                </span>
            )}
        </Label>
        {children}
    </div>
);