'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';

const VIDEO = '/video/dont-take-pricks-from-strangers.mp4';
const POSTER = '/video/dont-take-pricks-from-strangers.jpg';

/**
 * "Don't take pricks from strangers": the 40-second animated explainer,
 * straight under the hero on both homepages. Nothing downloads until they
 * press play (the cover is a still), and it plays with sound and captions.
 */
export function Explainer() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const play = () => {
    setPlaying(true);
    void video.current?.play();
  };
  return (
    <section className="explainer section" aria-labelledby="explainer-title">
      <div className="container explainer__grid">
        <div className="explainer__copy" data-reveal>
          <p className="eyebrow">PRICK in 40 seconds</p>
          <h2 id="explainer-title" className="display explainer__title">
            Don&apos;t take pricks
            <br />
            from strangers.
          </h2>
          <p className="serif-i explainer__lead">
            A tiny film about a big idea: know who you&apos;re getting your peptides from, and get a clinician&apos;s yes
            before anything gets near you.
          </p>
          <p className="hand explainer__note">grab a coffee, it&apos;s short</p>
          <Link href="/find-your-prick" className="btn">
            Find your prick
          </Link>
        </div>
        <div className="explainer__phone" data-reveal style={{ '--delay': '150ms' } as React.CSSProperties}>
          <video
            ref={video}
            className="explainer__video"
            src={VIDEO}
            poster={POSTER}
            preload="none"
            playsInline
            controls={playing}
            onEnded={() => setPlaying(false)}
            width={720}
            height={1280}
            aria-label="Don't take pricks from strangers: a 40-second animated film about PRICK, with captions"
          />
          {!playing && (
            <button type="button" className="explainer__play" onClick={play} aria-label="Play the film, 40 seconds, with sound">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
              <span>Play · 0:39</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
