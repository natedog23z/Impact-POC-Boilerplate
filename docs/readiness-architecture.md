# Readiness System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     RAW SESSION DATA                            │
├─────────────────────────────────────────────────────────────────┤
│  • Pre/Post Surveys (paired/unpaired)                           │
│  • Session Documents & Reflections                              │
│  • Testimonials/Quotes                                          │
│  • Demographics/Groups                                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           buildCohortFactsWithReadiness()                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐      ┌────────────────────────┐      │
│  │  buildCohortFacts() │      │  evaluateReadiness()   │      │
│  ├─────────────────────┤      ├────────────────────────┤      │
│  │ • Aggregate data    │      │ • Check dataset health │      │
│  │ • Compute means     │      │ • Evaluate LLM quality │      │
│  │ • Build tags        │      │ • Apply privacy rules  │      │
│  │ • Pick quotes       │      │ • Test panel gates     │      │
│  └──────────┬──────────┘      │ • Compute denominators │      │
│             │                 └────────┬───────────────┘      │
│             │                          │                       │
│             └──────────┬───────────────┘                       │
│                        ▼                                       │
│              ┌──────────────────┐                              │
│              │  Merged Result   │                              │
│              └──────────────────┘                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API RESPONSE                                 │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    facts: {                      readiness: {                  │
│      programId,                    version,                    │
│      nSessions,                    evaluatedAt,                │
│      nWithPrePost,                 config,                     │
│      assessments[],                dataset: { ... },           │
│      topThemes[],                  llm: { ... },               │
│      topChallenges[],              privacy: { ... },           │
│      exemplarQuotes[],             panels: {                   │
│      ...                             overallImpact: {          │
│    },                                  ready: true,            │
│                                        inputs: {...},          │
│    meta: {                             denominators: {...},    │
│      timestamp,                        reasons: [],            │
│      programId,                        unlock: []              │
│      sessionCount                    },                        │
│    }                                 ...                       │
│  }                                 }                           │
│                                  }                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD UI                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  For each panel:                                                │
│                                                                 │
│  ┌────────────────────────────────────────────────┐            │
│  │           PanelGate Component                  │            │
│  ├────────────────────────────────────────────────┤            │
│  │                                                │            │
│  │  if (readiness.panels[id].ready) {             │            │
│  │    ┌───────────────────────────────┐           │            │
│  │    │    Render Dashboard Card      │           │            │
│  │    ├───────────────────────────────┤           │            │
│  │    │ • Show metrics                │           │            │
│  │    │ • Display with <Percent>      │           │            │
│  │    │ • Add <InferredBadge>         │           │            │
│  │    └───────────────────────────────┘           │            │
│  │  } else {                                      │            │
│  │    ┌───────────────────────────────┐           │            │
│  │    │    EmptyState Component       │           │            │
│  │    ├───────────────────────────────┤           │            │
│  │    │ • Show reasons[]              │           │            │
│  │    │ • Display unlock[] steps      │           │            │
│  │    │ • Debug: show inputs          │           │            │
│  │    └───────────────────────────────┘           │            │
│  │  }                                             │            │
│  │                                                │            │
│  └────────────────────────────────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Readiness Evaluation Pipeline

