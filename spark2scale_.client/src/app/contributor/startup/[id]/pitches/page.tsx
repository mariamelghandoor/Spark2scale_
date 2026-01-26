"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Download, Info, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { pitchDeckService, PitchDeck } from "@/services/pitchDeckService";

export default function ContributorPitchesPage() {
    const params = useParams();
    const router = useRouter();
    const [selectedVersions, setSelectedVersions] = useState<{ [key: string]: string }>({});
    const [pitches, setPitches] = useState<PitchDeck[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ID Logic
    const rawId = params?.id;
    const startupId = rawId ? (Array.isArray(rawId) ? rawId[0] : rawId).toString() : "";

    useEffect(() => {
        if (startupId) {
            fetchPitches();
        } else {
            setIsLoading(false);
        }
    }, [startupId]);

    const fetchPitches = async () => {
        try {
            setIsLoading(true);
            const data = await pitchDeckService.getPitches(startupId);
            setPitches(data);
            
            // Set default selected version to latest (is_current) for each pitch
            const defaultSelections: { [key: string]: string } = {};
            data.forEach((pitch) => {
                if (pitch.is_current) {
                    defaultSelections[pitch.pitchdeckid] = pitch.pitchdeckid;
                }
            });
            setSelectedVersions(defaultSelections);
        } catch (error) {
            console.error("Failed to fetch pitches", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVersionChange = (pitchId: string, versionId: string) => {
        setSelectedVersions({ ...selectedVersions, [pitchId]: versionId });
    };

    const handleView = (pitchId: string) => {
        const versionId = selectedVersions[pitchId] || pitchId;
        const selectedPitch = pitches.find(p => p.pitchdeckid === versionId);
        if (selectedPitch?.video_url) {
            window.open(selectedPitch.video_url, "_blank");
        }
    };

    const handleDownload = async (pitch: PitchDeck) => {
        const versionId = selectedVersions[pitch.pitchdeckid] || pitch.pitchdeckid;
        const selectedPitch = pitches.find(p => p.pitchdeckid === versionId);
        if (selectedPitch?.video_url) {
            try {
                const response = await fetch(selectedPitch.video_url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = selectedPitch.pitchname || `pitch-${selectedPitch.pitchdeckid}.mp4`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                console.error("Download failed", error);
                alert("Download failed. Please try again.");
            }
        }
    };

    const handleViewDetails = (pitchId: string) => {
        router.push(`/contributor/startup/${params.id}/pitches/${pitchId}/details`);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "Unknown";
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return "Unknown";
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/contributor/startup/${params.id}`}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-[#576238]">Pitch Decks</h1>
                            <p className="text-sm text-muted-foreground">View pitch videos and presentations</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Info Banner */}
                    <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-blue-900 mb-1">Read-Only Access</h3>
                                    <p className="text-sm text-blue-700">
                                        As a contributor, you can view and download pitch decks but cannot upload, edit, or rename them.
                                        You must select a version before viewing or downloading.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pitches Grid */}
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-[#576238]" />
                        </div>
                    ) : pitches.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No pitch videos found for this startup.</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-6">
                            {pitches.map((pitch) => (
                                <Card key={pitch.pitchdeckid} className="border-2 hover:border-[#FFD95D] transition-all">
                                <CardHeader>
                                    <div className="relative mb-4 rounded-lg overflow-hidden group bg-gray-200 aspect-video flex items-center justify-center">
                                        {pitch.video_url ? (
                                            <>
                                                <video
                                                    src={pitch.video_url}
                                                    className="w-full h-full object-cover"
                                                    preload="metadata"
                                                />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Play className="h-16 w-16 text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-gray-400">
                                                <Play className="h-16 w-16 mx-auto" />
                                            </div>
                                        )}
                                    </div>
                                    <CardTitle className="text-[#576238]">
                                        {pitch.pitchname || `Pitch ${pitch.pitchdeckid.substring(0, 8)}`}
                                    </CardTitle>
                                    <CardDescription>
                                        {pitch.format} � {pitch.size} � Uploaded by {pitch.uploadedBy}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Version Selection */}
                                    <Select
                                        value={selectedVersions[pitch.pitchdeckid] || pitch.pitchdeckid}
                                        onValueChange={(value) => handleVersionChange(pitch.pitchdeckid, value)}
                                    >
                                        <SelectTrigger className="border-[#576238]/30">
                                            <SelectValue placeholder="Select version" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={pitch.pitchdeckid}>
                                                {pitch.is_current ? "Current (Latest)" : "This Version"} - {formatDate(pitch.created_at)}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleView(pitch.pitchdeckid)}
                                            className="flex-1 bg-[#576238] hover:bg-[#6b7c3f] gap-2"
                                        >
                                            <Play className="h-4 w-4" />
                                            Watch
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownload(pitch)}
                                            className="gap-2"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download
                                        </Button>
                                    </div>

                                    {/* View Details Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewDetails(pitch.pitchdeckid)}
                                            className="w-full gap-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            View Details
                                        </Button>
                                </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
