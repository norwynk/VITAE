import { ProductPage } from '@/components/ProductPage';

export default async function PenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductPage slug={slug} />;
}
