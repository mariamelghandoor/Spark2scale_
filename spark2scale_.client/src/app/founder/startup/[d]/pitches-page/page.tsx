"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Play, Eye, Download, Edit2, Loader2, Calendar, X, Globe, Lock, AlertTriangle } from "lucide-react";
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
// Import PitchDeck directly (now that it has canaccess)
import { pitchDeckService, PitchDeck } from "@/services/pitchDeckService";
import { toast } from "sonner";

// REMOVED: interface ExtendedPitchDeck ... (Not needed anymore)

export default function PitchesPage() {
    const params = useParams();
    const router = useRouter();
    const rawId = params?.d || params?.id;
    const startupId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId).toString() : "";

    // UPDATED: Use PitchDeck[] directly
    const [pitches, setPitches] = useState<PitchDeck[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog States
    const [renameDialog, setRenameDialog] = useState(false);
    const [selectedPitchId, setSelectedPitchId] = useState<string | null>(null);
    const [newPitchName, setNewPitchName] = useState("");

    // Video Preview State
    const [previewDialog, setPreviewDialog] = useState(false);
    const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
    const [selectedVideoTitle, setSelectedVideoTitle] = useState("");

    // Confirmation Dialog State
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [pendingPublicId, setPendingPublicId] = useState<string | null>(null);

    useEffect(() => {
        if (startupId) loadPitches();
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

    // --- 1. Intercept the Switch Click ---
    const handleSwitchClick = (pitchId: string, newValue: boolean) => {
        if (!newValue) {
            executeVisibilityChange(pitchId, false);
            return;
        }

        const hasExistingPublic = pitches.some(p => p.canaccess && p.pitchdeckid !== pitchId);

        if (hasExistingPublic) {
            setPendingPublicId(pitchId);
            setConfirmDialog(true);
        } else {
            executeVisibilityChange(pitchId, true);
        }
    };

    // --- 2. Execute the Change ---
    const executeVisibilityChange = async (pitchId: string, isPublic: boolean) => {
        const previousState = [...pitches];

        setPitches(currentPitches => currentPitches.map(p => {
            if (p.pitchdeckid === pitchId) {
                return { ...p, canaccess: isPublic };
            }
            if (isPublic) {
                return { ...p, canaccess: false };
            }
            return p;
        }));

        try {
            await pitchDeckService.togglePitchVisibility(pitchId, startupId, isPublic);
            toast.success(isPublic ? "Pitch is now Public" : "Pitch is now Private");
        } catch (error) {
            console.error("Failed to update visibility", error);
            setPitches(previousState);
            toast.error("Failed to update visibility setting");
        }
    };

    // --- 3. Handle Dialog Confirmation ---
    const handleConfirmSwitch = () => {
        if (pendingPublicId) {
            executeVisibilityChange(pendingPublicId, true);
        }
        setConfirmDialog(false);
        setPendingPublicId(null);
    };

    const handleRename = (pitchId: string, currentName: string) => {
        setSelectedPitchId(pitchId);
        setNewPitchName(currentName || "Untitled Pitch");
        setRenameDialog(true);
    };

    const handleSaveRename = async () => {
        if (selectedPitchId && newPitchName.trim()) {
            try {
                await pitchDeckService.updatePitchTitle(selectedPitchId, newPitchName);
                setPitches(pitches.map(p =>
                    p.pitchdeckid === selectedPitchId ? { ...p, pitchname: newPitchName } : p
                ));
                setRenameDialog(false);
                setSelectedPitchId(null);
                setNewPitchName("");
            } catch (error) {
                console.error("Rename failed", error);
            }
        }
    };

    const handleViewVideo = (videoUrl: string, title: string) => {
        setSelectedVideoUrl(videoUrl);
        setSelectedVideoTitle(title || "Pitch Video");
        setPreviewDialog(true);
    };

    const handleViewDetails = (pitchId: string) => {
        router.push(`/founder/startup/${startupId}/pitches/${pitchId}/details?source=resources`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
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
                <Card className="p-6 mb-8 bg-[#F0EADC]/50 border-2 border-[#FFD95D]">
                    <div className="flex items-start gap-4">
                        <div className="text-4xl">🎯</div>
                        <div>
                            <h3 className="font-bold text-[#576238] mb-2">Perfect Your Pitch</h3>
                            <p className="text-sm text-muted-foreground">
                                Set your best pitch to <strong>Public</strong> to allow investors to view it.
                                Only one pitch can be public at a time.
                            </p>
                        </div>
                    </div>
                </Card>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-[#576238]" />
                    </div>
                ) : pitches.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 rounded-xl border-2 border-dashed">
                        <p className="text-muted-foreground">No pitches found.</p>
                        <Button className="mt-4 bg-[#576238]" asChild>
                            <Link href={`/founder/startup/${startupId}/pitch-deck`}>Go to Upload</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pitches.map((pitch, index) => (
                            <motion.div
                                key={pitch.pitchdeckid}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer border-2 ${pitch.canaccess ? 'border-[#576238] ring-1 ring-[#576238]' : 'hover:border-[#FFD95D]'} bg-white`}>
                                    <div
                                        className="relative bg-black h-48 flex items-center justify-center group"
                                        onClick={() => handleViewVideo(pitch.video_url, pitch.pitchname)}
                                    >
                                        <video src={pitch.video_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                                        <div className={`absolute top-3 right-3 text-xs px-2 py-1 rounded font-bold shadow-md z-10 flex items-center gap-1 ${pitch.canaccess ? "bg-[#576238] text-white" : "bg-gray-800/80 text-gray-300"}`}>
                                            {pitch.canaccess ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                            {pitch.canaccess ? "Public" : "Private"}
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play className="h-12 w-12 text-white drop-shadow-lg" />
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="mb-3">
                                            <h3 className="font-bold text-[#576238] mb-1 line-clamp-2">{pitch.pitchname || "Untitled Pitch"}</h3>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(pitch.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg mb-4 border">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-semibold text-[#576238]">Visibility</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {pitch.canaccess ? "Visible to investors" : "Only you can see this"}
                                                </span>
                                            </div>
                                            <Switch
                                                checked={pitch.canaccess}
                                                onCheckedChange={(checked) => handleSwitchClick(pitch.pitchdeckid, checked)}
                                                className="data-[state=checked]:bg-[#576238]"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mt-4">
                                            <Button variant="outline" size="sm" onClick={() => handleViewVideo(pitch.video_url, pitch.pitchname)}>
                                                <Eye className="h-3 w-3 mr-1" /> View
                                            </Button>
                                            <Button variant="default" size="sm" className="bg-[#576238] hover:bg-[#6b7c3f] text-white" asChild>
                                                <a href={pitch.video_url} download target="_blank" rel="noopener noreferrer">
                                                    <Download className="h-3 w-3 mr-1" /> Save
                                                </a>
                                            </Button>
                                            <Button variant="ghost" size="sm" className="border border-gray-200" onClick={() => handleRename(pitch.pitchdeckid, pitch.pitchname)}>
                                                <Edit2 className="h-3 w-3 mr-1" /> Rename
                                            </Button>
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => handleViewDetails(pitch.pitchdeckid)}>
                                            View Analysis Report &rarr;
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
                <DialogContent className="sm:max-w-[425px] border-l-4 border-l-amber-500">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                            Change Public Pitch?
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-base">
                            Another pitch is currently set to Public.
                            <br /><br />
                            <strong>Setting this pitch to Public will automatically make all other pitches private.</strong>
                            <br /><br />
                            Do you want to proceed?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setConfirmDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={handleConfirmSwitch}
                        >
                            Confirm Change
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
                <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-black/95 border-0">
                    <div className="relative">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white hover:bg-white/20 z-10 rounded-full" onClick={() => setPreviewDialog(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                        {selectedVideoUrl && (
                            <div className="w-full aspect-video flex items-center justify-center">
                                <video src={selectedVideoUrl} controls autoPlay className="w-full h-full max-h-[80vh]" />
                            </div>
                        )}
                        <div className="p-4 bg-white">
                            <h3 className="font-bold text-lg text-[#576238]">{selectedVideoTitle}</h3>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={renameDialog} onOpenChange={setRenameDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Rename Pitch</DialogTitle>
                        <DialogDescription>Enter a new name for your pitch.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="pitch-name">Pitch Name</Label>
                            <Input id="pitch-name" value={newPitchName} onChange={(e) => setNewPitchName(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveRename} disabled={!newPitchName.trim()} className="bg-[#576238] text-white">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}