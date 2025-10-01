import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

import { parseMockSession, extractProgramHeaderBlock, extractMilestoneOutline } from '@/lib/mock-sessions/parse';
import type {
  RawSession,
  GenerationLogEntry,
  QA,
  ApplicantSurveyMilestone,
  OutcomeNoteMilestone,
} from '@/lib/mock-sessions/types';
import { SURVEY_KEYS, SURVEY_KEY_MAP } from '@/lib/mock-sessions/surveyKeys';
import {
  PARTICIPANT_FIRST_NAMES,
  PARTICIPANT_LAST_NAMES,
  ZIP_CODES,
  PROGRAM_REASONS,
  PROGRAM_CHALLENGES,
  REFLECTION_SEED_PHRASES,
  CHURCH_ATTENDANCE_CHOICES,
  BIRTH_YEAR_BUCKETS,
  GENDER_CHOICES,
  ETHNICITY_CHOICES,
} from '@/lib/mock-sessions/fixtures';

export const runtime = 'nodejs';

const GENERATOR_VERSION = 'mock-session-generator@0.2.0';
const MAX_COUNT = 50;
const MIN_COUNT = 1;
const MAX_MARKDOWN_BYTES = 30 * 1024; // 30 KB
const MAX_JSON_BYTES = 20 * 1024; // 20 KB
const MAX_EXAMPLE_BYTES = 75 * 1024; // 75 KB guardrail
const DEFAULT_CONCURRENCY = 6;
const STORAGE_BUCKET = 'uploads';
const STORAGE_FOLDER = 'mock-sessions';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an elite content generator that fabricates realistic, human-like program session artifacts.\n\nCarefully study the provided example to infer the program’s intent, domain, structure, tone, headings, bullet styles, separators, and data anchors. Mirror the example’s terminology (including role titles) and formatting exactly while varying content within the provided guidance.\n\nClone the milestone frame from the example: names, types, order, and descriptions must remain identical. Do not introduce or modify roles, headings, or milestone details. Only vary the milestone content fields: application answers, reflection text, and outcome reports (including plan items).\n\nFor each Outcome Reporting milestone (e.g., a final report), mirror the example’s internal section headings and layout exactly (such as Program Overview, Attendance & Engagement, Key Themes, Progress & Growth, Observations, Recommendations) when present. Do not introduce Date/Focus/Plan formats unless the example uses them; instead, follow the example’s structure precisely.\n\nNever include commentary outside the document. Always append a fenced \`json\` code block describing the RawSession payload. Use plain UTF-8 text (no smart quotes unless provided) and avoid trailing commentary.`;

const STRICT_REMINDER = `STRICT MODE REMINDER:\n- Match headings exactly.\n- Maintain all milestone sections.\n- Keep numeric scales at integers between 1 and 10.\n- Ensure JSON footer is valid and matches the document.`;

const SENTIMENT_ORDER = ['positive', 'neutral', 'negative'] as const;
type Sentiment = (typeof SENTIMENT_ORDER)[number];

type SentimentMix = Record<Sentiment, number>;

type GenerateRequest = {
  exampleText?: unknown;
  count?: unknown;
  sentimentMix?: unknown;
  omitProbability?: unknown;
  seed?: unknown;
  store?: unknown;
};

type ValidatedPayload = {
  exampleText: string;
  count: number;
  mix: SentimentMix;
  omitProbability: number;
  seedLabel: string;
  seedValue: number;
  store: boolean;
};

type GenerateResult = {
  filename: string;
  content: string;
  json?: any;
  seedUsed: string;
  generatorVersion: string;
  log: GenerationLogEntry;
};

type StoredFileResult = {
  filename: string;
  markdownUrl?: string;
  markdownPath?: string;
  jsonUrl?: string;
  jsonPath?: string;
  error?: string;
};

type OmissionPlan = {
  programApplicationIndexes: number[];
  omitSchedulingLink: boolean;
  omitReflection: boolean;
  omitPlanIndex?: number;
  surveyOmissions: {
    pre: string[];
    post: string[];
  };
};

type SurveyTemplate = {
  pre: QA[];
  post: QA[];
};

type ScenarioPlan = {
  participant: {
    name: string;
    gender: string;
    birthYearBucket: string;
    zipCode: string;
    ethnicity: string;
  };
  programReasons: string[];
  programChallenges: string[];
  reflectionHint: string;
};

class BadRequestError extends Error {
  public status = 400;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRequest;
    const payload = validatePayload(body);

    const baseParse = parseMockSession(payload.exampleText);
    const trimmedExample = payload.exampleText.trim();
    const surveyTemplate = collectSurveyTemplate(baseParse);
    const lockedHeaderBlock = extractProgramHeaderBlock(trimmedExample);
    const milestoneOutline = extractMilestoneOutline(trimmedExample);

    const schedule = createSentimentSchedule(payload.count, payload.mix, payload.seedValue);

