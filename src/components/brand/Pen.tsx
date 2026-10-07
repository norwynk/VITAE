import { useId, type CSSProperties } from 'react';
import type { PenColours } from '@/brand/pens';

/**
 * The PRICK pen, drawn in SVG from the product reference: a long horizontal
 * body with a rounded end, a recessed grip slot, a colour band, a printed label
 * panel, a dose window and a ridged dial cap. The dose window is left blank on
 * purpose: no verified doses exist yet. Stand-in until product photography.
 */
export function Pen({ colours, label, className, style, title }: { colours: PenColours; label: string; className?: string; style?: CSSProperties; title?: string }) {
  const id = useId().replace(/:/g, '');
  const g = (name: string) => `${name}-${id}`;
  // The label panel is ~180 units wide (between the divider and the window).
  const LABEL_WIDTH = 176;
  const labelSize = Math.min(26, LABEL_WIDTH / Math.max(label.length * 0.72, 1));
  const estimated = label.length * labelSize * 0.66 + label.length * 1.6;
  return (
    <svg
      viewBox="0 0 1000 170"
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        {/* Cylinder shading runs top to bottom on a horizontal pen. */}
        <linearGradient id={g('body')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={colours.deep} />
          <stop offset="0.14" stopColor={colours.main} />
          <stop offset="0.3" stopColor={colours.light} />
          <stop offset="0.46" stopColor={colours.main} />
          <stop offset="0.86" stopColor={colours.deep} />
          <stop offset="1" stopColor={colours.deep} />
        </linearGradient>
        <linearGradient id={g('cap')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={colours.deep} />
          <stop offset="0.3" stopColor={colours.main} />
          <stop offset="0.55" stopColor={colours.deep} />
          <stop offset="1" stopColor="#000" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={g('slot')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.38" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={g('glass')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0c0c0f" />
          <stop offset="0.55" stopColor="#25252b" />
          <stop offset="1" stopColor="#08080a" />
        </linearGradient>
        <linearGradient id={g('shine')} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={g('clip')}>
          <path d="M85 25 H905 V145 H85 A60 60 0 0 1 85 25 Z" />
        </clipPath>
      </defs>

      {/* Body with rounded end */}
      <path d="M85 25 H905 V145 H85 A60 60 0 0 1 85 25 Z" fill={`url(#${g('body')})`} />
      <g clipPath={`url(#${g('clip')})`}>
        <rect x="40" y="44" width="860" height="9" rx="4.5" fill={`url(#${g('shine')})`} opacity="0.7" />
        {/* Section seams */}
        <rect x="395" y="25" width="2.5" height="120" fill="#000" opacity="0.14" />
        <rect x="770" y="25" width="2.5" height="120" fill="#000" opacity="0.14" />
      </g>

      {/* Recessed grip slot */}
      <rect x="62" y="66" width="230" height="40" rx="20" fill={`url(#${g('slot')})`} />
      <rect x="66" y="69" width="222" height="5" rx="2.5" fill="#000" opacity="0.18" />

      {/* Colour band */}
      <rect x="330" y="25" width="16" height="120" fill={colours.deep} />
      <rect x="330" y="25" width="16" height="120" fill={`url(#${g('body')})`} opacity="0.35" />

      {/* Label panel: wordmark | product */}
      <g fill={colours.ink}>
        <text
          x="482"
          y="96"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-display), Impact, sans-serif', fontSize: 50, letterSpacing: 1.5 }}
        >
          PRICK
        </text>
        <text x="482" y="118" textAnchor="middle" style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10.5, fontWeight: 700, letterSpacing: 3 }}>
          PEPTIDE PEN
        </text>
        <rect x="574" y="56" width="1.5" height="58" opacity="0.35" />
        <text
          x="672"
          y="90"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: labelSize, fontWeight: 700, letterSpacing: 1.6 }}
          {...(estimated > LABEL_WIDTH ? { textLength: LABEL_WIDTH, lengthAdjust: 'spacingAndGlyphs' } : {})}
        >
          {label}
        </text>
        <text x="672" y="112" textAnchor="middle" style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 10.5, fontWeight: 600, letterSpacing: 3 }}>
          PEPTIDE PROGRAMME
        </text>
      </g>

      {/* Dose window (deliberately blank) */}
      <rect x="796" y="45" width="82" height="80" rx="12" fill="none" stroke={colours.ink} strokeOpacity="0.7" strokeWidth="3" />
      <rect x="803" y="52" width="68" height="66" rx="8" fill={`url(#${g('glass')})`} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={814} y={63 + i * 13} width={i % 2 ? 14 : 26} height="2.5" rx="1.25" fill={colours.light} opacity="0.8" />
      ))}
      <rect x="806" y="55" width="7" height="60" rx="3.5" fill="#fff" opacity="0.1" />

      {/* Dial cap with knurling */}
      <rect x="899" y="27" width="10" height="116" fill={colours.light} opacity="0.55" />
      <path d="M907 24 H950 A26 61 0 0 1 950 146 H907 Z" fill={`url(#${g('cap')})`} />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={912 + i * 5.2} y="28" width="2" height="114" fill="#000" opacity="0.22" />
      ))}
      <rect x="907" y="36" width="58" height="7" rx="3.5" fill="#fff" opacity="0.18" />
    </svg>
  );
}

/**
 * Places a pen inside any box at an angle, sized from the box (container
 * query units), so the same component works in tall cards and wide heroes.
 */
export function PenStage({
  colours,
  label,
  angle = -58,
  fit = 1,
  className,
  title,
}: {
  colours: PenColours;
  label: string;
  angle?: number;
  /** 1 = as large as fits; smaller leaves breathing room. */
  fit?: number;
  className?: string;
  title?: string;
}) {
  const rad = (Math.abs(angle) * Math.PI) / 180;
  // Pen length that fits the box at this angle (pen is ~0.17 as thick as long).
  const byHeight = (100 / (Math.sin(rad) + 0.17 * Math.cos(rad))) * fit;
  const byWidth = (100 / (Math.cos(rad) + 0.17 * Math.sin(rad))) * fit;
  return (
    <div
      className={`pen-stage${className ? ` ${className}` : ''}`}
      style={{ '--angle': `${angle}deg`, '--len': `min(${byHeight.toFixed(1)}cqh, ${byWidth.toFixed(1)}cqw)` } as CSSProperties}
    >
      <Pen colours={colours} label={label} title={title} />
    </div>
  );
}
