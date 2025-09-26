Mock Session Data Generator — Implementation Plan

Goals
- Allow a user to upload one example session file (`.md` or `.txt`).
- Generate X additional session files that strictly match the example’s format.
- Vary content (some positive/neutral/negative), occasionally leave fields blank to mimic human variation.
- Append a compact JSON footer to each file for reliable ingestion.
- Return files for download (ZIP) and optionally store in Supabase Storage.

Success Criteria
- Output files render as plain text/markdown and visually mirror the sectioning and bullet structure of the example.
- Each output includes a valid `RawSession` JSON footer, or is parseable to `RawSession` by our deterministic parser.
- Key sections are present with plausible, diverse content; some fields are intentionally left blank (content only, not structure).
- User can control number of files (X), the sentiment mix, and omission probability.

Tech Overview
- Frontend: Next.js App Router page at `src/app/tools/mock-sessions/page.tsx`.
- API: `src/app/api/mock-sessions/generate/route.ts` (Node runtime for batching and validation).
- AI: Reuse OpenAI via `ai` SDK (similar to `src/app/api/chat/route.ts`).
- Parser: `src/lib/mock-sessions/parse.ts` and types in `src/lib/mock-sessions/types.ts`.
- Normalizer: `src/lib/mock-sessions/normalize.ts` (`rawSessionToSessionFacts`).
- Storage (optional): Supabase via `src/lib/storage.ts`.
 - Survey Keys Registry: `src/lib/mock-sessions/surveyKeys.ts` (lock pre/post keys).
 - Fixtures for diversity: `src/lib/mock-sessions/fixtures.ts` (names/zips/motivations/challenges).

0) Schema & Versioning
- JSON footer includes: `rawSchemaVersion: "v1"`, `generatorVersion: string`, and `seed` used for this file.
- Maintain a `surveyKeys` registry to lock pre/post pairable items (e.g., `mental_health`, `sleep_quality`).
- Enforce numeric scale `1–10` integers for all numeric survey answers.

1) UX & Flows
- Route: Add sidebar link to `Tools → Mock Sessions` that navigates to `/tools/mock-sessions`.
- Inputs:
  - File upload (accepts `.md,.txt`), required.
  - Count `X` (1–50), default 5.
  - Sentiment distribution sliders or inputs: negative/neutral/positive totaling 100%.
  - Omission probability (0–20%) to randomly leave specific fields blank (content only; keep headings).
  - Toggle: Upload results to Supabase Storage.
  - Button: Generate.
- Outputs:
  - Progress states per file (1..X) with retry info if applied.
  - Download ZIP button when complete.
  - If storage enabled, show a folder link/public URLs.

2) Input Handling (Client)
- Read the uploaded file as UTF-8 text.
- Send POST to `/api/mock-sessions/generate` with:
  - `exampleText` (string)
  - `count` (number)
  - `sentimentMix` ({ negative: number; neutral: number; positive: number })
  - `omitProbability` (0–0.2)
  - `seed` (optional string/number for reproducibility)
  - `store` (boolean)
- Handle batched responses; simplest: wait for all, then present results and ZIP on client.

3) Output Format Constraints (Mirroring the Example)
- Preserve headline ordering and separators exactly as in the example: titles, underlines (`====`/`----`), section labels (e.g., `Offering (...) Details:`), and bullet prefixes (`- `).
- Maintain milestone blocks in the same order and headings:
  - Pre-Survey → Applicant Survey Milestone (Question/Answers pairs)
  - Week 0N Session → Meeting Milestone
  - Therapist uploads session N notes → Outcome Reporting Milestone with “Markdown outcome” (Date, Focus, Therapist Notes, Plan)
  - Week N Reflection → Reflection Milestone (single paragraph)
  - Post-Survey → Applicant Survey Milestone
  - Final Report → Outcome Reporting Milestone with long-form “Markdown outcome” summary
- Keep timestamps and IDs plausible and ISO-like; vary them slightly.
- After the document, append a fenced code block labeled `json` containing a compact `RawSession` JSON (see schema below). No explanations.

4) Variation Rules
- Sentiment: allocate target counts for negative/neutral/positive based on the mix; see 13) for scheduling.
- Omission behavior (content only): with `omitProbability`, randomly leave some fields blank (e.g., a missing answer line, empty reflection, missing `Scheduling Link`, omit one “Plan” bullet). Never omit headings/labels.
- Never omit all answers in both pre and post for the same survey key (ensure pairability).
- Keep at least 1 reflection sentence if the doc would otherwise have no qualitative text.
- Diversity: vary names, demographics, program motivations, and milestone details while respecting the structure. Do not reuse names/locations from the example; avoid PII.
- Surveys: standardize numeric scales to 1–10 (integers). Keep identical keys/labels between pre and post so deltas compute.

