import Link from 'next/link';

/**
 * The way in to the Royal Prick Experience from the homepages.
 * It is an optional extra, so this always says starting doesn't depend on it.
 */
export function RoyalPrickBand() {
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
            The Royal Prick Experience is our do-it-all-for-you package: a nurse at your door for your bloods, a doctor who talks you through
            them, and every follow-up handled. You just open the door.
          </p>
          <Link href="/royal-prick" className="btn">
            Get the royal treatment
          </Link>
          <p className="royal-band__note">Purely optional. You don&apos;t need this package, or a blood test, to get started with us.</p>
        </div>
        <Link href="/royal-prick" className="royal-band__film" aria-label="See the Royal Prick Experience">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/video/the-royal-prick-experience.jpg" alt="" width={1920} height={1080} loading="lazy" />
        </Link>
      </div>
    </section>
  );
}
