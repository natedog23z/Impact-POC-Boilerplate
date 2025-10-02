# Readiness System Documentation

## Overview

The Readiness System is a deterministic gating pipeline that ensures Gloo Impact dashboards remain **defensible**, **privacy-safe**, and **transparent** by only rendering components when data meets clear minimum thresholds.

## Key Principles

1. **Deterministic**: All gates use fixed thresholds with no randomness
2. **Defensible**: Every metric includes explicit denominators
3. **Privacy-Safe**: Suppresses small groups (n < 3 by default)
4. **Transparent**: Shows clear unlock steps when data is insufficient
5. **Auditable**: Includes configuration version and evaluation timestamp

## Architecture

```
┌─────────────────┐
│  Session Data   │
└────────┬────────┘
         │
         v
┌─────────────────────────────────┐
│  build-cohort-facts-with-       │
│  readiness()                    │
├─────────────────────────────────┤
│ • Builds normalized facts       │
│ • Evaluates readiness           │
│ • Checks privacy rules          │
│ • Computes denominators         │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│  API Response                   │
├─────────────────────────────────┤
│ {                               │
│   facts: CohortFacts,           │
│   readiness: ReadinessResult    │
│ }                               │
└────────┬────────────────────────┘
         │
         v
┌─────────────────────────────────┐
│  UI Layer                       │
├─────────────────────────────────┤
│ • PanelGate wrapper             │
│ • Renders card OR empty state   │
│ • Shows denominators            │
│ • Displays LLM badges           │
└─────────────────────────────────┘
```

## Configuration

All thresholds are centralized in `src/lib/readiness/config.ts`:

```typescript
export const DEFAULT_READINESS_CONFIG = {
  version: 'readiness.v1',
  
  cohort: {
    minPairedSurveys: 10,      // Minimum paired pre/post surveys
    maxNullRatePre: 0.15,      // 15% null tolerance
    maxNullRatePost: 0.15,
  },
  
  panels: {
    overallImpact: {
      minPaired: 10,           // Minimum for overall impact
    },
    improvementDonut: {
      minPaired: 5,            // Minimum for distribution
    },
    flourishingGrid: {
      minPaired: 5,
      maxNullRatePerItem: 0.10, // 10% null per item
    },
    keyThemes: {
      minDocs: 5,              // Minimum LLM source docs
      minConfidence: 0.6,      // 60% minimum confidence
    },
    testimonials: {
      minCount: 3,             // Minimum approved testimonials
    },
  },
  
  privacy: {
    minGroupSize: 3,           // Small-n suppression threshold
    applyToSlices: true,
  },
  
  llm: {
    minDocuments: 5,
    minAvgConfidence: 0.6,
  },
};
```

### Changing Thresholds

To adjust gates, edit `DEFAULT_READINESS_CONFIG` or pass overrides:

```typescript
const result = buildCohortFactsWithReadiness(sessions, {
  programId: 'xyz',
  readinessConfig: {
    panels: {
      overallImpact: {
        minPaired: 15,  // Override: require 15 instead of 10
      },
    },
  },
});
```

## Panel-Specific Gates

### Overall Impact Card
- **Requirement**: `minPaired >= 10` paired pre/post surveys
- **Denominators**: Shows `improved/total (x%)`
- **Empty State**: "Add N more paired pre/post surveys"

### Improvement Donut Card
- **Requirement**: `minPaired >= 5`
- **Denominators**: Always shows total denominator
- **Empty State**: "Add N more paired pre/post surveys"

### Flourishing Outcomes Grid
- **Requirements**: 
  - `minPaired >= 5`
  - `nullRate <= 10%` per item
  - No typedrift
- **Empty State**: "Improve data collection for incomplete survey items"

### Key Themes / Key Areas & Challenges / Participant Reasons
- **Requirements**:
  - `minDocs >= 5` session documents
  - `avgConfidence >= 0.6` (60%)
- **Badges**: Shows "Inferred" badge with confidence and source count
- **Empty State**: "Add N more session reflections" + "Improve transcript quality"

