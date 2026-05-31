"use client";

/**
 * RecommendationCard.tsx
 * -----------------------
 * Card for a single recommendation report.
 * Supports:
 *  • Incremental naming  — "Recommendation 1", "Recommendation 2", …
 *  • View in modal       — full InvestmentMemoView
 *  • Download PDF        — jsPDF text-only (Spark2Scale branded, no html2canvas)
 *
 * "Mark as Complete" lives on the PAGE, not on each card.
 */

import React, { useState } from "react";
import { Eye, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import jsPDF from "jspdf";
import { DBRecommendation, RecommendationContent } from "@/services/recommendationService";
import { InvestmentMemoView, buildReportMarkdown, isMissingStatement } from "./ReportView";
import LegoSpinner from "@/components/lego/LegoSpinner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseContent(raw: any): RecommendationContent | any {
    if (!raw) return {};
    let value = raw;
    for (let i = 0; i < 2; i++) {
        if (typeof value !== "string") break;
        try { value = JSON.parse(value); } catch { return {}; }
    }
    if (typeof value !== "object" || value === null) return {};
    if (process.env.NODE_ENV !== "production") {
        console.debug("[RecommendationCard] content keys:", Object.keys(value));
    }
    return value;
}

function formatDate(dateStr: string): string {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric",
        });
    } catch { return dateStr; }
}

// ---------------------------------------------------------------------------
// PDF Export — Spark2Scale branded, jsPDF text-only
// Inspired by the Python reportlab OutputManager structure:
//   1. Olive header band
//   2. Company Overview table
//   3. Evaluation Scores table
//   4. Refined Statements (original → refined → why better)
//   5. Strategic Analysis (full markdown)
//   6. Mustard-accented footers
// ---------------------------------------------------------------------------

type RGB = [number, number, number];
// Exact hex values from InvestmentMemoView / ReportView.tsx
const OLIVE:   RGB = [87,  98,  56];   // #576238  (header, section headers, table header)
const MUSTARD: RGB = [255, 217, 93];   // #ffd95d  (accent stripe, bullets, refined box border)
const ALT_ROW: RGB = [244, 241, 234];  // #F4F1EA  (alternating table row — matches Tailwind class)
const DARK:    RGB = [44,  62,  80];   // #2c3e50  (body text)
const MID:     RGB = [80,  80,  80];   // mid-grey
const WHITE:   RGB = [255, 255, 255];
const OLIVE2:  RGB = [123, 143, 74];   // #7b8f4a  (sub-banner — matches recommendation.md gradient end)

