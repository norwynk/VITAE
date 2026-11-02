import Link from 'next/link';
import { type IntakeAnswers, answerText, sectionsFor, visibleQuestions } from '@/domain/intake';

/**
 * The questionnaire, section by section, in the words they were asked.
 * The clinician reads it; the member checks it before sending, with a way back to change each part.
 */
export function IntakeReview({ answers, open = [], changeHref }: { answers: IntakeAnswers; open?: string[]; changeHref?: (sectionId: string) => string }) {
  return (
    <div className="stack" style={{ gap: '0.4rem' }}>
      {sectionsFor(answers).map((s) => {
        const rows = visibleQuestions(s, answers)
          .map((q) => ({ q, text: answerText(q, answers[q.id]) }))
          .filter((r) => r.text);
        if (!rows.length) return null;
        return (
          <details key={s.id} open={open.includes(s.id)} className="intake-review">
            <summary>
              <strong>{s.label}</strong> <span className="muted small">· {rows.length} answered</span>
            </summary>
            <dl>
              {rows.map(({ q, text }) => (
                <div key={q.id}>
                  <dt>{q.label}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
            {changeHref && (
              <Link href={changeHref(s.id)} className="link-arrow">
                Change {s.label.toLowerCase()}
              </Link>
            )}
          </details>
        );
      })}
    </div>
  );
}
