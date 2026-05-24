"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import LegoIllustration from "@/components/lego/LegoIllustration";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { handleAuthSuccess, User, getDashboardRoute, resolveUserType, setCookie } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import LegoSpinner from "@/components/lego/LegoSpinner";

function extractCleanErrorMessage(inputMsg: string): string {
    if (!inputMsg) return '';
    const trimmed = inputMsg.trim();
    
    // Check if it is a JSON string
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed.msg) return extractCleanErrorMessage(parsed.msg);
            if (parsed.message) return extractCleanErrorMessage(parsed.message);
            if (parsed.error_description) return extractCleanErrorMessage(parsed.error_description);
            if (parsed.error) return extractCleanErrorMessage(parsed.error);
        } catch {
            // Ignore parse errors
        }
    }
    
    // Sometimes it's a JSON string nested inside a wrapper like: "Request failed (400): {"code":400,...}"
    const jsonMatch = trimmed.match(/\{.*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.msg) return extractCleanErrorMessage(parsed.msg);
            if (parsed.message) return extractCleanErrorMessage(parsed.message);
            if (parsed.error_description) return extractCleanErrorMessage(parsed.error_description);
            if (parsed.error) return extractCleanErrorMessage(parsed.error);
        } catch {
            // Ignore parse errors
        }
    }
    
    return inputMsg;
}

