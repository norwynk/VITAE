import Link from 'next/link';

/** The second way in: people already on a prescribed treatment. A clinician still verifies the script first. */
export function RepeatScriptBand() {
  return (
    <section className="repeat-script" aria-labelledby="repeat-script-title">
      <div className="container repeat-script__inner">
        <div>
          <p className="eyebrow">Already on a prescribed treatment?</p>
          <h2 id="repeat-script-title" className="display repeat-script__title">
            Repeat your script.
          </h2>
        </div>
        <div className="repeat-script__body">
          <p>
            You know your treatment and your doses. You don&apos;t need to start from scratch: tell us what you&apos;re on and who prescribed it,
            answer a few safety questions, and our clinician verifies your script before anything is sent.
          </p>
          <Link href="/start?route=repeat" className="btn">
            Repeat my script
          </Link>
        </div>
      </div>
    </section>
  );
}
