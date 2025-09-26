# Impact Dashboard Pipeline — Implementation Plan (MVP)

Goal: Implement a thin, production-shaped MAP → REDUCE → COMPOSE pipeline that ingests only RawSession JSON footers from our mock session generator, computes deterministic facts, aggregates to cohort level, and renders 2 sections via small LLM composers.

---

## Current State Review

- Mock session generator: implemented
  - UI: `src/app/tools/mock-sessions/page.tsx`
  - API: `src/app/api/mock-sessions/generate/route.ts` (uses `ai` SDK + OpenAI)
  - Parser for example intake and locked skeleton: `src/lib/mock-sessions/parse.ts`
  - Raw types: `src/lib/mock-sessions/types.ts` (includes `RawSession` schema shape)
  - Survey registry: `src/lib/mock-sessions/surveyKeys.ts`
  - Fixtures: `src/lib/mock-sessions/fixtures.ts`
- AI helper for background tasks: `src/lib/ai.ts` (routes to `/api/chat`)
- What’s missing (this MVP):
  - Zod schemas for SessionFacts/CohortFacts/SectionOutput
  - MAP compute + extraction agent (footer-only)
  - REDUCE aggregation
  - COMPOSE (Assessment Outcomes, Overall Impact) using structured outputs
  - Server action + simple UI under `/reports`
  - Dev scripts to run MAP/REDUCE/COMPOSE on folders

---

## Packages To Add

- `zod` — runtime schemas + validation
- `p-limit` — limit extraction/conposition concurrency (MAP and COMPOSE)
- `tsx` (dev) — run TypeScript scripts from `src/scripts`

Optional:
- none (Node `crypto` is sufficient for `factsHash`)

---

## Data Contracts (Zod)

- AssessmentDelta = { key:string; label:string; pre:number|null; post:number|null; change:number|null }
- SessionFacts = {
  sessionId:string; programId:string;
  milestoneCompletionPct:number; // 0–100
  assessments: AssessmentDelta[];
  strengths:string[]; improvements:string[]; themes:string[];
  reasons:string[]; challenges:string[];
  quotes:{ text:string; theme?:string; sessionId:string }[]; // 1–2 max
  completeness:{ hasPre:boolean; hasPost:boolean; hasReflections:boolean };
  version:string; createdAt:string;
}
- CohortFacts = {
  programId:string; nSessions:number; nWithPrePost:number;
  completion:{ meanPct:number; medianPct:number };
  assessments:{ key:string; label:string; avgPre:number|null; avgPost:number|null; avgChange:number|null; pctImproved:number|null }[];
  topStrengths:{ tag:string; count:number }[];
  topImprovements:{ tag:string; count:number }[];
  topThemes:{ tag:string; count:number }[];
  topChallenges:{ tag:string; count:number }[];
  exemplarQuotes:{ text:string; theme?:string; sessionId:string }[]; // ≤ 8, diverse
  dataQualityNotes:string[];
  factsHash:string; // stable hash for caching
}
- SectionOutput = { prose:string; component:Record<string,any> }

Rules encoded in compute helpers and schema refinements:
- Numeric scale forced to 1–10 ints; strings coerced; empty strings → null; out-of-range clamped and logged.
- Require ≥2 paired pre/post keys (if available); otherwise mark completeness.
- `milestoneCompletionPct` derived from milestone states in `RawSession`.
- The extraction agent (one call) tags strengths/improvements/themes and picks 1–2 quotes from reflections/outcomes. All other fields via deterministic code.
- No markdown parsing; footer-only ingestion.

---

## File Layout To Implement

