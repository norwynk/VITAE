import type { Metadata } from 'next';
import { AboutPage } from '@/components/AboutPage';

export const metadata: Metadata = {
  title: 'About us',
  description: 'PRICK was started by Dr Kylee Montgomerie and Norwyn K to make peptide treatment clear, human and properly guided.',
  alternates: { canonical: '/about' },
};

export default function About() {
  return <AboutPage />;
}
