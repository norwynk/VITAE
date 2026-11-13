'use client';
import Link from 'next/link';
import { type CSSProperties, type PointerEvent, useEffect, useRef } from 'react';
import { hhNurseVisitPrice } from '@/domain/intake';
import { HH_START, HHFlower, HHFooter, HHHeader, HHLogo, HHWaves } from './brand/HappyHormonesChrome';
import { BrandPage } from './site/BrandPage';

/**
 * Happy Hormones: PRICK's hormone-care sister brand, with its own header and
 * footer. Three prescription products (progesterone tablets, estrogen gel and
 * the Full Throttle testosterone pen). Unlike PRICK's peptides, bloods are
 * required before anything is prescribed: a nurse comes to them, or they send
 * their own. Its product wording was cleared by the medicines attorney on
 * 2026-11-13. Research claims are footnoted to the sources in SOURCES.
 */
const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

const PROMISES = ['Bloods first, always', 'Prescribed by a real doctor', 'A nurse can come to you', 'Delivered discreetly', 'Follow-up bloods built in', 'No waiting rooms'];

const NUMBERS = [
  { n: '3', unit: '', label: 'Hormones, one home' },
  { n: '1', unit: '', label: 'Doctor who reads your bloods' },
  { n: '0', unit: '', label: 'Waiting rooms' },
  { n: '100', unit: '%', label: 'Prescribed after bloods. Never off a shelf' },
];

/** The research behind the claims below, numbered as they're cited. */
const SOURCES = [
  'The Menopause Society. The 2022 hormone therapy position statement. Menopause, 2022.',
  'European Society of Endocrinology. Clinical practice guideline on menopause management, 2025.',
  'MacLennan A. et al. Oral oestrogen and combined oestrogen/progestogen therapy versus placebo for hot flushes. Cochrane Review, 2004.',
  'Avis N. et al. Duration of menopausal vasomotor symptoms over the menopause transition (SWAN). JAMA Internal Medicine, 2015.',
  'Bone Health & Osteoporosis Foundation. Bone loss in the years after menopause.',
  'Stute P. et al. The impact of micronized progesterone on the endometrium: a systematic review. Climacteric, 2016.',
  'Snyder P. et al. Effects of testosterone treatment in older men (The Testosterone Trials). New England Journal of Medicine, 2016; and follow-up reports, 2018.',
  'Lincoff A. et al. Cardiovascular safety of testosterone-replacement therapy (TRAVERSE). New England Journal of Medicine, 2023.',
  'Bhasin S. et al. Testosterone therapy in men with hypogonadism: an Endocrine Society clinical practice guideline, 2018.',
];

type Point = { text: string; cite?: number[] };
interface Product {
  id: string;
  who: string;
  name: string;
  kind: string;
  tone: 'pink' | 'gold' | 'blue';
  photo: string;
  photoAlt: string;
  cutout: string;
  hook: string;
  accident: Point[];
  ambulance: Point[];
  bloods: string[];
  watch: string;
}

