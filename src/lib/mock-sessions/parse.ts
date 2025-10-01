import { RawSession, QA, Milestone, ApplicantSurveyMilestone, MeetingMilestone, OutcomeNoteMilestone, ReflectionMilestone } from './types';
import { SURVEY_KEY_MAP, SurveyKey } from './surveyKeys';

const JSON_FOOTER_REGEX = /```json\s*([\s\S]+?)```/gi;

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeInput = (input: string) => input.replace(/\r\n/g, '\n');

const removeJsonFooter = (markdown: string) => {
  const matches = [...markdown.matchAll(JSON_FOOTER_REGEX)];
  if (!matches.length) {
    return { content: markdown.trim(), json: undefined };
  }

  const lastMatch = matches[matches.length - 1];
  const json = lastMatch[1];
  const content = markdown.slice(0, lastMatch.index).trimEnd();
  return { content, json: json.trim() };
};

const locateHeading = (source: string, heading: string) => {
  const anchoredRegex = new RegExp(`^\s*${escapeRegExp(heading)}\s*$`, 'im');
  const anchoredMatch = anchoredRegex.exec(source);
  if (anchoredMatch) {
    return {
      start: anchoredMatch.index,
      end: anchoredMatch.index + anchoredMatch[0].length,
    };
  }

  const lowerSource = source.toLowerCase();
  const lowerHeading = heading.toLowerCase();
  const idx = lowerSource.indexOf(lowerHeading);
  if (idx === -1) {
    return null;
  }

  const lineStart = source.lastIndexOf('\n', idx);
  const lineEnd = source.indexOf('\n', idx + heading.length);
  return {
    start: lineStart === -1 ? 0 : lineStart,
    end: lineEnd === -1 ? source.length : lineEnd,
  };
};

const sliceBetween = (source: string, startHeading: string, endHeading?: string) => {
  const startLocation = locateHeading(source, startHeading);
  if (!startLocation) {
    throw new ParseError(`Missing section start: ${startHeading}`);
  }

  const sectionStart = startLocation.end;
  const remainder = source.slice(sectionStart);

  if (!endHeading) {
    return remainder.trim();
  }

  const endLocation = locateHeading(remainder, endHeading);
  if (!endLocation) {
    return remainder.trim();
  }

  return remainder.slice(0, endLocation.start).trim();
};

/**
 * Extracts the full program header block to preserve in generation.
 * This includes the Offering (...) Details heading, the Version (...) Details
 * heading and its bullet list, up to (but not including) the Participant Demographics heading.
 */
export const extractProgramHeaderBlock = (markdown: string) => {
  const normalized = normalizeInput(markdown);
  const offerLoc = locateHeading(normalized, 'Offering');
  // More robust: find the exact "Offering (.. ) Details:" line
  const offerRegex = /^\s*Offering\s*\([^\)]+\)\s*Details:\s*$/im;
  const offerMatch = offerRegex.exec(normalized);
  const startIndex = offerMatch?.index ?? offerLoc?.start ?? 0;

  const demographicsLoc = locateHeading(normalized, 'Participant Demographics:');
  const endIndex = demographicsLoc?.start ?? normalized.length;
  const block = normalized.slice(startIndex, endIndex).trimEnd();
  return block;
};

/**
 * Extracts the Version Details bullet record (Title, Tagline, etc.).
 */
export const extractVersionDetailsRecord = (markdown: string): Record<string, string> => {
  const normalized = normalizeInput(markdown);
  // Slice between Version Details heading (with any id) and Participant Demographics
  const versionHeaderRegex = /^\s*Version\s*\([^\)]+\)\s*Details:\s*$/im;
  const vh = versionHeaderRegex.exec(normalized);
  if (!vh) return {};
  const afterHeader = normalized.slice(vh.index + vh[0].length);
  const nextSectionLoc = locateHeading(afterHeader, 'Participant Demographics:');
  const section = nextSectionLoc ? afterHeader.slice(0, nextSectionLoc.start) : afterHeader;
  return parseBulletRecord(section);
};

