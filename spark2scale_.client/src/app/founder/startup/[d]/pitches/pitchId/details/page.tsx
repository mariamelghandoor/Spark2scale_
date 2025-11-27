"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Video, Lightbulb, Target, Users, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";

export default function PitchDetailsPage() {
    const params = useParams();

    const guidelines = [
        {
            category: "Opening (First 30 seconds)",
            icon: Clock,
            color: "bg-blue-500",
            tips: [
                {
                    title: "Hook Your Audience",
                    description: "Start with a compelling question or surprising statistic that relates to the problem you're solving.",
                    example: "Did you know that 70% of small businesses fail due to poor cash flow management?",
                },
                {
                    title: "Introduce Yourself Briefly",
                    description: "State your name, your role, and your company name confidently.",
                    example: "I'm Sarah, CEO of FinanceFlow, and we're solving this exact problem.",
                },
                {
                    title: "State the Problem Clearly",
                    description: "Make it relatable and urgent. Help investors feel the pain point.",
                    example: "Small business owners waste 10+ hours weekly on manual bookkeeping.",
                },
            ],
        },
        {
            category: "The Problem (30-60 seconds)",
            icon: Target,
            color: "bg-red-500",
            tips: [
                {
                    title: "Paint a Vivid Picture",
                    description: "Use storytelling to illustrate the problem. Make it emotional and relatable.",
                    example: "Meet John, a restaurant owner who stays up until 2 AM every night reconciling receipts...",
                },
                {
                    title: "Quantify the Impact",
                    description: "Use data to show the scale of the problem. Numbers create urgency.",
                    example: "This affects 28 million small businesses in the US alone, representing a $50B market.",
                },
                {
                    title: "Show Current Solutions Fail",
                    description: "Briefly explain why existing solutions don't work. Set up your solution.",
                    example: "Current tools are either too complex for small businesses or too basic to be effective.",
                },
            ],
        },
        {
            category: "Your Solution (60-90 seconds)",
            icon: Lightbulb,
            color: "bg-yellow-500",
            tips: [
                {
                    title: "Demonstrate, Don't Just Describe",
                    description: "If possible, show your product in action. A brief demo is worth a thousand words.",
                    example: "Let me show you how Sarah processes a month's worth of expenses in under 2 minutes...",
                },
                {
                    title: "Focus on Benefits, Not Features",
                    description: "Explain how your solution transforms the user's life, not just what it does.",
                    example: "FinanceFlow gives owners their evenings back and reduces accounting errors by 95%.",
                },
                {
                    title: "Highlight Your Unique Approach",
                    description: "What makes your solution different? What's your secret sauce?",
                    example: "Unlike competitors, we use AI to automatically categorize and learn from your spending patterns.",
                },
            ],
        },
        {
            category: "Market Opportunity (30-45 seconds)",
            icon: TrendingUp,
            color: "bg-green-500",
            tips: [
                {
                    title: "Show Market Size",
                    description: "Present TAM, SAM, and SOM if appropriate. Make investors see the potential.",
                    example: "We're targeting the $15B small business accounting software market, growing at 12% annually.",
                },
                {
                    title: "Explain Your Entry Strategy",
                    description: "How will you capture this market? What's your wedge?",
                    example: "We're starting with restaurants and cafes, where the pain is most acute.",
                },
                {
                    title: "Show Traction",
                    description: "Any proof that the market wants what you're building? Early customers, revenue, growth?",
                    example: "We've grown from 50 to 500 paying customers in just 3 months, with 40% MoM growth.",
                },
            ],
        },
        {
            category: "Business Model (30-45 seconds)",
            icon: Users,
            color: "bg-purple-500",
            tips: [
                {
                    title: "Keep It Simple",
                    description: "Clearly explain how you make money. Avoid complexity.",
                    example: "We charge $49/month per business, with an enterprise tier at $199/month.",
                },
                {
                    title: "Show Unit Economics",
                    description: "If you can, share CAC, LTV, and margins. Investors love profitability paths.",
                    example: "Our CAC is $150, and LTV is $1,800, giving us a healthy 12:1 ratio.",
                },
                {
                    title: "Highlight Scalability",
                    description: "Explain why your model can scale without proportional cost increases.",
                    example: "Our software-based model allows us to serve 10x more customers without significant cost increases.",
                },
            ],
        },
        {
            category: "Team (30 seconds)",
            icon: Users,
            color: "bg-indigo-500",
            tips: [
                {
                    title: "Highlight Relevant Experience",
                    description: "Focus on what makes your team uniquely qualified to solve this problem.",
                    example: "Our CTO built Stripe's fraud detection system. Our COO ran operations for a 5,000-restaurant chain.",
                },
                {
                    title: "Show Complementary Skills",
                    description: "Demonstrate that you have all the key areas covered: tech, business, domain expertise.",
                    example: "We combine 20 years of fintech experience with deep restaurant industry knowledge.",
                },
                {
                    title: "Mention Advisors or Backers",
                    description: "Name-drop if you have impressive advisors or existing investors.",
                    example: "We're advised by the former CFO of OpenTable and backed by Y Combinator.",
                },
            ],
        },
        {
            category: "The Ask & Closing (30 seconds)",
            icon: Video,
            color: "bg-pink-500",
            tips: [
                {
                    title: "Be Specific About What You Need",
                    description: "State exactly how much you're raising and what it's for.",
                    example: "We're raising $2M to expand our sales team and add enterprise features.",
                },
                {
                    title: "Show What You'll Achieve",
                    description: "Give investors a clear picture of the milestones you'll hit with their money.",
                    example: "This will take us from 500 to 5,000 customers and $3M ARR by year-end.",
                },
                {
                    title: "End with a Strong Call to Action",
                    description: "Make it clear what you want from them next. Create urgency.",
                    example: "We're closing this round in 3 weeks. I'd love to schedule a follow-up to dive deeper.",
                },
            ],
        },
    ];

    const deliveryTips = [
        {
            icon: "🎤",
            title: "Speak with Confidence",
            description: "Practice until you can deliver without reading. Make eye contact and use natural gestures.",
        },
        {
            icon: "⚡",
            title: "Control Your Energy",
            description: "Show passion but stay professional. Vary your tone to emphasize key points.",
        },
        {
            icon: "⏱️",
            title: "Respect Time",
            description: "Stay within your allocated time. If you have 5 minutes, practice a 4:30 version.",
        },
        {
            icon: "❓",
            title: "Prepare for Questions",
            description: "Anticipate tough questions about competition, market size, and financials.",
        },
        {
            icon: "📊",
            title: "Use Visuals Wisely",
            description: "Keep slides simple. One key message per slide. Visuals should support, not distract.",
        },
        {
            icon: "🎯",
            title: "Know Your Numbers",
            description: "Be ready to discuss any metric on your slides. Know your unit economics cold.",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${params.id}/pitches-page`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-[#576238]">
                                🎥 Pitch Video Guidelines
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Structured instructions to perfect your investor pitch
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Hero Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="p-8 bg-gradient-to-r from-[#576238] to-[#6b7c3f] text-white border-0">
                            <div className="flex items-start gap-6">
                                <div className="text-6xl">🎬</div>
                                <div>
                                    <h2 className="text-3xl font-bold mb-3">
                                        Master Your Pitch in 5 Minutes
                                    </h2>
                                    <p className="text-lg text-white/90 mb-4">
                                        Follow this comprehensive guide to structure and deliver a compelling pitch that wins investors.
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                                            <div className="text-2xl font-bold">7</div>
                                            <div className="text-xs text-white/80">Key Sections</div>
                                        </div>
                                        <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                                            <div className="text-2xl font-bold">5</div>
                                            <div className="text-xs text-white/80">Minutes Total</div>
                                        </div>
                                        <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                                            <div className="text-2xl font-bold">20+</div>
                                            <div className="text-xs text-white/80">Expert Tips</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Pitch Structure Guidelines */}
                    <div>
                        <h3 className="text-2xl font-bold text-[#576238] mb-6">
                            📋 Pitch Structure & Guidelines
                        </h3>
                        <div className="space-y-6">
                            {guidelines.map((section, sectionIndex) => {
                                const IconComponent = section.icon;
                                return (
                                    <motion.div
                                        key={sectionIndex}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: sectionIndex * 0.1 }}
                                    >
                                        <Card className="border-2 hover:border-[#FFD95D] transition-all overflow-hidden">
                                            {/* Section Header */}
                                            <div className={`${section.color} p-4 text-white`}>
                                                <div className="flex items-center gap-3">
                                                    <IconComponent className="h-6 w-6" />
                                                    <h4 className="text-xl font-bold">{section.category}</h4>
                                                </div>
                                            </div>

                                            {/* Tips */}
                                            <div className="p-6 space-y-6">
                                                {section.tips.map((tip, tipIndex) => (
                                                    <div key={tipIndex} className="space-y-2">
                                                        <div className="flex items-start gap-3">
                                                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                                            <div className="flex-grow">
                                                                <h5 className="font-bold text-[#576238] mb-1">
                                                                    {tip.title}
                                                                </h5>
                                                                <p className="text-sm text-muted-foreground mb-2">
                                                                    {tip.description}
                                                                </p>
                                                                <div className="bg-[#F0EADC]/50 border-l-4 border-[#FFD95D] p-3 rounded">
                                                                    <p className="text-sm italic text-gray-700">
                                                                        <strong>Example:</strong> "{tip.example}"
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {tipIndex < section.tips.length - 1 && (
                                                            <div className="border-b ml-8" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Delivery Tips */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <h3 className="text-2xl font-bold text-[#576238] mb-6">
                            🎯 Delivery & Presentation Tips
                        </h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {deliveryTips.map((tip, index) => (
                                <Card key={index} className="p-6 border-2 hover:border-[#FFD95D] transition-all">
                                    <div className="text-4xl mb-3">{tip.icon}</div>
                                    <h4 className="font-bold text-[#576238] mb-2">{tip.title}</h4>
                                    <p className="text-sm text-muted-foreground">{tip.description}</p>
                                </Card>
                            ))}
                        </div>
                    </motion.div>

                    {/* Final Tips */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="p-6 bg-gradient-to-r from-[#FFD95D]/20 to-transparent border-2 border-[#FFD95D]">
                            <div className="flex items-start gap-4">
                                <div className="text-4xl">💡</div>
                                <div>
                                    <h3 className="font-bold text-[#576238] mb-2 text-lg">
                                        Remember: Practice Makes Perfect
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Record yourself multiple times and watch the playback. Get feedback from mentors, advisors, and fellow founders.
                                        Each iteration will make you more confident and compelling.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="bg-[#576238] text-white px-3 py-1 rounded-full text-xs">
                                            Record 5-10 practice runs
                                        </span>
                                        <span className="bg-[#576238] text-white px-3 py-1 rounded-full text-xs">
                                            Get feedback from 3+ people
                                        </span>
                                        <span className="bg-[#576238] text-white px-3 py-1 rounded-full text-xs">
                                            Time yourself every run
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="flex gap-4 justify-center pt-6"
                    >
                        <Button variant="outline" size="lg" asChild>
                            <Link href={`/founder/startup/${params.id}/pitches-page`}>
                                Back to Pitches
                            </Link>
                        </Button>
                        <Button
                            size="lg"
                            className="bg-[#576238] hover:bg-[#6b7c3f] text-white"
                        >
                            <Video className="mr-2 h-4 w-4" />
                            Start Recording
                        </Button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
