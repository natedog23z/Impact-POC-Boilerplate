#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import pLimit from 'p-limit';

import type { RawSession } from '@/lib/mock-sessions/types';
import { buildSessionFacts } from '@/lib/map/build-session-facts';

const DEFAULT_CONCURRENCY = 8;

type CliArgs = {
  inputDir: string;
  outputDir: string;
  concurrency: number;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = resolve(args.inputDir);
  const outputDir = resolve(args.outputDir);
  await mkdir(outputDir, { recursive: true });

  const files = await listJsonFiles(inputDir);
  if (!files.length) {
    console.error(`No JSON files found in ${inputDir}`);
    process.exitCode = 1;
    return;
  }

  const fileLimiter = pLimit(args.concurrency);
  const extractionLimiter = pLimit(args.concurrency);
  const results = await Promise.all(
    files.map((file) =>
      fileLimiter(async () => {
        const raw = await loadRawSession(file);
        const { facts, meta } = await buildSessionFacts(raw, { limiter: extractionLimiter });
        const outputName = `${basename(file).replace(/\.json$/i, '')}.session-facts.json`;
        const outputPath = join(outputDir, outputName);
        await writeFile(outputPath, JSON.stringify(facts, null, 2), 'utf8');
        return { outputPath, meta };
      }),
    ),
  );

  console.log(`Wrote ${results.length} SessionFacts to ${outputDir}`);
  for (const result of results) {
    console.log(
      `- ${result.meta.sessionId}: paired=${result.meta.pairedAssessments} available=${result.meta.availableAssessments} model=${result.meta.extractionModel}`,
    );
  }
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
  const outputDir = args.out ?? '';
  const concurrency = args.concurrency ? Number(args.concurrency) : DEFAULT_CONCURRENCY;

  if (!inputDir) {
    throw new Error('Provide --in <dir> for RawSession footers.');
  }
  if (!outputDir) {
    throw new Error('Provide --out <dir> for SessionFacts output.');
  }

  return {
    inputDir,
    outputDir,
    concurrency: Number.isFinite(concurrency) && concurrency > 0 ? Math.floor(concurrency) : DEFAULT_CONCURRENCY,
  };
}

async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(dir, entry.name));
}

async function loadRawSession(path: string): Promise<RawSession> {
  const content = await readFile(path, 'utf8');
  const parsed = JSON.parse(content) as RawSession;
  if (parsed.rawSchemaVersion !== 'v1') {
    throw new Error(`Unsupported raw schema version in ${path}`);
  }
  return parsed;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
