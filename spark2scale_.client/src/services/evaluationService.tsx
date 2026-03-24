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
            const startupRes = await apiClient.get<any>(`/api/Startups/${startupId}`);
            const startupData = startupRes.data;

            const parsedForm = typeof startupData.json_response === 'string'
                ? JSON.parse(startupData.json_response)
                : startupData.json_response;

            const payload = {
                data: parsedForm
            };

            console.log("🚀 Step 2: Starting AI Job on Azure...", payload);
            const startJobRes = await fetch('https://spark2scale-ai-api-server.azurewebsites.net/api/v1/evaluation/evaluate/all', {
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
                const statusRes = await fetch(`https://spark2scale-ai-api-server.azurewebsites.net/api/v1/evaluation/evaluate/status/${jobId}`);
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
            const pdfRes = await fetch('https://spark2scale-ai-api-server.azurewebsites.net/api/v1/evaluation/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalResult)
            });

            if (!pdfRes.ok) throw new Error("Failed to generate PDFs");

            const zipBlob = await pdfRes.blob();

            const zip = new JSZip();
            const unzipped = await zip.loadAsync(zipBlob);

            // Change these search strings to match the Python server output
            const founderFileKey = Object.keys(unzipped.files).find(name => name.startsWith("F_"));
            const investorFileKey = Object.keys(unzipped.files).find(name => name.startsWith("I_"));

            if (!founderFileKey || !investorFileKey) {
                console.error("Available files in ZIP:", Object.keys(unzipped.files)); // Debugging
                throw new Error("ZIP did not contain expected PDFs (F_ or I_ prefixes)");
            }
            // Extract them as Blobs
            const founderPdfBlob = await unzipped.files[founderFileKey].async("blob");
            const investorPdfBlob = await unzipped.files[investorFileKey].async("blob");

            // ☁️ Step 6: Sending files to C# Backend...
            const formData = new FormData();
            formData.append("StartupId", startupId);
            formData.append("JsonResponse", JSON.stringify(finalResult));
            formData.append("FounderFile", founderPdfBlob, "Founder_Report.pdf");
            formData.append("InvestorFile", investorPdfBlob, "Investor_Memo.pdf");

            // REMOVE THE HEADERS OBJECT ENTIRELY
            await apiClient.post(`/api/Documents/save-ai-evaluations`, formData);


            return true;
        } catch (error) {
            console.error("Error in AI Evaluation workflow:", error);
            return false;
        }
    },

    // 5. [AI INTEGRATION] Fetch Evaluation Content JSON
    // Added to retrieve the actual analysis data needed by the Recommendation Agent
    async getEvaluationContent(startupId: string): Promise<unknown | null> {
        try {
            const doc = await this.getCurrentEvaluation(startupId);

            // [MOCK MODE] If no real doc exists, return the mock data
            if (!doc || !doc.current_path) {
                console.warn("⚠️ [Mock Mode] Returning mock evaluation data for testing.");
                return MOCK_EVALUATION_DATA;
            }

            // Fetch the content from the storage URL
            // Note: Using fetch/axios directly as this might be an external blob URL
            const response = await fetch(doc.current_path);
            if (!response.ok) throw new Error("Failed to fetch document content");

            return await response.json();
        } catch (error) {
            console.error("Error fetching evaluation content, falling back to mock:", error);
            return MOCK_EVALUATION_DATA;
        }
    }
};

