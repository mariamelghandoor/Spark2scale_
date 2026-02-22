"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Eye } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import ContributorHeader from "@/components/contributor/ContributorHeader";

export default function ContributorPitchViewPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const version = searchParams.get("version");

    const pitch = {
        id: params.pitchId,
        name: "Investor Pitch - Series A",
        version: version || "v2.0",
        uploadedBy: "Alex Chen",
        uploadedAt: "2024-01-22",
        duration: "5:30",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F0EADC] via-[#fff] to-[#FFD95D]/20">
            {/* Header */}
            <ContributorHeader
                backLink={`/contributor/startup/${params.id}/pitches`}
                title={pitch.name}
                subtitle={`Version: ${pitch.version} • ${pitch.duration}`}
            />

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Video Player */}
                    <Card className="p-0 overflow-hidden border-2 mb-6">
                        <div className="aspect-video bg-black flex items-center justify-center">
                            <div className="text-white text-center p-8">
                                <div className="mb-4 text-6xl">🎬</div>
                                <h3 className="text-xl font-bold mb-2">Video Player</h3>
                                <p className="text-white/70 mb-4">
                                    Pitch video would be displayed here
                                </p>
                                <p className="text-sm text-white/50">
                                    ({pitch.name} - {pitch.version})
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Pitch Details */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="p-6 bg-[#F0EADC]/50">
                            <h3 className="font-bold text-[#576238] mb-3">📊 Pitch Information</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Duration:</span>
                                    <span className="font-semibold">{pitch.duration}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Version:</span>
                                    <span className="font-semibold">{pitch.version}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Uploaded by:</span>
                                    <span className="font-semibold">{pitch.uploadedBy}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-semibold">{pitch.uploadedAt}</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 bg-[#F0EADC]/50">
                            <h3 className="font-bold text-[#576238] mb-3">🎯 Key Points</h3>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="text-[#576238] mt-0.5">•</span>
                                    <span>Clear problem statement</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#576238] mt-0.5">•</span>
                                    <span>Unique solution approach</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#576238] mt-0.5">•</span>
                                    <span>Market opportunity data</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#576238] mt-0.5">•</span>
                                    <span>Business model explained</span>
                                </li>
                            </ul>
                        </Card>

                        <Card className="p-6 bg-[#F0EADC]/50">
                            <h3 className="font-bold text-[#576238] mb-3">👥 Your Access</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>Watch pitch video</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>Download video file</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>View all versions</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-red-600">✗</span>
                                    <span className="text-muted-foreground">Cannot edit or upload</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
