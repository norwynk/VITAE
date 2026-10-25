'use client';
import { useState } from 'react';
import { type IntakeAnswers, NONE, isRepeatRoute, medsText } from '@/domain/intake';
import { MENOPAUSE_STAGES, SA_PROVINCES, type Treatment } from '@/domain/model';
import { groupsFor } from '@/domain/penQuestions';
import { useScreening } from '@/hooks/useScreening';
import { useShortlist } from '@/hooks/useShortlist';
import { Notice, formValues } from '../ui';
import { useWorkspace } from '../workspace-context';

const s = (a: IntakeAnswers, id: string) => (typeof a[id] === 'string' ? (a[id] as string) : '');
const list = (a: IntakeAnswers, id: string) => (Array.isArray(a[id]) ? (a[id] as string[]).filter((x) => x !== NONE) : []);

const MENOPAUSE: Record<string, (typeof MENOPAUSE_STAGES)[number]> = {
  'Before menopause': 'PRE',
  Perimenopause: 'PERI',
  'After menopause': 'POST',
  'Not sure': 'PREFER_NOT_TO_SAY',
  'Prefer not to say': 'PREFER_NOT_TO_SAY',
};
const ACTIVITY = { 'Mostly sitting': 'SEDENTARY', Light: 'LIGHT', Moderate: 'MODERATE', 'Very active': 'ACTIVE' } as const;

/** One-line diet summary for the lifestyle record. */
function diet(a: IntakeAnswers) {
  const parts = [
    ['Greens', 'dietVeg'],
    ['Fast food', 'dietFastFood'],
    ['Fried', 'dietFried'],
    ['Grains', 'dietGrains'],
    ['Sugar', 'dietSugar'],
  ]
    .filter(([, id]) => s(a, id))
    .map(([label, id]) => `${label}: ${s(a, id).toLowerCase()}`);
  return parts.join('; ').slice(0, 500);
}

/**
 * Last step, once they have an account: surname, ID, mobile and consent.
 * The questionnaire answers come from this device and are sent together.
 */
