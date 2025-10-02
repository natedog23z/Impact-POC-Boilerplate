# Readiness System (v2) - Implementation Summary

## What Was Built

A complete deterministic gating system for Gloo Impact dashboards that ensures components only render when data meets minimum quality thresholds. The system is **flexible**, **auditable**, and **privacy-safe**.

## Key Features ✅

### 1. Flexible Configuration System
- **Location**: `src/lib/readiness/config.ts`
- All gate thresholds centralized in one place
- Easy to adjust via overrides or environment variables
- Supports cohort-level, panel-specific, privacy, and LLM gates
- Default values are production-grade but easily customizable

### 2. Deterministic Evaluator
- **Location**: `src/lib/readiness/evaluator.ts`
- Evaluates dataset health (paired surveys, null rates, typedrift)
- Checks LLM quality (document count, confidence thresholds)
- Enforces privacy rules (small-n suppression)
- Computes panel-specific readiness for all dashboard cards
- Returns structured reasons and unlock steps

### 3. TypeScript Types
- **Location**: `src/lib/readiness/types.ts`
- Complete type safety for readiness inputs and outputs
- `ReadinessResult` includes dataset, LLM, privacy, and panel status
- `PanelReadiness` provides ready flag, inputs, denominators, reasons, and unlock steps

### 4. Integration Layer
- **Location**: `src/lib/reduce/build-cohort-facts-with-readiness.ts`
- Wraps existing `buildCohortFacts()` pipeline
- Returns both normalized facts AND readiness evaluation
- Extracts survey data, session docs, testimonials, and groups
- Computes denominators for all percentages

### 5. UI Components
- **`PanelGate`** (`src/components/readiness/PanelGate.tsx`)
  - Wraps dashboard cards
  - Renders card when ready, empty state when not
  - Single source of truth for rendering logic

- **`EmptyState`** (`src/components/readiness/EmptyState.tsx`)
  - Beautiful, informative empty states
  - Shows reasons and unlock steps
  - Includes debug mode for development

- **`Percent`** (`src/components/readiness/Percent.tsx`)
  - Forces explicit denominators for all percentages
  - Multiple display formats (inline, stacked, full)
  - Refuses to render without valid denominator

- **`InferredBadge`** (`src/components/readiness/Percent.tsx`)
  - Marks LLM-inferred content
  - Shows confidence score and source count
  - Tooltip with details

### 6. API Example
- **Location**: `src/app/api/cohort-facts/route.ts`
- Returns `{ facts, readiness, meta }`
- Supports config overrides via query params
- Shows proper error handling

### 7. Dashboard Example
- **Location**: `src/app/dashboard/example-gated/page.tsx`
- Complete reference implementation
- Shows readiness summary banner
- Demonstrates PanelGate usage for multiple cards
- Includes data quality notes display

### 8. Enhanced Dashboard Card
- **Location**: `src/components/dashboard/OverallImpactCardGated.tsx`
- Example of card with readiness integration
- Shows denominators using `Percent` component
- Displays LLM badges when content is inferred

### 9. Comprehensive Documentation
- **Location**: `docs/readiness-system.md`
- Complete guide with examples
- Configuration reference
- Integration patterns
- Best practices
- Extension guide

## Default Gates (Easily Adjustable)

```typescript
// All configurable in src/lib/readiness/config.ts

Cohort-level:
  - minPairedSurveys: 10
  - maxNullRatePre/Post: 15%

Panel-specific:
  - overallImpact: 10 paired
  - improvementDonut: 5 paired
  - flourishingGrid: 5 paired, ≤10% null per item
  - keyThemes: 5 docs, 60% confidence
  - keyAreasChallenges: 5 docs, 60% confidence
  - participantReasons: 5 docs, 60% confidence
  - strengthsImprovements: 5 paired (+ optional LLM gates)
  - testimonials: 3 approved

Privacy:
  - minGroupSize: 3 (small-n suppression)
  - applyToSlices: true

LLM:
  - minDocuments: 5
  - minAvgConfidence: 0.6 (60%)
```

## How to Use

### Quick Start

