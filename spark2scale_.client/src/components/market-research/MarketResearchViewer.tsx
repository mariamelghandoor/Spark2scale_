"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, DollarSign, Users } from "lucide-react";

export function MarketResearchViewer({ data: rawData }: { data: any }) {
    if (!rawData) return null;
    
    // Unwrap if nested
    const data = rawData.market_research_document || rawData.market_research || rawData;

    // --- SMART INLINE BOLDING ---
    const renderInlineText = (text: string) => {
        const colonIdx = text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 45) {
            const label = text.substring(0, colonIdx + 1).replace(/\*\*/g, '');
            const rest = text.substring(colonIdx + 1).replace(/\*\*/g, '');
            return (
                <span>
                    <strong className="text-[#576238] font-bold">{label}</strong>
                    <span className="text-gray-700">{rest}</span>
                </span>
            );
        }

        const parts = text.split(/(\*\*.*?\*\*)/g);
        return (
            <span>
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
            </span>
        );
    };

    // --- ADVANCED MARKDOWN RENDERER ---
    const renderMarkdown = (text: string) => {
        if (!text) return null;

        const lines = text.split('\n');

        const filteredLines = lines.filter(line => {
            const trimmed = line.trim();
            if (/^(\*\*|#+\s*)?Executive Summary/i.test(trimmed) && trimmed.length < 25) return false;
            return true;
        });

        return filteredLines.map((line, index) => {
            const trimmed = line.trim();

            if (!trimmed || trimmed === '*' || trimmed.match(/^-{3,}$/)) return null;

            if (/^(\*\*|#+\s*)?Investment Memo/i.test(trimmed)) {
                const titleText = trimmed.replace(/^(\*\*|#+\s*)/g, '').replace(/\*\*$/g, '');
                return (
                    <div key={index} className="mb-6 pt-2">
                        <span className="text-xs font-bold tracking-widest text-[#FFD95D] uppercase mb-2 block">Official Report</span>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-snug">
                            {titleText}
                        </h1>
                    </div>
                );
            }

            if (/^(Date|Prepared For|Prepared By|Prepared by):/i.test(trimmed.replace(/\*\*/g, ''))) {
                const cleanLine = trimmed.replace(/\*\*/g, '');
                const colonIdx = cleanLine.indexOf(':');
                const label = cleanLine.substring(0, colonIdx);
                const value = cleanLine.substring(colonIdx + 1).trim();

                return (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 bg-gray-50 p-2.5 px-4 rounded-lg border border-gray-100 max-w-xl">
                        <span className="text-xs font-extrabold text-[#576238] uppercase tracking-wider w-32">{label}</span>
                        <span className="text-sm font-semibold text-gray-800">{value}</span>
                    </div>
                );
            }

            if (trimmed.match(/^\d+\.\s+[A-Z]/) || trimmed.startsWith('#')) {
                const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
                return (
                    <div key={index} className="mt-12 mb-6">
                        <h2 className="text-2xl font-extrabold text-[#576238] mb-4 tracking-tight">
                            {headingText}
                        </h2>
                        <div className="flex h-[3px] w-full rounded-full overflow-hidden opacity-80">
                            <div className="bg-[#576238] w-[80%]" />
                            <div className="bg-[#FFD95D] w-[20%]" />
                        </div>
                    </div>
                );
            }

            if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                const bulletText = trimmed.replace(/^[-*•]\s*/, '');
                return (
                    <div key={index} className="flex items-start gap-3 mb-3 ml-2">
                        <span className="text-[#FFD95D] font-black text-xl leading-none mt-1 shadow-sm">
                            •
                        </span>
                        <p className="text-gray-700 leading-relaxed text-[15px]">
                            {renderInlineText(bulletText)}
                        </p>
                    </div>
                );
            }

            return (
                <p key={index} className="mb-4 text-gray-700 leading-relaxed text-[15px]">
                    {renderInlineText(trimmed)}
                </p>
            );
        });
    };

    return (
        <div className="space-y-8 pb-10 w-full max-w-5xl mx-auto mt-6">
            {/* KPI Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="relative overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#576238]"></div>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-[#576238]/10 rounded-md">
                                <Target className="w-4 h-4 text-[#576238]" />
                            </div>
                            <span className="font-extrabold text-gray-400 uppercase tracking-widest text-[10px]">Opportunity Score</span>
                        </div>

                        <div className="flex items-baseline gap-1 mb-2">
                            <h3 className="text-4xl font-black text-[#576238] tracking-tight">
                                {data.opportunity_analysis?.opportunity_score ?? "N/A"}
                            </h3>
                            <span className="text-lg font-bold text-gray-300">/100</span>
                        </div>

                        <Badge className="bg-[#FFD95D] text-[#576238] hover:bg-[#ffe58a] font-black px-2.5 py-0.5 text-xs shadow-none w-fit border-none rounded-md">
                            Grade {data.opportunity_analysis?.grade ?? "N/A"}
                        </Badge>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#8b9c5a]"></div>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-[#8b9c5a]/10 rounded-md">
                                <TrendingUp className="w-4 h-4 text-[#8b9c5a]" />
                            </div>
                            <span className="font-extrabold text-gray-400 uppercase tracking-widest text-[10px]">Market Growth</span>
                        </div>

                        <div className="flex items-baseline gap-1 mt-6">
                            <h3 className="text-4xl font-black text-gray-800 tracking-tight">
                                {data.opportunity_analysis?.breakdown?.growth_pct
                                    ? `${data.opportunity_analysis.breakdown.growth_pct.toFixed(1)}%`
                                    : "N/A"}
                            </h3>
                            <span className="text-sm font-bold text-gray-400">YoY</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#FFD95D]"></div>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-[#FFD95D]/30 rounded-md">
                                <DollarSign className="w-4 h-4 text-[#c7a42e]" />
                            </div>
                            <span className="font-extrabold text-gray-400 uppercase tracking-widest text-[10px]">Serviceable Market</span>
                        </div>

                        <div className="mt-6">
                            <h3 className="text-4xl font-black text-gray-800 tracking-tight">
                                {data.market_sizing?.sam_value ?? "N/A"}
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm border-gray-200 overflow-hidden rounded-xl">
                <CardContent className="p-6 md:p-10 bg-white">
                    {renderMarkdown(data.executive_summary)}
                </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 rounded-xl">
                <CardHeader className="bg-gray-50/50 border-b pb-4 pt-5">
                    <CardTitle className="flex items-center gap-2 text-xl text-[#576238] font-bold">
                        <Users className="h-5 w-5 text-[#FFD95D]" /> Competitor Landscape
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                    <div className="grid md:grid-cols-2 gap-4">
                        {data.competitors?.map((comp: any, i: number) => (
                            <div key={i} className="p-4 rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all border-l-4 border-l-[#576238] group">
                                <p className="font-extrabold text-base text-gray-900 group-hover:text-[#576238] transition-colors">{comp.Name || comp.name}</p>
                                <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">{comp.Features || comp.features}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
