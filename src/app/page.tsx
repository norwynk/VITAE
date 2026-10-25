import type { Metadata } from 'next';
import { HomePage } from '@/components/HomePage';
import { initialPens } from '@/server/catalogue';

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function Home() {
  return <HomePage initialPens={initialPens()} />;
}
