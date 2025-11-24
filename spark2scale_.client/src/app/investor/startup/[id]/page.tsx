"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Download, FileText, Heart, Video } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InvestorStartupProfile() {
    const params = useParams();
    const [startup] = useState({
        name: "EcoTech Solutions",
        tagline: "AI-powered sustainability for businesses",
        region: "North America",
        field: "Green Technology",
        stage: "Series A",
        funding: "$2M",
        team: "15 people",
        description:
            "EcoTech Solutions helps businesses reduce their carbon footprint through AI-powered analytics and actionable recommendations. Our platform has helped over 500 companies achieve their sustainability goals.",
        image: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&h=600&fit=crop",
    });

    const [liked, setLiked] = useState(false);

    const documents = [
        { id: 1, name: "Business Model Canvas", type: "PDF" },
        { id: 2, name: "Financial Projections", type: "Excel" },
        { id: 3, name: "Market Analysis Report", type: "PDF" },
        { id: 4, name: "Team Bios", type: "PDF" },
    ];

    const pitchVideos = [
        {
            id: 1,
            title: "Series A Pitch - Main",
            duration: "5:42",
            date: "2024-02-12",
        },
        {
            id: 2,
            title: "Product Demo",
            duration: "3:15",
            date: "2024-02-10",
        },
    ];

    const meetings = [
        {
            id: 1,
            date: "2024-02-20",
            time: "2:00 PM",
            type: "Initial Discussion",
        },
        {
            id: 2,
            date: "2024-02-25",
            time: "10:00 AM",
            type: "Deep Dive",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/investor/feed">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-xl font-bold text-[#576238]">Startup Profile</h1>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    {/* Hero Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="overflow-hidden border-2 mb-6">
                            <div className="relative h-64">
                                <img
                                    src={startup.image}
                                    alt={startup.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                <div className="absolute bottom-6 left-6 text-white">
                                    <h1 className="text-4xl font-bold mb-2">{startup.name}</h1>
                                    <p className="text-lg text-white/90">{startup.tagline}</p>
                                </div>
                            </div>
                            <CardContent className="p-6">
                                <div className="grid md:grid-cols-4 gap-4 mb-6">
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Region</p>
                                        <p className="font-semibold text-[#576238]">
                                            {startup.region}
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Field</p>
                                        <p className="font-semibold text-[#576238]">
                                            {startup.field}
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Stage</p>
                                        <p className="font-semibold text-[#576238]">
                                            {startup.stage}
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">
                                            Seeking
                                        </p>
                                        <p className="font-semibold text-[#576238]">
                                            {startup.funding}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => setLiked(!liked)}
                                        className={`flex-1 ${liked
                                                ? "bg-red-500 hover:bg-red-600"
                                                : "bg-[#576238] hover:bg-[#6b7c3f]"
                                            }`}
                                    >
                                        <Heart
                                            className={`mr-2 h-4 w-4 ${liked ? "fill-white" : ""}`}
                                        />
                                        {liked ? "Liked" : "Like Startup"}
                                    </Button>
                                    <Button variant="outline" className="flex-1">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Schedule Meeting
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Tabs Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Tabs defaultValue="about" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="about">About</TabsTrigger>
                                <TabsTrigger value="videos">Videos</TabsTrigger>
                                <TabsTrigger value="documents">Documents</TabsTrigger>
                                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                            </TabsList>

                            <TabsContent value="about" className="mt-6">
                                <Card className="border-2">
                                    <CardHeader>
                                        <CardTitle className="text-[#576238]">
                                            About {startup.name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground leading-relaxed mb-6">
                                            {startup.description}
                                        </p>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-semibold text-[#576238] mb-3">
                                                    Key Highlights
                                                </h4>
                                                <ul className="space-y-2 text-sm">
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-green-600 mt-0.5">✓</span>
                                                        <span>500+ enterprise customers</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-green-600 mt-0.5">✓</span>
                                                        <span>30% MoM revenue growth</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-green-600 mt-0.5">✓</span>
                                                        <span>Experienced leadership team</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-green-600 mt-0.5">✓</span>
                                                        <span>Patents pending for AI technology</span>
                                                    </li>
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-[#576238] mb-3">
                                                    Team Size
                                                </h4>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {startup.team} across engineering, sales, and
                                                    operations
                                                </p>
                                                <h4 className="font-semibold text-[#576238] mb-3">
                                                    Traction
                                                </h4>
                                                <p className="text-sm text-muted-foreground">
                                                    $1.2M ARR with strong unit economics
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="videos" className="mt-6">
                                <Card className="border-2">
                                    <CardHeader>
                                        <CardTitle className="text-[#576238]">
                                            Pitch Videos
                                        </CardTitle>
                                        <CardDescription>
                                            Watch the founder's presentations
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {pitchVideos.map((video) => (
                                                <div
                                                    key={video.id}
                                                    className="border-2 rounded-lg overflow-hidden hover:border-[#FFD95D] transition-all"
                                                >
                                                    <div className="relative bg-gradient-to-br from-[#576238] to-[#6b7c3f] aspect-video flex items-center justify-center">
                                                        <Button
                                                            size="lg"
                                                            className="rounded-full w-16 h-16 bg-white/90 hover:bg-white text-[#576238]"
                                                        >
                                                            <Video className="h-6 w-6" />
                                                        </Button>
                                                        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                                                            {video.duration}
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <h4 className="font-semibold text-[#576238] mb-1">
                                                            {video.title}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {new Date(video.date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="documents" className="mt-6">
                                <Card className="border-2">
                                    <CardHeader>
                                        <CardTitle className="text-[#576238]">Documents</CardTitle>
                                        <CardDescription>
                                            Access startup documentation
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {documents.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-[#FFD95D] transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-5 w-5 text-[#576238]" />
                                                        <div>
                                                            <p className="font-semibold text-[#576238]">
                                                                {doc.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {doc.type}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button variant="outline" size="sm">
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Download
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="calendar" className="mt-6">
                                <Card className="border-2">
                                    <CardHeader>
                                        <CardTitle className="text-[#576238]">
                                            Meeting Schedule
                                        </CardTitle>
                                        <CardDescription>
                                            Scheduled and upcoming meetings
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {meetings.length > 0 ? (
                                            <div className="space-y-3">
                                                {meetings.map((meeting) => (
                                                    <div
                                                        key={meeting.id}
                                                        className="flex items-center justify-between p-4 border-2 rounded-lg"
                                                    >
                                                        <div>
                                                            <p className="font-semibold text-[#576238]">
                                                                {meeting.type}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {new Date(meeting.date).toLocaleDateString()} at{" "}
                                                                {meeting.time}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-[#576238] text-[#576238]"
                                                        >
                                                            Join
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                                <p className="text-muted-foreground">
                                                    No meetings scheduled yet
                                                </p>
                                                <Button className="mt-4 bg-[#576238] hover:bg-[#6b7c3f]">
                                                    Schedule a Meeting
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
