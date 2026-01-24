"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
<<<<<<< Updated upstream
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
=======
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
>>>>>>> Stashed changes
import Link from "next/link";
import { motion } from "framer-motion";
<<<<<<< Updated upstream
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

=======
import { Loader2, CheckCircle2 } from "lucide-react";
>>>>>>> Stashed changes

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<SignUpFormData>({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
<<<<<<< Updated upstream
        user_type: "founder",
        tags: [],
=======
        userType: "founder",
        addressRegion: "",
        tags: [] as string[],
>>>>>>> Stashed changes
    });
    const [currentTag, setCurrentTag] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

<<<<<<< Updated upstream
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
                // Always show email verification message (email confirmation is always required)
                setStatus({
                    type: "info",
                    message: "Registration successful! ✅",
                    details:
                        `Please check your email (${formData.email}) to verify your account. The confirmation link may take a few minutes to arrive.`,
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

                // NO auto-redirect - user stays on page to see the message
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
=======
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

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
            const response = await fetch(`${apiUrl}/api/Auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    email: formData.email.trim().toLowerCase(),
                    phone: formData.phone.trim(),
                    password: formData.password,
                    confirmPassword: formData.confirmPassword,
                    userType: formData.userType,
                    addressRegion: formData.addressRegion || "",
                    tags: formData.userType === "investor" ? formData.tags : [],
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Sign up failed. Please try again.');
            }

            // Show success message
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'An error occurred during sign up. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = () => {
        console.log("Google Sign-up triggered");
        // Handle Google OAuth logic (to be implemented)
>>>>>>> Stashed changes
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
                                    <p className="text-muted-foreground mb-4">
                                        Please check your email ({formData.email}) to verify your account.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Click the verification link in the email to complete your registration.
                                    </p>
                                </div>
                                <Link href="/signin">
                                    <Button className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white">
                                        Go to Sign In
                                    </Button>
                                </Link>
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
<<<<<<< Updated upstream
                            {status.type && (
                                <Alert
                                    variant={
                                        status.type === "error"
                                            ? "destructive"
                                            : status.type === "success"
                                                ? "default"
                                                : "default"
                                    }
                                    className={`mb-4 ${
                                        status.type === "info"
                                            ? "border-green-500 bg-green-50 dark:bg-green-950"
                                            : ""
                                    }`}
                                >
                                    {status.type === "success" && (
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    )}
                                    {status.type === "info" && (
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    )}
                                    {status.type === "error" && (
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                    )}
                                    <AlertDescription
                                        className={
                                            status.type === "info"
                                                ? "text-green-800 dark:text-green-200"
                                                : ""
                                        }
                                    >
                                        <div>
                                            <strong className="text-base">{status.message}</strong>
                                            {status.details && (
                                                <p className="mt-2 text-sm opacity-90">
                                                    {status.details}
                                                </p>
                                            )}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Hide form when success or info message is shown */}
                            {status.type !== "success" && status.type !== "info" && (
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
=======
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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
=======
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className={validationErrors.name ? "border-red-500" : ""}
>>>>>>> Stashed changes
                                    />
                                    {validationErrors.name && (
                                        <p className="text-sm text-red-500">{validationErrors.name}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={formData.email}
<<<<<<< Updated upstream
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
=======
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className={validationErrors.email ? "border-red-500" : ""}
>>>>>>> Stashed changes
                                    />
                                    {validationErrors.email && (
                                        <p className="text-sm text-red-500">{validationErrors.email}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number *</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+1 (555) 123-4567"
                                        value={formData.phone}
<<<<<<< Updated upstream
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
=======
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        required
                                        className={validationErrors.phone ? "border-red-500" : ""}
>>>>>>> Stashed changes
                                    />
                                    {validationErrors.phone && (
                                        <p className="text-sm text-red-500">{validationErrors.phone}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
<<<<<<< Updated upstream
                                    <Label htmlFor="password">Password *</Label>
=======
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
>>>>>>> Stashed changes
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
<<<<<<< Updated upstream
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
                                    />
=======
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        className={validationErrors.password ? "border-red-500" : ""}
                                    />
                                    {validationErrors.password && (
                                        <p className="text-sm text-red-500">{validationErrors.password}</p>
                                    )}
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
=======
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                        className={validationErrors.confirmPassword ? "border-red-500" : ""}
>>>>>>> Stashed changes
                                    />
                                    {validationErrors.confirmPassword && (
                                        <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold"
                                    size="lg"
<<<<<<< Updated upstream
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
=======
                                    disabled={loading}
                                >
                                    {loading ? (
>>>>>>> Stashed changes
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating Account...
                                        </>
                                    ) : (
<<<<<<< Updated upstream
                                        "Create Account"
=======
                                        'Create Account'
>>>>>>> Stashed changes
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
                            )}

                            {/* Show sign in link when form is hidden */}
                            {(status.type === "success" || status.type === "info") && (
                                <div className="text-center mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Already have an account?{" "}
                                        <Link
                                            href="/signin"
                                            className="text-[#576238] hover:text-[#6b7c3f] font-semibold underline-offset-4 hover:underline"
                                        >
                                            Sign in
                                        </Link>
                                    </p>
                                </div>
                            )}
                        </CardContent>

                        {/* Only show footer link when form is visible (not when success/info message is shown) */}
                        {status.type !== "success" && status.type !== "info" && (
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
                        )}
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
