import { RawSession, QA, Milestone, ApplicantSurveyMilestone, MeetingMilestone, OutcomeNoteMilestone, ReflectionMilestone, OnlineActivityMilestone } from './types';
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
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === 'undefined' || lower === 'null' || lower === 'n/a' || lower === 'na' || lower === 'tbd') {
    return undefined;
  }
  return trimmed;
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
    // Tolerate empty survey blocks in examples; return an empty survey
    return {
      type: 'Applicant Survey',
      title: base.title ?? 'Applicant Survey',
      description: base.description,
      completedAt: base.completedAt,
      qa: [],
    };
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

  // Track if we saw explicit Therapist Notes header
  let sawTherapistNotes = false;
  // Track if we are inside a Recommendations section
  let inRecommendations = false;

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
    if (/^Therapist Notes/i.test(line)) {
      collectingNotes = true;
      sawTherapistNotes = true;
      inRecommendations = false;
      idx++;
      continue;
    }
    if (/^Recommendations\s*$/i.test(line)) {
      // Switch to plan collection; stop generic notes accumulation
      collectingNotes = false;
      inRecommendations = true;
      idx++;
      continue;
    }
    if (/^Plan\s*:?.*$/i.test(line)) {
      collectingNotes = false;
      inRecommendations = true;
      idx++;
      continue;
    }

    if (inRecommendations) {
      // Collect bullet or plain lines as plan items
      const planLine = line;
      if (planLine.startsWith('-')) {
        planItems.push(planLine.replace(/^-+\s*/, '').trim());
      } else {
        planItems.push(planLine);
      }
      idx++;
      continue;
    }

    if (collectingNotes || !sawTherapistNotes) {
      // If no explicit Therapist Notes header, treat free-form sections as notes
      noteLines.push(rawLine.trimEnd());
      idx++;
      continue;
    }

    idx++;
  }

  outcome.notes = (noteLines.join('\n').trim() || undefined);
  outcome.plan = planItems.length ? planItems : undefined;

  return {
    type: 'Outcome Note',
    title: base.title ?? 'Outcome Note',
    description: base.description,
    completedAt: base.completedAt,
    markdownOutcome: outcome,
  };
};

const parseOnlineActivityMilestone = (
  body: string,
  base: { title?: string; description?: string; completedAt?: string },
): OnlineActivityMilestone => {
  const details = parseBulletRecord(body);
  return {
    type: 'Online Activity',
    title: base.title ?? 'Online Activity',
    description: base.description,
    completedAt: base.completedAt,
    activityLink: emptyToUndefined(details['Activity Link']) ?? emptyToUndefined(details['Link']) ?? emptyToUndefined(details['URL']),
    activity: {
      link: emptyToUndefined(details['Activity Link']) ?? emptyToUndefined(details['Link']) ?? emptyToUndefined(details['URL']),
    },
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
    // Detect milestone type line generically: "- Xxxxx Milestone"
    const typeLineRegex = /\n\s*-\s*([A-Za-z ]+?)\s*Milestone\s*\n/i;
    const typeMatch = typeLineRegex.exec('\n' + segment);
    if (!typeMatch || typeMatch.index === undefined) {
      console.warn('Skipping milestone: unable to detect type line');
      continue;
    }

    const typeRaw = typeMatch[1].trim().toLowerCase();
    const metaPart = segment.slice(0, typeMatch.index - 1); // remove leading added \n
    // Remove the type line from body
    const afterTypeStart = typeMatch.index - 1 + typeMatch[0].length;
    const body = segment.slice(afterTypeStart).trim();

    const meta = parseBulletRecord(metaPart);
    const typeIndicator = typeRaw;

  const base = {
    title: emptyToUndefined(meta['Title']),
    description: emptyToUndefined(meta['Description']),
    completedAt: emptyToUndefined(meta['Completed at']),
  };

    if (typeIndicator.startsWith('applicant survey') || typeIndicator.startsWith('scholarship survey')) {
      milestones.push(parseApplicantSurveyMilestone(body, base));
      continue;
    }
    if (typeIndicator.startsWith('meeting')) {
      milestones.push(parseMeetingMilestone(body, base));
      continue;
    }
    if (typeIndicator.startsWith('outcome reporting') || typeIndicator.startsWith('outcome note')) {
      milestones.push(parseOutcomeNoteMilestone(body, base));
      continue;
    }
    if (typeIndicator.startsWith('reflection')) {
      milestones.push(parseReflectionMilestone(body, base));
      continue;
    }
    if (typeIndicator.startsWith('online activity')) {
      milestones.push(parseOnlineActivityMilestone(body, base));
      continue;
    }
    // Ignore Administrative/other task milestones in cohort examples
    if (typeIndicator.startsWith('administrative task')) {
      // Non-essential for downstream facts; safely skip
      continue;
    }

    // If the type is unknown, skip rather than failing the whole parse
    console.warn(`Unknown milestone type encountered and skipped: ${typeIndicator}`);
    continue;
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
      // End at the next major section or end of content
      const ends = [
        'Overall session outcome reports:',
        'Overall Session Outcome Reports:',
        'Overall outcome reports:',
        'Overall',
      ];
      for (const endHeading of ends) {
        const slice = (() => {
          try { return sliceBetween(content, heading, endHeading); } catch { return null; }
        })();
        if (slice) return slice;
      }
      return sliceBetween(content, heading);
    }
  }
  // Fallback to original (will throw detailed error)
  return sliceBetween(content, 'Session Milestones:', undefined as any);
};

