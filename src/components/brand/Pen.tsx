import { useId, type CSSProperties } from 'react';
import type { Botanical, PenColours } from '@/brand/pens';
import { Motif } from './Botanicals';

/**
 * The PRICK pen, drawn in SVG from the product reference: a pastel
 * watercolour wrap painted with the pen's botanical, a rounded grip end with a
 * coloured pill, a bronze ring, the PRICK / PEPTIDE PENS wordmark, the product
 * name, a silver dose window and a grey end cap. The dose window is left blank
 * on purpose: no verified doses exist yet. Stand-in until product photography.
 */
export function Pen({ colours, label, botanical = 'leaf', className, style, title }: { colours: PenColours; label: string; botanical?: Botanical; className?: string; style?: CSSProperties; title?: string }) {
  const id = useId().replace(/:/g, '');
  const g = (name: string) => `${name}-${id}`;
  // Product name sits between the divider (x 520) and the window (x 790).
  const LABEL_WIDTH = 230;
  const labelSize = Math.min(30, LABEL_WIDTH / Math.max(label.length * 0.62, 1));
  const estimated = label.length * labelSize * 0.74;
  const body = 'M95 28 H860 V142 H95 A57 57 0 0 1 95 28 Z';
  // Botanicals scattered over the wrap, kept away from the printed label.
  const motifs: [number, number, number, number][] = [
    [150, 38, 40, -20], [232, 138, 38, 25], [300, 30, 28, 60], [356, 124, 32, -35], [262, 84, 18, 10],
    [560, 28, 24, 15], [610, 148, 28, -50], [700, 30, 22, 80], [752, 144, 30, 10], [790, 30, 16, 40],
  ];
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
        <linearGradient id={g('wash')} x1="0" x2="1" y1="0" y2="0.3">
          <stop offset="0" stopColor={colours.pastel} />
          <stop offset="0.45" stopColor={colours.mist} />
          <stop offset="1" stopColor={colours.pastel} />
        </linearGradient>
        {/* Cylinder shading laid over the wash. */}
        <linearGradient id={g('round')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.22" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.82" stopColor="#000" stopOpacity="0.06" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id={g('bronze')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7a4a2a" />
          <stop offset="0.25" stopColor="#e8b48a" />
          <stop offset="0.5" stopColor="#b9774c" />
          <stop offset="1" stopColor="#6b3d22" />
        </linearGradient>
        <linearGradient id={g('silver')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8d9096" />
          <stop offset="0.3" stopColor="#f4f5f7" />
          <stop offset="0.6" stopColor="#c3c6cb" />
          <stop offset="1" stopColor="#7e8187" />
        </linearGradient>
        <linearGradient id={g('cap')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8a8c90" />
          <stop offset="0.28" stopColor="#e6e7e9" />
          <stop offset="0.6" stopColor="#b4b6ba" />
          <stop offset="1" stopColor="#6e7074" />
        </linearGradient>
        <linearGradient id={g('pill')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={colours.deep} />
          <stop offset="0.35" stopColor={colours.main} />
          <stop offset="1" stopColor={colours.deep} />
        </linearGradient>
        <filter id={g('paint')} x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        <clipPath id={g('clip')}>
          <path d={body} />
        </clipPath>
      </defs>

      {/* Wrap: wash, painted botanicals, then roundness. */}
      <path d={body} fill={`url(#${g('wash')})`} />
      <g clipPath={`url(#${g('clip')})`}>
        <g filter={`url(#${g('paint')})`} opacity="0.85">
          {motifs.map(([x, y, s, r], i) => (
            <Motif key={i} kind={botanical} colours={colours} x={x} y={y} size={s} rotate={r} />
          ))}
        </g>
        {/* Soft panel so the print stays legible over the painting. */}
        <rect x="408" y="44" width="372" height="82" rx="41" fill={colours.mist} opacity="0.72" />
        <rect x="0" y="0" width="1000" height="170" fill={`url(#${g('round')})`} />
      </g>

      {/* Coloured pill on the grip end */}
      <rect x="70" y="72" width="150" height="26" rx="13" fill={`url(#${g('pill')})`} />
      <rect x="78" y="76" width="120" height="5" rx="2.5" fill="#fff" opacity="0.4" />

      {/* Bronze ring */}
      <rect x="386" y="28" width="14" height="114" fill={`url(#${g('bronze')})`} />

      {/* Print: wordmark | product name */}
      <g fill={colours.print}>
        <text x="463" y="88" textAnchor="middle" style={{ fontFamily: 'var(--font-display), Impact, sans-serif', fontSize: 36, letterSpacing: 2 }}>
          PRICK
        </text>
        <text x="463" y="106" textAnchor="middle" style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 8.5, fontWeight: 700, letterSpacing: 2.6 }}>
          PEPTIDE PENS
        </text>
        <rect x="519" y="58" width="1.4" height="54" opacity="0.4" />
        <text
          x="653"
          y="88"
          textAnchor="middle"
          style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: labelSize, fontWeight: 700, letterSpacing: 1.2 }}
          {...(estimated > LABEL_WIDTH ? { textLength: LABEL_WIDTH, lengthAdjust: 'spacingAndGlyphs' } : {})}
        >
          {label}
        </text>
        <text x="653" y="108" textAnchor="middle" style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic', fontSize: 15 }}>
          Peptide Pen
        </text>
      </g>

      {/* Silver dose window (deliberately blank) */}
      <rect x="800" y="50" width="52" height="70" rx="9" fill={`url(#${g('silver')})`} />
      <rect x="806" y="57" width="40" height="56" rx="6" fill="#fdfdfd" stroke="#9a9da2" strokeWidth="1.2" />
      <rect x="809" y="60" width="6" height="50" rx="3" fill="#fff" opacity="0.9" />

      {/* Grey end cap */}
      <rect x="858" y="30" width="8" height="110" fill={`url(#${g('bronze')})`} />
      <path d="M866 26 H935 A28 59 0 0 1 935 144 H866 Z" fill={`url(#${g('cap')})`} />
      <rect x="866" y="38" width="84" height="6" rx="3" fill="#fff" opacity="0.35" />
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
  botanical,
  angle = -58,
  fit = 1,
  className,
  title,
}: {
  colours: PenColours;
  label: string;
  botanical?: Botanical;
  angle?: number;
  /** 1 = as large as fits; smaller leaves breathing room. */
  fit?: number;
  className?: string;
  title?: string;
}) {
  const rad = (angle * Math.PI) / 180;
  // Pen length that fits the box at this angle (pen is ~0.17 as thick as long).
  // Absolute values keep angles past vertical (e.g. -110deg) sized correctly.
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const byHeight = (100 / (sin + 0.17 * cos)) * fit;
  const byWidth = (100 / (cos + 0.17 * sin)) * fit;
  return (
    <div
      className={`pen-stage${className ? ` ${className}` : ''}`}
      style={{ '--angle': `${angle}deg`, '--len': `min(${byHeight.toFixed(1)}cqh, ${byWidth.toFixed(1)}cqw)` } as CSSProperties}
    >
      <Pen colours={colours} label={label} botanical={botanical} title={title} />
    </div>
  );
}
