// src/pdf-formats/marketResearchPdf.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateMarketResearchPDF = (data: any) => {
    // CRITICAL: Prevent SSR execution
    if (typeof window === "undefined") return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- Header Section ---
    doc.setFillColor(87, 98, 56);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Market Research Report", 14, 20);
    doc.setFontSize(12);
    doc.text(data.idea_name || "Startup Analysis", 14, 30);

    // --- 1. Opportunity Analysis ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text("1. Opportunity Analysis", 14, 50);
    doc.setFontSize(11);
    doc.text(`Overall Score: ${data.opportunity_analysis?.opportunity_score}/100`, 14, 60);

    // --- 2. Executive Summary ---
    doc.setFontSize(14);
    doc.text("2. Executive Summary", 14, 80);
    doc.setFontSize(10);
    const summary = data.executive_summary?.replace(/#/g, '') || "";
    const splitSummary = doc.splitTextToSize(summary, pageWidth - 28);
    doc.text(splitSummary, 14, 90);

    // --- 3. Competitor Table ---
    autoTable(doc, {
        startY: 150,
        head: [['Competitor', 'Features']],
        body: data.competitors?.map((c: any) => [c.Name, c.Features]) || [],
        headStyles: { fillColor: [87, 98, 56] }
    });

    doc.save(`${(data.idea_name || "Research").replace(/\s+/g, '_')}_Report.pdf`);
};