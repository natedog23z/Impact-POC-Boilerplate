/**
 * Readiness Evaluator
 * 
 * Core deterministic logic for computing readiness gates.
 * Evaluates dataset health, LLM quality, privacy compliance, and panel-specific readiness.
 */

import { ReadinessConfig, DEFAULT_READINESS_CONFIG } from './config';
import {
  ReadinessResult,
  ReadinessInput,
  PanelReadiness,
  DatasetHealth,
  LLMQuality,
  PrivacyStatus,
} from './types';

/**
 * Evaluate complete readiness for all dashboard components
 */
export function evaluateReadiness(
  input: ReadinessInput,
  config: ReadinessConfig = DEFAULT_READINESS_CONFIG
): ReadinessResult {
  const evaluatedAt = new Date().toISOString();
  
  // Compute dataset health
  const dataset = evaluateDatasetHealth(input, config);
  
  // Compute LLM quality
  const llm = evaluateLLMQuality(input, config);
  
  // Compute privacy status
  const privacy = evaluatePrivacy(input, config);
  
  // Evaluate each panel
  const panels = {
    overallImpact: evaluateOverallImpact(input, dataset, config),
    improvementDonut: evaluateImprovementDonut(input, dataset, config),
    flourishingGrid: evaluateFlourishingGrid(input, dataset, config),
    keyThemes: evaluateKeyThemes(input, llm, config),
    keyAreasChallenges: evaluateKeyAreasChallenges(input, llm, privacy, config),
    participantReasons: evaluateParticipantReasons(input, llm, config),
    strengthsImprovements: evaluateStrengthsImprovements(input, dataset, llm, config),
    testimonials: evaluateTestimonials(input, config),
  };
  
  return {
    version: config.version,
    evaluatedAt,
    config,
    dataset,
    llm,
    privacy,
    panels,
  };
}

/**
 * Evaluate dataset health metrics
 */
function evaluateDatasetHealth(
  input: ReadinessInput,
  config: ReadinessConfig
): DatasetHealth {
  const preCount = input.surveys?.pre?.length || 0;
  const postCount = input.surveys?.post?.length || 0;
  
  // Find paired surveys
  const preParticipants = new Set(
    input.surveys?.pre?.map(s => s.participantId) || []
  );
  const postParticipants = new Set(
    input.surveys?.post?.map(s => s.participantId) || []
  );
  const pairedCount = Array.from(preParticipants).filter(id =>
    postParticipants.has(id)
  ).length;
  
  // Count unique participants
  const allParticipants = new Set([...preParticipants, ...postParticipants]);
  const participants = allParticipants.size;
  
  // Compute null rates
  const nullRatePre = computeNullRate(input.surveys?.pre || []);
  const nullRatePost = computeNullRate(input.surveys?.post || []);
  
  // Check for typedrift (simplified check)
  const hasTypedrift = detectTypedrift(input.surveys?.pre || [], input.surveys?.post || []);
  
  return {
    participants,
    preCount,
    postCount,
    pairedCount,
    hasTypedrift,
    nullRatePre,
    nullRatePost,
  };
}

/**
 * Evaluate LLM quality metrics
 */
function evaluateLLMQuality(
  input: ReadinessInput,
  config: ReadinessConfig
): LLMQuality {
  const sessionDocs = input.sessionDocs?.length || 0;
  
  // Compute average confidence
  const confidenceScores = input.sessionDocs
    ?.map(doc => doc.confidence)
    .filter((c): c is number => c !== undefined) || [];
  
  const avgConfidence = confidenceScores.length > 0
    ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length
    : 0;
  
  const meetsDocMinimum = sessionDocs >= config.llm.minDocuments;
  const meetsConfidenceMinimum = avgConfidence >= config.llm.minAvgConfidence;
  
  return {
    sessionDocs,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    meetsDocMinimum,
    meetsConfidenceMinimum,
  };
}

/**
 * Evaluate privacy compliance
 */
function evaluatePrivacy(
  input: ReadinessInput,
  config: ReadinessConfig
): PrivacyStatus {
  const groupsSuppressed: string[] = [];
  
  if (input.groups && config.privacy.applyToSlices) {
    for (const [groupType, groups] of Object.entries(input.groups)) {
      for (const group of groups) {
        if (group.participantIds.length < config.privacy.minGroupSize) {
          groupsSuppressed.push(`${groupType}:${group.groupId}`);
        }
      }
    }
  }
  
  return {
    smallNThreshold: config.privacy.minGroupSize,
    groupsSuppressed,
    ready: true, // Privacy checks don't block overall readiness, just suppress groups
  };
}

