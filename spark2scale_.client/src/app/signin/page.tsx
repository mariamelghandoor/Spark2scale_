"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import React from 'react';
import { Loader2, AlertCircle } from "lucide-react";

interface SignInFormData {
    email: string;
    password: string;
    userType: 'founder' | 'investor' | 'contributor';
}

interface ApiResponse {
    token?: string;
    refreshToken?: string;
    expiresAt?: string;
    user?: {
        id: string;
        email: string;
        name: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        userType: string;
        avatarUrl?: string;
        createdAt?: string;
    };
    message?: string;
}

export default function SigninPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<SignInFormData>({
        email: "",
        password: "",
        userType: "founder",
    });

    const [status, setStatus] = useState<{
        type: 'success' | 'error' | 'info' | null;
        message: string;
    }>({ type: null, message: "" });

    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleTypeChange = (type: 'founder' | 'investor' | 'contributor') => {
        setFormData({ ...formData, userType: type });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ type: null, message: "" });

        try {
            const response = await fetch("/api/Auth/signin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: formData.email.toLowerCase().trim(),
                    password: formData.password,
                }),
            });

            const data: ApiResponse = await response.json();

            if (response.ok && data.token) {
                setStatus({
                    type: 'success',
                    message: "Login successful! Redirecting..."
                });

                // Store tokens in localStorage (consider using httpOnly cookies in production)
                if (data.token) {
                    localStorage.setItem('auth_token', data.token);
                }
                if (data.refreshToken) {
                    localStorage.setItem('refresh_token', data.refreshToken);
                }
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }

                // Wait a moment to show success message
                setTimeout(() => {
                    // Redirect based on user type from response, not form
                    const userType = data.user?.userType || formData.userType;

                    if (userType === "founder") {
                        router.push("/founder/dashboard");
                    } else if (userType === "investor") {
                        router.push("/investor/dashboard");
                    } else {
                        router.push("/contributor/dashboard");
                    }
                }, 1500);
            } else {
                setStatus({
                    type: 'error',
                    message: data.message || `Login failed (${response.status})`
                });
            }
        } catch (error) {
            console.error("Signin API error:", error);
            setStatus({
                type: 'error',
                message: "Network error: Could not connect to the server."
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = (): void => {
        setStatus({
            type: 'info',
            message: "Google sign-in coming soon!"
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
                {/* Left side - Illustration */}
                <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="hidden md:block">
                    <div className="text-center mb-8">
                        <h2 className="text-4xl font-bold text-[#576238] mb-3">Welcome Back!</h2>
                        <p className="text-lg text-muted-foreground">Continue building your success 🎯</p>
                    </div>
                    <div className="mt-8 p-6 bg-white/50 rounded-lg shadow-sm">
                        <h3 className="text-2xl font-semibold text-[#576238] mb-4">
                            Start Building Today
                        </h3>
                        <ul className="space-y-3 text-left">
                            <li className="flex items-start">
                                <span className="mr-2 text-blue-600">→</span>
                                <span>Access your personalized dashboard</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 text-blue-600">→</span>
                                <span>Connect with your network</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 text-blue-600">→</span>
                                <span>Track your progress and achievements</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 text-blue-600">→</span>
                                <span>Discover new opportunities</span>
                            </li>
                        </ul>
                    </div>
                </motion.div>

                {/* Right side - Form */}
                <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                    <Card className="shadow-xl border-2">
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-3xl font-bold text-center">Sign In</CardTitle>
                            <CardDescription className="text-center">Enter your credentials to continue</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Status Message */}
                            {status.type && (
                                <Alert
                                    variant={status.type === 'error' ? 'destructive' : 'default'}
                                    className="mb-4"
                                >
                                    {status.type === 'error' && <AlertCircle className="h-4 w-4 mr-2" />}
                                    <AlertDescription>
                                        {status.message}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* User Type Selection - Optional for signin */}
                                <div>
                                    <Label className="mb-2 block">I am a:</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            type="button"
                                            variant={formData.userType === "founder" ? "default" : "outline"}
                                            className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                            onClick={() => handleTypeChange("founder")}
                                            disabled={isLoading}
                                        >
                                            🚀 Founder
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={formData.userType === "investor" ? "default" : "outline"}
                                            className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                            onClick={() => handleTypeChange("investor")}
                                            disabled={isLoading}
                                        >
                                            💼 Investor
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={formData.userType === "contributor" ? "default" : "outline"}
                                            className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                            onClick={() => handleTypeChange("contributor")}
                                            disabled={isLoading}
                                        >
                                            👥 Contributor
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Password</Label>
                                        <Link
                                            href="/forgot-password"
                                            className="text-sm text-[#576238] hover:text-[#6b7c3f] hover:underline"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        disabled={isLoading}
                                    />
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
                                            Signing In...
                                        </>
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>

                                {/* Divider */}
                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-muted-foreground">
                                            Or continue with
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    size="lg"
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoading}
                                >
                                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Sign in with Google
                                </Button>
                            </form>
                        </CardContent>

                        <CardFooter className="flex justify-center">
                            <p className="text-sm text-muted-foreground">
                                Don't have an account?{" "}
                                <Link
                                    href="/signup"
                                    className="text-[#576238] hover:text-[#6b7c3f] font-semibold underline-offset-4 hover:underline"
                                >
                                    Sign up
                                </Link>
                            </p>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}