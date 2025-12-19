"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

function AcceptInviteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Read the query parameters from the URL (the ?uid=...&sid=... part)
    const uid = searchParams.get("uid");
    const sid = searchParams.get("sid");

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleAccept = async () => {
        if (!uid || !sid) {
            setStatus("error");
            setErrorMessage("Invalid invitation link.");
            return;
        }

        setStatus("loading");

        try {
            const response = await fetch("https://localhost:7155/api/Contributor/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: uid,
                    startupId: sid
                })
            });

            if (response.ok) {
                setStatus("success");
                // Wait 2 seconds then redirect
                setTimeout(() => {
                    // FIX 1: Removed '/dashboard' from the URL to fix the 404
                    // FIX 2: Redirect to Sign In page instead of directly to the startup
                    // We pass the startup URL as a 'callbackUrl' or 'next' param so they go there after login
                    const targetUrl = `/founder/startup/${sid}`;
                    router.push(`/signin?callbackUrl=${encodeURIComponent(targetUrl)}`);

                    // NOTE: Check if your login route is "/signin" or "/auth/signin" and update above
                }, 2000);
            } else {
                const text = await response.text();
                setStatus("error");
                setErrorMessage(text || "Failed to accept invitation.");
            }
        } catch (error) {
            setStatus("error");
            setErrorMessage("Network error. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <Card className="p-8 text-center border-2 border-[#576238]/10 shadow-xl">

                    {status === "idle" && (
                        <>
                            <div className="w-16 h-16 bg-[#576238]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-[#576238]" />
                            </div>
                            <h1 className="text-2xl font-bold text-[#576238] mb-2">You're Invited!</h1>
                            <p className="text-gray-600 mb-6">
                                You have been invited to join a startup workspace as a Contributor.
                            </p>
                            <Button
                                onClick={handleAccept}
                                className="w-full bg-[#576238] hover:bg-[#46502d] text-white h-12 text-lg"
                            >
                                Accept & Join Team
                            </Button>
                        </>
                    )}

                    {status === "loading" && (
                        <div className="py-8">
                            <Loader2 className="w-10 h-10 text-[#576238] animate-spin mx-auto mb-4" />
                            <p className="text-[#576238] font-medium">Joining workspace...</p>
                        </div>
                    )}

                    {status === "success" && (
                        <div className="py-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-green-700 mb-2">Welcome Aboard!</h2>
                            <p className="text-sm text-gray-500">Redirecting you to the dashboard...</p>
                        </div>
                    )}

                    {status === "error" && (
                        <div>
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
                            <p className="text-red-600 mb-6 text-sm">{errorMessage}</p>
                            <Button variant="outline" onClick={() => setStatus("idle")}>
                                Try Again
                            </Button>
                        </div>
                    )}
                </Card>
            </motion.div>
        </div>
    );
}

export default function AcceptInvitePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AcceptInviteContent />
        </Suspense>
    );
}