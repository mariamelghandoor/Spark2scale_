"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, AlertCircle, Key } from "lucide-react";
import React from 'react';
import { Loader2 } from "lucide-react";

interface ResetPasswordFormData {
    newPassword: string;
    confirmPassword: string;
}

interface ApiResponse {
    message: string;
    email?: string;
    detail?: string;
}

export default function ResetPasswordPage() {
    const [formData, setFormData] = useState<ResetPasswordFormData>({
        newPassword: "",
        confirmPassword: "",
    });

    const [status, setStatus] = useState<{
        type: 'success' | 'error' | 'info' | null;
        message: string;
        details?: string;
    }>({ type: null, message: "" });

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [token, setToken] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        // Check for token in URL hash (Supabase style) or query params
        const urlHash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);

        let accessToken = null;

        // Check hash first (Supabase OAuth style)
        if (urlHash.includes('access_token')) {
            const hashParams = new URLSearchParams(urlHash.substring(1));
            accessToken = hashParams.get('access_token');
            const tokenType = hashParams.get('token_type');

            if (accessToken && tokenType === 'bearer') {
                setToken(accessToken);
                setStatus({
                    type: 'info',
                    message: "Reset token detected",
                    details: "Enter your new password below"
                });
            }
        }
        // Check query parameters
        else if (searchParams.has('token')) {
            accessToken = searchParams.get('token');
            setToken(accessToken);
            setStatus({
                type: 'info',
                message: "Reset token detected",
                details: "Enter your new password below"
            });
        }
        // Extract email from token if possible (for display purposes)
        else if (searchParams.has('email')) {
            setEmail(searchParams.get('email'));
        }

        if (!accessToken) {
            setStatus({
                type: 'error',
                message: "Invalid or missing reset token",
                details: "Please click the link from your email again or request a new reset link."
            });
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const validateForm = (): string | null => {
        if (!formData.newPassword) return "New password is required";
        if (formData.newPassword.length < 8) return "Password must be at least 8 characters";
        if (formData.newPassword !== formData.confirmPassword) return "Passwords do not match";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            setStatus({
                type: 'error',
                message: validationError
            });
            return;
        }

        if (!token) {
            setStatus({
                type: 'error',
                message: "Missing reset token",
                details: "Please click the link from your email again."
            });
            return;
        }

        setIsLoading(true);
        setStatus({ type: null, message: "" });

        try {
            const payload = {
                accessToken: token,
                refreshToken: "", // Extract from URL if available
                newPassword: formData.newPassword,
                confirmPassword: formData.confirmPassword,
            };

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
            const response = await fetch(`${apiUrl}/api/Auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data: ApiResponse = await response.json();

            if (response.ok) {
                setStatus({
                    type: 'success',
                    message: data.message || "Password successfully reset!",
                    details: "Redirecting to login page..."
                });

                // Clear form
                setFormData({
                    newPassword: "",
                    confirmPassword: "",
                });

                // Redirect to signin after 3 seconds
                setTimeout(() => {
                    window.location.href = "/signin";
                }, 3000);
            } else {
                setStatus({
                    type: 'error',
                    message: data.message || "Password reset failed",
                    details: data.detail || "The link may be expired or invalid."
                });
            }
        } catch (error) {
            console.error("Reset password API error:", error);
            setStatus({
                type: 'error',
                message: "Network error",
                details: "Could not connect to the server. Please try again."
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
                                <CardTitle className="text-2xl font-bold">
                                    Reset Password
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Enter your new password below
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Status Message */}
                            {status.type && (
                                <Alert
                                    variant={
                                        status.type === 'error' ? 'destructive' :
                                            status.type === 'success' ? 'default' :
                                                'default'
                                    }
                                    className="mb-4"
                                >
                                    {status.type === 'success' && <CheckCircle className="h-4 w-4 mr-2" />}
                                    {status.type === 'error' && <AlertCircle className="h-4 w-4 mr-2" />}
                                    {status.type === 'info' && <Key className="h-4 w-4 mr-2" />}
                                    <AlertDescription>
                                        <div>
                                            <strong>{status.message}</strong>
                                            {status.details && (
                                                <p className="mt-1 text-sm opacity-90">{status.details}</p>
                                            )}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">New Password *</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        required
                                        disabled={!token || isLoading}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Must be at least 8 characters long
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        disabled={!token || isLoading}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold"
                                    size="lg"
                                    disabled={!token || isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Resetting Password...
                                        </>
                                    ) : (
                                        "Reset Password"
                                    )}
                                </Button>

                                {/* Password Requirements */}
                                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                                    <p className="text-sm font-medium mb-2">Password Requirements:</p>
                                    <ul className="text-xs space-y-1 text-muted-foreground">
                                        <li className={formData.newPassword.length >= 8 ? "text-green-600" : ""}>
                                            {formData.newPassword.length >= 8 ? "✓" : "•"} At least 8 characters
                                        </li>
                                        <li className={/[A-Z]/.test(formData.newPassword) ? "text-green-600" : ""}>
                                            {/[A-Z]/.test(formData.newPassword) ? "✓" : "•"} At least one uppercase letter
                                        </li>
                                        <li className={/\d/.test(formData.newPassword) ? "text-green-600" : ""}>
                                            {/\d/.test(formData.newPassword) ? "✓" : "•"} At least one number
                                        </li>
                                    </ul>
                                </div>

                                {/* Need Help Link */}
                                <div className="text-center mt-4">
                                    <Link
                                        href="/forgot-password"
                                        className="text-sm text-[#576238] hover:text-[#6b7c3f] hover:underline"
                                    >
                                        Need a new reset link?
                                    </Link>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
