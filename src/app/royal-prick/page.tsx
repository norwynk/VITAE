import type { Metadata } from 'next';
import { RoyalPrickPage } from '@/components/RoyalPrickPage';

export const metadata: Metadata = {
  title: 'The Royal Prick Experience',
  description: 'Nurse at your door, bloods tested, doctor consultation and follow-ups handled. We do the heavy lifting.',
  alternates: { canonical: '/royal-prick' },
};

export default function RoyalPrick() {
  return <RoyalPrickPage />;
}