const RANGE: Product[] = [
  {
    id: 'estrogen',
    who: 'For her',
    name: 'Estrogen Gel',
    kind: 'Body-identical estradiol, through the skin',
    tone: 'gold',
    photo: '/hormones/life-1.webp',
    photoAlt: 'A smiling woman in a bathrobe pumping Happy Hormones estrogen gel into her palm in morning sun',
    cutout: '/hormones/cut-bottle.webp',
    hook: 'Your thermostat, your sleep and your bones were running on estrogen all along.',
    accident: [
      { text: 'Around 3 in 4 women get hot flushes and night sweats as estrogen falls. For many, they last 7 years or more.', cite: [1, 4] },
      { text: 'Bone thins fastest straight after menopause: women can lose up to a fifth of their bone density in the 5 to 7 years that follow.', cite: [5] },
      { text: 'Broken sleep, low mood, brain fog, and dryness that tends to get worse, not better, without treatment.', cite: [1] },
    ],
    ambulance: [
      { text: 'Hormone therapy is the most effective treatment there is for hot flushes and night sweats, cutting how often they happen by about three quarters.', cite: [1, 3] },
      { text: 'A gel goes in through the skin, not the liver. That’s why guidelines prefer it: unlike estrogen tablets, it hasn’t been linked to a higher risk of blood clots.', cite: [1, 2] },
      { text: 'It slows the bone loss that follows menopause, which is why it’s licensed to help prevent osteoporosis.', cite: [1, 2] },
    ],
    bloods: ['FSH and estradiol', 'Thyroid', 'Liver function', 'Cholesterol', 'Full blood count'],
    watch: 'If you still have a womb, estrogen is paired with progesterone to keep the lining safe. Your doctor checks in at 3 months, then at least once a year, and keeps your mammograms on track.',
  },
  {
    id: 'progesterone',
    who: 'For her',
    name: 'Progesterone',
    kind: 'Body-identical micronised progesterone, oral tablets',
    tone: 'pink',
    photo: '/hormones/life-2.webp',
    photoAlt: 'A laughing woman on sunlit rocks by the sea, holding a jar of Happy Hormones progesterone',
    cutout: '/hormones/cut-jar.webp',
    hook: 'Often the first hormone to slip, and the one that keeps estrogen safe.',
    accident: [
      { text: 'Progesterone is often the first hormone to fall in perimenopause. Periods get heavier and less predictable, and sleep gets lighter.', cite: [1] },
      { text: 'If you still have a womb and take estrogen on its own, the lining can thicken, which raises the risk of womb cancer.', cite: [1, 2] },
    ],
    ambulance: [
      { text: 'Taken with estrogen, it protects the womb lining. A review of 40 studies found body-identical progesterone does that job well.', cite: [6] },
      { text: 'It’s the same molecule your ovaries make. It has a gentle calming effect, which is why it’s usually taken at bedtime, and some women find they sleep more deeply on it.', cite: [1] },
    ],
    bloods: ['Usually checked alongside your estrogen panel', 'FSH and estradiol', 'Full blood count'],
    watch: 'It can make you drowsy, so it’s taken at night. Any bleeding you don’t expect goes straight to your doctor.',
  },
  {
    id: 'testosterone',
    who: 'For him',
    name: 'Testosterone',
    kind: 'The Full Throttle pen',
    tone: 'blue',
    photo: '/hormones/life-4.webp',
    photoAlt: 'A relaxed man sitting on his bed in morning light, holding the PRICK Full Throttle pen',
    cutout: '/hormones/cut-pen.webp',
    hook: 'Not stress. Not just age. Sometimes it’s a number, and it can be measured.',
    accident: [
      { text: 'From around 40, testosterone drifts down about 1% a year. For some men it falls much further.', cite: [9] },
      { text: 'Genuinely low testosterone shows up as a flat sex drive, weaker erections, tiredness, low mood, less muscle, more belly fat, thinner bones and anaemia.', cite: [9] },
      { text: 'It’s easy to put down to stress or getting older, so most men are never checked.' },
    ],
    ambulance: [
      { text: 'In men with confirmed low testosterone, replacement improves sex drive and sexual function.', cite: [7, 9] },
      { text: 'It can correct unexplained anaemia and improve bone density.', cite: [7] },
      { text: 'The biggest trial yet, TRAVERSE (5,246 men), found no rise in heart attacks or strokes compared with placebo in men with genuinely low levels.', cite: [8] },
    ],
    bloods: ['Two early-morning testosterone tests', 'LH, FSH and SHBG', 'Full blood count', 'PSA', 'Cholesterol'],
    watch: 'Only for men whose bloods confirm it, never for bulking. It lowers sperm production, so tell your doctor if you’re planning children. Red blood cells and PSA are checked at every follow-up.',
  },
];