5) Prompting Strategy (LLM)
- One-file-per-call for control and retries.
- System prompt:
  - “Mimic exactly the formatting, headings, bullet styles, and section order of the provided example. Produce one complete session document in plain text/markdown. Do not add explanations. After the document, append a fenced `json` code block containing a compact `RawSession` JSON. Do not copy names/locations from the example; invent generic ones.”
- User prompt template (server fills variables):
  - Provide: `exampleText`
  - Provide: `sentiment` (negative/neutral/positive)
  - Provide: `omitProbability` and enumerate eligible omission fields
  - Provide: rules for timestamps (ISO-like) and numeric answer ranges (1–10)
  - Provide: rubric for positive/neutral/negative (delta trends, omissions, tone)
- Enforce: “no extra commentary,” “match separators exactly,” “keep headings even when content omitted,” and “append JSON footer.”
  - JSON footer must include `rawSchemaVersion:"v1"`, `generatorVersion`, and `seed`.

6) Server API (Node runtime)
- File: `src/app/api/mock-sessions/generate/route.ts`
- Runtime: `export const runtime = 'nodejs'` (zipping, batching, parsing).
- Auth: Optional initially; later require Supabase session (follow `src/app/api/users/me/route.ts`).
- Steps:
  1) Validate payload (count bounds, mix ~100%±1, text length limits, omitProbability bounds).
  2) Build generation schedule array of sentiments from the mix (see 13).
  3) Generate in parallel with a small pool (use `p-limit(6–8)`):
     - Compose prompt from template + `exampleText` + chosen sentiment + `omitProbability` + `seed+i`.
     - Call OpenAI via `ai` SDK (`openai('gpt-4o-mini')`).
     - Capture raw text output.
     - Try parse JSON footer; if missing/invalid, parse markdown via `parseMockSession`.
     - If parsing fails, retry once with "strict mode" (restate headings/labels and scale rules). If still failing, mark `needsManualFix: true` but keep the file.
     - Accumulate `{ filename, content, json?: RawSession, seedUsed, generatorVersion, log: { idx, sentiment, omittedPct, parsePath: 'json'|'md', retried: boolean, needsManualFix: boolean } }`.
  4) If `store` is true, upload each file via `uploadFile` (optionally alongside `parsedJson` as a `.json`).
  5) Return JSON: `{ files: [...], stored?: [...urls...] }`.
- Zipping: Prefer client-side ZIP to avoid server deps. Return raw files; client zips via JSZip.

- Limits:
  - Cap JSON footer size `< 20 KB` and markdown length `< 30 KB`; truncate with a logged warning if exceeded (never truncate headings/labels).
  - One retry max per file.

7) Validation Heuristics (cheap, reliable)
- Headers present exactly once: `Offering`, `Participant Demographics:`, `Program Application:`.
- Milestones ≥ 6: include at least one Applicant Survey, one Meeting, one Outcome note with “Markdown outcome”, one Reflection; Post-Survey encouraged.
- Pre/Post pairing: ≥ 2 Q/A items appear in both with identical keys/labels.
- Anchors: at least 1 “Markdown outcome” block; check bullets `-Title:` / `-Description:` / `Answers:` occur.
- Dates: match ISO-like regex (e.g., `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*`).
- Scales: numeric answers limited to 1–10 if numeric; strings allowed for categorical items.
- Length guards: total doc below a max size; reflection ≤ ~120 words.
- Final gate: `RawSession` parse success; otherwise one retry, then return flagged.

7.1) Determinism Knobs
- Use seeded PRNG per file (`seed+i`) for:
  - Timestamp drift: generate plausible ISO dates, drifting ±N days per milestone while preserving order where appropriate.
  - Omission sampling and sentiment-driven delta generation.
- Enforce numeric scale `1–10` as integers; reject out-of-range early and round floats.

8) Filenames & Metadata
- Derive base from the upload (e.g., `example.md` → `mock-session-001-positive.md`).
- Generate `sessionId` like `mock-YYYYMMDD-xxxxx` inside JSON.
- Include sentiment tag in filename; include `seed` in metadata for reproducibility.
- Avoid PII: instruct model to use generic names; redact sensitive details.

