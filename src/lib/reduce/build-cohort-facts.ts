import { createHash } from 'node:crypto';

import { mean, median, stableSort } from '@/lib/map/compute';
import { SURVEY_KEY_MAP } from '@/lib/mock-sessions/surveyKeys';
import {
  cohortFactsSchema,
  type CohortFacts,
  type CohortTag,
  type SessionFacts,
} from '@/types/schemas';

const TAG_LIMIT = 6;
const QUOTE_LIMIT = 8;

export type BuildCohortFactsOptions = {
  programId?: string;
};

export function buildCohortFacts(
  sessions: SessionFacts[],
  options: BuildCohortFactsOptions = {},
): CohortFacts {
  const cohortSessions = filterSessions(sessions, options.programId);
  if (!cohortSessions.length) {
    throw new Error('No SessionFacts provided for the requested program.');
  }

  const programIds = new Set(cohortSessions.map((session) => session.programId));
  if (programIds.size > 1) {
    throw new Error('SessionFacts span multiple programIds. Provide a filter to build a single cohort.');
  }

  const [programId] = Array.from(programIds);

  const completionValues = cohortSessions.map((session) => session.milestoneCompletionPct);
  const completionMean = roundTo(mean(completionValues), 2);
  const completionMedian = roundTo(median(completionValues), 2);

  const nWithPrePost = cohortSessions.filter(hasPairedAssessments).length;

  const assessments = buildAssessmentAggregates(cohortSessions);
  const topStrengths = buildTagCounts(cohortSessions, (session) => session.strengths);
  const topImprovements = buildTagCounts(cohortSessions, (session) => session.improvements);
  const topThemes = buildTagCounts(cohortSessions, (session) => session.themes);
  const topChallenges = buildTagCounts(cohortSessions, (session) => session.challenges);
  const topReasons = buildTagCounts(cohortSessions, (session) => session.reasons);
  const exemplarQuotes = pickExemplarQuotes(cohortSessions);
  const dataQualityNotes = buildDataQualityNotes({
    sessions: cohortSessions,
    nWithPrePost,
    completionMedian,
    assessments,
  });

  const baseFacts = {
    programId,
    nSessions: cohortSessions.length,
    nWithPrePost,
    completion: {
      meanPct: completionMean,
      medianPct: completionMedian,
    },
    assessments,
    topStrengths,
    topImprovements,
    topThemes,
    topChallenges,
    topReasons,
    exemplarQuotes,
    dataQualityNotes,
  } satisfies Omit<CohortFacts, 'factsHash'>;

  const factsHash = hashFacts(baseFacts);
  const cohortFacts = cohortFactsSchema.parse({
    ...baseFacts,
    factsHash,
  });

  return cohortFacts;
}

function filterSessions(sessions: SessionFacts[], programId?: string): SessionFacts[] {
  if (!programId) {
    return sessions;
  }
  return sessions.filter((session) => session.programId === programId);
}

function hasPairedAssessments(session: SessionFacts): boolean {
  const paired = session.assessments.filter((entry) => entry.pre !== null && entry.post !== null);
  return paired.length >= 2;
}

type AssessmentAccumulator = {
  key: string;
  label: string;
  preValues: number[];
  postValues: number[];
  changeValues: number[];
  improved: number;
  paired: number;
};

type AssessmentAggregate = Omit<AssessmentAccumulator, 'preValues' | 'postValues' | 'changeValues' | 'improved' | 'paired'> & {
  avgPre: number | null;
  avgPost: number | null;
  avgChange: number | null;
  pctImproved: number | null;
  betterWhen?: 'higher' | 'lower';
};

function buildAssessmentAggregates(sessions: SessionFacts[]): AssessmentAggregate[] {
  const map = new Map<string, AssessmentAccumulator>();

  for (const session of sessions) {
    for (const assessment of session.assessments) {
      const accumulator = map.get(assessment.key) ?? {
        key: assessment.key,
        label: assessment.label,
        preValues: [],
        postValues: [],
        changeValues: [],
        improved: 0,
        paired: 0,
      };

      if (assessment.pre !== null) {
        accumulator.preValues.push(assessment.pre);
      }
      if (assessment.post !== null) {
        accumulator.postValues.push(assessment.post);
      }
      if (assessment.pre !== null && assessment.post !== null) {
        accumulator.paired += 1;
        const change = assessment.change ?? assessment.post - assessment.pre;
        accumulator.changeValues.push(change);
        const dir = SURVEY_KEY_MAP[assessment.key]?.betterWhen;
        const improved = dir === 'lower' ? change < 0 : change > 0;
        if (improved) {
          accumulator.improved += 1;
        }
      }

      map.set(assessment.key, accumulator);
    }
  }

  const aggregates: AssessmentAggregate[] = [];

  for (const accumulator of map.values()) {
    const avgPre = accumulator.preValues.length ? roundTo(mean(accumulator.preValues), 2) : null;
    const avgPost = accumulator.postValues.length ? roundTo(mean(accumulator.postValues), 2) : null;
    const avgChange = accumulator.changeValues.length ? roundTo(mean(accumulator.changeValues), 2) : null;
    const pctImproved = accumulator.paired ? roundTo(accumulator.improved / accumulator.paired, 4) : null;
    const betterWhen = SURVEY_KEY_MAP[accumulator.key]?.betterWhen as 'higher' | 'lower' | undefined;

    aggregates.push({
      key: accumulator.key,
      label: accumulator.label,
      avgPre,
      avgPost,
      avgChange,
      pctImproved,
      betterWhen,
    });
  }

  return stableSort(aggregates, (a, b) => a.label.localeCompare(b.label));
}

