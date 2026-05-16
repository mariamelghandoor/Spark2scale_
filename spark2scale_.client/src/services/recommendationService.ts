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
    patterns_detected?: any[]; // Deprecated/Legacy

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

// 3. Payload for Updating Workflow (Matches C# DTO PascalCase)
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
            const response = await apiClient.get<any>(`/api/Recommendations/${startupId}/recommendation`);
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
            const response = await apiClient.get<any>(`/api/StartupWorkflow/${startupId}`);
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
        } catch (error: any) {
            const serverMsg =
                error?.response?.data?.message ??
                JSON.stringify(error?.response?.data) ??
                error?.message ??
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
    // Sends the CURRENT startup's data + its evaluation output, mapped into
    // the schema the backend expects. Falls back to a report derived from the
    // same real startup data (NOT a static memo) if the API is unavailable.
    // ---------------------------------------------------------
    async generateAIRecommendation(startupData?: any, evaluationContent?: any): Promise<RecommendationContent | null> {
        // NOTE: must match the host every other AI service uses
        // (spark2scale-ai-api-server). The old "spark2scale-ai-server" host
        // does not resolve, which silently forced the offline fallback.
        const AI_AGENT_URL =
            (process.env.NEXT_PUBLIC_PYTHON_API_URL || "https://spark2scale-ai-api-server.azurewebsites.net")
                .replace(/\/+$/, "") + "/api/v1/recommend";
        const requestId    = `req_${Date.now()}`;

        // ── Helpers ──────────────────────────────────────────────────
        const parseMaybeJson = (v: any): any => {
            if (typeof v === "string") { try { return JSON.parse(v); } catch { return {}; } }
            return v ?? {};
        };

        // The startup form returned by startupService.getById lives in
        // `json_response`; it may already be wrapped in `startup_evaluation`.
        const extractStartupEval = (sd: any): any => {
            const root = parseMaybeJson(sd?.json_response ?? sd);
            return root?.startup_evaluation ?? root ?? {};
        };

        // Backend StartupData.scores key  ->  evaluation-agent report/grid key
        const SCORE_MAP: Record<string, string> = {
            team: "team", problem: "problem", product: "product", market: "market",
            traction: "traction", gtm: "gtm", economics: "business",
            vision: "vision", ops: "operations",
        };

        const clamp5 = (n: number) => Math.max(0, Math.min(5, n));

        // Coerce any of the agent's score representations into a 0-5 float.
        const toScore5 = (gridVal: any, report: any): number => {
            if (gridVal !== undefined && gridVal !== null && !isNaN(Number(gridVal))) {
                return clamp5(Number(gridVal));
            }
            const raw = report?.score;
            if (typeof raw === "string" && raw.includes("/")) {
                const p = parseFloat(raw.split("/")[0]);
                if (!isNaN(p)) return clamp5(p);
            } else if (typeof raw === "number") {
                return clamp5(raw <= 5 ? raw : raw / 20);
            }
            const sn = Number(report?.score_numeric);
            if (!isNaN(sn) && sn > 0) return clamp5(sn / 20); // 0-100 -> 0-5
            return 0;
        };

        // Map the evaluation-agent output to the backend's strict StartupData.
        const mapEvaluation = (ec: any, startupEval: any) => {
            const fr = ec?.final_report ?? {};
            const fo = fr?.founder_output ?? {};
            const io = fr?.investor_output ?? {};

            // Scorecard grid (0-5), lower-cased keys, from founder or investor side
            const rawGrid =
                fo?.Content?.["Scorecard Grid"] ?? fo?.scorecard_grid ??
                io?.Content?.["Scorecard Grid"] ?? io?.scorecard_grid ?? {};
            const grid: Record<string, number> = {};
            Object.entries(rawGrid || {}).forEach(([k, v]) => { grid[k.toLowerCase()] = Number(v); });

            // Dimension-analysis justifications (fallback for descriptions)
            const dims = fo?.Content?.["Dimension Analysis"] ?? fo?.dimension_analysis ?? [];
            const dimJust: Record<string, string> = {};
            if (Array.isArray(dims)) {
                dims.forEach((d: any) => {
                    const name = String(d?.dimension ?? "").toLowerCase();
                    if (name) dimJust[name] = String(d?.justification ?? "");
                });
            }

            const scores: Record<string, { score: number; description: string }> = {};
            Object.entries(SCORE_MAP).forEach(([backendKey, evalKey]) => {
                const report = ec?.[`${evalKey}_report`] ?? {};
                const description =
                    (report?.explanation && String(report.explanation)) ||
                    dimJust[evalKey] ||
                    "No analysis available for this dimension.";
                scores[backendKey] = {
                    score: toScore5(grid[evalKey], report),
                    description,
                };
            });

            const snap = startupEval?.company_snapshot ?? {};
            const prob = startupEval?.problem_definition ?? {};
            const stage = String(snap?.current_stage || "Pre-Seed");
            const company_context = String(
                fo?.Content?.["Executive Summary"] ?? fo?.executive_summary ??
                io?.Content?.["Executive Summary"] ??
                (snap?.company_name
                    ? `${snap.company_name}: ${prob?.problem_statement ?? "Early-stage startup."}`
                    : "Early-stage startup.")
            );

            return { stage, company_context, scores };
        };

        // UI insight card, built from the REAL startup form (not a fixed mock).
        const buildInsights = (startupEval: any) => {
            const snap     = startupEval?.company_snapshot ?? {};
            const problem  = startupEval?.problem_definition ?? {};
            const product  = startupEval?.product_and_solution ?? {};
            const market   = startupEval?.market_and_scope ?? {};
            const traction = startupEval?.traction_metrics ?? {};
            const vision   = startupEval?.vision_and_strategy ?? {};
            const founders = startupEval?.founder_and_team?.founders ?? [];
            return {
                company_name:       snap?.company_name ?? "Unknown",
                stage:              snap?.current_stage ?? "Unknown",
                target_raise:       snap?.current_round?.target_amount != null
                                        ? `${snap.current_round.target_amount}k` : "Unknown",
                problem_statement:  problem?.problem_statement ?? "Unknown",
                founder_experience: Array.isArray(founders)
                                        ? founders.map((f: any) => `${f?.name ?? ""} (${f?.role ?? ""}) — ${f?.prior_experience ?? ""}`).join("; ")
                                        : "Unknown",
                founder_market_fit: founders?.[0]?.founder_market_fit_statement ?? "",
                customer_quotes:    problem?.evidence?.customer_quotes ?? [],
                differentiation:    product?.differentiation ?? "Unknown",
                core_stickiness:    product?.core_stickiness ?? "Unknown",
                active_users:       traction?.active_users_monthly ?? 0,
                early_revenue:      traction?.early_revenue ?? "USD 0",
                five_year_vision:   vision?.five_year_vision ?? "Unknown",
                beachhead_market:   market?.beachhead_market ?? "Unknown",
                market_size:        market?.market_size_estimate ?? "Unknown",
                gap_analysis:       problem?.gap_analysis ?? "Unknown",
            } as RecommendationContent["insights"];
        };

        // Resolve the real inputs (fall back to the seed mocks only if the
        // caller passed nothing at all — e.g. an isolated dev/test harness).
        const startupEval = (() => {
            const ev = extractStartupEval(startupData);
            return ev && Object.keys(ev).length ? ev : MOCK_STARTUP_DATA.startup_evaluation;
        })();
        const evalContent  = evaluationContent ?? {};
        const evaluation_output =
            (evaluationContent && Object.keys(evaluationContent).length)
                ? mapEvaluation(evalContent, startupEval)
                : MOCK_EVALUATION_OUTPUT;

        // ── 1. Try the real AI agent ──────────────────────────────────
        try {
            const payload = {
                raw_input:         { startup_evaluation: startupEval },
                evaluation_output: evaluation_output,
                request_id:        requestId,
            };

            console.log("🚀 [AI Agent] Calling real API:", AI_AGENT_URL, payload);

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

            // Prefer the backend's own extracted insights (derived from the
            // real startup); fall back to the locally-built card.
            const apiInsights =
                data?.insights && Object.keys(data.insights).length
                    ? (data.insights as RecommendationContent["insights"])
                    : buildInsights(startupEval);

            const content: RecommendationContent = {
                request_id:            requestId,
                timestamp:             new Date().toISOString(),
                recommendation_report: data.final_report || MOCK_AI_RESPONSE,
                insights:              apiInsights,
                refined_statements:    data.refined_statements  || {},
                matched_patterns:      data.matched_patterns    || [],
                patterns_detected:     [],
                evaluation_scores:     evaluation_output.scores,
                company_context:       evaluation_output.company_context,
                stage:                 evaluation_output.stage,
            };

            return content;

        } catch (error) {
            // ── 2. Fallback: derive a per-startup report from the real
            //      data so different startups still get different output. ──
            console.warn("⚠️ [AI Agent] API unavailable — generating offline report from real startup data.", error);

            const insights = buildInsights(startupEval);
            const weak = Object.entries(evaluation_output.scores)
                .filter(([, v]) => (v as any).score <= 2)
                .map(([k]) => k);

            const offlineReport =
`### STRATEGIC MEMO (OFFLINE) — ${insights.company_name}
**Stage:** ${evaluation_output.stage}  |  **Target Raise:** ${insights.target_raise}

> ⚠️ The AI agent was unreachable. This summary is generated locally from
> your latest evaluation; regenerate when the service is back online for the
> full analysis.

**Context:** ${evaluation_output.company_context}

**Core problem:** ${insights.problem_statement}

**Weakest dimensions (score ≤ 2/5):** ${weak.length ? weak.join(", ") : "none flagged"}

**Scorecard:**
${Object.entries(evaluation_output.scores)
    .map(([k, v]) => `- **${k}**: ${(v as any).score}/5 — ${(v as any).description}`)
    .join("\n")}`;

            const content: RecommendationContent = {
                request_id:            `fallback_${Date.now()}`,
                timestamp:             new Date().toISOString(),
                recommendation_report: offlineReport,
                insights:              insights,
                refined_statements:    {},
                matched_patterns:      [],
                patterns_detected:     [],
                evaluation_scores:     evaluation_output.scores,
                company_context:       evaluation_output.company_context,
                stage:                 evaluation_output.stage,
            };

            return content;
        }
    },

    // New: Persist the AI result to the Backend (Recommendations Table)
    // --- Document integration ---
    async saveToDocuments(startupId: string, content: any): Promise<boolean> {
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
            const res = await apiClient.post<any>(`/api/Recommendations/save`, payload);

            // Backend now returns the inserted row(s) via "return=representation"
            const rows = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
            const rid  = rows[0]?.rid ?? null;
            return rid ?? "saved";  // fallback to truthy string if rid missing
        } catch (error: any) {
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