/** Real life with the range. Every photo is the same height; widths follow each picture's shape. */
const WILD = [
  { src: '/hormones/life-6.webp', w: 1536, h: 1024, alt: 'Three friends laughing on a garden bench, one holding a jar of Happy Hormones progesterone' },
  { src: '/hormones/life-5.webp', w: 1122, h: 1402, alt: 'A hand with coral nails holding Happy Hormones estrogen gel against a sunny yellow wall' },
  { src: '/hormones/life-3.webp', w: 1254, h: 1254, alt: 'Breakfast for two in the sun, with Happy Hormones progesterone and the PRICK Full Throttle pen on the table' },
  { src: '/hormones/life-2.webp', w: 1122, h: 1402, alt: 'A laughing woman on sunlit rocks by the sea, holding a jar of Happy Hormones progesterone' },
  { src: '/hormones/life-1.webp', w: 1122, h: 1402, alt: 'A smiling woman in a bathrobe pumping Happy Hormones estrogen gel into her palm in morning sun' },
  { src: '/hormones/life-4.webp', w: 1122, h: 1402, alt: 'A relaxed man sitting on his bed in morning light, holding the PRICK Full Throttle pen' },
  { src: '/hormones/sunlit.webp', w: 1600, h: 1600, alt: 'Happy Hormones progesterone, estrogen gel and the Full Throttle pen on a bathroom shelf in morning sun' },
];

const STEPS = [
  { t: 'Your screening', b: 'Ten minutes on your phone. Tell us what’s going on and how you’d like to do your bloods.' },
  { t: 'Your bloods', b: 'A nurse comes to your home or office, or you send us results you already have.' },
  { t: 'Your doctor', b: 'A South African registered doctor reads your bloods and your screening, then talks you through them.' },
  { t: 'Your hormones', b: 'Prescribed only if they’re right for you, at the dose your bloods point to, delivered to your door.' },
  { t: 'Follow-up bloods', b: 'At about 3 months, then at least once a year, so the dose stays right for you.' },
];

const WHY = [
  {
    q: 'Perimenopause',
    a: 'The years before your last period, when estrogen and progesterone start to swing about. Sleep, mood, cycles and your thermostat can all change, often in your forties and sometimes sooner. You’re not imagining it, and you don’t have to just put up with it.',
  },
  {
    q: 'Menopause',
    a: 'Twelve months after your last period. Hormone therapy is one option a doctor can talk through with you, the benefits and the risks, so you decide together with all the facts on the table.',
  },
  {
    q: 'Low testosterone',
    a: 'Testosterone drops more for some men than others. Your bloods tell the story, not an online quiz. If yours is genuinely low, a doctor can talk you through replacement and keeps checking your bloods while you’re on it.',
  },
  {
    q: 'Why bloods first?',
    a: 'Hormones are prescription medicines that top up something your body makes. Without knowing your starting levels, nobody can say if you need them or how much. PRICK’s peptides are different: bloods help there, but they aren’t required.',
  },
];

/** The three products, rendered in 3D, layered so each can float and move on its own. */
const STAGE = [
  { id: 'jar', src: '/hormones/cut-jar.webp', w: 1000, h: 1150 },
  { id: 'bottle', src: '/hormones/cut-bottle.webp', w: 700, h: 1300 },
  { id: 'pen', src: '/hormones/cut-pen.webp', w: 1400, h: 860 },
];

/** Depth: the stage leans toward the pointer and each layer slides by its own depth. */
function useParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const onPointerMove = (e: PointerEvent<T>) => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', `${(e.clientX - r.left) / r.width - 0.5}`);
    el.style.setProperty('--py', `${(e.clientY - r.top) / r.height - 0.5}`);
  };
  const onPointerLeave = () => {
    ref.current?.style.setProperty('--px', '0');
    ref.current?.style.setProperty('--py', '0');
  };
  return { ref, onPointerMove, onPointerLeave };
}

function Cite({ n }: { n?: number[] }) {
  if (!n?.length) return null;
  return (
    <sup className="hh-cite">
      {n.map((x, i) => (
        <a key={x} href={`#source-${x}`} aria-label={`Source ${x}`}>
          {i ? ',' : ''}
          {x}
        </a>
      ))}
    </sup>
  );
}

