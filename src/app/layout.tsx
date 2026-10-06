import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SERVICE_NAME } from '@/config';
import './globals.css';

export const metadata: Metadata = {
  title: `${SERVICE_NAME} (working title)`,
  description: 'Assessment-led, clinician-reviewed care pathways. Early foundation, not a live clinical service.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA">
      <body>
        <div className="banner">
          <div className="container">
            Early foundation only. This is not a commissioned clinical service or a medicine shop. Treatments shown are
            fictional demo pathways and nothing here can be bought.
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
