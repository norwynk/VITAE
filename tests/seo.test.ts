import { afterEach, describe, expect, it, vi } from 'vitest';
import RANGE from '../src/brand/range.json';

const load = async () => {
  vi.resetModules();
  return {
    robots: (await import('../src/app/robots')).default,
    sitemap: (await import('../src/app/sitemap')).default,
    config: await import('../src/config'),
  };
};

describe('search engines', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('stays out of Google until the live site has its own domain', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'live');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    const { robots, config } = await load();
    expect(config.indexable()).toBe(false);
    expect(robots().rules).toEqual({ userAgent: '*', disallow: '/' });
  });

  it('demo builds are never indexed, whatever the address', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'demo');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.prick.co.za');
    expect((await load()).config.indexable()).toBe(false);
  });

  it('with a domain: public pages are crawlable, private ones are not, and every pen is in the sitemap', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'live');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.prick.co.za/');
    const { robots, sitemap, config } = await load();
    expect(config.indexable()).toBe(true);
    const r = robots();
    expect(r.sitemap).toBe('https://www.prick.co.za/sitemap.xml');
    expect(r.rules).toMatchObject({ allow: '/', disallow: expect.arrayContaining(['/app', '/start', '/my-pens', '/api/']) });
    const urls = sitemap().map((u) => u.url);
    for (const p of RANGE.products) expect(urls).toContain(`https://www.prick.co.za/pens/${p.id}`);
    expect(urls).toContain('https://www.prick.co.za/shop');
    expect(urls).toContain('https://www.prick.co.za/men');
    expect(urls.some((u) => /\/(app|start|my-pens)/.test(u) || /total-body-reset/.test(u))).toBe(false);
  });
});