function ProductStory({ p, i }: { p: Product; i: number }) {
  const stage = useParallax<HTMLDivElement>();
  return (
    <article className={`hh-story hh-story--${p.tone}${i % 2 ? ' hh-story--flip' : ''}`} id={p.id} aria-labelledby={`${p.id}-name`}>
      <div className="hh-story__art" data-reveal {...stage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hh-story__photo" src={p.photo} alt={p.photoAlt} loading="lazy" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hh-story__cutout" src={p.cutout} alt="" loading="lazy" />
      </div>
      <div className="hh-story__copy" data-reveal style={delay(120)}>
        <p className="hh-card__who">{p.who}</p>
        <h3 id={`${p.id}-name`} className="hh-story__name">
          {p.name}
        </h3>
        <p className="hh-card__kind">{p.kind}</p>
        <p className="hh-story__hook">{p.hook}</p>
        <div className="hh-story__cols">
          <div className="hh-story__col hh-story__col--accident">
            <h4>If it’s left</h4>
            <ul>
              {p.accident.map((x) => (
                <li key={x.text}>
                  {x.text}
                  <Cite n={x.cite} />
                </li>
              ))}
            </ul>
          </div>
          <div className="hh-story__col hh-story__col--ambulance">
            <h4>What it does</h4>
            <ul>
              {p.ambulance.map((x) => (
                <li key={x.text}>
                  {x.text}
                  <Cite n={x.cite} />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="hh-story__bloods">
          <h4>Bloods your doctor checks first</h4>
          <ul>
            {p.bloods.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
        <p className="hh-story__watch">
          <strong>What we keep an eye on:</strong> {p.watch}
        </p>
      </div>
    </article>
  );
}

export function HappyHormonesPage() {
  const stage = useParallax<HTMLDivElement>();
  const numbers = useRef<HTMLDivElement>(null);

  // Count the big numbers up the first time they scroll into view.
  useEffect(() => {
    const el = numbers.current;
    if (!el || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        el.querySelectorAll<HTMLElement>('[data-to]').forEach((n) => {
          const to = Number(n.dataset.to);
          const start = performance.now();
          const step = (t: number) => {
            const k = Math.min(1, (t - start) / 1400);
            n.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
            if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <BrandPage doors={false} header={<HHHeader />} footer={<HHFooter />}>
      <div className="hh">
        <p className="hh-strip">Prescription only · Bloods first, always · A doctor says yes first</p>

        <section className="hh-hero" aria-labelledby="hh-title">
          <div className="hh-hero__copy">
            <p className="hh-eyebrow">PRICK’s sweeter sister</p>
            <h1 id="hh-title" className="hh-hero__title">
              Hormones,
              <br />
              <em>but happier.</em>
            </h1>
            <p className="hh-hero__lede">
              Doctor-prescribed hormone care for women and men, from the people who brought you PRICK. It starts with your bloods, and a nurse can come to you.
            </p>
            <div className="hh-hero__actions">
              <Link href={HH_START} className="hh-btn">
                Start my screening
              </Link>
              <a href="#range" className="hh-btn hh-btn--ghost">
                Meet the three
              </a>
            </div>
          </div>
          <div className="hh-stage" {...stage} role="img" aria-label="Happy Hormones progesterone tablets, estrogen gel and the PRICK Full Throttle testosterone pen, floating in the sun">
            <div className="hh-hero__sun" aria-hidden="true" />
            {STAGE.map((s) => (
              <div key={s.id} className={`hh-prod hh-prod--${s.id}`} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt="" width={s.w} height={s.h} />
                <span className="hh-prod__shadow" />
              </div>
            ))}
            <HHFlower className="hh-float hh-float--a" />
            <HHFlower className="hh-float hh-float--b" />
            <HHFlower className="hh-float hh-float--c" />
          </div>
          <HHWaves className="hh-hero__waves" />
        </section>

        <div className="hh-ticker" aria-hidden="true">
          <div className="hh-ticker__track">
            {[...PROMISES, ...PROMISES].map((p, i) => (
              <span key={i}>
                <HHFlower className="hh-ticker__flower" />
                {p}
              </span>
            ))}
          </div>
        </div>

        <section className="hh-numbers" aria-label="Happy Hormones in numbers">
          <p className="hh-numbers__intro" data-reveal>
            The hormone care your body’s been asking for
          </p>
          <div className="hh-numbers__grid" ref={numbers}>
            {NUMBERS.map((x, i) => (
              <div key={x.label} className="hh-number" data-reveal style={delay(i * 90)}>
                <span className="hh-number__n">
                  <span data-to={x.n}>{x.n}</span>
                  {x.unit && <small>{x.unit}</small>}
                </span>
                <span className="hh-number__label">{x.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="hh-range" id="range" aria-labelledby="hh-range-title">
          <div className="hh-head" data-reveal>
            <h2 id="hh-range-title" className="hh-h2">
              Meet <em>the three</em>
            </h2>
            <p>Two for her, one for him. What happens when the hormone runs low, what topping it up does according to the research, and exactly what we check first.</p>
          </div>
          <div className="hh-stories">
            {RANGE.map((p, i) => (
              <ProductStory key={p.id} p={p} i={i} />
            ))}
          </div>
          <div className="hh-range__cta" data-reveal>
            <p>Sound familiar? Your bloods will tell you, and your doctor will tell you what they mean.</p>
            <Link href={HH_START} className="hh-btn">
              See if it’s for me
            </Link>
          </div>
        </section>

        <section className="hh-bloods" id="bloods" aria-labelledby="hh-bloods-title">
          <div className="hh-head hh-head--centre" data-reveal>
            <p className="hh-eyebrow">The one rule we never bend</p>
            <h2 id="hh-bloods-title" className="hh-h2">
              Bloods first. <em>Always.</em>
            </h2>
            <p>
              Hormones top up something your body makes, so no doctor can prescribe them without knowing where you’re starting from. That makes Happy Hormones different from PRICK: with peptides, bloods help. With hormones, they’re required.
            </p>
          </div>
          <div className="hh-bloods__options">
            <div className="hh-bloods__option" data-reveal>
              <span className="hh-bloods__tag">Most popular</span>
              <h3>A nurse comes to you</h3>
              <p>Home, office, wherever suits. The same nurses as our Royal Prick Experience, so it’s one small prick and you never sit in a lab queue.</p>
              <p className="hh-bloods__price">Nurse visit: {hhNurseVisitPrice()}</p>
            </div>
            <div className="hh-bloods__option" data-reveal style={delay(120)}>
              <h3>Send us your own</h3>
              <p>Had bloods done recently? Send them from your account once you’ve finished your screening. If anything’s missing or too old, your doctor will say what to redo.</p>
              <p className="hh-bloods__price">No extra cost</p>
            </div>
          </div>
          <ol className="hh-steps">
            {STEPS.map((s, i) => (
              <li key={s.t} data-reveal style={delay(i * 80)}>
                <span className="hh-steps__n">{i + 1}</span>
                <strong>{s.t}</strong>
                <span>{s.b}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="hh-versus" aria-labelledby="hh-versus-title">
          <div className="hh-head hh-head--centre" data-reveal>
            <p className="hh-eyebrow">Peptides or hormones?</p>
            <h2 id="hh-versus-title" className="hh-h2">
              Related. <em>Not the same.</em>
            </h2>
          </div>
          <div className="hh-versus__grid">
            <div className="hh-versus__card hh-versus__card--prick" data-reveal>
              <p className="hh-versus__brand">PRICK</p>
              <h3>Peptide protocols</h3>
              <p>Short chains of amino acids that send your body specific messages: recover, sleep, repair. Think of them as a nudge.</p>
              <p className="hh-versus__bloods">
                <strong>Bloods:</strong> helpful, not required.
              </p>
              <Link href="/#protocols" className="link-arrow">
                See peptide protocols
              </Link>
            </div>
            <div className="hh-versus__card hh-versus__card--hh" data-reveal style={delay(120)}>
              <HHLogo className="hh-versus__logo" />
              <h3>Hormone care</h3>
              <p>The big chemical messengers that run your cycle, mood, sleep and drive. When they drop or swing, topping them up is a medical decision.</p>
              <p className="hh-versus__bloods">
                <strong>Bloods:</strong> required, every time.
              </p>
              <a href="#bloods" className="link-arrow">
                How the bloods work
              </a>
            </div>
          </div>
        </section>

        <section className="hh-wild" aria-labelledby="hh-wild-title">
          <div className="hh-head" data-reveal>
            <h2 id="hh-wild-title" className="hh-h2">
              Happy Hormones <em>at home</em>
            </h2>
            <p>Made to live on your bathroom shelf, not hide in a drawer.</p>
          </div>
          <div className="hh-wild__track" tabIndex={0} aria-label="Photos, scroll sideways">
            {WILD.map((w, i) => (
              <figure key={w.src} className="hh-wild__item" data-reveal style={{ ...delay(i * 80), aspectRatio: `${w.w} / ${w.h}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.src} alt={w.alt} width={w.w} height={w.h} loading="lazy" />
              </figure>
            ))}
            <figure className="hh-wild__item hh-wild__note" data-reveal style={delay(WILD.length * 80)}>
              <HHFlower className="hh-wild__flower" />
              <p className="hh-wild__promise">We built PRICK so you could stop guessing. Your hormones deserve the same.</p>
              <figcaption>The Happy Hormones promise</figcaption>
            </figure>
          </div>
        </section>

        <section className="hh-statement" aria-label="Our view">
          <p data-reveal>
            Your hormones aren’t being dramatic.
            <br />
            <em>They’re changing the script.</em>
          </p>
          <HHFlower className="hh-statement__flower" />
        </section>

        <section className="hh-why" id="why" aria-labelledby="hh-why-title">
          <div className="hh-why__copy">
            <h2 id="hh-why-title" className="hh-h2" data-reveal>
              Why <em>hormones?</em>
            </h2>
            <div className="hh-accordion">
              {WHY.map((w, i) => (
                <details key={w.q} open={i === 0} data-reveal style={delay(i * 80)}>
                  <summary>{w.q}</summary>
                  <p>{w.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="hh-why__art" data-reveal>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hormones/life-5.webp" alt="" loading="lazy" />
          </div>
        </section>

        <section className="hh-split" aria-labelledby="hh-split-title">
          <div className="hh-split__art" data-reveal>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hormones/life-3.webp" alt="" loading="lazy" />
          </div>
          <div className="hh-split__copy" data-reveal style={delay(120)}>
            <h2 id="hh-split-title" className="hh-h2">
              Why <em>Happy Hormones?</em>
            </h2>
            <p>Most hormone care means a waiting room, a lab queue, a rushed appointment and a script you don’t fully understand. We do it differently.</p>
            <p>
              A private screening on your phone. Your bloods taken at home by a nurse, or sent from results you already have. A South African registered doctor who reads them properly and explains them in plain English. A prescription only if it’s right for you, delivered to your door, and follow-up bloods so the dose stays right.
            </p>
            <p className="hh-split__kicker">Hormone care that’s on your side. Happily.</p>
          </div>
        </section>

        <section className="hh-sources" aria-labelledby="hh-sources-title">
          <h2 id="hh-sources-title">The research</h2>
          <ol>
            {SOURCES.map((s, i) => (
              <li key={s} id={`source-${i + 1}`}>
                {s}
              </li>
            ))}
          </ol>
          <p>This page is general information, not medical advice. Whether a hormone is right for you, and at what dose, is your doctor’s decision after your bloods and consultation.</p>
        </section>
      </div>
    </BrandPage>
  );
}
