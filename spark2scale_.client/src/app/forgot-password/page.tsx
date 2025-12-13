"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import React from "react";

interface ApiResponse {
    message: string;
}

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<{
        type: "success" | "error" | null;
        message: string;
    }>({ type: null, message: "" });

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setStatus({
                type: "error",
                message: "Please enter a valid email address.",
            });
            return;
        }

        setIsLoading(true);
        setStatus({ type: null, message: "" });

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
            const response = await fetch(`${apiUrl}/api/Auth/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: email.toLowerCase().trim() }),
            });

            const data: ApiResponse = await response.json();

            setStatus({
                type: "success",
                message:
                    data.message ||
                    "If an account with that email exists, a password reset link has been sent.",
            });

            setEmail("");
        } catch (error) {
            console.error("Forgot Password API error:", error);
            setStatus({
                type: "error",
                message: "Network error: Could not connect to the server.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Card className="shadow-xl border-2">
                        <CardHeader className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Link href="/signin">
                                    <Button variant="ghost" size="icon">
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                </Link>
                                <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
                            </div>
                            <CardDescription>
                                Enter your email address and we'll send you a link to reset your password.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            {status.type && (
                                <Alert
                                    variant={status.type === "error" ? "destructive" : "default"}
                                    className="mb-4"
                                >
                                    {status.type === "success" && <CheckCircle className="h-4 w-4 mr-2" />}
                                    {status.type === "error" && <AlertCircle className="h-4 w-4 mr-2" />}
                                    <AlertDescription>{status.message}</AlertDescription>
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter the email address associated with your account
                                    </p>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold"
                                    size="lg"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending Reset Link...
                                        </>
                                    ) : (
                                        "Send Reset Link"
                                    )}
                                </Button>

                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        <strong>Note:</strong> For security reasons, we'll only send a reset link if the
                                        email exists in our system. Check your spam folder if you don't see the email.
                                    </p>
                                </div>
                            </form>

                            {status.type === "success" && (
                                <div className="mt-4 text-center">
                                    <Link
                                        href="/signin"
                                        className="text-sm text-[#576238] hover:text-[#6b7c3f] font-semibold underline-offset-4 hover:underline"
                                    >
                                        ← Back to Sign In
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
