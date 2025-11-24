"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Calendar, Plus, User } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FounderDashboard() {
    const [userName] = useState("Alex");
    const [startups, setStartups] = useState([
        {
            id: 1,
            name: "EcoTech Solutions",
            region: "North America",
            field: "Green Technology",
            progress: 4,
            likes: 23,
        },
        {
            id: 2,
            name: "HealthAI Platform",
            region: "Europe",
            field: "Healthcare Tech",
            progress: 2,
            likes: 15,
        },
    ]);

    const [newStartup, setNewStartup] = useState({
        name: "",
        region: "",
        field: "",
    });

    const handleAddStartup = () => {
        if (newStartup.name && newStartup.region && newStartup.field) {
            setStartups([
                ...startups,
                {
                    id: startups.length + 1,
                    ...newStartup,
                    progress: 0,
                    likes: 0,
                },
            ]);
            setNewStartup({ name: "", region: "", field: "" });
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
                            <Button variant="ghost" size="icon">
                                <Calendar className="h-5 w-5" />
                            </Button>
                        </Link>
                        <Button variant="ghost" size="icon">
                            <Bell className="h-5 w-5" />
                        </Button>
                        <Link href="/profile">
                            <Button variant="ghost" size="icon">
                                <User className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                {/* Startup Projects Section */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-[#576238]">
                        Startup Projects
                    </h2>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="bg-[#576238] hover:bg-[#6b7c3f]">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Startup
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Startup</DialogTitle>
                                <DialogDescription>
                                    Create a new startup project to begin your journey
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startup-name">Startup Name</Label>
                                    <Input
                                        id="startup-name"
                                        placeholder="Enter startup name"
                                        value={newStartup.name}
                                        onChange={(e) =>
                                            setNewStartup({ ...newStartup, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="region">Region</Label>
                                    <Select
                                        value={newStartup.region}
                                        onValueChange={(value) =>
                                            setNewStartup({ ...newStartup, region: value })
                                        }
                                    >
                                        <SelectTrigger id="region">
                                            <SelectValue placeholder="Select region" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="north-america">North America</SelectItem>
                                            <SelectItem value="europe">Europe</SelectItem>
                                            <SelectItem value="asia">Asia</SelectItem>
                                            <SelectItem value="africa">Africa</SelectItem>
                                            <SelectItem value="south-america">South America</SelectItem>
                                            <SelectItem value="oceania">Oceania</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="field">Field</Label>
                                    <Select
                                        value={newStartup.field}
                                        onValueChange={(value) =>
                                            setNewStartup({ ...newStartup, field: value })
                                        }
                                    >
                                        <SelectTrigger id="field">
                                            <SelectValue placeholder="Select field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="technology">Technology</SelectItem>
                                            <SelectItem value="healthcare">Healthcare</SelectItem>
                                            <SelectItem value="finance">Finance</SelectItem>
                                            <SelectItem value="education">Education</SelectItem>
                                            <SelectItem value="ecommerce">E-commerce</SelectItem>
                                            <SelectItem value="sustainability">Sustainability</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={handleAddStartup}
                                    className="w-full bg-[#576238] hover:bg-[#6b7c3f]"
                                >
                                    Create Startup
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Startup Cards Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {startups.map((startup, index) => (
                        <motion.div
                            key={startup.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link href={`/founder/startup/${startup.id}`}>
                                <Card className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-[#FFD95D]">
                                    <CardHeader>
                                        <CardTitle className="text-[#576238]">
                                            {startup.name}
                                        </CardTitle>
                                        <CardDescription>
                                            {startup.field} • {startup.region}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">
                                                    Progress
                                                </span>
                                                <span className="text-sm font-semibold text-[#576238]">
                                                    {startup.progress}/6 stages
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-[#576238] h-2 rounded-full transition-all"
                                                    style={{
                                                        width: `${(startup.progress / 6) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between pt-2">
                                                <span className="text-sm text-muted-foreground">
                                                    ❤️ {startup.likes} likes
                                                </span>
                                                <Button
                                                    size="sm"
                                                    className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black"
                                                >
                                                    Open →
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Most Liked Startups Section */}
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
            </main>
        </div>
    );
}