    const tasks = schedule.map((sentiment, idx) => () =>
      generateSession({
        baseMarkdown: trimmedExample,
        baseRawSession: baseParse,
        surveyTemplate,
        lockedHeaderBlock,
        milestoneOutline,
        sentiment,
        idx,
        payload,
      }),
    );

    const results = await runWithConcurrency(Math.min(DEFAULT_CONCURRENCY, tasks.length), tasks);
    const stored = payload.store ? await storeResults(results) : undefined;

    return NextResponse.json({ files: results, stored });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Error generating mock sessions', error);
    return NextResponse.json({ error: 'Failed to generate mock sessions.' }, { status: 500 });
  }
}

function validatePayload(body: GenerateRequest): ValidatedPayload {
  if (typeof body.exampleText !== 'string' || !body.exampleText.trim()) {
    throw new BadRequestError('`exampleText` must be a non-empty string.');
  }

  const exampleBytes = Buffer.byteLength(body.exampleText, 'utf8');
  if (exampleBytes > MAX_EXAMPLE_BYTES) {
    throw new BadRequestError('`exampleText` exceeds the maximum allowed size.');
  }

  if (typeof body.count !== 'number' || !Number.isFinite(body.count)) {
    throw new BadRequestError('`count` must be a number.');
  }

  const count = Math.floor(body.count);
  if (count < MIN_COUNT || count > MAX_COUNT) {
    throw new BadRequestError(`count must be between ${MIN_COUNT} and ${MAX_COUNT}.`);
  }

  const rawMix = body.sentimentMix;
  if (
    !rawMix ||
    typeof rawMix !== 'object' ||
    rawMix === null ||
    !('positive' in rawMix) ||
    !('neutral' in rawMix) ||
    !('negative' in rawMix)
  ) {
    throw new BadRequestError('`sentimentMix` must include positive, neutral, and negative values.');
  }

  const mix = normalizeMix({
    positive: readNumeric((rawMix as Record<string, unknown>).positive, 'sentimentMix.positive'),
    neutral: readNumeric((rawMix as Record<string, unknown>).neutral, 'sentimentMix.neutral'),
    negative: readNumeric((rawMix as Record<string, unknown>).negative, 'sentimentMix.negative'),
  });

  const omitProbability = readNumeric(body.omitProbability, 'omitProbability');
  if (omitProbability < 0 || omitProbability > 0.2) {
    throw new BadRequestError('`omitProbability` must be between 0 and 0.2.');
  }

  const seedLabel =
    typeof body.seed === 'string' || typeof body.seed === 'number'
      ? String(body.seed)
      : String(Date.now());
  const seedValue = hashSeed(seedLabel);

  const store = Boolean(body.store);

  return {
    exampleText: body.exampleText,
    count,
    mix,
    omitProbability,
    seedLabel,
    seedValue,
    store,
  };
}

function normalizeMix(mix: SentimentMix): SentimentMix {
  const total = mix.positive + mix.neutral + mix.negative;
  if (!(total > 0)) {
    throw new BadRequestError('`sentimentMix` must sum to a positive value.');
  }

  return {
    positive: mix.positive / total,
    neutral: mix.neutral / total,
    negative: mix.negative / total,
  };
}

function collectSurveyTemplate(raw: RawSession): SurveyTemplate {
  const applicantMilestones = raw.milestones.filter(
    (milestone) => milestone.type === 'Applicant Survey',
  ) as ApplicantSurveyMilestone[];

  const preCandidate = applicantMilestones.find((milestone) =>
    (milestone.title || '').toLowerCase().includes('pre'),
  );
  const postCandidate = applicantMilestones
    .slice()
    .reverse()
    .find((milestone) => (milestone.title || '').toLowerCase().includes('post'));

  const pre = preCandidate?.qa ?? applicantMilestones[0]?.qa ?? [];
  const post = postCandidate?.qa ?? applicantMilestones[applicantMilestones.length - 1]?.qa ?? [];

  return { pre, post };
}

function readNumeric(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadRequestError(`${label} must be a finite number.`);
  }
  return value;
}

function createSentimentSchedule(count: number, mix: SentimentMix, seedValue: number): Sentiment[] {
  const rng = createRng(seedValue);
  const schedule: Sentiment[] = [];

  for (let i = 0; i < count; i++) {
    const choice = weightedPick(mix, rng());
    schedule.push(choice);
  }

  return schedule;
}

function weightedPick(mix: SentimentMix, sample: number): Sentiment {
  let cumulative = 0;
  for (const sentiment of SENTIMENT_ORDER) {
    cumulative += mix[sentiment];
    if (sample <= cumulative) {
      return sentiment;
    }
  }
  return SENTIMENT_ORDER[SENTIMENT_ORDER.length - 1];
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: number) {
  let value = seed || 1;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function runWithConcurrency<T>(limit: number, tasks: Array<() => Promise<T>>): Promise<T[]> {
  if (!tasks.length) {
    return [];
  }

  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      if (currentIndex >= tasks.length) {
        return;
      }
      nextIndex += 1;
      results[currentIndex] = await tasks[currentIndex]!();
    }
  };

  const pool = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(pool);
  return results;
}

