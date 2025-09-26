'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Button,
  Card,
  TextArea,
  TextField,
  Separator,
  Checkbox,
  Link,
  Badge,
  Callout,
  Progress,
  Table,
} from '@radix-ui/themes';
import JSZip from 'jszip';
import { extractProgramHeaderBlock, extractMilestoneOutline } from '@/lib/mock-sessions/parse';
import { runImpactPipelineInline, type RunPipelineInlineResponse } from './actions';
import OverallImpactCard from '@/components/dashboard/OverallImpactCard';
import ImprovementDonutCard from '@/components/dashboard/ImprovementDonutCard';
import StrengthsImprovementsCard from '@/components/dashboard/StrengthsImprovementsCard';
import ParticipantReasonsCard from '@/components/dashboard/ParticipantReasonsCard';
import { SURVEY_KEY_MAP } from '@/lib/mock-sessions/surveyKeys';

const DEFAULT_SENTIMENT_MIX = {
  positive: 0.4,
  neutral: 0.4,
  negative: 0.2,
};

const DEFAULT_COUNT = 5;
const MAX_COUNT = 50;
const MIN_COUNT = 1;
const MAX_OMISSION = 0.2;

const API_PATH = '/api/mock-sessions/generate';

type Sentiment = 'positive' | 'neutral' | 'negative';

type SentimentMix = Record<Sentiment, number>;

type GenerationLog = {
  idx: number;
  sentiment: Sentiment;
  omittedPct: number;
  parsePath: 'json' | 'md';
  retried: boolean;
  needsManualFix: boolean;
};

import type { RawSession } from '@/lib/mock-sessions/types';

type GeneratedFile = {
  filename: string;
  content: string;
  json?: RawSession;
  seedUsed: string;
  generatorVersion: string;
  log: GenerationLog;
};

type StoredFileResult = {
  filename: string;
  markdownUrl?: string;
  markdownPath?: string;
  jsonUrl?: string;
  jsonPath?: string;
  error?: string;
};

type ApiResponse = {
  files: GeneratedFile[];
  stored?: StoredFileResult[];
  error?: string;
};

type RequestPayload = {
  exampleText: string;
  count: number;
  sentimentMix: SentimentMix;
  omitProbability: number;
  seed: string;
  store: boolean;
};

type FileWithText = {
  file: File;
  text: string;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const roundSentimentMix = (mix: SentimentMix): SentimentMix => {
  const total = mix.positive + mix.neutral + mix.negative;
  if (total === 0) {
    return DEFAULT_SENTIMENT_MIX;
  }
  return {
    positive: mix.positive / total,
    neutral: mix.neutral / total,
    negative: mix.negative / total,
  };
};

const mixToDisplay = (mix: SentimentMix) => {
  const normalized = roundSentimentMix(mix);
  return {
    positive: formatPercent(normalized.positive),
    neutral: formatPercent(normalized.neutral),
    negative: formatPercent(normalized.negative),
  };
};

const buildZip = async (files: GeneratedFile[]) => {
  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file.filename, file.content);
    if (file.json) {
      const jsonName = file.filename.replace(/\.md$/, '') + '.json';
      zip.file(jsonName, JSON.stringify(file.json, null, 2));
    }
  });
  return zip.generateAsync({ type: 'blob' });
};

const readUploadedFile = (file: File): Promise<FileWithText> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ file, text: String(reader.result ?? '') });
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

type GenerationState =
  | { status: 'idle' }
  | { status: 'submitting'; progress: number }
  | { status: 'processing'; progress: number }
  | { status: 'completed'; files: GeneratedFile[]; stored?: StoredFileResult[] }
  | { status: 'error'; message: string };

const initialState: GenerationState = { status: 'idle' };

