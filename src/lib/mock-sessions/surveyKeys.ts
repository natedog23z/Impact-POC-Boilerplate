export type SurveyKeyType = 'scale' | 'categorical';

export type SurveyKey = {
  key: string;
  label: string;
  type: SurveyKeyType;
  scale?: {
    min: number;
    max: number;
    step: number;
  };
  // For scale items only: which direction indicates improvement
  betterWhen?: 'higher' | 'lower';
};

export const SURVEY_KEYS: SurveyKey[] = [
  {
    key: 'relationships_contentment',
    label: 'I am content with my friendships and relationships.',
    type: 'scale',
    scale: { min: 1, max: 10, step: 1 },
    betterWhen: 'higher',
  },
  {
    key: 'relationships_satisfaction',
    label: 'My relationships are as satisfying as I would want them to be.',
    type: 'scale',
    scale: { min: 1, max: 10, step: 1 },
    betterWhen: 'higher',
  },
  {
    key: 'physical_health_rating',
    label: 'In general, how would you rate your physical health?',
    type: 'scale',
    scale: { min: 1, max: 10, step: 1 },
    betterWhen: 'higher',
  },
  {
    key: 'mental_health_rating',
    label: 'How would you rate your overall mental health?',
    type: 'scale',
    scale: { min: 1, max: 10, step: 1 },
    betterWhen: 'higher',
  },
  {
    key: 'expense_worry_frequency',
    label: 'How often do you worry about being able to meet normal monthly living expenses?',
    type: 'scale',
    scale: { min: 1, max: 10, step: 1 },
    betterWhen: 'lower',
  },
  {
    key: 'safety_worry_frequency',
    label: 'How often do you worry about safety, food, or housing?',
    type: 'scale',
    scale: { min: 1, max: 10, step: 1 },
    betterWhen: 'lower',
  },
  {
    key: 'life_worthwhile_extent',
    label: 'Overall, to what extent do you feel the things you do in your life are worthwhile?',
    type: 'scale',
    scale: { min: 1, max: 10, step: 1 },
    betterWhen: 'higher',
  },
  {
    key: 'purpose_understanding',
    label: 'I understand my purpose in life.',
    type: 'scale',
    scale: { min: 1, max: 10, step: 1 },
    betterWhen: 'higher',
  },
  {
    key: 'desire_jesus_first',
    label: 'I desire Jesus to be first in my life.',
    type: 'scale',
    scale: { min: 1, max: 10, step: 1 },
    betterWhen: 'higher',
  },
  {
    key: 'bible_authority_belief',
    label: 'I believe the Bible has authority over what I say and do.',
    type: 'scale',
    scale: { min: 1, max: 10, step: 1 },
    betterWhen: 'higher',
  },
  {
    key: 'church_attendance_recency',
    label:
      'When was the last time you attended a Christian church service, other than for a holiday service, such as Christmas or Easter, or for special events such as a wedding or funeral?',
    type: 'categorical',
  },
  {
    key: 'birth_year_bucket',
    label: 'In what year were you born?',
    type: 'categorical',
  },
  {
    key: 'gender',
    label: 'Please indicate your gender.',
    type: 'categorical',
  },
  {
    key: 'ethnicity',
    label: 'Which of the following best describes you?',
    type: 'categorical',
  },
];

export const SURVEY_KEY_MAP = Object.fromEntries(
  SURVEY_KEYS.map((entry) => [entry.key, entry] as const),
);
