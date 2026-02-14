"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import LegoIllustration from "@/components/lego/LegoIllustration";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { handleAuthSuccess, User, getDashboardRoute, resolveUserType, setCookie } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

export default function SigninPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [redirectTo, setRedirectTo] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Read redirect parameter from URL on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
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
        }
    }, []);

    // Check if already logged in - REMOVED to allow switching accounts
    // useEffect(() => {
    //     const token = localStorage.getItem('auth_token');
    //     if (token) {
    //         const userStr = localStorage.getItem('user');
    //         if (userStr) {
    //             try {
    //                 const user = JSON.parse(userStr);
    //                 const userType = resolveUserType(user);
    //                 if (userType) {
    //                     const route = getDashboardRoute(userType);
    //                     router.push(route);
    //                 }
    //             } catch {
    //                 // Invalid user data, continue with signin
    //             }
    //         }
    //     }
    // }, [router]);

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
                            const parsedText = JSON.parse(responseText) as { message?: string; detail?: string;[key: string]: unknown };
                            if (parsedText.message) data.message = parsedText.message;
                            if (parsedText.detail) data.detail = parsedText.detail;
                        } catch {
                            // If not JSON, use as is
                        }
                    }
                } catch {
                    // Ignore if we can't read response
                }

                const errorMsg = (typeof data.message === 'string' ? data.message : '') ||
                    (typeof data.detail === 'string' ? data.detail : '') ||
                    `Sign in failed (${response.status}). Please check your credentials.`;

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

            // Store token in both localStorage and cookie
            // localStorage.setItem('auth_token', data.token);
            // setCookie('auth_token', data.token, 30); // 30 days expiration

            const user = data.user as User;
            if (!user) {
                throw new Error('Invalid response: missing user data');
            }

            // localStorage.setItem('user', JSON.stringify(user));

            // Use AuthContext login to update state immediately
            login(user, data.token);

            console.log('=== SIGNIN SUCCESS ===');
            console.log('User:', user);
            console.log('Redirect parameter:', redirectTo);

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
                setError(error.message || 'An error occurred during sign in. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        console.log("Google Sign-in triggered");
        // Handle Google OAuth logic
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
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
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
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
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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