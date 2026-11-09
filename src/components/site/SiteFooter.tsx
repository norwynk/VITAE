import Link from 'next/link';
import { publicDataMode } from '@/config';
import { Logo } from './Logo';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <Logo variant="light" className="site-footer__logo" />
        <div className="site-footer__big" aria-hidden="true">
          A prick with
          <br />
          standards.
        </div>
        <div className="site-footer__grid">
          <div>
            <p className="eyebrow">Start</p>
            <ul>
              <li><Link href="/start">Start your assessment</Link></li>
              <li><Link href="/royal-prick">The Royal Prick Experience</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">You</p>
            <ul>
              <li><Link href="/app">Account</Link></li>
              <li><Link href="/#how-it-works">How it works</Link></li>
              <li><Link href="/about">About us</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">The serious bit</p>
            <p className="small" style={{ opacity: 0.75 }}>
              Everything starts with a private health assessment and a clinician&apos;s review. If nothing is right for you,
              we&apos;ll say so.
            </p>
          </div>
        </div>
        <p className="site-footer__women">
          <span className="only-women">Designed for women.</span>
          <span className="only-men">Built for men.</span>
        </p>
        <div className="site-footer__legal">
          © {new Date().getFullYear()} PRICK.{' '}
          {publicDataMode() === 'demo'
            ? 'Preview build: everything here is fictional demo data, and nothing here is medical advice.'
            : 'Every treatment needs a clinician’s approval, and nothing on this site is medical advice.'}{' '}
          In an emergency call 10177. <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
