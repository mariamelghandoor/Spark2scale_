"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, User } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startupService } from "@/services/startupService";
import LegoLoader from "@/components/lego/LegoLoader";
import LegoAddTrigger from "@/components/lego/LegoAddTrigger";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";

const TEST_USER_ID = "400b330f-fc83-43d5-b9b2-74a4fe0696e3";
const CACHE_KEY = `dashboard_data_${TEST_USER_ID}`;

export default function FounderDashboard() {
    const [userName] = useState("Alex");
    const [startups, setStartups] = useState<any[]>([]);

    // FETCHING STATES
    const [isFetching, setIsFetching] = useState(true);
    const [showLoader, setShowLoader] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [open, setOpen] = useState(false);
    const [isBlockDropped, setIsBlockDropped] = useState(false);

    const [newStartup, setNewStartup] = useState({
        name: "",
        field: "",
        description: ""
    });

    useEffect(() => {
        const loaderTimer = setTimeout(() => setShowLoader(true), 200);

        const loadData = async () => {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.length > 0) {
                        setStartups(parsed);
                        clearTimeout(loaderTimer);
                        setIsFetching(false);
                    }
                } catch (e) { console.error("Cache error", e); }
            }

            try {
                const data = await startupService.getByFounder(TEST_USER_ID);
                const formattedStartups = data.map((s) => ({
                    id: s.sid,
                    name: s.startupname,
                    field: s.field,
                    progress: s.progress_count,
                    likes: s.total_likes,
                    isBroken: s.progress_has_gap
                }));

                setStartups(formattedStartups);
                localStorage.setItem(CACHE_KEY, JSON.stringify(formattedStartups));
                clearTimeout(loaderTimer);

            } catch (error) {
                console.error("Failed to load startups", error);
            } finally {
                setIsFetching(false);
            }
        };

        loadData();
        return () => clearTimeout(loaderTimer);
    }, []);

    const handleTriggerClick = () => {
        setIsBlockDropped(true);
        setTimeout(() => setOpen(true), 600);
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen && startups.length === 0) {
            setTimeout(() => setIsBlockDropped(false), 200);
        }
    };

    const handleAddStartup = async () => {
        if (!newStartup.name || !newStartup.field) {
            alert("Please fill in Name and Field");
            return;
        }

        setIsCreating(true);

        try {
            const desc = newStartup.description && newStartup.description.trim() !== ""
                ? newStartup.description
                : "None";

            const payload = {
                startupname: newStartup.name,
                field: newStartup.field,
                idea_description: desc,
                founder_id: TEST_USER_ID
            };

            const createdStartup = await startupService.create(payload);

            const newStartupUI = {
                id: createdStartup.sid,
                name: createdStartup.startupname,
                field: createdStartup.field,
                progress: 0,
                likes: 0,
                isBroken: false
            };

            const updatedList = [...startups, newStartupUI];
            setStartups(updatedList);
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));

            setNewStartup({ name: "", field: "", description: "" });
            setOpen(false);

        } catch (error) {
            console.error("Error creating startup:", error);
            alert("Failed. Check console.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        // FIX: Changed min-h-screen to h-screen overflow-y-auto to guarantee scrolling
        // Also made the header sticky for better UX
        <div className="h-screen w-full overflow-y-auto bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            <div className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-[#576238]">Hello {userName} 👋</h1>
                    <div className="flex items-center gap-4">
                        <Link href="/schedule"><Button variant="ghost" size="icon"><Calendar className="h-5 w-5" /></Button></Link>

                        <NotificationsDropdown />

                        <Link href="/profile"><Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button></Link>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 pb-20"> {/* Added pb-20 for bottom spacing */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-[#576238]">Startup Projects</h2>

                    {startups.length > 0 && (
                        <Dialog open={open} onOpenChange={handleOpenChange}>
                            <DialogTrigger asChild>
                                <Button className="bg-[#576238] hover:bg-[#6b7c3f]"><Plus className="mr-2 h-4 w-4" /> Add Startup</Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Add New Startup</DialogTitle>
                                    <DialogDescription>Enter the details for your database.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startup-name">Startup Name *</Label>
                                        <Input id="startup-name" placeholder="Enter startup name" value={newStartup.name} onChange={(e) => setNewStartup({ ...newStartup, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Idea Description</Label>
                                        <textarea id="description" className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Describe your startup idea..." value={newStartup.description} onChange={(e) => setNewStartup({ ...newStartup, description: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="field">Field *</Label>
                                        <Select value={newStartup.field} onValueChange={(value) => setNewStartup({ ...newStartup, field: value })}>
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
                                    <Button onClick={handleAddStartup} disabled={isCreating} className="w-full bg-[#576238] hover:bg-[#6b7c3f]">
                                        {isCreating ? "Creating..." : "Create Startup"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]">
                    {isFetching && showLoader ? (
                        <div className="col-span-full flex justify-center items-center">
                            <LegoLoader />
                        </div>
                    ) : startups.length === 0 && !isFetching ? (
                        <>
                            <LegoAddTrigger isDropped={isBlockDropped} onTrigger={handleTriggerClick} />
                            <Dialog open={open} onOpenChange={handleOpenChange}>
                                <DialogContent className="max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Add New Startup</DialogTitle>
                                        <DialogDescription>Enter the details for your database.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="startup-name">Startup Name *</Label>
                                            <Input id="startup-name" placeholder="Enter startup name" value={newStartup.name} onChange={(e) => setNewStartup({ ...newStartup, name: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description">Idea Description</Label>
                                            <textarea id="description" className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Describe your startup idea..." value={newStartup.description} onChange={(e) => setNewStartup({ ...newStartup, description: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="field">Field *</Label>
                                            <Select value={newStartup.field} onValueChange={(value) => setNewStartup({ ...newStartup, field: value })}>
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
                                        <Button onClick={handleAddStartup} disabled={isCreating} className="w-full bg-[#576238] hover:bg-[#6b7c3f]">
                                            {isCreating ? "Creating..." : "Create Startup"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </>
                    ) : (
                        startups.map((startup, index) => (
                            <motion.div key={startup.id || index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                                <Link href={`/founder/startup/${startup.id}`}>
                                    <Card className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-[#FFD95D]">
                                        <CardHeader>
                                            <CardTitle className="text-[#576238]">{startup.name}</CardTitle>
                                            <CardDescription>{startup.field}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-muted-foreground">Progress</span>
                                                    <span className={`text-sm font-semibold ${startup.isBroken ? 'text-red-600' : 'text-[#576238]'}`}>
                                                        {startup.progress}/6 stages {startup.isBroken && "(Gaps!)"}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className={`${startup.isBroken ? 'bg-red-500' : 'bg-[#576238]'} h-2 rounded-full transition-all`} style={{ width: `${(startup.progress / 6) * 100}%` }} />
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

                {/* --- MOST LIKED SECTION --- */}
                {!isFetching && startups.length > 0 && (
                    <div className="mt-12">
                        <h3 className="text-2xl font-bold text-[#576238] mb-4">
                            Most Liked Startups
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {startups
                                .sort((a, b) => b.likes - a.likes)
                                .slice(0, 2)
                                .map((startup) => (
                                    <Card key={startup.id} className="border-2">
                                        <CardHeader>
                                            <CardTitle className="text-lg">{startup.name}</CardTitle>
                                            <CardDescription>
                                                ❤️ {startup.likes} investor likes
                                            </CardDescription>
                                        </CardHeader>
                                    </Card>
                                ))}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}