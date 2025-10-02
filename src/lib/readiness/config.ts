/**
 * Readiness Configuration
 * 
 * Central configuration for all data quality gates, privacy rules, and minimum thresholds.
 * Update these values to adjust when dashboard panels render vs. show empty states.
 * 
 * All thresholds are deterministic and auditable.
 */

export interface ReadinessConfig {
  version: string;
  
  // Cohort-level minimums
  cohort: {
    minPairedSurveys: number;
    maxNullRatePre: number;
    maxNullRatePost: number;
  };
  
  // Panel-specific minimums
  panels: {
    overallImpact: {
      minPaired: number;
    };
    improvementDonut: {
      minPaired: number;
    };
    flourishingGrid: {
      minPaired: number;
      maxNullRatePerItem: number;
    };
    strengthsImprovements: {
      minPaired: number;
      llmMinDocs?: number;
      llmMinConfidence?: number;
    };
    keyThemes: {
      minDocs: number;
      minConfidence: number;
    };
    keyAreasChallenges: {
      minDocs: number;
      minConfidence: number;
    };
    participantReasons: {
      minReasonsUnique: number;
      minSessionsWithReasons: number;
    };
    testimonials: {
      minCount: number;
    };
  };
  
  // Privacy rules
  privacy: {
    minGroupSize: number;
    applyToSlices: boolean;
  };
  
  // LLM quality gates (global defaults)
  llm: {
    minDocuments: number;
    minAvgConfidence: number;
  };
}

/**
 * Default readiness configuration
 * 
 * These are production-grade defaults. Override specific values
 * by creating a custom config or via environment variables.
 */
export const DEFAULT_READINESS_CONFIG: ReadinessConfig = {
  version: 'readiness.v1',
  
  cohort: {
    minPairedSurveys: 10,
    maxNullRatePre: 0.15,  // 15% null rate tolerance
    maxNullRatePost: 0.15,
  },
  
  panels: {
    overallImpact: {
      minPaired: 10,
    },
    improvementDonut: {
      minPaired: 5,
    },
    flourishingGrid: {
      minPaired: 5,
      maxNullRatePerItem: 0.10,  // 10% null rate per item
    },
    strengthsImprovements: {
      minPaired: 5,
      llmMinDocs: 5,
      llmMinConfidence: 0.6,
    },
    keyThemes: {
      minDocs: 5,
      minConfidence: 0.6,
    },
    keyAreasChallenges: {
      minDocs: 5,
      minConfidence: 0.6,
    },
    participantReasons: {
      minReasonsUnique: 3,
      minSessionsWithReasons: 3,
    },
    testimonials: {
      minCount: 3,
    },
  },
  
  privacy: {
    minGroupSize: 3,
    applyToSlices: true,
  },
  
  llm: {
    minDocuments: 5,
    minAvgConfidence: 0.6,
  },
};

/**
 * Get readiness config with optional overrides
 * 
 * @param overrides - Partial config to merge with defaults
 * @returns Complete readiness configuration
 */
export function getReadinessConfig(
  overrides?: Partial<ReadinessConfig>
): ReadinessConfig {
  if (!overrides) {
    return DEFAULT_READINESS_CONFIG;
  }
  
  return {
    ...DEFAULT_READINESS_CONFIG,
    ...overrides,
    cohort: {
      ...DEFAULT_READINESS_CONFIG.cohort,
      ...overrides.cohort,
    },
    panels: {
      ...DEFAULT_READINESS_CONFIG.panels,
      ...overrides.panels,
      overallImpact: {
        ...DEFAULT_READINESS_CONFIG.panels.overallImpact,
        ...overrides.panels?.overallImpact,
      },
      improvementDonut: {
        ...DEFAULT_READINESS_CONFIG.panels.improvementDonut,
        ...overrides.panels?.improvementDonut,
      },
      flourishingGrid: {
        ...DEFAULT_READINESS_CONFIG.panels.flourishingGrid,
        ...overrides.panels?.flourishingGrid,
      },
      strengthsImprovements: {
        ...DEFAULT_READINESS_CONFIG.panels.strengthsImprovements,
        ...overrides.panels?.strengthsImprovements,
      },
      keyThemes: {
        ...DEFAULT_READINESS_CONFIG.panels.keyThemes,
        ...overrides.panels?.keyThemes,
      },
      keyAreasChallenges: {
        ...DEFAULT_READINESS_CONFIG.panels.keyAreasChallenges,
        ...overrides.panels?.keyAreasChallenges,
      },
      participantReasons: {
        ...DEFAULT_READINESS_CONFIG.panels.participantReasons,
        ...overrides.panels?.participantReasons,
      },
      testimonials: {
        ...DEFAULT_READINESS_CONFIG.panels.testimonials,
        ...overrides.panels?.testimonials,
      },
    },
    privacy: {
      ...DEFAULT_READINESS_CONFIG.privacy,
      ...overrides.privacy,
    },
    llm: {
      ...DEFAULT_READINESS_CONFIG.llm,
      ...overrides.llm,
    },
  };
}

