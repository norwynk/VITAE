'use client';
import Link from 'next/link';
import { ScrollFilm } from './ScrollFilm';

const VIDEO = '/video/dont-take-pricks-from-strangers.mp4';
const POSTER = '/video/dont-take-pricks-from-strangers.jpg';

/**
 * "Don't take pricks from strangers": the 40-second animated explainer,
 * straight under the hero on both homepages. It plays by itself when scrolled to.
 */
export function Explainer() {
  return (
    <section className="explainer section" aria-labelledby="explainer-title">
      <div className="container explainer__grid">
        <div className="explainer__copy" data-reveal>
          <h2 id="explainer-title" className="display explainer__title">
            Don&apos;t take pricks
            <br />
            from strangers.
          </h2>
          <p className="serif-i explainer__lead">Know where you&apos;re getting your peptides from.</p>
          <Link href="/start" className="btn">
            Find your prick
          </Link>
        </div>
        <div className="explainer__phone" data-reveal style={{ '--delay': '150ms' } as React.CSSProperties}>
          <ScrollFilm
            className="explainer__video"
            src={VIDEO}
            poster={POSTER}
            width={720}
            height={1280}
            length="0:39"
            label="Don't take pricks from strangers: a 40-second animated film about PRICK, with captions"
          />
        </div>
      </div>
    </section>
  );
}
