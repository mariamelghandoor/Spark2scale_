import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";

export default function PlansPage() {
    const plans = [
        {
            name: "Starter",
            price: "$0",
            period: "forever",
            description: "Perfect for testing your startup idea",
            features: [
                "1 Startup Project",
                "Basic Idea Check",
                "Limited Documents (3)",
                "Community Support",
                "Progress Tracking",
                "Basic Analytics",
            ],
            cta: "Start Free",
            highlighted: false,
        },
        {
            name: "Growth",
            price: "$29",
            period: "/month",
            description: "For serious founders ready to scale",
            features: [
                "5 Startup Projects",
                "AI-Powered Idea Check",
                "Unlimited Documents",
                "Market Research Tools",
                "Pitch Deck Analyzer",
                "Priority Support",
                "Team Collaboration (up to 3)",
                "Advanced Analytics",
                "Export to PDF/Word",
                "Email Support",
            ],
            cta: "Start Growing",
            highlighted: true,
        },
        {
            name: "Scale",
            price: "$99",
            period: "/month",
            description: "Enterprise-grade features for ambitious teams",
            features: [
                "Unlimited Startup Projects",
                "Advanced AI Analysis",
                "Unlimited Everything",
                "Investor Matching",
                "White-label Options",
                "Dedicated Account Manager",
                "Unlimited Team Members",
                "API Access",
                "Custom Integrations",
                "Priority Phone Support",
                "Onboarding & Training",
                "Custom Branding",
            ],
            cta: "Scale Now",
            highlighted: false,
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <Navbar />

            <main className="container mx-auto px-4 py-16">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl md:text-6xl font-bold text-[#576238] mb-6">
                        Choose Your Plan
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                        Start free and upgrade as you grow. All plans include our core gamified experience.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
                    {plans.map((plan, index) => (
                        <div key={index} className="relative">
                            {plan.highlighted && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FFD95D] text-[#576238] px-6 py-2 rounded-full text-sm font-bold shadow-lg z-10">
                                    ⭐ Most Popular
                                </div>
                            )}
                            <Card
                                className={`p-8 h-full flex flex-col ${plan.highlighted
                                        ? "border-[#FFD95D] border-4 shadow-2xl scale-105 bg-white"
                                        : "border-2 bg-white/80"
                                    }`}
                            >
                                <div className="text-center mb-6">
                                    <h2 className="text-3xl font-bold text-[#576238] mb-2">
                                        {plan.name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {plan.description}
                                    </p>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-5xl font-bold text-[#576238]">
                                            {plan.price}
                                        </span>
                                        <span className="text-muted-foreground text-lg">
                                            {plan.period}
                                        </span>
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-8 flex-grow">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
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
                                            } font-semibold text-lg py-6`}
                                        size="lg"
                                    >
                                        {plan.cta}
                                    </Button>
                                </Link>
                            </Card>
                        </div>
                    ))}
                </div>

                {/* FAQ Section */}
                <div className="max-w-4xl mx-auto mt-20">
                    <h2 className="text-3xl font-bold text-center text-[#576238] mb-12">
                        Frequently Asked Questions
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            {
                                q: "Can I change plans later?",
                                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.",
                            },
                            {
                                q: "Is there a free trial?",
                                a: "The Starter plan is free forever. You can explore all basic features before upgrading.",
                            },
                            {
                                q: "What payment methods do you accept?",
                                a: "We accept all major credit cards, PayPal, and wire transfers for enterprise plans.",
                            },
                            {
                                q: "Can I cancel anytime?",
                                a: "Absolutely! Cancel your subscription anytime with no questions asked.",
                            },
                        ].map((faq, index) => (
                            <Card key={index} className="p-6 bg-white">
                                <h3 className="font-bold text-[#576238] mb-2">{faq.q}</h3>
                                <p className="text-sm text-muted-foreground">{faq.a}</p>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                <div className="text-center mt-20">
                    <Card className="max-w-3xl mx-auto p-12 bg-gradient-to-br from-[#576238] to-[#6b7c3f] text-white">
                        <h2 className="text-3xl font-bold mb-4">
                            Ready to Build Your Startup?
                        </h2>
                        <p className="text-lg mb-8 opacity-90">
                            Join thousands of founders using Spark2Scale to bring their ideas to life.
                        </p>
                        <Link href="/signup">
                            <Button
                                size="lg"
                                className="bg-[#FFD95D] hover:bg-[#ffe89a] text-[#576238] font-bold text-lg px-12 py-6"
                            >
                                Get Started Free
                            </Button>
                        </Link>
                    </Card>
                </div>
            </main>
        </div>
    );
}