export default function SigninPage() {
    const router = useRouter();
    const { login } = useAuth();

    // Safely create Supabase client
    const supabase = useMemo(() => {
        try {
            if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
                return null;
            }
            return createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                {
                    auth: {
                        lock: async (name, acquireTimeout, fn) => {
                            return await fn();
                        }
                    }
                }
            );
        } catch (error) {
            console.error("Failed to initialize Supabase client:", error);
            return null;
        }
    }, []);

    const [redirectTo, setRedirectTo] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Read redirect parameter and invitation context from URL on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);

            // 1. Handle Redirects
            console.log('Redirect param from URL:', params.get('redirect'));
            console.log('CallbackUrl param from URL:', params.get('callbackUrl'));
            let redirect = params.get('redirect') || params.get('callbackUrl');

            // Fallback to cookie if no URL param
            if (!redirect) {
                const cookies = document.cookie.split(';');
                const redirectCookie = cookies.find(c => c.trim().startsWith('intended_redirect='));
                if (redirectCookie) {
                    redirect = redirectCookie.split('=')[1];
                    // Clear the cookie
                    document.cookie = 'intended_redirect=; path=/; max-age=0';
                }
            }

            if (redirect) {
                console.log('✅ Setting redirect destination:', redirect);
                setRedirectTo(redirect);
            } else {
                console.log('❌ No redirect destination found');
            }

            // 2. Handle Pending Invitation Fallback (Restore from URL if sessionStorage is empty)
            const invitationPending = params.get('invitationPending');
            const token = params.get('token');
            const startupId = params.get('startupId');

            if (invitationPending === 'true' && token && startupId) {
                let storedInviteStr = sessionStorage.getItem('pendingInvitation');
                if (!storedInviteStr) {
                    storedInviteStr = sessionStorage.getItem('postVerificationInvitation');
                }

                if (!storedInviteStr) {
                    console.log('🔄 Restoring pending invitation from URL parameters...');
                    localStorage.setItem('pendingInvitation', JSON.stringify({
                        token: token,
                        startupId: startupId,
                        email: params.get('email') || '',
                        role: 'Contributor' // Default or unknown if not in URL
                    }));
                }
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted. Current redirect state:', redirectTo);
        setLoading(true);
        setError(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
            // Clean API URL: remove trailing slash and /api if present
            let cleanApiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
            cleanApiUrl = cleanApiUrl.replace(/\/api$/, ''); // Remove /api if at the end
            const url = `${cleanApiUrl}/api/Auth/signin`;

            console.log('=== SIGNIN REQUEST ===');
            console.log('API URL:', cleanApiUrl);
            console.log('Full URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    Email: formData.email.trim().toLowerCase(),
                    Password: formData.password,
                }),
            });

            console.log('=== SIGNIN RESPONSE ===');
            console.log('Status:', response.status, response.statusText);
            console.log('URL:', response.url);

            // Check if response has content before parsing JSON
            const contentType = response.headers.get('content-type');
            let data: { token?: string; message?: string; detail?: string;[key: string]: unknown } = {};

            if (contentType && contentType.includes('application/json')) {
                const text = await response.text();
                if (text) {
                    try {
                        data = JSON.parse(text);
                        if (data.errors) {
                            data.message = Object.values(data.errors).flat().join(" ");
                        } else if (data.title && !data.message) {
                            data.message = data.title as string;
                        } else if (data.msg && !data.message) {
                            data.message = data.msg as string;
                        }
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                        throw new Error('Invalid response from server. Please check if the backend is running.');
                    }
                }
            }

            if (!response.ok) {
                let responseText = '';
                try {
                    const clonedResponse = response.clone();
                    responseText = await clonedResponse.text().catch(() => '');
                    if (responseText && !data.message && !data.detail) {
                        try {
                            const parsedText = JSON.parse(responseText) as { message?: string; detail?: string; title?: string; msg?: string; errors?: Record<string, string[]>; [key: string]: unknown };
                            if (parsedText.message) data.message = parsedText.message;
                            if (parsedText.msg) data.message = parsedText.msg;
                            if (parsedText.detail) data.detail = parsedText.detail;
                            if (parsedText.errors) {
                                data.message = Object.values(parsedText.errors).flat().join(" ");
                            } else if (parsedText.title && !data.message) {
                                data.message = parsedText.title;
                            }
                        } catch {
                            // If not JSON, use as is
                        }
                    }
                } catch {
                    // Ignore if we can't read response
                }

                let errorMsg = (typeof data.message === 'string' ? data.message : '') ||
                    (typeof data.detail === 'string' ? data.detail : '') ||
                    `Sign in failed (${response.status}). Please check your credentials.`;

                errorMsg = extractCleanErrorMessage(errorMsg);

                if (response.status === 404) {
                    throw new Error(`404 Not Found\n\nRequested URL: ${url}\n\nThis usually means:\n1. Backend is not running on ${cleanApiUrl}\n2. Endpoint route doesn't match (expected: /api/Auth/signin)\n3. Backend route is different from what frontend expects\n\nTroubleshooting:\n1. Verify backend: Open ${cleanApiUrl}/swagger in browser\n2. Check if POST /api/Auth/signin appears in Swagger\n3. Verify backend is running: Check console for "Now listening on: http://localhost:5231"\n4. Check Network tab in DevTools to see the actual request URL\n5. Rebuild backend: cd Spark2Scale/Spark2scale_/Spark2Scale_.Server && dotnet build\n\nResponse: ${responseText || errorMsg || 'No details available'}`);
                }

                if (response.status === 405) {
                    throw new Error(`405 Method Not Allowed\n\nRequested URL: ${url}\n\nThis usually means:\n1. Backend is not running on ${cleanApiUrl}\n2. CORS preflight (OPTIONS) request is failing\n3. Endpoint route doesn't match (expected: /api/Auth/signin)\n4. Backend middleware is blocking the request\n\nTroubleshooting:\n1. Verify backend: Open ${cleanApiUrl}/swagger in browser\n2. Check DevTools → Network tab for failed OPTIONS request\n3. Verify Program.cs has app.UseCors() before other middleware\n4. Check backend console for errors\n5. Rebuild backend: dotnet build\n\nResponse: ${responseText || errorMsg || 'No details available'}`);
                }

                throw new Error(errorMsg);
            }

            // Store token
            if (!data.token || typeof data.token !== 'string') {
                throw new Error('Invalid response: missing authentication token');
            }

            const user = data.user as User;
            if (!user) {
                throw new Error('Invalid response: missing user data');
            }

            // Use AuthContext login to update state immediately
            login(user, data.token);

            console.log('=== SIGNIN SUCCESS ===');
            console.log('User:', user);
            console.log('Redirect parameter:', redirectTo);

            // Check for pending invitation or post-verification invitation in localStorage (primary) or sessionStorage (fallback)
            let pendingInvitationStr = localStorage.getItem('pendingInvitation') || sessionStorage.getItem('pendingInvitation');
            if (!pendingInvitationStr) {
                pendingInvitationStr = localStorage.getItem('postVerificationInvitation') || sessionStorage.getItem('postVerificationInvitation');
            }

            if (pendingInvitationStr) {
                try {
                    const pendingInvitation = JSON.parse(pendingInvitationStr);
                    console.log('Pending invitation found:', pendingInvitation);

                    // Accept the invitation
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
                    let cleanApiUrl = apiUrl.replace(/\/$/, '');
                    cleanApiUrl = cleanApiUrl.replace(/\/api$/, '');

                    const inviteResponse = await fetch(`${cleanApiUrl}/api/Invitation/respond`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${data.token}`
                        },
                        body: JSON.stringify({
                            token: pendingInvitation.token,
                            accept: true,
                            userId: user.id
                        })
                    });

                    if (inviteResponse.ok) {
                        const inviteData = await inviteResponse.json();
                        console.log('Invitation accepted successfully:', inviteData);

                        // Clear pending invitation
                        localStorage.removeItem('pendingInvitation');
                        localStorage.removeItem('postVerificationInvitation');
                        sessionStorage.removeItem('pendingInvitation');
                        sessionStorage.removeItem('postVerificationInvitation');

                        // Redirect to startup overview page
                        router.push(`/contributor/startup/${pendingInvitation.startupId}`);
                        return;
                    } else {
                        console.error('Failed to accept invitation:', await inviteResponse.text());
                    }
                } catch (inviteError) {
                    console.error('Error processing pending invitation:', inviteError);
                }
            }

            // Redirect to intended destination or default dashboard
            if (redirectTo && redirectTo.startsWith('/')) {
                console.log('Redirecting to specified URL:', redirectTo);
                router.push(redirectTo);
            } else {
                // Use default dashboard based on user type
                const userType = resolveUserType(user);
                const defaultRoute = getDashboardRoute(userType);
                console.log('User type:', userType);
                console.log('Redirecting to default dashboard:', defaultRoute);
                router.push(defaultRoute);
            }
        } catch (err: unknown) {
            console.error('Signin error:', err);
            const error = err as Error;
            if (error.message?.includes('JSON') || error.message?.includes('fetch')) {
                setError('Server connection error. Please check if the backend is running and try again.');
            } else {
                const cleanMsg = extractCleanErrorMessage(error.message);
                setError(cleanMsg || 'An error occurred during sign in. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        console.log("Google Sign-in triggered");

        if (!supabase) {
            setError("Configuration Missing: Supabase credentials are not set in .env.local");
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) throw error;
        } catch (error) {
            console.error("Error signing in with Google:", error);
            setError("Failed to sign in with Google.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 relative overflow-hidden">
            {/* Background 3D-style floating Lego blocks */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Block 1: Forest Green (Top Left) */}
                <motion.div
                    animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                    className="absolute top-[10%] left-[8%] w-24 h-16 opacity-20 lg:opacity-35 hidden sm:block"
                >
                    <div className="w-full h-12 bg-[#576238] rounded-xl shadow-2xl relative border border-white/10">
                        <div className="absolute -top-2 left-3 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-10 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-17 w-4 h-3 bg-[#576238] rounded-t-md shadow-inner" />
                    </div>
                </motion.div>

                {/* Block 2: Golden Yellow (Top Right) */}
                <motion.div
                    animate={{ y: [8, -8, 8], rotate: [4, -4, 4] }}
                    transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
                    className="absolute top-[15%] right-[10%] w-20 h-14 opacity-20 lg:opacity-35 hidden sm:block"
                >
                    <div className="w-full h-10 bg-[#FFD95D] rounded-xl shadow-2xl relative border border-white/10">
                        <div className="absolute -top-2 left-4 w-4 h-3 bg-[#FFD95D] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-12 w-4 h-3 bg-[#FFD95D] rounded-t-md shadow-inner" />
                    </div>
                </motion.div>

                {/* Block 3: Coral Red (Middle Left) */}
                <motion.div
                    animate={{ y: [12, -12, 12], x: [-5, 5, -5] }}
                    transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                    className="absolute top-[50%] left-[5%] w-16 h-12 opacity-15 lg:opacity-25 hidden md:block"
                >
                    <div className="w-full h-8 bg-[#ff6b6b] rounded-xl shadow-2xl relative border border-white/10">
                        <div className="absolute -top-2 left-3 w-3 h-2 bg-[#ff6b6b] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-9 w-3 h-2 bg-[#ff6b6b] rounded-t-md shadow-inner" />
                    </div>
                </motion.div>

                {/* Block 4: Sky Blue (Middle Right) */}
                <motion.div
                    animate={{ y: [-15, 15, -15], rotate: [-6, 6, -6] }}
                    transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}
                    className="absolute top-[55%] right-[8%] w-24 h-16 opacity-15 lg:opacity-25 hidden md:block"
                >
                    <div className="w-full h-12 bg-[#4a90e2] rounded-xl shadow-2xl relative border border-white/10">
                        <div className="absolute -top-2 left-3 w-4 h-3 bg-[#4a90e2] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-10 w-4 h-3 bg-[#4a90e2] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-17 w-4 h-3 bg-[#4a90e2] rounded-t-md shadow-inner" />
                    </div>
                </motion.div>

                {/* Block 5: Sage Green (Bottom Left) */}
                <motion.div
                    animate={{ y: [-8, 8, -8], rotate: [3, -3, 3] }}
                    transition={{ repeat: Infinity, duration: 6.5, ease: "easeInOut" }}
                    className="absolute bottom-[12%] left-[10%] w-20 h-14 opacity-20 lg:opacity-30 hidden sm:block"
                >
                    <div className="w-full h-10 bg-[#8b9456] rounded-xl shadow-2xl relative border border-white/10">
                        <div className="absolute -top-2 left-4 w-4 h-3 bg-[#8b9456] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-12 w-4 h-3 bg-[#8b9456] rounded-t-md shadow-inner" />
                    </div>
                </motion.div>

                {/* Block 6: Orange/Brown (Bottom Right) */}
                <motion.div
                    animate={{ y: [10, -10, 10], x: [3, -3, 3] }}
                    transition={{ repeat: Infinity, duration: 7.5, ease: "easeInOut" }}
                    className="absolute bottom-[10%] right-[12%] w-16 h-12 opacity-20 lg:opacity-30 hidden sm:block"
                >
                    <div className="w-full h-8 bg-[#d4cbb8] rounded-xl shadow-2xl relative border border-white/10">
                        <div className="absolute -top-2 left-3 w-3 h-2 bg-[#d4cbb8] rounded-t-md shadow-inner" />
                        <div className="absolute -top-2 left-9 w-3 h-2 bg-[#d4cbb8] rounded-t-md shadow-inner" />
                    </div>
                </motion.div>
            </div>

            <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center z-10">
                {/* Left side - Illustration */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="hidden md:block"
                >
                    <div className="text-center mb-8">
                        <h2 className="text-4xl font-bold text-[#576238] mb-3">
                            Welcome Back!
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Continue building your success 🎯
                        </p>
                    </div>
                    <LegoIllustration />
                </motion.div>

                {/* Right side - Form */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Card className="shadow-xl border-2">
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-3xl font-bold text-center">
                                Sign In
                            </CardTitle>
                            <CardDescription className="text-center">
                                Enter your credentials to continue
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
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        required
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
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) =>
                                                setFormData({ ...formData, password: e.target.value })
                                            }
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </Button>
                                    </div>
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
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign In'
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

                                {/* Google Sign-in Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    size="lg"
                                    onClick={handleGoogleSignIn}
                                >
                                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
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