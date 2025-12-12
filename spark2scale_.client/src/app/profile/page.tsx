"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Trash2, Eye, User } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ProfilePage() {
    const [profile, setProfile] = useState({
        name: "Alex Johnson",
        email: "alex@example.com",
        phone: "+1 (555) 123-4567",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        profilePicture: "/placeholder-avatar.jpg", // Placeholder image
    });

    const [viewPictureDialog, setViewPictureDialog] = useState(false);

    const handleSave = () => {
        console.log("Saving profile:", profile);
        // Handle save logic
    };

    const handleDelete = () => {
        console.log("Deleting profile");
        // Handle delete logic
    };

    const handleDeletePicture = () => {
        setProfile({ ...profile, profilePicture: "" });
        console.log("Profile picture deleted");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
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
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="text-2xl text-[#576238]">
                                    Profile Settings
                                </CardTitle>
                                <CardDescription>
                                    Manage your account information and preferences
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Profile Picture Section */}
                                <div className="space-y-4 pb-6 border-b">
                                    <h3 className="text-lg font-semibold text-[#576238]">
                                        Profile Picture
                                    </h3>
                                    <div className="flex flex-col items-center gap-4">
                                        {/* Profile Picture Preview */}
                                        <div className="relative">
                                            {profile.profilePicture ? (
                                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#576238] bg-gray-100">
                                                    <img
                                                        src={profile.profilePicture}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = "none";
                                                            e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-[#F0EADC]"><svg class="w-16 h-16 text-[#576238]" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg></div>`;
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-32 h-32 rounded-full border-4 border-[#576238] bg-[#F0EADC] flex items-center justify-center">
                                                    <User className="w-16 h-16 text-[#576238]" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Picture Controls */}
                                        <div className="flex gap-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setViewPictureDialog(true)}
                                                disabled={!profile.profilePicture}
                                            >
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Picture
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={!profile.profilePicture}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Picture
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            Delete Profile Picture?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to remove your profile picture? This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={handleDeletePicture}
                                                            className="bg-destructive hover:bg-destructive/90"
                                                        >
                                                            Delete Picture
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-[#576238]">
                                        Personal Information
                                    </h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            value={profile.name}
                                            onChange={(e) =>
                                                setProfile({ ...profile, name: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) =>
                                                setProfile({ ...profile, email: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={profile.phone}
                                            onChange={(e) =>
                                                setProfile({ ...profile, phone: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Password Change */}
                                <div className="space-y-4 pt-6 border-t">
                                    <h3 className="text-lg font-semibold text-[#576238]">
                                        Change Password
                                    </h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="current-password">Current Password</Label>
                                        <Input
                                            id="current-password"
                                            type="password"
                                            value={profile.currentPassword}
                                            onChange={(e) =>
                                                setProfile({
                                                    ...profile,
                                                    currentPassword: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-password">New Password</Label>
                                        <Input
                                            id="new-password"
                                            type="password"
                                            value={profile.newPassword}
                                            onChange={(e) =>
                                                setProfile({ ...profile, newPassword: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password">
                                            Confirm New Password
                                        </Label>
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            value={profile.confirmPassword}
                                            onChange={(e) =>
                                                setProfile({
                                                    ...profile,
                                                    confirmPassword: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                                    <Button
                                        onClick={handleSave}
                                        className="flex-1 bg-[#576238] hover:bg-[#6b7c3f]"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="flex-1">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Account
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>
                                                    Are you absolutely sure?
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently
                                                    delete your account and remove all your data from our
                                                    servers.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleDelete}
                                                    className="bg-destructive hover:bg-destructive/90"
                                                >
                                                    Delete Account
                                                </AlertDialogAction>
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Profile Picture</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center p-6">
                        {profile.profilePicture ? (
                            <img
                                src={profile.profilePicture}
                                alt="Profile Picture"
                                className="max-w-full max-h-[400px] rounded-lg"
                                onError={(e) => {
                                    e.currentTarget.src = "";
                                    e.currentTarget.alt = "Image not available";
                                }}
                            />
                        ) : (
                            <div className="w-64 h-64 rounded-lg bg-[#F0EADC] flex items-center justify-center">
                                <User className="w-24 h-24 text-[#576238]" />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}