import Link from 'next/link';
import '@/app/happy-hormones/happy-hormones.css';

/**
 * The way in to Happy Hormones, PRICK's hormone-care sister, from the homepages.
 * Hormones aren't peptides, so this says so and sends people to their own page.
 */
export function HappyHormonesBand() {
  return (
    <section className="hh hh-band" aria-labelledby="hh-band-title">
      <div className="container hh-band__inner">
        <div>
          <span className="hh-logo">
            Happy
            <br />
            Hormones
            <svg className="hh-logo__flower" viewBox="-1.2 -1.2 2.4 2.4" aria-hidden="true">
              <g fill="currentColor">
                <circle cx="0" cy="-0.58" r="0.46" />
                <circle cx="0.55" cy="-0.18" r="0.46" />
                <circle cx="0.34" cy="0.47" r="0.46" />
                <circle cx="-0.34" cy="0.47" r="0.46" />
                <circle cx="-0.55" cy="-0.18" r="0.46" />
              </g>
              <circle r="0.3" fill="#fde7b8" />
            </svg>
          </span>
          <p className="hh-band__eyebrow">Peptides are one thing. Hormones are another.</p>
          <h2 id="hh-band-title" className="hh-band__title">
            Meet our <em>sweeter sister.</em>
          </h2>
          <p>
            Happy Hormones is hormone care from the people behind PRICK: two for her, one for him. Same screening, same doctors, same standards. Your bloods and a
            doctor&apos;s yes come first, always.
          </p>
          <Link href="/happy-hormones" className="hh-btn">
            Meet Happy Hormones
          </Link>
        </div>
        <Link href="/happy-hormones" className="hh-band__art" aria-label="Meet Happy Hormones">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hormones/hero.webp" alt="" width={1800} height={1260} loading="lazy" />
        </Link>
      </div>
    </section>
  );
}
