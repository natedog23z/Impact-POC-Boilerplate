import { SURVEY_KEY_MAP } from '@/lib/mock-sessions/surveyKeys';
import type { RawSession } from '@/lib/mock-sessions/types';
import type { AssessmentDelta } from '@/types/schemas';

type NumericRecord = Record<string, unknown> | null | undefined;

export type BuildAssessmentResult = {
  deltas: AssessmentDelta[];
  pairedCount: number;
  availableCount: number;
};

export const SCORE_MIN = 1;
export const SCORE_MAX = 10;

export function coerceScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeScore(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return normalizeScore(parsed);
    }
    return null;
  }
  return null;
}

function normalizeScore(value: number): number {
  const rounded = Math.round(value);
  const clamped = Math.max(SCORE_MIN, Math.min(SCORE_MAX, rounded));
  return clamped;
}

export function buildAssessmentDeltas(
  preAnswers: NumericRecord,
  postAnswers: NumericRecord,
): BuildAssessmentResult {
  const deltas: AssessmentDelta[] = [];
  let pairedCount = 0;
  let availableCount = 0;

  const keys = new Set<string>();
  if (preAnswers && typeof preAnswers === 'object') {
    Object.keys(preAnswers).forEach((key) => keys.add(key));
  }
  if (postAnswers && typeof postAnswers === 'object') {
    Object.keys(postAnswers).forEach((key) => keys.add(key));
  }

  for (const key of Array.from(keys)) {
    const surveyEntry = SURVEY_KEY_MAP[key];
    if (!surveyEntry || surveyEntry.type !== 'scale') {
      continue;
    }

    const preScore = coerceScore(preAnswers ? (preAnswers as Record<string, unknown>)[key] : undefined);
    const postScore = coerceScore(postAnswers ? (postAnswers as Record<string, unknown>)[key] : undefined);
    if (preScore === null && postScore === null) {
      continue;
    }

    if (preScore !== null && postScore !== null) {
      pairedCount += 1;
    }
    availableCount += 1;

    const change = preScore !== null && postScore !== null ? postScore - preScore : null;

    deltas.push({
      key,
      label: surveyEntry.label ?? key,
      pre: preScore,
      post: postScore,
      change,
    });
  }

  return {
    deltas,
    pairedCount,
    availableCount,
  };
}

export function computeMilestoneCompletionPct(raw: RawSession): number {
  const total = raw.milestones.length;
  if (total === 0) return 0;
  const completed = raw.milestones.filter((milestone) => {
    const timestamp = (milestone as { completedAt?: unknown }).completedAt;
    return typeof timestamp === 'string' && timestamp.trim().length > 0;
  }).length;
  const ratio = completed / total;
  return Number((ratio * 100).toFixed(2));
}

export function mean(values: readonly number[]): number {
  if (!values.length) return 0;
  const total = values.reduce((acc, value) => acc + value, 0);
  return total / values.length;
}

export function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = stableSort(values, (a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function stableSort<T>(input: readonly T[], compare: (a: T, b: T) => number): T[] {
  return input
    .map((value, index) => ({ value, index }))
    .sort((left, right) => {
      const order = compare(left.value, right.value);
      if (order !== 0) return order;
      return left.index - right.index;
    })
    .map((entry) => entry.value);
}
