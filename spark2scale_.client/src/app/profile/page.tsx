"use client";

import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, Trash2, Camera } from "lucide-react";
// Link import removed since we are using router.back()
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { userService } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import LegoSpinner from "@/components/lego/LegoSpinner";

interface ProfileData {
    fname: string;
    lname: string;
    email: string;
    phoneNumber: string;
    addressRegion: string;
    avatarUrl?: string;
}

export default function ProfilePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const [profile, setProfile] = useState<ProfileData>({
        fname: "",
        lname: "",
        email: "",
        phoneNumber: "",
        addressRegion: "",
        avatarUrl: ""
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 2. Fetch Profile using Service
    useEffect(() => {
        if (!user?.id) return;

        const fetchProfile = async () => {
            try {
                // Call Service with Dynamic ID
                const data = await userService.getProfile(user.id);

                setProfile({
                    fname: data.user.fname || user.fname || "",
                    lname: data.user.lname || user.lname || "",
                    email: data.user.email || user.email || "",
                    phoneNumber: data.user.phone_number || "",
                    addressRegion: data.user.address_region || "",
                    avatarUrl: data.avatarUrl || ""
                });
            } catch (error) {
                console.error("Error loading profile:", error);
            }
        };

        fetchProfile();
    }, [user]);

    const handleChange = (field: keyof ProfileData) => {
        return (e: ChangeEvent<HTMLInputElement>) => {
            setProfile({ ...profile, [field]: e.target.value });
        };
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!profile.phoneNumber.trim()) {
            setStatusMessage("Error: Phone number is required.");
            return;
        }

        const validCharsRegex = /^[+]?[0-9\s\-()]+$/;
        if (!validCharsRegex.test(profile.phoneNumber)) {
            setStatusMessage("Error: Phone number can only contain numbers, spaces, hyphens, parentheses, and a leading +");
            return;
        }

        const digits = profile.phoneNumber.replace(/\D/g, "");
        if (digits.length < 7) {
            setStatusMessage("Error: Phone number must contain at least 7 digits.");
            return;
        }

        if (digits.length > 15) {
            setStatusMessage("Error: Phone number cannot exceed 15 digits.");
            return;
        }

        setIsLoading(true);
        setStatusMessage(null);

        try {
            const formData = new FormData();
            formData.append("Fname", profile.fname);
            formData.append("Lname", profile.lname);
            formData.append("PhoneNumber", profile.phoneNumber);
            formData.append("AddressRegion", profile.addressRegion);

            if (selectedFile) {
                formData.append("Photo", selectedFile);
            }

            // Call Service with Dynamic ID
            if (user?.id) {
                const result = await userService.updateProfile(user.id, formData);

                setStatusMessage("Profile updated successfully!");

                if (result.avatarUrl) {
                    setProfile(prev => ({ ...prev, avatarUrl: result.avatarUrl }));
                }
            } else {
                setStatusMessage("User not authenticated. Cannot save profile.");
            }
        } catch (error: any) {
            console.error("Error:", error);
            const errorMessage = error.response?.data || error.message || "Error updating profile.";
            setStatusMessage(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            // Call Service with Dynamic ID
            if (user?.id) {
                await userService.deleteProfile(user.id);
                router.push("/signup");
            }
        } catch (error: any) {
            console.error("Error deleting profile:", error);
            alert("Error deleting profile. See console for details.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20 relative overflow-hidden">
    {/* Background floating Lego blocks */}
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

        {/* Block 6: Sandy Tan (Bottom Right) */}
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
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
                <div className="flex w-full items-center px-6 md:px-12 py-4">
                    <div className="flex items-center gap-4">
                        {/* 👇 Updated Back Button using router.back() */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="hover:bg-[#576238]/10 hover:text-[#576238]"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-xl font-bold text-[#576238] leading-tight">
                                User Profile
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="border-2 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-2xl text-[#576238]">Profile Settings</CardTitle>
                                <CardDescription>Manage your account information and preferences</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div className="flex flex-col items-center justify-center space-y-4">
                                    <div className="relative">
                                        <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                                            <AvatarImage
                                                src={previewUrl || profile.avatarUrl}
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-[#576238] text-white text-xl">
                                                {profile.fname?.[0]}{profile.lname?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full shadow-lg hover:bg-gray-200" onClick={() => fileInputRef.current?.click()}>
                                            <Camera className="h-4 w-4 text-[#576238]" />
                                        </Button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </div>
                                    <p className="text-sm text-gray-500">Click icon to upload photo</p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-[#576238] border-b pb-2">Personal Information</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="fname">First Name</Label>
                                            <Input id="fname" value={profile.fname} onChange={handleChange("fname")} placeholder="Alice" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lname">Last Name</Label>
                                            <Input id="lname" value={profile.lname} onChange={handleChange("lname")} placeholder="Founder" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email (Read Only)</Label>
                                        <Input id="email" type="email" value={profile.email} disabled className="bg-gray-50 text-gray-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" type="tel" value={profile.phoneNumber} onChange={handleChange("phoneNumber")} placeholder="+1 234 567 890" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address">Region / Address</Label>
                                        <Input id="address" value={profile.addressRegion} onChange={handleChange("addressRegion")} placeholder="New York, USA" />
                                    </div>
                                </div>

                                {statusMessage && (
                                    <div className={`p-3 rounded-md text-center text-sm ${statusMessage.toLowerCase().includes("error") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                                        {statusMessage}
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                                    <Button onClick={handleSave} disabled={isLoading} className="flex-1 bg-[#576238] hover:bg-[#6b7c3f]">
                                        {isLoading ? (<><LegoSpinner className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="mr-2 h-4 w-4" />Save Changes</>)}
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="flex-1">
                                                <Trash2 className="mr-2 h-4 w-4" />Delete Account
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This action cannot be undone. It will permanently delete your profile.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete Account</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}