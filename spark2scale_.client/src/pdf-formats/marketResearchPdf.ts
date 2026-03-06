import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateMarketResearchPDF = (data: any) => {
    if (typeof window === "undefined") return;

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

            // Draw a thick 1.5px two-tone block divider
            doc.setFillColor(...primaryColor);
            doc.rect(margin, currentY, maxLineWidth * 0.8, 1.5, "F"); // 80% Green line

            doc.setFillColor(...accentColor);
            doc.rect(margin + (maxLineWidth * 0.8), currentY, maxLineWidth * 0.2, 1.5, "F"); // 20% Yellow line

            currentY += 10;
        }
    };

    // --- 1. Stylish Document Header ---
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setFillColor(...accentColor);
    doc.rect(0, 40, pageWidth, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Market Intelligence Report", margin, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(data.idea_name || "Startup Analysis", margin, 32);

    // --- 2. Advanced Text Renderer (Fixed Wrapping & Headers) ---
    const summary = data.executive_summary || "";
    const lines = summary.split('\n');

    lines.forEach((line: string) => {
        let text = line.trim();

        // Skip empty lines and markdown junk
        if (!text || text === '*' || text.match(/^-{3,}$/) || text.match(/^\_{3,}$/)) return;

        // Clean bold formatting tags
        text = text.replace(/\*\*/g, '');

        // Safely strip Markdown Headers
        let isHeading = false;
        if (text.startsWith('### ')) {
            text = text.replace('### ', '');
            isHeading = true;
        } else if (text.startsWith('## ')) {
            text = text.replace('## ', '');
            isHeading = true;
        } else if (text.startsWith('# ')) {
            text = text.replace('# ', '');
            isHeading = true;
        }

        // DETECT MAJOR SECTIONS
        let isMajorSection = text.match(/^\d+\.\s+[A-Z]/) || text === "Opportunity Analysis Breakdown" || text === "Competitor Landscape";

        if (isMajorSection || isHeading) {
            if (isMajorSection) drawColorfulDivider();

            checkPageBreak(12);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(isMajorSection ? 15 : 13);
            doc.setTextColor(...primaryColor);
            doc.text(text, margin, currentY);
            currentY += 8;
            return; // Move to the next line immediately
        }

        // --- RENDER PARAGRAPHS & BULLETS ---

        // Safely check for bullets using unicode
        let isBullet = text.startsWith('- ') || text.startsWith('\u2022 ') || text.startsWith('* ');
        let indent = isBullet ? margin + 6 : margin;

        if (isBullet) {
            // Safely strip standard bullet characters
            text = text.replace(/^[\-\u2022\*\s]+/, '').trim();
        }

        // Standard Text Formatting
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(...textColor);

        // Let jsPDF handle the word wrapping natively (No more squeezed columns!)
        const splitText = doc.splitTextToSize(text, maxLineWidth - (indent - margin));
        const textHeight = splitText.length * 5.5;

        checkPageBreak(textHeight + 4);

        // Draw Colorful Bullet Graphic
        if (isBullet) {
            doc.setTextColor(...accentColor); // Bright Yellow
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.text('\u2022', indent - 5, currentY + 1.5);

            // Reset text color for the body paragraph
            doc.setTextColor(...textColor);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10.5);
        }

        // Print the perfectly wrapped paragraph
        doc.text(splitText, indent, currentY);
        currentY += textHeight + 3; // Breathing room below paragraph
    });

    // --- 3. Competitor Table ---
    if (data.competitors && data.competitors.length > 0) {
        checkPageBreak(40);

        autoTable(doc, {
            startY: currentY + 4,
            head: [['Competitor', 'Core Features']],
            body: data.competitors.map((c: any) => [c.Name || "N/A", c.Features || "N/A"]),
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 6, overflow: 'linebreak' },
            columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', textColor: [60, 60, 60] } },
            alternateRowStyles: { fillColor: [247, 248, 245] }, // Very light green tint
            margin: { left: margin, right: margin }
        });
    }

    // --- 4. Page Numbers ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    doc.save(`${(data.idea_name || "Research").replace(/\s+/g, '_')}_Report.pdf`);
};