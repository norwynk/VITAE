/**
 * Pen-specific screening questions, asked only for the pens a member picked.
 * The server owns the wording and the safety flags: the client sends only a
 * question id and an answer, so a clinician always sees the exact question
 * that was asked and a flag the member could not switch off.
 *
 * Draft clinical content: a clinician must review every question and flag
 * before launch. A flag never decides anything; it points the clinician at
 * an answer.
 */

export type PenQuestionKind = 'yesNo' | 'choice' | 'multi' | 'number' | 'text';

export interface PenQuestion {
  id: string;
  kind: PenQuestionKind;
  question: string;
  /** Short helper line under the question. */
  hint?: string;
  options?: string[];
  required: boolean;
  /** Answers that flag the question for the clinician. */
  flagWhen?: string[];
  /** For `number`: inclusive range. */
  min?: number;
  max?: number;
}

export interface PenQuestionGroup {
  id: string;
  /** Shown above the group, e.g. "For your weight pens". */
  title: string;
  /** The group applies when a chosen pen has one of these slugs or categories. */
  slugs?: string[];
  categories?: string[];
  questions: PenQuestion[];
}

export const YES_NO = ['Yes', 'No', 'Not sure'];
const YES_OR_UNSURE = ['Yes', 'Not sure'];

/** GLP-1 based weight medicines in the range. */
export const GLP1_PENS = ['total-body-reset', 'craving-control', 'slow-and-steady', 'momentum'];

/** In a checklist, the answer that says nothing applies. Can't be combined with other answers. */
export const NONE_OF_THESE = 'None of these';
const flagAllBut = (options: string[]) => options.filter((o) => o !== NONE_OF_THESE);
const checklist = (id: string, question: string, options: string[], hint?: string): PenQuestion => ({
  id,
  kind: 'multi',
  question,
  hint: hint ?? 'Tick everything that applies, or “None of these”.',
  options: [...options, NONE_OF_THESE],
  required: true,
  flagWhen: flagAllBut(options),
});
const CANCER_HINT = 'These peptides support tissue growth and repair, so any history of cancer matters, even if it was treated long ago.';