function createSessionId(seedLabel: string, idx: number): string {
  const sanitizedSeed = seedLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'seed';
  const suffix = String(idx + 1).padStart(3, '0');
  return `mock-${sanitizedSeed}-${suffix}`;
}

function ensureWithinLimits(fullMarkdown: string, json: string) {
  const mdBytes = Buffer.byteLength(fullMarkdown, 'utf8');
  const jsonBytes = Buffer.byteLength(json, 'utf8');

  if (mdBytes > MAX_MARKDOWN_BYTES) {
    throw new Error('Generated markdown exceeds size limits.');
  }

  if (jsonBytes > MAX_JSON_BYTES) {
    throw new Error('Generated JSON exceeds size limits.');
  }
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  if (!items.length) {
    throw new Error('Cannot pick from an empty list.');
  }
  const index = Math.floor(rng() * items.length);
  return items[Math.max(0, Math.min(index, items.length - 1))]!;
}

function pickMany<T>(rng: () => number, items: readonly T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = temp;
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function randomId(rng: () => number, length: number = 26): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let output = '';
  for (let i = 0; i < length; i++) {
    output += alphabet[Math.floor(rng() * alphabet.length)] ?? '0';
  }
  return output;
}

function buildScenarioPlan(rng: () => number): ScenarioPlan {
  const participantFirst = pick(rng, PARTICIPANT_FIRST_NAMES);
  const participantLast = pick(rng, PARTICIPANT_LAST_NAMES);

  return {
    participant: {
      name: `${participantFirst} ${participantLast}`,
      gender: pick(rng, GENDER_CHOICES),
      birthYearBucket: pick(rng, BIRTH_YEAR_BUCKETS),
      zipCode: pick(rng, ZIP_CODES),
      ethnicity: pick(rng, ETHNICITY_CHOICES),
    },
    programReasons: pickMany(rng, PROGRAM_REASONS, 2 + Math.floor(rng() * 2)),
    programChallenges: pickMany(rng, PROGRAM_CHALLENGES, 2 + Math.floor(rng() * 2)),
    reflectionHint: pick(rng, REFLECTION_SEED_PHRASES),
  };
}

function createOmissionPlan(options: {
  surveyTemplate: SurveyTemplate;
  omitProbability: number;
  rng: () => number;
  applicationAnswerCount: number;
  maxPlanItems: number;
}): OmissionPlan {
  const { surveyTemplate, omitProbability, rng, applicationAnswerCount, maxPlanItems } = options;

  const plan: OmissionPlan = {
    programApplicationIndexes: [],
    omitSchedulingLink: rng() < omitProbability,
    omitReflection: rng() < omitProbability,
    surveyOmissions: {
      pre: [],
      post: [],
    },
  };

  const programIndexes: number[] = [];
  for (let i = 1; i <= applicationAnswerCount; i++) {
    if (rng() < omitProbability) {
      programIndexes.push(i);
    }
  }
  if (programIndexes.length === applicationAnswerCount && applicationAnswerCount > 0) {
    programIndexes.pop();
  }
  plan.programApplicationIndexes = programIndexes;

  if (maxPlanItems > 0 && rng() < omitProbability) {
    plan.omitPlanIndex = 1 + Math.floor(rng() * maxPlanItems);
  }

  const pairableKeys = surveyTemplate.pre
    .map((qa) => qa.key)
    .filter((key) => surveyTemplate.post.some((qa) => qa.key === key));

  for (const key of pairableKeys) {
    const omitPre = rng() < omitProbability;
    const omitPost = rng() < omitProbability && !omitPre;
    if (omitPre) {
      plan.surveyOmissions.pre.push(key);
    }
    if (omitPost) {
      plan.surveyOmissions.post.push(key);
    }
  }

  const keptCount = () =>
    pairableKeys.filter(
      (key) =>
        !plan.surveyOmissions.pre.includes(key) && !plan.surveyOmissions.post.includes(key),
    ).length;

  while (keptCount() < 2 && (plan.surveyOmissions.pre.length || plan.surveyOmissions.post.length)) {
    if (plan.surveyOmissions.post.length && (!plan.surveyOmissions.pre.length || rng() < 0.5)) {
      plan.surveyOmissions.post.pop();
    } else if (plan.surveyOmissions.pre.length) {
      plan.surveyOmissions.pre.pop();
    } else {
      break;
    }
  }

  return plan;
}

function formatOmissionPlan(plan: OmissionPlan): string {
  const list = (values: string[] | number[] | undefined) =>
    values && values.length ? values.join(', ') : 'none';

  return `Omission plan (leave content blank but keep labels):\n- Program application answer indexes to omit (1-based order): ${list(
    plan.programApplicationIndexes,
  )}\n- Survey answers to omit in PRE survey (by key): ${list(plan.surveyOmissions.pre)}\n- Survey answers to omit in POST survey (by key): ${list(plan.surveyOmissions.post)}\n- Omit meeting scheduling link: ${plan.omitSchedulingLink ? 'yes' : 'no'}\n- Omit reflection paragraph: ${plan.omitReflection ? 'yes' : 'no'}\n- Omit plan bullet index (if applicable): ${plan.omitPlanIndex ?? 'none'}`;
}