export default function MockSessionsPage() {
  const [uploaded, setUploaded] = useState<FileWithText | null>(null);
  const [count, setCount] = useState<number>(DEFAULT_COUNT);
  const [sentimentMix, setSentimentMix] = useState<SentimentMix>(DEFAULT_SENTIMENT_MIX);
  const [omitProbability, setOmitProbability] = useState<number>(0.1);
  const [seed, setSeed] = useState<string>('mock-seed');
  const [storeResults, setStoreResults] = useState<boolean>(false);
  const [state, setState] = useState<GenerationState>(initialState);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lockedHeader, setLockedHeader] = useState<string>('');
  const [lockedMilestones, setLockedMilestones] = useState<Array<{ type: string; title?: string; description?: string }>>([]);
  const [confirmedLock, setConfirmedLock] = useState<boolean>(false);
  const [pipeline, setPipeline] = useState<
    | { status: 'idle' }
    | { status: 'running' }
    | { status: 'completed'; result: RunPipelineInlineResponse }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const mixDisplay = useMemo(() => mixToDisplay(sentimentMix), [sentimentMix]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setUploaded(null);
      setLockedHeader('');
      setLockedMilestones([]);
      setConfirmedLock(false);
      return;
    }
    try {
      const result = await readUploadedFile(file);
      setUploaded(result);
      const header = extractProgramHeaderBlock(result.text || '');
      const outline = extractMilestoneOutline(result.text || '') as Array<{ type: string; title?: string; description?: string }>;
      setLockedHeader(header);
      setLockedMilestones(outline);
      setConfirmedLock(false);
    } catch (error) {
      console.error(error);
      setValidationError('Failed to read the uploaded file. Please try again.');
    }
  };

  const updateSentiment = (sentiment: Sentiment, value: number) => {
    setSentimentMix((prev) => ({
      ...prev,
      [sentiment]: value,
    }));
  };

  const handleCountChange = (value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    setCount(Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.floor(numeric))));
  };

  const handleOmissionChange = (value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    const clamped = Math.max(0, Math.min(MAX_OMISSION, numeric));
    setOmitProbability(Number(clamped.toFixed(2)));
  };

  const handleSubmit = async () => {
    setValidationError(null);

    if (!uploaded?.text.trim()) {
      setValidationError('Upload a valid `.md` or `.txt` example file before generating.');
      return;
    }
    if (!confirmedLock) {
      setValidationError('Please confirm the program details and milestone structure first.');
      return;
    }

    const normalizedMix = roundSentimentMix(sentimentMix);
    const payload: RequestPayload = {
      exampleText: uploaded.text,
      count,
      sentimentMix: normalizedMix,
      omitProbability,
      seed: seed.trim() || 'mock-seed',
      store: storeResults,
    };

    try {
      setState({ status: 'submitting', progress: 0 });

      const response = await fetch(API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error?.error || response.statusText);
      }

      setState({ status: 'processing', progress: 0.25 });
      const data = (await response.json()) as ApiResponse;
      setState({ status: 'completed', files: data.files, stored: data.stored });
    } catch (error) {
      console.error(error);
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleDownloadZip = async () => {
    if (state.status !== 'completed' || !state.files.length) return;
    const blob = await buildZip(state.files);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mock-sessions-${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAllJson = async () => {
    if (state.status !== 'completed') return;
    const jsonEntries = state.files
      .map((file) => file.json)
      .filter(Boolean);
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonEntries, null, 2));
    } catch (error) {
      console.error('Failed to copy JSON', error);
    }
  };

  const renderStoredResults = () => {
    if (state.status !== 'completed' || !state.stored?.length) return null;

    return (
      <Card variant="classic" style={{ marginTop: 16 }}>
        <Heading size="3">Supabase Uploads</Heading>
        <Flex direction="column" gap="2" style={{ marginTop: 12 }}>
          {state.stored.map((stored) => (
            <Box
              key={stored.filename}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: 8,
                borderRadius: 8,
                backgroundColor: 'var(--gray-3)',
              }}
            >
              <Flex align="center" gap="2" justify="between">
                <Text weight="bold">{stored.filename}</Text>
                {stored.error ? (
                  <Badge color="red">Upload failed</Badge>
                ) : (
                  <Badge color="green">Uploaded</Badge>
                )}
              </Flex>
              <Flex direction="column" gap="1">
                {stored.markdownUrl && (
                  <Text size="2">
                    Markdown: <Link href={stored.markdownUrl}>{stored.markdownPath}</Link>
                  </Text>
                )}
                {stored.jsonUrl && (
                  <Text size="2">
                    JSON: <Link href={stored.jsonUrl}>{stored.jsonPath}</Link>
                  </Text>
                )}
                {stored.error && (
                  <Text size="2" color="red">
                    {stored.error}
                  </Text>
                )}
              </Flex>
            </Box>
          ))}
        </Flex>
      </Card>
    );
  };

  const renderResults = () => {
    if (state.status !== 'completed') return null;

    return (
      <>
      <Card variant="classic" style={{ marginTop: 16 }}>
        <Flex justify="between" align="center">
          <Heading size="3">Generated Sessions</Heading>
          <Flex gap="3">
            <Button onClick={handleDownloadZip}>Download ZIP</Button>
            <Button variant="soft" onClick={handleCopyAllJson}>
              Copy all JSON
            </Button>
          </Flex>
        </Flex>

        <Flex direction="column" gap="3" style={{ marginTop: 16 }}>
          {state.files.map((file) => (
            <Card key={file.filename} variant="surface">
              <Flex justify="between" align="center">
                <Flex direction="column">
                  <Text weight="bold">{file.filename}</Text>
                  <Text size="2" color="gray">
                    Seed: {file.seedUsed} · Sentiment: {file.log.sentiment}
                  </Text>
                </Flex>
                <Flex gap="2" align="center">
                  <Badge color={file.log.needsManualFix ? 'red' : 'green'}>
                    JSON {file.log.parsePath === 'json' ? 'valid' : 'parsed from markdown'}
                  </Badge>
                  {file.log.retried && <Badge color="amber">Strict retry</Badge>}
                  {file.log.needsManualFix && <Badge color="red">Needs review</Badge>}
                </Flex>
              </Flex>

              <Separator style={{ marginTop: 12, marginBottom: 12 }} />

              <Flex direction="column" gap="2">
                <Text size="2">Generator version: {file.generatorVersion}</Text>
                <Text size="2">Omission probability: {file.log.omittedPct}</Text>
                <Text size="2">Parse path: {file.log.parsePath}</Text>
              </Flex>

              {file.json && (
                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: 'pointer' }}>View JSON</summary>
                  <TextArea
                    readOnly
                    size="3"
                    style={{ marginTop: 8, width: '100%', minHeight: 160 }}
                    value={JSON.stringify(file.json, null, 2)}
                  />
                </details>
              )}

              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer' }}>View Markdown</summary>
                <TextArea
                  readOnly
                  size="3"
                  style={{ marginTop: 8, width: '100%', minHeight: 200 }}
                  value={file.content}
                />
              </details>
            </Card>
          ))}
        </Flex>

        {renderStoredResults()}
      </Card>
      {renderPipelineStep()}
      </>
    );
  };

  const handleRunPipelineInline = async () => {
    if (state.status !== 'completed') return;
    const raws = state.files.map((f) => f.json).filter(Boolean) as RawSession[];
    if (!raws.length) {
      setPipeline({ status: 'error', message: 'No JSON footers found in generated results.' });
      return;
    }
    try {
      setPipeline({ status: 'running' });
      const result = await runImpactPipelineInline(raws);
      setPipeline({ status: 'completed', result });
    } catch (err) {
      setPipeline({ status: 'error', message: err instanceof Error ? err.message : 'Pipeline failed.' });
    }
  };

  const renderPipelineStep = () => {
    if (state.status !== 'completed') return null;
    return (
      <Card variant="classic" style={{ marginTop: 24 }}>
        <Flex justify="between" align="center">
          <Heading size="3">2. Generate mock dashboards</Heading>
          <Button onClick={handleRunPipelineInline} disabled={pipeline.status === 'running'}>
            {pipeline.status === 'running' ? 'Running…' : 'Run pipeline on generated sessions'}
          </Button>
        </Flex>
        {pipeline.status === 'error' && (
          <Text size="2" color="red" style={{ marginTop: 8 }}>
            {pipeline.message}
          </Text>
        )}
        {pipeline.status === 'completed' && renderPipelineResults(pipeline.result)}
      </Card>
    );
  };

  const renderPipelineResults = (data: RunPipelineInlineResponse) => {
    const improvement = getImprovementSummaryInline(data);
    const series = (data.sections.assessmentOutcomes.component as any).series as Array<{
      key: string;
      label: string;
      avgPre: number | null;
      avgPost: number | null;
      avgChange: number | null;
      pctImproved: number | null;
    }>; 

    return (
      <>
        <Box style={{ marginTop: 12, overflow: 'visible' }}>
        <Flex gap="4" align="stretch" wrap="wrap">
          <Box style={{ flex: 1, minWidth: 320 }}>
            <OverallImpactCard prose={data.sections.overallImpact.prose} />
          </Box>
          <Box style={{ flex: 1, minWidth: 360 }}>
            <ImprovementDonutCard
              headingPercent={improvement.headingPct}
              nCompleted={improvement.nCompleted}
              breakdown={improvement.breakdown}
            />
          </Box>
        </Flex>
        </Box>
        {/* Strengths/Improvements section */}
        <Box style={{ marginTop: 12 }}>
          <StrengthsImprovementsCard
            prose={data.sections.strengthsImprovements.prose}
            strengths={(data.sections.strengthsImprovements.component as any).strengths || []}
            improvements={(data.sections.strengthsImprovements.component as any).improvements || []}
          />
        </Box>
        {/* Participant Reasons section */}
        <Box style={{ marginTop: 12 }}>
          <ParticipantReasonsCard
            prose={data.sections.participantReasons.prose}
            reasons={(data.sections.participantReasons.component as any).reasons || []}
            offeringName={extractOfferingNameFromHeader(lockedHeader)}
          />
        </Box>
        <Separator style={{ marginTop: 16, marginBottom: 16 }} />
        <Heading size="3">Assessment Outcomes</Heading>
        <Text style={{ marginTop: 8 }}>{data.sections.assessmentOutcomes.prose}</Text>
        {Array.isArray(series) && series.length > 0 ? (
          <Table.Root style={{ marginTop: 12 }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Assessment</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Avg Pre</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Avg Post</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Avg Change</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>% Improved</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {series.map((s) => (
                <Table.Row key={s.key}>
                  <Table.Cell>{s.label}</Table.Cell>
                  <Table.Cell>{formatNumber(s.avgPre)}</Table.Cell>
                  <Table.Cell>{formatNumber(s.avgPost)}</Table.Cell>
                  <Table.Cell>{formatNumber(s.avgChange)}</Table.Cell>
                  <Table.Cell>{formatPercentDisplay(s.pctImproved)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        ) : (
          <Text color="gray" style={{ marginTop: 8 }}>
            No quantitative assessments available.
          </Text>
        )}
        <Separator style={{ marginTop: 16, marginBottom: 16 }} />
        <Heading size="3">CohortFacts (debug)</Heading>
        <TextArea readOnly value={JSON.stringify(data.cohortFacts, null, 2)} style={{ fontFamily: 'monospace', minHeight: 200 }} />
      </>
    );
  };

  const formatNumber = (value: number | null): string => {
    if (value === null || Number.isNaN(value)) return '--';
    return value.toFixed(2);
  };
  const formatPercentDisplay = (value: number | null): string => {
    if (value === null || Number.isNaN(value)) return '--';
    return `${(value * 100).toFixed(0)}%`;
  };

  const extractOfferingNameFromHeader = (header: string): string | undefined => {
    const match = header.match(/Program\s*:\s*(.+)/i) || header.match(/Offering\s*:\s*(.+)/i) || header.match(/^#\s*(.+)$/m);
    if (match && match[1]) {
      return match[1].trim();
    }
    return undefined;
  };

  // Inline improvement breakdown matching /reports
  const getImprovementSummaryInline = (data: RunPipelineInlineResponse) => {
    const sessions = data.sessionFacts;
    const SIGNIFICANT_THRESHOLD = 2; // ≥2 points
    const MIN_PAIRED = 2;

    let significant = 0;
    let some = 0;
    let none = 0;
    let total = 0;

    for (const s of sessions) {
      const paired = s.assessments.filter((d) => d.pre !== null && d.post !== null);
      if (paired.length < MIN_PAIRED) continue;
      total += 1;

      let maxImprovement = 0;
      for (const d of paired) {
        const change = d.change ?? (d.pre !== null && d.post !== null ? d.post - d.pre : null);
        if (change === null) continue;
        const dir = (SURVEY_KEY_MAP as any)[d.key]?.betterWhen as 'higher' | 'lower' | undefined;
        const magnitude = dir === 'lower' ? -change : change;
        if (Number.isFinite(magnitude)) {
          if (magnitude > maxImprovement) maxImprovement = magnitude;
        }
      }

      if (maxImprovement >= SIGNIFICANT_THRESHOLD) significant += 1;
      else if (maxImprovement > 0) some += 1;
      else none += 1;
    }

    if (total === 0) {
      return { headingPct: 0, nCompleted: 0, breakdown: { significant: 0, some: 0, none: 1 } } as const;
    }
    const headingPct = (significant + some) / total;
    return {
      headingPct,
      nCompleted: total,
      breakdown: {
        significant: significant / total,
        some: some / total,
        none: none / total,
      },
    } as const;
  };

  const renderStatus = () => {
    if (state.status === 'submitting' || state.status === 'processing') {
      const progressValue = state.status === 'submitting' ? 25 : state.progress * 100;
      return (
        <Card variant="classic" style={{ marginTop: 16 }}>
          <Heading size="3">Generating sessions</Heading>
          <Text size="2" color="gray" style={{ marginTop: 8 }}>
            This may take a moment while we generate the requested sessions.
          </Text>
          <Progress value={progressValue} style={{ marginTop: 12 }} />
        </Card>
      );
    }

    if (state.status === 'error') {
      return (
        <Callout.Root color="red" style={{ marginTop: 16 }}>
          <Callout.Icon />
          <Callout.Text>{state.message}</Callout.Text>
        </Callout.Root>
      );
    }

    return null;
  };

  return (
    <Box style={{ padding: 32, maxWidth: 960 }}>
      <Heading size="6">Mock Session Data Generator</Heading>
      <Text size="3" color="gray" style={{ marginTop: 8 }}>
        Upload a real session example, then generate additional mock sessions for testing the MAP → REDUCE → COMPOSE pipeline. Configure sentiment mix, omission probability, and optional Supabase upload.
      </Text>

      <Card variant="classic" style={{ marginTop: 24 }}>
        <Heading size="4">1. Upload example session</Heading>
        <Text size="2" color="gray" style={{ marginTop: 8 }}>
          Provide a single session file in the same format we expect the generator to emulate. Accepted formats: `.md`, `.txt`.
        </Text>

        <Flex direction="column" gap="2" style={{ marginTop: 16 }}>
          <input
            type="file"
            accept=".md,.txt"
            onChange={handleFileChange}
            style={{
              padding: '12px 0',
            }}
          />
          {uploaded && (
            <Text size="2" color="gray">
              Loaded file: {uploaded.file.name} ({formatPercent(uploaded.text.length / 100000)} of max size)
            </Text>
          )}
          {validationError && (
            <Text size="2" color="red">
              {validationError}
            </Text>
          )}
          <TextArea
            readOnly
            size="3"
            style={{ marginTop: 8, minHeight: 180 }}
            value={uploaded?.text ?? 'Upload an example file to preview its contents.'}
          />
        </Flex>
      </Card>

      <Card variant="classic" style={{ marginTop: 24 }}>
        <Heading size="4">2. Confirm program & milestones</Heading>
        <Text size="2" color="gray" style={{ marginTop: 8 }}>
          We will lock the program header and milestone titles/order to match your example. Only the participant demographics and milestone responses (surveys, reflections, outcomes) will vary.
        </Text>
        <Flex direction="column" gap="2" style={{ marginTop: 12 }}>
          <Text size="2" weight="bold">Locked program header</Text>
          <TextArea readOnly size="2" value={lockedHeader || 'Upload an example to preview the locked header.'} />
        </Flex>
        {lockedMilestones.length > 0 && (
          <Flex direction="column" gap="2" style={{ marginTop: 12 }}>
            <Text size="2" weight="bold">Locked milestone structure</Text>
            <Box style={{ background: 'var(--gray-2)', borderRadius: 8, padding: 8 }}>
              {lockedMilestones.map((m, i) => (
                <Text key={`${i}-${m.type}-${m.title ?? ''}`} size="2" style={{ display: 'block' }}>
                  {String(i + 1).padStart(2, '0')}. [{m.type}] {m.title ?? '(untitled)'}{m.description ? ` — ${m.description}` : ''}
                </Text>
              ))}
            </Box>
          </Flex>
        )}
        <Flex align="center" gap="2" style={{ marginTop: 12 }}>
          <Checkbox checked={confirmedLock} onCheckedChange={(v) => setConfirmedLock(Boolean(v))} />
          <Text size="2">I confirm these details are correct and should be locked</Text>
        </Flex>
      </Card>

      <Card variant="classic" style={{ marginTop: 24 }}>
        <Heading size="4">3. Configure generation</Heading>
        <Flex direction="column" gap="4" style={{ marginTop: 16 }}>
          <Flex gap="4" wrap="wrap">
            <Box style={{ minWidth: 220 }}>
              <Text size="2" weight="bold">
                Number of sessions (1–50)
              </Text>
              <TextField.Root
                value={String(count)}
                onChange={(event) => handleCountChange(event.target.value)}
                inputMode="numeric"
                variant="soft"
                style={{ marginTop: 8 }}
              />
            </Box>
            <Box style={{ minWidth: 220 }}>
              <Text size="2" weight="bold">
                Omission probability (0–0.2)
              </Text>
              <TextField.Root
                value={String(omitProbability)}
                onChange={(event) => handleOmissionChange(event.target.value)}
                inputMode="decimal"
                variant="soft"
                style={{ marginTop: 8 }}
              />
            </Box>
            <Box style={{ minWidth: 220 }}>
              <Text size="2" weight="bold">
                Base seed
              </Text>
              <TextField.Root
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
                variant="soft"
                style={{ marginTop: 8 }}
              />
            </Box>
          </Flex>

          <Box>
            <Text size="2" weight="bold">
              Sentiment mix
            </Text>
            <Text size="2" color="gray" style={{ marginBottom: 8 }}>
              Adjust the weight for each sentiment. We normalize automatically to keep ratios consistent.
            </Text>
            <Flex gap="3" wrap="wrap">
              {(['positive', 'neutral', 'negative'] as Sentiment[]).map((sentiment) => (
                <Box key={sentiment} style={{ minWidth: 160 }}>
                  <Text size="2" weight="bold" style={{ textTransform: 'capitalize' }}>
                    {sentiment} ({mixDisplay[sentiment]})
                  </Text>
                  <TextField.Root
                    value={String(sentimentMix[sentiment])}
                    onChange={(event) => updateSentiment(sentiment, Number(event.target.value) || 0)}
                    inputMode="decimal"
                    variant="soft"
                    style={{ marginTop: 4 }}
                  />
                </Box>
              ))}
            </Flex>
          </Box>

          <Flex align="center" gap="2">
            <Checkbox checked={storeResults} onCheckedChange={(value) => setStoreResults(Boolean(value))} />
            <Text size="2">Upload generated files to Supabase Storage</Text>
          </Flex>
        </Flex>

        <Button
          onClick={handleSubmit}
          disabled={state.status === 'submitting' || state.status === 'processing' || !confirmedLock}
          style={{ marginTop: 24 }}
        >
          {state.status === 'submitting' || state.status === 'processing' ? 'Generating...' : 'Generate mock sessions'}
        </Button>
      </Card>

      {renderStatus()}
      {renderResults()}
    </Box>
  );
}
