"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { handleAuthSuccess } from "@/lib/auth";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleVerification = async () => {
            try {
                // Extract tokens from URL hash (Supabase sends tokens in hash, not query params)
                if (typeof window === 'undefined') return;

                const hash = window.location.hash.substring(1); // Remove #
                const params = new URLSearchParams(hash);

                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const type = params.get('type'); // 'signup' or 'recovery'

                if (!accessToken) {
                    throw new Error('Missing verification token. Please check your email link.');
                }

                // Only process signup verification (not password reset)
                if (type !== 'signup' && type !== 'email') {
                    // If it's a recovery type, redirect to reset password page
                    if (type === 'recovery') {
                        router.push(`/reset-password${window.location.hash}`);
                        return;
                    }
                    throw new Error('Invalid verification type. Please use the signup verification link.');
                }

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
                // Clean API URL: remove trailing slash and /api if present
                let cleanApiUrl = apiUrl.replace(/\/$/, '');
                cleanApiUrl = cleanApiUrl.replace(/\/api$/, '');

                console.log('=== EMAIL VERIFICATION REQUEST ===');
                console.log('Full URL:', `${cleanApiUrl}/api/Auth/verify-email`);

                // Call backend to verify email and create user profile
                const response = await fetch(`${cleanApiUrl}/api/Auth/verify-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        AccessToken: accessToken,
                        RefreshToken: refreshToken || '',
                    }),
                });

                console.log('=== EMAIL VERIFICATION RESPONSE ===');
                console.log('Status:', response.status, response.statusText);

                // Check if response has content before parsing JSON
                const contentType = response.headers.get('content-type');
                let data: {
                    message?: string;
                    detail?: string;
                    token?: string;
                    user?: {
                        userType?: string;
                        user_type?: string;
                        [key: string]: unknown;
                    };
                    [key: string]: unknown;
                } = {};

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
                        `Email verification failed (${response.status}).`;
                    throw new Error(errorMsg);
                }

                // Store token and handle auth success
                if (data.token && typeof data.token === 'string') {
                    // Pass the user object directly to avoid calling /me endpoint which might fail with 401
                    await handleAuthSuccess(data.token, router, cleanApiUrl, data.user);
                } else {
                    throw new Error('Missing authentication token. Please try again.');
                }
            } catch (err: unknown) {
                console.error('Email verification error:', err);
                const error = err as Error;

                if (error.message?.includes('JSON') || error.message?.includes('fetch') || error.name === 'TypeError') {
                    setError('Cannot connect to server. Please ensure the backend is running and try again.');
                } else {
                    setError(error.message || 'An error occurred during email verification. Please try again.');
                }
                setLoading(false);
            }
        };

        handleVerification();
    }, [router]);

    if (loading && !error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-[#576238] mx-auto" />
                    <p className="text-lg font-semibold text-[#576238]">Verifying your email...</p>
                    <p className="text-sm text-muted-foreground">Please wait while we confirm your account.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
                <div className="w-full max-w-md">
                    <Alert variant="destructive">
                        <AlertDescription className="space-y-4">
                            <p className="font-semibold">Email Verification Failed</p>
                            <p>{error}</p>
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => router.push('/signin')}
                                    className="text-sm underline hover:no-underline"
                                >
                                    Go to Sign In
                                </button>
                                <span className="text-muted-foreground">|</span>
                                <button
                                    onClick={() => router.push('/signup')}
                                    className="text-sm underline hover:no-underline"
                                >
                                    Sign Up Again
                                </button>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    return null;
}