```
┌───────────────────────────────────────────────────────────┐
│              evaluateReadiness(input, config)             │
└────────────────────┬──────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌─────────────┐ ┌─────────┐ ┌──────────┐
│   Dataset   │ │   LLM   │ │ Privacy  │
│   Health    │ │ Quality │ │  Status  │
├─────────────┤ ├─────────┤ ├──────────┤
│ • paired    │ │ • docs  │ │ • groups │
│ • nulls     │ │ • conf  │ │ • n<3    │
│ • typedrift │ │         │ │          │
└─────┬───────┘ └────┬────┘ └────┬─────┘
      │              │           │
      └──────────────┼───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   Per-Panel Checks     │
        └────────────────────────┘
                     │
        ┌────────────┼────────────┬───────────┬──────────┐
        │            │            │           │          │
        ▼            ▼            ▼           ▼          ▼
┌─────────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐
│ Overall     │ │Donut   │ │Flourish │ │Key       │ │Testim. │
│ Impact      │ │Chart   │ │Grid     │ │Themes    │ │        │
├─────────────┤ ├────────┤ ├─────────┤ ├──────────┤ ├────────┤
│paired >= 10?│ │≥5?     │ │≥5 +     │ │docs ≥ 5? │ │count   │
│             │ │        │ │null OK? │ │conf≥0.6? │ │≥ 3?    │
└──────┬──────┘ └───┬────┘ └────┬────┘ └─────┬────┘ └───┬────┘
       │            │           │            │          │
       ▼            ▼           ▼            ▼          ▼
┌───────────────────────────────────────────────────────────┐
│              PanelReadiness Results                       │
├───────────────────────────────────────────────────────────┤
│  Each contains:                                           │
│  • ready: boolean                                         │
│  • inputs: { paired, required, ... }                      │
│  • denominators: { improved: {num, den}, ... }            │
│  • reasons: string[]                                      │
│  • unlock: string[]                                       │
└───────────────────────────────────────────────────────────┘
```

## Configuration Override Flow

```
┌──────────────────────────────┐
│  DEFAULT_READINESS_CONFIG    │
│  (src/lib/readiness/config)  │
└───────────────┬──────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  getReadinessConfig(overrides?)       │
├───────────────────────────────────────┤
│  Deep merge with overrides            │
└───────────────┬───────────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Code    │ │  API    │ │  Env    │
│Override │ │ Params  │ │  Vars   │
├─────────┤ ├─────────┤ ├─────────┤
│ Pass to │ │?minPair │ │process. │
│function │ │=5       │ │env      │
└─────────┘ └─────────┘ └─────────┘
```

## Data Flow: Survey to Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  1. Raw Survey Data                                        │
│     pre: [{ participantId: '1', responses: {...} }]        │
│     post: [{ participantId: '1', responses: {...} }]       │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  2. Extract & Validate                                     │
│     • Find paired participants                             │
│     • Compute null rates                                   │
│     • Detect typedrift                                     │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  3. Dataset Health Metrics                                 │
│     participants: 124                                      │
│     pairedCount: 76                                        │
│     nullRatePre: 0.03                                      │
│     hasTypedrift: false                                    │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  4. Gate Evaluation                                        │
│     if (pairedCount >= config.minPaired)                   │
│       ready = true                                         │
│     else                                                   │
│       reasons = ['Not enough paired surveys']              │
│       unlock = ['Add N more paired pre/post surveys']      │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  5. UI Rendering Decision                                  │
│     <PanelGate readiness={...}>                            │
│       {ready ? <Card /> : <EmptyState />}                  │
│     </PanelGate>                                           │
└────────────────────────────────────────────────────────────┘
```

## Privacy Suppression Flow

```
┌────────────────────────────────────────┐
│  Input: Groups with participant IDs    │
│  {                                     │
│    age: [                              │
│      { groupId: '18-24', ids: [1,2] }, │  ← n=2, below threshold
│      { groupId: '25-34', ids: [3,4,5,6,7] }  ← n=5, OK
│    ]                                   │
│  }                                     │
└─────────────────┬──────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│  evaluatePrivacy(input, config)        │
│  • Check each group's size             │
│  • If size < minGroupSize (default: 3) │
│    → Add to groupsSuppressed[]         │
└─────────────────┬──────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│  Privacy Status                        │
│  {                                     │
│    smallNThreshold: 3,                 │
│    groupsSuppressed: ['age:18-24'],    │
│    ready: true                         │
│  }                                     │
└─────────────────┬──────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────┐
│  Server Response (suppressed groups    │
│  NEVER sent to client)                 │
└────────────────────────────────────────┘
```

## Component Hierarchy

```
Dashboard Page
│
├── PanelGate (overallImpact)
│   ├── [if ready] OverallImpactCard
│   │   ├── BorderedCard
│   │   ├── Heading
│   │   ├── Text (prose)
│   │   ├── InferredBadge (if LLM)
│   │   └── Percent (denominators)
│   │
│   └── [if not ready] EmptyState
│       ├── Icon
│       ├── Title
│       ├── Reasons list
│       ├── Unlock steps
│       └── Debug (dev only)
│
├── PanelGate (improvementDonut)
│   └── ...
│
├── PanelGate (keyThemes)
│   └── ...
│
└── Data Quality Banner
    └── Readiness summary
