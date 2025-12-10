<<<<<<< HEAD
"use client";
=======
﻿"use client";
>>>>>>> 15be235e6921ec25dbc19e6498440f806b7858c0

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
<<<<<<< HEAD
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import React from 'react';
import { Loader2 } from "lucide-react";

interface ApiResponse {
    message: string;
    email?: string;
}

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<{
        type: 'success' | 'error' | 'info' | null;
        message: string;
    }>({ type: null, message: "" });

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setStatus({
                type: 'error',
                message: "Please enter a valid email address."
            });
            return;
        }

        setIsLoading(true);
        setStatus({ type: null, message: "" });

        try {
            const response = await fetch("/api/Auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: email.toLowerCase().trim() }),
            });

            const data: ApiResponse = await response.json();

            if (response.ok) {
                setStatus({
                    type: 'success',
                    message: data.message || "Password reset instructions sent!"
                });
                // Clear email field on success
                setEmail("");
            } else {
                setStatus({
                    type: 'error',
                    message: data.message || "Failed to send reset instructions. Please try again."
                });
            }
        } catch (error) {
            console.error("Forgot Password API error:", error);
            setStatus({
                type: 'error',
                message: "Network error: Could not connect to the server."
            });
        } finally {
            setIsLoading(false);
        }
=======
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Password reset requested for:", email);

        // TODO: Send password reset email via backend API
        // For now, just show confirmation
        setIsSubmitted(true);
>>>>>>> 15be235e6921ec25dbc19e6498440f806b7858c0
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="w-full max-w-md">
<<<<<<< HEAD
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
=======
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
>>>>>>> 15be235e6921ec25dbc19e6498440f806b7858c0
                    <Card className="shadow-xl border-2">
                        <CardHeader className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Link href="/signin">
                                    <Button variant="ghost" size="icon">
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                </Link>
<<<<<<< HEAD
                                <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
                            </div>
                            <CardDescription>
                                Enter your email address and we'll send you a link to reset your password.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            {/* Status Message */}
                            {status.type && (
                                <Alert
                                    variant={status.type === 'error' ? 'destructive' : 'default'}
                                    className="mb-4"
                                >
                                    {status.type === 'success' && <CheckCircle className="h-4 w-4 mr-2" />}
                                    {status.type === 'error' && <AlertCircle className="h-4 w-4 mr-2" />}
                                    <AlertDescription>
                                        {status.message}
                                    </AlertDescription>
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

                                {/* Additional Instructions */}
                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        <strong>Note:</strong> For security reasons, we'll only send a reset link if the email exists in our system. Check your spam folder if you don't see the email.
                                    </p>
                                </div>
                            </form>
=======
                                <CardTitle className="text-2xl font-bold">
                                    Forgot Password?
                                </CardTitle>
                            </div>
                            <CardDescription>
                                {!isSubmitted
                                    ? "Enter your email address and we'll send you a password reset link"
                                    : "Check your email for the reset link"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!isSubmitted ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="john@example.com"
                                                className="pl-10"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold"
                                        size="lg"
                                    >
                                        Send Reset Link
                                    </Button>

                                    <div className="text-center">
                                        <Link
                                            href="/signin"
                                            className="text-sm text-[#576238] hover:text-[#6b7c3f] hover:underline"
                                        >
                                            Back to Sign In
                                        </Link>
                                    </div>
                                </form>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4 }}
                                    className="space-y-6"
                                >
                                    {/* Success Message */}
                                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-[#FFD95D] rounded-full blur-xl opacity-50 animate-pulse"></div>
                                            <CheckCircle2 className="h-16 w-16 text-[#576238] relative z-10" />
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-[#576238]">
                                                Email Sent! 📧
                                            </h3>
                                            <p className="text-muted-foreground">
                                                A password reset email has been sent to your Gmail:
                                            </p>
                                            <p className="font-semibold text-[#576238]">{email}</p>
                                        </div>

                                        <div className="bg-[#F0EADC] rounded-lg p-4 w-full border-2 border-[#d4cbb8]">
                                            <p className="text-sm text-muted-foreground">
                                                Please check your inbox and click the reset link to create a new password.
                                                The link will expire in 1 hour.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => {
                                                setIsSubmitted(false);
                                                setEmail("");
                                            }}
                                        >
                                            Send Another Email
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
>>>>>>> 15be235e6921ec25dbc19e6498440f806b7858c0
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}