/**
 * Evaluate Overall Impact panel readiness
 */
function evaluateOverallImpact(
  input: ReadinessInput,
  dataset: DatasetHealth,
  config: ReadinessConfig
): PanelReadiness {
  const minPaired = config.panels.overallImpact.minPaired;
  const paired = dataset.pairedCount;
  const ready = paired >= minPaired;
  
  const reasons: string[] = [];
  const unlock: string[] = [];
  
  if (!ready) {
    reasons.push('Not enough paired pre/post surveys');
    const needed = minPaired - paired;
    unlock.push(`Add ${needed} more paired pre/post survey${needed > 1 ? 's' : ''}`);
  }
  
  const denominators = input.facts?.improved !== undefined && input.facts?.total !== undefined
    ? {
        improved: {
          num: input.facts.improved,
          den: input.facts.total,
        },
      }
    : undefined;
  
  return {
    ready,
    inputs: { paired, required: minPaired },
    denominators,
    reasons,
    unlock,
  };
}

/**
 * Evaluate Improvement Donut panel readiness
 */
function evaluateImprovementDonut(
  input: ReadinessInput,
  dataset: DatasetHealth,
  config: ReadinessConfig
): PanelReadiness {
  const minPaired = config.panels.improvementDonut.minPaired;
  const paired = dataset.pairedCount;
  const ready = paired >= minPaired;
  
  const reasons: string[] = [];
  const unlock: string[] = [];
  
  if (!ready) {
    reasons.push('Not enough paired pre/post surveys for distribution');
    const needed = minPaired - paired;
    unlock.push(`Add ${needed} more paired pre/post survey${needed > 1 ? 's' : ''}`);
  }
  
  const denominators = input.facts?.total !== undefined
    ? {
        distribution: {
          num: input.facts.total,
          den: input.facts.total,
        },
      }
    : undefined;
  
  return {
    ready,
    inputs: { paired, required: minPaired },
    denominators,
    reasons,
    unlock,
  };
}

/**
 * Evaluate Flourishing Grid panel readiness
 */
function evaluateFlourishingGrid(
  input: ReadinessInput,
  dataset: DatasetHealth,
  config: ReadinessConfig
): PanelReadiness {
  const minPaired = config.panels.flourishingGrid.minPaired;
  const paired = dataset.pairedCount;
  const maxNullRate = config.panels.flourishingGrid.maxNullRatePerItem;
  
  const reasons: string[] = [];
  const unlock: string[] = [];
  
  let ready = paired >= minPaired;
  
  if (!ready) {
    reasons.push('Not enough pre/post pairs for item-level change');
    const needed = minPaired - paired;
    unlock.push(`Add ${needed} more paired pre/post survey${needed > 1 ? 's' : ''}`);
  }
  
  // Check null rates per item
  if (input.facts?.itemLevelStats) {
    for (const [itemKey, stats] of Object.entries(input.facts.itemLevelStats)) {
      const nullRate = stats.total > 0 ? stats.nullCount / stats.total : 1;
      if (nullRate > maxNullRate) {
        ready = false;
        if (!reasons.includes('Some items have too many null values')) {
          reasons.push('Some items have too many null values');
          unlock.push('Improve data collection for incomplete survey items');
        }
        break;
      }
    }
  }
  
  return {
    ready,
    inputs: { paired, required: minPaired, maxNullRate },
    reasons,
    unlock,
  };
}

/**
 * Evaluate Key Themes panel readiness
 */
function evaluateKeyThemes(
  input: ReadinessInput,
  llm: LLMQuality,
  config: ReadinessConfig
): PanelReadiness {
  const minDocs = config.panels.keyThemes.minDocs;
  const minConfidence = config.panels.keyThemes.minConfidence;
  
  const docs = llm.sessionDocs;
  const avgConfidence = llm.avgConfidence;
  
  const reasons: string[] = [];
  const unlock: string[] = [];
  
  let ready = true;
  
  if (docs < minDocs) {
    ready = false;
    reasons.push('Not enough source documents');
    const needed = minDocs - docs;
    unlock.push(`Add ${needed} more session reflection${needed > 1 ? 's' : ''}`);
  }
  
  if (avgConfidence < minConfidence) {
    ready = false;
    reasons.push('LLM confidence below threshold');
    unlock.push('Improve transcript or reflection quality');
  }
  
  return {
    ready,
    inputs: { docs, requiredDocs: minDocs, avgConfidence, minConfidence },
    reasons,
    unlock,
  };
}