function buildSentimentGuidance(sentiment: Sentiment): string {
  if (sentiment === 'positive') {
    return 'Target outcome: Strong progress. Show +2 to +4 average improvement across 2–3 survey keys, highlight optimistic tone, minimal omissions.';
  }
  if (sentiment === 'neutral') {
    return 'Target outcome: Mixed results. Keep deltas between -1 and +1, reflections should acknowledge wins and friction, include moderate omissions.';
  }
  return 'Target outcome: Limited or negative progress. Keep deltas between -2 and 0, emphasize ongoing hurdles, allow higher omissions while keeping structure.';
}

function buildSurveyKeyInstructions(surveyTemplate: SurveyTemplate): string {
  const lines = SURVEY_KEYS.map((entry) => {
    const hasPre = surveyTemplate.pre.some((qa) => qa.key === entry.key);
    const hasPost = surveyTemplate.post.some((qa) => qa.key === entry.key);
    if (!hasPre && !hasPost) {
      return null;
    }
    const scaleInfo = entry.type === 'scale' ? ` (scale ${entry.scale!.min}-${entry.scale!.max})` : '';
    return `- ${entry.key}: ${entry.label}${scaleInfo}`;
  }).filter(Boolean);
  return lines.length ? lines.join('\n') : '- Use the same keys as the example for all survey items.';
}

function buildUserPrompt(options: {
  exampleText: string;
  scenario: ScenarioPlan;
  sentiment: Sentiment;
  omissionPlan: OmissionPlan;
  surveyTemplate: SurveyTemplate;
  seedUsed: string;
  sessionId: string;
  strictMode: boolean;
  lockedHeaderBlock: string;
  milestoneOutline: Array<{ type: string; title?: string; description?: string }>;
}): string {
  const { exampleText, scenario, sentiment, omissionPlan, surveyTemplate, seedUsed, sessionId, strictMode, lockedHeaderBlock, milestoneOutline } = options;

  const strictAddendum = strictMode ? `\n${STRICT_REMINDER}` : '';

  const lockedMilestonesText = milestoneOutline
    .map((m, i) => `  ${String(i + 1).padStart(2, '0')}. [${m.type}] ${m.title ?? '(untitled)'}${m.description ? ` — ${m.description}` : ''}`)
    .join('\n');

  return `---BEGIN EXAMPLE---\n${exampleText}\n---END EXAMPLE---\n\nGenerate ONE new mock session document that mirrors the exact structure, headings, bullet styles, dividers, and ordering of the example. Use fresh story content that matches the guidance below. ${strictAddendum}\n\nLOCKED PROGRAM HEADER (copy exactly, but set the Version id in the heading to the Session ID below):\n${lockedHeaderBlock}\n\nContext:\n- Seed: ${seedUsed}\n- Session ID to use as the Version id in the heading: ${sessionId}\n- Sentiment target: ${sentiment}\n- Participant name: ${scenario.participant.name}\n- Participant gender: ${scenario.participant.gender}\n- Participant birth year bucket: ${scenario.participant.birthYearBucket}\n- Participant ZIP code: ${scenario.participant.zipCode}\n- Participant ethnicity: ${scenario.participant.ethnicity}\n- Program motivations to weave in: ${scenario.programReasons.join('; ')}\n- Program challenges to mention: ${scenario.programChallenges.join('; ')}\n- Reflection tone hint: ${scenario.reflectionHint}\n\nMilestone skeleton (keep these titles, types, order, and descriptions exactly; only vary the milestone responses/answers/notes):\n${lockedMilestonesText}\n\nSentiment guidance: ${buildSentimentGuidance(sentiment)}\n\nSurvey keys (keep labels identical, values must be integers 1-10):\n${buildSurveyKeyInstructions(surveyTemplate)}\n\n${formatOmissionPlan(omissionPlan)}\n\nCanonical JSON footer schema (no alternates):\n- For Applicant Survey milestones: use an "answers" object mapping survey keys to integers (1-10) or null for omissions. Do not include "qa" or "survey" arrays.\n- For Meeting milestones: include a "meeting" object with optional fields { with, details, schedulingLink }. Do not place these at the root.\n- For Reflection milestones: include a "reflection" object with { text }.\n- For Outcome Reporting milestones: include a "markdownOutcome" object that mirrors the example’s section content. Include notes (free-form text) and plan[] when present (e.g., items under Recommendations). Do not invent Date/Focus unless present in the example.\n- Never include duplicate or second timelines; produce one single 3-week window mirroring the example.\n- Never output empty strings for survey omissions; use null instead.\n\nAdditional rules:\n- Use ISO timestamps within the last 60 days and keep chronological order.\n- Maintain all milestone headings and the given titles verbatim.\n- Never duplicate names or locations from the example.\n- Keep at least two survey items with answers in BOTH pre and post sections.\n- When omitting content, leave the label but no text after the colon or bullet.\n- Reflection paragraph must be under 120 words even when brief.\n- Append a fenced \`json\` block representing the RawSession; it must include rawSchemaVersion 'v1', generatorVersion '${GENERATOR_VERSION}', seed '${seedUsed}', sessionId '${sessionId}', and sentiment '${sentiment}'.\n- JSON must contain milestones mirroring the document (Applicant Survey, Meeting, Outcome Note with markdownOutcome, Reflection, Post-Survey, Final Report or equivalent).\n- Do not add commentary before or after the document.`;
}

