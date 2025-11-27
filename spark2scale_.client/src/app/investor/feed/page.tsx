"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, X, Heart, Eye } from "lucide-react";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";

export default function InvestorFeed() {
    const [userName] = useState("Sarah");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [startups] = useState([
        {
            id: 1,
            name: "EcoTech Solutions",
            tagline: "AI-powered sustainability for businesses",
            region: "North America",
            field: "Green Technology",
            stage: "Series A",
            funding: "$2M",
            team: "15 people",
            image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&h=600&fit=crop",
        },
        {
            id: 2,
            name: "HealthAI Platform",
            tagline: "Revolutionizing patient care with AI diagnostics",
            region: "Europe",
            field: "Healthcare Tech",
            stage: "Seed",
            funding: "$500K",
            team: "8 people",
            image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
        },
        {
            id: 3,
            name: "FinFlow",
            tagline: "Smart financial management for SMBs",
            region: "Asia",
            field: "FinTech",
            stage: "Pre-seed",
            funding: "$200K",
            team: "5 people",
            image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
        },
    ]);

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    const handleSwipe = (direction: "left" | "right") => {
        if (direction === "right") {
            console.log("Liked:", startups[currentIndex].name);
        } else {
            console.log("Passed:", startups[currentIndex].name);
        }

        if (currentIndex < startups.length - 1) {
            setCurrentIndex(currentIndex + 1);
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
                        <Link href="/profile">
                            <Button variant="ghost" size="icon">
                                <div className="w-8 h-8 rounded-full bg-[#576238] flex items-center justify-center text-white text-sm font-semibold">
                                    {userName[0]}
                                </div>
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-md mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 text-center"
                    >
                        <h2 className="text-3xl font-bold text-[#576238] mb-2">
                            Discover Startups
                        </h2>
                        <p className="text-muted-foreground">
                            Swipe right to like, left to pass
                        </p>
                    </motion.div>

                    {currentIndex < startups.length ? (
                        <div className="relative h-[600px]">
                            {/* Card Stack Effect */}
                            {startups.slice(currentIndex, currentIndex + 2).map((startup, index) => (
                                <motion.div
                                    key={startup.id}
                                    style={{
                                        x: index === 0 ? x : 0,
                                        rotate: index === 0 ? rotate : 0,
                                        opacity: index === 0 ? opacity : 1,
                                        zIndex: startups.length - index,
                                        scale: index === 0 ? 1 : 0.95,
                                    }}
                                    drag={index === 0 ? "x" : false}
                                    dragConstraints={{ left: 0, right: 0 }}
                                    onDragEnd={(e, info) => {
                                        if (index === 0) {
                                            if (info.offset.x > 100) {
                                                handleSwipe("right");
                                            } else if (info.offset.x < -100) {
                                                handleSwipe("left");
                                            }
                                        }
                                    }}
                                    className="absolute inset-0"
                                >
                                    <Card className="h-full border-2 overflow-hidden shadow-xl">
                                        {/* Image */}
                                        <div className="relative h-64 overflow-hidden">
                                            <img
                                                src={startup.image}
                                                alt={startup.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                            <div className="absolute bottom-4 left-4 text-white">
                                                <h3 className="text-2xl font-bold mb-1">
                                                    {startup.name}
                                                </h3>
                                                <p className="text-sm text-white/90">
                                                    {startup.tagline}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <CardContent className="p-6 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Region</p>
                                                    <p className="font-semibold text-[#576238]">
                                                        {startup.region}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Field</p>
                                                    <p className="font-semibold text-[#576238]">
                                                        {startup.field}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Stage</p>
                                                    <p className="font-semibold text-[#576238]">
                                                        {startup.stage}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Funding Goal
                                                    </p>
                                                    <p className="font-semibold text-[#576238]">
                                                        {startup.funding}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">
                                                        👥 {startup.team}
                                                    </span>
                                                    <Link href={`/investor/startup/${startup.id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-[#576238] text-[#576238] hover:bg-[#576238] hover:text-white"
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Profile
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-12 text-center border-2">
                            <div className="text-6xl mb-4">🎉</div>
                            <h3 className="text-2xl font-bold text-[#576238] mb-2">
                                That's All for Now!
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                Check back later for more startup opportunities
                            </p>
                            <Button
                                onClick={() => setCurrentIndex(0)}
                                className="bg-[#576238] hover:bg-[#6b7c3f]"
                            >
                                Review Again
                            </Button>
                        </Card>
                    )}

                    {/* Action Buttons */}
                    {currentIndex < startups.length && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex justify-center gap-6 mt-8"
                        >
                            <Button
                                onClick={() => handleSwipe("left")}
                                size="lg"
                                variant="outline"
                                className="rounded-full w-16 h-16 border-2 border-red-500 text-red-500 hover:bg-red-50"
                            >
                                <X className="h-6 w-6" />
                            </Button>
                            <Button
                                onClick={() => handleSwipe("right")}
                                size="lg"
                                className="rounded-full w-16 h-16 bg-[#576238] hover:bg-[#6b7c3f]"
                            >
                                <Heart className="h-6 w-6" />
                            </Button>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}