### Strengths & Improvements Card
- **Requirements**:
  - `minPaired >= 5` for survey-based
  - Optional LLM enhancement gates (docs + confidence)
- **Empty State**: Shows both survey and LLM requirements if applicable

### Testimonials Card
- **Requirement**: `minCount >= 3` approved testimonials
- **Empty State**: "Add N more approved testimonials"

## Privacy Rules

### Small-N Suppression
Groups with fewer than `minGroupSize` (default: 3) participants are:
1. **Suppressed server-side** (never sent to client)
2. **Listed in `readiness.privacy.groupsSuppressed`** for transparency
3. **Applied to all slices** (age, campus, demographics, etc.)

Example:
```json
{
  "privacy": {
    "smallNThreshold": 3,
    "groupsSuppressed": ["age:18-24", "campus:B"],
    "ready": true
  }
}
```

## Readiness Response Format

The API returns a compact readiness object:

```json
{
  "version": "readiness.v1",
  "evaluatedAt": "2025-10-02T12:34:56Z",
  "config": { /* complete config used */ },
  
  "dataset": {
    "participants": 124,
    "preCount": 110,
    "postCount": 92,
    "pairedCount": 76,
    "hasTypedrift": false,
    "nullRatePre": 0.03,
    "nullRatePost": 0.04
  },
  
  "llm": {
    "sessionDocs": 58,
    "avgConfidence": 0.71,
    "meetsDocMinimum": true,
    "meetsConfidenceMinimum": true
  },
  
  "privacy": {
    "smallNThreshold": 3,
    "groupsSuppressed": [],
    "ready": true
  },
  
  "panels": {
    "overallImpact": {
      "ready": true,
      "inputs": { "paired": 76, "required": 10 },
      "denominators": {
        "improved": { "num": 49, "den": 76 }
      },
      "reasons": [],
      "unlock": []
    },
    "keyThemes": {
      "ready": false,
      "inputs": { "docs": 3, "requiredDocs": 5, "avgConfidence": 0.58, "minConfidence": 0.6 },
      "reasons": ["Not enough source documents", "LLM confidence below threshold"],
      "unlock": ["Add 2 more session reflections", "Improve transcript quality"]
    }
  }
}
```

## UI Integration

### Using PanelGate

Wrap any dashboard card with `PanelGate`:

```tsx
import { PanelGate } from '@/components/readiness/PanelGate';

<PanelGate
  panelId="overallImpact"
  readiness={readiness.panels.overallImpact}
  className="min-h-[220px]"
>
  <OverallImpactCard {...props} />
</PanelGate>
```

If `ready: false`, shows an empty state with:
- Reasons why the panel isn't ready
- Actionable unlock steps
- Current vs. required inputs (in dev mode)

### Displaying Percentages

Always use the `Percent` component for transparency:

```tsx
import { Percent } from '@/components/readiness/Percent';

// Inline format: "49/76 (64%)"
<Percent num={49} den={76} label="Participants improved" format="inline" />

// Stacked format: Big % on top, fraction below
<Percent num={49} den={76} format="stacked" />

// Full format: "49 out of 76 participants (64%)"
<Percent num={49} den={76} label="participants" format="full" />
```

### LLM-Inferred Content Badge

Show when content is AI-inferred:

```tsx
import { InferredBadge } from '@/components/readiness/Percent';

<InferredBadge
  confidence={0.71}
  sourceCount={58}
/>
```

Displays as: **Inferred (58)** with tooltip showing confidence.

## API Usage

### Fetch Cohort Facts with Readiness

```typescript
const response = await fetch('/api/cohort-facts?programId=xyz');
const { facts, readiness, meta } = await response.json();

// Check if a panel is ready
if (readiness.panels.overallImpact.ready) {
  // Render the card
  const { num, den } = readiness.panels.overallImpact.denominators.improved;
  // ...
} else {
  // Show empty state with unlock steps
  console.log(readiness.panels.overallImpact.unlock);
}
```

### Override Gates via Query Params

```typescript
// Temporarily lower the threshold for testing
const response = await fetch('/api/cohort-facts?minPaired=5');
```

