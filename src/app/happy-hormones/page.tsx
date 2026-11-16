import type { Metadata } from 'next';
import { HappyHormonesPage } from '@/components/HappyHormonesPage';
import './happy-hormones.css';

export const metadata: Metadata = {
  title: 'Happy Hormones',
  description: 'Doctor-prescribed hormone care for women and men, from the people behind PRICK. Bloods first, then a doctor’s yes. A nurse can come to you.',
  alternates: { canonical: '/happy-hormones' },
};

export default function HappyHormones() {
  return <HappyHormonesPage />;
}
