"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, Video, Play, CheckCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";

export default function PitchDeckPage() {
    const params = useParams();
    const [pitches, setPitches] = useState([
        {
            id: 1,
            title: "Series A Pitch - Version 2",
            date: "2024-02-12",
            duration: "5:42",
            analyzed: true,
            score: 88,
            feedback: [
                { aspect: "Clarity", score: 90, comment: "Message is clear and compelling" },
                { aspect: "Confidence", score: 85, comment: "Strong delivery, minor hesitations" },
                { aspect: "Engagement", score: 90, comment: "Excellent eye contact and energy" },
                { aspect: "Content", score: 87, comment: "Well-structured, add more market data" },
            ],
        },
    ]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${params.id}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">
                                🎤 Pitch Deck
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Stage 6 of 6 - Perfect your pitch
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Upload/Record Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="mb-6 border-2 border-[#FFD95D]">
                            <CardHeader className="bg-gradient-to-r from-[#FFD95D]/20 to-transparent">
                                <CardTitle className="text-[#576238]">
                                    Record or Upload Pitch Video
                                </CardTitle>
                                <CardDescription>
                                    Get AI-powered feedback on your presentation
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Button
                                        className="h-32 flex-col gap-3 bg-[#576238] hover:bg-[#6b7c3f]"
                                        size="lg"
                                    >
                                        <Video className="h-8 w-8" />
                                        <span>Record Live Pitch</span>
                                    </Button>
                                    <Button
                                        className="h-32 flex-col gap-3"
                                        variant="outline"
                                        size="lg"
                                    >
                                        <Upload className="h-8 w-8" />
                                        <span>Upload Video</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Pitch History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="text-[#576238]">
                                    Your Pitch Videos
                                </CardTitle>
                                <CardDescription>
                                    Track your improvements and get feedback
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {pitches.map((pitch, index) => (
                                        <motion.div
                                            key={pitch.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + index * 0.1 }}
                                            className="border-2 rounded-lg overflow-hidden hover:border-[#FFD95D] transition-all"
                                        >
                                            {/* Video Thumbnail */}
                                            <div className="relative bg-gradient-to-br from-[#576238] to-[#6b7c3f] aspect-video flex items-center justify-center">
                                                <div className="absolute inset-0 bg-black/20" />
                                                <Button
                                                    size="lg"
                                                    className="relative z-10 rounded-full w-16 h-16 bg-white/90 hover:bg-white text-[#576238]"
                                                >
                                                    <Play className="h-6 w-6" />
                                                </Button>
                                                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                                                    {pitch.duration}
                                                </div>
                                            </div>

                                            {/* Pitch Info */}
                                            <div className="p-4">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-semibold text-[#576238]">
                                                            {pitch.title}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            {new Date(pitch.date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    {pitch.analyzed && (
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                                            <div className="text-right">
                                                                <p className="text-2xl font-bold text-[#576238]">
                                                                    {pitch.score}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Score
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Feedback */}
                                                {pitch.analyzed && (
                                                    <div className="space-y-3 pt-4 border-t">
                                                        <h4 className="font-semibold text-sm text-[#576238]">
                                                            AI Feedback
                                                        </h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {pitch.feedback.map((fb) => (
                                                                <div
                                                                    key={fb.aspect}
                                                                    className="p-3 bg-gray-50 rounded-lg"
                                                                >
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-xs font-semibold text-[#576238]">
                                                                            {fb.aspect}
                                                                        </span>
                                                                        <span className="text-xs font-bold">
                                                                            {fb.score}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {fb.comment}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex gap-2 mt-4">
                                                    <Button variant="outline" size="sm" className="flex-1">
                                                        View Details
                                                    </Button>
                                                    <Button
                                                        className="flex-1 bg-[#576238] hover:bg-[#6b7c3f]"
                                                        size="sm"
                                                    >
                                                        Analyze Again
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-6 text-center"
                    >
                        <Button
                            size="lg"
                            className="bg-[#FFD95D] hover:bg-[#ffe89a] text-black font-semibold"
                            asChild
                        >
                            <Link href={`/founder/startup/${params.id}`}>
                                🎉 Complete All Stages!
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
