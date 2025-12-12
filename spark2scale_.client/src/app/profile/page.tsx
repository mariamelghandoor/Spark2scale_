"use client";

import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, Trash2, Camera, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ProfileData {
    fname: string;
    lname: string;
    email: string;
    phoneNumber: string;
    addressRegion: string;
    avatarUrl?: string;
}

const STATIC_USER_ID = "7da8b0c8-9adc-446b-b7f0-218f84a81f1b";

export default function ProfilePage() {
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

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Using static ID in URL
                const res = await fetch(`https://localhost:7155/api/users/get-profile/${STATIC_USER_ID}`);

                if (!res.ok) throw new Error("Failed to fetch profile");

                const data = await res.json();

                setProfile({
                    fname: data.user.fname || "",
                    lname: data.user.lname || "",
                    email: data.user.email || "",
                    phoneNumber: data.user.phone_number || "",
                    addressRegion: data.user.address_region || "",
                    avatarUrl: data.avatarUrl || ""
                });
            } catch (error) {
                console.error("Error loading profile:", error);
            }
        };

        fetchProfile();
    }, []);

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

            // Using static ID in URL
            const response = await fetch(`https://localhost:7155/api/users/update-profile/${STATIC_USER_ID}`, {
                method: "PUT",
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server Error: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            setStatusMessage("Profile updated successfully!");

            if (result.avatarUrl) {
                setProfile(prev => ({ ...prev, avatarUrl: result.avatarUrl }));
            }
        } catch (error) {
            console.error("Error:", error);
            let errorMessage = "Error updating profile.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            setStatusMessage(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            // Using static ID in URL
            const response = await fetch(`https://localhost:7155/api/users/delete-profile/${STATIC_USER_ID}`, {
                method: "DELETE",
            });

            if (response.ok) {
                router.push("/signup");
            } else {
                const errorText = await response.text();
                alert(`Failed to delete profile: ${errorText}`);
            }
        } catch (error) {
            console.error("Error deleting profile:", error);
            alert("Error deleting profile. See console for details.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="border-b bg-white/80 backdrop-blur-lg sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/founder/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-[#576238]">User Profile</h1>
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
                                        {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="mr-2 h-4 w-4" />Save Changes</>)}
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