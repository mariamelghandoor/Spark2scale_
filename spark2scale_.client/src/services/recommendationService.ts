// services/recommendationService.ts

import apiClient from "@/lib/apiClient";

// --- MOCK DATA FOR TESTING ---
const MOCK_STARTUP_DATA = {
    "startup_evaluation": {
        "meta_data": {
            "form_type": "Pre-Seed & Seed Evaluation",
            "last_updated": "2026-02-04"
        },
        "company_snapshot": {
            "company_name": "Spark2Scale",
            "website_url": "",
            "hq_location": "Egypt",
            "date_founded": "2025-07-01",
            "current_stage": "Pre-seed",
            "amount_raised_to_date": 10000,
            "current_round": {
                "target_amount": 500,
                "target_close_date": "2026-04-01"
            }
        },
        "founder_and_team": {
            "founders": [
                {
                    "name": "Doha Hemdan",
                    "role": "CEO",
                    "ownership_percentage": 25,
                    "prior_experience": "AI Engineer at Tabaani",
                    "years_direct_experience": 1,
                    "founder_market_fit_statement": "Because we have done a real research and already knew different startup owners"
                },
                {
                    "name": "Salma Sherif",
                    "role": "CTO",
                    "ownership_percentage": 25,
                    "prior_experience": "AI Engineer at Praxilab",
                    "years_direct_experience": 1,
                    "founder_market_fit_statement": "Because we have done a real research and already knew different startup owners"
                },
                {
                    "name": "Mariam Elghandoor",
                    "role": "COO",
                    "ownership_percentage": 25,
                    "prior_experience": "ML Engineer",
                    "years_direct_experience": 1,
                    "founder_market_fit_statement": "Because we have done a real research and already knew different startup owners"
                },
                {
                    "name": "Sarah Elsayed",
                    "role": "CFO",
                    "ownership_percentage": 25,
                    "prior_experience": "Final-year Data Science & AI student",
                    "years_direct_experience": 1,
                    "founder_market_fit_statement": "Because we have done a real research and already knew different startup owners"
                }
            ],
            "execution": {
                "full_time_start_date": "2025-07-25",
                "key_shipments": ["Initial MVP Launch"]
            }
        },
        "problem_definition": {
            "customer_profile": {
                "role": "Early-stage founders",
                "company_size": "2-50 people",
                "industry": "Business / Tech Startups"
            },
            "problem_statement": "Early-stage founders lack a structured system to validate ideas, develop essential business documents, and reach investors.",
            "current_solution": "Using ChatGPT and other LLMs depending on prompt engineering.",
            "gap_analysis": "Current solutions are not specific enough to the startup evaluation sector.",
            "frequency": "High (56% of startups fail in their first years).",
            "impact_metrics": {
                "cost_type": "Time, Money, and Risk",
                "description": "Loss of capital and time due to lack of validation."
            },
            "evidence": {
                "interviews_conducted": 12,
                "customer_quotes": [
                    "market research"
                ]
            }
        },
        "product_and_solution": {
            "product_stage": "MVP",
            "demo_link": "",
            "core_stickiness": "To evaluate ideas and reach investors.",
            "differentiation": "Specialized in a specific sector and tailored solutions rather than general AI.",
            "defensibility_moat": "The core technology implementation."
        },
        "market_and_scope": {
            "beachhead_market": "Startup owners",
            "market_size_estimate": "Not specified",
            "long_term_vision": "Integrating mentors, evaluating larger startups, and adding validation for user inputs.",
            "expansion_strategy": "Introduction of new products."
        },
        "traction_metrics": {
            "stage_context": "Pre-Seed",
            "user_count": 0,
            "active_users_monthly": 0,
            "partnerships_and_lois": ["Letter of Intent from TechHub"],
            "early_revenue": "0"
        },
        "gtm_strategy": {
            "buyer_persona": "Any team member",
            "user_persona": "Founder",
            "primary_acquisition_channel": "Word of mouth",
            "sales_motion": "Founder-led sales",
            "average_sales_cycle": "0 days",
            "deal_closer": "None yet"
        },
        "business_model": {
            "pricing_model": "Freemium",
            "average_price_per_customer": 0,
            "gross_margin": 0,
            "monthly_burn": 100,
            "runway_months": 0
        },
        "vision_and_strategy": {
            "five_year_vision": "Become the primary startup evaluator in the MENA region.",
            "category_definition": "Specialized AI",
            "primary_risk": "Speed of execution and market entry.",
            "use_of_funds": [
                "Deployment",
                "Model training",
                "Acquiring customers"
            ]
        }
    }
};

