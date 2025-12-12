"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface SignUpFormData {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    user_type: "founder" | "investor" | "contributor";
    tags?: string[];
}

interface ApiResponse {
    message: string;
    requiresConfirmation?: boolean;
    detail?: string;
}


export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<SignUpFormData>({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        user_type: "founder",
        tags: [],
    });

    const [status, setStatus] = useState<{
        type: "success" | "error" | "info" | null;
        message: string;
        details?: string;
    }>({ type: null, message: "" });

    const [isLoading, setIsLoading] = useState(false);
    const [showInvestorTags, setShowInvestorTags] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleUserTypeChange = (
        type: "founder" | "investor" | "contributor"
    ) => {
        setFormData((prev) => ({ ...prev, user_type: type }));
        setShowInvestorTags(type === "investor");
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tags = e.target.value
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag);
        setFormData((prev) => ({ ...prev, tags }));
    };

    const validateForm = (): string | null => {
        if (!formData.name.trim()) return "Full name is required";
        if (!formData.email.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
            return "Invalid email format";
        if (!formData.phone.trim()) return "Phone number is required";
        if (!formData.phone.replace(/\D/g, "").match(/^[0-9]{10,}$/))
            return "Enter a valid phone number (at least 10 digits)";
        if (!formData.password) return "Password is required";
        if (formData.password.length < 8)
            return "Password must be at least 8 characters";
        if (formData.password !== formData.confirmPassword)
            return "Passwords do not match";
        if (
            formData.user_type === "investor" &&
            (!formData.tags || formData.tags.length === 0)
        ) {
            return "Please enter at least one investment interest tag (comma-separated)";
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            setStatus({
                type: "error",
                message: validationError,
            });
            return;
        }

        setIsLoading(true);
        setStatus({ type: null, message: "" });

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    email: formData.email.toLowerCase().trim(),
                    phone: formData.phone.trim(),
                    password: formData.password,
                    confirmPassword: formData.confirmPassword,

                    // Backend expects "userType" in JSON
                    userType: formData.user_type,

                    // Always send an array
                    tags: formData.tags ?? [],
                }),
            });

            const data: ApiResponse = await response.json().catch(() => ({
                message: "Invalid server response",
            }));

            if (response.ok) {
                if (data.requiresConfirmation) {
                    setStatus({
                        type: "info",
                        message: "Registration successful! ✅",
                        details:
                            "Please check your email to confirm your account before logging in. The confirmation link may take a few minutes to arrive.",
                    });

                    setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        password: "",
                        confirmPassword: "",
                        user_type: "founder",
                        tags: [],
                    });

                    setTimeout(() => {
                        router.push("/signin");
                    }, 8000);
                } else {
                    setStatus({
                        type: "success",
                        message: "Account created successfully! 🎉",
                        details: "You can now sign in to your account.",
                    });

                    setTimeout(() => {
                        router.push("/signin");
                    }, 3000);
                }
            } else {
                setStatus({
                    type: "error",
                    message: data.message || `Registration failed (${response.status})`,
                    details: data.detail,
                });
            }
        } catch (error) {
            console.error("Signup error:", error);
            setStatus({
                type: "error",
                message: "Network Error",
                details:
                    "Could not connect to the server. Please check your internet connection and make sure the backend is running.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="hidden md:block"
                >
                    <div className="text-center mb-8">
                        <h2 className="text-4xl font-bold text-[#576238] mb-3">
                            Build Your Success
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            One block at a time 🧱
                        </p>
                    </div>
                    <div className="mt-8 p-6 bg-white/50 rounded-lg shadow-sm">
                        <h3 className="text-2xl font-semibold text-[#576238] mb-4">
                            Why Join Spark2Scale?
                        </h3>
                        <ul className="space-y-3 text-left">
                            <li className="flex items-start">
                                <span className="mr-2 text-green-600">✓</span>
                                <span>Connect with founders, investors, and contributors</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 text-green-600">✓</span>
                                <span>Gamified startup journey with rewards</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 text-green-600">✓</span>
                                <span>Access to exclusive opportunities</span>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 text-green-600">✓</span>
                                <span>Build your professional network</span>
                            </li>
                        </ul>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Card className="shadow-xl border-2">
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-3xl font-bold text-center">
                                Create Account
                            </CardTitle>
                            <CardDescription className="text-center">
                                Join the gamified startup journey
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            {status.type && (
                                <Alert
                                    variant={
                                        status.type === "error"
                                            ? "destructive"
                                            : status.type === "success"
                                                ? "default"
                                                : "default"
                                    }
                                    className="mb-4"
                                >
                                    {status.type === "success" && (
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                    )}
                                    {status.type === "error" && (
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                    )}
                                    <AlertDescription>
                                        <div>
                                            <strong>{status.message}</strong>
                                            {status.details && (
                                                <p className="mt-1 text-sm opacity-90">
                                                    {status.details}
                                                </p>
                                            )}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label className="mb-2 block">I am a:</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            type="button"
                                            variant={
                                                formData.user_type === "founder" ? "default" : "outline"
                                            }
                                            className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                            onClick={() => handleUserTypeChange("founder")}
                                            disabled={isLoading}
                                        >
                                            🚀 Founder
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                formData.user_type === "investor"
                                                    ? "default"
                                                    : "outline"
                                            }
                                            className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                            onClick={() => handleUserTypeChange("investor")}
                                            disabled={isLoading}
                                        >
                                            💼 Investor
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                formData.user_type === "contributor"
                                                    ? "default"
                                                    : "outline"
                                            }
                                            className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                            onClick={() => handleUserTypeChange("contributor")}
                                            disabled={isLoading}
                                        >
                                            👥 Contributor
                                        </Button>
                                    </div>
                                </div>

                                {showInvestorTags && (
                                    <div className="space-y-2">
                                        <Label htmlFor="tags">
                                            Investment Interests (comma-separated)
                                        </Label>
                                        <Input
                                            id="tags"
                                            placeholder="Tech, AI, Healthcare, SaaS"
                                            onChange={handleTagsChange}
                                            disabled={isLoading}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Enter your areas of interest separated by commas
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number *</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+1 (555) 123-4567"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password *</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Must be at least 8 characters long
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">
                                        Confirm Password *
                                    </Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
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
                                            Creating Account...
                                        </>
                                    ) : (
                                        "Create Account"
                                    )}
                                </Button>

                                <p className="text-xs text-center text-muted-foreground mt-4">
                                    By creating an account, you agree to our{" "}
                                    <Link href="/terms" className="text-[#576238] hover:underline">
                                        Terms of Service
                                    </Link>{" "}
                                    and{" "}
                                    <Link
                                        href="/privacy"
                                        className="text-[#576238] hover:underline"
                                    >
                                        Privacy Policy
                                    </Link>
                                </p>
                            </form>
                        </CardContent>

                        <CardFooter className="flex justify-center border-t pt-6">
                            <p className="text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link
                                    href="/signin"
                                    className="text-[#576238] hover:text-[#6b7c3f] font-semibold underline-offset-4 hover:underline"
                                >
                                    Sign in
                                </Link>
                            </p>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
