'use client';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { RepositoryError, joinPrickList } from '@/services/repository';
import { BrandPage } from './site/BrandPage';

const BAD_DETAILS = ['invalid-argument', 'functions/invalid-argument', 'INVALID'];

/**
 * Where every social bio points. A first name, one way to reach them and
 * their permission. No health questions, nothing to buy.
 */
export function PrickListPage({ source }: { source: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const field = (name: string) => String(data.get(name) ?? '');
    setState('sending');
    setError('');
    try {
      await joinPrickList({
        name: field('name'),
        contact: field('contact'),
        // The box is required on the page and checked again on the server.
        consent: (data.get('consent') === 'on') as true,
        source,
        website: field('website'),
      });
      setState('sent');
    } catch (err) {
      setState('idle');
      setError(err instanceof RepositoryError && BAD_DETAILS.includes(err.code ?? '') ? err.message : 'That didn’t go through. Please try again.');
    }
  };

  return (
    <BrandPage doors={false}>
      <section className="prick-list section">
        <div className="container prick-list__grid">
          <div>
            <p className="eyebrow">The Prick List</p>
            <h1 className="display prick-list__title">
              Get on
              <br />
              the list.
              <span className="serif-i">Every good prick has a following.</span>
            </h1>
            <p className="prick-list__lead">
              Be first to hear what we&apos;re up to, when spots open, and the odd thing that&apos;ll make you laugh. No spam. No stranger
              danger. Leave whenever you like.
            </p>
          </div>

          {state === 'sent' ? (
            <div className="summons prick-list__form" role="status">
              <p className="summons__done">You&apos;re on the list.</p>
              <p>Welcome to the good kind of prick. We&apos;ll be in touch.</p>
              <p className="small">
                Ready now? <Link href="/start">Find your prick</Link>.
              </p>
            </div>
          ) : (
            <form className="summons prick-list__form" onSubmit={submit}>
              <label>
                First name
                <input name="name" autoComplete="given-name" required minLength={2} maxLength={60} />
              </label>
              <label>
                Email or WhatsApp number
                <input name="contact" autoComplete="email" required minLength={5} maxLength={120} />
              </label>
              <label className="prick-list__consent">
                <input type="checkbox" name="consent" required />
                <span>Yes, PRICK may email or WhatsApp me. I can leave any time.</span>
              </label>
              <div className="summons__trap" aria-hidden="true">
                <label>
                  Website
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              {error && (
                <p role="alert" className="summons__error">
                  {error}
                </p>
              )}
              <button type="submit" className="btn light" disabled={state === 'sending'}>
                {state === 'sending' ? 'Adding you…' : 'Put me on the list'}
              </button>
              <p className="small">
                No health questions here. We only use this to keep in touch. <Link href="/privacy">Privacy</Link>
              </p>
            </form>
          )}
        </div>
      </section>
    </BrandPage>
  );
}
