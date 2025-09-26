import type { LimitFunction } from 'p-limit';

import type {
  ApplicantSurveyMilestone,
  RawSession,
  ReflectionMilestone,
} from '@/lib/mock-sessions/types';
import {
  buildAssessmentDeltas,
  coerceScore,
  computeMilestoneCompletionPct,
} from '@/lib/map/compute';
import {
  EXTRACTION_AGENT_VERSION,
  extractSessionSignals,
} from '@/lib/agents/extract-session';
import { sessionFactsSchema, type SessionFacts } from '@/types/schemas';

const SESSION_FACTS_VERSION = 'session-facts@0.1.0';

export type BuildSessionFactsOptions = {
  limiter?: LimitFunction;
  model?: string;
  now?: () => string;
  version?: string;
};

export type SessionFactsMeta = {
  sessionId: string;
  programId: string;
  pairedAssessments: number;
  availableAssessments: number;
  extractionModel: string;
  extractionVersion: string;
};

export type BuildSessionFactsResult = {
  facts: SessionFacts;
  meta: SessionFactsMeta;
};

export async function buildSessionFacts(
  raw: RawSession,
  options: BuildSessionFactsOptions = {},
): Promise<BuildSessionFactsResult> {
  const { preAnswers, postAnswers } = collectSurveyAnswers(raw);

  const assessmentResult = buildAssessmentDeltas(preAnswers, postAnswers);
  const extraction = await extractSessionSignals(raw, {
    limiter: options.limiter,
    model: options.model,
  });

  const createdAt = options.now ? options.now() : new Date().toISOString();
  const version = options.version ?? SESSION_FACTS_VERSION;

  const factsInput: SessionFacts = sessionFactsSchema.parse({
    sessionId: raw.sessionId,
    programId: raw.programId,
    milestoneCompletionPct: computeMilestoneCompletionPct(raw),
    assessments: assessmentResult.deltas,
    strengths: extraction.strengths.slice(0, 6),
    improvements: extraction.improvements.slice(0, 6),
    themes: extraction.themes.slice(0, 6),
    reasons: dedupeStrings(raw.application?.reasons ?? []),
    challenges: dedupeStrings(raw.application?.challenges ?? []),
    quotes: extraction.quotes.slice(0, 2).map((quote) => ({
      sessionId: quote.sessionId,
      text: quote.text,
      theme: quote.theme,
    })),
    completeness: {
      hasPre: hasAnswered(preAnswers),
      hasPost: hasAnswered(postAnswers),
      hasReflections: hasReflections(raw),
    },
    version,
    createdAt,
  });

  return {
    facts: factsInput,
    meta: {
      sessionId: raw.sessionId,
      programId: raw.programId,
      pairedAssessments: assessmentResult.pairedCount,
      availableAssessments: assessmentResult.availableCount,
      extractionModel: extraction.model,
      extractionVersion: EXTRACTION_AGENT_VERSION,
    },
  };
}

type SurveyAnswers = Record<string, unknown> | undefined;

type SurveySplit = {
  preAnswers: SurveyAnswers;
  postAnswers: SurveyAnswers;
};

function collectSurveyAnswers(session: RawSession): SurveySplit {
  const applicantMilestones = session.milestones.filter(
    (milestone): milestone is ApplicantSurveyMilestone => milestone.type === 'Applicant Survey',
  );

  if (!applicantMilestones.length) {
    return { preAnswers: undefined, postAnswers: undefined };
  }

  let pre: ApplicantSurveyMilestone | undefined;
  let post: ApplicantSurveyMilestone | undefined;

  for (const milestone of applicantMilestones) {
    if (!pre && isPreMilestone(milestone)) {
      pre = milestone;
      continue;
    }
    if (!post && isPostMilestone(milestone)) {
      post = milestone;
    }
  }

  if (!pre) {
    pre = applicantMilestones[0];
  }

  if (!post) {
    post = applicantMilestones.length > 1 ? applicantMilestones[applicantMilestones.length - 1] : undefined;
  }

  if (pre && post && pre === post) {
    post = undefined;
  }

  return {
    preAnswers: extractAnswers(pre),
    postAnswers: extractAnswers(post),
  };
}

function extractAnswers(milestone: ApplicantSurveyMilestone | undefined): SurveyAnswers {
  if (!milestone) return undefined;
  if (milestone.answers && typeof milestone.answers === 'object') {
    return milestone.answers;
  }
  if (Array.isArray(milestone.qa)) {
    const fromQa: Record<string, unknown> = {};
    for (const entry of milestone.qa) {
      if (!entry.key) continue;
      fromQa[entry.key] = entry.answer ?? null;
    }
    return fromQa;
  }
  return undefined;
}

function isPreMilestone(milestone: ApplicantSurveyMilestone): boolean {
  return includesKeyword(milestone.title, ['pre', 'intake']);
}

function isPostMilestone(milestone: ApplicantSurveyMilestone): boolean {
  return includesKeyword(milestone.title, ['post', 'final']);
}

function includesKeyword(value: string | undefined, keywords: string[]): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function hasAnswered(answers: SurveyAnswers): boolean {
  if (!answers) return false;
  return Object.values(answers).some((value) => coerceScore(value) !== null);
}

function hasReflections(session: RawSession): boolean {
  return session.milestones.some((milestone) => {
    if (milestone.type !== 'Reflection') return false;
    const reflectionMilestone = milestone as ReflectionMilestone;
    const text = reflectionMilestone.reflection?.text ?? reflectionMilestone.text;
    return Boolean(text && text.trim().length > 0);
  });
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}
