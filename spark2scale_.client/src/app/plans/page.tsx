"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = [
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

export default function ModernPricing() {
    const [currency, setCurrency] = useState<"EGP" | "USD">("EGP");

    return (
        <section className="relative py-24 bg-[#Fdfbf7] overflow-hidden">
            {/* Subtle Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#FFD95D]/10 rounded-full blur-[100px] pointer-events-none" />

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
                    {PLANS.map((plan, i) => (
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

                            <Button
                                className={`w-full h-12 rounded-xl text-base font-bold transition-all ${plan.popular
                                        ? "bg-[#FFD95D] hover:bg-[#f5cf53] text-slate-900"
                                        : "bg-slate-900 hover:bg-slate-800 text-white"
                                    }`}
                            >
                                {plan.monthly[currency] === 0 ? "Get Started for Free" : "Subscribe Now"}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}