```

## File Dependency Graph

```
config.ts ──────┐
                │
types.ts ───────┼──→ evaluator.ts ──→ index.ts
                │           │
                └───────────┘
                            │
                            ▼
              build-cohort-facts-with-readiness.ts
                            │
                            ├──→ API route
                            │    (cohort-facts/route.ts)
                            │
                            └──→ Dashboard page
                                 (example-gated/page.tsx)
                                        │
                    ┌───────────────────┼────────────────┐
                    │                   │                │
                    ▼                   ▼                ▼
              PanelGate.tsx      EmptyState.tsx    Percent.tsx
                    │                   │                │
                    └───────────────────┴────────────────┘
                                        │
                                  Dashboard Cards
```

## Extending: Adding a New Panel Gate

```
1. Update config.ts
   ┌──────────────────────────────┐
   │ panels: {                    │
   │   myNewPanel: {              │
   │     minPaired: 5,            │
   │   }                          │
   │ }                            │
   └──────────────────────────────┘
              │
              ▼
2. Add evaluator function
   ┌──────────────────────────────┐
   │ function evaluateMyNewPanel( │
   │   input, dataset, config     │
   │ ): PanelReadiness {          │
   │   // check thresholds        │
   │   return { ready, ... }      │
   │ }                            │
   └──────────────────────────────┘
              │
              ▼
3. Wire into evaluateReadiness()
   ┌──────────────────────────────┐
   │ panels: {                    │
   │   myNewPanel: evaluateMyNew  │
   │     Panel(...),              │
   │ }                            │
   └──────────────────────────────┘
              │
              ▼
4. Update types.ts
   ┌──────────────────────────────┐
   │ panels: {                    │
   │   myNewPanel: PanelReadiness │
   │ }                            │
   └──────────────────────────────┘
              │
              ▼
5. Use in UI
   ┌──────────────────────────────┐
   │ <PanelGate                   │
   │   panelId="myNewPanel"       │
   │   readiness={...}            │
   │ >                            │
   │   <MyNewCard />              │
   │ </PanelGate>                 │
   └──────────────────────────────┘
```

## Key Principles Visualized

### Principle 1: Server-Side Gates
```
   Client                Server
     │                     │
     │──── Request ───────→│
     │                     │ Evaluate readiness
     │                     │ Apply privacy rules
     │                     │ Suppress small groups
     │                     │
     │←─── Response ───────│ { facts, readiness }
     │                     │ (suppressed data never sent)
     │                     
   Trust the            All gating
   readiness object     happens here
```

### Principle 2: Denominator Transparency
```
   ❌ BAD:                    ✅ GOOD:
   ┌────────────┐             ┌────────────────────┐
   │   64%      │             │ 49/76 (64%)        │
   └────────────┘             └────────────────────┘
   No context                 Clear denominator
```

### Principle 3: Actionable Empty States
```
   ❌ BAD:                    ✅ GOOD:
   ┌──────────────────┐       ┌────────────────────────────┐
   │ No data          │       │ Overall Impact Not Yet     │
   │ available        │       │ Available                  │
   └──────────────────┘       │                            │
                              │ Reason:                    │
                              │ • Not enough paired surveys│
                              │                            │
                              │ To unlock:                 │
                              │ 1. Add 5 more paired       │
                              │    pre/post surveys        │
                              └────────────────────────────┘
```

## Performance Considerations

```
Single API Call
     │
     ├─→ Compute facts once
     │   (assessments, aggregates, etc.)
     │
     └─→ Evaluate readiness once
         (gates, privacy, denominators)
         
         Both returned together
         No extra round trips
         
UI renders from cached result
No client-side computation
```

