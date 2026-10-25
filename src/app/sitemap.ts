import type { MetadataRoute } from 'next';
import RANGE from '@/brand/range.json';
import { siteUrl } from '@/config';

/** Every public page: the main pages, then one per pen in the range. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/shop`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/find-your-prick`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];
  return [...pages, ...RANGE.products.map((p) => ({ url: `${base}/pens/${p.id}`, changeFrequency: 'monthly' as const, priority: 0.7 }))];
}
