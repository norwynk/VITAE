import type { Metadata } from 'next';
import { goalBySlug } from '@/brand/goals';
import { QuizPage } from '@/components/QuizPage';

export const metadata: Metadata = { title: 'Find your prick' };

export default async function FindYourPrick({ searchParams }: { searchParams: Promise<{ goal?: string | string[] }> }) {
  const { goal } = await searchParams;
  // A goal card on the homepage skips straight past "What are you after?".
  return <QuizPage initialGoal={goalBySlug(typeof goal === 'string' ? goal : undefined)?.category} />;
}
