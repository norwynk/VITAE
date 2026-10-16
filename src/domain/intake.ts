/**
 * The PRICK health questionnaire, adapted from the clinic's patient
 * preparatory questionnaire. Members answer it before they create an
 * account; the answers travel with the onboarding command and are
 * validated here against this definition, so the clinician always sees the
 * exact wording that was asked.
 *
 * Draft clinical content: a clinician should review the wording and options
 * before launch.
 */

export const INTAKE_VERSION = 'prep-v1';

export type MedRow = { name: string; dose: string; frequency: string; reason: string };
export type IntakeValue = string | string[] | MedRow[];
export type IntakeAnswers = Record<string, IntakeValue>;

export type QuestionKind = 'text' | 'long' | 'choice' | 'multi' | 'number' | 'date' | 'time' | 'tags' | 'meds' | 'rank';

export interface IntakeQuestion {
  id: string;
  kind: QuestionKind;
  label: string;
  hint?: string;
  options?: string[];
  /** `tags`: quick picks. `rank`: the items to order. */
  suggestions?: string[];
  /** `tags`/`meds`: the label for "nothing to add". */
  noneLabel?: string;
  required?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  placeholder?: string;
  /** Shown only when this returns true for the answers so far. */
  showIf?: (a: IntakeAnswers) => boolean;
}

export interface IntakeSection {
  id: string;
  /** Short plain label for the progress bar and the clinician view. */
  label: string;
  /** The PRICK headline on the screen. */
  title: string;
  lead?: string;
  showIf?: (a: IntakeAnswers) => boolean;
  questions: IntakeQuestion[];
}

export const NONE = 'None';
const YN = ['Yes', 'No'];
const YN_PRIVATE = ['Yes', 'No', 'Prefer not to say'];
const FREQ = ['Rarely or never', 'A few times a week', 'Daily', 'More than once a day'];

const str = (a: IntakeAnswers, id: string) => (typeof a[id] === 'string' ? (a[id] as string) : '');
export const isFemale = (a: IntakeAnswers) => str(a, 'sex') === 'Female';
export const isMale = (a: IntakeAnswers) => str(a, 'sex') === 'Male';

export const GOALS = ['Weight management', 'Skin and appearance', 'Energy', 'Sleep', 'Recovery', 'Hormones', 'Libido', 'Focus', 'General wellbeing'];
export const SA_LANGUAGES = ['English', 'Afrikaans', 'isiZulu', 'isiXhosa', 'Sesotho', 'Other'];
export const STRESS_RESPONSES = [
  'Keep my feelings to myself',
  'Stay calm on the outside',
  'Talk it through openly',
  'Question what I was told',
  'Feel low or hopeless',
  'Get angry or upset',
];

