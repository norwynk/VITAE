import type { Metadata } from 'next';
import { ProductPage } from '@/components/ProductPage';
import { MembersOnly } from '@/components/site/MembersOnly';

export const metadata: Metadata = { title: 'Your account', robots: { index: false, follow: false } };

export default async function PenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <MembersOnly>
      <ProductPage slug={slug} />
    </MembersOnly>
  );
}