```
/src/types/schemas.ts                 // Zod: AssessmentDelta, SessionFacts, CohortFacts, SectionOutput
/src/lib/map/compute.ts               // deterministic helpers (coercions, deltas, completion, medians)
/src/lib/agents/extract-session.ts    // small extraction agent (tags + quotes)
/src/lib/map/build-session-facts.ts   // RawSession -> SessionFacts
/src/lib/reduce/build-cohort-facts.ts // SessionFacts[] -> CohortFacts
/src/lib/compose/assessment-outcomes.ts // CohortFacts -> SectionOutput
/src/lib/compose/overall-impact.ts    // CohortFacts -> SectionOutput
/src/app/reports/actions.ts           // server action: end-to-end pipeline run
/src/app/reports/page.tsx             // simple UI: run + render sections + CohortFacts debug
/src/scripts/run-map.ts               // dev: MAP a folder of mock footer JSONs
/src/scripts/run-reduce.ts            // dev: REDUCE a folder of SessionFacts
/src/scripts/run-compose.ts           // dev: COMPOSE from a CohortFacts JSON
```

---

## Step-by-Step Plan

1) Scaffolding & Types
- Add dependencies: `zod`, `p-limit`, `tsx`.
- Create `src/types/schemas.ts` with Zod definitions and exported TypeScript types.
- Decide canonical survey key map: reuse `src/lib/mock-sessions/surveyKeys.ts` labels for assessment labels.
- Add utility: `src/lib/map/compute.ts` with:
  - `coerceScore(value): number|null` (parse, clamp 1–10, round, empty→null)
  - `pairPrePost(answersPre, answersPost, registry) => AssessmentDelta[]`
  - `computeMilestoneCompletionPct(raw: RawSession) => number`
  - `median(nums:number[])`, `mean(nums:number[])`
  - `stableSort<T>(...)` (for determinism where needed)

2) MAP: RawSession → SessionFacts
- Implement `src/lib/agents/extract-session.ts`:
  - Input: `RawSession`, condensed free text from footer: reflection text + outcome notes (date/focus/notes/plan) limited to ~1200 chars.
  - One `generateObject` call (ai SDK + Zod) to return `{ strengths:string[]; improvements:string[]; themes:string[]; quotes:{text:string; theme?:string}[] }` with limits (≤6 tags each, 1–2 quotes). Include `model` name and `version` in result for logging.
  - Strict system prompt: produce tags, avoid clinical/PII, single-responsibility.
  - Concurrency limit: exported `extractSessionFactsLLM` accepts an optional limiter (defaults to `p-limit(8)`).
- Implement `src/lib/map/build-session-facts.ts`:
  - Deterministically compute `assessments` from pre/post `answers` objects on Applicant Survey milestones.
  - Compute `completeness` `{ hasPre, hasPost, hasReflections }` and `milestoneCompletionPct`.
  - Use application `reasons`/`challenges` directly (no LLM).
  - Call extraction agent for strengths/improvements/themes/quotes; tag with `version`, `createdAt` ISO.
  - Validate result with Zod, return `SessionFacts`.
  - Include debug log object `{ sessionId, changedKeys: countPairedKeys, extractionModelVersion }`.

3) REDUCE: SessionFacts[] → CohortFacts
- Implement `src/lib/reduce/build-cohort-facts.ts`:
  - Compute `nSessions`, `nWithPrePost`.
  - `completion.meanPct` and `.medianPct` across sessions.
  - For each assessment key present in any SessionFacts:
    - `avgPre`, `avgPost`, `avgChange`, `pctImproved` (change>0), all `null` when insufficient data.
  - Top-K (e.g., K=6) for strengths/improvements/themes/challenges with stable tie-breaking.
  - `exemplarQuotes`: up to 8 quotes, favor diverse themes and sessions.
  - `dataQualityNotes`: emit notes for sparse data, few paired keys, missing reflections, etc.
  - `factsHash`: SHA-256 of a stable JSON of all above (exclude non-deterministic orderings; sort keys/arrays where appropriate).
  - Validate with Zod, return `CohortFacts`.