const parseBulletRecord = (section: string) => {
  const result: Record<string, string> = {};
  const lines = section.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('-')) continue;
    const match = line.match(/^-\s*([^:]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    result[key.trim()] = value.trim();
  }
  return result;
};

const emptyToUndefined = (value?: string) => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const detectScaleAnswer = (value: string, surveyKey?: SurveyKey): number | string => {
  if (!value) return '';
  const numeric = Number(value);
  if (Number.isFinite(numeric) && Number.isInteger(numeric)) {
    if (!surveyKey || !surveyKey.scale) return numeric;
    const { min, max } = surveyKey.scale;
    if (numeric < min || numeric > max) {
      throw new ParseError(`Scale answer out of bounds for ${surveyKey.key}: ${numeric}`);
    }
    return numeric;
  }
  return value;
};

const parseApplication = (section: string) => {
  const lines = section.split('\n');
  const entries: { question: string; answer: string }[] = [];
  let currentQuestion: string | null = null;
  let currentAnswerLines: string[] = [];
  let collectingAnswer = false;

  const pushCurrent = () => {
    if (!currentQuestion) return;
    const answer = currentAnswerLines.join('\n').trim();
    entries.push({ question: currentQuestion, answer });
    currentQuestion = null;
    currentAnswerLines = [];
    collectingAnswer = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      if (collectingAnswer && currentAnswerLines.length && currentAnswerLines[currentAnswerLines.length - 1] !== '') {
        currentAnswerLines.push('');
      }
      continue;
    }

    if (trimmed.startsWith('Question:')) {
      pushCurrent();
      currentQuestion = trimmed.slice('Question:'.length).trim();
      collectingAnswer = false;
      continue;
    }

    if (!currentQuestion) {
      continue;
    }

    if (trimmed.startsWith('Answer:')) {
      const firstLine = trimmed.slice('Answer:'.length).trim();
      currentAnswerLines = firstLine ? [firstLine] : [];
      collectingAnswer = true;
      continue;
    }

    if (collectingAnswer) {
      currentAnswerLines.push(line.trim());
    }
  }

  pushCurrent();

  const reasons: string[] = [];
  const challenges: string[] = [];

  for (const entry of entries) {
    const lower = entry.question.toLowerCase();
    if (lower.includes('challenges') || lower.includes('struggles')) {
      if (entry.answer) challenges.push(entry.answer);
      continue;
    }
    if (lower.includes('hope to gain') || lower.includes('led you to consider')) {
      if (entry.answer) reasons.push(entry.answer);
      continue;
    }
    if (entry.answer) {
      reasons.push(entry.answer);
    }
  }

  return { reasons, challenges };
};

const parseApplicantSurveyMilestone = (
  body: string,
  base: { title?: string; description?: string; completedAt?: string },
): ApplicantSurveyMilestone => {
  const qa: QA[] = [];
  const regex = /Question:\s*(.+?)\n[\s\S]*?Answers?:\s*\n((?:-.*(?:\n|$))+)/g;
  const matches = [...body.matchAll(regex)];

  if (!matches.length) {
    throw new ParseError(`Applicant survey milestone missing questions (${base.title ?? 'unknown'})`);
  }

  for (const match of matches) {
    const [, question, answerBlock] = match;
    const answerLines = answerBlock
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('-'))
      .map((line) => line.replace(/^-+\s*/, '').trim())
      .filter((line) => line.length > 0);

    const surveyKey = Object.values(SURVEY_KEY_MAP).find((entry) => entry.label === question.trim());
    const rawAnswer = answerLines[0] ?? '';
    const answer = surveyKey?.type === 'scale' ? detectScaleAnswer(rawAnswer, surveyKey) : rawAnswer;

    qa.push({
      key: surveyKey?.key ?? question.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      label: question.trim(),
      answer,
    });
  }

  return {
    type: 'Applicant Survey',
    title: base.title ?? 'Applicant Survey',
    description: base.description,
    completedAt: base.completedAt,
    qa,
  };
};

