import axios from 'axios';

export const pdfService = {
    /**
     * Sends a PDF file to the AI extraction endpoint.
     */
    extractFromPdf: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        console.log("📤 Sending PDF to AI Server...");

        // Use a clean axios instance to bypass apiClient interceptors
        const response = await axios.post(
            'https://spark2scale-ai-server.azurewebsites.net/api/v1/pdf/extract-from-pdf',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'accept': 'application/json'
                }
            }
        );

        console.log("📥 AI Server Response Status:", response.status);
        console.log("📦 AI Server Response Body:", response.data);

        return response.data;
    }
};