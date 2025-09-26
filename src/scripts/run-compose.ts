#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pLimit from 'p-limit';

import { composeAssessmentOutcomes } from '@/lib/compose/assessment-outcomes';
import { composeOverallImpact } from '@/lib/compose/overall-impact';
import { composeParticipantReasons } from '@/lib/compose/participant-reasons';
import { cohortFactsSchema, type CohortFacts } from '@/types/schemas';

const DEFAULT_CONCURRENCY = 2;

type CliArgs = {
  inputFile: string;
  outputDir: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputFile = resolve(args.inputFile);
  const outputDir = resolve(args.outputDir);
  await mkdir(outputDir, { recursive: true });

  const cohortFacts = await loadCohortFacts(inputFile);
  const limiter = pLimit(DEFAULT_CONCURRENCY);

  const [assessmentOutcomes, overallImpact, participantReasons] = await Promise.all([
    composeAssessmentOutcomes(cohortFacts, { limiter }),
    composeOverallImpact(cohortFacts, { limiter }),
    composeParticipantReasons(cohortFacts, { limiter }),
  ]);

  await writeFile(join(outputDir, 'assessment-outcomes.json'), JSON.stringify(assessmentOutcomes, null, 2), 'utf8');
  await writeFile(join(outputDir, 'overall-impact.json'), JSON.stringify(overallImpact, null, 2), 'utf8');
  await writeFile(join(outputDir, 'participant-reasons.json'), JSON.stringify(participantReasons, null, 2), 'utf8');

  console.log('Generated composer outputs:');
  console.log(`- Assessment Outcomes: ${assessmentOutcomes.prose}`);
  console.log(`- Overall Impact: ${overallImpact.prose}`);
  console.log(`- Participant Reasons: ${participantReasons.prose}`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string | undefined> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1];
    args[key.slice(2)] = value;
    i += 1;
  }

  const inputFile = args.in ?? args.input ?? '';
  const outputDir = args.out ?? args.output ?? '';

  if (!inputFile) {
    throw new Error('Provide --in <file> with CohortFacts JSON.');
  }
  if (!outputDir) {
    throw new Error('Provide --out <dir> for composer output.');
  }

  return { inputFile, outputDir };
}

async function loadCohortFacts(path: string): Promise<CohortFacts> {
  const content = await readFile(path, 'utf8');
  return cohortFactsSchema.parse(JSON.parse(content));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