export const PEN_QUESTION_GROUPS: PenQuestionGroup[] = [
  // Safety checks from the PRICK clinical reference ("Understanding Peptides").
  {
    id: 'glow-up',
    title: 'Safety check: The Glow Up',
    slugs: ['the-glow-up'],
    questions: [
      {
        id: 'gu-cancer',
        kind: 'yesNo',
        question: 'Have you ever had cancer, or are you being checked for it now?',
        hint: CANCER_HINT,
        options: YES_NO,
        required: true,
        flagWhen: YES_OR_UNSURE,
      },
      checklist('gu-conditions', 'Do any of these apply to you right now?', [
        'Diabetes that isn’t well controlled',
        'An autoimmune condition (like lupus or rheumatoid arthritis)',
        'Serious liver disease',
        'Serious kidney disease',
        'An infection you’re being treated for',
        'A bleeding disorder',
        'An organ transplant',
        'Uncontrolled high blood pressure or serious heart disease',
        'An allergy to peptides or injection ingredients',
      ]),
      checklist('gu-meds', 'Do you take any of these?', [
        'Blood thinners (like warfarin or rivaroxaban)',
        'Medicine that lowers your immune system (like after a transplant)',
      ]),
      {
        id: 'gu-injections',
        kind: 'choice',
        question: 'How do you feel about giving yourself a small injection?',
        hint: 'Honest answers only. Your clinician can talk you through it.',
        options: ['Totally fine', 'A bit nervous, but keen', 'Very anxious about it'],
        required: true,
        flagWhen: ['Very anxious about it'],
      },
    ],
  },
  {
    id: 'rapid-recovery',
    title: 'Safety check: Rapid Recovery',
    slugs: ['rapid-recovery'],
    questions: [
      {
        id: 'rr-cancer',
        kind: 'yesNo',
        question: 'Have you ever had cancer, or are you being checked for it now?',
        hint: CANCER_HINT,
        options: YES_NO,
        required: true,
        flagWhen: YES_OR_UNSURE,
      },
      checklist('rr-conditions', 'Do any of these apply to you right now?', [
        'Diabetes that isn’t well controlled',
        'Diabetic eye disease (retinopathy)',
        'Serious heart disease',
        'A stroke or a blood clotting disorder',
        'An active autoimmune condition',
        'Serious liver disease',
        'Serious kidney disease',
        'An infection you’re being treated for',
        'High blood pressure that isn’t controlled',
        'You swell up or retain fluid easily',
      ]),
      checklist('rr-meds', 'Do you take any of these?', [
        'Medicine that lowers your immune system',
        'Anabolic steroids or other performance-enhancing drugs',
      ]),
    ],
  },
  {
    id: 'full-throttle',
    title: 'Safety check: Full Throttle',
    slugs: ['full-throttle'],
    questions: [
      {
        id: 'ft-cancer',
        kind: 'yesNo',
        question: 'Have you had prostate cancer, breast cancer, or any hormone-sensitive cancer?',
        hint: 'Testosterone can make these cancers grow.',
        options: YES_NO,
        required: true,
        flagWhen: YES_OR_UNSURE,
      },
      checklist('ft-conditions', 'Do any of these apply to you?', [
        'A heart attack or stroke',
        'Heart failure',
        'A blood clot (DVT or a clot in the lungs)',
        'High blood pressure that isn’t controlled',
        'A high red blood cell count (polycythaemia)',
        'Sleep apnoea that isn’t treated',
        'An enlarged prostate that makes it hard to pee',
        'Serious liver disease',
        'Serious kidney disease',
        'Diabetes treated with medicine that lowers blood sugar',
        'A history of aggression or unstable mood',
      ]),
      {
        id: 'ft-fertility',
        kind: 'choice',
        question: 'Are you trying for a baby, or want to keep that option open in the next year?',
        hint: 'Testosterone can lower sperm count and fertility.',
        options: YES_NO,
        required: true,
        flagWhen: YES_OR_UNSURE,
      },
      {
        id: 'ft-other-hormones',
        kind: 'yesNo',
        question: 'Are you using anabolic steroids or any other hormones right now?',
        options: YES_NO,
        required: true,
        flagWhen: YES_OR_UNSURE,
      },
      {
        id: 'ft-allergy',
        kind: 'yesNo',
        question: 'Have you ever reacted badly to testosterone, or to the oils in an injection?',
        options: YES_NO,
        required: true,
        flagWhen: YES_OR_UNSURE,
      },
      {
        id: 'ft-bloods',
        kind: 'choice',
        question: 'Have you had your testosterone checked with a blood test?',
        hint: 'If not, your clinician will arrange one before you start.',
        options: ['Yes, in the last 6 months', 'Yes, longer ago', 'Never'],
        required: true,
      },
    ],
  },
  {
    id: 'glp1',
    title: 'For your weight medicine',
    slugs: GLP1_PENS,
    questions: [
      {
        id: 'glp1-thyroid',
        kind: 'yesNo',
        question: 'Have you or anyone in your family had medullary thyroid cancer or MEN2?',
        hint: 'MEN2 is a rare inherited condition. If you have never heard of either, the answer is probably no.',
        options: YES_NO,
        required: true,
        flagWhen: YES_OR_UNSURE,
      },
      {
        id: 'glp1-current',
        kind: 'choice',
        question: 'Are you taking a weight-loss injection or medicine at the moment?',
        options: ['No', 'Yes, the same one', 'Yes, a different one'],
        required: true,
        flagWhen: ['Yes, the same one', 'Yes, a different one'],
      },
      {
        id: 'glp1-current-detail',
        kind: 'text',
        question: 'If you are, which one, what dose, and since when?',
        required: false,
      },
    ],
  },
  {
    id: 'weight',
    title: 'About your weight goals',
    categories: ['Weight & Body'],
    questions: [
      {
        id: 'weight-goal',
        kind: 'number',
        question: 'What weight would you like to reach? (kg)',
        hint: 'A rough number is fine. Your clinician will talk it through with you.',
        required: false,
        min: 30,
        max: 350,
      },
      {
        id: 'weight-history',
        kind: 'choice',
        question: 'Have you lost weight and put it back on before?',
        options: ['No', 'Once', 'A few times'],
        required: false,
      },
    ],
  },
  {
    id: 'skin',
    title: 'About your skin',
    categories: ['Appearance & Skin'],
    questions: [
      {
        id: 'skin-concerns',
        kind: 'multi',
        question: 'What would you most like to change?',
        options: ['Fine lines', 'Dullness', 'Pigmentation', 'Breakouts', 'Firmness', 'Even tone'],
        required: false,
      },
      {
        id: 'skin-cancer',
        kind: 'yesNo',
        question: 'Have you or a close family member had skin cancer or melanoma?',
        options: YES_NO,
        required: true,
        flagWhen: YES_OR_UNSURE,
      },
      {
        id: 'skin-procedures',
        kind: 'yesNo',
        question: 'Have you had fillers, Botox, a peel or laser in the last three months?',
        options: YES_NO,
        required: true,
      },
    ],
  },
  {
    id: 'energy',
    title: 'About your energy, sleep and recovery',
    categories: ['Energy, Sleep & Recovery'],
    questions: [
      {
        id: 'sleep-trouble',
        kind: 'choice',
        question: 'Which sounds most like your sleep?',
        options: ['Hard to fall asleep', 'Hard to stay asleep', 'I wake up tired', 'Sleep is fine'],
        required: false,
      },
      {
        id: 'shift-work',
        kind: 'yesNo',
        question: 'Do you work night shifts or irregular hours?',
        options: YES_NO,
        required: false,
      },
      {
        id: 'recent-injury',
        kind: 'text',
        question: 'Any injury or surgery in the last six months?',
        hint: 'Leave it blank if not.',
        required: false,
      },
    ],
  },
  {
    id: 'hormones',
    title: 'About your hormones and mood',
    categories: ['Hormones, Intimacy & Mind'],
    questions: [
      {
        id: 'cycle',
        kind: 'choice',
        question: 'How would you describe your cycle?',
        options: ['Regular', 'Irregular', 'No periods', 'Prefer not to say'],
        required: false,
      },
      {
        id: 'hormone-symptoms',
        kind: 'multi',
        question: 'Anything you have noticed lately?',
        options: ['Hot flushes', 'Low libido', 'Brain fog', 'Low mood', 'Poor sleep'],
        required: false,
      },
      {
        id: 'mental-health-care',
        kind: 'yesNo',
        question: 'Are you being treated for a mental health condition right now?',
        options: YES_NO,
        required: true,
        flagWhen: ['Yes'],
      },
    ],
  },
];

