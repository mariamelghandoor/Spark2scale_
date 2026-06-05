"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const SECTIONS: { title: string; body: string[] }[] = [
    {
        title: "1. Information We Collect",
        body: [
            "Account information you provide during sign-up, such as your name, email address, phone number, and region.",
            "Profile and role details (founder, investor, or contributor) and any tags or preferences you choose to share.",
            "Content you create or upload on Spark2Scale, including startup data, documents, pitch decks, evaluations, and chat conversations.",
            "Technical data automatically collected during your use of the platform, such as device, browser, and usage events used to keep the service secure and reliable.",
        ],
    },
    {
        title: "2. How We Use Your Information",
        body: [
            "To operate and provide the features of Spark2Scale, including evaluations, recommendations, document generation, and collaboration tools.",
            "To personalize insights and suggestions based on your startup's stage, profile, and activity on the platform.",
            "To continuously improve our services and the underlying models that power them, in an aggregated and privacy-preserving manner.",
            "To communicate important updates, security notices, and product information related to your account.",
        ],
    },
    {
        title: "3. How Your Data Is Stored and Protected",
        body: [
            "Your data is stored on secure, encrypted infrastructure provided by trusted cloud vendors.",
            "Access is restricted using role-based permissions; contributors and investors can only see content explicitly shared with them.",
            "We apply industry-standard safeguards to protect against unauthorized access, disclosure, alteration, or loss of your information.",
        ],
    },
    {
        title: "4. Sharing and Disclosure",
        body: [
            "We do not sell your personal information.",
            "Content you choose to share with investors or contributors is visible only to those parties you authorize within the platform.",
            "We may share information with service providers (such as hosting and email delivery) strictly to operate Spark2Scale, under appropriate confidentiality terms.",
            "We may disclose information if required by law or to protect the rights, safety, and integrity of our users and platform.",
        ],
    },
    {
        title: "5. Your Rights and Choices",
        body: [
            "You can review and update your profile information at any time from your account settings.",
            "You may request export or deletion of your personal data by contacting our support team.",
            "You may withdraw your consent to optional data processing at any time, though this may limit certain features of the platform.",
        ],
    },
    {
        title: "6. Data Retention",
        body: [
            "We retain your information for as long as your account is active or as needed to provide our services.",
            "We may retain limited information after account closure where required for legal, security, or legitimate business purposes.",
        ],
    },
    {
        title: "7. Changes to This Policy",
        body: [
            "We may update this Privacy Policy from time to time. Material changes will be communicated through the platform or by email before they take effect.",
        ],
    },
    {
        title: "8. Contact Us",
        body: [
            "If you have any questions or requests regarding this Privacy Policy, please reach out via our Contact page.",
        ],
    },
];

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-[#576238]">Privacy Policy</h1>
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
                            <ShieldCheck className="h-7 w-7 text-[#576238]" />
                        </div>
                        <h2 className="text-4xl font-bold text-[#576238] mb-2">Privacy Policy</h2>
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
                                    At Spark2Scale, your trust matters. This Privacy Policy explains what
                                    information we collect, how we use it, and the choices you have. By
                                    creating an account or using the platform, you agree to the practices
                                    described below.
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