9) Frontend Implementation
- Create page: `src/app/tools/mock-sessions/page.tsx` with:
  - Uploader (accept `.md,.txt`), count, mix inputs, omission slider, store toggle.
  - Generate handler: reads file text, POSTs to API, shows per-file progress and retry notices.
  - ZIP download using `jszip` when response returns array of files.
  - If stored, list public URLs.
  - Optional: show JSON-valid indicator per file; on click, show parsed JSON.
 - Badges & quick actions:
  - Show a green/red JSON-valid badge per file; clicking reveals parsed JSON.
  - Provide “Download ZIP” and “Copy all JSON” buttons for fast pipeline tests.

10) Dependencies
- `jszip` for client zipping.
- (Optional) `zod` for payload validation and `RawSession` validation.
- (Optional) `p-limit` for API-side concurrency control.
 - (Optional) `seedrandom` (or simple LCG) for seeded PRNG.
- Reuse existing `ai` SDK and OpenAI env vars from `src/app/api/chat/route.ts`.

11) Parser, Types, and Normalizer
- Types file: `src/lib/mock-sessions/types.ts`
  ```ts
  export type QA = { key: string; label: string; answer?: string | number };
  export type Milestone =
    | { type: 'Applicant Survey'; title: string; qa: QA[] }
    | { type: 'Meeting'; title: string; schedulingLink?: string; details?: string }
    | { type: 'Outcome Note'; title: string; markdownOutcome: { date?: string; focus?: string; notes?: string; plan?: string[] } }
    | { type: 'Reflection'; title: string; text?: string };

  export type RawSession = {
    sessionId: string;
    programId: string;
    demographics?: Record<string, string>;
    application?: { reasons?: string[]; challenges?: string[] };
    milestones: Milestone[];
  };
  ```
- Parser: `src/lib/mock-sessions/parse.ts` — deterministic regex/slicing per section; unit test against the provided example and edge cases.
- Normalizer: `src/lib/mock-sessions/normalize.ts` — `rawSessionToSessionFacts(raw)` for MAP pipeline.
 - Survey Keys Registry: `src/lib/mock-sessions/surveyKeys.ts` — export fixed key list used for pairing and validation.

11.1) Parser Tests
- Write 6–8 unit tests for `parseMockSession`:
  - Golden example parses into `RawSession`.
  - Missing scheduling link handled (field undefined, structure intact).
  - Empty reflection paragraph allowed.
  - Missing Post-Survey still passes with a warning flag.
  - Odd bullets (spaces, different dashes) still parse anchors.
  - Long plan list remains within limits; parser collects items.
- Prefer section slicers (regex per heading) and fail fast with actionable errors indicating which heading failed.

12) Determinism & Diversity Controls
- Use `seed` and pass `seed+i` per file; temperature ~0.8–1.0, top_p ~0.9.
- Maintain small name/zip/gender pools and motivation/challenge templates in `src/lib/mock-sessions/fixtures.ts` to bias diversity and avoid repeating example entities.
- Instruction: do not reuse names/locations from the example; invent generic details.
 - Forbid explicit PII (emails, phones, precise addresses). Use generic US 5-digit ZIPs.

13) Sentiment Scheduling & Rubric
- Schedule sampling:
  ```ts
  function weightedPick(weights: [string, number][]) {
    const total = weights.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [k, w] of weights) { if ((r -= w) <= 0) return k; }
    return weights[weights.length - 1][0];
  }
  function schedule(count: number, mix: {positive: number; neutral: number; negative: number}) {
    return Array.from({ length: count }, () =>
      weightedPick([["positive", mix.positive],["neutral", mix.neutral],["negative", mix.negative]])
    );
  }
  ```
- Rubric guidance (baked into prompt):
  - Positive: improved deltas (+2 to +4 mean across 2–3 keys), optimistic reflections, few omissions.
  - Neutral: mixed/flat deltas (-1 to +1 mean), balanced reflections, some omissions.
  - Negative: small/negative deltas (-2 to 0 mean), friction in reflections, more omissions (structure intact).
 - Safety rails:
  - Never omit both pre and post for the same survey key; keep ≥ 2 pairable items overall.