const BY_ID = new Map(PEN_QUESTION_GROUPS.flatMap((g) => g.questions.map((q) => [q.id, q] as const)));

export function penQuestion(id: string): PenQuestion | undefined {
  return BY_ID.get(id);
}

/** Groups that apply to the chosen pens, in a stable order. */
export function groupsFor(pens: { slug: string; category: string }[]): PenQuestionGroup[] {
  return PEN_QUESTION_GROUPS.filter((g) =>
    pens.some((p) => g.slugs?.includes(p.slug) || g.categories?.includes(p.category)),
  );
}

/** Whether an answer should be pointed out to the clinician. `multi` answers are comma separated. */
export function isFlagged(q: PenQuestion, answer: string): boolean {
  if (!q.flagWhen?.length || !answer) return false;
  const parts = q.kind === 'multi' ? splitMulti(answer) : [answer];
  return parts.some((p) => q.flagWhen!.includes(p));
}

/** Rejects answers outside the question's options or range. Returns an error message, or null. */
export function invalidAnswer(q: PenQuestion, answer: string): string | null {
  if (!answer) return q.required ? `Answer: ${q.question}` : null;
  if (q.kind === 'yesNo' || q.kind === 'choice') return q.options?.includes(answer) ? null : `Choose an option for: ${q.question}`;
  if (q.kind === 'multi') {
    const parts = splitMulti(answer);
    if (!parts.every((p) => q.options?.includes(p))) return `Choose from the options for: ${q.question}`;
    if (parts.includes(NONE_OF_THESE) && parts.length > 1) return `“${NONE_OF_THESE}” can’t go with other answers for: ${q.question}`;
    return null;
  }
  if (q.kind === 'number') {
    const n = Number(answer);
    if (!Number.isFinite(n) || (q.min !== undefined && n < q.min) || (q.max !== undefined && n > q.max)) {
      return `Enter a number from ${q.min} to ${q.max} for: ${q.question}`;
    }
  }
  return null;
}

/** `multi` answers are stored comma separated, so options never contain a comma. */
export function splitMulti(answer: string): string[] {
  return answer
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
