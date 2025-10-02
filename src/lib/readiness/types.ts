/**
 * Readiness Types
 * 
 * Type definitions for the readiness system that gates dashboard component rendering.
 */

import { ReadinessConfig } from './config';

/**
 * Readiness check result for a single panel
 */
export interface PanelReadiness {
  ready: boolean;
  inputs: Record<string, number | string | boolean>;
  denominators?: Record<string, { num: number; den: number }>;
  reasons: string[];
  unlock: string[];
  privacyChecked?: boolean;
}

/**
 * Dataset health metrics
 */
export interface DatasetHealth {
  participants: number;
  preCount: number;
  postCount: number;
  pairedCount: number;
  hasTypedrift: boolean;
  nullRatePre: number;
  nullRatePost: number;
}

/**
 * LLM quality metrics
 */
export interface LLMQuality {
  sessionDocs: number;
  avgConfidence: number;
  meetsDocMinimum: boolean;
  meetsConfidenceMinimum: boolean;
}

/**
 * Privacy compliance status
 */
export interface PrivacyStatus {
  smallNThreshold: number;
  groupsSuppressed: string[];
  ready: boolean;
}

/**
 * Complete readiness evaluation result
 */
export interface ReadinessResult {
  version: string;
  evaluatedAt: string;
  config: ReadinessConfig;
  dataset: DatasetHealth;
  llm: LLMQuality;
  privacy: PrivacyStatus;
  panels: {
    overallImpact: PanelReadiness;
    improvementDonut: PanelReadiness;
    flourishingGrid: PanelReadiness;
    keyThemes: PanelReadiness;
    keyAreasChallenges: PanelReadiness;
    participantReasons: PanelReadiness;
    strengthsImprovements: PanelReadiness;
    testimonials: PanelReadiness;
  };
}

/**
 * Input data for readiness evaluation
 */
export interface ReadinessInput {
  // Survey data
  surveys?: {
    pre: Array<{ participantId: string; responses: Record<string, unknown> }>;
    post: Array<{ participantId: string; responses: Record<string, unknown> }>;
  };
  
  // Session/reflection documents
  sessionDocs?: Array<{
    id: string;
    content: string;
    confidence?: number;
  }>;
  
  // Testimonials
  testimonials?: Array<{
    id: string;
    content: string;
    approved?: boolean;
  }>;
  
  // Demographics/groups for privacy checking
  groups?: Record<string, Array<{ groupId: string; participantIds: string[] }>>;
  
  // Pre-computed facts (for denominators)
  facts?: {
    improved?: number;
    total?: number;
    distribution?: Record<string, number>;
    itemLevelStats?: Record<string, { nullCount: number; total: number }>;
  };
}

/**
 * Denominator data for percentages
 */
export interface Denominator {
  num: number;
  den: number;
  label?: string;
}

