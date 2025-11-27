"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Download, Info, Eye } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function ContributorPitchesPage() {
    const params = useParams();
    const router = useRouter();
    const [selectedVersions, setSelectedVersions] = useState<{ [key: string]: string }>({});

    const pitches = [
        {
            id: "pitch1",
            name: "Investor Pitch - Series A",
            type: "Video",
            format: "MP4",
            uploadedBy: "Alex Chen",
            uploadedAt: "2024-01-22",
            duration: "5:30",
            versions: [
                { id: "v2", version: "v2.0", date: "2024-01-22", label: "Latest" },
                { id: "v1", version: "v1.0", date: "2024-01-15" },
            ],
            thumbnail: "https://via.placeholder.com/400x225/576238/FFD95D?text=Pitch+Video",
            size: "45 MB",
        },
        {
            id: "pitch2",
            name: "Product Demo Pitch",
            type: "Video",
            format: "MP4",
            uploadedBy: "Alex Chen",
            uploadedAt: "2024-01-20",
            duration: "8:15",
            versions: [
                { id: "v1", version: "v1.0", date: "2024-01-20", label: "Latest" },
            ],
            thumbnail: "https://via.placeholder.com/400x225/576238/FFD95D?text=Demo+Video",
            size: "67 MB",
        },
        {
            id: "pitch3",
            name: "Elevator Pitch - 90 Seconds",
            type: "Video",
            format: "MP4",
            uploadedBy: "Alex Chen",
            uploadedAt: "2024-01-18",
            duration: "1:30",
            versions: [
                { id: "v3", version: "v3.0", date: "2024-01-18", label: "Latest" },
                { id: "v2", version: "v2.0", date: "2024-01-12" },
                { id: "v1", version: "v1.0", date: "2024-01-08" },
            ],
            thumbnail: "https://via.placeholder.com/400x225/576238/FFD95D?text=Elevator+Pitch",
            size: "12 MB",
        },
    ];

    const handleVersionChange = (pitchId: string, versionId: string) => {
        setSelectedVersions({ ...selectedVersions, [pitchId]: versionId });
    };

    const handleView = (pitchId: string) => {
        const versionId = selectedVersions[pitchId];
        if (!versionId) {
            alert("Please select a version first");
            return;
        }
        router.push(`/contributor/startup/${params.id}/pitches/${pitchId}/view?version=${versionId}`);
    };

    const handleDownload = (pitch: any) => {
        const versionId = selectedVersions[pitch.id];
        if (!versionId) {
            alert("Please select a version first");
            return;
        }
        console.log(`Downloading ${pitch.name} - ${versionId}`);
    };

    const handleViewDetails = (pitchId: string) => {
        router.push(`/contributor/startup/${params.id}/pitches/${pitchId}/details`);
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
                    <div className="grid md:grid-cols-2 gap-6">
                        {pitches.map((pitch) => (
                            <Card key={pitch.id} className="border-2 hover:border-[#FFD95D] transition-all">
                                <CardHeader>
                                    <div className="relative mb-4 rounded-lg overflow-hidden group">
                                        <img
                                            src={pitch.thumbnail}
                                            alt={pitch.name}
                                            className="w-full aspect-video object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play className="h-16 w-16 text-white" />
                                        </div>
                                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                            {pitch.duration}
                                        </div>
                                    </div>
                                    <CardTitle className="text-[#576238]">{pitch.name}</CardTitle>
                                    <CardDescription>
                                        {pitch.format} • {pitch.size} • Uploaded by {pitch.uploadedBy}
                                    </CardDescription>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="text-xs">
                                            {pitch.versions.length} version{pitch.versions.length > 1 ? "s" : ""}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            Latest: {pitch.uploadedAt}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Version Selection */}
                                    <Select
                                        value={selectedVersions[pitch.id] || ""}
                                        onValueChange={(value) => handleVersionChange(pitch.id, value)}
                                    >
                                        <SelectTrigger className="border-[#576238]/30">
                                            <SelectValue placeholder="Select version to view/download" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pitch.versions.map((version) => (
                                                <SelectItem key={version.id} value={version.id}>
                                                    {version.version} - {version.date}
                                                    {version.label && (
                                                        <span className="ml-2 text-xs text-[#576238] font-semibold">
                                                            ({version.label})
                                                        </span>
                                                    )}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleView(pitch.id)}
                                            disabled={!selectedVersions[pitch.id]}
                                            className="flex-1 bg-[#576238] hover:bg-[#6b7c3f] gap-2"
                                        >
                                            <Play className="h-4 w-4" />
                                            Watch
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownload(pitch)}
                                            disabled={!selectedVersions[pitch.id]}
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
                                        onClick={() => handleViewDetails(pitch.id)}
                                        className="w-full gap-2"
                                    >
                                        <Eye className="h-4 w-4" />
                                        View Guidelines
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