/**
 * Evaluate Key Areas & Challenges panel readiness
 */
function evaluateKeyAreasChallenges(
  input: ReadinessInput,
  llm: LLMQuality,
  privacy: PrivacyStatus,
  config: ReadinessConfig
): PanelReadiness {
  const minDocs = config.panels.keyAreasChallenges.minDocs;
  const minConfidence = config.panels.keyAreasChallenges.minConfidence;
  
  const docs = llm.sessionDocs;
  const avgConfidence = llm.avgConfidence;
  
  const reasons: string[] = [];
  const unlock: string[] = [];
  
  let ready = true;
  
  if (docs < minDocs) {
    ready = false;
    reasons.push('Not enough source documents');
    const needed = minDocs - docs;
    unlock.push(`Add ${needed} more session reflection${needed > 1 ? 's' : ''}`);
  }
  
  if (avgConfidence < minConfidence) {
    ready = false;
    reasons.push('LLM confidence below threshold');
    unlock.push('Improve transcript or reflection quality');
  }
  
  return {
    ready,
    inputs: { docs, requiredDocs: minDocs, avgConfidence, minConfidence },
    privacyChecked: true,
    reasons,
    unlock,
  };
}

/**
 * Evaluate Participant Reasons panel readiness
 */
function evaluateParticipantReasons(
  input: ReadinessInput,
  llm: LLMQuality,
  config: ReadinessConfig
): PanelReadiness {
  const reasons: string[] = [];
  const unlock: string[] = [];

  const hasAppReasons = input.reasons?.sessionsWithReasons && input.reasons.uniqueReasons ? input.reasons.sessionsWithReasons > 0 && input.reasons.uniqueReasons > 0 : false;

  if (hasAppReasons) {
    const sessionsWithReasons = input.reasons!.sessionsWithReasons;
    const uniqueReasons = input.reasons!.uniqueReasons;
    const ready = sessionsWithReasons >= (config.panels.participantReasons as any).minSessionsWithReasons && uniqueReasons >= (config.panels.participantReasons as any).minReasonsUnique;
    if (!ready) {
      if (sessionsWithReasons < (config.panels.participantReasons as any).minSessionsWithReasons) {
        reasons.push('Not enough participants with application reasons');
        unlock.push(`Collect application Q/A for ${((config.panels.participantReasons as any).minSessionsWithReasons - sessionsWithReasons)} more participant${(config.panels.participantReasons as any).minSessionsWithReasons - sessionsWithReasons > 1 ? 's' : ''}`);
      }
      if (uniqueReasons < (config.panels.participantReasons as any).minReasonsUnique) {
        reasons.push('Too few unique reason categories');
        unlock.push('Broaden application question prompts or categorize reasons');
      }
    }
    return {
      ready,
      inputs: { sessionsWithReasons, uniqueReasons, minSessions: (config.panels.participantReasons as any).minSessionsWithReasons, minUnique: (config.panels.participantReasons as any).minReasonsUnique },
      reasons,
      unlock,
    };
  }

  // Fallback to LLM docs if application reasons are absent
  const minDocs = (config.llm?.minDocuments ?? 5);
  const minConfidence = (config.llm?.minAvgConfidence ?? 0.6);
  const docs = llm.sessionDocs;
  const avgConfidence = llm.avgConfidence;

  let ready = true;
  if (docs < minDocs) {
    ready = false;
    reasons.push('Not enough source documents');
    const needed = minDocs - docs;
    unlock.push(`Add ${needed} more session reflection${needed > 1 ? 's' : ''}`);
  }
  if (avgConfidence < minConfidence) {
    ready = false;
    reasons.push('LLM confidence below threshold');
    unlock.push('Improve transcript or reflection quality');
  }
  return {
    ready,
    inputs: { docs, requiredDocs: minDocs, avgConfidence, minConfidence },
    reasons,
    unlock,
  };
}