const parseMeetingMilestone = (
  body: string,
  base: { title?: string; description?: string; completedAt?: string },
): MeetingMilestone => {
  const details = parseBulletRecord(body);
  return {
    type: 'Meeting',
    title: base.title ?? 'Meeting',
    description: base.description,
    completedAt: base.completedAt,
    schedulingLink: emptyToUndefined(details['Scheduling Link']),
    details:
      emptyToUndefined(details['Meeting Details']) ??
      emptyToUndefined(details['Details']) ??
      emptyToUndefined(details['With']),
  };
};

const parseOutcomeNoteMilestone = (
  body: string,
  base: { title?: string; description?: string; completedAt?: string },
): OutcomeNoteMilestone => {
  const outcome: OutcomeNoteMilestone['markdownOutcome'] = {};
  const lines = body.split('\n');
  let idx = 0;
  let collectingNotes = false;
  const noteLines: string[] = [];
  const planItems: string[] = [];

  while (idx < lines.length) {
    const rawLine = lines[idx];
    const line = rawLine.trim();
    if (!line) {
      if (collectingNotes && noteLines.length && noteLines[noteLines.length - 1] !== '') {
        noteLines.push('');
      }
      idx++;
      continue;
    }

    if (line.startsWith('Markdown outcome')) {
      idx++;
      continue;
    }
    if (line.startsWith('Date:')) {
      outcome.date = line.slice('Date:'.length).trim();
      idx++;
      continue;
    }
    if (line.startsWith('Focus:')) {
      outcome.focus = line.slice('Focus:'.length).trim();
      idx++;
      continue;
    }
    if (line.startsWith('Therapist Notes')) {
      collectingNotes = true;
      idx++;
      continue;
    }
    if (line.startsWith('Plan')) {
      collectingNotes = false;
      idx++;
      while (idx < lines.length) {
        const planLine = lines[idx].trim();
        if (!planLine) {
          idx++;
          continue;
        }
        if (planLine.startsWith('-')) {
          planItems.push(planLine.replace(/^-+\s*/, '').trim());
          idx++;
          continue;
        }
        // plain text plan line
        planItems.push(planLine);
        idx++;
      }
      break;
    }

    if (collectingNotes) {
      noteLines.push(rawLine.trimEnd());
    }

    idx++;
  }

  outcome.notes = noteLines.join('\n').trim() || undefined;
  outcome.plan = planItems.length ? planItems : undefined;

  return {
    type: 'Outcome Note',
    title: base.title ?? 'Outcome Note',
    description: base.description,
    completedAt: base.completedAt,
    markdownOutcome: outcome,
  };
};

const parseReflectionMilestone = (
  body: string,
  base: { title?: string; description?: string; completedAt?: string },
): ReflectionMilestone => {
  const match = body.match(/Participant reflection:\s*([\s\S]*)$/i);
  const text = match ? match[1].trim() : '';
  return {
    type: 'Reflection',
    title: base.title ?? 'Reflection',
    description: base.description,
    completedAt: base.completedAt,
    text: text || undefined,
  };
};

