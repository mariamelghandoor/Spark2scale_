"use client";

<<<<<<< Updated upstream
import { useState } from "react";
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
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SigninPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: "error" | "success" | null; message: string }>({
        type: null,
        message: "",
=======
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

export default function SigninPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
>>>>>>> Stashed changes
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

<<<<<<< Updated upstream
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ type: null, message: "" });

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Auth/signin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Login failed");
            }

            // Store token
            localStorage.setItem("auth_token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // Get full user profile from /me endpoint
            try {
                const meResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/Auth/me`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${data.token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (meResponse.ok) {
                    const meData = await meResponse.json();
                    // Update localStorage with full user data
                    localStorage.setItem("user", JSON.stringify(meData.user));
                    localStorage.setItem("roleData", JSON.stringify(meData.roleData || null));
                }
            } catch (meError) {
                console.error("Failed to fetch full user profile:", meError);
                // Continue with redirect even if /me fails
            }

            setStatus({ type: "success", message: "Login successful! Redirecting..." });

            // Redirect based on user type
            setTimeout(() => {
                const userType = data.user.userType?.toLowerCase() || "";
                if (userType === "founder") {
                    router.push("/founder/dashboard");
                } else if (userType === "investor") {
                    router.push("/investor/feed");
                } else if (userType === "contributor") {
                    router.push("/contributor/dashboard");
                } else {
                    router.push("/signin");
                }
            }, 1000);
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Unexpected error occurred";

            setStatus({
                type: "error",
                message,
            });
        } finally {
            setIsLoading(false);
        }
    };

=======
    // Check if already logged in
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            // Already logged in, redirect to appropriate dashboard
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.user_type === 'founder') {
                        router.push('/founder/dashboard');
                    } else if (user.user_type === 'investor') {
                        router.push('/investor/feed');
                    } else {
                        router.push('/contributor/dashboard');
                    }
                } catch (e) {
                    // Invalid user data, continue with signin
                }
            }
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
            const response = await fetch(`${apiUrl}/api/Auth/signin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Sign in failed. Please check your credentials.');
            }

            // Store token
            localStorage.setItem('auth_token', data.token);

            // Get full user profile
            const meResponse = await fetch(`${apiUrl}/api/Auth/me`, {
                headers: {
                    'Authorization': `Bearer ${data.token}`,
                },
            });

            if (!meResponse.ok) {
                throw new Error('Failed to fetch user profile');
            }

            const meData = await meResponse.json();

            // Store user data
            localStorage.setItem('user', JSON.stringify(meData.user));

            // Redirect based on user type from backend
            const userType = meData.user.user_type;
            if (userType === 'founder') {
                router.push('/founder/dashboard');
            } else if (userType === 'investor') {
                router.push('/investor/feed');
            } else {
                router.push('/contributor/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        console.log("Google Sign-in triggered");
        // Handle Google OAuth logic (to be implemented)
    };

>>>>>>> Stashed changes
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0EADC] via-white to-[#FFD95D]/20">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader>
                    <CardTitle className="text-center text-2xl">Sign In</CardTitle>
                    <CardDescription className="text-center">
                        Enter your credentials to continue
                    </CardDescription>
                </CardHeader>

<<<<<<< Updated upstream
                <CardContent>
                    {status.type && (
                        <Alert variant={status.type === "error" ? "destructive" : "default"} className="mb-4">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            <AlertDescription>{status.message}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label>Email</Label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>Password</Label>
=======
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
>>>>>>> Stashed changes
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-[#576238] hover:text-[#6b7c3f] hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Sign In"}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="justify-center border-t pt-6">
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
        </div>
    );
}
