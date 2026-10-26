import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Anton, Caveat, DM_Sans, Fraunces } from 'next/font/google';
import { SIDE_KEY } from '@/brand/sides';
import { SERVICE_NAME, indexable, publicDataMode, siteUrl } from '@/config';
import './globals.css';

const display = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display-loaded', display: 'swap' });
// Easy to read at any size, with a soft, characterful italic.
const serif = Fraunces({ style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-serif-loaded', display: 'swap' });
const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans-loaded', display: 'swap' });
const hand = Caveat({ subsets: ['latin'], variable: '--font-hand-loaded', display: 'swap' });

const DESCRIPTION = 'Peptide pens for women and men from a SAHPRA-licensed, batch-tested source, with a clinician behind every one. Screening first, always.';

/**
 * Before first paint: the side they chose (the theme), the doors if they
 * haven't chosen, and the men's homepage for men who come back to "/".
 */
const SIDE_SCRIPT = `try{var h=document.documentElement,p=location.pathname,s=localStorage.getItem('${SIDE_KEY}');if(p==='/men')s='men';if(s==='men'&&p==='/'){location.replace('/men'+location.search)}if(s==='men'||s==='women')h.dataset.side=s;else h.classList.add('choose-side')}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SERVICE_NAME}: not all pricks are created equal`, template: `%s · ${SERVICE_NAME}` },
  description: DESCRIPTION,
  applicationName: SERVICE_NAME,
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: SERVICE_NAME, statusBarStyle: 'default' },
  // Only the live site is indexed; demo and preview builds stay out of search results.
  robots: indexable() ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: SERVICE_NAME,
    locale: 'en_ZA',
    url: '/',
    title: `${SERVICE_NAME}: not all pricks are created equal`,
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: `${SERVICE_NAME}: not all pricks are created equal`, description: DESCRIPTION },
};

/** Who we are, for search engines. */
const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SERVICE_NAME,
  url: siteUrl(),
  logo: `${siteUrl()}/brand/prick-logo.png`,
  description: DESCRIPTION,
  areaServed: 'ZA',
};

export const viewport: Viewport = { themeColor: '#fbf6ee' };

// Pages are cached by the hosting CDN; refresh them every minute so updates reach everyone quickly.
export const revalidate = 60;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA" suppressHydrationWarning className={`${display.variable} ${serif.variable} ${sans.variable} ${hand.variable}`}>
      <head>
        {/* Scroll reveals only hide content once JavaScript is running. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <script dangerouslySetInnerHTML={{ __html: SIDE_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }} />
      </head>
      <body>
        {publicDataMode() === 'demo' && (
          <div className="demo-bar">Preview build. Pens shown are fictional demo products and can&apos;t be bought yet.</div>
        )}
        {children}
      </body>
    </html>
  );
}
