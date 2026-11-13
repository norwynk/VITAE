import type { Metadata } from 'next';
import { HappyHormonesPage } from '@/components/HappyHormonesPage';
import './happy-hormones.css';

export const metadata: Metadata = {
  title: 'Happy Hormones',
  description: 'Doctor-prescribed hormone care for women and men, from the people behind PRICK. Screening and a doctor’s yes first, always.',
  // Out of search results until the medicines attorney has signed off the wording.
  robots: { index: false, follow: false },
};

export default function HappyHormones() {
  return <HappyHormonesPage />;
}
