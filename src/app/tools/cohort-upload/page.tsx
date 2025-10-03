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
  Separator,
  Callout,
  Progress,
  Badge,
  Table,
} from '@radix-ui/themes';
import { extractSessionsFromCohortMarkdown, extractVersionDetailsRecord } from '@/lib/mock-sessions/parse';
import { runImpactPipelineInline, type RunPipelineInlineResponse } from '../mock-sessions/actions';
import type { RawSession } from '@/lib/mock-sessions/types';
import OverallImpactCard from '@/components/dashboard/OverallImpactCard';
import ImprovementDonutCard from '@/components/dashboard/ImprovementDonutCard';
import StrengthsImprovementsCard from '@/components/dashboard/StrengthsImprovementsCard';
import ParticipantReasonsCard from '@/components/dashboard/ParticipantReasonsCard';
import KeyAreasChallengesCard from '@/components/dashboard/KeyAreasChallengesCard';
import KeyThemesCard from '@/components/dashboard/KeyThemesCard';
import FlourishingOutcomesGrid from '@/components/dashboard/FlourishingOutcomesGrid';
import TestimonialsCard from '@/components/dashboard/TestimonialsCard';
import { PanelGate } from '@/components/readiness/PanelGate';
import Demographics from '@/components/dashboard/Demographics';
import HexReachMap from '@/components/dashboard/HexReachMap';
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

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

type FileWithText = {
  file: File;
  text: string;
};

type ParsedCohort = {
  sessions: RawSession[];
  skipped: Array<{ index: number; versionId: string; error: string }>;
};

type UploadState =
  | { status: 'idle' }
  | { status: 'parsing' }
  | { status: 'parsed'; cohort: ParsedCohort }
  | { status: 'error'; message: string };

type PipelineState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'completed'; result: RunPipelineInlineResponse }
  | { status: 'error'; message: string };

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

