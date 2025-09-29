#!/bin/bash

# Session 3
cat > ./data/mock-session-footers/session-3.json << 'SESS3'
{
  "rawSchemaVersion": "v1",
  "generatorVersion": "mock-session-generator@0.2.0",
  "seed": "mock-seed:3",
  "sessionId": "mock-mock-seed-003",
  "programId": "cmfv7cqtv0002b5y5t3p5iq35",
  "sentiment": "positive",
  "milestones": [
    {
      "type": "Applicant Survey",
      "title": "Pre-Survey",
      "description": "a quick pre-survey",
      "completedAt": "2025-09-25T15:13:15.039Z",
      "answers": {
        "relationships_contentment": 3,
        "relationships_satisfaction": 4,
        "physical_health_rating": 5,
        "mental_health_rating": 7,
        "expense_worry_frequency": 6,
        "safety_worry_frequency": 4,
        "life_worthwhile_extent": 2,
        "purpose_understanding": 7,
        "desire_jesus_first": 2,
        "bible_authority_belief": 2,
        "church_attendance_recency": "More than 1 year ago",
        "birth_year_bucket": "1984 - 1998 (Millennial)",
        "gender": "Female",
        "ethnicity": "Hispanic or Latino(a)"
      }
    },
    {
      "type": "Meeting",
      "title": "Week 01 Session",
      "description": "60 min zoom session",
      "completedAt": "2025-09-25T15:13:48.095Z",
      "meeting": {
        "details": "online",
        "schedulingLink": "calendly.com/nsfray"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Therapist uploads session 1 notes",
      "description": "upload markdown",
      "completedAt": "2025-09-25T15:14:20.046Z",
      "markdownOutcome": {
        "date": "Week 1",
        "focus": "Orientation, isolation, study anxiety",
        "notes": "Priya described moving for grad school and feeling disconnected.\n\nNoted nighttime scrolling and late sleep as anxiety avoidance.\n\nIntroduced a 2-part routine: (1) Grounding micro-break (60-second paced breathing) before study blocks; (2) 30–5 study timer (30 minutes focused, 5 minutes off).\n\nNormalized adjustment period; discussed a low-stakes social touchpoint each week (e.g., after-seminar coffee).",
        "plan": [
          "Use the 30–5 timer for two study blocks per day.",
          "60-second paced breathing before each block.",
          "Schedule one social micro-connection this week (message a classmate to compare notes)."
        ]
      }
    },
    {
      "type": "Reflection",
      "title": "Week 1 Reflection",
      "description": "please share your experience",
      "completedAt": "2025-09-25T15:14:50.582Z",
      "reflection": {
        "text": "The timer felt doable. I got through an article without bouncing between tabs. I messaged someone from my cohort and we set a time to review notes next week. I still scrolled late two nights, but it felt more like a choice than a spiral."
      }
    },
    {
      "type": "Meeting",
      "title": "Week 02 Session",
      "description": "60 min zoom session",
      "completedAt": "2025-09-25T15:15:03.275Z",
      "meeting": {
        "details": "online",
        "schedulingLink": "calendly.com/nsfray"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Therapist uploads session 2 notes",
      "description": "upload markdown",
      "completedAt": "2025-09-25T15:15:24.230Z",
      "markdownOutcome": {
        "date": "Week 2",
        "focus": "Sleep hygiene, comparison thinking, routine building",
        "notes": "Priya completed at least one 30–5 block most days; two blocks on three days.\n\nReported one successful coffee chat; felt "less invisible."\n\nIdentified comparison thoughts ("Everyone else has it together").\n\nIntroduced a thought label ("That's a comparison story") + 1 small action (open the doc, read 1 paragraph).\n\nSleep: created a 10:45 pm lights-out target, phone charging outside bedroom.",
        "plan": [
          "Maintain daily 30–5 blocks (aim 2/day on weekdays).",
          "Use comparison label → 1 small action when stuck.",
          "Lights out 10:45 pm, phone outside room 4 nights this week."
        ]
      }
    },
    {
      "type": "Reflection",
      "title": "Week 2 Reflection",
      "description": "please share your experience",
      "completedAt": "2025-09-25T15:15:40.192Z",
      "reflection": {
        "text": "Naming the 'comparison story' helped. I opened the doc even when I didn't feel like it. I hit the 10:45 target three nights and woke up less groggy. The coffee chat was nice—we made a plan to study again."
      }
    },
    {
      "type": "Meeting",
      "title": "Week 03 Session",
      "description": "60 min zoom session",
      "completedAt": "2025-09-25T15:15:54.031Z",
      "meeting": {
        "details": "online",
        "schedulingLink": "calendly.com/nsfray"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Therapist uploads session 3 notes",
      "description": "upload markdown",
      "completedAt": "2025-09-25T15:16:13.792Z",
      "markdownOutcome": {
        "date": "Week 3",
        "focus": "Confidence, social scaffolding, sustainable habits",
        "notes": "Priya reported two study meetups; said having a shared goal keeps her focused.\n\nCompleted two 30–5 blocks on four days this week; noted clearer start-up routine.\n\nSleep improved to mostly 10:45–11:00 pm lights-out; fewer late scrolls.\n\nPracticed a brief self-encouragement script before starting tasks ("Start small; one paragraph is enough").\n\nDiscussed ongoing plan: 2–3 social touchpoints per week, keep micro-breaks, maintain early phone charge.",
        "plan": [
          "Keep 2 daily 30–5 study blocks on weekdays.",
          "Plan 2 social touchpoints weekly (classmate review, campus group, or office hours).",
          "Maintain 10:45 pm lights-out, phone charging outside the bedroom."
        ]
      }
    },
    {
      "type": "Reflection",
      "title": "Week 3 Reflection",
      "description": "please share your experience",
      "completedAt": "2025-09-25T15:16:28.420Z",
      "reflection": {
        "text": "I feel more settled. The small actions add up. I like the study blocks and having a partner sometimes. I'm not perfect with sleep, but I notice the difference when I follow the plan"
      }
    },
    {
      "type": "Applicant Survey",
      "title": "Post-Survey",
      "description": "upload post survey",
      "completedAt": "2025-09-25T15:18:04.708Z",
      "answers": {
        "relationships_contentment": 3,
        "relationships_satisfaction": 5,
        "physical_health_rating": 6,
        "mental_health_rating": 7,
        "expense_worry_frequency": 7,
        "safety_worry_frequency": 5,
        "life_worthwhile_extent": 2,
        "purpose_understanding": 7,
        "desire_jesus_first": 3,
        "bible_authority_belief": 3,
        "church_attendance_recency": "More than 1 year ago",
        "birth_year_bucket": "1984 - 1998 (Millennial)",
        "gender": "Female",
        "ethnicity": "Hispanic or Latino(a)"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Final Report",
      "description": "therapist uploads final report",
      "completedAt": "2025-09-25T15:18:44.351Z",
      "markdownOutcome": {
        "plan": [
          "Keep the thought label → action step workflow for comparison spirals.",
          "Optional follow-up: Monthly check-in for accountability during midterms/finals."
        ]
      }
    }
  ],
  "demographics": {
    "Birth Year": "1977",
    "Gender": "Male",
    "Zip Code": "28012"
  },
  "application": {
    "reasons": [
      "Looking for accountability while navigating a life transition.",
      "Wanting support to reduce anxiety and improve focus.",
      "Trying to rebuild confidence after a difficult season."
    ],
    "challenges": [
      "Feeling isolated after relocating to a new city.",
      "Avoiding procrastination on important but overwhelming tasks.",
      "Managing recurring comparison thoughts with peers."
    ]
  }
}
SESS3

# Session 4
cat > ./data/mock-session-footers/session-4.json << 'SESS4'
{
  "rawSchemaVersion": "v1",
  "generatorVersion": "mock-session-generator@0.2.0",
  "seed": "mock-seed:4",
  "sessionId": "mock-mock-seed-004",
  "programId": "cmfv7cqtv0002b5y5t3p5iq35",
  "sentiment": "neutral",
  "milestones": [
    {
      "type": "Applicant Survey",
      "title": "Pre-Survey",
      "description": "a quick pre-survey",
      "completedAt": "2025-09-25T15:13:15.039Z",
      "answers": {
        "relationships_contentment": 3,
        "relationships_satisfaction": 4,
        "physical_health_rating": 5,
        "mental_health_rating": 7,
        "expense_worry_frequency": 6,
        "safety_worry_frequency": 4,
        "life_worthwhile_extent": 2,
        "purpose_understanding": 7,
        "desire_jesus_first": 2,
        "bible_authority_belief": 2,
        "church_attendance_recency": "More than 1 year ago",
        "birth_year_bucket": "1984 - 1998 (Millennial)",
        "gender": "Female",
        "ethnicity": "Hispanic or Latino(a)"
      }
    },
    {
      "type": "Meeting",
      "title": "Week 01 Session",
      "description": "60 min zoom session",
      "completedAt": "2025-09-25T15:13:48.095Z",
      "meeting": {
        "details": "online",
        "schedulingLink": "calendly.com/nsfray"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Therapist uploads session 1 notes",
      "description": "upload markdown",
      "completedAt": "2025-09-25T15:14:20.046Z",
      "markdownOutcome": {
        "date": "Week 1",
        "focus": "Orientation, isolation, study anxiety",
        "notes": "Priya described moving for grad school and feeling disconnected.\n\nNoted nighttime scrolling and late sleep as anxiety avoidance.\n\nIntroduced a 2-part routine: (1) Grounding micro-break (60-second paced breathing) before study blocks; (2) 30–5 study timer (30 minutes focused, 5 minutes off).\n\nNormalized adjustment period; discussed a low-stakes social touchpoint each week (e.g., after-seminar coffee).",
        "plan": [
          "Use the 30–5 timer for two study blocks per day.",
          "60-second paced breathing before each block.",
          "Schedule one social micro-connection this week (message a classmate to compare notes)."
        ]
      }
    },
    {
      "type": "Reflection",
      "title": "Week 1 Reflection",
      "description": "please share your experience",
      "completedAt": "2025-09-25T15:14:50.582Z",
      "reflection": {
        "text": "The timer felt doable. I got through an article without bouncing between tabs. I messaged someone from my cohort and we set a time to review notes next week. I still scrolled late two nights, but it felt more like a choice than a spiral."
      }
    },
    {
      "type": "Meeting",
      "title": "Week 02 Session",
      "description": "60 min zoom session",
      "completedAt": "2025-09-25T15:15:03.275Z",
      "meeting": {
        "details": "online",
        "schedulingLink": "calendly.com/nsfray"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Therapist uploads session 2 notes",
      "description": "upload markdown",
      "completedAt": "2025-09-25T15:15:24.230Z",
      "markdownOutcome": {
        "date": "Week 2",
        "focus": "Sleep hygiene, comparison thinking, routine building",
        "notes": "Priya completed at least one 30–5 block most days; two blocks on three days.\n\nReported one successful coffee chat; felt "less invisible."\n\nIdentified comparison thoughts ("Everyone else has it together").\n\nIntroduced a thought label ("That's a comparison story") + 1 small action (open the doc, read 1 paragraph).\n\nSleep: created a 10:45 pm lights-out target, phone charging outside bedroom.",
        "plan": [
          "Maintain daily 30–5 blocks (aim 2/day on weekdays).",
          "Use comparison label → 1 small action when stuck.",
          "Lights out 10:45 pm, phone outside room 4 nights this week."
        ]
      }
    },
    {
      "type": "Reflection",
      "title": "Week 2 Reflection",
      "description": "please share your experience",
      "completedAt": "2025-09-25T15:15:40.192Z",
      "reflection": {
        "text": "Naming the 'comparison story' helped. I opened the doc even when I didn't feel like it. I hit the 10:45 target three nights and woke up less groggy. The coffee chat was nice—we made a plan to study again."
      }
    },
    {
      "type": "Meeting",
      "title": "Week 03 Session",
      "description": "60 min zoom session",
      "completedAt": "2025-09-25T15:15:54.031Z",
      "meeting": {
        "details": "online",
        "schedulingLink": "calendly.com/nsfray"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Therapist uploads session 3 notes",
      "description": "upload markdown",
      "completedAt": "2025-09-25T15:16:13.792Z",
      "markdownOutcome": {
        "date": "Week 3",
        "focus": "Confidence, social scaffolding, sustainable habits",
        "notes": "Priya reported two study meetups; said having a shared goal keeps her focused.\n\nCompleted two 30–5 blocks on four days this week; noted clearer start-up routine.\n\nSleep improved to mostly 10:45–11:00 pm lights-out; fewer late scrolls.\n\nPracticed a brief self-encouragement script before starting tasks ("Start small; one paragraph is enough").\n\nDiscussed ongoing plan: 2–3 social touchpoints per week, keep micro-breaks, maintain early phone charge.",
        "plan": [
          "Keep 2 daily 30–5 study blocks on weekdays.",
          "Plan 2 social touchpoints weekly (classmate review, campus group, or office hours).",
          "Maintain 10:45 pm lights-out, phone charging outside the bedroom."
        ]
      }
    },
    {
      "type": "Reflection",
      "title": "Week 3 Reflection",
      "description": "please share your experience",
      "completedAt": "2025-09-25T15:16:28.420Z",
      "reflection": {
        "text": "I feel more settled. The small actions add up. I like the study blocks and having a partner sometimes. I'm not perfect with sleep, but I notice the difference when I follow the plan"
      }
    },
    {
      "type": "Applicant Survey",
      "title": "Post-Survey",
      "description": "upload post survey",
      "completedAt": "2025-09-25T15:18:04.708Z",
      "answers": {
        "relationships_contentment": 3,
        "relationships_satisfaction": 4,
        "physical_health_rating": 5,
        "mental_health_rating": 7,
        "expense_worry_frequency": 6,
        "safety_worry_frequency": 4,
        "life_worthwhile_extent": 2,
        "purpose_understanding": 7,
        "desire_jesus_first": 2,
        "bible_authority_belief": 2,
        "church_attendance_recency": "More than 1 year ago",
        "birth_year_bucket": "1984 - 1998 (Millennial)",
        "gender": "Female",
        "ethnicity": "Hispanic or Latino(a)"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Final Report",
      "description": "therapist uploads final report",
      "completedAt": "2025-09-25T15:18:44.351Z",
      "markdownOutcome": {
        "plan": [
          "Keep the thought label → action step workflow for comparison spirals.",
          "Optional follow-up: Monthly check-in for accountability during midterms/finals."
        ]
      }
    }
  ],
  "demographics": {
    "Birth Year": "1984",
    "Gender": "Male",
    "Zip Code": "73112"
  },
  "application": {
    "reasons": [
      "Wanting support to reduce anxiety and improve focus.",
      "Preparing for increased responsibilities at work and home.",
      "Trying to rebuild confidence after a difficult season."
    ],
    "challenges": [
      "Staying consistent with healthy routines on busy weeks.",
      "Feeling isolated after relocating to a new city."
    ]
  }
}
SESS4

# Session 5
cat > ./data/mock-session-footers/session-5.json << 'SESS5'
{
  "rawSchemaVersion": "v1",
  "generatorVersion": "mock-session-generator@0.2.0",
  "seed": "mock-seed:5",
  "sessionId": "mock-mock-seed-005",
  "programId": "cmfv7cqtv0002b5y5t3p5iq35",
  "sentiment": "positive",
  "milestones": [
    {
      "type": "Applicant Survey",
      "title": "Pre-Survey",
      "description": "a quick pre-survey",
      "completedAt": "2025-09-25T15:13:15.039Z",
      "answers": {
        "relationships_contentment": 3,
        "relationships_satisfaction": 4,
        "physical_health_rating": 5,
        "mental_health_rating": 7,
        "expense_worry_frequency": 6,
        "safety_worry_frequency": 4,
        "life_worthwhile_extent": 2,
        "purpose_understanding": 7,
        "desire_jesus_first": 2,
        "bible_authority_belief": 2,
        "church_attendance_recency": "More than 1 year ago",
        "birth_year_bucket": "1984 - 1998 (Millennial)",
        "gender": "Female",
        "ethnicity": "Hispanic or Latino(a)"
      }
    },
    {
      "type": "Meeting",
      "title": "Week 01 Session",
      "description": "60 min zoom session",
      "completedAt": "2025-09-25T15:13:48.095Z",
      "meeting": {
        "details": "online",
        "schedulingLink": "calendly.com/nsfray"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Therapist uploads session 1 notes",
      "description": "upload markdown",
      "completedAt": "2025-09-25T15:14:20.046Z",
      "markdownOutcome": {
        "date": "Week 1",
        "focus": "Orientation, isolation, study anxiety",
        "notes": "Priya described moving for grad school and feeling disconnected.\n\nNoted nighttime scrolling and late sleep as anxiety avoidance.\n\nIntroduced a 2-part routine: (1) Grounding micro-break (60-second paced breathing) before study blocks; (2) 30–5 study timer (30 minutes focused, 5 minutes off).\n\nNormalized adjustment period; discussed a low-stakes social touchpoint each week (e.g., after-seminar coffee).",
        "plan": [
          "Use the 30–5 timer for two study blocks per day.",
          "60-second paced breathing before each block.",
          "Schedule one social micro-connection this week (message a classmate to compare notes)."
        ]
      }
    },
    {
      "type": "Reflection",
      "title": "Week 1 Reflection",
      "description": "please share your experience",
      "completedAt": "2025-09-25T15:14:50.582Z",
      "reflection": {
        "text": "The timer felt doable. I got through an article without bouncing between tabs. I messaged someone from my cohort and we set a time to review notes next week. I still scrolled late two nights, but it felt more like a choice than a spiral."
      }
    },
    {
      "type": "Meeting",
      "title": "Week 02 Session",
      "description": "60 min zoom session",
      "completedAt": "2025-09-25T15:15:03.275Z",
      "meeting": {
        "details": "online",
        "schedulingLink": "calendly.com/nsfray"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Therapist uploads session 2 notes",
      "description": "upload markdown",
      "completedAt": "2025-09-25T15:15:24.230Z",
      "markdownOutcome": {
        "date": "Week 2",
        "focus": "Sleep hygiene, comparison thinking, routine building",
        "notes": "Priya completed at least one 30–5 block most days; two blocks on three days.\n\nReported one successful coffee chat; felt "less invisible."\n\nIdentified comparison thoughts ("Everyone else has it together").\n\nIntroduced a thought label ("That's a comparison story") + 1 small action (open the doc, read 1 paragraph).\n\nSleep: created a 10:45 pm lights-out target, phone charging outside bedroom.",
        "plan": [
          "Maintain daily 30–5 blocks (aim 2/day on weekdays).",
          "Use comparison label → 1 small action when stuck.",
          "Lights out 10:45 pm, phone outside room 4 nights this week."
        ]
      }
    },
    {
      "type": "Reflection",
      "title": "Week 2 Reflection",
      "description": "please share your experience",
      "completedAt": "2025-09-25T15:15:40.192Z",
      "reflection": {
        "text": "Naming the 'comparison story' helped. I opened the doc even when I didn't feel like it. I hit the 10:45 target three nights and woke up less groggy. The coffee chat was nice—we made a plan to study again."
      }
    },
    {
      "type": "Meeting",
      "title": "Week 03 Session",
      "description": "60 min zoom session",
      "completedAt": "2025-09-25T15:15:54.031Z",
      "meeting": {
        "details": "online",
        "schedulingLink": "calendly.com/nsfray"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Therapist uploads session 3 notes",
      "description": "upload markdown",
      "completedAt": "2025-09-25T15:16:13.792Z",
      "markdownOutcome": {
        "date": "Week 3",
        "focus": "Confidence, social scaffolding, sustainable habits",
        "notes": "Priya reported two study meetups; said having a shared goal keeps her focused.\n\nCompleted two 30–5 blocks on four days this week; noted clearer start-up routine.\n\nSleep improved to mostly 10:45–11:00 pm lights-out; fewer late scrolls.\n\nPracticed a brief self-encouragement script before starting tasks ("Start small; one paragraph is enough").\n\nDiscussed ongoing plan: 2–3 social touchpoints per week, keep micro-breaks, maintain early phone charge.",
        "plan": [
          "Keep 2 daily 30–5 study blocks on weekdays.",
          "Plan 2 social touchpoints weekly (classmate review, campus group, or office hours).",
          "Maintain 10:45 pm lights-out, phone charging outside the bedroom."
        ]
      }
    },
    {
      "type": "Reflection",
      "title": "Week 3 Reflection",
      "description": "please share your experience",
      "completedAt": "2025-09-25T15:16:28.420Z",
      "reflection": {
        "text": "I feel more settled. The small actions add up. I like the study blocks and having a partner sometimes. I'm not perfect with sleep, but I notice the difference when I follow the plan"
      }
    },
    {
      "type": "Applicant Survey",
      "title": "Post-Survey",
      "description": "upload post survey",
      "completedAt": "2025-09-25T15:18:04.708Z",
      "answers": {
        "relationships_contentment": 3,
        "relationships_satisfaction": 4,
        "physical_health_rating": 7,
        "mental_health_rating": 8,
        "expense_worry_frequency": 6,
        "safety_worry_frequency": 6,
        "life_worthwhile_extent": 2,
        "purpose_understanding": 8,
        "desire_jesus_first": 4,
        "bible_authority_belief": 4,
        "church_attendance_recency": "More than 1 year ago",
        "birth_year_bucket": "1984 - 1998 (Millennial)",
        "gender": "Female",
        "ethnicity": "Hispanic or Latino(a)"
      }
    },
    {
      "type": "Outcome Note",
      "title": "Final Report",
      "description": "therapist uploads final report",
      "completedAt": "2025-09-25T15:18:44.351Z",
      "markdownOutcome": {
        "plan": [
          "Keep the thought label → action step workflow for comparison spirals.",
          "Optional follow-up: Monthly check-in for accountability during midterms/finals."
        ]
      }
    }
  ],
  "demographics": {
    "Birth Year": "1971",
    "Gender": "Male",
    "Zip Code": "78704"
  },
  "application": {
    "reasons": [
      "Trying to rebuild confidence after a difficult season.",
      "Looking for accountability while navigating a life transition."
    ],
    "challenges": [
      "Managing recurring comparison thoughts with peers.",
      "Staying consistent with healthy routines on busy weeks.",
      "Balancing academic demands with family expectations."
    ]
  }
}
SESS5

echo "Created all 5 session files!"
