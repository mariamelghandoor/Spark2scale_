"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import LegoSpinner from "@/components/lego/LegoSpinner";
export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
            // Clean API URL: remove trailing slash and /api if present
            let cleanApiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
            cleanApiUrl = cleanApiUrl.replace(/\/api$/, ''); // Remove /api if at the end
            const url = `${cleanApiUrl}/api/Auth/forgot-password`;
            
            console.log('=== FORGOT PASSWORD REQUEST ===');
            console.log('Full URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    Email: email.trim().toLowerCase(),
                }),
            });

            console.log('=== FORGOT PASSWORD RESPONSE ===');
            console.log('Status:', response.status, response.statusText);

            // Check if response has content before parsing JSON
            const contentType = response.headers.get('content-type');
            let data: { message?: string; detail?: string; [key: string]: unknown } = {};

            if (contentType && contentType.includes('application/json')) {
                const text = await response.text();
                if (text) {
                    try {
                        data = JSON.parse(text);
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                        throw new Error('Invalid response from server. Please try again.');
                    }
                }
            }

            if (!response.ok) {
                const errorMsg = (typeof data.message === 'string' ? data.message : '') || 
                               (typeof data.detail === 'string' ? data.detail : '') || 
                               `Failed to send reset email (${response.status}).`;
                throw new Error(errorMsg);
            }

            // Show success message (generic to prevent email enumeration)
            setSuccess(true);
        } catch (err: unknown) {
            console.error('Forgot password error:', err);
            const error = err as Error;
            if (error.message?.includes('JSON') || error.message?.includes('fetch') || error.name === 'TypeError') {
                setError('Cannot connect to server. Please ensure the backend is running on http://localhost:5231.');
            } else {
                setError(error.message || 'An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <Card className="shadow-xl border-2">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-4">
                                <div className="flex justify-center">
                                    <Mail className="h-16 w-16 text-[#576238]" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-[#576238] mb-2">
                                        Check Your Email
                                    </h2>
                                    <p className="text-muted-foreground mb-4">
                                        If the email exists, a password reset link has been sent to <strong>{email}</strong>.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Please check your inbox and click the reset link to create a new password.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Link href="/signin" className="flex-1">
                                        <Button variant="outline" className="w-full">
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Back to Sign In
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

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
                                    Forgot Password
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Enter your email address and we'll send you a link to reset your password.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {error && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold"
                                    size="lg"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <LegoSpinner className="mr-2 h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}

