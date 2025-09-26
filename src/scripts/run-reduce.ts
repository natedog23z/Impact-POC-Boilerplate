#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { buildCohortFacts } from '@/lib/reduce/build-cohort-facts';
import { sessionFactsSchema, type SessionFacts } from '@/types/schemas';

type CliArgs = {
  inputDir: string;
  outputFile: string;
  programId?: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = resolve(args.inputDir);
  const outputFile = resolve(args.outputFile);

  const files = await listJsonFiles(inputDir);
  if (!files.length) {
    console.error(`No SessionFacts JSON files found in ${inputDir}`);
    process.exitCode = 1;
    return;
  }

  const sessions: SessionFacts[] = [];
  for (const file of files) {
    const parsed = await loadSessionFacts(file);
    if (args.programId && parsed.programId !== args.programId) {
      continue;
    }
    sessions.push(parsed);
  }

  if (!sessions.length) {
    console.error('No SessionFacts matched the requested criteria.');
    process.exitCode = 1;
    return;
  }

  const cohortFacts = buildCohortFacts(sessions, {
    programId: args.programId,
  });

  await writeFile(outputFile, JSON.stringify(cohortFacts, null, 2), 'utf8');
  console.log(`Wrote CohortFacts to ${outputFile}`);
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

  const inputDir = args.in ?? args.input ?? '';
  const outputFile = args.out ?? args.output ?? '';
  const programId = args.program ?? undefined;

  if (!inputDir) {
    throw new Error('Provide --in <dir> with SessionFacts JSON files.');
  }
  if (!outputFile) {
    throw new Error('Provide --out <file> to write CohortFacts.');
  }

  return {
    inputDir,
    outputFile,
    programId,
  };
}

async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(dir, entry.name));
}

async function loadSessionFacts(path: string): Promise<SessionFacts> {
  const content = await readFile(path, 'utf8');
  return sessionFactsSchema.parse(JSON.parse(content));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
