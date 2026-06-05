"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    ArrowRight,
    CheckCircle2,
    Sparkles,
    Wand2,
    AlertTriangle,
    Loader2,
} from "lucide-react";
import { recommendationService } from "@/services/recommendationService";

export interface RefinedStatement {
    original: string;
    recommended: string;
    why_better: string;
}

interface RefinementStepProps {
    startupId: string;
    refinedStatements: Record<string, RefinedStatement>;
    /** Called after the founder applies refinements (or explicitly skips). */
    onApplied?: (result: { applied: string[]; skipped: string[] }) => void;
}

// Recommendation keys to human-readable labels. Anything not in this map falls
// back to a generic snake_case -> Title Case transform.
const LABEL_OVERRIDES: Record<string, string> = {
    problem_statement: "Problem statement",
    gap_analysis: "Gap analysis",
    current_solution: "Current solution",
    differentiation: "Differentiation",
    core_stickiness: "Core stickiness",
    defensibility_moat: "Defensibility moat",
    beachhead_market: "Beachhead market",
    market_size: "Market size",
    expansion_strategy: "Expansion strategy",
    five_year_vision: "Five-year vision",
    category_definition: "Category definition",
    primary_risk: "Primary risk",
    founder_market_fit: "Founder–market fit (primary founder)",
    founder_experience: "Founder experience (primary founder)",
};

