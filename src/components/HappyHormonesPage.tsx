'use client';
import Link from 'next/link';
import { type CSSProperties, type PointerEvent, useEffect, useRef } from 'react';
import { BrandPage } from './site/BrandPage';

/**
 * Happy Hormones: PRICK's hormone-care sister brand. Three prescription
 * products (progesterone tablets, estrogen gel and the Full Throttle
 * testosterone pen), each only after a doctor's yes. Same screening, same
 * doctors, its own sunny look. Kept out of search results for now.
 */
const delay = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

const PROMISES = ['Prescribed by a real doctor', 'Your bloods guide the dose', 'Delivered discreetly', 'Checked in on, every few months', 'A human to message', 'No waiting rooms'];

const NUMBERS = [
  { n: '3', unit: '', label: 'Hormones, one home' },
  { n: '1', unit: '', label: 'Doctor who reads your bloods' },
  { n: '0', unit: '', label: 'Waiting rooms' },
  { n: '100', unit: '%', label: 'Prescribed. Never off a shelf' },
];

const RANGE = [
  {
    id: 'progesterone',
    who: 'For her',
    name: 'Progesterone',
    kind: 'Oral tablets',
    line: 'A small tablet with a big job. Prescribed only if your doctor says it’s right for you, at the dose they choose.',
    img: '/hormones/progesterone.webp',
    alt: 'A Happy Hormones jar of progesterone oral tablets',
    tone: 'pink',
  },
  {
    id: 'estrogen',
    who: 'For her',
    name: 'Estrogen Gel',
    kind: 'Topical gel',
    line: 'A measured pump, rubbed into the skin. Prescribed only if your doctor says it’s right for you, at the dose they choose.',
    img: '/hormones/estrogen-gel.webp',
    alt: 'A Happy Hormones pump bottle of estrogen gel',
    tone: 'gold',
  },
  {
    id: 'testosterone',
    who: 'For him',
    name: 'Testosterone',
    kind: 'The Full Throttle pen',
    line: 'Our Full Throttle pen, for men whose bloods say they’re genuinely low. Never for bulking, always with follow-up bloods.',
    img: '/hormones/pen.webp',
    alt: 'The PRICK Full Throttle testosterone pen',
    tone: 'blue',
  },
] as const;

/** Real life with the range. Every photo is the same height; widths follow each picture's shape. */
const WILD = [
  { src: '/hormones/life-2.webp', w: 1122, h: 1402, alt: 'A laughing woman on sunlit rocks by the sea, holding a jar of Happy Hormones progesterone' },
  { src: '/hormones/life-6.webp', w: 1536, h: 1024, alt: 'Three friends laughing on a garden bench, one holding a jar of Happy Hormones progesterone' },
  { src: '/hormones/life-1.webp', w: 1122, h: 1402, alt: 'A smiling woman in a bathrobe pumping Happy Hormones estrogen gel into her palm in morning sun' },
  { src: '/hormones/life-3.webp', w: 1254, h: 1254, alt: 'Breakfast for two in the sun, with Happy Hormones progesterone and the PRICK Full Throttle pen on the table' },
  { src: '/hormones/life-4.webp', w: 1122, h: 1402, alt: 'A relaxed man sitting on his bed in morning light, holding the PRICK Full Throttle pen' },
  { src: '/hormones/life-5.webp', w: 1122, h: 1402, alt: 'A hand with coral nails holding Happy Hormones estrogen gel against a sunny yellow wall' },
  { src: '/hormones/sunlit.webp', w: 1600, h: 1600, alt: 'Happy Hormones progesterone, estrogen gel and the Full Throttle pen on a bathroom shelf in morning sun' },
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
    q: 'Why a doctor first?',
    a: 'Hormones are prescription medicines. They suit some people and not others, and the dose matters. So nothing is sent without a doctor’s yes, and if the answer is no, they tell you why.',
  },
];

/** The three products, rendered in 3D, layered so each can float and move on its own. */
const STAGE = [
  { id: 'jar', src: '/hormones/cut-jar.webp', w: 1000, h: 1150 },
  { id: 'bottle', src: '/hormones/cut-bottle.webp', w: 700, h: 1300 },
  { id: 'pen', src: '/hormones/cut-pen.webp', w: 1400, h: 820 },
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

/** A gentle 3D tilt that follows the pointer. Off for people who prefer less motion. */
function useTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const onPointerMove = (e: PointerEvent<T>) => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -10}deg`);
    el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 12}deg`);
  };
  const onPointerLeave = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };
  return { ref, onPointerMove, onPointerLeave };
}

function Flower({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="-1.2 -1.2 2.4 2.4" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="0" cy="-0.58" r="0.46" />
        <circle cx="0.55" cy="-0.18" r="0.46" />
        <circle cx="0.34" cy="0.47" r="0.46" />
        <circle cx="-0.34" cy="0.47" r="0.46" />
        <circle cx="-0.55" cy="-0.18" r="0.46" />
      </g>
      <circle r="0.3" fill="#fde7b8" />
    </svg>
  );
}

/** The ribbon of colour from the label, drifting slowly. Each wave repeats every 1440 units, so the loop has no seam. */
const WAVES = [
  { d: 'M0 170 C 240 170 480 50 720 50 S 1200 170 1440 170 L1440 300 L0 300 Z', fill: 'var(--hh-gold)', x: 0 },
  { d: 'M0 215 C 240 215 480 115 720 115 S 1200 215 1440 215 L1440 300 L0 300 Z', fill: 'var(--hh-pink)', x: -260 },
  { d: 'M0 262 C 240 262 480 192 720 192 S 1200 262 1440 262 L1440 300 L0 300 Z', fill: 'var(--hh-orange)', x: -520 },
];

