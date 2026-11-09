import type { Metadata } from 'next';
import { RoyalPrickPage } from '@/components/RoyalPrickPage';

export const metadata: Metadata = {
  title: 'The Royal Prick Experience',
  description: 'Nurse at your door, bloods tested, doctor consultation, your pen delivered and follow-ups handled. We do the heavy lifting.',
  robots: { index: false, follow: false },
};

export default function RoyalPrick() {
  return <RoyalPrickPage />;
}
