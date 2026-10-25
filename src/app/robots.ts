import type { MetadataRoute } from 'next';
import { indexable, siteUrl } from '@/config';

/** Public pages are crawlable; accounts, screening and the API are not. Demo builds stay out entirely. */
export default function robots(): MetadataRoute.Robots {
  if (!indexable()) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/app', '/start', '/my-pens', '/api/'] },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
