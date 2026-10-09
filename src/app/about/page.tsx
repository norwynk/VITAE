import type { Metadata } from 'next';
import { AboutPage } from '@/components/AboutPage';

export const metadata: Metadata = { title: 'About us' };

export default function About() {
  return <AboutPage />;
}