14) Error Handling & UX States
- Validate inputs before submit; show inline errors (mix must sum ~100%, count within bounds, file present).
- Show per-item generation status with retry indicator when fallback used.
- AI/API errors: allow single-item retry or batch retry; don’t block entire batch on one failure.
- Files failing strict parse after retry are returned with `needsManualFix: true`.
 - Per-file logging: `{ idx, sentiment, omittedPct, parsePath: 'json'|'md', retried, needsManualFix }` included in API response; surface compact indicators in UI.

15) QA Checklist
- Golden parse: run parser on `docs/example data.md` → expect `RawSession` with pre/post and ≥ 1 reflection.
- Batch smoke: generate X=3 (mix 40/40/20, omit 0.1); expect unique `sessionId`s, plausible dates, no reused names.
- MAP compatibility: convert each `RawSession` → SessionFacts; run compute functions; no runtime errors, reasonable numbers.
- Reduce/Compose: run pipeline end-to-end; sections render; no missing fields.
- Edge: high omissions (0.2) + negative: structure intact, at least 1 pre/post pair available in ≥1 category.

16) Security & PII Guardrails
- Generate generic names; no emails/phones/exact addresses; zip codes can be generic 5-digit.
- Dates within a recent window (e.g., last 60 days) across milestones.

17) Future Enhancements
- “Style Strictness” knob (1–3) to tune enforcement and retries.
- Template library to select different baseline examples.
- Streaming per-file with live preview.
- Optional server-side ZIP if batching becomes large.

Appendix A — Prompt Template (server-side, tightened)
- System
  > You will produce one mock session document that exactly matches the formatting, headings, separators, bullet styles, and section order of the example. Do not add commentary. Keep all section labels present, even when content is omitted. After the document, append a fenced `json` code block containing a compact `RawSession` JSON (see schema hints). Do not copy names/locations from the example; invent generic ones.
- User (variables in {…})

````
---BEGIN EXAMPLE (format only)---
{exampleText}
---END EXAMPLE---

Requirements:
- Sentiment target: {sentiment}  // positive | neutral | negative
- Omission probability: {omitProbability}  // 0.00–0.20
- Eligible omissions (content only): program application answers, meeting scheduling link, reflection paragraph, individual survey answers, one "Plan" bullet in any outcome note.
- Never omit headings/labels or the "Markdown outcome" block header.
- Surveys: use the SAME keys/labels in pre and post where comparable. Numeric scale = 1–10 (integers).
- Milestones: include at least one Applicant Survey Milestone (pre), one Meeting Milestone, one Outcome Reporting Milestone with "Markdown outcome", one Reflection Milestone, and a Post-Survey Milestone (post may be omitted for negative sentiment, but keep structure if present).
- Dates: ISO-like; vary plausibly across the document.
- Reflection: ≤ 120 words.

At the end, append:

```json
{"rawSchemaVersion":"v1",
 "generatorVersion":"{generatorVersion}",
 "seed":"{seed}",
 "sessionId":"mock-{seed}-{index}",
 "programId":"mock-program",
 "demographics":{...},
 "application":{"reasons":[...],"challenges":[...]},
 "milestones":[
   {"type":"Applicant Survey","title":"Pre-Survey","qa":[{"key":"mental_health","label":"How would you rate your overall mental health?","answer":4}]},
   {"type":"Meeting","title":"Week 01 Session","schedulingLink":"...","details":"..."},
   {"type":"Outcome Note","title":"Therapist uploads session 1 notes","markdownOutcome":{"date":"...","focus":"...","notes":"...","plan":["..."]}},
   {"type":"Reflection","title":"Week 1 Reflection","text":"..."},
   {"type":"Applicant Survey","title":"Post-Survey","qa":[{"key":"mental_health","label":"How would you rate your overall mental health?","answer":7}]}
 ]}
```

Seed: {seed}
````

Appendix B — RawSession schema (TypeScript)
```ts
export type QA = { key: string; label: string; answer?: string | number };
export type Milestone =
  | { type: 'Applicant Survey'; title: string; qa: QA[] }
  | { type: 'Meeting'; title: string; schedulingLink?: string; details?: string }
  | { type: 'Outcome Note'; title: string; markdownOutcome: { date?: string; focus?: string; notes?: string; plan?: string[] } }
  | { type: 'Reflection'; title: string; text?: string };

export type RawSession = {
  rawSchemaVersion: 'v1';
  generatorVersion: string;
  seed: string | number;
  sessionId: string;
  programId: string;
  demographics?: Record<string, string>;
  application?: { reasons?: string[]; challenges?: string[] };
  milestones: Milestone[];
};
```
