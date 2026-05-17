import apiClient from '@/lib/apiClient';

export const pdfService = {
    /**
     * Sends a PDF to the .NET backend, which proxies to the AI server.
     * Calling the AI server directly from the browser is blocked by CORS,
     * so we route through /api/Pdf/extract instead.
     */
    extractFromPdf: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        console.log("📤 Sending PDF to backend proxy...");

        // Don't pass Content-Type — the browser must add the multipart boundary itself.
        const response = await apiClient.post('/api/Pdf/extract', formData);

        console.log("📦 Extraction response:", response.data);
        return response.data;
    }
};