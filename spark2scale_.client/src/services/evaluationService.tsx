import apiClient from "@/lib/apiClient";
import JSZip from "jszip";

export interface EvaluationDocument {
    did: string;
    startup_id: string;
    document_name: string;
    type: string;
    current_path: string;
    current_version: number;
    updated_at: string;
    json_response?: any; 
}

interface WorkflowData {
    [key: string]: unknown;
    ideaCheck?: boolean;
    IdeaCheck?: boolean;
    marketResearch?: boolean;
    MarketResearch?: boolean;
    evaluation?: boolean;
    Evaluation?: boolean;
    recommendation?: boolean;
    Recommendation?: boolean;
    documents?: boolean;
    Documents?: boolean;
    pitchDeck?: boolean;
    PitchDeck?: boolean;
}

export const evaluationService = {
    // 1. Fetch the specific Evaluation Document
    async getCurrentEvaluation(startupId: string): Promise<EvaluationDocument | null> {
        try {
            const response = await apiClient.get<EvaluationDocument[]>(`/api/Documents?startupId=${startupId}`);
            const docs = response.data;

            // 👇 CRITICAL FIX: Look for "founder evaluation" instead of "evaluation"
            const evalDoc = docs.find(d => d.type.toLowerCase() === "founder evaluation");

            return evalDoc || null;
        } catch (error) {
            console.error("Error fetching evaluation:", error);
            return null;
        }
    },

    // 2. Check if the "Evaluation" stage is complete
    async getWorkflowStatus(startupId: string): Promise<boolean> {
        try {
            const response = await apiClient.get<WorkflowData>(`/api/StartupWorkflow/${startupId}`);
            const workflow = response.data;
            // Handle potential casing (camelCase vs PascalCase)
            return workflow.evaluation === true || workflow.Evaluation === true;
        } catch (error) {
            console.error("Error fetching workflow:", error);
            return false;
        }
    },
    async deleteEvaluation(documentId: string): Promise<boolean> {
        try {
            await apiClient.delete(`/api/Documents/${documentId}`);
            return true;
        } catch (error) {
            console.error("Error deleting document:", error);
            return false;
        }
    },

    // 3. Mark the stage as Complete (Logic moved here)
    async markAsComplete(startupId: string): Promise<boolean> {
        try {
            // A. Fetch current state to preserve other flags
            const getRes = await apiClient.get<WorkflowData>(`/api/StartupWorkflow/${startupId}`);
            const currentData = getRes.data;

            // B. Construct Payload (Mapping to C# DTO structure)
            const updatePayload = {
                StartupId: startupId,
                IdeaCheck: currentData.ideaCheck || currentData.IdeaCheck,
                MarketResearch: currentData.marketResearch || currentData.MarketResearch,
                Evaluation: true, // <--- The change
                Recommendation: currentData.recommendation || currentData.Recommendation,
                Documents: currentData.documents || currentData.Documents,
                PitchDeck: currentData.pitchDeck || currentData.PitchDeck
            };

            // C. Send Update
            await apiClient.post(`/api/StartupWorkflow/update`, updatePayload);

            return true;
        } catch (error) {
            console.error("Error marking complete:", error);
            return false;
        }
    },

    // 4. Trigger Generation
    async generateEvaluation(startupId: string): Promise<boolean> {
        try {
            console.log("🚀 Step 1: Fetching startup data...");
            const startupRes = await apiClient.get(`/api/Startups/${startupId}`);
            const startupData = startupRes.data;

            const parsedForm = typeof startupData.json_response === 'string'
                ? JSON.parse(startupData.json_response)
                : startupData.json_response;

            const payload = {
                data: parsedForm
            };

            console.log("🚀 Step 2: Starting AI Job on Azure...", payload);
            const startJobRes = await fetch('https://spark2scale-ai-server.azurewebsites.net/api/v1/evaluation/evaluate/all', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const startJobData = await startJobRes.json();
            const jobId = startJobData.job_id;

            if (!jobId) {
                throw new Error("No Job ID returned from AI server. Check the payload format.");
            }

            console.log(`⏳ Step 3: Polling AI Server for Job ${jobId}...`);
            let finalResult = null;

            while (true) {
                const statusRes = await fetch(`https://spark2scale-ai-server.azurewebsites.net/api/v1/evaluation/evaluate/status/${jobId}`);
                const statusData = await statusRes.json();

                if (statusData.status === 'completed') {
                    finalResult = statusData.result;
                    console.log("✅ AI Evaluation Finished!", finalResult);
                    break;
                } else if (statusData.status === 'failed') {
                    console.error("❌ AI Job Failed:", statusData.error);
                    return false;
                }

                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            console.log("📦 Step 4: Requesting PDFs from Python server...");
            const pdfRes = await fetch('https://spark2scale-ai-server.azurewebsites.net/api/v1/evaluation/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalResult)
            });

            if (!pdfRes.ok) throw new Error("Failed to generate PDFs");

            const zipBlob = await pdfRes.blob();

            console.log("🗜️ Step 5: Unzipping the package...");
            const zip = new JSZip();
            const unzipped = await zip.loadAsync(zipBlob);

            const founderFileKey = Object.keys(unzipped.files).find(name => name.includes("Founder_Report"));
            const investorFileKey = Object.keys(unzipped.files).find(name => name.includes("Investor_Memo"));

            if (!founderFileKey || !investorFileKey) throw new Error("ZIP did not contain expected PDFs");

            // Extract them as Blobs
            const founderPdfBlob = await unzipped.files[founderFileKey].async("blob");
            const investorPdfBlob = await unzipped.files[investorFileKey].async("blob");

            console.log("☁️ Step 6: Sending files to C# Backend...");
            const formData = new FormData();
            formData.append("StartupId", startupId);
            formData.append("JsonResponse", JSON.stringify(finalResult));
            formData.append("FounderFile", founderPdfBlob, "Founder_Report.pdf");
            formData.append("InvestorFile", investorPdfBlob, "Investor_Memo.pdf");

            // FIX: Explicitly tell Axios to send this as a Form with files, NOT as JSON
            await apiClient.post(`/api/Documents/save-ai-evaluations`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            return true;
        } catch (error) {
            console.error("Error in AI Evaluation workflow:", error);
            return false;
        }
    }
};