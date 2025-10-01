export type QA = {
  key: string;
  label: string;
  answer?: string | number;
};

export type ApplicantSurveyMilestone = {
  type: 'Applicant Survey';
  title: string;
  description?: string;
  completedAt?: string;
  // Legacy parsed format
  qa?: QA[];
  // Canonical footer format
  answers?: Record<string, number | string | null>;
};

export type MeetingMilestone = {
  type: 'Meeting';
  title: string;
  description?: string;
  completedAt?: string;
  // Legacy fields
  schedulingLink?: string;
  details?: string;
  // Canonical footer format
  meeting?: {
    with?: string;
    details?: string;
    schedulingLink?: string;
  };
};

export type OutcomeNoteMilestone = {
  type: 'Outcome Note';
  title: string;
  description?: string;
  completedAt?: string;
  markdownOutcome: {
    date?: string;
    focus?: string | string[];
    notes?: string | string[];
    plan?: string[];
  };
};

export type ReflectionMilestone = {
  type: 'Reflection';
  title: string;
  description?: string;
  completedAt?: string;
  // Legacy
  text?: string;
  // Canonical footer format
  reflection?: {
    text?: string;
  };
};

export type OnlineActivityMilestone = {
  type: 'Online Activity';
  title: string;
  description?: string;
  completedAt?: string;
  // Legacy
  activityLink?: string;
  // Canonical footer format
  activity?: {
    link?: string;
  };
};

export type Milestone =
  | ApplicantSurveyMilestone
  | MeetingMilestone
  | OutcomeNoteMilestone
  | ReflectionMilestone
  | OnlineActivityMilestone;

export type RawSession = {
  rawSchemaVersion: 'v1';
  generatorVersion: string;
  seed: string | number;
  sessionId: string;
  programId: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  demographics?: Record<string, string>;
  application?: {
    reasons?: string[];
    challenges?: string[];
  };
  milestones: Milestone[];
};

export type ParsedSession = {
  markdown: string;
  rawSession: RawSession;
  parsePath: 'json' | 'md';
  needsManualFix?: boolean;
};

export type GenerationLogEntry = {
  idx: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  omittedPct: number;
  parsePath: 'json' | 'md';
  retried: boolean;
  needsManualFix: boolean;
};