const MOCK_EVALUATION_OUTPUT = {
    "stage": "Pre-Seed",
    "scores": {
        "team": {
            "score": 4,
            "description": "Strong technical founding team with specialized AI/ML backgrounds."
        },
        "problem": {
            "score": 3,
            "description": "Clear identification of the 'valley of death' for early startups, but needs more quantitative evidence from interviews."
        },
        "product": {
            "score": 3,
            "description": "MVP in progress; custom Transformer architecture provides a better moat than generic API wrappers."
        },
        "market": {
            "score": 2,
            "description": "Beachhead market defined, but TAM/SAM/SOM calculations are missing."
        },
        "traction": {
            "score": 1,
            "description": "Pre-revenue and pre-user; focus is currently on technical implementation."
        },
        "gtm": {
            "score": 2,
            "description": "Dependent on word-of-mouth; requires a more aggressive B2B or incubator-partnership strategy."
        },
        "economics": {
            "score": 2,
            "description": "Low burn rate but runway is undefined without the target raise."
        },
        "vision": {
            "score": 4,
            "description": "Strong regional focus (MENA) and clear roadmap for multi-agent expansion."
        },
        "ops": {
            "score": 3,
            "description": "Execution plan in place; technical development (React/C#/Python) is structured."
        }
    },
    "company_context": "AI-driven startup evaluation platform utilizing custom Transformer models and multi-agent systems to assist MENA founders in validation and investor readiness."
};

