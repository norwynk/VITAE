/**
 * Safety flags a clinician sees before deciding on a pen: flagged answers to
 * the pen's own safety check, a safety check that was never answered, and
 * health-history answers that matter for any pen. A flag never decides; it
 * points the clinician at an answer.
 *
 * Draft clinical content: a clinician must review these rules before launch.
 */
import type { IntakeAnswers } from './intake';
import type { PenAnswer, Store, Treatment } from './model';
import { GLP1_PENS, groupsFor } from './penQuestions';

/** The newest answer to every pen question this member has answered, from any screening. */
export function latestPenAnswers(store: Store, memberId: string): Map<string, PenAnswer> {
  const assessments = Object.values(store.healthAssessments)
    .filter((a) => a.memberId === memberId && a.penAnswers?.length)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  return new Map(assessments.flatMap((a) => a.penAnswers!).map((a) => [a.questionId, a]));
}

/** The newest full questionnaire this member sent. */
export function latestIntake(store: Store, memberId: string): IntakeAnswers | undefined {
  return Object.values(store.healthAssessments)
    .filter((a) => a.memberId === memberId && a.intake)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0]?.intake?.answers;
}

const has = (a: IntakeAnswers | undefined, id: string, value: string) => {
  const v = a?.[id];
  return Array.isArray(v) ? (v as unknown[]).includes(value) : v === value;
};

/** Health-history answers worth pointing out, for the given pen. */
function historyFlags(store: Store, memberId: string, treatment: Treatment): string[] {
  const a = latestIntake(store, memberId);
  const conditions = store.medicalHistories[memberId]?.conditions ?? [];
  const condition = (c: string) => conditions.includes(c) || has(a, 'conditions', c);
  const glp1 = GLP1_PENS.includes(treatment.slug);
  return [
    condition('Cancer (now or in the past)') && 'Has had cancer, or has it now (health history)',
    has(a, 'familyHistory', 'Cancer') && 'Cancer runs in the family (family history)',
    has(a, 'familyHistory', 'Medullary thyroid cancer or MEN2') &&
      `Family history of medullary thyroid cancer or MEN2${glp1 ? ': a warning for GLP-1 medicines' : ''}`,
    glp1 && condition('Pancreatitis (now or in the past)') && 'Pancreatitis now or in the past (health history)',
    glp1 && condition('Eating disorder (now or in the past)') && 'Eating disorder now or in the past (health history)',
    (has(a, 'pregnant', 'Yes') || has(a, 'pregnant', 'Not sure')) && `Pregnant or might be (answered “${a?.pregnant}”)`,
    has(a, 'breastfeeding', 'Yes') && 'Breastfeeding',
    has(a, 'planningPregnancy', 'Yes') && 'Planning a pregnancy in the next 12 months',
  ].filter((f): f is string => Boolean(f));
}

export interface SafetyFlags {
  /** Flagged answers to this pen's own safety check, in the words asked. */
  answers: PenAnswer[];
  /** Required safety questions for this pen that were never answered. */
  unanswered: string[];
  /** Health-history answers that matter for this pen. */
  history: string[];
}

export function safetyFlags(store: Store, memberId: string, treatment: Treatment): SafetyFlags {
  const answered = latestPenAnswers(store, memberId);
  const questions = groupsFor([treatment]).flatMap((g) => g.questions);
  return {
    answers: questions.map((q) => answered.get(q.id)).filter((a): a is PenAnswer => Boolean(a?.flagged)),
    unanswered: questions.filter((q) => q.required && !answered.get(q.id)?.answer).map((q) => q.question),
    history: historyFlags(store, memberId, treatment),
  };
}

export function flagCount(f: SafetyFlags): number {
  return f.answers.length + f.unanswered.length + f.history.length;
}
