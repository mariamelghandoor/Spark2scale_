"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import LegoIllustration from "@/components/lego/LegoIllustration";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";


export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        userType: "founder",
        addressRegion: "",
        tags: [] as string[],
    });
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
        }

        if (!formData.addressRegion && formData.userType !== "investor") {
            errors.addressRegion = "Address/Region is required";
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
            // First, check if backend is reachable
            try {
                const healthCheck = await fetch(`${apiUrl}/swagger`, { method: 'GET', signal: AbortSignal.timeout(3000) });
                if (!healthCheck.ok && healthCheck.status !== 404) {
                    throw new Error(`Backend health check failed with status ${healthCheck.status}`);
                }
            } catch (healthError: unknown) {
                const error = healthError as Error;
                if (error.name === 'AbortError' || error.message?.includes('fetch')) {
                    throw new Error(`Cannot reach backend at ${apiUrl}. Please ensure:\n1. Backend is running\n2. Backend is accessible at ${apiUrl}\n3. No firewall is blocking the connection`);
                }
            }

            // Clean API URL: remove trailing slash and /api if present
            let cleanApiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
            cleanApiUrl = cleanApiUrl.replace(/\/api$/, ''); // Remove /api if at the end
            const url = `${cleanApiUrl}/api/Auth/signup`;

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
            };

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
                            const parsedText = JSON.parse(responseText) as { message?: string; detail?: string; title?: string;[key: string]: unknown };
                            if (parsedText.message) data.message = parsedText.message;
                            if (parsedText.detail) data.detail = parsedText.detail;
                            if (parsedText.title) data.title = parsedText.title as string;
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

    const handleGoogleSignUp = () => {
        console.log("Google Sign-up triggered");
        // Handle Google OAuth logic (to be implemented)
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
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        className={validationErrors.password ? "border-red-500" : ""}
                                    />
                                    {validationErrors.password && (
                                        <p className="text-sm text-red-500">{validationErrors.password}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        Must be at least 8 characters long
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                        className={validationErrors.confirmPassword ? "border-red-500" : ""}
                                    />
                                    {validationErrors.confirmPassword && (
                                        <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
                                    )}
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
                                            Creating Account...
                                        </>
                                    ) : (
                                        'Create Account'
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

                                {/* Google Sign-up Button */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    size="lg"
                                    onClick={handleGoogleSignUp}
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
                                    Sign up with Google
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="flex justify-center">
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