1. **Fetch data with readiness**:
   ```typescript
   import { buildCohortFactsWithReadiness } from '@/lib/reduce/build-cohort-facts-with-readiness';
   
   const result = buildCohortFactsWithReadiness(sessions);
   // result.facts: normalized cohort facts
   // result.readiness: gate evaluations
   ```

2. **Wrap dashboard cards**:
   ```tsx
   import { PanelGate } from '@/components/readiness/PanelGate';
   
   <PanelGate panelId="overallImpact" readiness={readiness.panels.overallImpact}>
     <OverallImpactCard {...props} />
   </PanelGate>
   ```

3. **Display percentages**:
   ```tsx
   import { Percent } from '@/components/readiness/Percent';
   
   <Percent num={49} den={76} label="Participants improved" format="inline" />
   // Renders: "Participants improved: 49/76 (64%)"
   ```

### Adjusting Gates

**Option 1: Edit defaults** in `src/lib/readiness/config.ts`:
```typescript
export const DEFAULT_READINESS_CONFIG = {
  panels: {
    overallImpact: {
      minPaired: 15,  // Changed from 10
    },
  },
};
```

**Option 2: Pass overrides**:
```typescript
const result = buildCohortFactsWithReadiness(sessions, {
  readinessConfig: {
    panels: {
      overallImpact: { minPaired: 5 },  // Temporary override
    },
  },
});
```

**Option 3: Query params** (for testing):
```typescript
fetch('/api/cohort-facts?minPaired=5')
```

## File Structure

```
src/lib/readiness/
├── config.ts           # All gate thresholds (EDIT HERE)
├── types.ts            # TypeScript definitions
├── evaluator.ts        # Core evaluation logic
└── index.ts            # Exports

src/lib/reduce/
└── build-cohort-facts-with-readiness.ts  # Integration wrapper

src/components/readiness/
├── PanelGate.tsx       # Conditional rendering wrapper
├── EmptyState.tsx      # Empty state UI
├── Percent.tsx         # Percentage + denominator component
└── index.ts            # Exports

src/app/api/cohort-facts/
└── route.ts            # Example API endpoint

src/app/dashboard/example-gated/
└── page.tsx            # Complete reference implementation

src/components/dashboard/
└── OverallImpactCardGated.tsx  # Example enhanced card

docs/
└── readiness-system.md  # Full documentation
```

## What This Solves

✅ **No more rendering metrics without sufficient data**
- Empty states show exactly what's needed to unlock each panel

✅ **All percentages include denominators**
- `Percent` component enforces transparency: "49/76 (64%)"

✅ **LLM content is clearly marked**
- `InferredBadge` shows confidence and source count

✅ **Privacy-safe by default**
- Small groups (n<3) suppressed server-side automatically

✅ **Deterministic and auditable**
- Every readiness result includes config version and timestamp

✅ **Easy to refine gates**
- Single config file, deep merge for overrides, no code changes needed

## Next Steps

### To integrate into existing dashboards:

1. **Update API routes** to use `buildCohortFactsWithReadiness()` instead of `buildCohortFacts()`

2. **Wrap existing cards** with `<PanelGate>`:
   ```tsx
   <PanelGate panelId="..." readiness={readiness.panels[...]}>
     <ExistingCard />
   </PanelGate>
   ```

3. **Replace percentage displays** with `<Percent>` component

4. **Add LLM badges** to inferred content using `<InferredBadge>`

5. **Test empty states** by adjusting thresholds to trigger them

### To add new panel gates:

See "Extending the System" in `docs/readiness-system.md`

## Testing

View the example dashboard at `/dashboard/example-gated` once you have session data.

To test with insufficient data, temporarily lower thresholds:
```typescript
// In config.ts
minPaired: 1,  // Will pass with just 1 paired survey
```

## Questions?

- See `docs/readiness-system.md` for complete documentation
- Check `src/app/dashboard/example-gated/page.tsx` for reference implementation
- All thresholds are in `src/lib/readiness/config.ts` with comments

---

**Branch**: `v2`
**Status**: ✅ Complete and ready for integration
**Linter**: ✅ No errors

