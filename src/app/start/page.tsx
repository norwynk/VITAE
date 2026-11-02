import type { Metadata } from 'next';
import { Questionnaire } from '@/components/screening/Questionnaire';
import { initialPens } from '@/server/catalogue';

export const metadata: Metadata = { title: 'Let’s get to know each other', robots: { index: false, follow: false } };

type Params = { pen?: string | string[]; goal?: string | string[]; route?: string | string[]; stop?: string | string[]; back?: string | string[] };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function Start({ searchParams }: { searchParams: Promise<Params> }) {
  const { pen, goal, route, stop, back } = await searchParams;
  return (
    <Questionnaire
      initialPen={one(pen)}
      initialGoal={one(goal)}
      initialRoute={one(route)}
      initialStop={one(stop)}
      back={one(back) === '1'}
      initialPens={initialPens()}
    />
  );
}