4) COMPOSE: CohortFacts → sections (structured LLM)
- Implement `src/lib/compose/assessment-outcomes.ts`:
  - Use `generateObject` (ai SDK) with CohortFacts only.
  - Output: `SectionOutput` with `prose` (2–4 sentences, concise) + `component.series` = sorted list `[ { key, label, avgPre, avgPost, avgChange, pctImproved } ]`.
  - Guard: refuse to hallucinate; if sparse, include a short data-quality sentence.
- Implement `src/lib/compose/overall-impact.ts`:
  - Use `generateObject` with CohortFacts only.
  - Output: `prose` (2–4 sentences) + `component.meta = { nSessions, completion: { meanPct, medianPct }, notes: string[], quotes: 1–2 }`.
  - Input quotes limited to the `exemplarQuotes` from `CohortFacts`.
  - Deterministic prompt style, no raw text exposure beyond CohortFacts.

5) Server Action + UI
- Create `src/app/reports/actions.ts`:
  - `runPipeline({ dir: string }): Promise<{ cohortFacts: CohortFacts; sections: { assessmentOutcomes: SectionOutput; overallImpact: SectionOutput } }>`
  - Read all `*.json` RawSession footers from `dir` (server-side fs), map → reduce → compose.
  - Concurrency limit LLM calls to `8`.
  - Optionally accept `programId` filter (default: the only one present).
- Create `src/app/reports/page.tsx`:
  - Simple form to input a local folder path (dev only) or use `.env` default `IMPACT_MOCKS_DIR`.
  - On submit, call server action; render two sections (prose + small JSON component) and a collapsible `CohortFacts` debug block.
  - Keep UI minimal.

6) Dev Scripts (DX)
- `src/scripts/run-map.ts`:
  - Args: `--in <dir> --out <dir> [--concurrency 8]`.
  - Read RawSession JSON files from `in`, write `SessionFacts` JSON per file to `out`.
  - Log `{ sessionId, changedKeys, extractionModelVersion }`.
- `src/scripts/run-reduce.ts`:
  - Args: `--in <dir> --out <file>`.
  - Read SessionFacts, group by `programId` (MVP: first group), write a single `CohortFacts` JSON.
- `src/scripts/run-compose.ts`:
  - Args: `--in <cohort.json> --out <dir>`.
  - Produce `assessment-outcomes.json` and `overall-impact.json` with `SectionOutput`.
  - Print a brief console summary of generated prose.

7) Guardrails, Determinism, Logging
- Safety rails:
  - Coerce numeric strings → numbers; empty strings → null; clamp to 1–10.
  - Reject out-of-range values with clamp + note (MAP logs) but never crash pipeline.
  - Never read markdown; only `RawSession` JSON.
- Determinism:
  - Stable sort keys before hashing; prefer pure functions; only LLM outputs can vary slightly (order of tags); capture `extractionModelVersion`.
  - `factsHash` excludes timestamps.
- Concurrency:
  - Use `p-limit(8)` for extraction and composition calls.

8) Tests & Quick Validation
- Unit tests (targeted small set):
  - `compute.ts` median/mean; `coerceScore`; `pairPrePost` pairs and change calc.
  - `build-cohort-facts` averages, medians, pctImproved, top-k stability, `factsHash` stability.
- Manual QA (Quick Test Plan):
  - Generate 5 mocks via `/tools/mock-sessions`.
  - Run `/reports` with the mocks folder.
  - Verify SessionFacts have ≥2 paired keys or completeness flags; milestone completion ~100% when all milestones present.
  - CohortFacts shows non-zero `% improved` for at least one key.
  - Sections render concise prose + JSON components; debug `CohortFacts` block present.
  - Remove post answers in one mock; verify a data-quality note and composers still run.

---

## TODO Checklist (AI-Ready)

Setup
- [x] Add deps: `zod`, `p-limit`, `tsx` in `package.json`.
- [x] `.env.local`: add `IMPACT_MOCKS_DIR` (dev path to JSON footers).

