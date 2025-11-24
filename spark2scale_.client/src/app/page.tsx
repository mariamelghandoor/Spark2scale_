"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import LegoProgress from "@/components/lego/LegoProgress";
import { Check } from "lucide-react";

export default function Home() {
    const plans = [
        {
            name: "Starter",
            price: "$0",
            period: "forever",
            features: [
                "1 Startup Project",
                "Basic Idea Check",
                "Limited Documents (3)",
                "Community Support",
                "Progress Tracking",
            ],
            cta: "Start Free",
            highlighted: false,
        },
        {
            name: "Growth",
            price: "$29",
            period: "/month",
            features: [
                "5 Startup Projects",
                "AI-Powered Idea Check",
                "Unlimited Documents",
                "Market Research Tools",
                "Pitch Deck Analyzer",
                "Priority Support",
                "Team Collaboration (up to 3)",
            ],
            cta: "Start Growing",
            highlighted: true,
        },
        {
            name: "Scale",
            price: "$99",
            period: "/month",
            features: [
                "Unlimited Startup Projects",
                "Advanced AI Analysis",
                "Unlimited Everything",
                "Investor Matching",
                "White-label Options",
                "Dedicated Account Manager",
                "Unlimited Team Members",
                "API Access",
            ],
            cta: "Scale Now",
            highlighted: false,
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <Navbar />

            <main className="container mx-auto px-4 py-16">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-5xl md:text-7xl font-bold text-[#576238] mb-6"
                    >
                        Build Your Startup
                        <br />
                        <span className="text-[#FFD95D]">Block by Block</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto"
                    >
                        A gamified platform that turns your startup journey into an engaging,
                        visual experience. Complete tasks, stack progress, and watch your
                        success grow! 🚀
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex flex-wrap gap-4 justify-center"
                    >
                        <Link href="/signup">
                            <Button
                                size="lg"
                                className="bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold text-lg px-8 py-6"
                            >
                                Get Started Free
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button
                                size="lg"
                                variant="outline"
                                className="font-semibold text-lg px-8 py-6 border-2"
                            >
                                Learn More
                            </Button>
                        </Link>
                    </motion.div>
                </div>

                {/* LEGO Progress Visualization */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="bg-white/60 backdrop-blur-sm rounded-3xl shadow-2xl p-12 border-2 border-[#d4cbb8]">
                        <h2 className="text-3xl font-bold text-center text-[#576238] mb-4">
                            Your Progress Journey
                        </h2>
                        <p className="text-center text-muted-foreground mb-12">
                            Every completed stage adds a block to your tower of success
                        </p>

                        <div className="flex justify-center items-center gap-12 flex-wrap">
                            {/* Zero Progress */}
                            <div className="text-center">
                                <p className="text-sm font-semibold text-muted-foreground mb-4">
                                    Getting Started
                                </p>
                                <LegoProgress totalStages={6} completedStages={0} />
                            </div>

                            {/* Partial Progress */}
                            <div className="text-center">
                                <p className="text-sm font-semibold text-muted-foreground mb-4">
                                    Making Progress
                                </p>
                                <LegoProgress totalStages={6} completedStages={3} />
                            </div>

                            {/* Full Progress */}
                            <div className="text-center">
                                <p className="text-sm font-semibold text-muted-foreground mb-4">
                                    Completed! 🎉
                                </p>
                                <LegoProgress totalStages={6} completedStages={6} />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Features Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1 }}
                    className="grid md:grid-cols-3 gap-8 mt-20"
                >
                    {[
                        {
                            emoji: "🎮",
                            title: "Gamified Experience",
                            desc: "Turn your startup journey into an engaging game with visual rewards",
                        },
                        {
                            emoji: "📊",
                            title: "Track Progress",
                            desc: "See your achievements stack up with every milestone you complete",
                        },
                        {
                            emoji: "🤝",
                            title: "Connect & Grow",
                            desc: "Match with investors and build meaningful partnerships",
                        },
                    ].map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 1.2 + index * 0.2 }}
                            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border-2 border-transparent hover:border-[#FFD95D]"
                        >
                            <div className="text-5xl mb-4">{feature.emoji}</div>
                            <h3 className="text-xl font-bold text-[#576238] mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-muted-foreground">{feature.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Freemium Plans Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.8 }}
                    className="mt-24 mb-12"
                >
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold text-[#576238] mb-4">
                            Choose Your Plan
                        </h2>
                        <p className="text-xl text-muted-foreground">
                            Start free and scale as you grow
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {plans.map((plan, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 2 + index * 0.1 }}
                                className="relative"
                            >
                                {plan.highlighted && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FFD95D] text-[#576238] px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                                        ⭐ Most Popular
                                    </div>
                                )}
                                <Card
                                    className={`p-8 h-full flex flex-col ${plan.highlighted
                                            ? "border-[#FFD95D] border-4 shadow-2xl scale-105"
                                            : "border-2"
                                        }`}
                                >
                                    <div className="text-center mb-6">
                                        <h3 className="text-2xl font-bold text-[#576238] mb-2">
                                            {plan.name}
                                        </h3>
                                        <div className="flex items-baseline justify-center gap-1">
                                            <span className="text-4xl font-bold text-[#576238]">
                                                {plan.price}
                                            </span>
                                            <span className="text-muted-foreground">{plan.period}</span>
                                        </div>
                                    </div>

                                    <ul className="space-y-3 mb-8 flex-grow">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <Check className="h-5 w-5 text-[#576238] mt-0.5 flex-shrink-0" />
                                                <span className="text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Link href="/signup" className="w-full">
                                        <Button
                                            className={`w-full ${plan.highlighted
                                                    ? "bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                                    : "bg-[#F0EADC] hover:bg-[#FFD95D] text-[#576238]"
                                                } font-semibold`}
                                            size="lg"
                                        >
                                            {plan.cta}
                                        </Button>
                                    </Link>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}