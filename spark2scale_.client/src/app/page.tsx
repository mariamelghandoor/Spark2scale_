"use client";

import { useState, useRef, useEffect, ReactElement } from "react";
import React from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import LegoProgress from "@/components/lego/LegoProgress";
import TiltCard from "@/components/ui/TiltCard";
import ScrollLegoTower from "@/components/lego/ScrollLegoTower";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from "@/components/ui/dialog";
import { 
    Check, 
    ArrowRight, 
    Sparkles, 
    LineChart, 
    Users, 
    Award, 
    Rocket, 
    Layers3, 
    Coins, 
    ArrowUpRight, 
    Plus,
    CheckCircle2
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [activeSection, setActiveSection] = useState("hero");
    const [currency, setCurrency] = useState<"EGP" | "USD">("EGP");
    
    // Dialog State for Feature Modules
    const [selectedModule, setSelectedModule] = useState<{
        num: string;
        icon: React.ComponentType<{ className?: string }>;
        title: string;
        desc: string;
        longDesc: string;
        capabilities: string[];
    } | null>(null);

    // Handle email verification and password reset redirects from Supabase
    useEffect(() => {
        const hash = window.location.hash.replace("#", "");
        const hashParams = new URLSearchParams(hash);
        const queryParams = new URLSearchParams(window.location.search);
        
        if (hash.includes("access_token")) {
            const type = hashParams.get("type") || queryParams.get("type");
            if (type === "recovery") {
                router.push("/reset-password" + window.location.hash);
            } else {
                router.push("/auth/callback" + window.location.hash);
            }
            return;
        }
        
        const tokenFromQuery = queryParams.get("token");
        const typeFromQuery = queryParams.get("type");
        
        if (tokenFromQuery) {
            if (typeFromQuery === "recovery") {
                router.push(`/reset-password?token=${tokenFromQuery}&type=recovery`);
            } else {
                router.push(`/auth/callback?token=${tokenFromQuery}`);
            }
            return;
        }
    }, [router]);

    // Section Refs for scroll tracking
    const heroRef = useRef<HTMLDivElement>(null);
    const journeyRef = useRef<HTMLDivElement>(null);
    const builderRef = useRef<HTMLDivElement>(null);
    const modulesRef = useRef<HTMLDivElement>(null);
    const pricingRef = useRef<HTMLDivElement>(null);

    // Scroll tracking
    const { scrollY } = useScroll();
    
    // Liquid Smooth Scrolling transforms by mapping raw scroll to physics-based springs
    const smoothScrollY = useSpring(scrollY, { damping: 55, stiffness: 180, mass: 0.6 });

    // Parallax values for floating Lego background shapes (using liquid smooth scrolling)
    const lego1Y = useTransform(smoothScrollY, [0, 800], [0, -320]);
    const lego1X = useTransform(smoothScrollY, [0, 800], [0, -150]);
    const lego1Rotate = useTransform(smoothScrollY, [0, 800], [0, 90]);

    const lego2Y = useTransform(smoothScrollY, [0, 800], [0, -420]);
    const lego2X = useTransform(smoothScrollY, [0, 800], [0, 180]);
    const lego2Rotate = useTransform(smoothScrollY, [0, 800], [0, -70]);

    const lego3Y = useTransform(smoothScrollY, [0, 800], [0, -200]);
    const lego3X = useTransform(smoothScrollY, [0, 800], [0, 240]);
    const lego3Rotate = useTransform(smoothScrollY, [0, 800], [0, 50]);

    const lego4Y = useTransform(smoothScrollY, [0, 1000], [0, -280]);
    const lego4X = useTransform(smoothScrollY, [0, 1000], [0, -220]);
    const lego4Rotate = useTransform(smoothScrollY, [0, 1000], [0, -60]);

    const lego5Y = useTransform(smoothScrollY, [0, 1000], [0, -380]);
    const lego5X = useTransform(smoothScrollY, [0, 1000], [0, 300]);
    const lego5Rotate = useTransform(smoothScrollY, [0, 1000], [0, 110]);

    const lego6Y = useTransform(smoothScrollY, [0, 1200], [0, -150]);
    const lego6X = useTransform(smoothScrollY, [0, 1200], [0, -350]);
    const lego6Rotate = useTransform(smoothScrollY, [0, 1200], [0, 40]);

    const heroOpacity = useTransform(smoothScrollY, [0, 500], [1, 0]);
    const heroScale = useTransform(smoothScrollY, [0, 500], [1, 0.9]);

    // Horizontal Feature Scroll
    const { scrollYProgress: horizontalProgress } = useScroll({
        target: modulesRef,
        offset: ["start start", "end end"]
    });
    
    // Pass horizontal progress to a spring for ultra-smooth sliding
    const smoothHorizontalProgress = useSpring(horizontalProgress, { damping: 45, stiffness: 140, mass: 0.5 });
    
    // Shift row horizontally based on smooth scroll depth
    const xTranslation = useTransform(smoothHorizontalProgress, [0, 1], ["0%", "-66%"]);

    // Pricing Parallax floating Lego blocks
    const { scrollYProgress: pricingProgress } = useScroll({
        target: pricingRef,
        offset: ["start end", "end start"]
    });
    const smoothPricingProgress = useSpring(pricingProgress, { damping: 50, stiffness: 150 });
    
    const pricingLego1Y = useTransform(smoothPricingProgress, [0, 1], [150, -150]);
    const pricingLego1X = useTransform(smoothPricingProgress, [0, 1], [-80, 80]);
    const pricingLego1Rotate = useTransform(smoothPricingProgress, [0, 1], [0, 90]);

    const pricingLego2Y = useTransform(smoothPricingProgress, [0, 1], [220, -220]);
    const pricingLego2X = useTransform(smoothPricingProgress, [0, 1], [100, -100]);
    const pricingLego2Rotate = useTransform(smoothPricingProgress, [0, 1], [0, -70]);

    const pricingLego3Y = useTransform(smoothPricingProgress, [0, 1], [120, -120]);
    const pricingLego3X = useTransform(smoothPricingProgress, [0, 1], [120, -60]);
    const pricingLego3Rotate = useTransform(smoothPricingProgress, [0, 1], [0, 45]);

    // Journey overview scroll tracker (directly linked to scrolling speed/position)
    const { scrollYProgress: journeyProgress } = useScroll({
        target: journeyRef,
        offset: ["start end", "end start"]
    });
    const smoothJourneyProgress = useSpring(journeyProgress, { damping: 50, stiffness: 180, mass: 0.6 });
    const journeyOpacity = useTransform(smoothJourneyProgress, [0.08, 0.35, 0.65, 0.92], [0, 1, 1, 0]);
    const journeyScale = useTransform(smoothJourneyProgress, [0.08, 0.35, 0.65, 0.92], [0.85, 1, 1, 0.85]);
    const journeyY = useTransform(smoothJourneyProgress, [0.08, 0.35, 0.65, 0.92], [80, 0, 0, -80]);

    // Scroll section active state tracking
    useEffect(() => {
        const handleScroll = () => {
            const scrollPos = window.scrollY + window.innerHeight / 3;

            if (heroRef.current && scrollPos < heroRef.current.offsetTop + heroRef.current.offsetHeight) {
                setActiveSection("hero");
            } else if (journeyRef.current && scrollPos < journeyRef.current.offsetTop + journeyRef.current.offsetHeight) {
                setActiveSection("journey");
            } else if (builderRef.current && scrollPos < builderRef.current.offsetTop + builderRef.current.offsetHeight) {
                setActiveSection("builder");
            } else if (modulesRef.current && scrollPos < modulesRef.current.offsetTop + modulesRef.current.offsetHeight) {
                setActiveSection("modules");
            } else if (pricingRef.current) {
                setActiveSection("pricing");
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (ref.current) {
            ref.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    const steps = [
        {
            id: "idea",
            title: "1. Validate Idea",
            color: "#576238", 
            shadowColor: "#3d4627",
            description: "Submit your startup idea. Our AI analyzes market viability, maps competitors, and checks for product-market fit."
        },
        {
            id: "market",
            title: "2. Market Research",
            color: "#8b9456", 
            shadowColor: "#6a723f",
            description: "Conduct in-depth analysis. Gather demographics, target audience personas, and evaluate industry growth patterns."
        },
        {
            id: "pitch",
            title: "3. Pitch Deck Builder",
            color: "#FFD95D", 
            shadowColor: "#d9b43c",
            description: "Draft your pitch. Stack structured slides, refine metrics, and optimize messaging for angel investor reviews."
        },
        {
            id: "team",
            title: "4. Build Team",
            color: "#ffe89a", 
            shadowColor: "#d9c47e",
            description: "Invite key contributors, assign equity blocks, track assignments, and structure engineering roles."
        },
        {
            id: "investor",
            title: "5. Investor Match",
            color: "#6b7c3f", 
            shadowColor: "#4f5c2d",
            description: "Match with real angel investors and venture capital syndicates looking for projects in your category."
        },
        {
            id: "launch",
            title: "6. Launch & Scale",
            color: "#ffdf7a", 
            shadowColor: "#d9bd5c",
            description: "Launch your startup, begin stack operations, track real progress milestones, and start scaling!"
        }
    ];

    const modules = [
        {
            num: "01",
            icon: Sparkles,
            title: "Gamified Progress",
            desc: "Visual progress tracking through high-fidelity, interactive Lego-block stacks. Complete missions, build your hub, and claim rewards.",
            longDesc: "Turn your arduous entrepreneurial path into a visual gaming campaign. Spark2Scale splits business milestones into distinct Lego blocks. Completing a task stacks a block, visually assembling your venture hub. Earn XP points, unlock governance templates, and showcase a structured roadmap directly to interested angel syndicates.",
            capabilities: [
                "Visual milestone tracking",
                "XP & badges reward engine",
                "Shareable public project roadmap",
                "Step-by-step startup mission packs"
            ]
        },
        {
            num: "02",
            icon: LineChart,
            title: "AI Market Analytics",
            desc: "Instantly validate your startup thesis. Check addressable market sizing, competitor saturation, and regulatory hurdles automatically.",
            longDesc: "No more manually compiling endless spreadsheets. Our AI scans real-time databases to evaluate your idea's target addressable market (TAM), identifies direct and indirect competitors in an instant quadrant, highlights hidden regulatory blocks, and generates a formatted market research dossier ready for pitch decks.",
            capabilities: [
                "Instant TAM, SAM, SOM calculations",
                "Automatic Competitor Quadrant generation",
                "Regulatory alert triggers",
                "Exportable PDF market profiles"
            ]
        },
        {
            num: "03",
            icon: Layers3,
            title: "Smart Deck Stacker",
            desc: "Compose structured slides step by step. Let our AI tailor design cues, optimize pitch metrics, and generate high-impact decks.",
            longDesc: "Writing pitch decks is notoriously hard. The Smart Deck Stacker acts as a guided builder. Feed it your value proposition, business model, and milestones. The compiler structures the information slide by slide, refines copy with business intelligence models, checks slide balance, and lets you download premium PDFs.",
            capabilities: [
                "Interactive slide outlines",
                "Contextual AI pitch recommendations",
                "Pre-built financial graph blocks",
                "Direct PowerPoint & PDF exports"
            ]
        },
        {
            num: "04",
            icon: Users,
            title: "Syndicate Matcher",
            desc: "Direct channel matchmaking with venture groups, angel investors, and accelerator programs tailored to your category.",
            longDesc: "Get in front of the right investors at the right stage. Instead of cold emails, the Syndicate Matcher analyzes your completed progress tower. Startups with verified, validated blocks are programmatically matched with VC syndicates and angels whose investment criteria align with your industry, stage, and geography.",
            capabilities: [
                "Stage-based investor matching",
                "Progress tower verification badge",
                "Secure pitch rooms & NDA controls",
                "Investor meeting calendar sync"
            ]
        }
    ];

    const plans = [
        {
            name: "Basic",
            description: "Perfect for early-stage validation.",
            monthly: { EGP: 0, USD: 0 },
            features: ["1 Startup Profile", "Basic AI Idea Check", "Standard Export"],
            popular: false,
        },
        {
            name: "Founder Pro",
            description: "Everything you need to get investor-ready.",
            monthly: { EGP: 850, USD: 19 },
            features: [
                "Unlimited Pitch Deck Generations",
                "Deep Competitor Analysis",
                "Advanced SWOT Matrix",
                "Priority AI Processing",
            ],
            popular: true,
        },
        {
            name: "Investor",
            description: "For screening and managing deal flow.",
            monthly: { EGP: 2500, USD: 49 },
            features: [
                "Access to Verified Deal Flow",
                "Automated Startup Screening",
                "Custom Evaluation Criteria",
                "Team Collaboration",
            ],
            popular: false,
        },
    ];

    // Journey overview container variants for scroll-driven animations
    const overviewContainer = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.25,
                delayChildren: 0.1
            }
        }
    };

    const overviewItem = {
        hidden: { opacity: 0, y: 40, scale: 0.92 },
        show: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 90,
                damping: 15
            }
        }
    };

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 overflow-x-clip selection:bg-[#FFD95D] selection:text-[#576238]">
            <Navbar />

            {/* Custom Lego Floating Navigation Sidebar Widget (Styled to be barely visible unless hovered/touched) */}
            <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 bg-white/5 border border-black/5 hover:bg-white/70 hover:border-black/10 hover:shadow-2xl hover:opacity-100 p-2.5 rounded-full opacity-15 hover:opacity-100 transition-all duration-500 backdrop-blur-xs hover:backdrop-blur-md hidden lg:flex">
                {[
                    { id: "hero", label: "Start", ref: heroRef },
                    { id: "journey", label: "Overview", ref: journeyRef },
                    { id: "builder", label: "Builder", ref: builderRef },
                    { id: "modules", label: "Modules", ref: modulesRef },
                    { id: "pricing", label: "Pricing", ref: pricingRef }
                ].map((sec) => (
                    <button
                        key={sec.id}
                        onClick={() => scrollToSection(sec.ref)}
                        className={`group relative w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                            activeSection === sec.id 
                                ? "bg-[#576238]/85 text-white scale-105" 
                                : "bg-transparent text-[#576238]"
                        }`}
                        title={sec.label}
                    >
                        {/* Lego Stud Style Dot */}
                        <div className={`w-2.5 h-2.5 rounded-full border transition-all ${
                            activeSection === sec.id 
                                ? "bg-[#FFD95D] border-transparent" 
                                : "bg-gray-400/60 border-gray-400/80 group-hover:bg-[#FFD95D]"
                        }`} />
                        
                        {/* Tooltip Label (Only pops out on hover) */}
                        <span className="absolute right-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#576238] text-white text-[10px] font-bold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md pointer-events-none">
                            {sec.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* HERO SECTION */}
            <header 
                ref={heroRef} 
                className="relative container mx-auto px-6 py-20 lg:py-36 min-h-[90vh] flex flex-col justify-center items-center text-center z-10"
            >
                {/* 6 Dynamic Floating Lego Bricks (Outer container handles scroll parallax, Inner container handles idle floating breathing on start) */}
                <motion.div 
                    style={{ y: lego1Y, x: lego1X, rotate: lego1Rotate }}
                    className="absolute top-12 left-[10%] w-24 h-16 pointer-events-none opacity-25 lg:opacity-40 hidden md:block"
                >
                    <motion.div 
                        animate={{ y: [-8, 8, -8], rotate: [-4, 4, -4] }}
                        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                        className="w-full h-12 bg-[#576238] rounded-xl shadow-2xl relative border border-white/10"
                    >
                        <div className="absolute -top-2 left-3 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-10 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-17 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                    </motion.div>
                </motion.div>

                <motion.div 
                    style={{ y: lego2Y, x: lego2X, rotate: lego2Rotate }}
                    className="absolute top-24 right-[10%] w-20 h-14 pointer-events-none opacity-25 lg:opacity-40 hidden md:block"
                >
                    <motion.div 
                        animate={{ y: [6, -6, 6], rotate: [3, -3, 3] }}
                        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                        className="w-full h-10 bg-[#FFD95D] rounded-xl shadow-2xl relative border border-white/10"
                    >
                        <div className="absolute -top-2 left-4 w-4 h-3 bg-[#FFD95D] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-12 w-4 h-3 bg-[#FFD95D] rounded-t-md shadow-inner" />
                    </motion.div>
                </motion.div>

                <motion.div 
                    style={{ y: lego3Y, x: lego3X, rotate: lego3Rotate }}
                    className="absolute bottom-20 left-[15%] w-16 h-12 pointer-events-none opacity-20 lg:opacity-30 hidden md:block"
                >
                    <motion.div 
                        animate={{ y: [-10, 10, -10], x: [-3, 3, -3] }}
                        transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
                        className="w-full h-8 bg-[#8b9456] rounded-xl shadow-2xl relative border border-white/10"
                    >
                        <div className="absolute -top-2 left-3 w-3 h-2 bg-[#8b9456] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-9 w-3 h-2 bg-[#8b9456] rounded-t-md shadow-inner" />
                    </motion.div>
                </motion.div>

                <motion.div 
                    style={{ y: lego4Y, x: lego4X, rotate: lego4Rotate }}
                    className="absolute bottom-40 right-[15%] w-20 h-14 pointer-events-none opacity-20 lg:opacity-30 hidden md:block"
                >
                    <motion.div 
                        animate={{ y: [8, -8, 8], x: [4, -4, 4] }}
                        transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut" }}
                        className="w-full h-10 bg-[#6b7c3f] rounded-xl shadow-2xl relative border border-white/10"
                    >
                        <div className="absolute -top-2 left-4 w-4 h-3 bg-[#6b7c3f] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-12 w-4 h-3 bg-[#6b7c3f] rounded-t-md shadow-inner" />
                    </motion.div>
                </motion.div>

                <motion.div 
                    style={{ y: lego5Y, x: lego5X, rotate: lego5Rotate }}
                    className="absolute top-1/2 left-[5%] w-14 h-10 pointer-events-none opacity-15 lg:opacity-25 hidden md:block"
                >
                    <motion.div 
                        animate={{ y: [-5, 5, -5], rotate: [4, -4, 4] }}
                        transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                        className="w-full h-8 bg-[#ffe89a] rounded-xl shadow-2xl relative border border-white/10"
                    >
                        <div className="absolute -top-1.5 left-3 w-3 h-2 bg-[#ffe89a] rounded-t-md shadow-inner" />
                        <div className="absolute -top-1.5 left-8 w-3 h-2 bg-[#ffe89a] rounded-t-md shadow-inner" />
                    </motion.div>
                </motion.div>

                <motion.div 
                    style={{ y: lego6Y, x: lego6X, rotate: lego6Rotate }}
                    className="absolute top-1/2 right-[5%] w-24 h-16 pointer-events-none opacity-20 lg:opacity-30 hidden md:block"
                >
                    <motion.div 
                        animate={{ y: [9, -9, 9], rotate: [-5, 5, -5] }}
                        transition={{ repeat: Infinity, duration: 6.5, ease: "easeInOut" }}
                        className="w-full h-12 bg-[#ffdf7a] rounded-xl shadow-2xl relative border border-white/10"
                    >
                        <div className="absolute -top-2 left-3 w-4 h-3 bg-[#ffdf7a] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-10 w-4 h-3 bg-[#ffdf7a] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-17 w-4 h-3 bg-[#ffdf7a] rounded-t-md shadow-inner" />
                    </motion.div>
                </motion.div>

                <motion.div
                    style={{ opacity: heroOpacity, scale: heroScale }}
                    className="max-w-4xl flex flex-col items-center"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 bg-[#576238]/10 text-[#576238] font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-full mb-8 border border-[#576238]/20"
                    >
                        <Sparkles className="w-3.5 h-3.5" /> Gamified Founder Platform
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
                        className="text-5xl md:text-8xl font-black text-[#576238] mb-8 leading-[1.05]"
                    >
                        Build Your Startup
                        <br />
                        <span className="relative inline-block text-[#FFD95D] drop-shadow-md">
                            Block by Block
                            {/* Decorative Lego Line underneath */}
                            <span className="absolute -bottom-2 left-0 right-0 h-2 bg-gradient-to-r from-[#576238] via-[#FFD95D] to-transparent rounded-full opacity-60" />
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl leading-relaxed"
                    >
                        A gamified workspace turning complex venture building into an engaging, 
                        visual lego-stack experience. Accomplish missions, lock progress, and 
                        raise capital!
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="flex flex-wrap gap-5 justify-center"
                    >
                        <Link href="/signup">
                            <Button
                                size="lg"
                                className="bg-[#576238] hover:bg-[#6b7c3f] hover:scale-105 active:scale-95 text-white font-bold text-lg px-10 py-7 rounded-2xl shadow-xl transition-all"
                            >
                                Start Building Now
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Button
                            onClick={() => scrollToSection(builderRef)}
                            size="lg"
                            variant="outline"
                            className="font-bold text-[#576238] border-2 border-[#576238]/30 hover:border-[#576238] hover:bg-[#F0EADC]/40 hover:scale-105 active:scale-95 text-lg px-10 py-7 rounded-2xl transition-all"
                        >
                            Watch Stacking Demo
                        </Button>
                    </motion.div>
                </motion.div>
            </header>

            {/* CLASSIC PROGRESS SHOWCASE (JOURNEY OVERVIEW WITH SCROLL-IN STAGGER DYNAMICS) */}
            <section 
                ref={journeyRef}
                className="container mx-auto px-6 py-28 border-t border-[#d4cbb8]/40 relative overflow-hidden"
            >
                {/* Extra dynamic floating blocks around overview */}
                <motion.div 
                    whileInView={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                    className="absolute top-10 left-[5%] w-12 h-8 bg-[#FFD95D] rounded-md opacity-25 blur-[0.5px]"
                />
                <motion.div 
                    whileInView={{ y: [0, 20, 0], rotate: [0, -15, 0] }}
                    transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                    className="absolute bottom-10 right-[5%] w-14 h-10 bg-[#576238] rounded-md opacity-20 blur-[0.5px]"
                />

                <div className="max-w-4xl mx-auto">
                    <motion.div
                        style={{ opacity: journeyOpacity, scale: journeyScale, y: journeyY }}
                        className="bg-white/70 backdrop-blur-md rounded-3xl shadow-2xl p-10 md:p-16 border-2 border-[#d4cbb8]"
                    >
                        <h2 className="text-4xl md:text-5xl font-black text-center text-[#576238] mb-4 tracking-tight">
                            Your Progress Journey
                        </h2>
                        <p className="text-center text-muted-foreground text-lg mb-16 max-w-xl mx-auto">
                            Every completed business stage adds a physical block to your startup tower of success
                        </p>

                        <div className="flex justify-center items-center gap-16 flex-wrap">
                            <div className="text-center flex flex-col items-center">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">
                                    01. Getting Started
                                </p>
                                <div className="p-4 bg-white/40 rounded-2xl border border-gray-200/50 shadow-inner">
                                    <LegoProgress totalStages={6} completedStages={0} />
                                </div>
                            </div>

                            <div className="text-center flex flex-col items-center">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 text-[#576238]">
                                    02. Building Traction
                                </p>
                                <div className="p-4 bg-white/40 rounded-2xl border border-[#576238]/10 shadow-inner">
                                    <LegoProgress totalStages={6} completedStages={3} />
                                </div>
                            </div>

                            <div className="text-center flex flex-col items-center">
                                <p className="text-xs font-black uppercase tracking-widest text-[#FFD95D] mb-6">
                                    03. Completed! 🎉
                                </p>
                                <div className="p-4 bg-[#FFD95D]/5 rounded-2xl border border-[#FFD95D]/20 shadow-inner">
                                    <LegoProgress totalStages={6} completedStages={6} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* RESTORED SCROLL-DRIVEN STICKY LEGO BUILDER SECTION (SPLIT-SCROLL SCENARIO) */}
            <section 
                ref={builderRef}
                className="relative container mx-auto px-6 lg:px-20 py-24 border-t border-[#d4cbb8]/40"
            >
                {/* Scroll Top Reset Sentinel */}
                <motion.div
                    onViewportEnter={() => setCurrentStep(0)}
                    className="absolute top-0 left-0 right-0 h-4 pointer-events-none"
                />

                <div className="flex flex-col lg:flex-row items-start justify-between relative gap-12">
                    
                    {/* Left Column: Flow of Text Blocks scrolling naturally */}
                    <div className="w-full lg:w-[50%] flex flex-col gap-28 py-12">
                        <div className="max-w-md">
                            <div className="bg-[#576238]/10 text-[#576238] font-bold text-xs uppercase tracking-widest px-3 py-1.5 rounded-full mb-6 flex items-center gap-1.5 w-fit">
                                <Award className="w-3.5 h-3.5" /> Roadmap Assembly
                            </div>
                            <h3 className="text-4xl lg:text-6xl font-black text-[#576238] leading-tight">
                                Stack Your Venture
                            </h3>
                            <p className="text-lg text-muted-foreground mt-4 leading-relaxed">
                                Scroll down. As each business milestone passes through the center of your screen, watch the corresponding physical Lego block fall into place in the sticky side panel.
                            </p>
                        </div>

                        {steps.map((step, idx) => (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0.15, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ margin: "-35% 0px -35% 0px", once: false }}
                                onViewportEnter={() => setCurrentStep(idx + 1)}
                                className="min-h-[45vh] flex flex-col justify-center border-l-4 border-[#d4cbb8] pl-6 md:pl-10 relative"
                            >
                                {/* Active Indicator Bar */}
                                {currentStep === idx + 1 && (
                                    <motion.div 
                                        layoutId="activeTimelineBar"
                                        className="absolute left-[-4px] top-0 bottom-0 w-1 bg-[#576238] rounded-full"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                
                                <span className="text-xs uppercase tracking-widest font-black text-[#FFD95D] mb-2 drop-shadow-sm">
                                    Milestone Stage 0{idx + 1}
                                </span>
                                <h4 className="text-3xl md:text-4xl font-black text-[#576238]">
                                    {step.title}
                                </h4>
                                <p className="text-md md:text-lg text-muted-foreground mt-4 leading-relaxed max-w-lg">
                                    {step.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Right Column: Sticky Tower Viewport */}
                    <div className="w-full lg:w-[45%] sticky top-24 h-[650px] flex items-center justify-center bg-white/30 backdrop-blur-xs border-2 border-dashed border-[#d4cbb8]/40 rounded-3xl p-6 shadow-sm">
                        <ScrollLegoTower activeIndex={currentStep} steps={steps} />
                    </div>

                </div>
            </section>

            {/* HORIZONTAL FEATURES PANEL (Tightened scroll track to eliminate empty gap) */}
            <section 
                ref={modulesRef}
                className="relative h-[220vh] bg-white border-t border-[#d4cbb8]/40"
            >
                <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden py-16">
                    {/* Sticky Heading */}
                    <div className="px-6 lg:px-24 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h2 className="text-4xl md:text-7xl font-black text-[#576238] tracking-tight">
                                Platform <span className="text-[#FFD95D] drop-shadow-sm">Modules</span>
                            </h2>
                            <p className="text-muted-foreground text-md md:text-lg max-w-xl mt-3">
                                Discover the workspace tools designed to accelerate your venture build.
                            </p>
                        </div>
                        
                        {/* Horizontal Scroll indicator Progress Bar */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Modules Progress</span>
                            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-[#576238]" 
                                    style={{ width: useTransform(smoothHorizontalProgress, [0, 1], ["0%", "100%"]) }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Horizontal sliding track */}
                    <div className="relative flex items-center w-full">
                        <motion.div 
                            style={{ x: xTranslation }} 
                            className="flex gap-8 px-6 lg:px-24"
                        >
                            {modules.map((mod, index) => {
                                const IconComp = mod.icon;
                                return (
                                    <TiltCard 
                                        key={index} 
                                        className="w-[300px] sm:w-[380px] md:w-[440px] h-[340px] md:h-[380px] shrink-0 bg-[#F0EADC]/40 hover:bg-[#F0EADC]/70 border-2 border-[#d4cbb8]/50 rounded-3xl p-8 md:p-10 flex flex-col justify-between shadow-lg"
                                        maxRotation={10}
                                        glareOpacity={0.12}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="w-14 h-14 rounded-2xl bg-[#576238] flex items-center justify-center text-white shadow-lg">
                                                <IconComp className="w-7 h-7" />
                                            </div>
                                            <span className="text-4xl font-black opacity-15 text-[#576238]">
                                                {mod.num}
                                            </span>
                                        </div>
                                        
                                        <div className="mt-6 flex-grow">
                                            <h3 className="text-xl md:text-2xl font-black text-[#576238] mb-3">
                                                {mod.title}
                                            </h3>
                                            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                                                {mod.desc}
                                            </p>
                                        </div>

                                        <button 
                                            onClick={() => setSelectedModule(mod)}
                                            className="flex items-center gap-2 text-[#576238] hover:text-[#6b7c3f] font-bold text-xs uppercase tracking-widest mt-4 cursor-pointer text-left"
                                        >
                                            Learn More <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </TiltCard>
                                );
                            })}

                            {/* End Card CTA (Fully visible within the horizontal scroll boundary) */}
                            <div className="w-[300px] sm:w-[380px] md:w-[440px] h-[340px] md:h-[380px] shrink-0 bg-[#576238] text-white rounded-3xl p-8 md:p-10 flex flex-col justify-between shadow-2xl">
                                <Sparkles className="w-10 h-10 text-[#FFD95D]" />
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-black text-[#FFD95D] mb-3">
                                        Ready to stack?
                                    </h3>
                                    <p className="text-xs md:text-sm text-white/80 leading-relaxed">
                                        Create your startup blueprint today. Register, stack your milestones, and showcase to investors.
                                    </p>
                                </div>
                                <Link href="/signup">
                                    <Button className="w-full bg-[#FFD95D] hover:bg-[#ffe38a] text-[#576238] font-bold py-5 rounded-xl text-sm shadow-xl transition-all cursor-pointer">
                                        Initialize Workspace
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FREEMIUM PLANS SECTION (UPGRADED pricing card visual design + toggle) */}
            <section 
                ref={pricingRef}
                id="pricing"
                className="relative py-24 bg-[#Fdfbf7] overflow-hidden border-t border-[#d4cbb8]/40"
            >
                {/* Subtle Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#FFD95D]/10 rounded-full blur-[100px] pointer-events-none" />

                {/* 3D-styled Parallax Lego Bricks Floating in Background for Pricing */}
                <motion.div 
                    style={{ y: pricingLego1Y, x: pricingLego1X, rotate: pricingLego1Rotate }}
                    className="absolute top-16 left-[5%] w-24 h-16 pointer-events-none opacity-20 lg:opacity-35 hidden md:block"
                >
                    <motion.div 
                        animate={{ y: [-6, 6, -6], rotate: [-3, 3, -3] }}
                        transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut" }}
                        className="w-full h-12 bg-[#576238] rounded-xl shadow-2xl relative border border-white/10"
                    >
                        <div className="absolute -top-2 left-3 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-10 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-17 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                    </motion.div>
                </motion.div>

                <motion.div 
                    style={{ y: pricingLego2Y, x: pricingLego2X, rotate: pricingLego2Rotate }}
                    className="absolute top-20 right-[5%] w-20 h-14 pointer-events-none opacity-20 lg:opacity-35 hidden md:block"
                >
                    <motion.div 
                        animate={{ y: [6, -6, 6], rotate: [4, -4, 4] }}
                        transition={{ repeat: Infinity, duration: 6.5, ease: "easeInOut" }}
                        className="w-full h-10 bg-[#FFD95D] rounded-xl shadow-2xl relative border border-white/10"
                    >
                        <div className="absolute -top-2 left-4 w-4 h-3 bg-[#FFD95D] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-12 w-4 h-3 bg-[#FFD95D] rounded-t-md shadow-inner" />
                    </motion.div>
                </motion.div>

                <motion.div 
                    style={{ y: pricingLego3Y, x: pricingLego3X, rotate: pricingLego3Rotate }}
                    className="absolute bottom-16 left-[8%] w-16 h-12 pointer-events-none opacity-15 lg:opacity-25 hidden md:block"
                >
                    <motion.div 
                        animate={{ y: [-8, 8, -8], x: [-3, 3, -3] }}
                        transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut" }}
                        className="w-full h-8 bg-[#8b9456] rounded-xl shadow-2xl relative border border-white/10"
                    >
                        <div className="absolute -top-2 left-3 w-3 h-2 bg-[#8b9456] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-9 w-3 h-2 bg-[#8b9456] rounded-t-md shadow-inner" />
                    </motion.div>
                </motion.div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                            Simple, transparent pricing
                        </h2>
                        <p className="text-lg text-slate-600 mb-8">
                            Choose the plan that fits your growth stage. Switch currencies to see local or global rates.
                        </p>

                        {/* Currency Toggle */}
                        <div className="inline-flex items-center p-1 bg-slate-100 rounded-full border border-slate-200 shadow-inner">
                            <button
                                onClick={() => setCurrency("EGP")}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${currency === "EGP"
                                        ? "bg-white text-[#576238] shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                EGP (Egypt)
                            </button>
                            <button
                                onClick={() => setCurrency("USD")}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${currency === "USD"
                                        ? "bg-white text-[#576238] shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                USD (Global)
                            </button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                        {plans.map((plan, i) => (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`relative rounded-3xl p-8 transition-all duration-300 ${plan.popular
                                        ? "bg-[#576238] text-white shadow-2xl scale-105 border-none"
                                        : "bg-white text-slate-900 border border-slate-200 shadow-lg hover:shadow-xl"
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FFD95D] text-slate-900 text-xs font-black uppercase tracking-wider py-1 px-4 rounded-full flex items-center gap-1 shadow-sm">
                                        <Sparkles className="w-3 h-3" /> Most Popular
                                    </div>
                                )}

                                <h3 className={`text-xl font-bold mb-2 ${plan.popular ? "text-white" : "text-slate-900"}`}>
                                    {plan.name}
                                </h3>
                                <p className={`text-sm mb-6 h-10 ${plan.popular ? "text-white/80" : "text-slate-500"}`}>
                                    {plan.description}
                                </p>

                                <div className="mb-8 flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold tracking-tight">
                                        {currency === "USD" ? "$" : "E£"}
                                        {plan.monthly[currency]}
                                    </span>
                                    <span className={`text-sm font-medium ${plan.popular ? "text-white/70" : "text-slate-500"}`}>
                                        /month
                                    </span>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-sm font-medium">
                                            <CheckCircle2
                                                className={`w-5 h-5 flex-shrink-0 ${plan.popular ? "text-[#FFD95D]" : "text-[#576238]"
                                                    }`}
                                            />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link href="/signup" className="w-full mt-auto block">
                                    <Button
                                        className={`w-full h-12 rounded-xl text-base font-bold transition-all ${plan.popular
                                                ? "bg-[#FFD95D] hover:bg-[#f5cf53] text-slate-900"
                                                : "bg-slate-900 hover:bg-slate-800 text-white"
                                            }`}
                                    >
                                        {plan.monthly[currency] === 0 ? "Get Started for Free" : "Subscribe Now"}
                                    </Button>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FULLY FUNCTIONAL MODAL FOR MODULE DETAILS */}
            <Dialog open={!!selectedModule} onOpenChange={(open) => !open && setSelectedModule(null)}>
                {selectedModule && (
                    <DialogContent className="max-w-2xl bg-[#F0EADC] border-2 border-[#d4cbb8] rounded-3xl p-8 shadow-2xl z-[100] gap-0">
                        <DialogHeader className="gap-0">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 rounded-2xl bg-[#576238] flex items-center justify-center text-white shadow-md">
                                    {React.createElement(selectedModule.icon, { className: "w-7 h-7" })}
                                </div>
                                <div>
                                    <DialogTitle className="text-3xl font-black text-[#576238]">
                                        {selectedModule.title}
                                    </DialogTitle>
                                    <DialogDescription className="text-[#576238]/80 text-sm font-semibold tracking-wide uppercase mt-1">
                                        Module Overview {selectedModule.num}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="my-4 space-y-5">
                            <p className="text-gray-700 leading-relaxed text-md">
                                {selectedModule.longDesc}
                            </p>
                            
                            <div className="bg-white/60 rounded-2xl p-6 border border-[#d4cbb8] space-y-3 shadow-inner">
                                <h4 className="font-bold text-[#576238] text-xs uppercase tracking-wider">
                                    Key Capability Blocks
                                </h4>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {selectedModule.capabilities.map((cap, i) => (
                                        <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700 font-medium">
                                            <div className="w-2 h-2 rounded-full bg-[#FFD95D] shrink-0" />
                                            {cap}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#d4cbb8]/30">
                            <Button 
                                onClick={() => setSelectedModule(null)}
                                variant="outline" 
                                className="border-2 border-[#576238]/30 font-bold px-6 py-5 rounded-xl hover:bg-white cursor-pointer w-full sm:w-auto"
                            >
                                Close
                            </Button>
                            <Link href="/signup" className="flex-grow">
                                <Button className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white font-bold py-5 rounded-xl cursor-pointer">
                                    Initialize Module Workspace
                                </Button>
                            </Link>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
}