import Link from 'next/link';
import { SERVICE_NAME } from '@/config';
import { PublicPathways } from '@/components/PublicPathways';

export default function Home() {
  return (
    <>
      <header className="topbar">
        <div className="container">
          <Link href="/" className="brand">
            {SERVICE_NAME} <span className="muted small">(working title)</span>
          </Link>
          <Link href="/app">Sign in or start your assessment</Link>
        </div>
      </header>
      <main className="container stack">
        <section className="card">
          <h1>Care that starts with an assessment</h1>
          <p>
            Tell us about your health and goals. A registered clinician reviews your assessment before any treatment
            is considered, and you stay in touch with your care team throughout.
          </p>
          <ol>
            <li>Complete a private health assessment.</li>
            <li>Express interest in a pathway.</li>
            <li>A clinician reviews it and decides what is appropriate for you, if anything.</li>
            <li>If a plan is approved, you get reminders, check-ins and follow-up.</li>
          </ol>
          <p className="muted">
            Testing: if a clinician decides testing is appropriate, they will arrange a home kit or a designated
            location. You do not book tests yourself.
          </p>
          <Link href="/app">
            <button type="button">Start your assessment</button>
          </Link>
        </section>
        <PublicPathways />
      </main>
    </>
  );
}
