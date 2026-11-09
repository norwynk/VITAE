'use client';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { RepositoryError, summonRoyalPrick } from '@/services/repository';

const BAD_DETAILS = ['invalid-argument', 'functions/invalid-argument', 'INVALID'];

/** Asks us to phone them about the Royal Prick. Contact details only: health answers belong in the assessment. */
export function RoyalSummonsForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const field = (name: string) => String(data.get(name) ?? '');
    setState('sending');
    setError('');
    try {
      await summonRoyalPrick({ name: field('name'), phone: field('phone'), area: field('area'), website: field('website') });
      setState('sent');
    } catch (err) {
      setState('idle');
      setError(err instanceof RepositoryError && BAD_DETAILS.includes(err.code ?? '') ? err.message : 'That didn’t go through. Please try again.');
    }
  };

  if (state === 'sent') {
    return (
      <div id="summon" className="summons" role="status">
        <p className="summons__done">Summons received.</p>
        <p>Someone from PRICK will phone you to set it all up.</p>
      </div>
    );
  }

  return (
    <form id="summon" className="summons" onSubmit={submit}>
      <label>
        Your name
        <input name="name" autoComplete="name" required minLength={2} maxLength={80} />
      </label>
      <label>
        Mobile number
        <input name="phone" type="tel" autoComplete="tel" required minLength={9} maxLength={24} />
      </label>
      <label>
        Suburb or town
        <input name="area" autoComplete="address-level2" required minLength={2} maxLength={120} />
      </label>
      <div className="summons__trap" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && <p role="alert" className="summons__error">{error}</p>}
      <button type="submit" className="btn light" disabled={state === 'sending'}>
        {state === 'sending' ? 'Summoning…' : 'Summon the Royal Prick'}
      </button>
      <p className="small">
        No health details needed here. We&apos;ll only use these to phone you about the Royal Prick. <Link href="/privacy">Privacy</Link>
      </p>
    </form>
  );
}
