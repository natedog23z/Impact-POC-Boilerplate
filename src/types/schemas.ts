import { z } from 'zod';

export const assessmentDeltaSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  pre: z.number().int().min(1).max(10).nullable(),
  post: z.number().int().min(1).max(10).nullable(),
  change: z
    .number()
    .min(-9)
    .max(9)
    .nullable(),
});

export const sessionQuoteSchema = z.object({
  text: z.string().min(6),
  theme: z.string().min(1).optional(),
  sessionId: z.string().min(1),
});

export const sessionFactsSchema = z.object({
  sessionId: z.string().min(1),
  programId: z.string().min(1),
  milestoneCompletionPct: z.number().min(0).max(100),
  assessments: z.array(assessmentDeltaSchema),
  strengths: z.array(z.string().min(1)).max(6),
  improvements: z.array(z.string().min(1)).max(6),
  themes: z.array(z.string().min(1)).max(6),
  reasons: z.array(z.string().min(1)).max(10),
  challenges: z.array(z.string().min(1)).max(10),
  quotes: z.array(sessionQuoteSchema).max(2),
  completeness: z.object({
    hasPre: z.boolean(),
    hasPost: z.boolean(),
    hasReflections: z.boolean(),
  }),
  version: z.string().min(1),
  createdAt: z.string().min(1),
});

export const cohortTagSchema = z.object({
  tag: z.string().min(1),
  count: z.number().int().min(0),
});

export const cohortAssessmentSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  avgPre: z.number().min(1).max(10).nullable(),
  avgPost: z.number().min(1).max(10).nullable(),
  avgChange: z.number().min(-9).max(9).nullable(),
  pctImproved: z.number().min(0).max(1).nullable(),
  betterWhen: z.enum(['higher', 'lower']).optional(),
});

export const cohortFactsSchema = z.object({
  programId: z.string().min(1),
  nSessions: z.number().int().min(0),
  nWithPrePost: z.number().int().min(0),
  completion: z.object({
    meanPct: z.number().min(0).max(100),
    medianPct: z.number().min(0).max(100),
  }),
  assessments: z.array(cohortAssessmentSchema),
  topStrengths: z.array(cohortTagSchema).max(10),
  topImprovements: z.array(cohortTagSchema).max(10),
  topThemes: z.array(cohortTagSchema).max(10),
  topChallenges: z.array(cohortTagSchema).max(10),
  topReasons: z.array(cohortTagSchema).max(10),
  exemplarQuotes: z.array(sessionQuoteSchema).max(8),
  dataQualityNotes: z.array(z.string().min(1)).max(12),
  factsHash: z.string().min(1),
});

export const sectionOutputSchema = z.object({
  prose: z.string().min(1),
  component: z.record(z.string(), z.any()),
});

export type AssessmentDelta = z.infer<typeof assessmentDeltaSchema>;
export type SessionQuote = z.infer<typeof sessionQuoteSchema>;
export type SessionFacts = z.infer<typeof sessionFactsSchema>;
export type CohortTag = z.infer<typeof cohortTagSchema>;
export type CohortAssessment = z.infer<typeof cohortAssessmentSchema>;
export type CohortFacts = z.infer<typeof cohortFactsSchema>;
export type SectionOutput = z.infer<typeof sectionOutputSchema>;