export const parseMockSession = (markdown: string): RawSession => {
  const normalized = normalizeInput(markdown);
  const { content } = removeJsonFooter(normalized);

  const { programId, sessionId } = deriveIds(content);

  let demographicsSection = '';
  let applicationSection = '';
  let milestonesSection = '';

  // Demographics section: stop at Program Application or Scholarship Application
  try {
    demographicsSection = sliceBetween(content, 'Participant Demographics:', 'Program Application:');
  } catch {
    try {
      demographicsSection = sliceBetween(content, 'Participant Demographics:', 'Scholarship Application:');
    } catch {
      console.warn(`Session ${sessionId}: Missing demographics section`);
    }
  }

  // Application section: allow both Program Application and Scholarship Application (fallback)
  try {
    applicationSection = sliceBetween(content, 'Program Application:', 'Scholarship Application:');
  } catch {
    try {
      // Some cohort examples omit Program Application entirely; synthesize from Scholarship Q/A if present
      const scholarshipOnly = sliceBetween(content, 'Scholarship Application:', 'Session Milestones:');
      applicationSection = scholarshipOnly;
    } catch {
      console.warn(`Session ${sessionId}: Missing application section`);
    }
  }

  try {
    milestonesSection = findMilestonesSection(content);
  } catch (error) {
    throw new ParseError(`Session ${sessionId}: Missing milestones section - ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  const demographics = parseBulletRecord(demographicsSection);
  const applicationRaw = parseApplication(applicationSection || '');
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
    const [metaPart, ...restParts] = segment.split(/\n\s*-\s*(Applicant Survey Milestone|Meeting Milestone|Outcome Reporting Milestone|Reflection Milestone|Online Activity Milestone)/i);
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
      : /^online activity/i.test(typeIndicator)
      ? 'Online Activity'
      : 'Unknown');
    return {
      type,
      title: emptyToUndefined(meta['Title']),
      description: emptyToUndefined(meta['Description']),
    };
  });
  return outline;
};

/**
 * Extracts multiple sessions from a cohort markdown file
 * 
 * Splits by repeated "Version (...) Details:" headings, preserving the most recent
 * "Offering (...) Details:" header for each session block.
 */
export const extractSessionsFromCohortMarkdown = (markdown: string): {
  sessions: RawSession[];
  skipped: Array<{ index: number; versionId: string; error: string }>;
} => {
  const normalized = normalizeInput(markdown);
  const { content } = removeJsonFooter(normalized);

  // Find all Version Details headings (primary) and, as fallback, all Session Milestones starts (secondary)
  const versionRegex = /^\s*Version\s*\(([^)]+)\)\s*Details:\s*$/gim;
  let versionMatches: Array<RegExpExecArray & { index: number }> = [...content.matchAll(versionRegex)] as any;

  // If there are fewer than 10 versions but many milestone sections, treat each milestones block as a new session start
  if (versionMatches.length < 10) {
    const sessionMilestonesRegex = /\n\s*Session\s+Milestones\s*:/gim;
    const milestonesStarts = [...content.matchAll(sessionMilestonesRegex)];
    if (milestonesStarts.length > versionMatches.length) {
      // Build synthetic version anchors just before each milestones block
      versionMatches = milestonesStarts.map((m, idx) => {
        const fakeIndex = Math.max(0, (m.index || 0) - 40);
        const fake: RegExpExecArray & { index: number } = Object.assign([] as any, {
          0: 'Version (synthetic) Details:',
          index: fakeIndex,
          input: content,
          groups: undefined as any,
        });
        (fake as any)[1] = `synthetic-${idx + 1}`;
        return fake;
      });
    }
  }

  if (versionMatches.length === 0) {
    throw new ParseError('No Version Details sections found in cohort file');
  }

  // Find all Offering Details headings
  const offeringRegex = /^\s*Offering\s*\(([^)]+)\)\s*Details:\s*$/gim;
  const offeringMatches = [...content.matchAll(offeringRegex)];

  const sessions: RawSession[] = [];
  const skipped: Array<{ index: number; versionId: string; error: string }> = [];

  for (let i = 0; i < versionMatches.length; i++) {
    const versionMatch = versionMatches[i];
    const versionId = versionMatch[1] ?? `synthetic-${i + 1}`;
    const versionStart = versionMatch.index!;
    
    // Find the next version boundary (or end of file)
    const nextVersionStart = versionMatches[i + 1]?.index ?? content.length;
    
    // Find the most recent Offering heading before this Version
    let offeringBlock = '';
    let foundOffering = false;
    for (const offeringMatch of offeringMatches) {
      if (offeringMatch.index! < versionStart) {
        // Use the most recent offering block before this version
        const offeringStart = offeringMatch.index!;
        // Find the end of the offering section (stops at the first Version line after it)
        const firstVersionAfterOffering = versionMatches.find(vm => vm.index! > offeringStart);
        const offeringEnd = firstVersionAfterOffering?.index ?? versionStart;
        offeringBlock = content.slice(offeringStart, Math.min(offeringEnd, versionStart));
        foundOffering = true;
      }
    }

    // If no offering found before this version, use the first offering in the file
    if (!foundOffering && offeringMatches.length > 0) {
      const firstOffering = offeringMatches[0];
      const offeringStart = firstOffering.index!;
      const firstVersionAfterOffering = versionMatches.find(vm => vm.index! > offeringStart);
      const offeringEnd = firstVersionAfterOffering?.index ?? versionStart;
      offeringBlock = content.slice(offeringStart, Math.min(offeringEnd, versionStart));
    }

    // Build primary block: Version ... up to next Version
    const baseBlock = content.slice(versionStart, nextVersionStart);

    // Attempt 1: Parse base block as-is
    const attempts: string[] = [baseBlock];

    // Attempt 2: Prepend offering header if available
    if (offeringBlock.trim()) {
      attempts.push(offeringBlock + '\n' + baseBlock);
    }

    // Attempt 3: Trim at visible hard separators within the block
    const trimAtSeparator = (text: string) => {
      const patterns = [
        /\n\s*-{10,}\s*\n\s*=+\s*\n/,
        /\n\s*=+\s*\n\s*Version\s*\(/i,
        /\n\s*=+\s*\n/,
      ];
      for (const re of patterns) {
        const m = re.exec(text);
        if (m && m.index !== undefined) return text.slice(0, m.index + m[0].length);
      }
      return text;
    };
    attempts.push(trimAtSeparator(baseBlock));
    if (offeringBlock.trim()) attempts.push(trimAtSeparator(offeringBlock + '\n' + baseBlock));

    // Attempt 4: If block lacks "Session Milestones:", extend forward up to 50k chars
    if (!/\bSession\s+Milestones\s*:/i.test(baseBlock)) {
      const extended = content.slice(versionStart, Math.min(content.length, versionStart + 50000));
      attempts.push(offeringBlock + '\n' + extended);
    }

    let parsedOk = false;
    for (const candidate of attempts) {
      try {
        const session = parseMockSession(candidate);
        sessions.push(session);
        parsedOk = true;
        break;
      } catch (err) {
        // try next candidate
      }
    }

    if (!parsedOk) {
      const lastError = 'Unable to parse after multiple attempts';
      console.warn(`Failed to parse session ${i + 1} (${versionId}) after fallbacks.`);
      skipped.push({ index: i, versionId, error: lastError });
    }
  }

  // Assign stable synthetic session IDs for cohort uploads (avoid using version IDs)
  for (let i = 0; i < sessions.length; i++) {
    const sid = `cohort-${String(i + 1).padStart(3, '0')}`;
    (sessions[i] as any).sessionId = sid;
  }

  if (sessions.length === 0) {
    throw new ParseError(`Failed to parse any sessions from cohort file. ${skipped.length} sessions were skipped.`);
  }

  return { sessions, skipped };
};
