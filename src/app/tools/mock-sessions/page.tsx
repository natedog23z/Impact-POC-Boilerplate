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
import KeyAreasChallengesCard from '@/components/dashboard/KeyAreasChallengesCard';
import KeyThemesCard from '@/components/dashboard/KeyThemesCard';
import FlourishingOutcomesGrid from '@/components/dashboard/FlourishingOutcomesGrid';
import TestimonialsCard from '@/components/dashboard/TestimonialsCard';
import { PanelGate } from '@/components/readiness/PanelGate';
import { SURVEY_KEY_MAP } from '@/lib/mock-sessions/surveyKeys';
import {
  OVERALL_IMPACT_SYSTEM_PROMPT,
  KEY_THEMES_SYSTEM_PROMPT,
  STRENGTHS_IMPROVEMENTS_SYSTEM_PROMPT,
  KEY_AREAS_CHALLENGES_SYSTEM_PROMPT,
  ASSESSMENT_OUTCOMES_SYSTEM_PROMPT,
  ASSESSMENT_CATEGORIES_SYSTEM_PROMPT,
  PARTICIPANT_REASONS_SYSTEM_PROMPT,
} from '@/lib/compose/prompt-defaults';

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

  type PromptText = { system: string; userInstructions: string };
  type PromptOverridesBySectionUI = {
    assessmentOutcomes: PromptText;
    assessmentCategories: PromptText;
    overallImpact: PromptText;
    strengthsImprovements: PromptText;
    participantReasons: PromptText;
    keyAreasChallenges: PromptText;
    keyThemes: PromptText;
  };

  const [prompts, setPrompts] = useState<PromptOverridesBySectionUI>({
    assessmentOutcomes: { system: ASSESSMENT_OUTCOMES_SYSTEM_PROMPT, userInstructions: '' },
    assessmentCategories: { system: ASSESSMENT_CATEGORIES_SYSTEM_PROMPT, userInstructions: '' },
    overallImpact: { system: OVERALL_IMPACT_SYSTEM_PROMPT, userInstructions: '' },
    strengthsImprovements: { system: STRENGTHS_IMPROVEMENTS_SYSTEM_PROMPT, userInstructions: '' },
    participantReasons: { system: PARTICIPANT_REASONS_SYSTEM_PROMPT, userInstructions: '' },
    keyAreasChallenges: { system: KEY_AREAS_CHALLENGES_SYSTEM_PROMPT, userInstructions: '' },
    keyThemes: { system: KEY_THEMES_SYSTEM_PROMPT, userInstructions: '' },
  });

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
      const overrides = buildPromptOverridesForAction(prompts);
      const result = await runImpactPipelineInline(raws, overrides);
      setPipeline({ status: 'completed', result });
    } catch (err) {
      // Attempt to extract any skipped details from console logs is not feasible here;
      // instead, show a friendly hint.
      const message = err instanceof Error ? err.message : 'Pipeline failed.';
      const hint = ' Tip: open devtools console for details. Ensure OPENAI_API_KEY is set for extraction.';
      setPipeline({ status: 'error', message: `${message}${hint}` });
    }
  };

  const renderPipelineStep = () => {
    if (state.status !== 'completed') return null;
    return (
      <Card variant="classic" style={{ marginTop: 24 }}>
        <Flex justify="between" align="center">
          <Heading size="3">3. Generate mock dashboards</Heading>
          <Button onClick={handleRunPipelineInline} disabled={pipeline.status === 'running'}>
            {pipeline.status === 'running' ? 'Running…' : 'Run pipeline on generated sessions'}
          </Button>
        </Flex>
        {pipeline.status === 'error' && (
          <>
            <Text size="2" color="red" style={{ marginTop: 8 }}>
              {pipeline.message}
            </Text>
            {state.status === 'completed' && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer' }}>Show generated JSON footers (debug)</summary>
                <TextArea
                  readOnly
                  size="2"
                  style={{ marginTop: 8, width: '100%', minHeight: 160 }}
                  value={JSON.stringify(state.files.map((f) => f.json).filter(Boolean), null, 2)}
                />
              </details>
            )}
          </>
        )}
        {pipeline.status === 'completed' && renderPipelineResults(pipeline.result)}
      </Card>
    );
  };

  const updatePromptField = (
    section: keyof PromptOverridesBySectionUI,
    field: keyof PromptText,
    value: string,
  ) => {
    setPrompts((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const buildPromptOverridesForAction = (p: PromptOverridesBySectionUI) => {
    return {
      assessmentOutcomes: { system: p.assessmentOutcomes.system, userInstructions: p.assessmentOutcomes.userInstructions },
      assessmentCategories: { system: p.assessmentCategories.system, userInstructions: p.assessmentCategories.userInstructions },
      overallImpact: { system: p.overallImpact.system, userInstructions: p.overallImpact.userInstructions },
      strengthsImprovements: { system: p.strengthsImprovements.system, userInstructions: p.strengthsImprovements.userInstructions },
      participantReasons: { system: p.participantReasons.system, userInstructions: p.participantReasons.userInstructions },
      keyAreasChallenges: { system: p.keyAreasChallenges.system, userInstructions: p.keyAreasChallenges.userInstructions },
      keyThemes: { system: p.keyThemes.system, userInstructions: p.keyThemes.userInstructions },
    } as const;
  };

  const renderPromptsSection = () => {
    if (state.status !== 'completed') return null;
    return (
      <Card variant="classic" style={{ marginTop: 24 }}>
        <Heading size="3">2. Configure prompts (optional)</Heading>
        <Text size="2" color="gray" style={{ marginTop: 8 }}>
          Edit system prompts or add extra instructions for each dashboard section. These overrides will be used for the next pipeline run.
        </Text>
        <Flex direction="column" gap="3" style={{ marginTop: 12 }}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Overall Impact</summary>
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>System prompt</Text>
            <TextArea size="3" value={prompts.overallImpact.system} onChange={(e) => updatePromptField('overallImpact', 'system', e.target.value)} />
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>Additional instructions</Text>
            <TextArea size="3" value={prompts.overallImpact.userInstructions} onChange={(e) => updatePromptField('overallImpact', 'userInstructions', e.target.value)} />
          </details>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Key Themes</summary>
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>System prompt</Text>
            <TextArea size="3" value={prompts.keyThemes.system} onChange={(e) => updatePromptField('keyThemes', 'system', e.target.value)} />
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>Additional instructions</Text>
            <TextArea size="3" value={prompts.keyThemes.userInstructions} onChange={(e) => updatePromptField('keyThemes', 'userInstructions', e.target.value)} />
          </details>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Strengths & Improvements</summary>
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>System prompt</Text>
            <TextArea size="3" value={prompts.strengthsImprovements.system} onChange={(e) => updatePromptField('strengthsImprovements', 'system', e.target.value)} />
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>Additional instructions</Text>
            <TextArea size="3" value={prompts.strengthsImprovements.userInstructions} onChange={(e) => updatePromptField('strengthsImprovements', 'userInstructions', e.target.value)} />
          </details>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Key Areas & Challenges</summary>
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>System prompt</Text>
            <TextArea size="3" value={prompts.keyAreasChallenges.system} onChange={(e) => updatePromptField('keyAreasChallenges', 'system', e.target.value)} />
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>Additional instructions</Text>
            <TextArea size="3" value={prompts.keyAreasChallenges.userInstructions} onChange={(e) => updatePromptField('keyAreasChallenges', 'userInstructions', e.target.value)} />
          </details>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Participant Reasons</summary>
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>System prompt</Text>
            <TextArea size="3" value={prompts.participantReasons.system} onChange={(e) => updatePromptField('participantReasons', 'system', e.target.value)} />
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>Additional instructions</Text>
            <TextArea size="3" value={prompts.participantReasons.userInstructions} onChange={(e) => updatePromptField('participantReasons', 'userInstructions', e.target.value)} />
          </details>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Assessment Outcomes</summary>
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>System prompt</Text>
            <TextArea size="3" value={prompts.assessmentOutcomes.system} onChange={(e) => updatePromptField('assessmentOutcomes', 'system', e.target.value)} />
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>Additional instructions</Text>
            <TextArea size="3" value={prompts.assessmentOutcomes.userInstructions} onChange={(e) => updatePromptField('assessmentOutcomes', 'userInstructions', e.target.value)} />
          </details>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Assessment Categories</summary>
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>System prompt</Text>
            <TextArea size="3" value={prompts.assessmentCategories.system} onChange={(e) => updatePromptField('assessmentCategories', 'system', e.target.value)} />
            <Text size="2" weight="bold" style={{ marginTop: 8 }}>Additional instructions</Text>
            <TextArea size="3" value={prompts.assessmentCategories.userInstructions} onChange={(e) => updatePromptField('assessmentCategories', 'userInstructions', e.target.value)} />
          </details>
        </Flex>
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
            <PanelGate panelId="overallImpact" readiness={data.readiness.panels.overallImpact}>
              <OverallImpactCard prose={data.sections.overallImpact.prose} />
            </PanelGate>
          </Box>
          <Box style={{ flex: 1, minWidth: 360 }}>
            <PanelGate panelId="improvementDonut" readiness={data.readiness.panels.improvementDonut}>
              <ImprovementDonutCard
                headingPercent={improvement.headingPct}
                nCompleted={improvement.nCompleted}
                breakdown={improvement.breakdown}
              />
            </PanelGate>
          </Box>
        </Flex>
        </Box>
        {/* Testimonials section */}
        <Box style={{ marginTop: 12 }}>
          <PanelGate panelId="testimonials" readiness={data.readiness.panels.testimonials}>
            <TestimonialsCard
              title="Testimonials"
              quotes={data.cohortFacts.exemplarQuotes}
              sourceNote="Sourced from participant reflections & outcome notes"
            />
          </PanelGate>
        </Box>
        {/* Key Areas of Impact & Primary Challenges Addressed */}
        <Box style={{ marginTop: 12 }}>
          <PanelGate panelId="keyAreasChallenges" readiness={data.readiness.panels.keyAreasChallenges}>
            <KeyAreasChallengesCard
              proseLeft={(data.sections.keyAreasChallenges.prose.split('\n\n')[0]) || ''}
              proseRight={(data.sections.keyAreasChallenges.prose.split('\n\n')[1] || data.sections.keyAreasChallenges.prose) || ''}
              impacts={(data.sections.keyAreasChallenges.component as any).impacts || []}
              challenges={(data.sections.keyAreasChallenges.component as any).challenges || []}
            />
          </PanelGate>
        </Box>
        {/* Key Themes section */}
        <Box style={{ marginTop: 12 }}>
          <PanelGate panelId="keyThemes" readiness={data.readiness.panels.keyThemes}>
            <KeyThemesCard
              prose={data.sections.keyThemes.prose}
              themes={(data.sections.keyThemes.component as any).themes || []}
              sourceNote="Source of Data"
            />
          </PanelGate>
        </Box>
        {/* Strengths/Improvements section */}
        <Box style={{ marginTop: 12 }}>
          <PanelGate panelId="strengthsImprovements" readiness={data.readiness.panels.strengthsImprovements}>
            <StrengthsImprovementsCard
              prose={data.sections.strengthsImprovements.prose}
              strengths={(data.sections.strengthsImprovements.component as any).strengths || []}
              improvements={(data.sections.strengthsImprovements.component as any).improvements || []}
            />
          </PanelGate>
        </Box>
        {/* Participant Reasons section */}
        <Box style={{ marginTop: 12 }}>
          <PanelGate panelId="participantReasons" readiness={data.readiness.panels.participantReasons}>
            <ParticipantReasonsCard
              prose={data.sections.participantReasons.prose}
              reasons={(data.sections.participantReasons.component as any).reasons || []}
              offeringName={extractOfferingNameFromHeader(lockedHeader)}
            />
          </PanelGate>
        </Box>
        <Separator style={{ marginTop: 16, marginBottom: 16 }} />
        <PanelGate panelId="flourishingGrid" readiness={data.readiness.panels.flourishingGrid}>
          <FlourishingOutcomesGrid
            prose={data.sections.assessmentOutcomes.prose}
            categories={((data.sections.assessmentCategories.component as any)?.categories || []).map((c: any) => ({
              key: c.key,
              title: c.title,
              description: c.description,
              percentImproved: c.percentImproved ?? null,
            }))}
          />
        </PanelGate>
        <Separator style={{ marginTop: 16, marginBottom: 16 }} />
        <Heading size="3">CohortFacts + Readiness (debug)</Heading>
        <TextArea readOnly value={JSON.stringify({ facts: data.cohortFacts, readiness: data.readiness }, null, 2)} style={{ fontFamily: 'monospace', minHeight: 200 }} />
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

  // Inline improvement breakdown (participant-level). A participant counts as
  // improved only if a MAJORITY of their paired assessments improved.
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
      let improvedCount = 0;
      let pairedCount = 0;
      for (const d of paired) {
        const change = d.change ?? (d.pre !== null && d.post !== null ? d.post - d.pre : null);
        if (change === null) continue;
        const dir = (SURVEY_KEY_MAP as any)[d.key]?.betterWhen as 'higher' | 'lower' | undefined;
        const magnitude = dir === 'lower' ? -change : change;
        if (!Number.isFinite(magnitude)) continue;
        pairedCount += 1;
        if (magnitude > 0) improvedCount += 1;
        if (magnitude > maxImprovement) maxImprovement = magnitude;
      }

      // Majority rule for improvement
      const majorityImproved = improvedCount >= Math.ceil(pairedCount / 2);
      if (majorityImproved && maxImprovement >= SIGNIFICANT_THRESHOLD) significant += 1;
      else if (majorityImproved) some += 1;
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
      {renderPromptsSection()}
      {renderResults()}
    </Box>
  );
}
