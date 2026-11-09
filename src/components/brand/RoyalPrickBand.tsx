import Link from 'next/link';

/** The way in to the Royal Prick Experience from the homepages. */
export function RoyalPrickBand() {
  return (
    <section className="repeat-script repeat-script--royal" aria-labelledby="royal-prick-title">
      <div className="container repeat-script__inner">
        <div>
          <p className="eyebrow">New to all this?</p>
          <h2 id="royal-prick-title" className="display repeat-script__title">
            This prick comes to you.
          </h2>
        </div>
        <div className="repeat-script__body">
          <p>
            The Royal Prick Experience: a nurse at your door for your bloods, a doctor who talks you through them, your pen delivered if it&apos;s
            right for you, and every follow-up handled. You just open the door.
          </p>
          <Link href="/royal-prick" className="btn">
            Get the royal treatment
          </Link>
        </div>
      </div>
    </section>
  );
}
