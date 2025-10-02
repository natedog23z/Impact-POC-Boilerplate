import type { RawSession } from '@/lib/mock-sessions/types';

export type AgeBucketLabel = '<18' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';

export type DemographicsSummary = {
  ageBuckets: Array<{ label: AgeBucketLabel; count: number }>;
  genderCounts: Record<string, number>;
  total: number;
};

const AGE_BUCKETS: Array<{ label: AgeBucketLabel; min: number; max?: number }> = [
  { label: '<18', min: 0, max: 17 },
  { label: '18-24', min: 18, max: 24 },
  { label: '25-34', min: 25, max: 34 },
  { label: '35-44', min: 35, max: 44 },
  { label: '45-54', min: 45, max: 54 },
  { label: '55-64', min: 55, max: 64 },
  { label: '65+', min: 65, max: undefined },
];

export function aggregateDemographics(sessions: RawSession[], now: Date = new Date()): DemographicsSummary {
  const currentYear = now.getFullYear();

  const ageCounts = new Map<AgeBucketLabel, number>();
  for (const b of AGE_BUCKETS) ageCounts.set(b.label, 0);

  const genderCounts = new Map<string, number>();

  let total = 0;

  for (const s of sessions) {
    const demo = s.demographics || {};
    const birthYearRaw = demo['Birth Year'];
    const genderRaw = demo['Gender'];

    // Age bucketing (when we have a valid birth year)
    const yr = typeof birthYearRaw === 'string' ? parseInt(birthYearRaw.trim(), 10) : Number(birthYearRaw);
    if (Number.isFinite(yr) && yr > 1900 && yr <= currentYear) {
      const age = currentYear - yr;
      const bucket = AGE_BUCKETS.find((b) => age >= b.min && (b.max === undefined || age <= b.max));
      if (bucket) {
        ageCounts.set(bucket.label, (ageCounts.get(bucket.label) || 0) + 1);
      }
    }

    // Gender bucketing (always try to count something even if unknown)
    const genderKey = normalizeGender(genderRaw);
    genderCounts.set(genderKey, (genderCounts.get(genderKey) || 0) + 1);

    total += 1;
  }

  return {
    ageBuckets: AGE_BUCKETS.map((b) => ({ label: b.label, count: ageCounts.get(b.label) || 0 })),
    genderCounts: Object.fromEntries(genderCounts),
    total,
  };
}

function normalizeGender(value: unknown): 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say' | 'Other/Unknown' {
  if (!value) return 'Other/Unknown';
  const v = String(value).trim().toLowerCase();
  if (['female', 'f', 'woman', 'w'].includes(v)) return 'Female';
  if (['male', 'm', 'man'].includes(v)) return 'Male';
  if (['non-binary', 'nonbinary', 'nb', 'genderqueer', 'gender nonconforming'].includes(v)) return 'Non-binary';
  if (['prefer not to say', 'na', 'n/a', 'none', 'prefer-not-to-say'].includes(v)) return 'Prefer not to say';
  return 'Other/Unknown';
}


