import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Anton, Caveat, DM_Sans, Instrument_Serif } from 'next/font/google';
import { SERVICE_NAME } from '@/config';
import './globals.css';

const display = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display-loaded', display: 'swap' });
const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-serif-loaded', display: 'swap' });
const sans = DM_Sans({ subsets: ['latin'], variable: '--font-sans-loaded', display: 'swap' });
const hand = Caveat({ subsets: ['latin'], variable: '--font-hand-loaded', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `${SERVICE_NAME}: more good days`, template: `%s · ${SERVICE_NAME}` },
  description: 'Peptide pens for more of what you want from your days. Clinician-guided and personalised.',
  robots: { index: false, follow: false },
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
      </head>
      <body>
        <div className="demo-bar">
          Preview build. Pens shown are fictional demo products and can&apos;t be bought yet.
        </div>
        {children}
      </body>
    </html>
  );
}
