"use client";

/**
 * ReportView.tsx
 * ───────────────
 * Shared presentational components for the Recommendation Agent output.
 *
 *  • MarkdownRenderer   — converts AI-generated markdown to JSX
 *  • buildReportMarkdown — returns the main strategic-analysis markdown only
 *                          (company overview and refined statements are
 *                           rendered as dedicated React sections in InvestmentMemoView)
 *  • InvestmentMemoView — full A4-style memo that matches the PDF theme:
 *                          olive header band → mustard stripe
 *                          → company overview → refined statements
 *                          → strategic analysis → mustard footer
 */

import React from "react";
import { RecommendationContent } from "@/services/recommendationService";

// ---------------------------------------------------------------------------
// MarkdownRenderer
// ---------------------------------------------------------------------------

interface MarkdownRendererProps { content: string; }

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    if (!content) return null;

    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];
    let inTable = false;

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
            <div key={key} className="my-6 overflow-x-auto">
                <table className="w-full text-sm text-left font-serif border-collapse">
                    <thead>
                        <tr className="bg-[#576238] text-white">
                            {tableBuffer[0].split("|").filter(c => c.trim()).map((h, i) => (
                                <th key={i} className="py-2 px-3 font-bold uppercase tracking-wide text-xs">
                                    {h.trim()}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableBuffer.slice(2).map((row, rI) => (
                            <tr key={rI} className={rI % 2 === 0 ? "bg-[#F4F1EA]" : "bg-white"}>
                                {row.split("|").filter(c => c.trim()).map((cell, cI) => (
                                    <td key={cI} className="py-2 px-3 align-top text-gray-800 border border-gray-200">
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
        }

        if (trimmed.startsWith("---")) {
            elements.push(<hr key={index} className="my-6 border-t border-[#576238]/30" />);
            return;
        }
        if (/^###\s/.test(trimmed)) {
            elements.push(
                <h3 key={index} className="text-base font-bold text-[#576238] uppercase tracking-wider mt-8 mb-3 border-b border-[#576238]/20 pb-2 font-sans">
                    {trimmed.replace(/^###\s+/, "").replace(/\*\*/g, "").trim()}
                </h3>
            );
            return;
        }
        if (/^####\s/.test(trimmed)) {
            elements.push(
                <h4 key={index} className="text-sm font-bold text-gray-800 mt-5 mb-2 font-sans">
                    {trimmed.replace(/^####\s+/, "").replace(/\*\*/g, "").trim()}
                </h4>
            );
            return;
        }
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            elements.push(
                <div key={index} className="flex gap-3 ml-4 mb-2 text-gray-800 font-serif">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#ffd95d] shrink-0" />
                    {parseLine(trimmed.substring(2), index)}
                </div>
            );
            return;
        }
        if (trimmed.startsWith("> ")) {
            elements.push(
                <blockquote key={index} className="border-l-4 border-[#ffd95d] pl-4 py-2 my-4 italic text-gray-600 bg-[#fffbea] rounded-r font-serif">
                    {trimmed.substring(2)}
                </blockquote>
            );
            return;
        }
        if (trimmed) elements.push(parseLine(trimmed, index));
    });

    if (inTable && tableBuffer.length > 0) {
        const tbl = flushTable("table-end");
        if (tbl) elements.push(tbl);
    }

    return <div className="markdown-content">{elements}</div>;
};

// ---------------------------------------------------------------------------
// buildReportMarkdown — returns ONLY the strategic analysis markdown
// (refined statements and company overview are handled separately)
// ---------------------------------------------------------------------------

export function buildReportMarkdown(data: any): string {
    const report =
        data?.recommendation_report ||
        data?.recommendationReport  ||
        data?.final_report          ||
        data?.finalReport           ||
        "";

    let md = report.replace(/^### /gm, "\n### ");

    const isPlaceholder = (t: string) =>
        !t || t.includes("See detailed report") || t.includes("Investment Memo Generated");

    const summary = data?.Summary || data?.summary || "";
    if (!isPlaceholder(summary)) md += `\n\n### Executive Summary\n${summary}`;

    const keyPoints: string[] = data?.KeyPoints || data?.keyPoints || [];
    const validPoints = keyPoints.filter((p: string) => !isPlaceholder(p));
    if (validPoints.length > 0)
        md += `\n\n### Key Analysis\n${validPoints.map((p: string) => `* ${p}`).join("\n")}`;

    const actionPlan = data?.ActionPlan || data?.actionPlan || "";
    if (!isPlaceholder(actionPlan)) md += `\n\n### Strategic Action Plan\n${actionPlan}`;

    if (!md.trim()) {
        md =
            "### Report Generation in Progress\n\nPlease wait while the AI analyses your " +
            "startup data. If this persists, try regenerating the recommendation.";
    }

    return md;
}

// ---------------------------------------------------------------------------
// InvestmentMemoView — full A4-style memo layout (matches PDF theme)
// Structure:  olive header → mustard stripe → company overview
//          → refined statements → strategic analysis → mustard footer
// ---------------------------------------------------------------------------

interface InvestmentMemoViewProps { data: RecommendationContent | any; }

const REFINED_LABELS: Record<string, string> = {
    problem_statement:  "Problem Statement",
    founder_market_fit: "Founder-Market Fit",
    differentiation:    "Differentiation",
    core_stickiness:    "Core Stickiness",
    five_year_vision:   "Five-Year Vision",
    beachhead_market:   "Beachhead Market",
    gap_analysis:       "Gap Analysis",
};

export const InvestmentMemoView: React.FC<InvestmentMemoViewProps> = ({ data }) => {
    const ins     = data?.insights ?? {};
    const refined: Record<string, { original: string; recommended: string; why_better: string }> =
        data?.refined_statements ?? data?.refinedStatements ?? {};
    const finalContent = buildReportMarkdown(data);

    const overviewRows: [string, string][] = [
        ins.company_name     && ["Company Name",  ins.company_name],
        ins.stage            && ["Stage",         ins.stage],
        ins.target_raise     && ["Target Raise",  ins.target_raise],
        ins.problem_statement && ["Problem",       ins.problem_statement],
    ].filter(Boolean) as [string, string][];

    return (
        <div className="bg-white text-black w-full mx-auto shadow-2xl rounded overflow-hidden">

            {/* ── Olive header band ── */}
            <div className="bg-[#576238] text-white px-10 py-6">
                <p className="text-xs uppercase tracking-widest opacity-70 mb-1 font-sans">Spark2Scale</p>
                <h1 className="text-xl font-bold font-sans">Recommendation Agent</h1>
                <p className="text-sm opacity-75 mt-1">Strategic Analysis Report</p>
            </div>

            {/* ── Mustard accent stripe ── */}
            <div className="h-1.5 bg-[#ffd95d]" />

            <div className="px-10 py-8 space-y-10">

                {/* ── Report date ── */}
                <p className="text-xs text-gray-400">
                    Generated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>

                {/* ── Company Overview ── */}
                {overviewRows.length > 0 && (
                    <section>
                        <SectionHeader title="Company Overview" />
                        <table className="w-full border-collapse text-sm mt-1">
                            <tbody>
                                {overviewRows.map(([label, val], i) => (
                                    <tr key={i} className={i % 2 === 0 ? "bg-[#F4F1EA]" : "bg-white"}>
                                        <td className="font-bold text-[#576238] px-4 py-2.5 w-40 border border-gray-200 align-top">
                                            {label}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-700 border border-gray-200">
                                            {val}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                {/* ── Refined Statements (BEFORE Strategic Analysis / Core Hypothesis) ── */}
                {Object.keys(refined).length > 0 && (
                    <section>
                        <SectionHeader title="Refined Statements" />
                        <p className="text-xs text-gray-500 italic mt-2 mb-4">
                            AI-enhanced versions of your key statements for improved investor appeal.
                        </p>

                        <div className="space-y-6">
                            {Object.entries(refined).map(([key, val]) => (
                                <div key={key}>
                                    {/* Statement label strip */}
                                    <div className="flex items-stretch gap-0 bg-[#F4F1EA] overflow-hidden rounded-t">
                                        <div className="w-1 bg-[#576238] shrink-0" />
                                        <span className="font-bold text-[#576238] text-xs uppercase tracking-widest px-3 py-2">
                                            {REFINED_LABELS[key] ?? key.replace(/_/g, " ")}
                                        </span>
                                    </div>

                                    <div className="border border-t-0 border-gray-200 rounded-b px-4 pt-4 pb-3 space-y-3 bg-white">
                                        {/* Original */}
                                        <div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
                                                Original
                                            </span>
                                            <p className="text-sm text-gray-500 italic leading-relaxed">{val.original}</p>
                                        </div>

                                        {/* Refined (mustard highlight) */}
                                        <div className="bg-[#fffbea] border border-[#ffd95d] rounded-md px-4 py-3">
                                            <span className="text-xs font-bold text-[#576238] uppercase tracking-widest block mb-1">
                                                Refined
                                            </span>
                                            <p className="text-sm font-semibold text-gray-900 leading-relaxed">{val.recommended}</p>
                                        </div>

                                        {/* Why Better */}
                                        <div>
                                            <span className="text-xs font-bold text-green-700 uppercase tracking-widest block mb-1">
                                                Why Better
                                            </span>
                                            <p className="text-sm text-gray-600 italic leading-relaxed">{val.why_better}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Strategic Analysis & Recommendations ── */}
                <section>
                    <SectionHeader title="Strategic Analysis & Recommendations" />
                    <div className="mt-4">
                        <MarkdownRenderer content={finalContent} />
                    </div>
                </section>
            </div>

            {/* ── Mustard footer ── */}
            <div className="bg-[#ffd95d] px-10 py-3 text-center text-xs font-medium text-[#2c3e50]">
                Generated by Spark2Scale Recommendation Agent
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Shared section-header component (olive band, white text)
// ---------------------------------------------------------------------------
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-[#576238] text-white px-4 py-2 font-bold text-xs uppercase tracking-widest font-sans rounded-sm">
        {title}
    </div>
);
