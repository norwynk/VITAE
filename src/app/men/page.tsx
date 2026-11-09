import type { Metadata } from 'next';
import { MenHomePage } from '@/components/MenHomePage';

const TITLE = 'PRICK for men: this one comes with a doctor';
const DESCRIPTION = 'A doctor-led South African health company with a very rude name. A private assessment first, always.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/men' },
  openGraph: { url: '/men', title: TITLE, description: DESCRIPTION },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function Men() {
  return <MenHomePage />;
}