## Server-Side Integration

### In Reduce Pipeline

```typescript
import { buildCohortFactsWithReadiness } from '@/lib/reduce/build-cohort-facts-with-readiness';

const result = buildCohortFactsWithReadiness(sessions, {
  programId: 'abc-123',
  readinessConfig: {
    panels: {
      overallImpact: { minPaired: 15 },
    },
  },
});

// result.facts: CohortFacts
// result.readiness: ReadinessResult
```

### In API Routes

```typescript
import { buildCohortFactsWithReadiness } from '@/lib/reduce/build-cohort-facts-with-readiness';

export async function GET(request: NextRequest) {
  const sessions = await fetchSessions();
  const result = buildCohortFactsWithReadiness(sessions);
  
  return NextResponse.json({
    facts: result.facts,
    readiness: result.readiness,
  });
}
```

## Example: Complete Dashboard Integration

See `src/app/dashboard/example-gated/page.tsx` for a full reference implementation showing:
1. Fetching cohort facts + readiness
2. Displaying a readiness summary banner
3. Wrapping each card with `PanelGate`
4. Showing denominators and LLM badges
5. Displaying data quality notes

## Testing & Development

### Debug Mode

In development, empty states show a debug section with inputs:

```
Debug: View inputs
{
  "paired": 4,
  "required": 5
}
```

### Adjusting Gates for Testing

Create a custom config to test edge cases:

```typescript
const testConfig = {
  panels: {
    overallImpact: { minPaired: 1 },  // Lower threshold for testing
  },
};

const result = buildCohortFactsWithReadiness(sessions, {
  readinessConfig: testConfig,
});
```

## Best Practices

1. **Always use `PanelGate`**: Never conditionally render cards without it
2. **Always use `Percent`**: Never compute percentages client-side
3. **Show LLM badges**: Be transparent about inferred content
4. **Log readiness decisions**: Include in server logs for auditing
5. **Test empty states**: Verify unlock steps are actionable
6. **Privacy-first**: Trust the server-side suppression; never bypass it

## Extending the System

### Adding a New Panel Gate

1. **Add config** in `src/lib/readiness/config.ts`:
   ```typescript
   panels: {
     myNewPanel: {
       minPaired: 5,
       // other thresholds
     },
   }
   ```

2. **Add evaluator function** in `src/lib/readiness/evaluator.ts`:
   ```typescript
   function evaluateMyNewPanel(input, dataset, config): PanelReadiness {
     // Check thresholds
     // Return { ready, inputs, denominators, reasons, unlock }
   }
   ```

3. **Add to panels result** in `evaluateReadiness()`:
   ```typescript
   panels: {
     myNewPanel: evaluateMyNewPanel(input, dataset, config),
   }
   ```

4. **Update types** in `src/lib/readiness/types.ts`:
   ```typescript
   panels: {
     myNewPanel: PanelReadiness;
   }
   ```

5. **Use in UI** with `PanelGate`:
   ```tsx
   <PanelGate panelId="myNewPanel" readiness={readiness.panels.myNewPanel}>
     <MyNewPanelCard {...props} />
   </PanelGate>
   ```

### Adding New Privacy Rules

Edit `evaluatePrivacy()` in `src/lib/readiness/evaluator.ts` to add additional suppression logic (e.g., geographic restrictions, sensitive categories).

## Files Reference

- **Configuration**: `src/lib/readiness/config.ts`
- **Types**: `src/lib/readiness/types.ts`
- **Evaluator**: `src/lib/readiness/evaluator.ts`
- **Integration**: `src/lib/reduce/build-cohort-facts-with-readiness.ts`
- **UI Components**:
  - `src/components/readiness/PanelGate.tsx`
  - `src/components/readiness/EmptyState.tsx`
  - `src/components/readiness/Percent.tsx`
- **API Example**: `src/app/api/cohort-facts/route.ts`
- **Dashboard Example**: `src/app/dashboard/example-gated/page.tsx`

## Support & Questions

For questions or to propose changes to gates, refer to:
- This documentation
- The configuration file comments
- The example gated dashboard implementation