/**
 * Evaluate Strengths & Improvements panel readiness
 */
function evaluateStrengthsImprovements(
  input: ReadinessInput,
  dataset: DatasetHealth,
  llm: LLMQuality,
  config: ReadinessConfig
): PanelReadiness {
  const minPaired = config.panels.strengthsImprovements.minPaired;
  const paired = dataset.pairedCount;
  
  const reasons: string[] = [];
  const unlock: string[] = [];
  
  let ready = paired >= minPaired;
  
  if (!ready) {
    reasons.push('Not enough paired surveys for delta analysis');
    const needed = minPaired - paired;
    unlock.push(`Add ${needed} more paired pre/post survey${needed > 1 ? 's' : ''}`);
  }
  
  // If LLM-enhanced, also check LLM gates
  const llmMinDocs = config.panels.strengthsImprovements.llmMinDocs;
  const llmMinConfidence = config.panels.strengthsImprovements.llmMinConfidence;
  
  if (llmMinDocs && llmMinConfidence) {
    if (llm.sessionDocs < llmMinDocs) {
      ready = false;
      reasons.push('Not enough LLM source documents for enhanced insights');
      const needed = llmMinDocs - llm.sessionDocs;
      unlock.push(`Add ${needed} more session reflection${needed > 1 ? 's' : ''} for AI insights`);
    }
    
    if (llm.avgConfidence < llmMinConfidence) {
      ready = false;
      reasons.push('LLM confidence below threshold for enhanced insights');
      unlock.push('Improve reflection quality for AI enhancement');
    }
  }
  
  return {
    ready,
    inputs: { paired, required: minPaired },
    reasons,
    unlock,
  };
}

/**
 * Evaluate Testimonials panel readiness
 */
function evaluateTestimonials(
  input: ReadinessInput,
  config: ReadinessConfig
): PanelReadiness {
  const minCount = config.panels.testimonials.minCount;
  const approvedTestimonials = input.testimonials?.filter(t => t.approved !== false) || [];
  const count = approvedTestimonials.length;
  
  const ready = count >= minCount;
  
  const reasons: string[] = [];
  const unlock: string[] = [];
  
  if (!ready) {
    reasons.push('Not enough approved testimonials');
    const needed = minCount - count;
    unlock.push(`Add ${needed} more approved testimonial${needed > 1 ? 's' : ''}`);
  }
  
  return {
    ready,
    inputs: { count, required: minCount },
    reasons,
    unlock,
  };
}

/**
 * Helper: Compute null rate across survey responses
 */
function computeNullRate(surveys: Array<{ responses: Record<string, unknown> }>): number {
  if (surveys.length === 0) return 0;
  
  let totalFields = 0;
  let nullFields = 0;
  
  for (const survey of surveys) {
    const responses = Object.values(survey.responses);
    totalFields += responses.length;
    nullFields += responses.filter(r => r === null || r === undefined || r === '').length;
  }
  
  return totalFields > 0 ? Math.round((nullFields / totalFields) * 100) / 100 : 0;
}

/**
 * Helper: Detect typedrift between pre and post surveys
 */
function detectTypedrift(
  pre: Array<{ responses: Record<string, unknown> }>,
  post: Array<{ responses: Record<string, unknown> }>
): boolean {
  if (pre.length === 0 || post.length === 0) return false;
  
  // Get all keys from both pre and post
  const preKeys = new Set<string>();
  const postKeys = new Set<string>();
  
  pre.forEach(s => Object.keys(s.responses).forEach(k => preKeys.add(k)));
  post.forEach(s => Object.keys(s.responses).forEach(k => postKeys.add(k)));
  
  // Check for type inconsistencies in shared keys
  const sharedKeys = Array.from(preKeys).filter(k => postKeys.has(k));
  
  for (const key of sharedKeys) {
    const preTypes = new Set(
      pre.map(s => typeof s.responses[key]).filter(t => t !== 'undefined')
    );
    const postTypes = new Set(
      post.map(s => typeof s.responses[key]).filter(t => t !== 'undefined')
    );
    
    // If there's no overlap in types, we have typedrift
    const hasOverlap = Array.from(preTypes).some(t => postTypes.has(t));
    if (!hasOverlap && preTypes.size > 0 && postTypes.size > 0) {
      return true;
    }
  }
  
  return false;
}

