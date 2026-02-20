"use client";

/**
 * ReportView.tsx
 * ---------------
 * Shared presentational components for the Recommendation Agent output.
 *
 *  • MarkdownRenderer  — converts the AI-generated markdown string to JSX
 *  • InvestmentMemoView — full A4-style memo layout used in modals and PDF export
 *
 * Both components are pure (no side-effects, no API calls) so they can be
 * imported by any page that needs to display a recommendation.
 */

import React from "react";
import { Bot } from "lucide-react";
import { RecommendationContent } from "@/services/recommendationService";

// ---------------------------------------------------------------------------
// MarkdownRenderer
// ---------------------------------------------------------------------------

interface MarkdownRendererProps {
    content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    if (!content) return null;

    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

    /** Inline bold / italic parser */
    const parseLine = (text: string, key: number) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return (
            <p key={key} className="mb-3 text-gray-800 leading-relaxed font-serif text-base">
                {parts.map((part, i) => {
                    if (part.startsWith("**") && part.endsWith("**"))
                        return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
                    if (part.startsWith("_") && part.endsWith("_"))
                        return <em key={i} className="italic text-gray-800">{part.slice(1, -1)}</em>;
                    return part;
                })}
            </p>
        );
    };

    const flushTable = (key: string) => {
        if (tableBuffer.length === 0) return null;
        return (
            <div key={key} className="my-8 overflow-x-auto">
                <table className="w-full text-sm text-left font-serif border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black">
                            {tableBuffer[0].split("|").filter(c => c.trim()).map((h, i) => (
                                <th key={i} className="py-2 px-2 font-bold text-black uppercase tracking-wide text-xs">
                                    {h.trim()}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableBuffer.slice(2).map((row, rI) => (
                            <tr key={rI} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                                {row.split("|").filter(c => c.trim()).map((cell, cI) => (
                                    <td key={cI} className="py-3 px-2 align-top text-gray-800">
                                        {cell.replace(/[*_]/g, "").trim()}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        // --- Table rows ---
        if (trimmed.startsWith("|")) {
            inTable = true;
            tableBuffer.push(trimmed);
            return;
        }
        if (inTable) {
            inTable = false;
            const tbl = flushTable(`table-${index}`);
            if (tbl) elements.push(tbl);
            tableBuffer = [];
            // fall-through to process the current non-table line
        }

        // Horizontal rule
        if (trimmed.startsWith("---")) {
            elements.push(<hr key={index} className="my-8 border-t-2 border-black" />);
            return;
        }

        // H3
        if (trimmed.startsWith("### ")) {
            elements.push(
                <h3 key={index} className="text-lg font-bold text-[#576238] uppercase tracking-wider mt-10 mb-4 border-b border-[#576238]/20 pb-2 font-sans">
                    {trimmed.replace("### ", "").trim()}
                </h3>
            );
            return;
        }

        // H4
        if (trimmed.startsWith("#### ")) {
            elements.push(
                <h4 key={index} className="text-base font-bold text-black mt-6 mb-2 font-sans">
                    {trimmed.replace("#### ", "").trim()}
                </h4>
            );
            return;
        }

        // Unordered list item
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            elements.push(
                <div key={index} className="flex gap-3 ml-4 mb-2 text-gray-800 font-serif">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-black shrink-0" />
                    {parseLine(trimmed.substring(2), index)}
                </div>
            );
            return;
        }

        // Blockquote
        if (trimmed.startsWith("> ")) {
            elements.push(
                <blockquote key={index} className="border-l-4 border-[#576238] pl-4 py-1 my-4 italic text-gray-600 bg-gray-50 rounded-r font-serif">
                    {trimmed.substring(2)}
                </blockquote>
            );
            return;
        }

        // Normal paragraph
        if (trimmed) {
            elements.push(parseLine(trimmed, index));
        }
    });

    // Flush any trailing table
    if (inTable && tableBuffer.length > 0) {
        const tbl = flushTable("table-end");
        if (tbl) elements.push(tbl);
    }

    return <div className="markdown-content">{elements}</div>;
};

// ---------------------------------------------------------------------------
// Report content assembler (handles all possible API / DB field-name casings)
// ---------------------------------------------------------------------------

export function buildReportMarkdown(data: any): string {
    const report =
        data?.recommendation_report ||
        data?.recommendationReport ||
        data?.final_report ||
        data?.finalReport ||
        "";

    let md = report;

    // Ensure header spacing
    md = md.replace(/^### /gm, "\n### ");

    const isPlaceholder = (text: string) =>
        !text ||
        text.includes("See detailed report") ||
        text.includes("Investment Memo Generated");

    const summary = data?.Summary || data?.summary || "";
    if (!isPlaceholder(summary)) md += `\n\n### Executive Summary\n${summary}`;

    const keyPoints: string[] = data?.KeyPoints || data?.keyPoints || [];
    const validPoints = keyPoints.filter((p: string) => !isPlaceholder(p));
    if (validPoints.length > 0)
        md += `\n\n### Key Analysis\n${validPoints.map((p: string) => `* ${p}`).join("\n")}`;

    const actionPlan = data?.ActionPlan || data?.actionPlan || "";
    if (!isPlaceholder(actionPlan)) md += `\n\n### Strategic Action Plan\n${actionPlan}`;

    const refined = data?.refined_statements || data?.refinedStatements || {};
    if (refined && Object.keys(refined).length > 0 && !md.includes("Refined Foundation")) {
        md += `\n\n### Refined Foundation\n`;
        Object.entries(refined).forEach(([key, value]: [string, any]) => {
            md += `* **${key.replace(/_/g, " ").toUpperCase()}**: ${value?.recommended ?? value}\n`;
        });
    }

    if (!md.trim()) {
        md =
            "### Report Generation in Progress\n\nPlease wait while the AI analyses your startup data. " +
            "If this persists, try regenerating the recommendation.";
    }

    return md;
}

// ---------------------------------------------------------------------------
// InvestmentMemoView — full A4-style memo layout
// ---------------------------------------------------------------------------

interface InvestmentMemoViewProps {
    data: RecommendationContent | any;
}

export const InvestmentMemoView: React.FC<InvestmentMemoViewProps> = ({ data }) => {
    const finalContent = buildReportMarkdown(data);

    return (
        <div className="bg-white text-black p-12 md:p-16 shadow-2xl border border-gray-100 rounded-sm w-full max-w-4xl min-h-[1000px] relative mx-auto my-8">
            {/* File header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-8 font-mono text-xs text-gray-500 uppercase tracking-widest">
                <span>recommendation.md</span>
                <span>{new Date().toISOString().split("T")[0]}</span>
            </div>

            {/* Title */}
            <div className="flex items-center gap-4 mb-10">
                <Bot className="h-8 w-8 text-[#576238]" />
                <h1 className="text-3xl font-serif font-bold text-[#576238]">
                    Strategic Analysis &amp; Recommendations
                </h1>
            </div>

            {/* Body */}
            <MarkdownRenderer content={finalContent} />

            {/* Footer */}
            <div className="absolute bottom-8 left-0 right-0 text-center text-xs text-gray-400 font-mono">
                Generated by Spark2Scale Recommendation Agent
            </div>
        </div>
    );
};