export default function CohortUploadPage() {
  const [uploaded, setUploaded] = useState<FileWithText | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [pipelineState, setPipelineState] = useState<PipelineState>({ status: 'idle' });
  const [prompts, setPrompts] = useState<PromptOverridesBySectionUI>({
    assessmentOutcomes: { system: ASSESSMENT_OUTCOMES_SYSTEM_PROMPT, userInstructions: '' },
    assessmentCategories: { system: ASSESSMENT_CATEGORIES_SYSTEM_PROMPT, userInstructions: '' },
    overallImpact: { system: OVERALL_IMPACT_SYSTEM_PROMPT, userInstructions: '' },
    strengthsImprovements: { system: STRENGTHS_IMPROVEMENTS_SYSTEM_PROMPT, userInstructions: '' },
    participantReasons: { system: PARTICIPANT_REASONS_SYSTEM_PROMPT, userInstructions: '' },
    keyAreasChallenges: { system: KEY_AREAS_CHALLENGES_SYSTEM_PROMPT, userInstructions: '' },
    keyThemes: { system: KEY_THEMES_SYSTEM_PROMPT, userInstructions: '' },
  });

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setUploaded(null);
      setUploadState({ status: 'idle' });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadState({ status: 'error', message: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.` });
      return;
    }

    try {
      setUploadState({ status: 'parsing' });
      const result = await readUploadedFile(file);
      setUploaded(result);

      const parsed = extractSessionsFromCohortMarkdown(result.text);
      setUploadState({ status: 'parsed', cohort: parsed });
    } catch (error) {
      console.error('Parse error:', error);
      setUploadState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to parse cohort file.',
      });
    }
  };

  const handleRunPipeline = async () => {
    if (uploadState.status !== 'parsed') return;

    try {
      setPipelineState({ status: 'running' });
      const overrides = buildPromptOverridesForAction(prompts);
      const result = await runImpactPipelineInline(uploadState.cohort.sessions, overrides);
      setPipelineState({ status: 'completed', result });
    } catch (error) {
      console.error('Pipeline error:', error);
      setPipelineState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Pipeline failed.',
      });
    }
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

  const offeringTitle = useMemo(() => {
    if (!uploaded?.text) return undefined;
    try {
      const versionRecord = extractVersionDetailsRecord(uploaded.text);
      const title = (versionRecord as any)['Title'] || versionRecord['title'];
      if (typeof title === 'string' && title.trim()) return title.trim();
    } catch {}
    return undefined;
  }, [uploaded?.text]);

  const getImprovementSummaryInline = (data: RunPipelineInlineResponse) => {
    const sessions = data.sessionFacts;
    const SIGNIFICANT_THRESHOLD = 2;
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

  const renderPromptsSection = () => {
    if (uploadState.status !== 'parsed') return null;
    return (
      <Card variant="classic" style={{ marginTop: 24 }}>
        <Heading size="3">2. Configure prompts (optional)</Heading>
        <Text size="2" color="gray" style={{ marginTop: 8 }}>
          Edit system prompts or add extra instructions for each dashboard section.
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

  const renderDashboard = (data: RunPipelineInlineResponse) => {
    const improvement = getImprovementSummaryInline(data);

    return (
      <>
        {/* Program Reach Hex Map */}
        <Box style={{ marginTop: 12 }}>
          <HexReachMap points={data.reachPoints} />
        </Box>

        {/* Demographics */}
        <Box style={{ marginTop: 12 }}>
          <Demographics ages={data.demographics.ageBuckets} genders={data.demographics.genderCounts} total={data.demographics.total} />
        </Box>

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

        {/* Testimonials */}
        <Box style={{ marginTop: 12 }}>
          <PanelGate panelId="testimonials" readiness={data.readiness.panels.testimonials}>
            <TestimonialsCard
              title="Testimonials"
              quotes={data.cohortFacts.exemplarQuotes}
              sourceNote="Sourced from participant reflections & outcome notes"
            />
          </PanelGate>
        </Box>

        {/* Key Areas & Challenges */}
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

        {/* Key Themes */}
        <Box style={{ marginTop: 12 }}>
          <PanelGate panelId="keyThemes" readiness={data.readiness.panels.keyThemes}>
            <KeyThemesCard
              prose={data.sections.keyThemes.prose}
              themes={(data.sections.keyThemes.component as any).themes || []}
              sourceNote="Source of Data"
            />
          </PanelGate>
        </Box>

        {/* Strengths & Improvements */}
        <Box style={{ marginTop: 12 }}>
          <PanelGate panelId="strengthsImprovements" readiness={data.readiness.panels.strengthsImprovements}>
            <StrengthsImprovementsCard
              prose={data.sections.strengthsImprovements.prose}
              strengths={(data.sections.strengthsImprovements.component as any).strengths || []}
              improvements={(data.sections.strengthsImprovements.component as any).improvements || []}
            />
          </PanelGate>
        </Box>

        {/* Participant Reasons */}
        <Box style={{ marginTop: 12 }}>
          <PanelGate panelId="participantReasons" readiness={data.readiness.panels.participantReasons}>
            <ParticipantReasonsCard
              prose={data.sections.participantReasons.prose}
              reasons={(data.sections.participantReasons.component as any).reasons || []}
              offeringName={offeringTitle}
            />
          </PanelGate>
        </Box>

        <Separator style={{ marginTop: 16, marginBottom: 16 }} />

        {/* Flourishing Grid */}
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
        <TextArea 
          readOnly 
          value={JSON.stringify({ facts: data.cohortFacts, readiness: data.readiness }, null, 2)} 
          style={{ fontFamily: 'monospace', minHeight: 200 }} 
        />
      </>
    );
  };

  return (
    <Box style={{ padding: 32, maxWidth: 960 }}>
      <Heading size="6">Cohort Upload</Heading>
      <Text size="3" color="gray" style={{ marginTop: 8 }}>
        Upload a multi-session cohort file and preview the impact dashboard directly.
      </Text>

      <Card variant="classic" style={{ marginTop: 24 }}>
        <Heading size="4">1. Upload cohort file</Heading>
        <Text size="2" color="gray" style={{ marginTop: 8 }}>
          Upload a cohort markdown file containing multiple sessions. Each session should be separated by Version Details headings.
        </Text>

        <Flex direction="column" gap="2" style={{ marginTop: 16 }}>
          <input
            type="file"
            accept=".md,.txt"
            onChange={handleFileChange}
            style={{ padding: '12px 0' }}
          />
          {uploaded && (
            <Text size="2" color="gray">
              Loaded file: {uploaded.file.name} ({Math.round(uploaded.text.length / 1024)}KB)
            </Text>
          )}
        </Flex>

        {uploadState.status === 'parsing' && (
          <Box style={{ marginTop: 12 }}>
            <Progress />
            <Text size="2" color="gray" style={{ marginTop: 4 }}>
              Parsing cohort file...
            </Text>
          </Box>
        )}

        {uploadState.status === 'error' && (
          <Callout.Root color="red" style={{ marginTop: 12 }}>
            <Callout.Icon />
            <Callout.Text>{uploadState.message}</Callout.Text>
          </Callout.Root>
        )}

        {uploadState.status === 'parsed' && (
          <Box style={{ marginTop: 12 }}>
            <Callout.Root color="green">
              <Callout.Icon />
              <Callout.Text>
                Successfully parsed {uploadState.cohort.sessions.length} session{uploadState.cohort.sessions.length !== 1 ? 's' : ''}
                {uploadState.cohort.skipped.length > 0 && ` (${uploadState.cohort.skipped.length} skipped)`}
              </Callout.Text>
            </Callout.Root>

            <Box style={{ marginTop: 12 }}>
              <Text size="2" weight="bold">Parsed sessions:</Text>
              <Table.Root size="1" style={{ marginTop: 8 }}>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Session ID</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Program ID</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {uploadState.cohort.sessions.map((session, idx) => (
                    <Table.Row key={idx}>
                      <Table.Cell>{idx + 1}</Table.Cell>
                      <Table.Cell>{session.sessionId}</Table.Cell>
                      <Table.Cell>{session.programId}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>

            {uploadState.cohort.skipped.length > 0 && (
              <Box style={{ marginTop: 12 }}>
                <Text size="2" weight="bold" color="red">Skipped sessions:</Text>
                <Table.Root size="1" style={{ marginTop: 8 }}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Version ID</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Error</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {uploadState.cohort.skipped.map((skipped, idx) => (
                      <Table.Row key={idx}>
                        <Table.Cell>{skipped.index + 1}</Table.Cell>
                        <Table.Cell>{skipped.versionId}</Table.Cell>
                        <Table.Cell><Text size="1" color="red">{skipped.error}</Text></Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            )}
          </Box>
        )}
      </Card>

      {renderPromptsSection()}

      {uploadState.status === 'parsed' && (
        <Card variant="classic" style={{ marginTop: 24 }}>
          <Flex justify="between" align="center">
            <Heading size="3">3. Generate dashboard</Heading>
            <Button 
              onClick={handleRunPipeline} 
              disabled={pipelineState.status === 'running'}
            >
              {pipelineState.status === 'running' ? 'Running pipeline…' : 'Run pipeline'}
            </Button>
          </Flex>

          {pipelineState.status === 'running' && (
            <Box style={{ marginTop: 12 }}>
              <Progress />
              <Text size="2" color="gray" style={{ marginTop: 4 }}>
                Running MAP → REDUCE → COMPOSE pipeline...
              </Text>
            </Box>
          )}

          {pipelineState.status === 'error' && (
            <Callout.Root color="red" style={{ marginTop: 12 }}>
              <Callout.Icon />
              <Callout.Text>{pipelineState.message}</Callout.Text>
            </Callout.Root>
          )}

          {pipelineState.status === 'completed' && (
            <Box style={{ marginTop: 16 }}>
              {renderDashboard(pipelineState.result)}
            </Box>
          )}
        </Card>
      )}
    </Box>
  );
}

