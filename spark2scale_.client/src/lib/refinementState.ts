// Tracks which workflow stages should display a "regenerate to use refined
// inputs" hint after the founder has applied refinements. The state is kept in
// localStorage (per-startup, per-browser) so the original workflow flags can
// stay set to true — the stages remain "complete" but get a visual cue until
// the founder chooses to regenerate them.
//
// Stage IDs match the camelCase keys on WorkflowData: marketResearch,
// evaluation, recommendation, documents, pitchDeck, ideaCheck.

const STORAGE_PREFIX = "spark2scale_refinement_stale__";

export type StageId =
    | "ideaCheck"
    | "marketResearch"
    | "evaluation"
    | "recommendation"
    | "documents"
    | "pitchDeck";

function key(startupId: string): string {
    return `${STORAGE_PREFIX}${startupId}`;
}

function isBrowser(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStaleStages(startupId: string): Set<StageId> {
    if (!isBrowser() || !startupId) return new Set();
    try {
        const raw = window.localStorage.getItem(key(startupId));
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((s): s is StageId => typeof s === "string"));
    } catch {
        return new Set();
    }
}

export function setStaleStages(startupId: string, stages: Iterable<StageId>): void {
    if (!isBrowser() || !startupId) return;
    try {
        const arr = Array.from(new Set(stages));
        if (arr.length === 0) {
            window.localStorage.removeItem(key(startupId));
            return;
        }
        window.localStorage.setItem(key(startupId), JSON.stringify(arr));
    } catch {
        // localStorage may be unavailable (private mode, quota); fail silently.
    }
}

export function addStaleStages(startupId: string, stages: Iterable<StageId>): void {
    const current = getStaleStages(startupId);
    for (const s of stages) current.add(s);
    setStaleStages(startupId, current);
}

export function clearStaleStage(startupId: string, stage: StageId): void {
    const current = getStaleStages(startupId);
    if (!current.has(stage)) return;
    current.delete(stage);
    setStaleStages(startupId, current);
}

export function clearAllStaleStages(startupId: string): void {
    if (!isBrowser() || !startupId) return;
    try {
        window.localStorage.removeItem(key(startupId));
    } catch {
        // ignore
    }
}