function canonicalizeRawSession(
  raw: RawSession,
  base: RawSession,
  outline: Array<{ type: string; title?: string; description?: string }>,
  surveyTemplate: SurveyTemplate,
  mdParsed: RawSession | undefined,
  scenario: ScenarioPlan,
  rng: () => number,
): any {
  const clone = Array.isArray(raw.milestones) ? [...raw.milestones] : [];

  const findMatch = (t: string, title?: string) => {
    const idx = clone.findIndex((m: any) => (m?.type || '').toLowerCase() === t.toLowerCase() && (!title || (m?.title || '') === title));
    if (idx === -1) return undefined;
    const [m] = clone.splice(idx, 1);
    return m;
  };

  const baseMilestones = base.milestones || [];
  const baseMatch = (t: string, title?: string) => baseMilestones.find((m: any) => (m?.type || '').toLowerCase() === t.toLowerCase() && (!title || (m?.title || '') === title));

  const toNumberIfInt = (val: any) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number' && Number.isInteger(val)) return val;
    if (typeof val === 'string') {
      const n = Number(val);
      if (Number.isInteger(n)) return n;
      if (val.trim() === '') return null;
      return val;
    }
    return val;
  };

  const canonicalMilestones = outline.map((o) => {
    const m: any = findMatch(o.type, o.title) || baseMatch(o.type, o.title) || { type: o.type, title: o.title };
    const mFromMd: any = mdParsed?.milestones?.find((mm: any) => (mm?.type || '').toLowerCase() === (o.type || '').toLowerCase() && (o.title ? (mm?.title || '') === o.title : true));
    const core = {
      type: o.type,
      title: o.title ?? m.title ?? '',
      description: o.description ?? m.description,
      completedAt: m.completedAt,
    } as any;

    if (/^applicant survey$/i.test(o.type)) {
      const answers: Record<string, number | string | null> = {};
      if (m.answers && typeof m.answers === 'object') {
        for (const [k, v] of Object.entries(m.answers)) {
          const keySpec = (SURVEY_KEY_MAP as any)[k];
          let normalized = toNumberIfInt(v);
          if (keySpec?.type === 'scale') {
            normalized = typeof normalized === 'number' ? normalized : null;
            if (typeof normalized === 'number') {
              const { min, max } = keySpec.scale;
              if (!(normalized >= min && normalized <= max)) normalized = null;
            }
          }
          answers[k] = normalized;
        }
      }
      const qaCandidate = Array.isArray(m.qa) ? m.qa : Array.isArray(mFromMd?.qa) ? mFromMd?.qa : undefined;
      if (Array.isArray(qaCandidate)) {
        for (const qa of qaCandidate) {
          if (!qa || typeof qa !== 'object') continue;
          const key = (qa as any).key || (qa as any).label;
          if (!key) continue;
          const val = (qa as any).answer;
          const keySpec = (SURVEY_KEY_MAP as any)[key];
          let normalized = toNumberIfInt(val);
          if (keySpec?.type === 'scale') {
            normalized = typeof normalized === 'number' ? normalized : null;
            if (typeof normalized === 'number') {
              const { min, max } = keySpec.scale;
              if (!(normalized >= min && normalized <= max)) normalized = null;
            }
          }
          answers[key] = normalized;
        }
      }
      core.answers = answers;
      // Ensure no empty strings and convert to null
      for (const k of Object.keys(core.answers)) {
        if (core.answers[k] === '') core.answers[k] = null;
      }
      return core;
    }

    if (/^meeting$/i.test(o.type)) {
      const bm = baseMatch('Meeting', o.title) as any;
      core.meeting = {
        with: bm?.meeting?.with ?? bm?.with ?? m.meeting?.with,
        details: bm?.meeting?.details ?? bm?.details ?? m.meeting?.details ?? m.details,
        schedulingLink: bm?.meeting?.schedulingLink ?? bm?.schedulingLink ?? m.meeting?.schedulingLink ?? m.schedulingLink,
      };
      return core;
    }

    if (/^reflection$/i.test(o.type)) {
      core.reflection = {
        text: m.reflection?.text ?? m.text,
      };
      return core;
    }

    if (/^outcome note$/i.test(o.type)) {
      core.markdownOutcome = m.markdownOutcome || {};
      return core;
    }

    return core;
  });

  // Enforce pre/post pairing: ensure at least two keys present in BOTH
  const applicantIndexes = canonicalMilestones
    .map((mm: any, i: number) => ({ i, mm }))
    .filter(({ mm }: any) => (mm.type || '').toLowerCase() === 'applicant survey')
    .map(({ i }) => i);

  if (applicantIndexes.length >= 2) {
    const pre = canonicalMilestones[applicantIndexes[0]] as any;
    const post = canonicalMilestones[applicantIndexes[applicantIndexes.length - 1]] as any;
    const keysPre = Object.keys(pre.answers || {});
    const keysPost = Object.keys(post.answers || {});
    const pairable = SURVEY_KEYS.map((s) => s.key).filter((k) => keysPre.includes(k) && keysPost.includes(k));
    const numericPairCount = pairable.filter((k) => Number.isInteger(pre.answers?.[k]) && Number.isInteger(post.answers?.[k])).length;
    if (numericPairCount < 2) {
      const templateKeys = surveyTemplate.pre
        .map((qa) => qa.key)
        .filter((k) => surveyTemplate.post.some((qa) => qa.key === k));
      for (const k of templateKeys) {
        if (!Number.isInteger(pre.answers?.[k])) pre.answers[k] = 5; // default mid-scale if missing
        if (!Number.isInteger(post.answers?.[k])) post.answers[k] = 5;
        const nowPairable = Number.isInteger(pre.answers?.[k]) && Number.isInteger(post.answers?.[k]);
        if (nowPairable && pairable.length + 1 >= 2) break;
      }
    }

    // Sentiment-aware nudge: ensure post moves in the expected direction for scale keys
    const sentiment = (raw as any)?.sentiment as 'positive' | 'neutral' | 'negative' | undefined;
    if (sentiment && sentiment !== 'neutral') {
      const scaleKeys = SURVEY_KEYS.filter((s) => s.type === 'scale').map((s) => s.key);
      const candidates = scaleKeys.filter((k) => Number.isInteger(pre.answers?.[k]) && Number.isInteger(post.answers?.[k]));
      if (candidates.length) {
        // Pick ~60% of keys to adjust, at least 2 when possible
        const targetCount = Math.max(2, Math.min(candidates.length, Math.round(candidates.length * 0.6)));
        const shuffled = candidates
          .map((k) => ({ k, r: rng() }))
          .sort((a, b) => a.r - b.r)
          .map((e) => e.k);
        const selected = shuffled.slice(0, targetCount);
        for (const key of selected) {
          const preVal = pre.answers[key] as number;
          const postVal = post.answers[key] as number;
          if (!Number.isInteger(preVal) || !Number.isInteger(postVal)) continue;
          if (sentiment === 'positive') {
            const delta = 1 + Math.round(rng()); // 1 or 2
            post.answers[key] = Math.max(1, Math.min(10, Math.max(postVal, preVal + delta)));
          } else if (sentiment === 'negative') {
            const delta = 1 + Math.round(rng()); // 1 or 2
            post.answers[key] = Math.max(1, Math.min(10, Math.min(postVal, preVal - delta)));
          }
        }
      }
    }
  }

  const canonical: any = {
    rawSchemaVersion: 'v1',
    generatorVersion: raw.generatorVersion,
    seed: raw.seed,
    sessionId: raw.sessionId,
    programId: raw.programId,
    sentiment: raw.sentiment,
    milestones: canonicalMilestones,
  };
  // Inject demographics and application directly into footer (avoid parsing markdown for these)
  canonical.demographics = buildDemographicsFromScenario(scenario, rng);
  canonical.application = buildApplicationFromScenario(scenario);
  return canonical;
}

