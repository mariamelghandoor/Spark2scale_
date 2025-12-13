"use client";

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
    });

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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0EADC] via-white to-[#FFD95D]/20">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader>
                    <CardTitle className="text-center text-2xl">Sign In</CardTitle>
                    <CardDescription className="text-center">
                        Enter your credentials to continue
                    </CardDescription>
                </CardHeader>

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
