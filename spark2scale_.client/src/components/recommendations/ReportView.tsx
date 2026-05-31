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

    // Inline tokens: **bold**, [text](url) links, bare URLs, _italic_.
    // Order matters — links/URLs are matched before italic so underscores inside
    // a URL aren't mistaken for emphasis.
    const INLINE_RE = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/[^\s)]+|_[^_]+_)/g;
    const linkClass =
        "text-[#576238] underline decoration-[#ffd95d] underline-offset-2 hover:text-[#464f2d] break-words";

    const renderInline = (text: string): React.ReactNode[] =>
        text.split(INLINE_RE).filter(p => p !== undefined && p !== "").map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**"))
                return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
            const md = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
            if (md)
                return <a key={i} href={md[2]} target="_blank" rel="noopener noreferrer" className={linkClass}>{md[1]}</a>;
            if (/^https?:\/\/[^\s)]+$/.test(part))
                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={linkClass}>{part}</a>;
            if (part.startsWith("_") && part.endsWith("_") && part.length > 2)
                return <em key={i} className="italic text-gray-800">{part.slice(1, -1)}</em>;
            return <React.Fragment key={i}>{part}</React.Fragment>;
        });

    const parseLine = (text: string, key: number) => (
        <p key={key} className="mb-3 text-gray-800 leading-relaxed font-serif text-base">
            {renderInline(text)}
        </p>
    );

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

// A statement is "missing" when the founder never provided one (the backend
// echoes Unknown/N/A for absent insights). In that case the agent still
// generates a refined version, but there is nothing to be "better" than.
export function isMissingStatement(s: unknown): boolean {
    const t = String(s ?? "").trim().toLowerCase();
    return t === "" || t === "unknown" || t === "n/a" || t === "na"
        || t === "none" || t === "null" || t === "undefined";
}

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

// ---------------------------------------------------------------------------
// Market Intelligence + Detected Patterns — themed helpers & sections
// ---------------------------------------------------------------------------

// Human-readable labels for World Bank indicator keys.
const INDICATOR_LABELS: Record<string, string> = {
    inflation_rate: "Inflation Rate",
    gdp_growth_rate: "GDP Growth Rate",
    unemployment_rate: "Unemployment Rate",
    "government_debt_%_of_gdp": "Government Debt (% of GDP)",
    ease_of_doing_business_score: "Ease of Doing Business",
};
function prettyIndicator(key: string): string {
    if (INDICATOR_LABELS[key]) return INDICATOR_LABELS[key];
    return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).replace(/Gdp/g, "GDP");
}

// Risk level → themed badge classes (red / amber / olive-green).
function riskBadge(risk: string): string {
    switch ((risk || "").toLowerCase()) {
        case "high":   return "bg-red-100 text-red-700 border border-red-200";
        case "medium": return "bg-amber-100 text-amber-800 border border-amber-200";
        case "low":    return "bg-[#eef2e3] text-[#576238] border border-[#576238]/20";
        default:       return "bg-gray-100 text-gray-500 border border-gray-200";
    }
}

// Funding climate → themed badge classes.
function climateBadge(climate: string): string {
    switch ((climate || "").toLowerCase()) {
        case "active":      return "bg-[#eef2e3] text-[#576238] border border-[#576238]/20";
        case "challenging": return "bg-red-100 text-red-700 border border-red-200";
        default:            return "bg-amber-100 text-amber-800 border border-amber-200"; // Neutral
    }
}

// Pattern strength label → themed badge + row tint.
function patternStyle(label: string): { badge: string; row: string; icon: string } {
    switch ((label || "").toLowerCase()) {
        case "kill_signal":
            return { badge: "bg-red-600 text-white", row: "bg-red-50", icon: "🛑" };
        case "strong":
            return { badge: "bg-amber-500 text-white", row: "bg-[#fffbea]", icon: "⚠️" };
        case "moderate":
            return { badge: "bg-[#576238] text-white", row: "bg-white", icon: "•" };
        default:
            return { badge: "bg-gray-300 text-gray-700", row: "bg-white", icon: "•" };
    }
}

