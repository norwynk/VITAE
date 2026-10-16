import type { Metadata } from 'next';
import { Questionnaire } from '@/components/screening/Questionnaire';

export const metadata: Metadata = { title: 'Let’s get to know each other' };

export default async function Start({ searchParams }: { searchParams: Promise<{ pen?: string | string[] }> }) {
  const { pen } = await searchParams;
  return <Questionnaire initialPen={typeof pen === 'string' ? pen : undefined} />;
}
