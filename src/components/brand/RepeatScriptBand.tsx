import Link from 'next/link';

/**
 * The second way in: people already on a prescribed peptide protocol who
 * want to repeat it. A clinician still verifies the script first.
 */
export function RepeatScriptBand() {
  return (
    <section className="repeat-script" aria-labelledby="repeat-script-title">
      <div className="container repeat-script__inner">
        <div>
          <p className="eyebrow">Already on peptides?</p>
          <h2 id="repeat-script-title" className="display repeat-script__title">
            Repeat your script.
          </h2>
        </div>
        <div className="repeat-script__body">
          <p>
            You know your peptides, your doses and your markers. You don&apos;t need to start from scratch: tell us your current
            protocol and who prescribed it, answer a few safety questions, and our clinician verifies your script before your pens
            are sent.
          </p>
          <Link href="/start?route=repeat" className="btn">
            Repeat my script
          </Link>
        </div>
      </div>
    </section>
  );
}
