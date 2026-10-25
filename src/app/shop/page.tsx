import type { Metadata } from 'next';
import { ShopPage } from '@/components/ShopPage';
import { initialPens } from '@/server/catalogue';

export const metadata: Metadata = {
  title: 'Meet the pricks',
  description: 'The full PRICK range of peptide pens for weight, skin, energy, sleep, recovery and hormones. Every pen starts with a health screening and a clinician’s review.',
  alternates: { canonical: '/shop' },
};

export default function Shop() {
  return <ShopPage initialPens={initialPens()} />;
}
