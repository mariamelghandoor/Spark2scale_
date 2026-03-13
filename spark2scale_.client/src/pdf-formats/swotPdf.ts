// src/services/swotPdf.ts (Adjust path to match where your marketResearchPdf is)
import { jsPDF } from "jspdf";

export const generateSwotPDF = (data: any) => {
    if (typeof window === "undefined") return;

    // The backend might return the root object or nest it in "swot_document"
    const swotData = data.swot_document || data;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const maxLineWidth = pageWidth - margin * 2;
    let currentY = 55;

    // Brand Colors
    const primaryColor: [number, number, number] = [87, 98, 56];    // #576238 (Green)
    const accentColor: [number, number, number] = [255, 217, 93];   // #FFD95D (Yellow)
    const textColor: [number, number, number] = [60, 60, 60];       // Dark Gray

    // Helper: Dynamic Page Breaks
    const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - 20) {
            doc.addPage();
            currentY = 25;
            return true;
        }
        return false;
    };

    // Helper: Draw a bold, colorful, two-tone section divider
    const drawColorfulDivider = () => {
        if (currentY > 35) {
            currentY += 8;
            doc.setFillColor(...primaryColor);
            doc.rect(margin, currentY, maxLineWidth * 0.8, 1.5, "F");
            doc.setFillColor(...accentColor);
            doc.rect(margin + (maxLineWidth * 0.8), currentY, maxLineWidth * 0.2, 1.5, "F");
            currentY += 10;
        }
    };

    // Helper: Render Section (Handles both Paragraphs and Bullet Lists)
    const renderSection = (title: string, content: string | string[]) => {
        if (!content || (Array.isArray(content) && content.length === 0)) return;

        drawColorfulDivider();
        checkPageBreak(12);

        // Section Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(...primaryColor);
        doc.text(title, margin, currentY);
        currentY += 8;

        const items = Array.isArray(content) ? content : [content];
        const isBullet = Array.isArray(content);

        items.forEach(item => {
            // Clean up Markdown asterisks
            let text = item.replace(/\*\*/g, '').trim();
            if (!text) return;

            let indent = isBullet ? margin + 6 : margin;

            // Text Wrapping
            const splitText = doc.splitTextToSize(text, maxLineWidth - (indent - margin));
            const textHeight = splitText.length * 5.5;

            checkPageBreak(textHeight + 4);

            // Draw Bullet
            if (isBullet) {
                doc.setTextColor(...accentColor);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(18);
                doc.text('\u2022', indent - 5, currentY + 1.5);
            }

            // Draw Text
            doc.setTextColor(...textColor);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10.5);
            doc.text(splitText, indent, currentY);
            currentY += textHeight + 3;
        });
    };

    // --- 1. Document Header ---
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setFillColor(...accentColor);
    doc.rect(0, 40, pageWidth, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(swotData.title || "SWOT Analysis", margin, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(swotData.idea_name || "Startup Analysis", margin, 32);

    // --- 2. Render Body Sections ---
    if (swotData.introduction) renderSection("Executive Summary", swotData.introduction);
    if (swotData.strengths) renderSection("Strengths", swotData.strengths);
    if (swotData.weaknesses) renderSection("Weaknesses", swotData.weaknesses);
    if (swotData.opportunities) renderSection("Opportunities", swotData.opportunities);
    if (swotData.threats) renderSection("Threats", swotData.threats);
    if (swotData.tows_matrix_raw_strategies) renderSection("TOWS Matrix Strategies", swotData.tows_matrix_raw_strategies);
    if (swotData.strategic_recommendations) renderSection("Strategic Recommendations", swotData.strategic_recommendations);

    // --- 3. Page Numbers ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    window.open(doc.output('bloburl'), '_blank');
};