/**
 * Build Cohort Facts with Readiness
 * 
 * Extends the core build-cohort-facts pipeline to include deterministic
 * readiness evaluation for dashboard component gating.
 */

import { buildCohortFacts, type BuildCohortFactsOptions } from './build-cohort-facts';
import { evaluateReadiness, type ReadinessConfig, getReadinessConfig } from '@/lib/readiness';
import type { SessionFacts, CohortFacts } from '@/types/schemas';
import type { ReadinessResult, ReadinessInput } from '@/lib/readiness/types';

export interface CohortFactsWithReadiness {
  facts: CohortFacts;
  readiness: ReadinessResult;
}

export interface BuildCohortFactsWithReadinessOptions extends BuildCohortFactsOptions {
  readinessConfig?: Partial<ReadinessConfig>;
}

/**
 * Build cohort facts alongside readiness evaluation
 * 
 * This is the primary entry point for producing both normalized facts
 * and the readiness object that gates UI rendering.
 */
export function buildCohortFactsWithReadiness(
  sessions: SessionFacts[],
  options: BuildCohortFactsWithReadinessOptions = {},
): CohortFactsWithReadiness {
  // Build standard facts
  const facts = buildCohortFacts(sessions, options);
  
  // Extract readiness inputs from sessions and facts
  const readinessInput = buildReadinessInput(sessions, facts);
  
  // Get readiness config (with optional overrides)
  const config = getReadinessConfig(options.readinessConfig);
  
  // Evaluate readiness
  const readiness = evaluateReadiness(readinessInput, config);
  
  return {
    facts,
    readiness,
  };
}

/**
 * Build readiness input from sessions and computed facts
 */
function buildReadinessInput(
  sessions: SessionFacts[],
  facts: CohortFacts,
): ReadinessInput {
  // Extract survey data for paired counts
  const surveyData = extractSurveyData(sessions);
  
  // Extract session documents with confidence scores
  const sessionDocs = extractSessionDocs(sessions);
  
  // Extract testimonials (quotes as proxy)
  const testimonials = extractTestimonials(sessions);
  
  // Build groups for privacy checking
  const groups = extractGroups(sessions);
  
  // Map facts for denominators
  const factsData = {
    improved: computeImprovedCount(facts),
    total: facts.nWithPrePost,
    distribution: computeDistribution(facts),
    itemLevelStats: computeItemLevelStats(sessions),
  };
  
  return {
    surveys: surveyData,
    sessionDocs,
    testimonials,
    groups,
    facts: factsData,
  };
}

/**
 * Extract survey data with participant IDs and responses
 */
function extractSurveyData(sessions: SessionFacts[]) {
  const pre: Array<{ participantId: string; responses: Record<string, unknown> }> = [];
  const post: Array<{ participantId: string; responses: Record<string, unknown> }> = [];
  
  for (const session of sessions) {
    const preResponses: Record<string, unknown> = {};
    const postResponses: Record<string, unknown> = {};
    
    for (const assessment of session.assessments) {
      if (assessment.pre !== null) {
        preResponses[assessment.key] = assessment.pre;
      }
      if (assessment.post !== null) {
        postResponses[assessment.key] = assessment.post;
      }
    }
    
    if (Object.keys(preResponses).length > 0) {
      pre.push({
        participantId: session.sessionId,
        responses: preResponses,
      });
    }
    
    if (Object.keys(postResponses).length > 0) {
      post.push({
        participantId: session.sessionId,
        responses: postResponses,
      });
    }
  }
  
  return { pre, post };
}

/**
 * Extract session documents with confidence scores
 */
function extractSessionDocs(sessions: SessionFacts[]) {
  const docs: Array<{
    id: string;
    content: string;
    confidence?: number;
  }> = [];
  
  for (const session of sessions) {
    // Use reflections and quotes as content sources
    if (session.completeness.hasReflections) {
      docs.push({
        id: session.sessionId,
        content: session.quotes.map(q => q.text).join(' '),
        confidence: session.quotes.length > 0 ? 0.75 : 0.5, // Simple heuristic
      });
    }
  }
  
  return docs;
}

/**
 * Extract testimonials (use quotes as proxy)
 */
function extractTestimonials(sessions: SessionFacts[]) {
  const testimonials: Array<{
    id: string;
    content: string;
    approved: boolean;
  }> = [];
  
  for (const session of sessions) {
    for (let i = 0; i < session.quotes.length; i++) {
      const quote = session.quotes[i];
      testimonials.push({
        id: `${session.sessionId}-${i}`,
        content: quote.text,
        approved: true, // Assume quotes are pre-approved
      });
    }
  }
  
  return testimonials;
}

/**
 * Extract groups for privacy checking
 * 
 * Note: This is a placeholder. In production, you'd extract actual
 * demographic/segmentation data from sessions.
 */
function extractGroups(sessions: SessionFacts[]) {
  // Placeholder: group by program
  const programGroups = new Map<string, string[]>();
  
  for (const session of sessions) {
    const participants = programGroups.get(session.programId) || [];
    participants.push(session.sessionId);
    programGroups.set(session.programId, participants);
  }
  
  return {
    program: Array.from(programGroups.entries()).map(([groupId, participantIds]) => ({
      groupId,
      participantIds,
    })),
  };
}

/**
 * Compute count of improved participants
 */
function computeImprovedCount(facts: CohortFacts): number {
  // Average improvement rate across assessments
  const improvedRates = facts.assessments
    .map(a => a.pctImproved)
    .filter((pct): pct is number => pct !== null);
  
  if (improvedRates.length === 0) return 0;
  
  const avgRate = improvedRates.reduce((sum, rate) => sum + rate, 0) / improvedRates.length;
  return Math.round(avgRate * facts.nWithPrePost);
}

/**
 * Compute distribution for donut chart
 */
function computeDistribution(facts: CohortFacts): Record<string, number> {
  // Simplified distribution: improved vs not improved
  const improved = computeImprovedCount(facts);
  const notImproved = facts.nWithPrePost - improved;
  
  return {
    improved,
    notImproved,
  };
}

/**
 * Compute item-level statistics for null rate checking
 */
function computeItemLevelStats(sessions: SessionFacts[]): Record<string, { nullCount: number; total: number }> {
  const stats = new Map<string, { nullCount: number; total: number }>();
  
  for (const session of sessions) {
    for (const assessment of session.assessments) {
      const existing = stats.get(assessment.key) || { nullCount: 0, total: 0 };
      
      existing.total += 1;
      if (assessment.pre === null || assessment.post === null) {
        existing.nullCount += 1;
      }
      
      stats.set(assessment.key, existing);
    }
  }
  
  return Object.fromEntries(stats);
}

