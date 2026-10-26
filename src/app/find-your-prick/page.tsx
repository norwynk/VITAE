import type { Metadata } from 'next';
import { goalBySlug } from '@/brand/goals';
import { QuizPage } from '@/components/QuizPage';
import { initialPens } from '@/server/catalogue';

export const metadata: Metadata = {
  title: 'Find your prick',
  description: 'A two-minute quiz that matches you with the PRICK peptide pen for what you want. A clinician always makes the final call.',
  alternates: { canonical: '/find-your-prick' },
};

export default async function FindYourPrick({ searchParams }: { searchParams: Promise<{ goal?: string | string[] }> }) {
  const { goal } = await searchParams;
  // A goal card on the homepage skips straight past "What are you after?".
  return <QuizPage initialGoal={goalBySlug(typeof goal === 'string' ? goal : undefined)?.category} initialPens={initialPens()} />;
}
