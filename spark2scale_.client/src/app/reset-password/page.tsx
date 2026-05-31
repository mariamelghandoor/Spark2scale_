"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import LegoSpinner from "@/components/lego/LegoSpinner";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: "",
    });
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        // Extract tokens from URL hash
        if (typeof window !== 'undefined') {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            
            const accessTokenParam = params.get('access_token');
            const refreshTokenParam = params.get('refresh_token');
            const type = params.get('type');

            if (accessTokenParam && type === 'recovery') {
                setAccessToken(accessTokenParam);
                setRefreshToken(refreshTokenParam);
            } else if (!accessTokenParam) {
                // No token in URL - might be direct access
                setError('Invalid or missing reset token. Please request a new password reset link.');
            }
        }
    }, []);

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (formData.newPassword.length < 8) {
            errors.newPassword = "Password must be at least 8 characters long";
        }

        if (formData.newPassword !== formData.confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) {
            return;
        }

        if (!accessToken) {
            setError('Invalid reset token. Please request a new password reset link.');
            return;
        }

        setLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
            // Clean API URL: remove trailing slash and /api if present
            let cleanApiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
            cleanApiUrl = cleanApiUrl.replace(/\/api$/, ''); // Remove /api if at the end
            const url = `${cleanApiUrl}/api/Auth/reset-password`;
            
            console.log('=== RESET PASSWORD REQUEST ===');
            console.log('Full URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    AccessToken: accessToken,
                    RefreshToken: refreshToken || '',
                    NewPassword: formData.newPassword,
                    ConfirmPassword: formData.confirmPassword,
                }),
            });

            console.log('=== RESET PASSWORD RESPONSE ===');
            console.log('Status:', response.status, response.statusText);

            // Check if response has content before parsing JSON
            const contentType = response.headers.get('content-type');
            let data: { message?: string; detail?: string; [key: string]: unknown } = {};

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
                               `Failed to reset password (${response.status}).`;
                throw new Error(errorMsg);
            }

            // Show success message
            setSuccess(true);

            // Auto-redirect to signin after 2.5 seconds
            setTimeout(() => {
                router.push('/signin');
            }, 2500);
        } catch (err: unknown) {
            console.error('Reset password error:', err);
            const error = err as Error;
            if (error.message?.includes('JSON') || error.message?.includes('fetch') || error.name === 'TypeError') {
                setError('Cannot connect to server. Please ensure the backend is running on http://localhost:5231.');
            } else {
                setError(error.message || 'An error occurred while resetting your password. Please try again.');
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
                                        Password Reset Successful! ✅
                                    </h2>
                                    <p className="text-muted-foreground mb-4">
                                        Your password has been successfully reset.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Redirecting to sign in page...
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
            <div className="w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Card className="shadow-xl border-2">
                        <CardHeader className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Link href="/signin">
                                    <Button variant="ghost" size="icon">
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                </Link>
                                <CardTitle className="text-2xl font-bold">
                                    Reset Password
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Enter your new password below
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
                                        className={validationErrors.newPassword ? "border-red-500" : ""}
                                    />
                                    {validationErrors.newPassword && (
                                        <p className="text-sm text-red-500">{validationErrors.newPassword}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        Must be at least 8 characters long
                                    </p>
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
                                    disabled={loading || !accessToken}
                                >
                                    {loading ? (
                                        <>
                                            <LegoSpinner className="mr-2 h-4 w-4 animate-spin" />
                                            Resetting Password...
                                        </>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
