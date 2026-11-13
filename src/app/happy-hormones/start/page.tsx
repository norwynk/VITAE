import type { Metadata } from 'next';
import { Questionnaire } from '@/components/screening/Questionnaire';
import '../happy-hormones.css';

export const metadata: Metadata = { title: 'Happy Hormones: let’s get to know each other', robots: { index: false, follow: false } };

type Params = { stop?: string | string[]; back?: string | string[] };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

/** The Happy Hormones screening: the same questions as PRICK, its own look, and a bloods stop that's never skipped. */
export default async function HappyHormonesStart({ searchParams }: { searchParams: Promise<Params> }) {
  const { stop, back } = await searchParams;
  return <Questionnaire pathway="happy-hormones" initialStop={one(stop)} back={one(back) === '1'} />;
}
