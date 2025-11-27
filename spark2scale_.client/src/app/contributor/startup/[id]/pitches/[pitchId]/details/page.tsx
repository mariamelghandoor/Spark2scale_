"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lightbulb, Target, TrendingUp, Users, DollarSign, Award, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ContributorPitchDetailsPage() {
    const params = useParams();

    const sections = [
        {
            title: "Opening Hook",
            icon: Lightbulb,
            time: "30 seconds",
            color: "bg-purple-500",
            tips: [
                "Start with a compelling statistic or story",
                "Grab attention within the first 10 seconds",
                "Make it memorable and relatable"
            ]
        },
        {
            title: "Problem Statement",
            icon: Target,
            time: "1 minute",
            color: "bg-red-500",
            tips: [
                "Clearly define the problem you're solving",
                "Use real-world examples",
                "Quantify the pain point with data"
            ]
        },
        {
            title: "Your Solution",
            icon: Lightbulb,
            time: "1-2 minutes",
            color: "bg-green-500",
            tips: [
                "Explain your unique approach",
                "Show how it solves the problem",
                "Use visuals or demos if possible"
            ]
        },
        {
            title: "Market Opportunity",
            icon: TrendingUp,
            time: "1 minute",
            color: "bg-blue-500",
            tips: [
                "Present market size and growth potential",
                "Show TAM, SAM, and SOM",
                "Highlight market trends supporting your solution"
            ]
        },
        {
            title: "Business Model",
            icon: DollarSign,
            time: "1 minute",
            color: "bg-yellow-500",
            tips: [
                "Explain how you make money",
                "Show revenue streams",
                "Present pricing strategy"
            ]
        },
        {
            title: "Team",
            icon: Users,
            time: "30-45 seconds",
            color: "bg-indigo-500",
            tips: [
                "Highlight key team members' expertise",
                "Show relevant experience and achievements",
                "Demonstrate why your team can execute"
            ]
        },
        {
            title: "The Ask & Closing",
            icon: Award,
            time: "30 seconds",
            color: "bg-pink-500",
            tips: [
                "Clearly state your funding ask",
                "Explain use of funds",
                "End with a strong call-to-action"
            ]
        }
    ];

    const generalTips = [
        {
            title: "Keep it concise",
            description: "Aim for 5-7 minutes total. Investors have limited time and attention."
        },
        {
            title: "Tell a story",
            description: "Weave a narrative that connects all elements of your pitch emotionally."
        },
        {
            title: "Practice delivery",
            description: "Rehearse multiple times. Know your content well enough to be conversational."
        },
        {
            title: "Use visuals wisely",
            description: "Slides should enhance, not distract. Use high-quality images and minimal text."
        },
        {
            title: "Anticipate questions",
            description: "Prepare for common investor questions about traction, competition, and risks."
        },
        {
            title: "Show traction",
            description: "Highlight any metrics, customers, or milestones achieved to date."
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/contributor/startup/${params.id}/pitches`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">Pitch Guidelines & Tips</h1>
                            <p className="text-sm text-muted-foreground">Structured advice for delivering an effective pitch</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Introduction Card */}
                    <Card className="border-2 border-[#576238] bg-gradient-to-r from-[#576238] to-[#6b7c3f] text-white">
                        <CardHeader>
                            <CardTitle className="text-2xl">🎯 Pitch Structure Guide</CardTitle>
                            <CardDescription className="text-white/80">
                                Follow this proven structure to create a compelling investor pitch. Each section includes timing recommendations and key tips.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Pitch Sections */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-[#576238]">📋 Pitch Sections</h2>
                        {sections.map((section, index) => {
                            const IconComponent = section.icon;
                            return (
                                <Card key={index} className="border-2 hover:border-[#FFD95D] transition-all">
                                    <CardHeader>
                                        <div className="flex items-start gap-4">
                                            <div className={`${section.color} p-3 rounded-lg`}>
                                                <IconComponent className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-[#576238]">
                                                        {index + 1}. {section.title}
                                                    </CardTitle>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Clock className="h-4 w-4" />
                                                        {section.time}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {section.tips.map((tip, tipIndex) => (
                                                <li key={tipIndex} className="flex items-start gap-2">
                                                    <span className="text-[#576238] font-bold mt-0.5">•</span>
                                                    <span className="text-sm">{tip}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* General Tips */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-[#576238]">💡 General Tips for Success</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {generalTips.map((tip, index) => (
                                <Card key={index} className="bg-[#F0EADC]/50 border-2">
                                    <CardHeader>
                                        <CardTitle className="text-base text-[#576238]">{tip.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{tip.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Delivery Tips */}
                    <Card className="border-2 border-[#FFD95D] bg-[#FFD95D]/10">
                        <CardHeader>
                            <CardTitle className="text-[#576238]">🎤 Delivery & Presentation Tips</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-start gap-2">
                                <span className="text-[#576238] font-bold">✓</span>
                                <span className="text-sm"><strong>Eye contact:</strong> Connect with your audience throughout</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-[#576238] font-bold">✓</span>
                                <span className="text-sm"><strong>Pace yourself:</strong> Speak clearly and at a moderate pace</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-[#576238] font-bold">✓</span>
                                <span className="text-sm"><strong>Body language:</strong> Use confident posture and natural gestures</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-[#576238] font-bold">✓</span>
                                <span className="text-sm"><strong>Energy:</strong> Show passion and enthusiasm for your idea</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-[#576238] font-bold">✓</span>
                                <span className="text-sm"><strong>Time management:</strong> Stay within your allotted time</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
