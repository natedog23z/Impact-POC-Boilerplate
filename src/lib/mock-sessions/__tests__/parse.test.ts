import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { parseMockSession, ParseError } from '../parse';
import { MeetingMilestone, OutcomeNoteMilestone } from '../types';

const FIXTURE_PATH = join(process.cwd(), 'docs', 'example data.md');
const EXAMPLE = readFileSync(FIXTURE_PATH, 'utf8');

const mutate = (transform: (input: string) => string) => transform(EXAMPLE);

test('parseMockSession extracts core demographics and milestones', () => {
  const raw = parseMockSession(EXAMPLE);

  assert.equal(raw.programId, 'cmfv7cqtv0002b5y5t3p5iq35');
  assert.equal(raw.sessionId, 'cmfvk38qy0001tsmjoht9gi1o');
  assert.ok(raw.demographics?.['Birth Year']);
  assert.ok(raw.application?.reasons?.length);
  assert.ok(raw.milestones.length >= 6);

  const applicant = raw.milestones.find((milestone) => milestone.type === 'Applicant Survey');
  assert.ok(applicant, 'expected applicant survey milestone');
});

test('parseMockSession treats missing scheduling link as undefined', () => {
  const mutated = mutate((input) => input.replace(/-Scheduling Link:[^\n]*\n/, '-Scheduling Link: \n'));
  const raw = parseMockSession(mutated);
  const meeting = raw.milestones.find((milestone) => milestone.type === 'Meeting') as MeetingMilestone | undefined;
  assert.ok(meeting, 'expected meeting milestone');
  assert.equal(meeting?.schedulingLink, undefined);
});

test('parseMockSession allows empty reflection paragraphs', () => {
  const mutated = mutate((input) =>
    input.replace(/Participant reflection:[^\n]*(?:\n\s*)?/i, 'Participant reflection:\n')
  );
  const raw = parseMockSession(mutated);
  const reflection = raw.milestones.find((milestone) => milestone.type === 'Reflection');
  assert.ok(reflection, 'expected reflection milestone');
  assert.equal(reflection?.text, undefined);
});

test('parseMockSession still succeeds when post-survey milestone is missing', () => {
  const mutated = mutate((input) =>
    (() => {
      const marker = '\nMilestone: \n-Title: Post-Survey';
      const start = input.indexOf(marker);
      if (start === -1) return input;
      const nextMilestone = input.indexOf('\nMilestone:', start + marker.length);
      const overall = input.indexOf('\n\nOverall session outcome reports:', start + marker.length);
      const endCandidates = [nextMilestone, overall].filter((idx) => idx !== -1);
      const end = endCandidates.length ? Math.min(...endCandidates) : input.length;
      return `${input.slice(0, start)}${input.slice(end)}`;
    })()
  );

  const raw = parseMockSession(mutated);
  const applicantMilestones = raw.milestones.filter((milestone) => milestone.type === 'Applicant Survey');
  assert.ok(applicantMilestones.length >= 1, 'expected at least one applicant survey milestone');
});

test('parseMockSession captures plan items from outcome notes', () => {
  const raw = parseMockSession(EXAMPLE);
  const outcome = raw.milestones.find((milestone) => milestone.type === 'Outcome Note') as OutcomeNoteMilestone | undefined;
  assert.ok(outcome, 'expected outcome note milestone');
  assert.ok(outcome?.markdownOutcome.plan?.length);
});

test('parseMockSession rejects out-of-range numeric answers', () => {
  const mutated = mutate((input) =>
    input.replace('- 7\nQuestion: How often do you worry about being able to meet normal monthly living expenses?', '- 12\nQuestion: How often do you worry about being able to meet normal monthly living expenses?')
  );

  assert.throws(() => parseMockSession(mutated), ParseError);
});
