'use client';
import Link from 'next/link';
import { BrandPage } from './site/BrandPage';

/** Founders' story, in their own words. */
export function AboutPage() {
  return (
    <BrandPage>
      <section className="about-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/team/founders.jpg" alt="Dr Kylee Montgomerie and Norwyn K, co-founders of PRICK" width={1672} height={941} />
      </section>
      <article className="about container">
        <p className="eyebrow">About us</p>
        <h1 className="display about__title">
          Behind PR<span className="about__i">I</span>CK.
        </h1>
        <div className="about__body">
          <p className="about__lead">
            PRICK started with a simple frustration: health had become far too complicated, far too clinical, and far too boring.
          </p>
          <p>
            Dr Kylee Montgomerie and Norwyn K have spent years working with people through corporate wellness across South Africa. In
            that time, they saw the same thing again and again.
          </p>
          <p>
            People care about their health. They want to feel better, look better, have more energy, sleep properly, recover faster
            and feel more like themselves.
          </p>
          <p>
            What they often do not want is the jargon, the confusion, the intimidating medical language, or another health company
            talking at them instead of to them.
          </p>
          <p>That is where PRICK came from.</p>
          <p>
            Kylee and Norwyn saw the growing role of peptide treatments and believed there was a better way to introduce people to
            this world. One that could still be clinically responsible and properly guided, without making the experience feel cold
            or complicated.
          </p>
          <p>So they built PRICK around a different idea:</p>
          <blockquote className="about__idea">
            <p className="about__idea-main">Start with the person, not the peptide.</p>
            <p>Start with what she wants to feel differently.</p>
            <p>What she wants back.</p>
            <p>What she wants more of.</p>
          </blockquote>
          <p>
            Then make the science easier to understand, the process easier to navigate, and the whole experience something she
            actually wants to engage with.
          </p>
          <p>PRICK is designed for women who take their health seriously, but do not want health to feel serious all the time.</p>
        </div>
        <p className="display about__signoff">
          Serious where it matters.
          <br />
          <span className="serif-i">Different everywhere else.</span>
        </p>
        <Link href="/app" className="btn steps__btn">
          Start your assessment
        </Link>
      </article>
    </BrandPage>
  );
}
