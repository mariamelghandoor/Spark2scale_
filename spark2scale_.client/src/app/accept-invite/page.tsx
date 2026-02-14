"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import apiClient from "@/lib/apiClient";

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
            await apiClient.post("/api/Contributor/accept", {
                userId: uid,
                startupId: sid
            });

            setStatus("success");
            // No auto-redirect. Let user choose action.

        } catch (error: any) {
            const errorData = error.response?.data;
            const errorString = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);

            // Handle specific "Duplicate Key" error (User already a contributor)
            if (errorString.includes("23505") || errorString.includes("already exists")) {
                setStatus("success");
                return;
            }

            setStatus("error");
            setErrorMessage(typeof errorData === 'string' ? errorData : JSON.stringify(errorData) || "Failed to accept invitation.");
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
                        <div className="py-4 space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-green-700 mb-2">Welcome Aboard!</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                You have successfully joined the team.
                            </p>

                            <div className="space-y-3">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                    What would you like to do?
                                </p>
                                <Button
                                    onClick={() => {
                                        const targetUrl = `/founder/startup/${sid}`;
                                        router.push(`/signin?callbackUrl=${encodeURIComponent(targetUrl)}`);
                                    }}
                                    className="w-full bg-[#576238] hover:bg-[#46502d] text-white"
                                >
                                    I have an account (Sign In)
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        // Send to signup with special flag to allow contributor signup and pass startup ID
                                        router.push(`/signup?userType=contributor&inviteAccepted=true&sid=${sid}`);
                                    }}
                                    className="w-full"
                                >
                                    I need an account (Register)
                                </Button>
                            </div>
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