const MarketIntelligenceSection: React.FC<{ signals: any }> = ({ signals }) => {
    if (!signals || typeof signals !== "object") return null;
    const countryRisk: Record<string, any> = signals.country_risk ?? {};
    const riskFlags: string[] = Array.isArray(signals.risk_flags) ? signals.risk_flags : [];
    const indicators = Object.entries(countryRisk);
    const baseline = countryRisk?.inflation_rate?.global_baseline;
    const toolStatus = signals.tool_status ?? {};

    // Nothing meaningful to show.
    if (indicators.length === 0 && riskFlags.length === 0 && !signals.funding_climate) return null;

    return (
        <section>
            <SectionHeader title="🌍 Market Intelligence" upper={false} />

            {/* Funding climate + intel confidence badges */}
            <div className="flex flex-wrap gap-2 mt-3 mb-4">
                {signals.funding_climate && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${climateBadge(signals.funding_climate)}`}>
                        Funding Climate: {signals.funding_climate}
                    </span>
                )}
                {signals.confidence && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#576238]/10 text-[#576238] border border-[#576238]/20">
                        Intel Confidence: {String(signals.confidence).toUpperCase()}
                    </span>
                )}
            </div>

            {/* Country risk table */}
            {indicators.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-[#576238] text-white">
                                <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Macro Indicator</th>
                                <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Value</th>
                                <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Risk</th>
                            </tr>
                        </thead>
                        <tbody>
                            {indicators.map(([key, d]: [string, any], i) => (
                                <tr key={key} className={i % 2 === 0 ? "bg-[#F4F1EA]" : "bg-white"}>
                                    <td className="py-2 px-3 align-top font-bold text-[#576238] border border-gray-200">
                                        {prettyIndicator(key)}
                                    </td>
                                    <td className="py-2 px-3 align-top text-gray-800 border border-gray-200">
                                        {d?.value != null ? `${d.value}%` : "—"}
                                    </td>
                                    <td className="py-2 px-3 align-top border border-gray-200">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${riskBadge(d?.risk)}`}>
                                            {d?.risk ?? "unknown"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Inflation baseline note */}
            {baseline && baseline.mean != null && (
                <p className="text-xs text-gray-500 italic mt-2">
                    Inflation is benchmarked against a live global average of {baseline.mean}%
                    {baseline.std != null ? ` (±${baseline.std}` : ""}
                    {baseline.n != null ? `, n=${baseline.n} countries` : ""}
                    {baseline.std != null ? ", outlier-trimmed)" : ""}.
                </p>
            )}

            {/* Auto-generated risk flags */}
            {riskFlags.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-bold text-gray-800 mb-2 font-sans">Auto-Generated Risk Flags</h4>
                    <ul className="space-y-1.5">
                        {riskFlags.map((flag, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-700">
                                <span className="mt-1.5 h-2 w-2 rounded-full bg-[#ffd95d] shrink-0" />
                                <span>{flag}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Data sources / tool status footnote */}
            <p className="text-[11px] text-gray-400 mt-3">
                Sources: World Bank ({toolStatus.world_bank ?? "n/a"}) · Tavily ({toolStatus.tavily ?? "n/a"}).
            </p>
        </section>
    );
};

const DetectedPatternsSection: React.FC<{ patterns: any[] }> = ({ patterns }) => {
    if (!Array.isArray(patterns) || patterns.length === 0) return null;

    return (
        <section>
            <SectionHeader title="🛑 Detected Failure Patterns" upper={false} />
            <p className="text-sm text-gray-700 mt-2 mb-4">
                Risk patterns surfaced from the startup's own scores, weighted by stage.
                <span className="ml-1 font-semibold text-red-600">Kill signals</span> are the most urgent.
            </p>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-[#576238] text-white">
                            <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Pattern</th>
                            <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Severity</th>
                            <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Strength</th>
                            <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Confidence</th>
                            <th className="py-2 px-3 font-bold uppercase tracking-wide text-xs">Recommended Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patterns.map((p: any, i) => {
                            const style = patternStyle(p?.strength_label);
                            return (
                                <tr key={p?.pattern_id ?? i} className={style.row}>
                                    <td className="py-2 px-3 align-top font-bold text-[#576238] border border-gray-200">
                                        {style.icon} {p?.name ?? p?.pattern_id ?? "—"}
                                    </td>
                                    <td className="py-2 px-3 align-top border border-gray-200">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${riskBadge(p?.severity)}`}>
                                            {p?.severity ?? "—"}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3 align-top border border-gray-200">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${style.badge}`}>
                                            {p?.strength_score != null ? Number(p.strength_score).toFixed(2) : "—"}
                                            {p?.strength_label ? ` · ${String(p.strength_label).replace(/_/g, " ")}` : ""}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3 align-top text-gray-700 border border-gray-200">
                                        {p?.confidence ?? "—"}
                                    </td>
                                    <td className="py-2 px-3 align-top text-gray-800 border border-gray-200">
                                        {p?.template ?? "—"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

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

    const marketSignals = data?.market_signals ?? data?.marketSignals ?? null;
    const patterns: any[] = data?.matched_patterns ?? data?.matchedPatterns ?? [];

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
                                        const missing = isMissingStatement(val.original);
                                        return (
                                            <tr key={key} className={i % 2 === 0 ? "bg-[#F4F1EA]" : "bg-white"}>
                                                <td className="py-2 px-3 align-top font-bold text-[#576238] border border-gray-200">
                                                    {REFINED_LABELS[key] ?? key.replace(/_/g, " ")}
                                                </td>
                                                <td className="py-2 px-3 align-top text-gray-500 italic border border-gray-200">
                                                    {missing ? "None" : val.original}
                                                </td>
                                                <td className="py-2 px-3 align-top font-medium text-gray-900 border border-gray-200">
                                                    {val.recommended}
                                                </td>
                                                <td className="py-2 px-3 align-top text-gray-600 border border-gray-200">
                                                    {missing ? "None" : val.why_better}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* ── 🌍 Market Intelligence (live World Bank + Tavily) ── */}
                <MarketIntelligenceSection signals={marketSignals} />

                {/* ── 🛑 Detected Failure Patterns (stage-weighted) ── */}
                <DetectedPatternsSection patterns={patterns} />

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