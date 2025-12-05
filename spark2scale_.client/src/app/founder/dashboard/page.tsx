"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Calendar, Plus, User } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startupService } from "@/services/startupService";


const TEST_USER_ID = "400b330f-fc83-43d5-b9b2-74a4fe0696e3";

export default function FounderDashboard() {
    const [userName] = useState("Alex");
    const [startups, setStartups] = useState<any[]>([]); 
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // REMOVED: 'region' from state
    const [newStartup, setNewStartup] = useState({
        name: "",
        field: "",
        description: "" 
    });

    // FETCH DATA
    useEffect(() => {
        const fetchStartups = async () => {
            try {
                const data = await startupService.getByFounder(TEST_USER_ID);
                
                // Map Backend Data to UI
                // REMOVED: Region mapping
                const formattedStartups = data.map((s: any) => ({
                    id: s.sid,
                    name: s.startupname,
                    field: s.field,
                    progress: 0, // Default for UI
                    likes: 0     // Default for UI
                }));

                setStartups(formattedStartups);
            } catch (error) {
                console.error("Failed to load startups", error);
            }
        };

        fetchStartups();
    }, []);

    const handleAddStartup = async () => {
        if (!newStartup.name || !newStartup.field) {
            alert("Please fill in Name and Field");
            return;
        }

        setIsLoading(true);

        try {
            // Check if description is empty, default to "None"
            const desc = newStartup.description && newStartup.description.trim() !== "" 
                ? newStartup.description 
                : "None";

            const payload = {
                startupname: newStartup.name,
                field: newStartup.field,
                idea_description: desc, // Just the description now
                founder_id: TEST_USER_ID 
            };

            const createdStartup = await startupService.create(payload);

            // Update UI
            setStartups([
                ...startups,
                {
                    id: createdStartup.sid,
                    name: createdStartup.startupname,
                    field: createdStartup.field,
                    progress: 0,
                    likes: 0,
                },
            ]);

            // Reset Form (No region)
            setNewStartup({ name: "", field: "", description: "" });
            setOpen(false);
            
        } catch (error) {
            console.error("Error creating startup:", error);
            alert("Failed. Check console.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[#576238]">
                        Hello {userName} 👋
                    </h1>
                    <div className="flex items-center gap-4">
                        <Link href="/schedule">
                            <Button variant="ghost" size="icon"><Calendar className="h-5 w-5" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
                        <Link href="/profile">
                            <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
                        </Link>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-[#576238]">Startup Projects</h2>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#576238] hover:bg-[#6b7c3f]">
                                <Plus className="mr-2 h-4 w-4" /> Add Startup
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto"> 
                            <DialogHeader>
                                <DialogTitle>Add New Startup</DialogTitle>
                                <DialogDescription>Enter the details for your database.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startup-name">Startup Name *</Label>
                                    <Input 
                                        id="startup-name" 
                                        placeholder="Enter startup name" 
                                        value={newStartup.name} 
                                        onChange={(e) => setNewStartup({ ...newStartup, name: e.target.value })} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Idea Description</Label>
                                    <textarea 
                                        id="description" 
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                                        placeholder="Describe your startup idea..." 
                                        value={newStartup.description} 
                                        onChange={(e) => setNewStartup({ ...newStartup, description: e.target.value })} 
                                    />
                                </div>
                                
                                {/* REMOVED: Region Select Input */}

                                <div className="space-y-2">
                                    <Label htmlFor="field">Field *</Label>
                                    <Select 
                                        value={newStartup.field} 
                                        onValueChange={(value) => setNewStartup({ ...newStartup, field: value })}
                                    >
                                        <SelectTrigger id="field"><SelectValue placeholder="Select field" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Technology">Technology</SelectItem>
                                            <SelectItem value="Healthcare">Healthcare</SelectItem>
                                            <SelectItem value="Finance">Finance</SelectItem>
                                            <SelectItem value="Education">Education</SelectItem>
                                            <SelectItem value="Ecommerce">E-commerce</SelectItem>
                                            <SelectItem value="Sustainability">Sustainability</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleAddStartup} disabled={isLoading} className="w-full bg-[#576238] hover:bg-[#6b7c3f]">
                                    {isLoading ? "Creating..." : "Create Startup"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Startups Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {startups.length === 0 ? (
                        <div className="text-gray-500 col-span-3 text-center py-10">No startups found. Create one!</div>
                    ) : (
                        startups.map((startup, index) => (
                            <motion.div key={startup.id || index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                                <Link href={`/founder/startup/${startup.id}`}>
                                    <Card className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-[#FFD95D]">
                                        <CardHeader>
                                            <CardTitle className="text-[#576238]">{startup.name}</CardTitle>
                                            <CardDescription>
                                                {startup.field}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-muted-foreground">Progress</span>
                                                    <span className="text-sm font-semibold text-[#576238]">{startup.progress}/6 stages</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className="bg-[#576238] h-2 rounded-full transition-all" style={{ width: `${(startup.progress / 6) * 100}%` }} />
                                                </div>
                                                <div className="flex items-center justify-between pt-2">
                                                    <span className="text-sm text-muted-foreground">❤️ {startup.likes} likes</span>
                                                    <Button size="sm" className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black">Open →</Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </motion.div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}