export function FinishScreening() {
  const { run, busy, workspace } = useWorkspace();
  const { state, clear } = useScreening();
  const shortlist = useShortlist();
  const [idType, setIdType] = useState<'SA_ID' | 'PASSPORT'>('SA_ID');
  const [problem, setProblem] = useState<string | null>(null);
  const a = state.answers;
  const chosen = shortlist.slugs
    .map((slug) => Object.values(workspace.store.treatments).find((t) => t.slug === slug))
    .filter((t): t is Treatment => Boolean(t));
  const female = s(a, 'sex') === 'Female';
  const repeat = isRepeatRoute(a);

  return (
    <form
      className="stack screening finish"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        for (const field of form.querySelectorAll<HTMLInputElement>('input, select')) {
          if (!field.checkValidity()) {
            field.reportValidity();
            return;
          }
        }
        setProblem(null);
        const v = formValues(form);
        const penAnswers = groupsFor(chosen).flatMap((g) => g.questions.map((q) => ({ questionId: q.id, answer: state.penAnswers[q.id] ?? '' })));
        const ok = await run(
          {
            type: 'onboard',
            profile: {
              firstName: s(a, 'firstName'),
              lastName: v.lastName,
              dateOfBirth: s(a, 'dateOfBirth'),
              identity: { type: idType, number: v.idNumber.replace(/\s/g, '') },
              phone: v.phone,
              province: s(a, 'province') as (typeof SA_PROVINCES)[number],
              city: s(a, 'city'),
            },
            body: { heightCm: Number(s(a, 'heightCm')), weightKg: Number(s(a, 'weightKg')) },
            // The repeat-script route skips goals and lifestyle: it's about verifying an existing protocol.
            goals: repeat
              ? { goals: ['Repeat an existing script'], motivation: s(a, 'protocol').slice(0, 1000) }
              : { goals: list(a, 'goals'), motivation: s(a, 'reason').slice(0, 1000) },
            health: {
              conditions: list(a, 'conditions').slice(0, 30),
              medications: medsText(a.medications),
              allergies: list(a, 'allergies').join(', ') || NONE,
              pregnancyOrBreastfeeding: female && (s(a, 'pregnant') !== 'No' || s(a, 'breastfeeding') === 'Yes'),
              previousPeptideUse: s(a, 'previousPeptides') === 'Yes',
              notes: s(a, 'healthNotes'),
              ...(female
                ? {
                    reproductiveHealth: {
                      pregnant: s(a, 'pregnant') !== 'No',
                      breastfeeding: s(a, 'breastfeeding') === 'Yes',
                      planningPregnancy: s(a, 'planningPregnancy') === 'Yes',
                      contraception: s(a, 'contraception'),
                      menopauseStage: MENOPAUSE[s(a, 'menopauseStage')] ?? 'PREFER_NOT_TO_SAY',
                    },
                  }
                : {}),
            },
            ...(repeat
              ? {}
              : {
                  lifestyle: {
                    activityLevel: ACTIVITY[s(a, 'activity') as keyof typeof ACTIVITY] ?? 'LIGHT',
                    sleepHours: Number(s(a, 'sleepHours')),
                    smoking: s(a, 'smoking') === 'Yes',
                    alcoholUnitsPerWeek: s(a, 'alcohol') === 'None' ? 0 : Math.round(Number(s(a, 'alcoholUnits') || 0)),
                    diet: diet(a),
                  },
                }),
            testingInterest: s(a, 'testingInterest') === 'Yes',
            penAnswers,
            intake: a,
            consents: {
              privacy: v.checked('consentPrivacy'),
              terms: v.checked('consentTerms'),
              healthData: v.checked('consentHealthData'),
              clinicalService: v.checked('consentClinical'),
              communications: v.checked('consentCommunications'),
              marketing: v.checked('consentMarketing'),
            },
          },
          chosen.length
            ? `Your screening is in. Your clinician will review ${chosen.map((t) => t.name).join(' and ')}.`
            : 'Your screening is in. Your clinician will suggest what could suit you.',
        );
        if (!ok) {
          setProblem('Something in your answers needs another look. The message above says what.');
          return;
        }
        for (const t of chosen) await run({ type: 'request', treatmentId: t.id, reason: 'Chosen at sign-up' }, `${t.name} sent to your clinician`);
        shortlist.clear();
        clear();
      }}
    >
      <div className="screening__head">
        <p className="eyebrow">Final stop</p>
        <h1 className="display finish__title">
          Nearly there{s(a, 'firstName') ? `, ${s(a, 'firstName')}` : ''}.
          <span className="serif-i">Your answers are saved. Just the official bits now.</span>
        </h1>
      </div>

      <fieldset>
        <legend>Your details</legend>
        <p className="muted small" style={{ marginTop: 0 }}>
          Your clinician needs these to prescribe safely and lawfully. Your ID number is never shown to delivery or support staff.
        </p>
        <div className="form-grid">
          <label>
            Last name
            <input name="lastName" required autoComplete="family-name" maxLength={80} />
          </label>
          <label>
            Identity document
            <select value={idType} onChange={(e) => setIdType(e.target.value as 'SA_ID' | 'PASSPORT')}>
              <option value="SA_ID">South African ID</option>
              <option value="PASSPORT">Passport</option>
            </select>
          </label>
          <label>
            {idType === 'SA_ID' ? 'ID number' : 'Passport number'}
            <input name="idNumber" required inputMode={idType === 'SA_ID' ? 'numeric' : 'text'} autoComplete="off" />
          </label>
          <label>
            Mobile number
            <input name="phone" type="tel" required autoComplete="tel" placeholder="+27 82 000 0000" />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Consent</legend>
        <label className="check">
          {/* One span per sentence: the label is a flex row, so loose text and links would become columns. */}
          <input type="checkbox" name="consentPrivacy" required />
          <span>
            I have read the{' '}
            <a href="/privacy" target="_blank" rel="noopener">
              privacy notice
            </a>{' '}
            (required)
          </span>
        </label>
        <label className="check">
          <input type="checkbox" name="consentTerms" required />
          <span>
            I accept the{' '}
            <a href="/terms" target="_blank" rel="noopener">
              terms of use
            </a>{' '}
            (required)
          </span>
        </label>
        <label className="check">
          <input type="checkbox" name="consentHealthData" required /> I consent to my health information being processed for my care
          (required)
        </label>
        <label className="check">
          <input type="checkbox" name="consentClinical" required /> I understand a clinician decides whether any treatment is appropriate
          (required)
        </label>
        <label className="check">
          <input type="checkbox" name="consentCommunications" /> Send me service updates and reminders by email (optional)
        </label>
        <label className="check">
          <input type="checkbox" name="consentMarketing" /> Send me news and offers (optional)
        </label>
      </fieldset>

      {problem && <Notice tone="error">{problem}</Notice>}
      <div className="row">
        <button type="submit" disabled={busy}>
          Send it to my clinician
        </button>
        <a href="/start" className="link-arrow">
          Review my answers
        </a>
      </div>
    </form>
  );
}