const MOCK_AI_RESPONSE = `### STRATEGIC MEMO: SPweARK2SCALE VALIDATION FRAMEWORK
**To:** Spark2Scale Founding Team
**From:** Strategic Advisory / Venture Science Division
**Subject:** Transitioning from Technical Moat to Market Traction

---

### 1. THE CORE HYPOTHESIS
**Founder Claim:** "Early-stage founders lack a structured system to validate ideas and reach investors."
**The Venture Scientist's Reality:** The problem isn't a lack of *systems*; it's a lack of *signal*.
**The Single Most Important Assumption:** MENA-based Investors and Incubators will trust and utilize AI-generated 'Readiness Scores' as a primary filter for their deal flow.
**The Gap:** Your evidence is currently "Market Research" (Passive). To survive, you must move to "Behavioral Evidence" (Active). If investors don't value the output, founders won't pay for the input.

---

### 2. THE "KILL" SIGNAL (Pivot Threshold)
If, after **12 weeks** of product availability, you fail to secure **three (3) signed MOUs** with regional accelerators or VC firms to pilot your scoring system, **the current business model is dead.**
**Reasoning:** A "Vision" score of 4.0 against a "Traction" score of 1.0 indicates you are building in a vacuum. Without institutional buy-in, you are just another "AI Tool" in an oversaturated market.

---

### 3. VALIDATION EXPERIMENT BACKLOG

#### **Technical Proof Point: The "Blind VC" Test**
*   **Hypothesis:** Our custom Transformer model identifies quality better than a human analyst.
*   **Experiment:** Run 20 historical (anonymized) pitch decks through your model. Have two regional VCs manually score them.
*   **Success Metric:** >85% correlation between AI scores and VC "Move to Next Round" decisions.
*   **Why:** This proves "Defensibility" is a feature, not just a technical buzzword.

#### **Market Proof Point: The "Skin in the Game" Test**
*   **Hypothesis:** Founders will pay for "Investor Readiness" outputs.
*   **Experiment:** Launch a landing page offering a "Premium Readiness Audit" for $10 (one-time).
*   **Success Metric:** 10 paid conversions from 200 targeted MENA founder visits.
*   **Why:** "Willingness to Pay" cannot be validated through interviews; it requires a credit card transaction.

---

### 4. DETECTION & ACTION TABLE
| Pattern ID | Risk Pattern | Strength | Recommended Action | Evidence Required |
| :--- | :--- | :--- | :--- | :--- |
| **FP-TEAM-001** | Founder Avoids Hard Job | 1.05 | The Technical Founder must lead **5 sales calls/week** with VC firms personally for 30 days. No outsourcing. | Log of "Reasons for Rejection" from VCs. |
| **FP-ECON-001** | Burn Without Milestones | 1.05 | Freeze all non-essential dev spend until the "Blind VC Test" (see above) is successful. | Correlation report. |
| **FP-VISION-001** | Vision Outruns Execution | 0.91 | Strip the "Multi-agent" roadmap. Focus exclusively on one output: The "Investor Scorecard." | One functional MVP module. |

---

### 5. RED FLAGS & EARLY WARNINGS (Weekly Monitor)
1.  **Feature/Interview Ratio:** If you are shipping more lines of code than you are conducting customer interviews (target: 5/week), you are building in the dark.
2.  **Model Hallucination Rate:** If AI-generated feedback requires >20% manual correction by the team, the "Custom Transformer" moat is failing.
3.  **CAC to "Free-to-Paid" Conversion:** Any paid acquisition cost higher than $20 for a pre-seed user is a failure of the GTM strategy.
4.  **The "Demo-to-MOU" Lag:** If institutional partners "like the idea" but don't sign a pilot agreement within 21 days, the value proposition is too weak.
5.  **Runway vs. Validation:** If the current burn exceeds the pace of learning (e.g., spending 10% of capital without validating 10% of the core assumptions).

---

### 6. FUNDRAISING READINESS ASSESSMENT
**Target Raise:** $500k | **Current Status:** **NOT RECOMMENDED.**

**Analysis:**
You are asking for $500k with a **Traction Score of 1.0**. In the current MENA climate, technical sophistication (C#/Python/Transformers) is no longer enough to secure a $500k pre-seed without a **Market Score of at least 3.0**.

**Action to Unlock Funding:**
Stop building. Go get **5 LOIs** from MENA-based entities (Hub71, KAUST, 500 Global, etc.) stating they will pilot the platform. Once you have those, your "Market" score hits 3.5, and your "Traction" hits 2.5. At that point, the $500k is a logical investment in scaling a validated bridge, not a gamble on a technical dream.`;

// --- Types ---

// 1. Response from Recommendation API
// 1. Response from Recommendation API
export interface RecommendationContent {
    request_id: string;
    timestamp: string;
    recommendation_report: string; // Markdown content
    insights: {
        company_name: string;
        stage: string;
        target_raise: string;
        problem_statement: string;
        founder_experience: string;
        founder_market_fit: string;
        customer_quotes: string[];
        differentiation: string;
        core_stickiness: string;
        active_users: number;
        early_revenue: string;
        five_year_vision: string;
        beachhead_market: string;
        market_size?: string;       // Optional for UI fallback
        market_growth?: string;     // Optional for UI fallback
        gap_analysis: string;
    };
    refined_statements: {
        [key: string]: {
            original: string;
            recommended: string;
            why_better: string;
        };
    };
    matched_patterns?: {
        pattern_id: string;
        strength_score: number;
        template: string;
    }[];
    patterns_detected?: unknown[]; // Deprecated/Legacy

    // Legacy Fields for UI Compatibility
    final_report?: string;
    Summary?: string;
    KeyPoints?: string[];
    ActionPlan?: string;

    evaluation_scores: {
        [category: string]: { // e.g., 'team', 'problem', 'product'
            score: number;
            description: string;
        };
    };
    company_context: string;
    stage: string;
}

export interface DBRecommendation {
    Id: string;
    StartupId: string;
    Type: string;
    Content: RecommendationContent;
    Version: number;
    CreatedAt: string;
    IsCurrent: boolean;
}

// 2. Internal State (Normalized camelCase)
export interface WorkflowState {
    startupId: string;
    ideaCheck: boolean;
    marketResearch: boolean;
    evaluation: boolean;
    recommendation: boolean;
    documents: boolean;
    pitchDeck: boolean;
}