export const INTAKE: IntakeSection[] = [
  {
    id: 'about',
    label: 'About you',
    title: 'Let’s get to know each other first.',
    lead: 'The basics. Your surname, ID and number come right at the end.',
    questions: [
      { id: 'firstName', kind: 'text', label: 'First name', required: true, maxLength: 80 },
      { id: 'dateOfBirth', kind: 'date', label: 'Date of birth', required: true },
      { id: 'sex', kind: 'choice', label: 'Sex at birth', hint: 'So we ask the right health questions. Only your clinician sees this.', options: ['Female', 'Male', 'Prefer to discuss with my clinician'], required: true },
      { id: 'province', kind: 'choice', label: 'Province', options: [], required: true },
      { id: 'city', kind: 'text', label: 'City or town', required: true, maxLength: 80 },
      { id: 'heightCm', kind: 'number', label: 'Height (cm)', required: true, min: 100, max: 250 },
      { id: 'weightKg', kind: 'number', label: 'Weight (kg)', required: true, min: 30, max: 350 },
      { id: 'occupation', kind: 'text', label: 'What do you do for work?', maxLength: 120 },
      { id: 'relationship', kind: 'choice', label: 'Relationship status', options: ['Single', 'In a relationship', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'] },
      { id: 'language', kind: 'choice', label: 'Preferred language', options: SA_LANGUAGES },
      { id: 'heardFrom', kind: 'choice', label: 'How did you hear about us?', options: ['Friend or family', 'Doctor or clinician', 'Instagram', 'An event', 'Google', 'Other'] },
      { id: 'referredBy', kind: 'text', label: 'Referred by (if anyone)', maxLength: 120 },
    ],
  },
  {
    id: 'why',
    label: 'Why you’re here',
    title: 'So, what brings you to us?',
    lead: 'In your own words. There are no wrong answers here.',
    questions: [
      { id: 'goals', kind: 'multi', label: 'What would you like help with?', options: GOALS, required: true },
      { id: 'reason', kind: 'long', label: 'What made you reach out?', hint: 'Your main health concerns, and what you’d love to change.', required: true, maxLength: 1000 },
      { id: 'mainWorry', kind: 'long', label: 'What concerns you most of the time?', maxLength: 1000 },
      { id: 'since', kind: 'choice', label: 'When did this first start?', options: ['Less than 3 months ago', '3 to 12 months ago', '1 to 3 years ago', 'Longer than 3 years', 'Not sure'] },
    ],
  },
  {
    id: 'history',
    label: 'Health history',
    title: 'Your health story.',
    lead: 'Tap what applies, add anything else in your own words, or tick none. Only your clinician sees this.',
    questions: [
      {
        id: 'conditions',
        kind: 'tags',
        label: 'Health conditions',
        suggestions: [
          'High blood pressure', 'Type 1 diabetes', 'Type 2 diabetes', 'Heart disease', 'Kidney disease', 'Liver disease', 'Thyroid condition',
          'PCOS', 'Endometriosis', 'Pancreatitis (now or in the past)', 'Gallbladder disease', 'Eating disorder (now or in the past)',
          'Depression or anxiety', 'Cancer (now or in the past)', 'Migraines', 'Autoimmune condition',
        ],
        noneLabel: 'I have no health conditions',
        required: true,
      },
      { id: 'operations', kind: 'long', label: 'Major illnesses or operations you’ve had, and roughly when', maxLength: 1500 },
      {
        id: 'allergies',
        kind: 'tags',
        label: 'Allergies',
        suggestions: ['Penicillin', 'Sulfa drugs', 'Anti-inflammatories (e.g. ibuprofen)', 'Latex', 'Adhesives or plasters', 'Iodine', 'Nuts', 'Shellfish'],
        noneLabel: 'I have no allergies',
        required: true,
      },
      {
        id: 'medications',
        kind: 'meds',
        label: 'Medicines, hormones, vitamins and supplements you take now',
        hint: 'Include the pill, HRT, anything over the counter and anything prescribed.',
        noneLabel: 'I don’t take anything',
        required: true,
      },
      { id: 'previousPeptides', kind: 'choice', label: 'Have you used peptide or injectable treatments before?', options: YN, required: true },
      {
        id: 'familyHistory',
        kind: 'tags',
        label: 'Anything that runs in your family?',
        suggestions: ['Heart disease', 'Stroke', 'Diabetes', 'High blood pressure', 'Cancer', 'Thyroid condition', 'Osteoporosis', 'Mental health conditions', 'Medullary thyroid cancer or MEN2'],
        noneLabel: 'Nothing I know of',
        required: true,
      },
      { id: 'physicians', kind: 'long', label: 'Doctors or specialists involved in your care', placeholder: 'Name and practice', maxLength: 600 },
      { id: 'tests', kind: 'multi', label: 'Have you had any of these tests?', options: ['Blood tests', 'Hormone tests', 'Heavy metals', 'Stool studies', 'DNA studies', 'None of these'] },
      {
        id: 'testResults',
        kind: 'long',
        label: 'Anything from those results you’d like to share?',
        hint: 'You can upload the results themselves in your account later.',
        maxLength: 1500,
        showIf: (a) => Array.isArray(a.tests) && (a.tests as string[]).some((t) => t !== 'None of these'),
      },
      { id: 'healthNotes', kind: 'long', label: 'Anything else your clinician should know?', maxLength: 1500 },
    ],
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    title: 'How you live.',
    lead: 'No judgement. It just helps your clinician see the full picture.',
    questions: [
      { id: 'smoking', kind: 'choice', label: 'Do you smoke or vape?', options: ['Yes', 'No', 'I’ve quit'], required: true },
      { id: 'alcohol', kind: 'choice', label: 'Alcohol', options: ['None', 'Socially', 'Regularly'], required: true },
      { id: 'alcoholUnits', kind: 'number', label: 'Roughly how many drinks a week?', min: 0, max: 200, showIf: (a) => str(a, 'alcohol') !== '' && str(a, 'alcohol') !== 'None' },
      { id: 'activity', kind: 'choice', label: 'How active are you?', options: ['Mostly sitting', 'Light', 'Moderate', 'Very active'], required: true },
      { id: 'dietVeg', kind: 'choice', label: 'Green vegetables', options: FREQ },
      { id: 'dietFastFood', kind: 'choice', label: 'Fast food', options: FREQ },
      { id: 'dietFried', kind: 'choice', label: 'Fried food', options: FREQ },
      { id: 'dietGrains', kind: 'choice', label: 'Bread, grains and gluten', options: FREQ },
      { id: 'dietSugar', kind: 'choice', label: 'Sugar and sweets', options: FREQ },
      { id: 'testingInterest', kind: 'choice', label: 'Would you be open to a blood test if your clinician recommends one?', options: YN },
    ],
  },
  {
    id: 'sleep',
    label: 'Sleep',
    title: 'Sleep. The good stuff.',
    questions: [
      { id: 'sleepHours', kind: 'number', label: 'Hours of sleep a night (roughly)', required: true, min: 0, max: 24 },
      { id: 'fallAsleep', kind: 'choice', label: 'How long does it take you to fall asleep?', options: ['Under 15 minutes', '15 to 30 minutes', '30 to 60 minutes', 'Over an hour'] },
      { id: 'awakenings', kind: 'choice', label: 'How often do you wake in the night?', options: ['Not at all', 'Once', 'Twice', 'Three or more times'] },
      { id: 'wakeTime', kind: 'time', label: 'What time do you usually wake up?' },
      { id: 'snore', kind: 'choice', label: 'Do you snore?', options: ['Yes', 'No', 'Not sure'] },
      { id: 'refreshed', kind: 'choice', label: 'Do you wake up feeling refreshed?', options: ['Yes', 'Sometimes', 'No'] },
      { id: 'daytimeSleepy', kind: 'choice', label: 'Do you feel sleepy during the day?', options: ['Yes', 'Sometimes', 'No'] },
    ],
  },
  {
    id: 'her',
    label: 'For her',
    title: 'Your body, your cycle.',
    lead: 'These matter for your safety with several pens. Only your clinician sees them.',
    showIf: isFemale,
    questions: [
      { id: 'pregnant', kind: 'choice', label: 'Are you pregnant, or might you be?', options: ['Yes', 'No', 'Not sure'], required: true },
      { id: 'breastfeeding', kind: 'choice', label: 'Are you breastfeeding?', options: YN, required: true },
      { id: 'planningPregnancy', kind: 'choice', label: 'Are you planning a pregnancy in the next 12 months?', options: YN, required: true },
      { id: 'beenPregnant', kind: 'choice', label: 'Have you ever been pregnant?', options: YN },
      { id: 'firstPeriodAge', kind: 'number', label: 'Roughly how old were you at your first period?', min: 7, max: 25 },
      { id: 'lastPeriod', kind: 'date', label: 'Date of your last period (if you still have them)' },
      { id: 'flow', kind: 'choice', label: 'Your flow is usually', options: ['Heavy', 'Medium', 'Light', 'I don’t have periods'] },
      { id: 'clots', kind: 'choice', label: 'Do you pass any clots?', options: YN },
      { id: 'cramps', kind: 'multi', label: 'Do you get cramps?', options: ['Before my period', 'During my period', 'No cramps'] },
      { id: 'pmsMood', kind: 'choice', label: 'Do you notice mood changes before your period?', options: YN },
      { id: 'breastChanges', kind: 'choice', label: 'Any recent changes in breast size?', options: YN },
      { id: 'breastExam', kind: 'choice', label: 'Do you examine your breasts?', options: YN },
      { id: 'contraception', kind: 'choice', label: 'Contraception', options: ['None', 'The pill', 'Copper IUD', 'Hormonal IUD', 'Implant', 'Injection', 'Condoms', 'Other'] },
      {
        id: 'menopauseStage',
        kind: 'choice',
        label: 'Where are you with menopause?',
        options: ['Before menopause', 'Perimenopause', 'After menopause', 'Not sure', 'Prefer not to say'],
        required: true,
      },
      { id: 'mammogram', kind: 'choice', label: 'Have you had a mammogram?', options: YN },
      { id: 'papSmear', kind: 'choice', label: 'Have you had a pap smear?', options: YN },
      { id: 'boneDensity', kind: 'choice', label: 'Have you had a bone density scan?', options: YN },
    ],
  },
  {
    id: 'him',
    label: 'For him',
    title: 'For him.',
    lead: 'A quick check-in. Yes or no is all we need.',
    showIf: isMale,
    questions: [
      { id: 'mLibido', kind: 'choice', label: 'Has your sex drive dropped?', options: YN, required: true },
      { id: 'mEnergy', kind: 'choice', label: 'Do you lack energy?', options: YN, required: true },
      { id: 'mStrength', kind: 'choice', label: 'Have your strength or endurance dropped?', options: YN, required: true },
      { id: 'mHeight', kind: 'choice', label: 'Have you lost height?', options: YN, required: true },
      { id: 'mEnjoyment', kind: 'choice', label: 'Are you enjoying life less than you used to?', options: YN, required: true },
      { id: 'mMood', kind: 'choice', label: 'Are you sad or grumpy more often?', options: YN, required: true },
      { id: 'mErections', kind: 'choice', label: 'Are your erections less strong?', options: YN, required: true },
      { id: 'mSport', kind: 'choice', label: 'Has your ability to play sport got worse recently?', options: YN, required: true },
      { id: 'mDinnerSleep', kind: 'choice', label: 'Do you fall asleep after dinner?', options: YN, required: true },
      { id: 'mWork', kind: 'choice', label: 'Has your work performance dropped recently?', options: YN, required: true },
    ],
  },
  {
    id: 'mind',
    label: 'Head space',
    title: 'Head space.',
    lead: 'How life feels at the moment. Answer as much or as little as you like.',
    questions: [
      { id: 'behaviourChange', kind: 'long', label: 'Is there anything about your habits or behaviour you’d like to change?', maxLength: 1000 },
      { id: 'lifeSituations', kind: 'long', label: 'Is anything in your life causing problems right now, or something you’d like to change?', maxLength: 1000 },
      { id: 'stressTechniques', kind: 'choice', label: 'Do you use anything to manage stress?', options: YN },
      { id: 'stressTechniquesWhat', kind: 'text', label: 'What helps?', maxLength: 300, showIf: (a) => str(a, 'stressTechniques') === 'Yes' },
      { id: 'enjoyment', kind: 'long', label: 'What do you do for fun or to relax?', maxLength: 600 },
      { id: 'feelingsAboutHealth', kind: 'long', label: 'How are you feeling about your health and the idea of treatment?', maxLength: 1000 },
      {
        id: 'stressResponse',
        kind: 'rank',
        label: 'When you get difficult news, how are you most likely to react?',
        hint: 'Number them from 1 (most like you) to 6 (least like you). Optional.',
        suggestions: STRESS_RESPONSES,
      },
    ],
  },
  {
    id: 'intimacy',
    label: 'Intimacy',
    title: 'The bedroom bit.',
    lead: 'Totally optional, totally private. Skip anything you’d rather talk about with your clinician.',
    questions: [
      { id: 'sexAttitude', kind: 'long', label: 'How do you feel about sex at the moment?', maxLength: 600 },
      { id: 'sexConcerns', kind: 'long', label: 'Any questions or concerns about sex?', maxLength: 600 },
      { id: 'sexSatisfied', kind: 'choice', label: 'Is your sex life satisfying?', options: YN_PRIVATE },
      { id: 'sexPain', kind: 'choice', label: 'Any pain or discomfort during sex?', options: YN_PRIVATE },
      { id: 'sexPainDetail', kind: 'text', label: 'Tell us a little more', maxLength: 300, showIf: (a) => str(a, 'sexPain') === 'Yes' },
      { id: 'sexFrequency', kind: 'choice', label: 'How often are you sexually active?', options: ['Not at the moment', 'Less than once a month', 'A few times a month', 'Weekly', 'Several times a week', 'Prefer not to say'] },
      { id: 'libidoOk', kind: 'choice', label: 'Are you happy with your libido?', options: YN_PRIVATE },
      { id: 'erectileDysfunction', kind: 'choice', label: 'Any erectile difficulties?', options: YN_PRIVATE, showIf: isMale },
    ],
  },
];

/** Sections that apply to these answers, in order. */
export function sectionsFor(a: IntakeAnswers): IntakeSection[] {
  return INTAKE.filter((s) => !s.showIf || s.showIf(a));
}

export function visibleQuestions(s: IntakeSection, a: IntakeAnswers): IntakeQuestion[] {
  return s.questions.filter((q) => !q.showIf || q.showIf(a));
}

const QUESTIONS = new Map(INTAKE.flatMap((s) => s.questions.map((q) => [q.id, { q, s }] as const)));

export function intakeQuestion(id: string) {
  return QUESTIONS.get(id);
}

export function isEmpty(v: IntakeValue | undefined): boolean {
  return v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
}

/**
 * Checks one question's answer. Returns a member-facing message, or null.
 * `provinces` fills the province options (kept in the domain model).
 */
export function problemWith(q: IntakeQuestion, v: IntakeValue | undefined, provinces: readonly string[]): string | null {
  if (isEmpty(v)) {
    if (!q.required) return null;
    if (q.kind === 'tags' || q.kind === 'meds') return `${q.label}: add something, or tick “${q.noneLabel}”.`;
    return `Please answer: ${q.label}`;
  }
  const options = q.id === 'province' ? provinces : q.options;
  switch (q.kind) {
    case 'text':
    case 'long':
    case 'date':
    case 'time':
      if (typeof v !== 'string') return `Please answer: ${q.label}`;
      if (v.length > (q.maxLength ?? 2000)) return `${q.label} is too long`;
      if (q.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${q.label}: use a full date`;
      if (q.kind === 'time' && !/^\d{2}:\d{2}$/.test(v)) return `${q.label}: use a time`;
      return null;
    case 'number': {
      const n = Number(v);
      if (typeof v !== 'string' || !Number.isFinite(n)) return `${q.label}: enter a number`;
      if ((q.min !== undefined && n < q.min) || (q.max !== undefined && n > q.max)) return `${q.label}: enter a number from ${q.min} to ${q.max}`;
      return null;
    }
    case 'choice':
      return typeof v === 'string' && options?.includes(v) ? null : `Please choose an option for: ${q.label}`;
    case 'multi':
      return Array.isArray(v) && v.every((x) => typeof x === 'string' && options?.includes(x)) ? null : `Please choose from the options for: ${q.label}`;
    case 'tags':
      if (!Array.isArray(v) || !v.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 120)) return `${q.label}: check your answers`;
      if ((v as string[]).includes(NONE) && v.length > 1) return `${q.label}: choose none, or list them`;
      return v.length > 40 ? `${q.label}: too many items` : null;
    case 'meds':
      if (!Array.isArray(v) || v.length > 30) return `${q.label}: check your list`;
      for (const row of v as unknown[]) {
        if (row === NONE) continue;
        const r = row as MedRow;
        if (!r || typeof r !== 'object' || typeof r.name !== 'string' || !r.name.trim()) return `${q.label}: every row needs a name`;
        if ([r.name, r.dose, r.frequency, r.reason].some((x) => typeof x !== 'string' || x.length > 200)) return `${q.label}: check your list`;
      }
      return (v as unknown[]).includes(NONE) && v.length > 1 ? `${q.label}: choose none, or list them` : null;
    case 'rank': {
      if (!Array.isArray(v) || v.length !== (q.suggestions?.length ?? 0)) return `${q.label}: give every item a number`;
      const nums = (v as string[]).map(Number);
      const ok = nums.every((n) => Number.isInteger(n) && n >= 1 && n <= nums.length) && new Set(nums).size === nums.length;
      return ok ? null : `${q.label}: use each number once`;
    }
  }
}

/**
 * Server-side check of a whole questionnaire. Unknown keys and answers to
 * questions that don't apply are rejected; required questions must be
 * answered. Returns the cleaned answers.
 */
export function validateIntake(input: unknown, provinces: readonly string[]): { answers: IntakeAnswers; problem?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { answers: {}, problem: 'The questionnaire is missing' };
  const raw = input as Record<string, unknown>;
  const answers: IntakeAnswers = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!QUESTIONS.has(k)) return { answers: {}, problem: 'The questionnaire has an unknown question' };
    if (!isEmpty(v as IntakeValue)) answers[k] = v as IntakeValue;
  }
  for (const s of INTAKE) {
    const sectionOn = !s.showIf || s.showIf(answers);
    for (const q of s.questions) {
      const on = sectionOn && (!q.showIf || q.showIf(answers));
      if (!on) {
        delete answers[q.id];
        continue;
      }
      const problem = problemWith(q, answers[q.id], provinces);
      if (problem) return { answers: {}, problem };
    }
  }
  return { answers };
}

// ---------------------------------------------------------------------------
// Readable answers, for the clinician and for the structured records.
// ---------------------------------------------------------------------------

export function medsText(v: IntakeValue | undefined): string {
  if (!Array.isArray(v) || !v.length) return '';
  if ((v as unknown[]).includes(NONE)) return NONE;
  return (v as MedRow[])
    .map((r) => [r.name, r.dose, r.frequency && `${r.frequency}`, r.reason && `for ${r.reason}`].filter(Boolean).join(', '))
    .join('; ');
}

export function answerText(q: IntakeQuestion, v: IntakeValue | undefined): string {
  if (isEmpty(v)) return '';
  if (q.kind === 'meds') return medsText(v);
  if (q.kind === 'rank' && Array.isArray(v)) {
    return (q.suggestions ?? [])
      .map((item, i) => ({ item, n: Number((v as string[])[i]) }))
      .sort((x, y) => x.n - y.n)
      .map((x) => `${x.n}. ${x.item}`)
      .join('  ');
  }
  return Array.isArray(v) ? (v as string[]).join(', ') : String(v);
}
