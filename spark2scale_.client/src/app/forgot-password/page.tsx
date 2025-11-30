"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}