Schemas & Utilities
- [x] Create `src/types/schemas.ts` (AssessmentDelta, SessionFacts, CohortFacts, SectionOutput).
- [x] Implement `src/lib/map/compute.ts` (coercions, pair/deltas, completion, mean/median, stable helpers).

MAP
- [x] Implement `src/lib/agents/extract-session.ts` using `generateObject` + Zod (one call; tags + 1–2 quotes).
- [x] Implement `src/lib/map/build-session-facts.ts` (footer-only; reasons/challenges deterministic; completeness + logging).

REDUCE
- [x] Implement `src/lib/reduce/build-cohort-facts.ts` (aggregations, top-k, exemplar quotes, dataQualityNotes, factsHash).

COMPOSE
- [x] Implement `src/lib/compose/assessment-outcomes.ts` (structured `SectionOutput`).
- [x] Implement `src/lib/compose/overall-impact.ts` (structured `SectionOutput`).

Reports UI
- [x] Add `src/app/reports/actions.ts` (server action to run pipeline over folder).
- [x] Add `src/app/reports/page.tsx` (invoke action; render 2 sections + CohortFacts debug).

Dev Scripts
- [x] Add `src/scripts/run-map.ts` (dir → SessionFacts dir).
- [x] Add `src/scripts/run-reduce.ts` (SessionFacts dir → CohortFacts file).
- [x] Add `src/scripts/run-compose.ts` (CohortFacts file → two `SectionOutput` files).

Validation
- [x] Seed 5 mocks and run `/reports` (or inline Step 2); verify acceptance criteria.
- [ ] Add small unit tests for compute + reduce helpers.

---

## Implementation Notes & Prompts

Extraction Agent (MAP)
- System: “You tag counseling progress succinctly. Return arrays: strengths, improvements, themes (≤6 each) and 1–2 short quotes. Use only the provided snippets (reflections and outcome notes). No PII, no diagnoses.”
- Schema (Zod): `{ strengths: z.array(z.string()).max(6), improvements: ..., themes: ..., quotes: z.array(z.object({ text: z.string().min(6).max(220), theme: z.string().optional() })).max(2) }`.

Composers (COMPOSE)
- Assessment Outcomes: focus on deltas and % improved; avoid overclaiming with sparse data; output concise prose and series array.
- Overall Impact: summarize cohort size, completion stats, top notes, and include 1–2 exemplar quotes if present.

Data Quality Notes (examples)
- “Only 1 paired pre/post key across sessions; outcomes may be unstable.”
- “Reflections missing in 3/5 sessions; qualitative themes may be incomplete.”
- “Completion median < 50%; participants are early in the journey.”

Hashing
- Use Node `crypto` to compute `factsHash = sha256(JSON.stringify(stableFacts))` where `stableFacts` sorts tag buckets and keys.

---

## Acceptance Criteria Mapping

- MAP: 5 mocks produce valid `SessionFacts`; ≥2 paired keys or completeness flag present.
- REDUCE: Valid `CohortFacts`; averages/medians/% improved correct; top tags populated.
- COMPOSE: Both sections return valid `SectionOutput` via structured outputs; no schema errors.
- UI: `/reports` renders both sections and debug `CohortFacts` JSON.
- Determinism: Re-runs stable (timestamps/extraction tag order aside). No markdown used.
- Safety: coercions + clamps enforced; logs include `sessionId`, changed-keys count, extraction model/version.

---

## Next Actions

1) Add dependencies and scaffold `schemas.ts`, `compute.ts`.
2) Implement MAP path end-to-end; validate on 1–2 JSON footers.
3) Implement REDUCE and verify aggregates on small sample.
4) Implement COMPOSE with structured outputs; sanity check outputs.
5) Add server action + `/reports` page; wire with mocks dir.
6) Ship dev scripts; run the Quick Test Plan and adjust prompts/notes as needed.
