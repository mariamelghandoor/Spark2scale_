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

const TEST_USER_ID = "645bde5c-ab6e-47bc-ba8d-cd6f5500bc30";
const CACHE_KEY = `dashboard_data_${TEST_USER_ID}`;

export default function FounderDashboard() {
    const [userName] = useState("Alex");
    const [startups, setStartups] = useState<any[]>([]);

    const [isFetching, setIsFetching] = useState(true);
    const [showLoader, setShowLoader] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [open, setOpen] = useState(false);
    const [isBlockDropped, setIsBlockDropped] = useState(false);

    const [newStartup, setNewStartup] = useState({
        name: "",
        field: "",
        region: "",
        stage: "",
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
                    region: s.region,
                    stage: s.startup_stage,
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
        if (!newStartup.name || !newStartup.field || !newStartup.region || !newStartup.stage) {
            alert("Please fill in Name, Region, Stage, and Field.");
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
                region: newStartup.region,
                startup_stage: newStartup.stage,
                idea_description: desc,
                founder_id: TEST_USER_ID
            };

            const createdStartup = await startupService.create(payload);

            const newStartupUI = {
                id: createdStartup.sid,
                name: createdStartup.startupname,
                field: createdStartup.field,
                region: createdStartup.region,
                stage: createdStartup.startup_stage,
                progress: 0,
                likes: 0,
                isBroken: false
            };

            const updatedList = [...startups, newStartupUI];
            setStartups(updatedList);
            localStorage.setItem(CACHE_KEY, JSON.stringify(updatedList));

            setNewStartup({ name: "", field: "", region: "", stage: "", description: "" });
            setOpen(false);

        } catch (error) {
            console.error("Error creating startup:", error);
            alert("Failed. Check console.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
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

            <main className="container mx-auto px-4 py-8 pb-20">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-[#576238]">Startup Projects</h2>

                    {startups.length > 0 && (
                        <Dialog open={open} onOpenChange={handleOpenChange}>
                            <DialogTrigger asChild>
                                <Button className="bg-[#576238] hover:bg-[#6b7c3f]"><Plus className="mr-2 h-4 w-4" /> Add Startup</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Add New Startup</DialogTitle>
                                    <DialogDescription className="text-xs">Enter the details for your database.</DialogDescription>
                                </DialogHeader>
                                {/* USES THE COMPONENT BELOW TO FIX FOCUS BUG */}
                                <StartupForm
                                    data={newStartup}
                                    setData={setNewStartup}
                                    loading={isCreating}
                                    onSubmit={handleAddStartup}
                                />
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
                                <DialogContent className="sm:max-w-[600px] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Add New Startup</DialogTitle>
                                        <DialogDescription className="text-xs">Enter the details for your database.</DialogDescription>
                                    </DialogHeader>
                                    {/* USES THE COMPONENT BELOW TO FIX FOCUS BUG */}
                                    <StartupForm
                                        data={newStartup}
                                        setData={setNewStartup}
                                        loading={isCreating}
                                        onSubmit={handleAddStartup}
                                    />
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
                                            <CardDescription>{startup.field} • {startup.region}</CardDescription>
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

// --- SEPARATE COMPONENT TO FIX FOCUS BUG & IMPROVE LAYOUT ---
function StartupForm({ data, setData, loading, onSubmit }: { data: any, setData: any, loading: boolean, onSubmit: () => void }) {
    return (
        <div className="space-y-4 mt-2">
            <div className="space-y-1">
                <Label htmlFor="startup-name" className="text-xs font-semibold text-gray-600">Startup Name *</Label>
                <Input
                    id="startup-name"
                    placeholder="Enter startup name"
                    className="h-9 text-sm"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                />
            </div>

            {/* TIGHTER GRID (gap-2) but still 3 columns */}
            <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                    <Label htmlFor="region" className="text-xs font-semibold text-gray-600">Region *</Label>
                    <Select value={data.region} onValueChange={(value) => setData({ ...data, region: value })}>
                        <SelectTrigger id="region" className="h-9 text-sm w-full"><SelectValue placeholder="Region" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="North America">North America</SelectItem>
                            <SelectItem value="Europe">Europe</SelectItem>
                            <SelectItem value="Asia">Asia</SelectItem>
                            <SelectItem value="MENA">MENA</SelectItem>
                            <SelectItem value="South America">South America</SelectItem>
                            <SelectItem value="Africa">Africa</SelectItem>
                            <SelectItem value="Australia">Australia</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <Label htmlFor="stage" className="text-xs font-semibold text-gray-600">Stage *</Label>
                    <Select value={data.stage} onValueChange={(value) => setData({ ...data, stage: value })}>
                        <SelectTrigger id="stage" className="h-9 text-sm w-full"><SelectValue placeholder="Stage" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Pre-Seed">Pre-Seed</SelectItem>
                            <SelectItem value="Seed">Seed</SelectItem>
                            <SelectItem value="Series A">Series A</SelectItem>
                            <SelectItem value="Series B">Series B</SelectItem>
                            <SelectItem value="Growth">Growth</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <Label htmlFor="field" className="text-xs font-semibold text-gray-600">Field *</Label>
                    <Select value={data.field} onValueChange={(value) => setData({ ...data, field: value })}>
                        <SelectTrigger id="field" className="h-9 text-sm w-full"><SelectValue placeholder="Field" /></SelectTrigger>
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
            </div>

            <div className="space-y-1">
                <Label htmlFor="description" className="text-xs font-semibold text-gray-600">Idea Description</Label>
                <textarea
                    id="description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Describe your startup idea..."
                    value={data.description}
                    onChange={(e) => setData({ ...data, description: e.target.value })}
                />
            </div>

            <Button onClick={onSubmit} disabled={loading} className="w-full bg-[#576238] hover:bg-[#6b7c3f] h-9">
                {loading ? "Creating..." : "Create Startup"}
            </Button>
        </div>
    );
}