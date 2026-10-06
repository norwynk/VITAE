/**
 * Static preview of the PRICK customer pages (home, shop, product pages, quiz).
 * Uses the real page components; accounts and screening need the live server.
 */
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { HomePage } from '@/components/HomePage';
import { ProductPage } from '@/components/ProductPage';
import { QuizPage } from '@/components/QuizPage';
import { ShopPage } from '@/components/ShopPage';
import { BrandPage } from '@/components/site/BrandPage';
import Link from 'next/link';

const DEEP_LINKS: Record<string, string> = {
  shop: '/shop',
  quiz: '/find-your-prick',
  'the-glow-up': '/pens/the-glow-up',
  'total-body-reset': '/pens/total-body-reset',
  'deep-sleep-rebuild': '/pens/deep-sleep-rebuild',
  'sharp-mind': '/pens/sharp-mind',
};

function NotInPreview() {
  return (
    <BrandPage>
      <section className="page-hero container">
        <p className="eyebrow">Preview</p>
        <h1 className="display">Next stop: screening.</h1>
        <p className="serif-i page-hero__sub">Accounts and health screening run on the live site, so they aren&apos;t part of this preview.</p>
        <Link href="/" className="btn">Back to the pens</Link>
      </section>
    </BrandPage>
  );
}

function App() {
  const [path, setPath] = useState(() => DEEP_LINKS[location.hash.slice(1)] ?? '/');
  useEffect(() => {
    const onNav = (e: Event) => {
      const href = (e as CustomEvent<string>).detail;
      const [route, anchor] = href.split('#');
      setPath(route || '/');
      requestAnimationFrame(() => {
        const target = anchor && document.getElementById(anchor);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        else window.scrollTo(0, 0);
      });
    };
    window.addEventListener('preview-nav', onNav);
    return () => window.removeEventListener('preview-nav', onNav);
  }, []);
  const route = path.split('?')[0];
  if (route === '/shop') return <ShopPage key={path} />;
  if (route === '/find-your-prick') return <QuizPage key={path} />;
  if (route.startsWith('/pens/')) return <ProductPage key={path} slug={route.slice(6)} />;
  if (route === '/app') return <NotInPreview key={path} />;
  return <HomePage key={path} />;
}

document.documentElement.classList.add('js');
createRoot(document.getElementById('root')!).render(<App />);
