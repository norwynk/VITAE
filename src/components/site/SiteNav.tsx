'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';

const LINKS = [
  { href: '/shop', label: 'The pens' },
  { href: '/find-your-prick', label: 'Find yours' },
  { href: '/#how-it-works', label: 'How it works' },
];

export function SiteNav({ cta = true }: { cta?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`site-nav${scrolled || open ? ' scrolled' : ''}`}>
      <div className="container site-nav__inner">
        <nav className="site-nav__links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <Logo />
        <div className="site-nav__end">
          <Link href="/app" className="link-arrow">
            Account
          </Link>
          {cta && (
            <Link href="/find-your-prick" className="btn small">
              Find your prick
            </Link>
          )}
        </div>
        <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
      <nav id="mobile-menu" className={`mobile-menu${open ? ' open' : ''}`} aria-label="Mobile">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        <Link href="/app" onClick={() => setOpen(false)}>
          Account
        </Link>
      </nav>
    </header>
  );
}