// 3. Raw API response for workflow (may be camelCase or PascalCase)
interface WorkflowApiResponse {
    ideaCheck?: boolean;      IdeaCheck?: boolean;
    marketResearch?: boolean; MarketResearch?: boolean;
    evaluation?: boolean;     Evaluation?: boolean;
    recommendation?: boolean; Recommendation?: boolean;
    documents?: boolean;      Documents?: boolean;
    pitchDeck?: boolean;      PitchDeck?: boolean;
}

// 4. Payload for Updating Workflow (Matches C# DTO PascalCase)
export interface WorkflowUpdatePayload {
    StartupId: string;
    IdeaCheck: boolean;
    MarketResearch: boolean;
    Evaluation: boolean;
    Recommendation: boolean;
    Documents: boolean;
    PitchDeck: boolean;
}

export const recommendationService = {
    // 1. Fetch Recommendations for the specific Startup ID
    async getRecommendations(startupId: string): Promise<DBRecommendation[]> {
        try {
            const response = await apiClient.get<DBRecommendation[]>(`/api/Recommendations/${startupId}/recommendation`);
            return response.data;
        } catch (error) {
            console.error("Error in getRecommendations:", error);
            return [];
        }
    },

    // --- Workflow Helper: Fetch Current State ---
    async _getWorkflowState(startupId: string): Promise<WorkflowState> {
        const defaultState: WorkflowState = {
            startupId, ideaCheck: false, marketResearch: false, evaluation: false,
            recommendation: false, documents: false, pitchDeck: false
        };

        try {
            const response = await apiClient.get<WorkflowApiResponse>(`/api/StartupWorkflow/${startupId}`);
            const json = response.data;

            // Normalize data (API might return PascalCase or camelCase)
            return {
                startupId,
                ideaCheck: json.ideaCheck || json.IdeaCheck || false,
                marketResearch: json.marketResearch || json.MarketResearch || false,
                evaluation: json.evaluation || json.Evaluation || false,
                recommendation: json.recommendation || json.Recommendation || false,
                documents: json.documents || json.Documents || false,
                pitchDeck: json.pitchDeck || json.PitchDeck || false,
            };
        } catch (error) {
            console.error("Error fetching workflow state:", error);
            return defaultState;
        }
    },

    // --- Workflow Helper: Update State ---
    // FIX: Replaced 'any' with 'WorkflowUpdatePayload'
    async _updateWorkflow(payload: WorkflowUpdatePayload): Promise<void> {
        await apiClient.post(`/api/StartupWorkflow/update`, payload);
    },

    // 2. Action: Complete Stage — calls the dedicated endpoint that does a
    //    targeted SET recommendation=true (same pattern as complete-pitch).
    //    The generic /update endpoint has ORM-level issues; this one does not.
    async completeStage(startupId: string): Promise<boolean> {
        try {
            const res = await apiClient.post(
                `/api/StartupWorkflow/complete-recommendation/${startupId}`,
                {},   // empty body — startupId travels in the URL
            );
            console.debug("[completeStage] OK:", res.status, res.data);
            return true;
        } catch (error: unknown) {
            const e = error as { response?: { data?: { message?: string } }; message?: string };
            const serverMsg =
                e?.response?.data?.message ??
                JSON.stringify(e?.response?.data) ??
                e?.message ??
                "unknown error";
            console.error(`[completeStage] 401/500 for startup ${startupId}:`, serverMsg);
            return false;
        }
    },

    // 3. Action: Loop Back (Restart)
    async loopBackToStart(startupId: string): Promise<boolean> {
        try {
            // A. Start New Chat Session
            await apiClient.post(`/api/Chat/start-new`, {
                StartupId: startupId,
                FeatureType: 'idea_check'
            });

            // B. Reset Workflow
            const payload: WorkflowUpdatePayload = {
                StartupId: startupId,
                IdeaCheck: false,
                MarketResearch: false,
                Evaluation: false,
                Recommendation: false,
                Documents: false,
                PitchDeck: false
            };

            // Use the payload
            await this._updateWorkflow(payload);

            return true;
        } catch (error) {
            console.error("Error looping back:", error);
            return false;
        }
    },

    // 4. Action: Regenerate
    async regenerateRecommendation(startupId: string): Promise<boolean> {
        try {
            const current = await this._getWorkflowState(startupId);

            const payload: WorkflowUpdatePayload = {
                StartupId: startupId,
                IdeaCheck: current.ideaCheck,
                MarketResearch: current.marketResearch,
                Evaluation: current.evaluation,
                Recommendation: false, // Reset this stage
                Documents: current.documents,
                PitchDeck: current.pitchDeck
            };

            // Use the payload
            await this._updateWorkflow(payload);

            return true;
        } catch (error) {
            console.error("Error regenerating:", error);
            return false;
        }
    },

    // ---------------------------------------------------------
    // 5. [AI INTEGRATION] Search & AI Agent Methods
    // ---------------------------------------------------------

    // ---------------------------------------------------------
    // Call the real deployed Recommendation Agent.
    // Sends MOCK_STARTUP_DATA + MOCK_EVALUATION_OUTPUT as the input payload.
    // Falls back to local mock data if the API is unavailable / over-quota.
    // ---------------------------------------------------------
    async generateAIRecommendation(): Promise<RecommendationContent | null> {
        const AI_AGENT_URL = "https://spark2scale-ai-server.azurewebsites.net/api/v1/recommend";
        const requestId    = `req_${Date.now()}`;

        // ── Shared insight builder from mock inputs ──────────────────
        const buildInsights = () => {
            const snapshot = MOCK_STARTUP_DATA.startup_evaluation.company_snapshot;
            const problem  = MOCK_STARTUP_DATA.startup_evaluation.problem_definition;
            const product  = MOCK_STARTUP_DATA.startup_evaluation.product_and_solution;
            const market   = MOCK_STARTUP_DATA.startup_evaluation.market_and_scope;
            const traction = MOCK_STARTUP_DATA.startup_evaluation.traction_metrics;
            const vision   = MOCK_STARTUP_DATA.startup_evaluation.vision_and_strategy;
            const founders = MOCK_STARTUP_DATA.startup_evaluation.founder_and_team.founders;
            return {
                company_name:       snapshot.company_name,
                stage:              snapshot.current_stage,
                target_raise:       `${snapshot.current_round.target_amount}k`,
                problem_statement:  problem.problem_statement,
                founder_experience: founders.map(f => `${f.name} (${f.role}) — ${f.prior_experience}`).join("; "),
                founder_market_fit: founders[0]?.founder_market_fit_statement ?? "",
                customer_quotes:    problem.evidence.customer_quotes,
                differentiation:    product.differentiation,
                core_stickiness:    product.core_stickiness,
                active_users:       traction.active_users_monthly,
                early_revenue:      traction.early_revenue,
                five_year_vision:   vision.five_year_vision,
                beachhead_market:   market.beachhead_market,
                market_size:        market.market_size_estimate,
                gap_analysis:       problem.gap_analysis,
            };
        };

        // ── 1. Try the real AI agent ──────────────────────────────────
        try {
            const payload = {
                raw_input:        MOCK_STARTUP_DATA.startup_evaluation,
                evaluation_output: MOCK_EVALUATION_OUTPUT,
                request_id:       requestId,
            };

            console.log("🚀 [AI Agent] Calling real API:", AI_AGENT_URL);

            const response = await fetch(AI_AGENT_URL, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`AI Agent ${response.status}: ${errText}`);
            }

            const data = await response.json();
            console.log("✅ [AI Agent] Response received:", data);

            const content: RecommendationContent = {
                request_id:            requestId,
                timestamp:             new Date().toISOString(),
                recommendation_report: data.final_report || MOCK_AI_RESPONSE,
                insights:              buildInsights(),
                refined_statements:    data.refined_statements  || {},
                matched_patterns:      data.matched_patterns    || [],
                patterns_detected:     [],
                evaluation_scores:     MOCK_EVALUATION_OUTPUT.scores,
                company_context:       MOCK_EVALUATION_OUTPUT.company_context,
                stage:                 MOCK_EVALUATION_OUTPUT.stage,
            };

            return content;

        } catch (error) {
            // ── 2. Fallback: use mock data when the API is unreachable ──
            console.warn("⚠️ [AI Agent] API unavailable — using mock data fallback.", error);

            const content: RecommendationContent = {
                request_id:            `fallback_${Date.now()}`,
                timestamp:             new Date().toISOString(),
                recommendation_report: MOCK_AI_RESPONSE,
                insights:              buildInsights(),
                refined_statements: {
                    problem_statement: {
                        original:    "Early-stage founders lack a structured system to validate ideas, develop essential business documents, and reach investors.",
                        recommended: "MENA early-stage founders lose 18+ months building products without validated market demand because no trusted, data-driven framework exists to assess idea viability before committing resources.",
                        why_better:  "Quantifies the pain with a time metric, specifies the geography (MENA), and anchors the problem to a measurable outcome investors care about.",
                    },
                    founder_market_fit: {
                        original:    "Because we have done real research and already knew different startup owners.",
                        recommended: "As builders who interviewed 40+ MENA founders and operated within two regional AI companies, we translate the gap we lived into a product the market needs.",
                        why_better:  "Replaces a vague claim with a specific credibility indicator (40+ interviews) and connects personal experience directly to market insight.",
                    },
                    differentiation: {
                        original:    "AI-powered structured system for startup validation.",
                        recommended: "The only MENA-native AI platform that combines multi-agent validation, investor-grade scoring, and actionable document generation in a single workflow — trained on regional founder data.",
                        why_better:  "Owns the geography, specifies the unique mechanism (multi-agent + regional training), and clarifies the value output (documents), making it immune to generic SaaS comparisons.",
                    },
                    five_year_vision: {
                        original:    "Become the leading platform for startup validation in the MENA region.",
                        recommended: "By 2030, Spark2Scale will be the default infrastructure layer for startup readiness in MENA — the system accelerators, VC firms, and founders use before any capital changes hands.",
                        why_better:  "Sets a concrete year, shifts from 'leading platform' (a feature claim) to 'infrastructure layer' (a category-defining position), and names the specific stakeholders that validate its success.",
                    },
                },
                matched_patterns:      [],
                patterns_detected:     [],
                evaluation_scores:     MOCK_EVALUATION_OUTPUT.scores,
                company_context:       MOCK_EVALUATION_OUTPUT.company_context,
                stage:                 MOCK_EVALUATION_OUTPUT.stage,
            };

            return content;
        }
    },

    // New: Persist the AI result to the Backend (Recommendations Table)
    // --- Document integration ---
    async saveToDocuments(startupId: string, content: RecommendationContent): Promise<boolean> {
        try {
            const payload = {
                StartupId: startupId,
                Type: "Recommendation",
                Content: content
            };
            const response = await apiClient.post('/api/Documents/save-ai-response', payload);
            return response.status === 200;
        } catch (error) {
            console.error("Error saving to documents:", error);
            return false;
        }
    },
    // Returns the rid (DB primary key) of the newly saved row, or null on error.
    async saveRecommendation(startupId: string, content: RecommendationContent): Promise<string | null> {
        try {
            const compatibleContent = {
                ...content,
                Summary:    "Investment Memo Generated",
                Score:      0,
                KeyPoints:  ["See detailed report"],
                ActionPlan: "See detailed report",
            };

            const payload = { StartupId: startupId, Type: "recommendation", Content: compatibleContent };
            const res = await apiClient.post<unknown>(`/api/Recommendations/save`, payload);

            // Backend now returns the inserted row(s) via "return=representation"
            type RowWithRid = { rid?: string };
            const rows: RowWithRid[] = Array.isArray(res.data)
                ? (res.data as RowWithRid[])
                : res.data
                    ? [res.data as RowWithRid]
                    : [];
            const rid = rows[0]?.rid ?? null;
            return rid ?? "saved";  // fallback to truthy string if rid missing
        } catch (error: unknown) {
            console.error("Error saving recommendation:", error);
            return null;
        }
    },

    // Deletes a single recommendation by its DB primary key (rid).
    async deleteRecommendation(rid: string): Promise<boolean> {
        try {
            await apiClient.delete(`/api/Recommendations/delete/${rid}`);
            return true;
        } catch (error) {
            console.error("Error deleting recommendation:", error);
            return false;
        }
    },
};