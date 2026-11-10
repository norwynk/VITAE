'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Side } from '@/brand/side';
import { walkThrough } from '@/hooks/useSide';
import { Logo } from './Logo';

const LINKS = [
  { href: '/#protocols', label: 'Peptide protocols' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/royal-prick', label: 'Royal Prick' },
  { href: '/about', label: 'About us' },
];

/**
 * Switch sides. Both links are always rendered and CSS shows the right one
 * (html[data-side]), so the label is right from the first paint.
 */
function SideSwitch({ className, onDone }: { className?: string; onDone?: () => void }) {
  const router = useRouter();
  const path = usePathname();
  const to = (side: Side) => () => {
    walkThrough(side, path, router.push);
    onDone?.();
  };
  return (
    <>
      <button type="button" className={`side-switch only-women${className ? ` ${className}` : ''}`} onClick={to('men')}>
        For men
      </button>
      <button type="button" className={`side-switch only-men${className ? ` ${className}` : ''}`} onClick={to('women')}>
        For women
      </button>
    </>
  );
}

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
          <SideSwitch />
          <Link href="/app" className="link-arrow site-nav__pens">
            Account
          </Link>
          {cta && (
            <Link href="/start" className="btn small">
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
        <SideSwitch className="mobile-menu__switch" onDone={() => setOpen(false)} />
      </nav>
    </header>
  );
}