function humanize(key: string): string {
    if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
    return key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function RefinementStep({
    startupId,
    refinedStatements,
    onApplied,
}: RefinementStepProps) {
    const entries = useMemo(() => {
        return Object.entries(refinedStatements || {})
            .filter(
                ([, v]) =>
                    v &&
                    typeof v.recommended === "string" &&
                    v.recommended.trim().length > 0 &&
                    v.recommended.trim() !== (v.original || "").trim()
            )
            .map(([key, value]) => ({ key, value }));
    }, [refinedStatements]);

    const [selected, setSelected] = useState<Set<string>>(
        () => new Set(entries.map((e) => e.key))
    );
    const [isApplying, setIsApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [appliedResult, setAppliedResult] =
        useState<{ applied: string[]; skipped: string[] } | null>(null);
    const [staleStageCount, setStaleStageCount] = useState(0);

    if (entries.length === 0) return null;

    const toggle = (key: string, checked: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (checked) next.add(key);
            else next.delete(key);
            return next;
        });
    };

    const toggleAll = (checked: boolean) => {
        setSelected(checked ? new Set(entries.map((e) => e.key)) : new Set());
    };

    const handleApply = async () => {
        if (selected.size === 0) {
            setError("Select at least one refinement to apply, or use Skip.");
            return;
        }
        setError(null);
        setIsApplying(true);

        const refinementsToSend: Record<string, string> = {};
        for (const { key, value } of entries) {
            if (selected.has(key)) refinementsToSend[key] = value.recommended;
        }

        const result = await recommendationService.applyRefinements(
            startupId,
            refinementsToSend
        );
        if (!result.ok) {
            setError(result.message);
            setIsApplying(false);
            return;
        }

        const flagged = await recommendationService.markDownstreamStale(startupId);
        setStaleStageCount(flagged.length);
        const summary = { applied: result.applied, skipped: result.skipped };
        setAppliedResult(summary);
        setIsApplying(false);
        onApplied?.(summary);
    };

    const handleSkip = () => {
        const empty = { applied: [], skipped: entries.map((e) => e.key) };
        setAppliedResult(empty);
        onApplied?.(empty);
    };

    // ── Success state ────────────────────────────────────────────────────────
    if (appliedResult) {
        const appliedCount = appliedResult.applied.length;
        return (
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
            >
                <Card className="border-2 border-[#576238]/30 shadow-md rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#576238]/10 via-white to-transparent border-b border-[#576238]/20">
                        <CardTitle className="flex items-center gap-2 text-[#576238] text-xl">
                            <CheckCircle2 className="h-5 w-5 text-[#576238]" />
                            {appliedCount > 0
                                ? "Refinements applied"
                                : "Refinements skipped"}
                        </CardTitle>
                        <CardDescription className="text-[#576238]/80">
                            {appliedCount > 0
                                ? `${appliedCount} startup field${
                                      appliedCount === 1 ? "" : "s"
                                  } updated with the recommended version.`
                                : "Your existing startup data was left unchanged."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {appliedCount > 0 && (
                            <ul className="space-y-1.5 text-sm text-[#576238]/85">
                                {appliedResult.applied.map((k) => (
                                    <li key={k} className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-[#576238]" />
                                        <span>{humanize(k)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {staleStageCount > 0 && (
                            <div className="rounded-lg border border-[#FFD95D]/60 bg-[#FFD95D]/15 p-4 flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-[#576238] mt-0.5 flex-shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-[#576238]">
                                        {staleStageCount} completed stage{staleStageCount === 1 ? "" : "s"} now show a refresh hint
                                    </p>
                                    <p className="text-xs leading-relaxed text-[#576238]/80">
                                        Your existing outputs are still saved and the stages
                                        remain marked complete. From the startup dashboard you'll
                                        see a yellow accent on each affected stage — visit it and
                                        click <em>Regenerate</em> whenever you'd like that stage
                                        rebuilt with the refined inputs. This is optional.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    // ── Approval state ───────────────────────────────────────────────────────
    const allSelected = selected.size === entries.length;
    const noneSelected = selected.size === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
        >
            <Card className="border-2 border-[#FFD95D]/70 shadow-md rounded-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[#FFD95D]/20 via-white to-transparent border-b border-[#FFD95D]/40">
                    <CardTitle className="flex items-center gap-2 text-[#576238] text-xl">
                        <Wand2 className="h-5 w-5 text-[#576238]" />
                        Refine your startup data
                    </CardTitle>
                    <CardDescription className="text-gray-600 text-sm">
                        The recommendation agent suggests stronger versions of the
                        following statements. Approve the ones you'd like to apply —
                        they'll replace your current startup info and feed into the next
                        round of Market Research, Evaluation, and Documents.
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-[#576238]/10 pb-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="select-all-refinements"
                                checked={allSelected}
                                onCheckedChange={(c) => toggleAll(c === true)}
                            />
                            <Label
                                htmlFor="select-all-refinements"
                                className="text-sm font-semibold text-[#576238] cursor-pointer"
                            >
                                Select all ({entries.length})
                            </Label>
                        </div>
                        <span className="text-xs text-[#576238]/70">
                            {selected.size} selected
                        </span>
                    </div>

                    <div className="space-y-4">
                        {entries.map(({ key, value }) => {
                            const isOn = selected.has(key);
                            return (
                                <div
                                    key={key}
                                    className={`rounded-lg border p-4 transition-colors ${
                                        isOn
                                            ? "border-[#576238]/40 bg-white"
                                            : "border-gray-200 bg-gray-50/60"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id={`refine-${key}`}
                                            checked={isOn}
                                            onCheckedChange={(c) => toggle(key, c === true)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 min-w-0 space-y-3">
                                            <Label
                                                htmlFor={`refine-${key}`}
                                                className="block text-sm font-semibold text-[#576238] cursor-pointer"
                                            >
                                                {humanize(key)}
                                            </Label>

                                            <div className="grid md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                        Current
                                                    </p>
                                                    <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                                                        {value.original?.trim() || (
                                                            <span className="italic text-gray-400">
                                                                Not specified yet
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#576238]">
                                                        <ArrowRight className="h-3 w-3" />
                                                        Recommended
                                                    </p>
                                                    <p className="text-sm leading-relaxed text-[#576238] whitespace-pre-wrap font-medium">
                                                        {value.recommended}
                                                    </p>
                                                </div>
                                            </div>

                                            {value.why_better && (
                                                <div className="rounded-md bg-[#F0EADC]/40 border border-[#576238]/15 px-3 py-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#576238]/80 mb-1">
                                                        Why this is stronger
                                                    </p>
                                                    <p className="text-xs leading-relaxed text-[#576238]/90">
                                                        {value.why_better}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2 text-red-600">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2 border-t border-[#576238]/10">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSkip}
                            disabled={isApplying}
                            className="border-[#576238]/40 text-[#576238] hover:bg-[#576238]/5"
                        >
                            Skip for now
                        </Button>
                        <Button
                            type="button"
                            onClick={handleApply}
                            disabled={isApplying || noneSelected}
                            className="bg-[#576238] hover:bg-[#464f2d] text-white font-semibold"
                        >
                            {isApplying ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Applying…
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2 text-[#FFD95D]" />
                                    Apply {selected.size > 0 ? `${selected.size} ` : ""}refinement
                                    {selected.size === 1 ? "" : "s"}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
