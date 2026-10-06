import { useId, type CSSProperties } from 'react';
import type { PenColours } from '@/brand/pens';

/**
 * The PRICK pen, drawn in SVG: thick cylindrical body with rounded ends, a
 * large raised rectangular button on the upper body, a dose window on the
 * lower body and chrome trim. Stand-in until product photography exists.
 */
export function Pen({
  colours,
  label,
  className,
  style,
  title,
}: {
  colours: PenColours;
  label: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const id = useId().replace(/:/g, '');
  const g = (name: string) => `${name}-${id}`;
  const small = label.length > 9;
  return (
    <svg
      viewBox="0 0 140 620"
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={g('body')} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={colours.deep} />
          <stop offset="0.16" stopColor={colours.main} />
          <stop offset="0.34" stopColor={colours.light} />
          <stop offset="0.5" stopColor={colours.main} />
          <stop offset="0.86" stopColor={colours.deep} />
          <stop offset="1" stopColor={colours.deep} stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id={g('chrome')} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#6d6f75" />
          <stop offset="0.22" stopColor="#f4f5f7" />
          <stop offset="0.42" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#a7aab1" />
          <stop offset="0.85" stopColor="#5b5d63" />
          <stop offset="1" stopColor="#8a8d93" />
        </linearGradient>
        <linearGradient id={g('button')} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={colours.main} />
          <stop offset="0.35" stopColor={colours.light} />
          <stop offset="0.7" stopColor={colours.main} />
          <stop offset="1" stopColor={colours.deep} />
        </linearGradient>
        <linearGradient id={g('glass')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0d0d10" />
          <stop offset="0.5" stopColor="#24242a" />
          <stop offset="1" stopColor="#060608" />
        </linearGradient>
        <linearGradient id={g('shine')} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={g('raise')} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* Top chrome dial */}
      <rect x="34" y="8" width="72" height="44" rx="20" fill={`url(#${g('chrome')})`} />
      <rect x="34" y="20" width="72" height="3" fill="#000" opacity="0.12" />
      <rect x="34" y="30" width="72" height="3" fill="#000" opacity="0.12" />

      {/* Body */}
      <path d="M20 532 V94 A50 50 0 0 1 120 94 V532 Z" fill={`url(#${g('body')})`} />
      <rect x="40" y="76" width="10" height="440" rx="5" fill={`url(#${g('shine')})`} opacity="0.55" />

      {/* Raised button */}
      <g filter={`url(#${g('raise')})`}>
        <rect x="42" y="104" width="56" height="128" rx="14" fill={`url(#${g('button')})`} />
      </g>
      <rect x="46" y="110" width="48" height="6" rx="3" fill="#fff" opacity="0.35" />
      <rect x="42" y="104" width="56" height="128" rx="14" fill="none" stroke={colours.deep} strokeOpacity="0.35" />

      {/* Wordmark, running up the body */}
      <g transform="translate(70 352) rotate(-90)" fill={colours.ink}>
        <text
          textAnchor="middle"
          y="12"
          style={{ fontFamily: 'var(--font-display), Impact, sans-serif', fontSize: 40, letterSpacing: 1 }}
        >
          PRICK
        </text>
        <text
          textAnchor="middle"
          y="34"
          style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: small ? 9.5 : 11, fontWeight: 700, letterSpacing: 2.5 }}
        >
          {label}
        </text>
      </g>

      {/* Dose window */}
      <rect x="44" y="446" width="52" height="70" rx="10" fill={colours.deep} opacity="0.5" />
      <rect x="47" y="449" width="46" height="64" rx="8" fill={`url(#${g('glass')})`} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="54" y={458 + i * 11} width={i % 2 ? 10 : 18} height="2" rx="1" fill={colours.light} opacity="0.85" />
      ))}
      <rect x="49" y="451" width="6" height="58" rx="3" fill="#fff" opacity="0.12" />

      {/* Lower chrome ring and rounded tip */}
      <rect x="20" y="532" width="100" height="10" fill={`url(#${g('chrome')})`} />
      <path d="M20 542 H120 V550 A50 40 0 0 1 20 550 Z" fill={`url(#${g('body')})`} />
      <rect x="58" y="584" width="24" height="18" rx="8" fill={`url(#${g('chrome')})`} />
    </svg>
  );
}