function buildDemographicsFromScenario(scenario: ScenarioPlan, rng: () => number): Record<string, string> {
  const year = deriveBirthYear(scenario.participant.birthYearBucket, rng) ?? '';
  return {
    'Birth Year': String(year),
    'Gender': scenario.participant.gender,
    'Zip Code': scenario.participant.zipCode,
  };
}

function deriveBirthYear(bucket: string, rng: () => number): number | undefined {
  const m = bucket.match(/(\d{4})\s*-\s*(\d{4})/);
  if (!m) return undefined;
  const min = Number(m[1]);
  const max = Number(m[2]);
  if (!(min && max && max >= min)) return undefined;
  const span = max - min + 1;
  return min + Math.floor(rng() * span);
}

function buildApplicationFromScenario(scenario: ScenarioPlan): { reasons?: string[]; challenges?: string[] } {
  return {
    reasons: scenario.programReasons?.slice(0, 3),
    challenges: scenario.programChallenges?.slice(0, 3),
  };
}

type ParsedOutput = {
  markdown: string;
  jsonText?: string;
};

function extractJsonFooterFromOutput(output: string): ParsedOutput {
  const match = /```json\s*([\s\S]+?)```/i.exec(output);
  if (!match) {
    return { markdown: output.trim() };
  }
  return {
    markdown: output.slice(0, match.index).trimEnd(),
    jsonText: match[1]?.trim(),
  };
}

