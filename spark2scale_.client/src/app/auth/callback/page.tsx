"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { handleAuthSuccess } from "@/lib/auth";
import LegoSpinner from "@/components/lego/LegoSpinner";

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

                // Only process signup/magiclink/invite verification (not password reset)
                // If it's a recovery type, redirect to reset password page
                if (type === 'recovery') {
                    router.push(`/reset-password${window.location.hash}`);
                    return;
                }

                // Allow 'signup', 'magiclink', 'invite', 'email_change' etc.
                // We proceed if we have an accessToken.
                if (type !== 'signup' && type !== 'email' && type !== 'magiclink' && type !== 'invite') {
                    console.log(`[AuthCallback] Warning: Unexpected verification type '${type}'. Proceeding as it includes an access token.`);
                }

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
                // Clean API URL: remove trailing slash and /api if present
                let cleanApiUrl = apiUrl.replace(/\/$/, '');
                cleanApiUrl = cleanApiUrl.replace(/\/api$/, '');

                let endpoint = `${cleanApiUrl}/api/Auth/verify-email`;
                let body: any = {
                    AccessToken: accessToken,
                    RefreshToken: refreshToken || '',
                };

                // Determine if this is a Google Sign-In or standard verification
                if (!type && accessToken) {
                    console.log('=== GOOGLE SIGN-IN CALLBACK DETECTED ===');
                    endpoint = `${cleanApiUrl}/api/Auth/google-signin`;
                    body = { AccessToken: accessToken };

                    // If the user came from the signup page, they picked a userType
                    // (founder/investor/contributor) before the OAuth redirect.
                    // Forward it so the backend creates the right profile + role.
                    const signupCtxStr = localStorage.getItem('googleSignupContext');
                    if (signupCtxStr) {
                        try {
                            const ctx = JSON.parse(signupCtxStr) as { userType?: string; tags?: string[] };
                            if (ctx.userType) body.UserType = ctx.userType;
                            if (Array.isArray(ctx.tags) && ctx.tags.length > 0) body.Tags = ctx.tags;
                        } catch (e) {
                            console.error('Failed to parse googleSignupContext:', e);
                        }
                        localStorage.removeItem('googleSignupContext');
                    }
                } else {
                    console.log('=== EMAIL VERIFICATION REQUEST ===');
                    console.log('Type:', type);
                }

                console.log('Full URL:', endpoint);

                // Call backend
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(body),
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
                    let redirectPath: string | undefined;

                    // --- ATOMIC LINK HANDSHAKE ---
                    // --- ATOMIC LINK HANDSHAKE ---
                    // 1. Check for pending post-verification invitation in LocalStorage (Primary)
                    let inviteCtx: { token?: string, startupId?: string } | null = null;
                    const postVerificationInviteStr = localStorage.getItem('postVerificationInvitation');

                    if (postVerificationInviteStr) {
                        try {
                            inviteCtx = JSON.parse(postVerificationInviteStr);
                            console.log('Found post-verification invitation context in LocalStorage:', inviteCtx);
                        } catch (e) {
                            console.error('Failed to parse localStorage invitation:', e);
                        }
                    }

                    // 2. Fallback: Check User Metadata from Supabase (Secondary - for cross-device/tab verification)
                    const userMetadata = (data.user as any)?.user_metadata || {};
                    if (!inviteCtx && userMetadata?.startup_id) {
                        console.log('LocalStorage empty. Falling back to User Metadata for Startup linking.');
                        inviteCtx = {
                            startupId: userMetadata.startup_id as string,
                            token: '' // Token might not be needed if we rely on backend trust, or we can try to find it
                        };
                        // Note: If token is missing, the backend might need to find the invitation by email + startupId
                    }

                    if (inviteCtx?.startupId) {
                        try {
                            // Dynamically import service
                            const { invitationService } = await import('@/services/invitationService');

                            // We need the User ID
                            const userId = data.user?.uid || data.user?.id || (data.user as any)?.UserId;

                            if (userId) {
                                console.log('Attempting to atomically accept invitation for user:', userId);

                                // If we have a token, use the standard respond flow
                                if (inviteCtx.token) {
                                    await invitationService.respond({
                                        token: inviteCtx.token,
                                        accept: true,
                                        userId: userId as string
                                    });
                                } else {
                                    // If we only have startupId (from metadata), we might need a different approach
                                    // OR we assume the Backend's VerifyEmail ALREADY did the linking (which it logic says it does!)
                                    // uniqueness verify: AuthController.cs lines 368-374 DOES link the user if startup_id is in metadata.

                                    console.log('No token available, relying on Backend VerifyEmail linking or previous association.');
                                }

                                console.log('Atomic handshake successful (or assumed by Backend)!');
                                redirectPath = `/contributor/startup/${inviteCtx.startupId}`;

                                // Clear storage just in case
                                localStorage.removeItem('postVerificationInvitation');
                            }
                        } catch (e) {
                            console.error('Failed to process atomic linking:', e);
                        }
                    }
                    // -----------------------------
                    // -----------------------------

                    // Determine correct redirect based on userType from the server response
                    const resolvedUserType = (data.user?.userType || data.user?.user_type || '').toLowerCase();
                    const userEmail = String(data.user?.email || data.user?.Email || '');

                    console.log('[AuthCallback] Resolved userType from server:', resolvedUserType);

                    if (resolvedUserType === 'contributor' && inviteCtx?.startupId) {
                        // Contributor with a linked startup → go directly to startup page
                        redirectPath = `/signin?verified=true&email=${encodeURIComponent(userEmail)}&redirect=/contributor/startup/${inviteCtx.startupId}`;
                    } else if (resolvedUserType === 'contributor') {
                        // Contributor without a startup link yet
                        redirectPath = `/signin?verified=true&email=${encodeURIComponent(userEmail)}&redirect=/contributor/dashboard`;
                    } else if (resolvedUserType === 'investor') {
                        redirectPath = `/signin?verified=true&email=${encodeURIComponent(userEmail)}&redirect=/investor/feed`;
                    } else {
                        // founder or unknown → go to founder dashboard
                        redirectPath = `/signin?verified=true&email=${encodeURIComponent(userEmail)}&redirect=/founder/dashboard`;
                    }

                    await handleAuthSuccess(data.token, router, cleanApiUrl, data.user as any, redirectPath);
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
                    <LegoSpinner className="h-12 w-12 animate-spin text-[#576238] mx-auto" />
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

