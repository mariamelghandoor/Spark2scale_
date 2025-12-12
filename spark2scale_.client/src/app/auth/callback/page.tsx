"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VerifyResponse {
    message: string;
    token?: string;
    user?: {
        id: string;
        email: string;
        emailVerified: boolean;
        userType?: string;
        needsProfile?: boolean;
    };
}

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState<{
        type: "loading" | "success" | "error";
        message: string;
    }>({ type: "loading", message: "Verifying your email..." });

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                // Extract tokens from URL hash (Supabase sends them here)
                const hash = window.location.hash.replace("#", "");
                const hashParams = new URLSearchParams(hash);
                const accessToken = hashParams.get("access_token");
                const refreshToken = hashParams.get("refresh_token");

                // Also check query params as fallback
                const queryParams = new URLSearchParams(window.location.search);
                const accessTokenFromQuery = queryParams.get("access_token");
                const refreshTokenFromQuery = queryParams.get("refresh_token");

                const finalAccessToken = accessToken || accessTokenFromQuery;
                const finalRefreshToken = refreshToken || refreshTokenFromQuery;

                if (!finalAccessToken) {
                    setStatus({
                        type: "error",
                        message: "Invalid verification link. Please check your email for a valid link.",
                    });
                    return;
                }

                // Call backend to verify email and get user info
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Auth/verify-email`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        accessToken: finalAccessToken,
                        refreshToken: finalRefreshToken || "",
                    }),
                });

                const data: VerifyResponse = await response.json();

                if (response.ok && data.user) {
                    // Store token and user info
                    if (data.token) {
                        localStorage.setItem("auth_token", data.token);
                    }
                    localStorage.setItem("user", JSON.stringify(data.user));

                    setStatus({
                        type: "success",
                        message: "Email verified successfully! Redirecting to dashboard...",
                    });

                    // Redirect based on user type or needsProfile
                    setTimeout(() => {
                        if (data.user.needsProfile) {
                            // Profile not created yet, redirect to complete profile
                            router.push("/signup?complete=true");
                        } else if (data.user.userType) {
                            router.push(`/${data.user.userType}/dashboard`);
                        } else {
                            router.push("/signin");
                        }
                    }, 2000);
                } else {
                    setStatus({
                        type: "error",
                        message: data.message || "Email verification failed. Please try again.",
                    });
                }
            } catch (error) {
                console.error("Email verification error:", error);
                setStatus({
                    type: "error",
                    message: "An error occurred during email verification. Please try again.",
                });
            }
        };

        verifyEmail();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader>
                    <CardTitle className="text-center text-2xl">Email Verification</CardTitle>
                    <CardDescription className="text-center">
                        Please wait while we verify your email address
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {status.type === "loading" && (
                        <div className="flex flex-col items-center justify-center space-y-4 py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-[#576238]" />
                            <p className="text-sm text-muted-foreground">{status.message}</p>
                        </div>
                    )}

                    {status.type === "success" && (
                        <Alert className="border-green-500 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                {status.message}
                            </AlertDescription>
                        </Alert>
                    )}

                    {status.type === "error" && (
                        <div className="space-y-4">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{status.message}</AlertDescription>
                            </Alert>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/signin")}
                                    className="flex-1"
                                >
                                    Go to Sign In
                                </Button>
                                <Button
                                    onClick={() => router.push("/signup")}
                                    className="flex-1 bg-[#576238] hover:bg-[#6b7c3f]"
                                >
                                    Sign Up Again
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

