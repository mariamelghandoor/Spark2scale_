"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Save, Trash2, Camera } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// FIX: Added missing Dialog imports
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// FIX: Added optional profilePicture property
interface Profile {
    name: string;
    email: string;
    phone: string;
    profilePicture?: string; 
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<Profile>({
        name: "Alex Johnson",
        email: "alex@example.com",
        phone: "+1 (555) 123-4567",
        profilePicture: "https://github.com/shadcn.png", // Default image
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // FIX: Added missing state variable
    const [viewPictureDialog, setViewPictureDialog] = useState(false);

    const handleChange = (field: keyof Profile) => {
        return (e: ChangeEvent<HTMLInputElement>) => {
            setProfile({ ...profile, [field]: e.target.value });
        };
    };

    const handleSave = () => {
        console.log("Saving profile:", profile);
        // API Call here
    };

    const handleDelete = () => {
        console.log("Deleting profile");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="border-b bg-white/80 backdrop-blur-lg">
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
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="text-2xl text-[#576238]">Profile Settings</CardTitle>
                                <CardDescription>Manage your account information</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {/* Profile Picture Section */}
                                <div className="flex flex-col items-center gap-4">
                                    <div 
                                        className="relative group cursor-pointer" 
                                        onClick={() => setViewPictureDialog(true)}
                                    >
                                        <Avatar className="h-24 w-24 border-2 border-[#576238]">
                                            <AvatarImage src={profile.profilePicture} />
                                            <AvatarFallback>AJ</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Camera className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm">Change Picture</Button>
                                </div>

                                {/* Personal Info */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-[#576238]">Personal Information</h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input id="name" value={profile.name} onChange={handleChange("name")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={profile.email} onChange={handleChange("email")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input id="phone" type="tel" value={profile.phone} onChange={handleChange("phone")} />
                                    </div>
                                </div>

                                {/* Password Change */}
                                <div className="space-y-4 pt-6 border-t">
                                    <h3 className="text-lg font-semibold text-[#576238]">Change Password</h3>
                                    <div className="grid gap-2">
                                        <Label>Current Password</Label>
                                        <Input type="password" value={profile.currentPassword} onChange={handleChange("currentPassword")} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>New Password</Label>
                                        <Input type="password" value={profile.newPassword} onChange={handleChange("newPassword")} />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                                    <Button onClick={handleSave} className="flex-1 bg-[#576238] hover:bg-[#6b7c3f]">
                                        <Save className="mr-2 h-4 w-4" /> Save Changes
                                    </Button>
                                    
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="flex-1">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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

            {/* View Picture Dialog */}
            <Dialog open={viewPictureDialog} onOpenChange={setViewPictureDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Profile Picture</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center p-4">
                        <img 
                            src={profile.profilePicture} 
                            alt="Profile" 
                            className="max-w-full rounded-lg shadow-lg"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}