// --- MOCK DATA FOR TESTING ---
const MOCK_EVALUATION_DATA = {
    "gtm_report": {
        "score": "1/5",
        "explanation": "The startup has a generic and unrealistic plan to acquire customers. The 'Impossible Sales' Contradiction is triggered because the sales motion includes 'Founder-led sales' (which implies some level of sales effort) and the price point is 0 (which implies a low-priced product). This combination is mathematically impossible because the cost of sales (CAC) will instantly kill the lifetime value (LTV) of the customer. Additionally, the 'Persona Disconnect' Contradiction is triggered because the ICP description mentions 'Early-stage Founders' (which implies a corporate target) but the buyer persona is 'Any founding team member' (which implies a junior or individual target). This combination is a contradiction because junior employees do not have corporate credit cards or purchasing power.",
        "key_strengths": ["ICP description is somewhat specific"],
        "score_numeric": 20,
        "key_weaknesses": ["Reliance on passive Word of Mouth", "No clear understanding of the target audience", "Sales motion does not match the price point"],
        "confidence_level": "High"
    },
    "team_report": {
        "score": "2.0/5",
        "red_flags": ["Risk 1: Domain Experience Gap - 'prior_experience' and 'years_experience' are low (1 year) for all founders, indicating a lack of reputation in the specific domain.", "Risk 2: Cap Table/Equity Risk - All primary founders have 'ownership_percentage' of 25%, which is low and suggests a lack of commitment or a broken cap table early on.", "Risk 3: Tech & Production Risk - 'product_stage' is only 'Concept' (no code) and 'traction_metrics' show $0 revenue/usage (unproven engine).", "Risk 4: Founder Quality & Insight - The founder's background does not logically align with the 'problem_statement' and 'solution'.", "Risk 5: Founder Quality & Insight - The 'problem_statement' and 'solution' are vague and generic.", "Risk 6: Velocity Risk - Execution speed is slow (e.g., > 3 months to ship MVP), as indicated by the 'full_time_start_date' (2025-07-25) and 'key_shipments' (2026-02-11).", "Risk 7: Timeline Physics - 'Target Close Date' (2025-07-25) is in the past relative to 'Date Founded' (2025-07-25), which is not possible unless it was a spin-out. However, there is no information about a spin-out.", "Risk 8: Timeline Physics - 'Shipped Item' date (2026-02-11) is in the future relative to 'Today' (2026-02-17), which is a logical impossibility."],
        "explanation": "The team has some relevant experience in AI engineering, but there are several red flags that prevent a higher score. Deducted 0.5 points for lack of domain expertise, 0.5 points for unclear equity split, and 0.5 points for slow execution speed. Additionally, the problem statement and solution are vague and generic, and the current solution relies on generic LLMs without specific domain knowledge.",
        "green_flags": ["Strength 1: The team has some relevant experience in AI engineering.", "Strength 2: The founders have a clear fit statement, indicating a combined technical AI background with direct research into startup owner needs."],
        "score_numeric": 40,
        "confidence_level": "Medium"
    },
    "final_report": {
        "founder_output": {
            "Tone": "Direct, constructive 'Tough Love'",
            "Content": {
                "Verdict": "Pass (Not Ready)",
                "Scorecard Grid": { "gtm": 1, "team": 2, "market": 2, "vision": 2, "problem": 3.5, "product": 1, "business": 1, "traction": 0, "operations": 1 },
                "Weighted Score": 15.75,
                "Top 3 Priorities": ["Fix the critical flaws in the plan to make it investable", "Develop a clear and realistic traction plan to acquire users and revenue", "Address the risks in the market analysis and develop a clear and realistic vision"],
                "Executive Summary": "Your Pre-Seed application shows promise, but your current execution is not aligned with your ambition. You need to address the critical flaws in your plan to make it investable.",
                "Dimension Analysis": [
                    { "score": 2, "dimension": "Team", "improvements": ["Review risks highlighted in analysis."], "justification": "The team has some relevant experience in AI engineering...", "confidence_level": "Medium" },
                    { "score": 3.5, "dimension": "Problem", "improvements": ["Review risks highlighted in analysis."], "justification": "The problem statement is clear and concise...", "confidence_level": "Medium" },
                    { "score": 1, "dimension": "Product", "improvements": ["Review risks highlighted in analysis."], "justification": "The startup's product is a generic wrapper...", "confidence_level": "High" },
                    { "score": 2, "dimension": "Market", "improvements": ["Review risks highlighted in analysis."], "justification": "The startup's market size is credible...", "confidence_level": "Medium" },
                    { "score": 0, "dimension": "Traction", "improvements": ["Review risks highlighted in analysis."], "justification": "The startup has a 'Zero Signal'...", "confidence_level": "High" },
                    { "score": 1, "dimension": "Gtm", "improvements": ["Review risks highlighted in analysis."], "justification": "The startup has a generic and unrealistic plan...", "confidence_level": "High" }
                ]
            }
        }
    }
};