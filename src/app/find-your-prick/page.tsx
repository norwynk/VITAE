import type { Metadata } from 'next';
import { goalBySlug } from '@/brand/goals';
import { QuizPage } from '@/components/QuizPage';
import { MembersOnly } from '@/components/site/MembersOnly';

export const metadata: Metadata = { title: 'Your account', robots: { index: false, follow: false } };

export default async function FindYourPrick({ searchParams }: { searchParams: Promise<{ goal?: string | string[] }> }) {
  const { goal } = await searchParams;
  return (
    <MembersOnly>
      <QuizPage initialGoal={goalBySlug(typeof goal === 'string' ? goal : undefined)?.category} />
    </MembersOnly>
  );
}
