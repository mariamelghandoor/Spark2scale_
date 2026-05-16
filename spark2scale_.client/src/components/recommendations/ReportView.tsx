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
        data?.recommendationReport ||
        data?.final_report ||
        data?.finalReport ||
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
    problem_statement: "Problem Statement",
    founder_market_fit: "Founder-Market Fit",
    differentiation: "Differentiation",
    core_stickiness: "Core Stickiness",
    five_year_vision: "Five-Year Vision",
    beachhead_market: "Beachhead Market",
    gap_analysis: "Gap Analysis",
};

// Fixed render order — mirrors the backend OutputManager.statement_types so the
// "[REPORT] Statement Refinements" table is identical to recommendation.md.
const REFINED_ORDER: string[] = [
    "problem_statement",
    "founder_market_fit",
    "differentiation",
    "core_stickiness",
    "five_year_vision",
    "beachhead_market",
    "gap_analysis",
];

// Matches Python: datetime.strftime('%B %d, %Y at %I:%M %p')
function formatGenerated(d: Date = new Date()): string {
    const month = d.toLocaleString("en-US", { month: "long" });
    const day   = d.getDate();
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const hh = String(h).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${month} ${day}, ${d.getFullYear()} at ${hh}:${mm} ${ampm}`;
}

export const InvestmentMemoView: React.FC<InvestmentMemoViewProps> = ({ data }) => {
    const ins = data?.insights ?? {};
    const refined: Record<string, { original: string; recommended: string; why_better: string }> =
        data?.refined_statements ?? data?.refinedStatements ?? {};
    const finalContent = buildReportMarkdown(data);
    const companyName  = ins.company_name || "Startup";

    // Mirrors recommendation.md "[DATA] Company Overview" table exactly.
    const overviewRows: [string, string][] = [
        ["Company Name", String(ins.company_name ?? "N/A")],
        ["Stage",        String(ins.stage ?? "N/A")],
        ["Target Raise", String(ins.target_raise ?? "N/A")],
        ["Generated",    formatGenerated()],
    ];

    const refinedKeys = REFINED_ORDER.filter(
        k => refined[k] && typeof refined[k] === "object",
    );

    return (
        <div className="bg-white text-black w-full mx-auto shadow-2xl rounded overflow-hidden">

            {/* ── Olive header band ── */}
            <div className="bg-[#576238] text-white px-10 py-6">
                <h1 className="text-xl font-bold font-sans">[LAUNCH] Spark2Scale Recommendation Agent</h1>
            </div>

            {/* ── Strategic Recommendations sub-banner (olive gradient) ── */}
            <div
                className="px-10 py-4 text-white"
                style={{ background: "linear-gradient(135deg, #4a5f2d 0%, #7b8f4a 100%)" }}
            >
                <h2 className="text-lg font-bold font-sans">
                    Strategic Recommendations for {companyName}
                </h2>
            </div>

            {/* ── Mustard accent stripe ── */}
            <div className="h-1.5 bg-[#ffd95d]" />

            <div className="px-10 py-8 space-y-10">

                {/* ── [DATA] Company Overview ── */}
                <section>
                    <SectionHeader title="[DATA] Company Overview" upper={false} />
                    <table className="w-full border-collapse text-sm mt-1">
                        <thead>
                            <tr className="bg-[#576238] text-white">
                                <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-xs w-44">Attribute</th>
                                <th className="px-4 py-2 text-left font-bold uppercase tracking-wide text-xs">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {overviewRows.map(([label, val], i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-[#F4F1EA]" : "bg-white"}>
                                    <td className="font-bold text-[#576238] px-4 py-2.5 w-44 border border-gray-200 align-top">
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

                {/* ── [REPORT] Statement Refinements (4-col table) ── */}
                {refinedKeys.length > 0 && (
                    <section>
                        <SectionHeader title="[REPORT] Statement Refinements" upper={false} />
                        <p className="text-sm text-gray-700 mt-2 mb-4">
                            <strong>AI-Enhanced Core Messaging</strong> — Improved versions of your key
                            statements for better clarity and investor appeal.
                        </p>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#576238] text-white">
                                        <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Category</th>
                                        <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Original Statement</th>
                                        <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Refined Statement</th>
                                        <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Why It's Better</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {refinedKeys.map((key, i) => {
                                        const val = refined[key];
                                        return (
                                            <tr key={key} className={i % 2 === 0 ? "bg-[#F4F1EA]" : "bg-white"}>
                                                <td className="py-2 px-3 align-top font-bold text-[#576238] border border-gray-200">
                                                    {REFINED_LABELS[key] ?? key.replace(/_/g, " ")}
                                                </td>
                                                <td className="py-2 px-3 align-top text-gray-500 italic border border-gray-200">
                                                    {val.original}
                                                </td>
                                                <td className="py-2 px-3 align-top font-medium text-gray-900 border border-gray-200">
                                                    {val.recommended}
                                                </td>
                                                <td className="py-2 px-3 align-top text-gray-600 border border-gray-200">
                                                    {val.why_better}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* ── 📋 Strategic Analysis & Recommendations ── */}
                <section>
                    <SectionHeader title="📋 Strategic Analysis & Recommendations" upper={false} />
                    <div className="mt-4">
                        <MarkdownRenderer content={finalContent} />
                    </div>
                </section>

                {/* ── [IDEA] About This Report ── */}
                <section>
                    <SectionHeader title="[IDEA] About This Report" upper={false} />
                    <div className="mt-3 bg-[#f9faf6] border-l-4 border-[#4a5f2d] rounded px-5 py-4">
                        <p className="text-sm text-gray-700 leading-relaxed">
                            This strategic recommendation report was generated by the{" "}
                            <strong>Spark2Scale AI Recommendation Agent</strong> using advanced
                            evaluation algorithms and AI-powered analysis. The recommendations are
                            based on startup evaluation data, market research, and industry best
                            practices.
                        </p>
                        <p className="text-sm text-[#7b8f4a] italic mt-3">
                            [WARNING] <strong>Note:</strong> This is an automated analysis. Please
                            use professional judgment when implementing these recommendations.
                        </p>
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
const SectionHeader: React.FC<{ title: string; upper?: boolean }> = ({ title, upper = true }) => (
    <div
        className={`bg-[#576238] text-white px-4 py-2 font-bold tracking-widest font-sans rounded-sm ${
            upper ? "text-xs uppercase" : "text-sm"
        }`}
    >
        {title}
    </div>
);