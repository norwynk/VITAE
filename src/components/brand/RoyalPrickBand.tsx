import Link from 'next/link';

/**
 * The way in to the Royal Prick Experience from the homepages.
 * It is an optional extra, so this always says a pen doesn't depend on it.
 */
export function RoyalPrickBand({ men = false }: { men?: boolean }) {
  return (
    <section className="repeat-script repeat-script--royal" aria-labelledby="royal-prick-title">
      <div className="container repeat-script__inner">
        <div className="repeat-script__body">
          <div>
            <p className="eyebrow">Want it all done for you?</p>
            <h2 id="royal-prick-title" className="display repeat-script__title">
              This prick comes to you.
            </h2>
          </div>
          <p>
            The Royal Prick Experience is our do-it-all-for-you package: a nurse at your door for your bloods, a doctor who talks you through them, your
            pen delivered if it&apos;s right for you, and every follow-up handled. You just open the door.
          </p>
          <Link href="/royal-prick" className="btn">
            Get the royal treatment
          </Link>
          <p className="royal-band__note">
            Purely optional. You don&apos;t need this package, or a blood test, to order a pen.
            {men && ' Testosterone is the one exception: your clinician needs your levels first.'}
          </p>
        </div>
        <Link href="/royal-prick#film" className="royal-band__film" aria-label="Watch the 50-second film about the Royal Prick Experience">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/video/the-royal-prick-experience.jpg" alt="" width={1920} height={1080} loading="lazy" />
          <span className="explainer__play">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
            <span>Watch · 0:50</span>
          </span>
        </Link>
      </div>
    </section>
  );
}
