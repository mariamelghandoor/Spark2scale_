"use client";

import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const SECTIONS: { title: string; body: string[] }[] = [
    {
        title: "1. Acceptance of Terms",
        body: [
            "By creating an account or using Spark2Scale, you agree to be bound by these Terms of Service and our Privacy Policy.",
            "If you do not agree with any part of these terms, please do not use the platform.",
        ],
    },
    {
        title: "2. Eligibility and Account Responsibility",
        body: [
            "You must be at least 18 years old, or the age of legal majority in your jurisdiction, to use Spark2Scale.",
            "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.",
            "Please notify us immediately of any unauthorized access or security incident affecting your account.",
        ],
    },
    {
        title: "3. Acceptable Use",
        body: [
            "Use Spark2Scale only for lawful purposes and in accordance with these terms.",
            "Do not upload or share content that is illegal, infringing, harmful, deceptive, or violates the rights of others.",
            "Do not attempt to disrupt, reverse-engineer, scrape, or otherwise misuse the platform or its underlying systems.",
            "Respect the privacy and confidentiality of other users, including founders, investors, and contributors you collaborate with.",
        ],
    },
    {
        title: "4. Your Content",
        body: [
            "You retain ownership of the information, documents, and other content you upload to Spark2Scale.",
            "You grant us a limited license to host, process, and display your content as necessary to operate and improve the platform.",
            "You are responsible for ensuring you have the rights to upload and share any content you submit.",
        ],
    },
    {
        title: "5. AI-Generated Insights",
        body: [
            "Spark2Scale uses automated and AI-powered tools to generate evaluations, recommendations, and other insights.",
            "These outputs are provided for guidance only and should not be treated as professional, financial, legal, or investment advice.",
            "You are solely responsible for the business decisions you make based on platform output.",
        ],
    },
    {
        title: "6. Subscriptions and Payments",
        body: [
            "Some features of Spark2Scale may be offered under paid plans. Pricing and feature availability are described on the relevant plan pages.",
            "Charges are billed according to the plan you select, and refunds are governed by the policy in effect at the time of purchase.",
        ],
    },
    {
        title: "7. Termination",
        body: [
            "You may close your account at any time from your account settings or by contacting support.",
            "We may suspend or terminate your account if you violate these terms or if necessary to protect the platform or other users.",
            "Upon termination, certain provisions of these terms will survive as needed for legal or operational reasons.",
        ],
    },
    {
        title: "8. Disclaimers and Limitation of Liability",
        body: [
            "Spark2Scale is provided on an \"as is\" and \"as available\" basis, without warranties of any kind, express or implied.",
            "To the maximum extent permitted by law, Spark2Scale and its team are not liable for indirect, incidental, or consequential damages arising from your use of the platform.",
        ],
    },
    {
        title: "9. Changes to These Terms",
        body: [
            "We may update these Terms of Service from time to time. Material changes will be communicated through the platform or by email before they take effect.",
            "Continued use of the platform after changes take effect constitutes acceptance of the updated terms.",
        ],
    },
    {
        title: "10. Contact",
        body: [
            "Questions about these terms can be sent through our Contact page.",
        ],
    },
];

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-[#576238]">Terms of Service</h1>
                </div>
            </div>

            <main className="container mx-auto px-4 py-10">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-10"
                    >
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#576238]/10 mb-4">
                            <FileText className="h-7 w-7 text-[#576238]" />
                        </div>
                        <h2 className="text-4xl font-bold text-[#576238] mb-2">Terms of Service</h2>
                        <p className="text-sm text-muted-foreground">Last updated: May 30, 2026</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="shadow-lg border-2">
                            <CardContent className="pt-6 space-y-6">
                                <p className="text-sm leading-relaxed text-[#576238]/90">
                                    Welcome to Spark2Scale. These Terms of Service set out the rules and
                                    expectations for using our platform. Please read them carefully — by
                                    creating an account, you confirm that you have read, understood, and
                                    agree to be bound by them.
                                </p>

                                {SECTIONS.map((section) => (
                                    <section key={section.title} className="space-y-2">
                                        <h3 className="text-lg font-semibold text-[#576238]">
                                            {section.title}
                                        </h3>
                                        <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-[#576238]/85">
                                            {section.body.map((line, i) => (
                                                <li key={i}>{line}</li>
                                            ))}
                                        </ul>
                                    </section>
                                ))}

                                <p className="pt-4 text-xs text-muted-foreground italic">
                                    This document is provided for transparency. It does not constitute legal
                                    advice. Please consult a qualified professional for specific concerns.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
