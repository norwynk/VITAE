import type { Metadata } from 'next';
import RANGE from '@/brand/range.json';
import { ProductPage } from '@/components/ProductPage';
import { initialPens } from '@/server/catalogue';

type Props = { params: Promise<{ slug: string }> };

/** Title and description from the pen's own copy; pens not in the range are kept out of search. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pen = RANGE.products.find((p) => p.id === slug);
  if (!pen) return { title: 'Pen not found', robots: { index: false, follow: false } };
  const description = `${pen.front_hook} ${pen.one_line_outcome} Every pen starts with a health screening and a clinician’s review.`;
  return {
    title: `${pen.name}: ${pen.category}`,
    description,
    alternates: { canonical: `/pens/${pen.id}` },
    // Setting openGraph here replaces the site-wide one, so name the share image again.
    openGraph: { title: `${pen.name} · PRICK`, description, url: `/pens/${pen.id}`, images: ['/opengraph-image'] },
  };
}

export default async function PenPage({ params }: Props) {
  const { slug } = await params;
  return <ProductPage slug={slug} initialPens={initialPens()} />;
}