function parseJsonFooter(jsonText: string | undefined): RawSession | undefined {
  if (!jsonText) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    // Guard against malformed model output (e.g., milestones as string/object)
    if (!parsed || typeof parsed !== 'object') {
      return undefined;
    }
    const milestones = (parsed as any).milestones;
    if (!Array.isArray(milestones)) {
      console.warn('JSON footer missing milestones array; ignoring footer.');
      return undefined;
    }
    return parsed as RawSession;
  } catch (error) {
    console.warn('Failed to parse JSON footer', error);
    return undefined;
  }
}

function validateRawSession(raw: RawSession) {
  if (!Array.isArray(raw.milestones)) {
    throw new Error('RawSession.milestones must be an array.');
  }
  if (raw.milestones.length < 4) {
    throw new Error('RawSession is missing milestone data.');
  }
  const hasApplicant = raw.milestones.some((milestone) => milestone?.type === 'Applicant Survey');
  const hasMeeting = raw.milestones.some((milestone) => milestone?.type === 'Meeting');
  const hasOutcome = raw.milestones.some((milestone) => milestone?.type === 'Outcome Note');
  const hasReflection = raw.milestones.some((milestone) => milestone?.type === 'Reflection');
  if (!hasApplicant || !hasMeeting || !hasOutcome || !hasReflection) {
    throw new Error('RawSession must include applicant, meeting, outcome, and reflection milestones.');
  }
}

function ensureRequiredMilestones(raw: RawSession, base: RawSession): RawSession {
  const out: RawSession = {
    ...raw,
    milestones: Array.isArray(raw.milestones) ? [...raw.milestones] : [],
  };

  const hasType = (t: string) => out.milestones.some((m: any) => m?.type === t);
  const addFromBaseOrMinimal = (t: 'Applicant Survey' | 'Meeting' | 'Outcome Note' | 'Reflection') => {
    const fromBase = (base.milestones || []).find((m: any) => m?.type === t);
    if (fromBase) {
      out.milestones.push(fromBase as any);
      console.warn(`Repaired missing milestone by copying from base: ${t}`);
      return;
    }
    // Minimal placeholders to satisfy downstream processing
    if (t === 'Applicant Survey') {
      out.milestones.push({ type: 'Applicant Survey', title: 'Applicant Survey', qa: [] } as any);
    } else if (t === 'Meeting') {
      out.milestones.push({ type: 'Meeting', title: 'Meeting' } as any);
    } else if (t === 'Outcome Note') {
      out.milestones.push({ type: 'Outcome Note', title: 'Outcome Note', markdownOutcome: {} } as any);
    } else if (t === 'Reflection') {
      out.milestones.push({ type: 'Reflection', title: 'Reflection' } as any);
    }
    console.warn(`Repaired missing milestone with minimal placeholder: ${t}`);
  };

  if (!hasType('Applicant Survey')) addFromBaseOrMinimal('Applicant Survey');
  if (!hasType('Meeting')) addFromBaseOrMinimal('Meeting');
  if (!hasType('Outcome Note')) addFromBaseOrMinimal('Outcome Note');
  if (!hasType('Reflection')) addFromBaseOrMinimal('Reflection');

  return out;
}

