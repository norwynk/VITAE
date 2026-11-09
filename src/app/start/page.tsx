import type { Metadata } from 'next';
import { Questionnaire } from '@/components/screening/Questionnaire';

export const metadata: Metadata = { title: 'Let’s get to know each other', robots: { index: false, follow: false } };

type Params = { goal?: string | string[]; route?: string | string[]; stop?: string | string[]; back?: string | string[] };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function Start({ searchParams }: { searchParams: Promise<Params> }) {
  const { goal, route, stop, back } = await searchParams;
  return <Questionnaire initialGoal={one(goal)} initialRoute={one(route)} initialStop={one(stop)} back={one(back) === '1'} />;
}
