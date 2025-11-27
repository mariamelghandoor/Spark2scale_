"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, Upload, Plus, Eye, Download, Edit2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PitchesPage() {
    const params = useParams();
    const router = useRouter();
    const [pitches, setPitches] = useState([
        {
            id: 1,
            title: "Investor Pitch - Series A",
            thumbnail: "🎬",
            duration: "5:30",
            date: "2024-01-15",
            views: 124,
            type: "video",
        },
        {
            id: 2,
            title: "Product Demo Presentation",
            thumbnail: "🎥",
            duration: "8:15",
            date: "2024-01-12",
            views: 89,
            type: "video",
        },
        {
            id: 3,
            title: "Elevator Pitch Recording",
            thumbnail: "🎤",
            duration: "2:00",
            date: "2024-01-10",
            views: 156,
            type: "video",
        },
        {
            id: 4,
            title: "Q&A Session Highlights",
            thumbnail: "💬",
            duration: "12:45",
            date: "2024-01-08",
            views: 67,
            type: "video",
        },
        {
            id: 5,
            title: "Team Introduction Video",
            thumbnail: "👥",
            duration: "4:20",
            date: "2024-01-05",
            views: 203,
            type: "video",
        },
        {
            id: 6,
            title: "Market Opportunity Slides",
            thumbnail: "📊",
            duration: "6:30",
            date: "2024-01-03",
            views: 145,
            type: "slides",
        },
    ]);

    const [renameDialog, setRenameDialog] = useState(false);
    const [selectedPitchId, setSelectedPitchId] = useState<number | null>(null);
    const [newPitchName, setNewPitchName] = useState("");

    const handleRename = (pitchId: number, currentName: string) => {
        setSelectedPitchId(pitchId);
        setNewPitchName(currentName);
        setRenameDialog(true);
    };

    const handleSaveRename = () => {
        if (selectedPitchId !== null && newPitchName.trim()) {
            setPitches(
                pitches.map((pitch) =>
                    pitch.id === selectedPitchId
                        ? { ...pitch, title: newPitchName }
                        : pitch
                )
            );
            setRenameDialog(false);
            setSelectedPitchId(null);
            setNewPitchName("");
        }
    };

    const handleViewDetails = (pitchId: number) => {
        router.push(`/founder/startup/${params.id}/pitches/${pitchId}/details`);
    };

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
                            <h1 className="text-2xl font-bold text-[#576238]">
                                🎬 Pitches & Presentations
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Manage all your pitch videos and presentations
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Video
                        </Button>
                        <Button className="bg-[#576238] hover:bg-[#6b7c3f] text-white">
                            <Plus className="mr-2 h-4 w-4" />
                            Record New
                        </Button>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                {/* Info Section */}
                <Card className="p-6 mb-8 bg-[#F0EADC]/50 border-2 border-[#FFD95D]">
                    <div className="flex items-start gap-4">
                        <div className="text-4xl">🎯</div>
                        <div>
                            <h3 className="font-bold text-[#576238] mb-2">
                                Perfect Your Pitch
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Upload your pitch videos and presentations. Get AI-powered
                                feedback to improve your delivery and impress investors.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Pitches Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pitches.map((pitch, index) => (
                        <motion.div
                            key={pitch.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer border-2 hover:border-[#FFD95D] bg-white">
                                {/* Thumbnail */}
                                <div className="relative bg-gradient-to-br from-[#576238] to-[#6b7c3f] h-48 flex items-center justify-center">
                                    <div className="text-7xl">{pitch.thumbnail}</div>
                                    <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                        {pitch.duration}
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40">
                                        <Play className="h-12 w-12 text-white" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-[#576238] mb-1 line-clamp-2">
                                                {pitch.title}
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span>{pitch.date}</span>
                                                <span>•</span>
                                                <span>{pitch.views} views</span>
                                            </div>
                                        </div>
                                        <span className="text-xs bg-[#FFD95D] text-[#576238] px-2 py-1 rounded-full font-semibold">
                                            {pitch.type}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 mt-4">
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => handleViewDetails(pitch.id)}
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                View Details
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="flex-1 bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                            >
                                                <Download className="h-3 w-3 mr-1" />
                                                Share
                                            </Button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => handleRename(pitch.id, pitch.title)}
                                        >
                                            <Edit2 className="h-3 w-3 mr-1" />
                                            Rename
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}

                    {/* Add New Pitch Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: pitches.length * 0.1 }}
                    >
                        <Card className="h-full flex flex-col items-center justify-center border-2 border-dashed border-[#576238] bg-white/50 hover:bg-[#F0EADC]/30 transition-all cursor-pointer min-h-[320px]">
                            <div className="text-5xl mb-4">➕</div>
                            <h3 className="font-bold text-[#576238] mb-2">
                                Add New Pitch
                            </h3>
                            <p className="text-xs text-muted-foreground text-center px-4">
                                Record or upload a new pitch video
                            </p>
                        </Card>
                    </motion.div>
                </div>

                {/* Quick Tips */}
                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-[#576238] mb-6">
                        Pitch Perfect Tips 💡
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            {
                                title: "Keep It Short",
                                desc: "Aim for 3-5 minutes for elevator pitches",
                                icon: "⏱️",
                            },
                            {
                                title: "Tell a Story",
                                desc: "Make it memorable with compelling narratives",
                                icon: "📖",
                            },
                            {
                                title: "Practice Makes Perfect",
                                desc: "Record multiple versions and iterate",
                                icon: "🎯",
                            },
                        ].map((tip, index) => (
                            <Card key={index} className="p-6 bg-[#F0EADC]/30">
                                <div className="text-3xl mb-3">{tip.icon}</div>
                                <h4 className="font-bold text-[#576238] mb-2">{tip.title}</h4>
                                <p className="text-sm text-muted-foreground">{tip.desc}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </main>

            {/* Rename Dialog */}
            <Dialog open={renameDialog} onOpenChange={setRenameDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-[#576238]">Rename Pitch</DialogTitle>
                        <DialogDescription>
                            Enter a new name for your pitch presentation
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="pitch-name" className="text-[#576238]">
                                Pitch Name
                            </Label>
                            <Input
                                id="pitch-name"
                                value={newPitchName}
                                onChange={(e) => setNewPitchName(e.target.value)}
                                placeholder="Enter pitch name..."
                                className="border-[#576238]/30 focus:border-[#576238]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRenameDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveRename}
                            disabled={!newPitchName.trim()}
                            className="bg-[#576238] hover:bg-[#6b7c3f] text-white"
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}