async function generateSession(options: {
  baseMarkdown: string;
  baseRawSession: RawSession;
  surveyTemplate: SurveyTemplate;
  lockedHeaderBlock: string;
  milestoneOutline: Array<{ type: string; title?: string; description?: string }>;
  sentiment: Sentiment;
  idx: number;
  payload: ValidatedPayload;
}): Promise<GenerateResult> {
  const { baseMarkdown, baseRawSession, surveyTemplate, lockedHeaderBlock, milestoneOutline, sentiment, idx, payload } = options;

  const seedUsed = `${payload.seedLabel}:${idx + 1}`;
  const sessionId = createSessionId(payload.seedLabel, idx);
  const baseSeed = hashSeed(seedUsed);
  const rng = createRng(baseSeed);
  const scenario = buildScenarioPlan(rng);
  const applicationAnswerCount =
    (baseRawSession.application?.reasons?.length ?? 0) +
    (baseRawSession.application?.challenges?.length ?? 0);
  const maxPlanItems = Math.max(
    0,
    ...baseRawSession.milestones
      .filter((milestone) => milestone.type === 'Outcome Note')
      .map((milestone) => {
        const outcome = milestone as OutcomeNoteMilestone;
        const plan = outcome.markdownOutcome?.plan ?? [];
        return Array.isArray(plan) ? plan.length : 0;
      }),
  );

  const omissionPlan = createOmissionPlan({
    surveyTemplate,
    omitProbability: payload.omitProbability,
    rng,
    applicationAnswerCount,
    maxPlanItems,
  });

  const attempts = [false, true];
  let lastError: unknown;

  for (const strictMode of attempts) {
    try {
      const prompt = buildUserPrompt({
        exampleText: baseMarkdown,
        scenario,
        sentiment,
        omissionPlan,
        surveyTemplate,
        seedUsed,
        sessionId,
        strictMode,
        lockedHeaderBlock,
        milestoneOutline,
      });

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system: SYSTEM_PROMPT,
        prompt,
      });

      const extracted = extractJsonFooterFromOutput(text);
      const mdParsed = parseMockSession(text);
      const rawFromJson = parseJsonFooter(extracted.jsonText);

      // Source of truth: always derive RawSession from the markdown document
      let rawSession = mdParsed;
      rawSession = {
        ...rawSession,
        rawSchemaVersion: 'v1',
        generatorVersion: GENERATOR_VERSION,
        seed: seedUsed,
        sessionId,
        programId: baseRawSession.programId,
        sentiment,
      };

      // Attempt to repair missing milestone types before strict validation
      rawSession = ensureRequiredMilestones(rawSession, baseRawSession);

      validateRawSession(rawSession);

      // Canonicalize footer schema and drop duplicates
      const canonical = canonicalizeRawSession(
        rawSession,
        baseRawSession,
        milestoneOutline,
        surveyTemplate,
        mdParsed,
        scenario,
        rng,
      );

      const jsonFooter = JSON.stringify(canonical, null, 2);
      const markdownWithFooter = `${extracted.markdown || text.trim()}\n\n\`\`\`json\n${jsonFooter}\n\`\`\``;
      ensureWithinLimits(markdownWithFooter, jsonFooter);

      return {
        filename: createFilename(idx, sentiment),
        content: markdownWithFooter,
        json: canonical,
        seedUsed,
        generatorVersion: GENERATOR_VERSION,
        log: {
          idx,
          sentiment,
          omittedPct: payload.omitProbability,
          // We always canonicalize from markdown; ignore model-supplied JSON
          parsePath: 'md',
          retried: strictMode,
          needsManualFix: false,
        },
      };
    } catch (error) {
      lastError = error;
      console.warn(`Generation attempt ${strictMode ? 'strict' : 'standard'} failed`, error);
    }
  }

  console.error('Falling back after generation failure', lastError);

  const fallbackRaw: RawSession = {
    ...baseRawSession,
    rawSchemaVersion: 'v1',
    generatorVersion: GENERATOR_VERSION,
    seed: seedUsed,
    sessionId,
    sentiment,
  };

  const fallbackJson = JSON.stringify(fallbackRaw, null, 2);
  const fallbackContent = `${baseMarkdown}\n\n<!-- generation failed for seed ${seedUsed}; manual fix required -->\n\n\`\`\`json\n${fallbackJson}\n\`\`\``;
  ensureWithinLimits(fallbackContent, fallbackJson);

  return {
    filename: createFilename(idx, sentiment),
    content: fallbackContent,
    json: fallbackRaw,
    seedUsed,
    generatorVersion: GENERATOR_VERSION,
    log: {
      idx,
      sentiment,
      omittedPct: payload.omitProbability,
      parsePath: 'json',
      retried: true,
      needsManualFix: true,
    },
  };
}

function createFilename(idx: number, sentiment: Sentiment): string {
  const sequence = String(idx + 1).padStart(3, '0');
  return `mock-session-${sequence}-${sentiment}.md`;
}

async function storeResults(results: GenerateResult[]): Promise<StoredFileResult[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials missing; skipping upload.');
    return results.map((result) => ({
      filename: result.filename,
      error: 'Supabase configuration missing on server.',
    }));
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const uploads: StoredFileResult[] = [];
  const timestamp = Date.now();

  for (const result of results) {
    const basePath = `${STORAGE_FOLDER}/${timestamp}-${result.filename}`;
    const markdownBlob = new Blob([result.content], { type: 'text/markdown' });
    const jsonBlob = new Blob([JSON.stringify(result.json ?? null, null, 2)], {
      type: 'application/json',
    });

    const markdownPath = `${basePath}`;
    const jsonPath = `${basePath.replace(/\.md$/, '')}.json`;

    const uploadMarkdown = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(markdownPath, markdownBlob, { cacheControl: '3600', upsert: true })
      .catch((error) => ({ error }));

    const markdownUrl = uploadMarkdown?.error
      ? undefined
      : supabase.storage.from(STORAGE_BUCKET).getPublicUrl(markdownPath).data.publicUrl;

    const uploadJson = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(jsonPath, jsonBlob, { cacheControl: '3600', upsert: true })
      .catch((error) => ({ error }));

    const jsonUrl = uploadJson?.error
      ? undefined
      : supabase.storage.from(STORAGE_BUCKET).getPublicUrl(jsonPath).data.publicUrl;

    uploads.push({
      filename: result.filename,
      markdownUrl,
      markdownPath,
      jsonUrl,
      jsonPath,
      error: uploadMarkdown?.error?.message || uploadJson?.error?.message,
    });
  }

  return uploads;
}
