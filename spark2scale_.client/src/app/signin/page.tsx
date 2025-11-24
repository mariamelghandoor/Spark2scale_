"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import LegoIllustration from "@/components/lego/LegoIllustration";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function SigninPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        userType: "founder",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle signin logic
        console.log("Signin:", formData);

        // Redirect based on user type
        if (formData.userType === "founder") {
            router.push("/founder/dashboard");
        } else {
            router.push("/investor/feed");
        }
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
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* User Type Selection */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        type="button"
                                        variant={formData.userType === "founder" ? "default" : "outline"}
                                        className="w-full"
                                        onClick={() => setFormData({ ...formData, userType: "founder" })}
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
                                </div>

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
                                >
                                    Sign In
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