function Waves({ className }: { className?: string }) {
  return (
    <svg className={`hh-waves${className ? ` ${className}` : ''}`} viewBox="0 0 1440 300" preserveAspectRatio="none" aria-hidden="true">
      {WAVES.map((w, i) => (
        <g key={i} transform={`translate(${w.x} 0)`}>
          <g className="hh-waves__drift" style={{ animationDuration: `${22 + i * 6}s` }}>
            {/* Three copies, so the offset layers never show an edge while drifting. */}
            {[0, 1440, 2880].map((dx) => (
              <path key={dx} d={w.d} fill={w.fill} transform={`translate(${dx} 0)`} />
            ))}
          </g>
        </g>
      ))}
    </svg>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <span className={`hh-logo${className ? ` ${className}` : ''}`}>
      Happy
      <br />
      Hormones
      <Flower className="hh-logo__flower" />
    </span>
  );
}

function ProductCard({ p, i }: { p: (typeof RANGE)[number]; i: number }) {
  const tilt = useTilt<HTMLDivElement>();
  return (
    <article className={`hh-card hh-card--${p.tone}`} data-reveal style={delay(i * 120)} id={p.id}>
      <div className="hh-card__stage" {...tilt}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.alt} loading="lazy" />
      </div>
      <p className="hh-card__who">{p.who}</p>
      <h3 className="hh-card__name">{p.name}</h3>
      <p className="hh-card__kind">{p.kind}</p>
      <p className="hh-card__line">{p.line}</p>
      <Link href="/start" className="hh-btn">
        See if it’s for me
      </Link>
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
    const io = new IntersectionObserver(([e]) => {
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
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <BrandPage doors={false}>
      <div className="hh">
        <p className="hh-strip">Prescription only · A doctor says yes first · Delivered discreetly</p>

        <section className="hh-hero" aria-labelledby="hh-title">
          <div className="hh-hero__copy">
            <p className="hh-eyebrow">PRICK’s sweeter sister</p>
            <h1 id="hh-title" className="hh-hero__title">
              Hormones,
              <br />
              <em>but happier.</em>
            </h1>
            <p className="hh-hero__lede">
              Doctor-prescribed hormone care for women and men, from the people who brought you PRICK. Same doctors. Same standards. Much sunnier name.
            </p>
            <div className="hh-hero__actions">
              <Link href="/start" className="hh-btn">
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
            <Flower className="hh-float hh-float--a" />
            <Flower className="hh-float hh-float--b" />
            <Flower className="hh-float hh-float--c" />
          </div>
          <Waves className="hh-hero__waves" />
        </section>

        <div className="hh-ticker" aria-hidden="true">
          <div className="hh-ticker__track">
            {[...PROMISES, ...PROMISES].map((p, i) => (
              <span key={i}>
                <Flower className="hh-ticker__flower" />
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
            <p>Two for her, one for him. All three only after a screening and a doctor’s yes, so there’s no add to cart here. Just a very good conversation.</p>
          </div>
          <div className="hh-range__grid">
            {RANGE.map((p, i) => (
              <ProductCard key={p.id} p={p} i={i} />
            ))}
          </div>
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
              <Link href="/#protocols" className="link-arrow">
                See peptide protocols
              </Link>
            </div>
            <div className="hh-versus__card hh-versus__card--hh" data-reveal style={delay(120)}>
              <Logo className="hh-versus__logo" />
              <h3>Hormone care</h3>
              <p>The big chemical messengers that run your cycle, mood, sleep and drive. When they drop or swing, topping them up is a medical decision, so it starts with your bloods and a doctor.</p>
              <a href="#why" className="link-arrow">
                Why hormones change
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
              <Flower className="hh-wild__flower" />
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
          <Flower className="hh-statement__flower" />
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
            <img src="/hormones/life-1.webp" alt="" loading="lazy" />
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
            <p>Most hormone care means a waiting room, a rushed appointment and a script you don’t fully understand. We do it the PRICK way.</p>
            <p>A private screening on your phone. A South African registered doctor who reads it properly and orders the right bloods. Your results explained in plain English. A prescription only if it’s right for you, delivered to your door, and follow-up bloods so the dose stays right.</p>
            <p className="hh-split__kicker">Hormone care that’s on your side. Happily.</p>
          </div>
        </section>

        <section className="hh-finale" aria-labelledby="hh-finale-title">
          <Waves className="hh-finale__waves" />
          <div className="hh-finale__inner">
            <Logo className="hh-finale__logo" />
            <h2 id="hh-finale-title" className="hh-finale__title">
              Ready to be happy? <em>Hormonally.</em>
            </h2>
            <div className="hh-hero__actions">
              <Link href="/start" className="hh-btn hh-btn--light">
                Start my screening
              </Link>
              <Link href="/royal-prick" className="hh-btn hh-btn--outline">
                Or get the royal treatment
              </Link>
            </div>
            <p className="hh-finale__small">
              Prescription medicines. Available only after a consultation with a South African registered doctor, who decides whether anything is right for you and at what dose.
            </p>
          </div>
        </section>
      </div>
    </BrandPage>
  );
}
