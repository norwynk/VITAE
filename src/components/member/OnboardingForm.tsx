'use client';
import { useRef, useState } from 'react';
import { penBrand } from '@/brand/pens';
import type { Treatment } from '@/domain/model';
import { MAX_SHORTLIST, useShortlist } from '@/hooks/useShortlist';
import { worldStyle } from '../brand/worldStyle';
import { MENOPAUSE_STAGES, SA_PROVINCES } from '@/domain/model';
import { Notice, formValues } from '../ui';
import { useWorkspace } from '../workspace-context';

const GOALS = ['Weight management', 'Energy', 'Sleep', 'Recovery', 'Metabolic health', 'General wellbeing'];

const STEPS = ['Your pens', 'About you', 'Your health', 'Your lifestyle', 'Consent'] as const;

/**
 * Guided screening, one topic per screen. Every field stays in the form (only
 * hidden between steps) so the whole assessment submits as one record; then
 * each chosen pen becomes its own request for the clinician.
 */
export function OnboardingForm() {
  const { run, busy, workspace } = useWorkspace();
  const shortlist = useShortlist();
  const [idType, setIdType] = useState<'SA_ID' | 'PASSPORT'>('SA_ID');
  const [problem, setProblem] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [letClinicianSuggest, setLetClinicianSuggest] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const available = Object.values(workspace.store.treatments).filter((t) => t.active && t.public);
  const chosen = shortlist.slugs.map((slug) => available.find((t) => t.slug === slug)).filter((t): t is Treatment => Boolean(t));
  const addable = available.filter((t) => !shortlist.has(t.slug));

  /** Checks only the current step's fields before moving on. */
  const stepIsValid = (n: number): boolean => {
    const form = formRef.current;
    if (!form) return false;
    if (n === 0 && !chosen.length && !letClinicianSuggest) {
      setProblem('Choose at least one pen, or let your clinician suggest one.');
      return false;
    }
    if (n === 1 && !GOALS.some((g) => (form.elements.namedItem(`goal:${g}`) as HTMLInputElement | null)?.checked)) {
      setProblem('Choose at least one goal.');
      return false;
    }
    const fields = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-step="${n}"] :is(input, select, textarea)`);
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    setProblem(null);
    return true;
  };
  const go = (n: number) => {
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <form
      ref={formRef}
      className="stack screening"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        for (let n = 0; n < STEPS.length; n++) {
          if (!stepIsValid(n)) return go(n);
        }
        const form = e.currentTarget;
        const v = formValues(form);
        const goals = GOALS.filter((g) => v.checked(`goal:${g}`));
        const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
        const onboarded = await run(
          {
            type: 'onboard',
            profile: {
              firstName: v.firstName,
              lastName: v.lastName,
              dateOfBirth: v.dateOfBirth,
              identity: { type: idType, number: v.idNumber.replace(/\s/g, '') },
              phone: v.phone,
              province: v.province as (typeof SA_PROVINCES)[number],
              city: v.city,
            },
            body: { heightCm: Number(v.heightCm), weightKg: Number(v.weightKg) },
            goals: { goals, motivation: v.motivation },
            health: {
              conditions: list(v.conditions),
              medications: v.medications,
              allergies: v.allergies,
              pregnancyOrBreastfeeding: v.checked('pregnant') || v.checked('breastfeeding'),
              previousPeptideUse: v.checked('previousPeptideUse'),
              reproductiveHealth: {
                pregnant: v.checked('pregnant'),
                breastfeeding: v.checked('breastfeeding'),
                planningPregnancy: v.checked('planningPregnancy'),
                contraception: v.contraception ?? '',
                menopauseStage: (v.menopauseStage || 'PREFER_NOT_TO_SAY') as (typeof MENOPAUSE_STAGES)[number],
              },
              notes: v.healthNotes,
            },
            lifestyle: {
              activityLevel: v.activityLevel as 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE',
              sleepHours: Number(v.sleepHours),
              smoking: v.checked('smoking'),
              alcoholUnitsPerWeek: Number(v.alcohol || 0),
              diet: v.diet,
            },
            testingInterest: v.checked('testingInterest'),
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
        if (!onboarded) return;
        for (const t of chosen) {
          await run({ type: 'request', treatmentId: t.id, reason: 'Chosen at sign-up' }, `${t.name} sent to your clinician`);
        }
        shortlist.clear();
      }}
    >
      <div ref={topRef} className="screening__head">
        <p className="eyebrow">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
        <ol className="screening__steps" aria-label="Screening steps">
          {STEPS.map((label, n) => (
            <li key={label} className={n === step ? 'is-current' : n < step ? 'is-done' : ''} aria-current={n === step ? 'step' : undefined}>
              <span>{label}</span>
            </li>
          ))}
        </ol>
        <p className="muted small" style={{ margin: 0 }}>
          This service is for adults aged 18 and over. Your answers go to your assigned clinician and are never shown to
          operations or delivery staff.
        </p>
      </div>

      <div data-step="0" hidden={step !== 0}>
        <fieldset>
          <legend>Your pens</legend>
          <p className="muted small" style={{ marginTop: 0 }}>
            Choose up to {MAX_SHORTLIST}. Each one goes to your clinician, who decides what is right for you.
          </p>
          {chosen.length > 0 && (
            <ul className="plain screening__pens">
              {chosen.map((t) => {
                const b = penBrand(t);
                return (
                  <li key={t.id} className="screening__pen" style={worldStyle(b.colours)}>
                    <span className="screening__pen-dot" />
                    <span className="screening__pen-name">{t.name}</span>
                    <span className="screening__pen-hook">{b.hook}</span>
                    <button type="button" className="secondary small" onClick={() => shortlist.remove(t.slug)} aria-label={`Remove ${t.name}`}>
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!shortlist.full && addable.length > 0 && (
            <label>
              {chosen.length ? 'Add another pen' : 'Choose a pen'}
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) shortlist.add(e.target.value);
                  setLetClinicianSuggest(false);
                }}
              >
                <option value="">Choose…</option>
                {addable.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!chosen.length && (
            <label className="check">
              <input type="checkbox" checked={letClinicianSuggest} onChange={(e) => setLetClinicianSuggest(e.target.checked)} /> Not
              sure yet. Let my clinician suggest something.
            </label>
          )}
          <p className="small" style={{ marginBottom: 0 }}>
            Not sure which? <a href="/find-your-prick">Take the quiz</a> and come back.
          </p>
        </fieldset>
      </div>

      <div data-step="1" hidden={step !== 1}>
        <fieldset>
          <legend>About you</legend>
          <div className="form-grid">
            <label>
              First name
              <input name="firstName" required autoComplete="given-name" />
            </label>
            <label>
              Last name
              <input name="lastName" required autoComplete="family-name" />
            </label>
            <label>
              Date of birth
              <input name="dateOfBirth" type="date" required />
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
              <input name="idNumber" required inputMode={idType === 'SA_ID' ? 'numeric' : 'text'} />
            </label>
            <label>
              Mobile number
              <input name="phone" type="tel" required autoComplete="tel" placeholder="+27 82 000 0000" />
            </label>
            <label>
              Province
              <select name="province" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {SA_PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              City or town
              <input name="city" required />
            </label>
            <label>
              Height (cm)
              <input name="heightCm" type="number" min={100} max={250} required />
            </label>
            <label>
              Weight (kg)
              <input name="weightKg" type="number" min={30} max={350} step="0.1" required />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Goals</legend>
          <div className="form-grid">
            {GOALS.map((g) => (
              <label key={g} className="check">
                <input type="checkbox" name={`goal:${g}`} /> {g}
              </label>
            ))}
          </div>
          <label>
            What motivates you?
            <textarea name="motivation" maxLength={1000} />
          </label>
        </fieldset>

      </div>

      <div data-step="2" hidden={step !== 2}>
        <fieldset>
          <legend>Health history</legend>
          <label>
            Conditions (comma separated)
            <input name="conditions" />
          </label>
          <label>
            Current medications
            <textarea name="medications" />
          </label>
          <label>
            Allergies
            <input name="allergies" />
          </label>
          <fieldset className="nested">
            <legend>Your body, your cycle</legend>
            <p className="muted small" style={{ margin: 0 }}>
              These matter for your safety with several pens. Only your clinician sees them.
            </p>
            <label className="check">
              <input type="checkbox" name="pregnant" /> I am pregnant or may be pregnant
            </label>
            <label className="check">
              <input type="checkbox" name="breastfeeding" /> I am breastfeeding
            </label>
            <label className="check">
              <input type="checkbox" name="planningPregnancy" /> I am planning a pregnancy in the next 12 months
            </label>
            <div className="form-grid">
              <label>
                Contraception (if any)
                <input name="contraception" placeholder="e.g. pill, IUD, none" />
              </label>
              <label>
                Menopause stage
                <select name="menopauseStage" defaultValue="PREFER_NOT_TO_SAY">
                  <option value="PRE">Before menopause</option>
                  <option value="PERI">Perimenopause</option>
                  <option value="POST">After menopause</option>
                  <option value="NOT_APPLICABLE">Not applicable to me</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </label>
            </div>
          </fieldset>
          <label className="check">
            <input type="checkbox" name="previousPeptideUse" /> I have used peptide or injectable treatments before
          </label>
          <label>
            Anything else your clinician should know
            <textarea name="healthNotes" />
          </label>
        </fieldset>

      </div>

      <div data-step="3" hidden={step !== 3}>
        <fieldset>
          <legend>Lifestyle</legend>
          <div className="form-grid">
            <label>
              Activity level
              <select name="activityLevel" defaultValue="LIGHT">
                <option value="SEDENTARY">Mostly sitting</option>
                <option value="LIGHT">Light</option>
                <option value="MODERATE">Moderate</option>
                <option value="ACTIVE">Very active</option>
              </select>
            </label>
            <label>
              Average sleep (hours)
              <input name="sleepHours" type="number" min={0} max={24} step="0.5" required />
            </label>
            <label>
              Alcohol units per week
              <input name="alcohol" type="number" min={0} max={200} defaultValue={0} />
            </label>
            <label>
              Diet
              <input name="diet" placeholder="e.g. mixed, vegetarian" />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" name="smoking" /> I smoke or vape
          </label>
        </fieldset>

        <fieldset>
          <legend>Testing</legend>
          <p className="muted small">
            You do not book tests here. A clinician will determine whether testing is appropriate and, if it is, arrange a
            home kit or a designated location.
          </p>
          <label className="check">
            <input type="checkbox" name="testingInterest" /> I am open to testing if my clinician recommends it
          </label>
        </fieldset>

      </div>

      <div data-step="4" hidden={step !== 4}>
        <fieldset>
          <legend>Consent</legend>
          <Notice tone="warn">
            Draft wording: final privacy, terms and clinical consent text has not been legally approved yet.
          </Notice>
          <label className="check">
            <input type="checkbox" name="consentPrivacy" required /> I have read the privacy notice (required)
          </label>
          <label className="check">
            <input type="checkbox" name="consentTerms" required /> I accept the terms of use (required)
          </label>
          <label className="check">
            <input type="checkbox" name="consentHealthData" required /> I consent to my health information being processed
            for my care (required)
          </label>
          <label className="check">
            <input type="checkbox" name="consentClinical" required /> I understand a clinician decides whether any treatment
            is appropriate (required)
          </label>
          <label className="check">
            <input type="checkbox" name="consentCommunications" /> Send me service updates and reminders by email (optional)
          </label>
          <label className="check">
            <input type="checkbox" name="consentMarketing" /> Send me news and offers (optional)
          </label>
        </fieldset>

      </div>

      {problem && <Notice tone="error">{problem}</Notice>}
      <div className="screening__nav">
        {step > 0 && (
          <button type="button" className="secondary" onClick={() => go(step - 1)}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={() => stepIsValid(step) && go(step + 1)}>
            Next: {STEPS[step + 1]}
          </button>
        ) : (
          <button type="submit" disabled={busy}>
            Submit screening
          </button>
        )}
      </div>
    </form>
  );
}
