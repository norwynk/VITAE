import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__big" aria-hidden="true">
          More good
          <br />
          days.
        </div>
        <div className="site-footer__grid">
          <div>
            <p className="eyebrow">Shop</p>
            <ul>
              <li><Link href="/shop">All pens</Link></li>
              <li><Link href="/find-your-prick">Find your prick</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">You</p>
            <ul>
              <li><Link href="/app">Account</Link></li>
              <li><Link href="/#how-it-works">How it works</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">The serious bit</p>
            <p className="small" style={{ opacity: 0.75 }}>
              Every pen starts with a health screening and a clinician&apos;s review. If a pen isn&apos;t right for you,
              we&apos;ll say so.
            </p>
          </div>
        </div>
        <div className="site-footer__legal">
          © {new Date().getFullYear()} PRICK. Preview build: products are fictional demos, not available to buy, and
          nothing here is medical advice. In an emergency call 10177.
        </div>
      </div>
    </footer>
  );
}
