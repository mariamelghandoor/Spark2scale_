"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: "",
    });
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [redirectCountdown, setRedirectCountdown] = useState(5);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validate passwords match
        if (formData.newPassword !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // Validate password strength (at least 8 characters)
        if (formData.newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        console.log("Reset password with token:", token, formData);

        // TODO: Send password reset request to backend API with token
        // For now, just show success
        setIsSubmitted(true);
    };

    // Countdown and redirect after success
    useEffect(() => {
        if (isSubmitted && redirectCountdown > 0) {
            const timer = setTimeout(() => {
                setRedirectCountdown(redirectCountdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (isSubmitted && redirectCountdown === 0) {
            router.push("/signin");
        }
    }, [isSubmitted, redirectCountdown, router]);

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
                                {!isSubmitted && (
                                    <Link href="/signin">
                                        <Button variant="ghost" size="icon">
                                            <ArrowLeft className="h-5 w-5" />
                                        </Button>
                                    </Link>
                                )}
                                <CardTitle className="text-2xl font-bold">
                                    {isSubmitted ? "Password Reset Complete!" : "Reset Password"}
                                </CardTitle>
                            </div>
                            {!isSubmitted && (
                                <CardDescription>
                                    Enter your new password below
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            {!isSubmitted ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Info Banner */}
                                    <div className="bg-[#F0EADC] rounded-lg p-3 border-2 border-[#d4cbb8]">
                                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                                            <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                            Choose a strong password with at least 8 characters
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword">New Password</Label>
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.newPassword}
                                            onChange={(e) =>
                                                setFormData({ ...formData, newPassword: e.target.value })
                                            }
                                            required
                                            minLength={8}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={(e) =>
                                                setFormData({ ...formData, confirmPassword: e.target.value })
                                            }
                                            required
                                            minLength={8}
                                        />
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <p className="text-sm text-red-600">{error}</p>
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold"
                                        size="lg"
                                    >
                                        Save Changes
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
                                                Success! 🎉
                                            </h3>
                                            <p className="text-muted-foreground">
                                                Your password has been reset successfully.
                                            </p>
                                        </div>

                                        <div className="bg-[#F0EADC] rounded-lg p-4 w-full border-2 border-[#d4cbb8]">
                                            <p className="text-sm text-muted-foreground mb-2">
                                                You can now sign in with your new password.
                                            </p>
                                            <p className="text-sm font-semibold text-[#576238]">
                                                Redirecting to sign in page in {redirectCountdown}s...
                                            </p>
                                        </div>
                                    </div>

                                    <Link href="/signin" className="block">
                                        <Button
                                            className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold"
                                            size="lg"
                                        >
                                            Go to Sign In Now
                                        </Button>
                                    </Link>
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}