'use client';
import { useState } from 'react';
import { SA_PROVINCES } from '@/domain/model';
import { Notice, formValues } from '../ui';
import { useWorkspace } from '../workspace-context';

const GOALS = ['Weight management', 'Energy', 'Sleep', 'Recovery', 'Metabolic health', 'General wellbeing'];

export function OnboardingForm() {
  const { run, busy } = useWorkspace();
  const [idType, setIdType] = useState<'SA_ID' | 'PASSPORT'>('SA_ID');
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const v = formValues(form);
        const goals = GOALS.filter((g) => v.checked(`goal:${g}`));
        if (!goals.length) return setProblem('Choose at least one goal.');
        setProblem(null);
        const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
        await run(
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
              pregnancyOrBreastfeeding: v.checked('pregnancy'),
              previousPeptideUse: v.checked('previousPeptideUse'),
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
          'Your assessment is complete. A clinician will review any pathway you request.',
        );
      }}
    >
      <section className="card">
        <h1>Your health assessment</h1>
        <p className="muted">
          This service is for adults aged 18 and over. Your answers go to your assigned clinician and are never shown to
          operations or delivery staff.
        </p>
      </section>

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
        <label className="check">
          <input type="checkbox" name="pregnancy" /> I am pregnant, may be pregnant, or am breastfeeding
        </label>
        <label className="check">
          <input type="checkbox" name="previousPeptideUse" /> I have used peptide or injectable treatments before
        </label>
        <label>
          Anything else your clinician should know
          <textarea name="healthNotes" />
        </label>
      </fieldset>

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

      {problem && <Notice tone="error">{problem}</Notice>}
      <div>
        <button type="submit" disabled={busy}>
          Submit assessment
        </button>
      </div>
    </form>
  );
}