type TagSelector = (session: SessionFacts) => readonly string[];

type TagCount = CohortTag;

function buildTagCounts(sessions: SessionFacts[], selector: TagSelector): TagCount[] {
  const counts = new Map<string, number>();

  for (const session of sessions) {
    const tags = selector(session);
    for (const tag of tags) {
      if (!tag) continue;
      const normalized = tag.trim();
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  const entries = Array.from(counts.entries()).map(([tag, count]) => ({ tag, count }));
  const sorted = stableSort(entries, (a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.tag.localeCompare(b.tag);
  });

  return sorted.slice(0, TAG_LIMIT);
}

function pickExemplarQuotes(sessions: SessionFacts[]): SessionFacts['quotes'] {
  const pool = stableSort(
    sessions.flatMap((session) => session.quotes.map((quote, index) => ({ quote, index, sessionId: session.sessionId }))),
    (a, b) => a.index - b.index,
  );

  const result: SessionFacts['quotes'] = [];
  const seenSessions = new Set<string>();
  const seenTexts = new Set<string>();
  const seenThemes = new Set<string>();

  for (const entry of pool) {
    if (result.length >= QUOTE_LIMIT) break;
    if (seenSessions.has(entry.sessionId)) continue;
    if (seenTexts.has(entry.quote.text)) continue;
    result.push(entry.quote);
    seenSessions.add(entry.sessionId);
    seenTexts.add(entry.quote.text);
    if (entry.quote.theme) {
      seenThemes.add(entry.quote.theme.toLowerCase());
    }
  }

  if (result.length < QUOTE_LIMIT) {
    for (const entry of pool) {
      if (result.length >= QUOTE_LIMIT) break;
      if (seenTexts.has(entry.quote.text)) continue;
      const themeKey = entry.quote.theme?.toLowerCase();
      if (themeKey && !seenThemes.has(themeKey)) {
        result.push(entry.quote);
        seenThemes.add(themeKey);
        seenTexts.add(entry.quote.text);
      }
    }
  }

  if (result.length < QUOTE_LIMIT) {
    for (const entry of pool) {
      if (result.length >= QUOTE_LIMIT) break;
      if (seenTexts.has(entry.quote.text)) continue;
      result.push(entry.quote);
      seenTexts.add(entry.quote.text);
    }
  }

  return result;
}

type DataQualityInput = {
  sessions: SessionFacts[];
  nWithPrePost: number;
  completionMedian: number;
  assessments: AssessmentAggregate[];
};

function buildDataQualityNotes(input: DataQualityInput): string[] {
  const notes: string[] = [];
  const { sessions, nWithPrePost, completionMedian, assessments } = input;
  const nSessions = sessions.length;

  if (nWithPrePost === 0) {
    notes.push('No sessions contain paired pre/post survey responses.');
  } else if (nWithPrePost < nSessions) {
    notes.push(`Paired pre/post survey responses available for ${nWithPrePost} of ${nSessions} sessions.`);
  }

  const reflectionsWithContent = sessions.filter((session) => session.completeness.hasReflections).length;
  if (reflectionsWithContent === 0) {
    notes.push('Participant reflections are missing across the cohort.');
  } else if (reflectionsWithContent < nSessions) {
    notes.push(`Reflections are missing in ${nSessions - reflectionsWithContent} of ${nSessions} sessions.`);
  }

  if (!assessments.length) {
    notes.push('Quantitative assessment data is currently unavailable.');
  }

  if (completionMedian < 50) {
    notes.push('Median milestone completion is below 50%, suggesting participants are early in the program.');
  }

  return notes.slice(0, 12);
}

function hashFacts(facts: Omit<CohortFacts, 'factsHash'>): string {
  const canonical = {
    ...facts,
    assessments: stableSort(facts.assessments, (a, b) => a.key.localeCompare(b.key)).map((assessment) => ({
      ...assessment,
    })),
    topStrengths: facts.topStrengths.map((entry) => ({ ...entry })),
    topImprovements: facts.topImprovements.map((entry) => ({ ...entry })),
    topThemes: facts.topThemes.map((entry) => ({ ...entry })),
    topChallenges: facts.topChallenges.map((entry) => ({ ...entry })),
    topReasons: facts.topReasons.map((entry) => ({ ...entry })),
    exemplarQuotes: facts.exemplarQuotes.map((quote) => ({ ...quote })),
    dataQualityNotes: facts.dataQualityNotes.slice(),
  };

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}
