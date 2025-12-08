"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, Eye, Download, Edit2, Loader2, Calendar } from "lucide-react";
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
import { pitchDeckService, PitchDeck } from "@/services/pitchDeckService";

export default function PitchesPage() {
    const params = useParams();
    const router = useRouter();

    // Extract ID
    const rawId = params?.d || params?.id;
    const startupId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId).toString() : "";

    // State
    const [pitches, setPitches] = useState<PitchDeck[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Rename Dialog State
    const [renameDialog, setRenameDialog] = useState(false);
    const [selectedPitchId, setSelectedPitchId] = useState<string | null>(null);
    const [newPitchName, setNewPitchName] = useState("");

    // Fetch Pitches on Load
    useEffect(() => {
        if (startupId) {
            loadPitches();
        }
    }, [startupId]);

    const loadPitches = async () => {
        try {
            const data = await pitchDeckService.getPitches(startupId);
            setPitches(data);
        } catch (error) {
            console.error("Failed to load pitches", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Rename Handler: Open Dialog
    const handleRename = (pitchId: string, currentName: string) => {
        setSelectedPitchId(pitchId);
        // FIX: Use the actual pitchname or a fallback
        setNewPitchName(currentName || "Untitled Pitch");
        setRenameDialog(true);
    };

    // Rename Handler: Save Changes
    const handleSaveRename = async () => {
        if (selectedPitchId && newPitchName.trim()) {
            try {
                // 1. Call Backend to update DB
                await pitchDeckService.updatePitchTitle(selectedPitchId, newPitchName);

                // 2. Update Local State (So UI reflects change immediately)
                setPitches(pitches.map(p =>
                    p.pitchdeckid === selectedPitchId
                        ? { ...p, pitchname: newPitchName } // FIX: Update 'pitchname' property
                        : p
                ));

                setRenameDialog(false);
                setSelectedPitchId(null);
                setNewPitchName("");
            } catch (error) {
                console.error("Rename failed", error);
                alert("Failed to rename pitch. Please try again.");
            }
        }
    };

    const handleViewDetails = (pitchId: string) => {
        // Pass source=resources so the details page knows to come back here
        router.push(`/founder/startup/${startupId}/pitches/${pitchId}/details?source=resources`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Top Navigation Bar */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/founder/startup/${startupId}`}>
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
                                Access your history of pitch videos. Review previous attempts, check analysis scores, and track your improvement over time.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-[#576238]" />
                    </div>
                ) : pitches.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 rounded-xl border-2 border-dashed">
                        <p className="text-muted-foreground">No pitches found. Go to the Pitch Deck stage to upload one!</p>
                        <Button className="mt-4 bg-[#576238]" asChild>
                            <Link href={`/founder/startup/${startupId}/pitch-deck`}>
                                Go to Upload
                            </Link>
                        </Button>
                    </div>
                ) : (
                    /* Pitches Grid */
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pitches.map((pitch, index) => (
                            <motion.div
                                key={pitch.pitchdeckid}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer border-2 ${pitch.is_current ? 'border-green-500 ring-1 ring-green-500' : 'hover:border-[#FFD95D]'} bg-white`}>

                                    {/* Thumbnail / Video Preview */}
                                    <div className="relative bg-black h-48 flex items-center justify-center group">
                                        <video
                                            src={pitch.video_url}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
                                        />

                                        {/* Status Badge */}
                                        {pitch.is_current && (
                                            <div className="absolute top-3 left-3 bg-green-600 text-white text-xs px-2 py-1 rounded font-bold shadow-md z-10">
                                                Active Version
                                            </div>
                                        )}

                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play className="h-12 w-12 text-white drop-shadow-lg" />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-grow">
                                                {/* FIX: Use pitchname here! */}
                                                <h3 className="font-bold text-[#576238] mb-1 line-clamp-2">
                                                    {pitch.pitchname || "Untitled Pitch"}
                                                </h3>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(pitch.created_at).toLocaleDateString()}
                                                    </span>
                                                    {/* Safely check for score */}
                                                    {(pitch.analysis?.Short?.Score || pitch.analysis?.short?.score) && (
                                                        <span className="bg-[#F0EADC] text-[#576238] px-1.5 py-0.5 rounded font-medium">
                                                            Score: {pitch.analysis?.Short?.Score || pitch.analysis?.short?.score}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 mt-4">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleViewDetails(pitch.pitchdeckid)}
                                                >
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    Details
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="flex-1 bg-[#576238] hover:bg-[#6b7c3f] text-white"
                                                    asChild
                                                >
                                                    <a href={pitch.video_url} download target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-3 w-3 mr-1" />
                                                        Download
                                                    </a>
                                                </Button>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full"
                                                // FIX: Pass pitchname to handler
                                                onClick={() => handleRename(pitch.pitchdeckid, pitch.pitchname)}
                                            >
                                                <Edit2 className="h-3 w-3 mr-1" />
                                                Rename
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Rename Dialog */}
            <Dialog open={renameDialog} onOpenChange={setRenameDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-[#576238]">Rename Pitch</DialogTitle>
                        <DialogDescription>
                            Enter a new name for your pitch presentation to identify it easily.
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
                                placeholder="E.g., Series A Draft 1..."
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