const parseMilestones = (section: string): Milestone[] => {
  const segments = section
    .split(/\n\s*Milestone:\s*\n/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  const milestones: Milestone[] = [];

  for (const segment of segments) {
  const [metaPart, ...restParts] = segment.split(/\n\s*-\s*(Applicant Survey Milestone|Meeting Milestone|Outcome Reporting Milestone|Reflection Milestone)/i);
    if (!restParts.length) {
      throw new ParseError('Unable to detect milestone type');
    }

    const meta = parseBulletRecord(metaPart);
    const typeIndicator = restParts[0].trim().toLowerCase();
    const body = restParts
      .slice(1)
      .join('\n')
      .trim();

  const base = {
    title: emptyToUndefined(meta['Title']),
    description: emptyToUndefined(meta['Description']),
    completedAt: emptyToUndefined(meta['Completed at']),
  };

    if (typeIndicator.startsWith('applicant survey')) {
      milestones.push(parseApplicantSurveyMilestone(body, base));
      continue;
    }
    if (typeIndicator.startsWith('meeting')) {
      milestones.push(parseMeetingMilestone(body, base));
      continue;
    }
    if (typeIndicator.startsWith('outcome reporting')) {
      milestones.push(parseOutcomeNoteMilestone(body, base));
      continue;
    }
    if (typeIndicator.startsWith('reflection')) {
      milestones.push(parseReflectionMilestone(body, base));
      continue;
    }

    throw new ParseError(`Unknown milestone type: ${typeIndicator}`);
  }

  return milestones;
};

const deriveIds = (content: string) => {
  const offeringMatch = content.match(/Offering \(([^)]+)\) Details/i);
  const versionMatch = content.match(/Version \(([^)]+)\) Details/i);
  return {
    programId: offeringMatch?.[1] ?? 'unknown-program',
    sessionId: versionMatch?.[1] ?? 'unknown-session',
  };
};

const findMilestonesSection = (content: string): string => {
  const candidates = [
    'Session Milestones:',
    'Session Milestones',
    'Milestones:',
    'Milestones',
  ];
  for (const heading of candidates) {
    const loc = locateHeading(content, heading);
    if (loc) {
      return sliceBetween(content, heading, 'Overall session outcome reports:');
    }
  }
  // Fallback to original (will throw detailed error)
  return sliceBetween(content, 'Session Milestones:', 'Overall session outcome reports:');
};

export const parseMockSession = (markdown: string): RawSession => {
  const normalized = normalizeInput(markdown);
  const { content } = removeJsonFooter(normalized);

  const { programId, sessionId } = deriveIds(content);

  const demographicsSection = sliceBetween(content, 'Participant Demographics:', 'Program Application:');
  const applicationSection = sliceBetween(content, 'Program Application:', 'Scholarship Application:');
  const milestonesSection = findMilestonesSection(content);

  const demographics = parseBulletRecord(demographicsSection);
  const applicationRaw = parseApplication(applicationSection);
  const application =
    applicationRaw.reasons.length || applicationRaw.challenges.length
      ? {
          reasons: applicationRaw.reasons,
          challenges: applicationRaw.challenges,
        }
      : undefined;
  const milestones = parseMilestones(milestonesSection);

  return {
    rawSchemaVersion: 'v1',
    generatorVersion: 'legacy-markdown',
    seed: 'legacy-session',
    programId,
    sessionId,
    demographics,
    application,
    milestones,
  };
};

/**
 * Returns a compact outline of milestone titles and types for locking.
 */
export const extractMilestoneOutline = (markdown: string) => {
  const normalized = normalizeInput(markdown);
  const { content } = removeJsonFooter(normalized);
  const milestonesSection = findMilestonesSection(content);
  const segments = milestonesSection
    .split(/\n\s*Milestone:\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const outline = segments.map((segment) => {
    const [metaPart, ...restParts] = segment.split(/\n\s*-\s*(Applicant Survey Milestone|Meeting Milestone|Outcome Reporting Milestone|Reflection Milestone)/i);
    const meta = parseBulletRecord(metaPart);
    const typeIndicator = restParts[0]?.trim() ?? '';
    const type = (/^applicant survey/i.test(typeIndicator)
      ? 'Applicant Survey'
      : /^meeting/i.test(typeIndicator)
      ? 'Meeting'
      : /^outcome reporting/i.test(typeIndicator)
      ? 'Outcome Note'
      : /^reflection/i.test(typeIndicator)
      ? 'Reflection'
      : 'Unknown');
    return {
      type,
      title: emptyToUndefined(meta['Title']),
      description: emptyToUndefined(meta['Description']),
    };
  });
  return outline;
};