// Matches Python OutputManager: datetime.strftime('%B %d, %Y at %I:%M %p')
function formatGenerated(d: Date = new Date()): string {
    const month = d.toLocaleString("en-US", { month: "long" });
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const hh = String(h).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${month} ${d.getDate()}, ${d.getFullYear()} at ${hh}:${mm} ${ampm}`;
}

// Fixed order — mirrors backend OutputManager.statement_types.
const REFINED_ORDER: string[] = [
    "problem_statement", "founder_market_fit", "differentiation",
    "core_stickiness", "five_year_vision", "beachhead_market", "gap_analysis",
];

/** Renders inline **bold** text with word-wrap, returns new Y. */
function renderInline(
    pdf: jsPDF,
    rawText: string,
    x: number,
    startY: number,
    maxW: number,
    fontSize: number,
    color: RGB,
    lineH: number,
    pageH: number,
    addPageFn: () => void,
): number {
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);

    // jsPDF can't render clickable inline links, so flatten [text](url) -> "text (url)"
    // and keep the URL visible for credibility.
    rawText = rawText.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)");

    const segments: { text: string; bold: boolean }[] = [];
    rawText.split(/(\*\*[^*]+\*\*)/g).forEach(part => {
        if (!part) return;
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
            segments.push({ text: part.slice(2, -2), bold: true });
        else
            segments.push({ text: part, bold: false });
    });

    let cx = x, cy = startY;
    for (const seg of segments) {
        pdf.setFont("helvetica", seg.bold ? "bold" : "normal");
        for (const word of seg.text.split(" ").map((w, i, a) => w + (i < a.length - 1 ? " " : ""))) {
            const ww = pdf.getTextWidth(word);
            if (cx + ww > x + maxW && cx > x) {
                cy += lineH;
                if (cy > pageH - 50) { addPageFn(); cy = 60; }
                cx = x;
            }
            pdf.text(word, cx, cy);
            cx += ww;
        }
    }
    return cy + lineH;
}

// ── Shared PDF section-header band (mirrors SectionHeader React component) ──
function pdfSectionHeader(
    pdf: jsPDF, title: string, x: number, y: number, w: number,
): number {
    const H = 22;
    pdf.setFillColor(...OLIVE);
    pdf.roundedRect(x, y, w, H, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...WHITE);
    pdf.text(title.toUpperCase(), x + 10, y + H / 2 + 3);
    return y + H + 8;   // return next y (header height + small gap below)
}

function exportToPDF(contentData: any, _cardName: string, filename: string): void {
    const md    = buildReportMarkdown(contentData);
    const pdf   = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const M     = 50;                   // left / right margin
    const maxW  = pageW - M * 2;
    const FOOTER_H = 28;                // reserved for mustard footer
    const LINE_H   = 14;               // body line-height  (≈ leading-relaxed at 9pt)

    let y = 0;
    const addPage = () => {
        pdf.addPage();
        // Olive header micro-band on continuation pages
        pdf.setFillColor(...OLIVE);
        pdf.rect(0, 0, pageW, 22, "F");
        pdf.setFillColor(...MUSTARD);
        pdf.rect(0, 22, pageW, 4, "F");
        y = 40;
    };
    const check = (n: number) => { if (y + n > pageH - FOOTER_H - M) addPage(); };

    const ins = contentData?.insights ?? {};
    const companyName = ins.company_name || "Startup";

    // ─────────────────────────────────────────────────────────────────────
    // 1.  HEADER  — "[LAUNCH] Spark2Scale Recommendation Agent"
    //     + sub-banner "Strategic Recommendations for {company}"
    //     (mirrors recommendation.md header block)
    // ─────────────────────────────────────────────────────────────────────
    pdf.setFillColor(...OLIVE);
    pdf.rect(0, 0, pageW, 56, "F");
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...WHITE);
    pdf.text("[LAUNCH] Spark2Scale Recommendation Agent", M, 35);

    // Sub-banner (olive → lighter-olive, like the .md gradient)
    pdf.setFillColor(...OLIVE2);
    pdf.rect(0, 56, pageW, 34, "F");
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...WHITE);
    pdf.text(
        pdf.splitTextToSize(`Strategic Recommendations for ${companyName}`, maxW)[0],
        M, 78,
    );

    // Mustard accent stripe
    pdf.setFillColor(...MUSTARD);
    pdf.rect(0, 90, pageW, 6, "F");

    y = 120;

    // ─────────────────────────────────────────────────────────────────────
    // 2.  [DATA] Company Overview  (Attribute | Details — matches the .md table)
    // ─────────────────────────────────────────────────────────────────────
    const overviewRows: [string, string][] = [
        ["Company Name", String(ins.company_name ?? "N/A")],
        ["Stage",        String(ins.stage ?? "N/A")],
        ["Target Raise", String(ins.target_raise ?? "N/A")],
        ["Generated",    formatGenerated()],
    ];

    {
        check(110);
        y = pdfSectionHeader(pdf, "[DATA] Company Overview", M, y, maxW);

        const labelW = 140;
        const valW   = maxW - labelW;

        // Header row (Attribute | Details)
        const HDR_H = 18;
        pdf.setFillColor(...OLIVE);
        pdf.rect(M, y, maxW, HDR_H, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(...WHITE);
        pdf.text("ATTRIBUTE", M + 8, y + 12);
        pdf.text("DETAILS",   M + labelW + 8, y + 12);
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.rect(M, y, maxW, HDR_H, "S");
        pdf.line(M + labelW, y, M + labelW, y + HDR_H);
        y += HDR_H;

        overviewRows.forEach(([label, val], ri) => {
            pdf.setFontSize(9);
            const valLines = pdf.splitTextToSize(val, valW - 12);
            const rowH = Math.max(valLines.length * LINE_H, 14) + 8;
            check(rowH);

            pdf.setFillColor(...(ri % 2 === 0 ? ALT_ROW : WHITE));
            pdf.rect(M, y, maxW, rowH, "F");
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.3);
            pdf.rect(M, y, maxW, rowH, "S");
            pdf.line(M + labelW, y, M + labelW, y + rowH);

            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...OLIVE);
            pdf.text(label, M + 8, y + 10);

            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...DARK);
            pdf.text(valLines, M + labelW + 8, y + 10);

            y += rowH;
        });
        y += 28;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3.  [REPORT] Statement Refinements  (4-col table — matches the .md)
    // ─────────────────────────────────────────────────────────────────────
    const refined: Record<string, { original: string; recommended: string; why_better: string }> =
        contentData?.refined_statements ?? contentData?.refinedStatements ?? {};

    const LABELS: Record<string, string> = {
        problem_statement:  "Problem Statement",
        founder_market_fit: "Founder-Market Fit",
        differentiation:    "Differentiation",
        core_stickiness:    "Core Stickiness",
        five_year_vision:   "Five-Year Vision",
        beachhead_market:   "Beachhead Market",
        gap_analysis:       "Gap Analysis",
    };
    const refinedKeys = REFINED_ORDER.filter(
        k => refined[k] && typeof refined[k] === "object",
    );

    if (refinedKeys.length > 0) {
        check(60);
        y = pdfSectionHeader(pdf, "[REPORT] Statement Refinements", M, y, maxW);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...DARK);
        pdf.text(
            pdf.splitTextToSize(
                "AI-Enhanced Core Messaging — Improved versions of your key statements for better clarity and investor appeal.",
                maxW,
            ),
            M, y,
        );
        y += 22;

        // Column geometry: Category | Original | Refined | Why It's Better
        const catW  = 88;
        const colW  = (maxW - catW) / 3;
        const PADX  = 5;
        const cellFont = 8;

        const drawHeaderRow = () => {
            const HDR_H = 20;
            pdf.setFillColor(...OLIVE);
            pdf.rect(M, y, maxW, HDR_H, "F");
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7.5);
            pdf.setTextColor(...WHITE);
            pdf.text("CATEGORY",          M + PADX,                 y + 13);
            pdf.text("ORIGINAL STATEMENT", M + catW + PADX,         y + 13);
            pdf.text("REFINED STATEMENT",  M + catW + colW + PADX,  y + 13);
            pdf.text("WHY IT'S BETTER",    M + catW + 2 * colW + PADX, y + 13);
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.3);
            pdf.rect(M, y, maxW, HDR_H, "S");
            [catW, catW + colW, catW + 2 * colW].forEach(off =>
                pdf.line(M + off, y, M + off, y + HDR_H));
            y += HDR_H;
        };

        check(40);
        drawHeaderRow();

        refinedKeys.forEach((key, ri) => {
            const d = refined[key];
            const label = LABELS[key] ?? key.replace(/_/g, " ");
            pdf.setFontSize(cellFont);
            // No original provided → keep the agent's refined text, but show
            // "None" for the original and the why-better (nothing to compare).
            const missing = isMissingStatement(d.original);
            const cat = pdf.splitTextToSize(label,                       catW - 2 * PADX);
            const org = pdf.splitTextToSize(missing ? "None" : String(d.original    ?? ""), colW - 2 * PADX);
            const rec = pdf.splitTextToSize(String(d.recommended ?? ""), colW - 2 * PADX);
            const why = pdf.splitTextToSize(missing ? "None" : String(d.why_better  ?? ""), colW - 2 * PADX);
            const maxLines = Math.max(cat.length, org.length, rec.length, why.length);
            const rowH = maxLines * 11 + 12;

            // Page-break: start a fresh page + repeat the header row
            if (y + rowH > pageH - FOOTER_H - M) {
                addPage();
                check(40);
                drawHeaderRow();
            }

            pdf.setFillColor(...(ri % 2 === 0 ? ALT_ROW : WHITE));
            pdf.rect(M, y, maxW, rowH, "F");
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.3);
            pdf.rect(M, y, maxW, rowH, "S");
            [catW, catW + colW, catW + 2 * colW].forEach(off =>
                pdf.line(M + off, y, M + off, y + rowH));

            const ty = y + 11;
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...OLIVE);
            pdf.text(cat, M + PADX, ty);

            pdf.setFont("helvetica", "italic");
            pdf.setTextColor(120, 120, 120);
            pdf.text(org, M + catW + PADX, ty);

            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...DARK);
            pdf.text(rec, M + catW + colW + PADX, ty);

            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...MID);
            pdf.text(why, M + catW + 2 * colW + PADX, ty);

            y += rowH;
        });

        y += 24;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3b.  Market Intelligence  (live World Bank + Tavily)
    // ─────────────────────────────────────────────────────────────────────
    const market: any = contentData?.market_signals ?? {};
    const countryRisk: Record<string, any> = market?.country_risk ?? {};
    const riskFlags: string[] = Array.isArray(market?.risk_flags) ? market.risk_flags : [];
    const riskIndicators = Object.entries(countryRisk);

    const PDF_INDICATOR_LABELS: Record<string, string> = {
        inflation_rate: "Inflation Rate",
        gdp_growth_rate: "GDP Growth Rate",
        unemployment_rate: "Unemployment Rate",
        "government_debt_%_of_gdp": "Government Debt (% of GDP)",
        ease_of_doing_business_score: "Ease of Doing Business",
    };
    const prettyInd = (k: string): string =>
        PDF_INDICATOR_LABELS[k] ?? k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).replace(/Gdp/g, "GDP");

    if (riskIndicators.length > 0 || riskFlags.length > 0 || market?.funding_climate) {
        check(70);
        y = pdfSectionHeader(pdf, "Market Intelligence", M, y, maxW);

        const fc   = market?.funding_climate ? `Funding Climate: ${market.funding_climate}` : "";
        const conf = market?.confidence ? `Intel Confidence: ${String(market.confidence).toUpperCase()}` : "";
        const metaLine = [fc, conf].filter(Boolean).join("     |     ");
        if (metaLine) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            pdf.setTextColor(...OLIVE);
            pdf.text(metaLine, M, y);
            y += 16;
        }

        if (riskIndicators.length > 0) {
            const c0 = maxW * 0.5, c1 = maxW * 0.2;
            const HDR_H = 18;
            pdf.setFillColor(...OLIVE);
            pdf.rect(M, y, maxW, HDR_H, "F");
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(...WHITE);
            pdf.text("MACRO INDICATOR", M + 6, y + 12);
            pdf.text("VALUE", M + c0 + 6, y + 12);
            pdf.text("RISK", M + c0 + c1 + 6, y + 12);
            pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3); pdf.rect(M, y, maxW, HDR_H, "S");
            pdf.line(M + c0, y, M + c0, y + HDR_H); pdf.line(M + c0 + c1, y, M + c0 + c1, y + HDR_H);
            y += HDR_H;
            riskIndicators.forEach(([k, d]: [string, any], ri) => {
                const rowH = 18;
                check(rowH);
                pdf.setFillColor(...(ri % 2 === 0 ? ALT_ROW : WHITE));
                pdf.rect(M, y, maxW, rowH, "F");
                pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3); pdf.rect(M, y, maxW, rowH, "S");
                pdf.line(M + c0, y, M + c0, y + rowH); pdf.line(M + c0 + c1, y, M + c0 + c1, y + rowH);
                pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(...OLIVE);
                pdf.text(pdf.splitTextToSize(prettyInd(k), c0 - 10)[0] ?? k, M + 6, y + 12);
                pdf.setFont("helvetica", "normal"); pdf.setTextColor(...DARK);
                pdf.text(d?.value != null ? `${d.value}%` : "—", M + c0 + 6, y + 12);
                pdf.text(String(d?.risk ?? "unknown"), M + c0 + c1 + 6, y + 12);
                y += rowH;
            });
            y += 8;
        }

        const bl = countryRisk?.inflation_rate?.global_baseline;
        if (bl && bl.mean != null) {
            const note = `Inflation benchmarked against a live global average of ${bl.mean}%` +
                (bl.std != null ? ` (±${bl.std}` : "") +
                (bl.n != null ? `, n=${bl.n} countries` : "") +
                (bl.std != null ? ", outlier-trimmed)" : "") + ".";
            pdf.setFont("helvetica", "italic"); pdf.setFontSize(8); pdf.setTextColor(...MID);
            const noteLines = pdf.splitTextToSize(note, maxW);
            check(noteLines.length * 11 + 4);
            pdf.text(noteLines, M, y);
            y += noteLines.length * 11 + 6;
        }

        if (riskFlags.length > 0) {
            check(16);
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(...DARK);
            pdf.text("Auto-Generated Risk Flags", M, y); y += 14;
            riskFlags.forEach(flag => {
                const flagLines = pdf.splitTextToSize(String(flag), maxW - 14);
                const h = flagLines.length * LINE_H;
                check(h + 2);
                pdf.setFillColor(...MUSTARD); pdf.circle(M + 5, y - 3.5, 2.5, "F");
                pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(...DARK);
                pdf.text(flagLines, M + 14, y);
                y += h + 2;
            });
        }
        y += 18;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3c.  Detected Failure Patterns  (stage-weighted)
    // ─────────────────────────────────────────────────────────────────────
    const patterns: any[] = Array.isArray(contentData?.matched_patterns) ? contentData.matched_patterns : [];
    if (patterns.length > 0) {
        check(60);
        y = pdfSectionHeader(pdf, "Detected Failure Patterns", M, y, maxW);

        const wPat = maxW * 0.24, wSev = maxW * 0.12, wStr = maxW * 0.16, wConf = maxW * 0.12;
        const wAct = maxW - wPat - wSev - wStr - wConf;
        const offs = [0, wPat, wPat + wSev, wPat + wSev + wStr, wPat + wSev + wStr + wConf];
        const PADX = 5, cellFont = 7.5;

        const drawPatHeader = () => {
            const HDR_H = 18;
            pdf.setFillColor(...OLIVE); pdf.rect(M, y, maxW, HDR_H, "F");
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(...WHITE);
            ["PATTERN", "SEVERITY", "STRENGTH", "CONF.", "RECOMMENDED ACTION"].forEach((h, ci) =>
                pdf.text(h, M + offs[ci] + PADX, y + 12));
            pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3); pdf.rect(M, y, maxW, HDR_H, "S");
            offs.slice(1).forEach(o => pdf.line(M + o, y, M + o, y + HDR_H));
            y += HDR_H;
        };
        check(40); drawPatHeader();

        patterns.forEach((p: any, ri) => {
            pdf.setFontSize(cellFont);
            const name = pdf.splitTextToSize(String(p?.name ?? p?.pattern_id ?? "—"), wPat - 2 * PADX);
            const sev  = pdf.splitTextToSize(String(p?.severity ?? "—"), wSev - 2 * PADX);
            const strg = pdf.splitTextToSize(
                (p?.strength_score != null ? Number(p.strength_score).toFixed(2) : "—") +
                (p?.strength_label ? ` ${String(p.strength_label).replace(/_/g, " ")}` : ""), wStr - 2 * PADX);
            const conf = pdf.splitTextToSize(String(p?.confidence ?? "—"), wConf - 2 * PADX);
            const act  = pdf.splitTextToSize(String(p?.template ?? "—"), wAct - 2 * PADX);
            const maxLines = Math.max(name.length, sev.length, strg.length, conf.length, act.length);
            const rowH = maxLines * 10 + 10;

            if (y + rowH > pageH - FOOTER_H - M) { addPage(); check(40); drawPatHeader(); }

            const isKill = String(p?.strength_label).toLowerCase() === "kill_signal";
            const rowColor: RGB = isKill ? [253, 232, 232] : (ri % 2 === 0 ? ALT_ROW : WHITE);
            pdf.setFillColor(...rowColor);
            pdf.rect(M, y, maxW, rowH, "F");
            pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3); pdf.rect(M, y, maxW, rowH, "S");
            offs.slice(1).forEach(o => pdf.line(M + o, y, M + o, y + rowH));

            const ty = y + 10;
            const nameColor: RGB = isKill ? [185, 28, 28] : OLIVE;
            pdf.setFont("helvetica", "bold"); pdf.setTextColor(...nameColor);
            pdf.text(name, M + offs[0] + PADX, ty);
            pdf.setFont("helvetica", "normal"); pdf.setTextColor(...DARK);
            pdf.text(sev,  M + offs[1] + PADX, ty);
            pdf.text(strg, M + offs[2] + PADX, ty);
            pdf.text(conf, M + offs[3] + PADX, ty);
            pdf.text(act,  M + offs[4] + PADX, ty);
            y += rowH;
        });
        y += 20;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4.  📋 Strategic Analysis & Recommendations  (markdown body)
    // ─────────────────────────────────────────────────────────────────────
    check(36);
    y = pdfSectionHeader(pdf, "Strategic Analysis & Recommendations", M, y, maxW);
    y += 6;     // mt-4

    let tableBuf: string[] = [];

    const flushPdfTable = () => {
        if (tableBuf.length === 0) return;
        // Skip separator-only rows (|:---|)
        const rows = tableBuf
            .map(r => r.split("|").filter(c => c.trim()).map(c => c.replace(/\*\*/g, "").trim()))
            .filter(cells => cells.length > 0 && !cells.every(c => /^[-: ]+$/.test(c)));
        if (rows.length === 0) { tableBuf = []; return; }

        const cols = Math.max(...rows.map(r => r.length));
        const colW = maxW / cols;
        const rowH = 20;    // py-2 px-3 in View table

        check(rows.length * rowH + 16);
        // Add my-6 gap above table
        y += 8;

        rows.forEach((cells, ri) => {
            const isHdr = ri === 0;
            pdf.setFillColor(...(isHdr ? OLIVE : (ri % 2 === 1 ? ALT_ROW : WHITE)));
            pdf.rect(M, y, maxW, rowH, "F");
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.3);
            pdf.rect(M, y, maxW, rowH, "S");

            cells.forEach((cell, ci) => {
                if (ci > 0) {
                    pdf.line(M + ci * colW, y, M + ci * colW, y + rowH);
                }
                pdf.setFont("helvetica", isHdr ? "bold" : "normal");
                pdf.setFontSize(8.5);
                pdf.setTextColor(...(isHdr ? WHITE : DARK));
                const cellLines = pdf.splitTextToSize(cell, colW - 8);
                pdf.text(cellLines[0] ?? "", M + ci * colW + 4, y + 13);
            });
            y += rowH;
        });

        tableBuf = [];
        y += 14;    // my-6 gap below table
    };

    for (const line of md.split("\n")) {
        const t = line.trim();

        if (t.startsWith("|")) { tableBuf.push(t); continue; }
        if (tableBuf.length > 0) flushPdfTable();

        // Blank line  (mb-3 paragraph gap)
        if (!t) { y += 12; continue; }

        // Horizontal rule  (border-t border-[#576238]/30 my-6)
        if (/^-{3,}$/.test(t)) {
            check(20);
            y += 6;
            pdf.setDrawColor(...OLIVE);
            pdf.setLineWidth(0.5);
            pdf.line(M, y, pageW - M, y);
            y += 14;
            continue;
        }

        // ## H2 — full olive section-header (same as SectionHeader component)
        if (/^##\s/.test(t)) {
            const text = t.replace(/^##\s+/, "").replace(/\*\*/g, "").trim();
            check(38);
            y += 8;
            y = pdfSectionHeader(pdf, text, M, y, maxW);
            continue;
        }

        // ### H3 — olive bold uppercase + thin border-b line  (text-base mt-8 mb-3)
        if (/^###\s/.test(t)) {
            const text = t.replace(/^###\s+/, "").replace(/\*\*/g, "").trim();
            check(34);
            y += 18;    // mt-8
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...OLIVE);
            const wrapped = pdf.splitTextToSize(text.toUpperCase(), maxW);
            pdf.text(wrapped, M, y);
            y += wrapped.length * 14;
            // border-b border-[#576238]/20 pb-2
            pdf.setDrawColor(87, 98, 56, 0.2);  // olive at 20% — fallback below
            pdf.setDrawColor(185, 195, 170);
            pdf.setLineWidth(0.4);
            pdf.line(M, y + 2, pageW - M, y + 2);
            y += 14;    // mb-3 + pb-2
            continue;
        }

        // #### H4 — dark bold  (text-sm mt-5 mb-2)
        if (/^####\s/.test(t)) {
            const text = t.replace(/^####\s+/, "").replace(/\*\*/g, "").trim();
            check(22);
            y += 12;    // mt-5
            pdf.setFontSize(9.5);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...DARK);
            const wrapped = pdf.splitTextToSize(text, maxW);
            pdf.text(wrapped, M, y);
            y += wrapped.length * 13 + 6;   // mb-2
            continue;
        }

        // Blockquote >  (border-l-4 border-[#ffd95d] pl-4 bg-[#fffbea] my-4)
        if (/^>\s/.test(t)) {
            const text = t.substring(2);
            check(26);
            const bqLines = pdf.splitTextToSize(text, maxW - 22);
            const bqH = bqLines.length * LINE_H + 14;
            y += 6;
            pdf.setFillColor(255, 251, 234);
            pdf.rect(M, y, maxW, bqH, "F");
            pdf.setFillColor(...MUSTARD);
            pdf.rect(M, y, 4, bqH, "F");
            pdf.setFont("helvetica", "italic");
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            pdf.text(bqLines, M + 14, y + 10);
            y += bqH + 10;
            continue;
        }

        // Bullet * or -  (flex gap-3 ml-4 mb-2 + mustard dot h-2 w-2)
        if (/^[*-]\s/.test(t)) {
            check(LINE_H + 4);
            pdf.setFillColor(...MUSTARD);
            pdf.circle(M + 5, y - 3.5, 2.5, "F");
            y = renderInline(pdf, t.substring(2), M + 14, y, maxW - 14, 9, DARK, LINE_H, pageH, addPage);
            y += 4;     // mb-2
            continue;
        }

        // Normal paragraph  (mb-3 leading-relaxed text-base)
        check(LINE_H);
        y = renderInline(pdf, t, M, y, maxW, 9, DARK, LINE_H, pageH, addPage);
        y += 6;     // mb-3 equivalent gap after paragraph
    }

    if (tableBuf.length > 0) flushPdfTable();

    // ─────────────────────────────────────────────────────────────────────
    // 5.  [IDEA] About This Report  (matches the closing block of the .md)
    // ─────────────────────────────────────────────────────────────────────
    {
        const aboutLines = pdf.splitTextToSize(
            "This strategic recommendation report was generated by the Spark2Scale AI " +
            "Recommendation Agent using advanced evaluation algorithms and AI-powered " +
            "analysis. The recommendations are based on startup evaluation data, market " +
            "research, and industry best practices.",
            maxW - 24,
        );
        const noteLines = pdf.splitTextToSize(
            "[WARNING] Note: This is an automated analysis. Please use professional " +
            "judgment when implementing these recommendations.",
            maxW - 24,
        );
        const boxH = aboutLines.length * LINE_H + noteLines.length * LINE_H + 36;

        check(40 + boxH);
        y += 10;
        y = pdfSectionHeader(pdf, "[IDEA] About This Report", M, y, maxW);

        // Light panel with olive left accent (bg-#f9faf6 border-l-4 #4a5f2d)
        pdf.setFillColor(249, 250, 246);
        pdf.rect(M, y, maxW, boxH, "F");
        pdf.setFillColor(...OLIVE);
        pdf.rect(M, y, 4, boxH, "F");

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(...DARK);
        pdf.text(aboutLines, M + 14, y + 16);

        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(...OLIVE2);
        pdf.text(noteLines, M + 14, y + 16 + aboutLines.length * LINE_H + 10);

        y += boxH + 10;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 6.  MUSTARD FOOTER on every page
    //     (matches <div className="bg-[#ffd95d] … text-center text-xs">)
    // ─────────────────────────────────────────────────────────────────────
    const total = (pdf.internal as any).getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFillColor(...MUSTARD);
        pdf.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, "F");
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...DARK);
        pdf.text(
            `Generated by Spark2Scale Recommendation Agent  ·  Page ${i} of ${total}`,
            pageW / 2, pageH - FOOTER_H / 2 + 3,
            { align: "center" },
        );
    }

    pdf.save(filename);
}

// ---------------------------------------------------------------------------
// RecommendationCard
// ---------------------------------------------------------------------------

export interface RecommendationCardProps {
    recommendation: DBRecommendation;
    startupId: string;
    /** e.g. "Recommendation 1", "Recommendation 2" */
    name?: string;
    onDownloadPDF?: (rec: DBRecommendation) => Promise<void>;
    /** When provided, a trash button is shown that calls this handler */
    onDelete?: () => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
    recommendation,
    startupId,
    name = "Recommendations",
    onDownloadPDF,
    onDelete,
}) => {
    const [isPDFLoading,    setIsPDFLoading]    = useState(false);
    const [isDeleting,      setIsDeleting]      = useState(false);
    const [confirmOpen,     setConfirmOpen]     = useState(false);

    const contentData = safeParseContent(
        recommendation.Content ?? (recommendation as any).content,
    );
    const createdAt = recommendation.CreatedAt ?? (recommendation as any).created_at ?? "";
    const stage     = contentData?.stage ?? contentData?.insights?.stage ?? "";

    const handleDownload = async () => {
        if (onDownloadPDF) { await onDownloadPDF(recommendation); return; }
        setIsPDFLoading(true);
        try {
            exportToPDF(contentData, name, `Spark2Scale_${name.replace(/\s+/g, "_")}_${startupId}.pdf`);
        } catch (err) {
            console.error("PDF export failed:", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsPDFLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#576238]/40 bg-white px-6 py-5 shadow-sm ring-1 ring-[#576238]/10 transition-shadow hover:shadow-md">

            {/* Left: icon + metadata */}
            <div className="flex items-start gap-4 min-w-0">
                <div className="shrink-0 rounded-lg bg-[#576238]/10 p-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="h-5 w-5 text-[#576238]">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                        Generated {formatDate(createdAt)}{stage ? ` · ${stage}` : ""}
                    </p>
                </div>
            </div>

            {/* Right: View + Download */}
            <div className="flex items-center gap-2 shrink-0">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm"
                            className="border-[#576238] text-[#576238] hover:bg-[#576238]/5 gap-1.5">
                            <Eye className="h-4 w-4" /> View
                        </Button>
                    </DialogTrigger>
                    {/*
                      * inline style forces size — Tailwind max-w-* is overridden by
                      * shadcn's own stylesheet, but inline style always wins.
                      *
                      * Scroll lives on the INNER div, NOT on DialogContent.
                      * Reason: DialogContent uses display:grid; setting height on a
                      * grid container does not make it scroll — content just overflows.
                      * The inner div has a real block height + overflow-y-auto.
                      */}
                    <DialogContent
                        style={{ width: "95vw", maxWidth: "95vw", height: "94vh" }}
                        className="p-0 bg-[#F4F1EA] overflow-hidden flex flex-col"
                    >
                        <DialogHeader className="sr-only">
                            <DialogTitle>{name}</DialogTitle>
                        </DialogHeader>

                        {/* This div is the actual scrollable document area */}
                        <div className="flex-1 overflow-y-auto">
                            <InvestmentMemoView data={contentData} />
                        </div>
                    </DialogContent>
                </Dialog>

                <Button variant="outline" size="sm"
                    className="border-[#576238] text-[#576238] hover:bg-[#576238]/5 gap-1.5"
                    onClick={handleDownload}
                    disabled={isPDFLoading}>
                    {isPDFLoading
                        ? <LegoSpinner className="h-4 w-4 animate-spin" />
                        : <Download className="h-4 w-4" />}
                    Download PDF
                </Button>

                {/* Delete button — only shown when the parent passes onDelete */}
                {onDelete && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 gap-1.5 px-2"
                            disabled={isDeleting}
                            onClick={() => setConfirmOpen(true)}
                            title="Delete this report"
                        >
                            {isDeleting
                                ? <LegoSpinner className="h-4 w-4 animate-spin" />
                                : <Trash2 className="h-4 w-4" />}
                        </Button>

                        {/* ── Themed confirmation dialog ── */}
                        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                            <DialogContent
                                style={{ maxWidth: "420px" }}
                                className="p-0 overflow-hidden rounded-xl border-0 shadow-2xl"
                            >
                                {/* Olive header band */}
                                <div className="bg-[#576238] px-6 py-4">
                                    <DialogHeader>
                                        <DialogTitle className="text-white text-base font-bold">
                                            Delete Report
                                        </DialogTitle>
                                        <DialogDescription className="text-[#cdd9b8] text-sm mt-0.5">
                                            This action cannot be undone.
                                        </DialogDescription>
                                    </DialogHeader>
                                </div>

                                {/* Mustard accent stripe */}
                                <div className="h-1 bg-[#ffd95d]" />

                                {/* Body */}
                                <div className="px-6 py-5">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        Are you sure you want to delete{" "}
                                        <span className="font-semibold text-[#576238]">"{name}"</span>?
                                    </p>
                                </div>

                                {/* Footer actions */}
                                <DialogFooter className="px-6 pb-5 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                                        onClick={() => setConfirmOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={isDeleting}
                                        className="bg-red-500 hover:bg-red-600 text-white gap-1.5"
                                        onClick={async () => {
                                            setIsDeleting(true);
                                            setConfirmOpen(false);
                                            try { onDelete(); }
                                            finally { setIsDeleting(false); }
                                        }}
                                    >
                                        {isDeleting
                                            ? <LegoSpinner className="h-4 w-4 animate-spin" />
                                            : <Trash2 className="h-4 w-4" />}
                                        Delete
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </div>
        </div>
    );
};

export default RecommendationCard;
