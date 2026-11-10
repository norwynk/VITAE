import type { Metadata } from 'next';
import { PrickListPage } from '@/components/PrickListPage';

export const metadata: Metadata = {
  title: 'The Prick List',
  description: 'Get on the list. Be first to hear what PRICK is up to. No spam, no stranger danger.',
  alternates: { canonical: '/the-prick-list' },
};

type Params = { from?: string | string[]; utm_source?: string | string[] };
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

/** Bios link here with ?from=instagram (or a utm_source), so every sign-up says where it came from. */
export default async function ThePrickList({ searchParams }: { searchParams: Promise<Params> }) {
  const { from, utm_source } = await searchParams;
  return <PrickListPage source={one(from) || one(utm_source)} />;
}
