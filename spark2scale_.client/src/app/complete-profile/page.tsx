"use client";

import React, { useEffect, useState } from "react";
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
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

type UserType = "founder" | "investor" | "contributor";

interface StoredUser {
    id: string;
    email: string;
    userType?: UserType | null;
    hasProfile?: boolean;
}

export default function CompleteProfilePage() {
    const router = useRouter();

    const [user, setUser] = useState<StoredUser | null>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [addressRegion, setAddressRegion] = useState("");
    const [userType, setUserType] = useState<UserType>("founder");
    const [tagsInput, setTagsInput] = useState("");

    const [status, setStatus] = useState<{
        type: "success" | "error" | "info" | null;
        message: string;
        details?: string;
    }>({ type: null, message: "" });

    const [isLoading, setIsLoading] = useState(false);

    // Load user from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem("user");
            if (!stored) {
                router.push("/signin");
                return;
            }
            const parsed: StoredUser = JSON.parse(stored);
            if (!parsed.id) {
                router.push("/signin");
                return;
            }
            setUser(parsed);
        } catch {
            router.push("/signin");
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!user) {
            setStatus({ type: "error", message: "User not found in session." });
            return;
        }

        if (!firstName.trim()) {
            setStatus({ type: "error", message: "First name is required." });
            return;
        }

        if (!phone.trim()) {
            setStatus({ type: "error", message: "Phone number is required." });
            return;
        }

        setIsLoading(true);
        setStatus({ type: null, message: "" });

        try {
            const tags = tagsInput
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);

            const response = await fetch("/api/Auth/complete-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: user.id,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone: phone.trim(),
                    addressRegion: addressRegion.trim(),
                    userType,
                    tags,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus({
                    type: "success",
                    message: "Profile saved successfully!",
                    details: "Redirecting to your dashboard...",
                });

                // Update local storage user snapshot
                const updatedUser: StoredUser = {
                    ...user,
                    hasProfile: true,
                    userType,
                };
                localStorage.setItem("user", JSON.stringify(updatedUser));

                setTimeout(() => {
                    if (userType === "founder") {
                        router.push("/founder/dashboard");
                    } else if (userType === "investor") {
                        router.push("/investor/dashboard");
                    } else {
                        router.push("/contributor/dashboard");
                    }
                }, 2000);
            } else {
                setStatus({
                    type: "error",
                    message: data.message || "Failed to save profile.",
                    details: data.detail,
                });
            }
        } catch (error) {
            console.error("Complete profile error:", error);
            setStatus({
                type: "error",
                message: "Network error while saving profile.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="w-full max-w-3xl">
                <Card className="shadow-xl border-2">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-3xl font-bold text-center">Complete Your Profile</CardTitle>
                        <CardDescription className="text-center">
                            Just a few more details to personalize your experience
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {status.type && (
                            <Alert
                                variant={
                                    status.type === "error"
                                        ? "destructive"
                                        : status.type === "success"
                                            ? "default"
                                            : "default"
                                }
                                className="mb-4"
                            >
                                {status.type === "success" && <CheckCircle className="h-4 w-4 mr-2" />}
                                {status.type === "error" && <AlertCircle className="h-4 w-4 mr-2" />}
                                <AlertDescription>
                                    <div>
                                        <strong>{status.message}</strong>
                                        {status.details && (
                                            <p className="mt-1 text-sm opacity-90">{status.details}</p>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label className="mb-2 block">I am a:</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        type="button"
                                        variant={userType === "founder" ? "default" : "outline"}
                                        className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                        onClick={() => setUserType("founder")}
                                        disabled={isLoading}
                                    >
                                        🚀 Founder
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={userType === "investor" ? "default" : "outline"}
                                        className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                        onClick={() => setUserType("investor")}
                                        disabled={isLoading}
                                    >
                                        💼 Investor
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={userType === "contributor" ? "default" : "outline"}
                                        className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                        onClick={() => setUserType("contributor")}
                                        disabled={isLoading}
                                    >
                                        👥 Contributor
                                    </Button>
                                </div>
                            </div>

                            {userType === "investor" && (
                                <div className="space-y-2">
                                    <Label htmlFor="tags">Investment Interests (comma-separated)</Label>
                                    <Input
                                        id="tags"
                                        placeholder="Tech, AI, Healthcare, SaaS"
                                        value={tagsInput}
                                        onChange={(e) => setTagsInput(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter your areas of interest separated by commas
                                    </p>
                                </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name *</Label>
                                    <Input
                                        id="firstName"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="addressRegion">Region / Country</Label>
                                <Input
                                    id="addressRegion"
                                    value={addressRegion}
                                    onChange={(e) => setAddressRegion(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-[#576238] hover:bg-[#6b7c3f] text-white font-semibold"
                                size="lg"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving Profile...
                                    </>
                                ) : (
                                    "Save Profile"
                                )}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="flex justify-center">
                        <p className="text-xs text-muted-foreground">
                            You can always edit this information later in your account settings.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
