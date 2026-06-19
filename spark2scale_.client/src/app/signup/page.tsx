"use client";

import { useState, Suspense, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import LegoIllustration from "@/components/lego/LegoIllustration";
import { motion } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import LegoSpinner from "@/components/lego/LegoSpinner";

function SignupContent() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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


    // ... (rest of render logic for password inputs is updated in separate block)



    const router = useRouter();
    const searchParams = useSearchParams();
    const sid = searchParams.get('sid');
    const emailParam = searchParams.get('email');
    const typeParam = searchParams.get('type');
    const inviteAccepted = searchParams.get('inviteAccepted') === 'true';

    const [formData, setFormData] = useState({
        name: "",
        email: emailParam || "",
        phone: "",
        password: "",
        confirmPassword: "",
        userType: typeParam || "founder",
        addressRegion: "",
        tags: [] as string[],
        dataConsent: false,
    });

    // Sync from query params if they change (e.g. initial load)
    useEffect(() => {
        if (emailParam || typeParam) {
            setFormData(prev => ({
                ...prev,
                email: emailParam || prev.email,
                userType: typeParam || prev.userType
            }));
        }
    }, [emailParam, typeParam]);

    // ... (rest of code)

    // Backend expects PascalCase properties (Name, Email, UserType, AddressRegion, etc.)
    const requestBody = {
        Name: formData.name.trim(),
        Email: formData.email.trim().toLowerCase(),
        Phone: formData.phone.trim(),
        Password: formData.password,
        ConfirmPassword: formData.confirmPassword,
        UserType: formData.userType,
        AddressRegion: formData.addressRegion || "",
        Tags: formData.userType === "investor" ? formData.tags : [],
        StartupId: formData.userType === "contributor" && sid ? sid : null,
    };
    const [currentTag, setCurrentTag] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Check if already logged in - REMOVED to allow creating new accounts
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
    //                 // Invalid user data, continue with signup
    //             }
    //         }
    //     }
    // }, [router]);

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }

        if (formData.password.length < 8) {
            errors.password = "Password must be at least 8 characters long";
        }

        if (!formData.name.trim()) {
            errors.name = "Name is required";
        }

        if (!formData.email.trim()) {
            errors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = "Please enter a valid email address";
        }

        if (!formData.phone.trim()) {
            errors.phone = "Phone number is required";
        } else {
            const validCharsRegex = /^[+]?[0-9\s\-()]+$/;
            if (!validCharsRegex.test(formData.phone)) {
                errors.phone = "Phone number can only contain numbers, spaces, hyphens, parentheses, and a leading +";
            } else {
                const digits = formData.phone.replace(/\D/g, "");
                if (digits.length < 7) {
                    errors.phone = "Phone number must contain at least 7 digits";
                } else if (digits.length > 15) {
                    errors.phone = "Phone number cannot exceed 15 digits";
                }
            }
        }

        if (!formData.addressRegion && formData.userType !== "investor") {
            errors.addressRegion = "Address/Region is required";
        }

        if (!formData.dataConsent) {
            errors.dataConsent = "You must consent to data processing to create an account";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddTag = () => {
        if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
            setFormData({
                ...formData,
                tags: [...formData.tags, currentTag.trim()],
            });
            setCurrentTag("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter((tag) => tag !== tagToRemove),
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        let response: Response | null = null;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';

        try {
            // Clean API URL: remove trailing slash and /api if present
            let cleanApiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
            cleanApiUrl = cleanApiUrl.replace(/\/api$/, ''); // Remove /api if at the end
            const url = `${cleanApiUrl}/api/Auth/signup`;

            // Backend expects PascalCase properties (Name, Email, UserType, AddressRegion, etc.)
            const requestBody = {
                Name: formData.name,
                Email: formData.email,
                Phone: formData.phone,
                Password: formData.password,
                ConfirmPassword: formData.confirmPassword,
                AddressRegion: formData.addressRegion,
                UserType: formData.userType,
                Tags: formData.tags,
                StartupId: formData.userType === "contributor" && sid ? sid : null,
                RedirectUrl: window.location.origin + '/auth/callback'
            };

            console.log("--- SIGNUP REQUEST ---");
            console.log("User Type:", formData.userType);
            console.log("Invite Accepted:", inviteAccepted);
            console.log("SID from URL:", sid);
            console.log("Request Body:", requestBody);


            console.log('=== SIGNUP REQUEST ===');
            console.log('API URL:', cleanApiUrl);
            console.log('Full URL:', url);
            console.log('Request body (passwords hidden):', { ...requestBody, Password: '***', ConfirmPassword: '***' });

            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody),
            });

            console.log('=== SIGNUP RESPONSE ===');
            console.log('Status:', response.status, response.statusText);
            console.log('URL:', response.url);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            // Check if response has content before parsing JSON
            const contentType = response.headers.get('content-type');
            let data: { message?: string; detail?: string;[key: string]: unknown } = {};

            if (contentType && contentType.includes('application/json')) {
                const text = await response.text();
                if (text) {
                    try {
                        data = JSON.parse(text);
                        if (data.errors) {
                            data.message = Object.values(data.errors).flat().join(" ");
                        } else if (data.title && !data.message) {
                            data.message = data.title as string;
                        }
                    } catch (parseError) {
                        console.error('JSON parse error:', parseError);
                        throw new Error('Invalid response from server. Please try again.');
                    }
                }
            }

            if (!response.ok) {
                // Try to get more detailed error information
                let responseText = '';
                try {
                    const clonedResponse = response.clone();
                    responseText = await clonedResponse.text().catch(() => '');
                    if (responseText && !data.message && !data.detail) {
                        try {
                            const parsedText = JSON.parse(responseText) as { message?: string; detail?: string; title?: string; errors?: Record<string, string[]>; [key: string]: unknown };
                            if (parsedText.message) data.message = parsedText.message;
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

                const errorMsg = (typeof data.message === 'string' ? data.message : '') ||
                    (typeof data.detail === 'string' ? data.detail : '') ||
                    (typeof data.title === 'string' ? data.title : '') ||
                    `Sign up failed (${response.status}).`;

                if (response.status === 404) {
                    throw new Error(`404 Not Found\n\nRequested URL: ${url}\n\nThis usually means:\n1. Backend is not running on ${cleanApiUrl}\n2. Endpoint route doesn't match (expected: /api/Auth/signup)\n3. Backend route is different from what frontend expects\n\nTroubleshooting:\n1. Verify backend: Open ${cleanApiUrl}/swagger in browser\n2. Check if POST /api/Auth/signup appears in Swagger\n3. Verify backend is running: Check console for "Now listening on: http://localhost:5231"\n4. Check Network tab in DevTools to see the actual request URL\n5. Rebuild backend: cd Spark2Scale/Spark2scale_/Spark2Scale_.Server && dotnet build\n\nResponse: ${responseText || errorMsg || 'No details available'}`);
                }

                if (response.status === 405) {
                    throw new Error(`405 Method Not Allowed\n\nRequested URL: ${url}\n\nThis usually means:\n1. Backend is not running on ${cleanApiUrl}\n2. CORS preflight (OPTIONS) request is failing\n3. Endpoint route doesn't match (expected: /api/Auth/signup)\n4. Backend middleware is blocking the request\n\nTroubleshooting:\n1. Verify backend: Open ${cleanApiUrl}/swagger in browser\n2. Check DevTools → Network tab for failed OPTIONS request\n3. Verify Program.cs has app.UseCors() before other middleware\n4. Check backend console for errors\n5. Rebuild backend: dotnet build\n\nResponse: ${responseText || errorMsg || 'No details available'}`);
                }

                // Show the actual backend error message
                throw new Error(errorMsg);
            }

            // Show success message
            setSuccess(true);
        } catch (err: unknown) {
            console.error('Signup error:', err);
            const error = err as Error;

            // Handle different types of errors
            if (error.message?.includes('JSON') || error.message?.includes('fetch') || error.name === 'TypeError') {
                setError('Cannot connect to server. Please ensure the backend is running on http://localhost:5231. Check the browser console for details.');
            } else if (error.message?.includes('405') || (response !== null && response.status === 405)) {
                // Error message already contains detailed troubleshooting
                setError(error.message);
            } else if (error.message?.includes('CORS') || error.message?.includes('cors')) {
                setError('CORS error: The backend is not allowing requests from this origin. Please check CORS configuration in the backend.');
            } else {
                setError(error.message || 'An error occurred during sign up. Please try again.');
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
                                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-[#576238] mb-2">
                                        Registration Successful! ✅
                                    </h2>
                                    <div className="bg-[#FFD95D]/20 border-2 border-[#FFD95D] rounded-lg p-4 mb-4">
                                        <p className="font-semibold text-[#576238] mb-2">
                                            📧 Check Your Email!
                                        </p>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            We've sent a verification link to:
                                        </p>
                                        <p className="text-sm font-semibold text-[#576238] mb-3">
                                            {formData.email}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Click the verification link in the email to activate your account and access your dashboard automatically.
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm font-medium text-[#576238]">
                                            Once verified, you will be redirected to your dashboard.
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            You can close this tab.
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Didn't receive the email? Check your spam folder or try signing up again.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

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
                            Build Your Success
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            One block at a time 🧱
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
                                Create Account
                            </CardTitle>
                            <CardDescription className="text-center">
                                Join the gamified startup journey
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {error && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* User Type Selection */}
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        type="button"
                                        variant={formData.userType === "founder" ? "default" : "outline"}
                                        className="w-full"
                                        onClick={() => setFormData({ ...formData, userType: "founder", tags: [] })}
                                    >
                                        🚀 Founder
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={formData.userType === "investor" ? "default" : "outline"}
                                        className="w-full"
                                        onClick={() => setFormData({ ...formData, userType: "investor" })}
                                    >
                                        💼 Investor
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={formData.userType === "contributor" ? "default" : "outline"}
                                        className="w-full"
                                        onClick={() => setFormData({ ...formData, userType: "contributor", tags: [] })}
                                    >
                                        👥 Contributor
                                    </Button>
                                </div>

                                {formData.userType === "contributor" && !inviteAccepted ? (
                                    <div className="text-center py-8 space-y-4">
                                        <div className="bg-[#576238]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#576238]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-[#576238]">Invitation Only</h3>
                                            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                                                Contributor accounts are tied to specific startups and must be invited by a Founder.
                                            </p>
                                            <div className="bg-[#576238]/5 rounded-lg p-4 mt-4 text-left">
                                                <p className="text-sm font-semibold text-[#576238] mb-1">Has a Founder invited you?</p>
                                                <p className="text-sm text-gray-600">
                                                    Check your email for an invitation link. Clicking that link will allow you to create your Contributor account here.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setFormData({ ...formData, userType: "founder" })}
                                            >
                                                Sign up as Founder instead
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                placeholder="John Doe"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                className={validationErrors.name ? "border-red-500" : ""}
                                            />
                                            {validationErrors.name && (
                                                <p className="text-sm text-red-500">{validationErrors.name}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="john@example.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                                className={validationErrors.email ? "border-red-500" : ""}
                                            />
                                            {validationErrors.email && (
                                                <p className="text-sm text-red-500">{validationErrors.email}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                placeholder="+1 (555) 123-4567"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                required
                                                className={validationErrors.phone ? "border-red-500" : ""}
                                            />
                                            {validationErrors.phone && (
                                                <p className="text-sm text-red-500">{validationErrors.phone}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="addressRegion">Address/Region</Label>
                                            <Select
                                                value={formData.addressRegion}
                                                onValueChange={(value) => setFormData({ ...formData, addressRegion: value })}
                                            >
                                                <SelectTrigger id="addressRegion" className={validationErrors.addressRegion ? "border-red-500" : ""}>
                                                    <SelectValue placeholder="Select region" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="north-america">North America</SelectItem>
                                                    <SelectItem value="europe">Europe</SelectItem>
                                                    <SelectItem value="asia">Asia</SelectItem>
                                                    <SelectItem value="africa">Africa</SelectItem>
                                                    <SelectItem value="south-america">South America</SelectItem>
                                                    <SelectItem value="oceania">Oceania</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {validationErrors.addressRegion && (
                                                <p className="text-sm text-red-500">{validationErrors.addressRegion}</p>
                                            )}
                                        </div>

                                        {formData.userType === "investor" && (
                                            <div className="space-y-2">
                                                <Label htmlFor="tags">Investment Tags (Optional)</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="tags"
                                                        placeholder="e.g., Technology, Healthcare"
                                                        value={currentTag}
                                                        onChange={(e) => setCurrentTag(e.target.value)}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddTag();
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        onClick={handleAddTag}
                                                        variant="outline"
                                                    >
                                                        Add
                                                    </Button>
                                                </div>
                                                {formData.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {formData.tags.map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="inline-flex items-center gap-1 px-2 py-1 bg-[#F0EADC] text-[#576238] rounded-md text-sm"
                                                            >
                                                                {tag}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveTag(tag)}
                                                                    className="hover:text-red-500"
                                                                >
                                                                    ×
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <div className="relative">
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    required
                                                    className={validationErrors.password ? "border-red-500 pr-10" : "pr-10"}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
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
                                            {validationErrors.password && (
                                                <p className="text-sm text-red-500">{validationErrors.password}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                Must be at least 8 characters long
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                                            <div className="relative">
                                                <Input
                                                    id="confirmPassword"
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={formData.confirmPassword}
                                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                    required
                                                    className={validationErrors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </Button>
                                            </div>
                                            {validationErrors.confirmPassword && (
                                                <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
                                            )}
                                        </div>

                                        <div
                                            className={`rounded-xl border p-4 transition-colors ${
                                                validationErrors.dataConsent
                                                    ? "border-red-300 bg-red-50/50"
                                                    : "border-[#576238]/20 bg-[#F0EADC]/30"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Checkbox
                                                    id="dataConsent"
                                                    checked={formData.dataConsent}
                                                    onCheckedChange={(checked) => {
                                                        setFormData({ ...formData, dataConsent: checked === true });
                                                        if (checked === true && validationErrors.dataConsent) {
                                                            setValidationErrors((prev) => {
                                                                const next = { ...prev };
                                                                delete next.dataConsent;
                                                                return next;
                                                            });
                                                        }
                                                    }}
                                                    className="mt-1"
                                                    aria-invalid={!!validationErrors.dataConsent}
                                                    required
                                                />
                                                <div className="flex-1 space-y-1.5">
                                                    <Label
                                                        htmlFor="dataConsent"
                                                        className="flex items-center gap-1.5 text-sm font-semibold text-[#576238] cursor-pointer"
                                                    >
                                                        <ShieldCheck className="h-4 w-4" />
                                                        Data processing consent
                                                    </Label>
                                                    <p className="text-xs leading-relaxed text-[#576238]/80">
                                                        I agree that Spark2Scale may securely store and process the
                                                        information I provide and the content I create on the platform
                                                        in order to deliver its features, generate personalized insights,
                                                        and improve its services. I have read and accept the{" "}
                                                        <Link
                                                            href="/privacy"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-semibold text-[#576238] underline underline-offset-2 hover:text-[#6b7c3f]"
                                                        >
                                                            Privacy Policy
                                                        </Link>{" "}
                                                        and{" "}
                                                        <Link
                                                            href="/terms"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-semibold text-[#576238] underline underline-offset-2 hover:text-[#6b7c3f]"
                                                        >
                                                            Terms of Service
                                                        </Link>
                                                        .
                                                    </p>
                                                    {validationErrors.dataConsent && (
                                                        <p className="text-xs font-medium text-red-600">
                                                            {validationErrors.dataConsent}
                                                        </p>
                                                    )}
                                                </div>
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
                                                    Creating Account...
                                                </>
                                            ) : (
                                                'Create Account'
                                            )}
                                        </Button>


                                    </>
                                )}
                            </form>
                        </CardContent>
                        <CardFooter className="flex justify-center">
                            <p className="text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link
                                    href={sid
                                        ? `/signin?redirect=${encodeURIComponent(`/invite/${searchParams.get('token') || ''}`)}`
                                        : "/signin"
                                    }
                                    className="text-[#576238] hover:text-[#6b7c3f] font-semibold underline-offset-4 hover:underline"
                                >
                                    Sign in
                                </Link>
                            </p>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        </div >
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
                <LegoSpinner className="h-8 w-8 animate-spin text-[#576238]" />
            </div>
        }>
            <SignupContent />
        </Suspense>
    );
}
