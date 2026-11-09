/** The crowned mascot from the film. A character, not a product: it carries no medicine and makes no promise. */
export function RoyalPrick({ className = 'pkg-royal' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 180 560" aria-hidden="true">
      <g stroke="#111" strokeWidth="6" strokeLinejoin="round">
        <path d="M34 72 L28 18 L62 44 L90 8 L118 44 L152 18 L146 72 Z" fill="#ffc62b" />
        <circle cx="90" cy="54" r="7" fill="var(--pink)" strokeWidth="4" />
        <rect x="30" y="72" width="120" height="50" rx="6" fill="#111" />
        <rect x="36" y="122" width="108" height="298" fill="#fff6ec" />
        <rect x="36" y="232" width="108" height="46" fill="var(--pink)" />
        <rect x="36" y="247" width="108" height="16" fill="#b9b9b9" strokeWidth="0" />
        <rect x="50" y="420" width="80" height="30" rx="4" fill="#111" />
      </g>
      <path d="M64 450 V540 M116 450 V540" stroke="#111" strokeWidth="13" />
      <path d="M50 553 H82 M98 553 H130" stroke="#111" strokeWidth="14" strokeLinecap="round" />
      <text transform="translate(90 349) rotate(-90)" fill="#111" textAnchor="middle" dominantBaseline="central" style={{ font: '400 62px var(--font-display)' }}>
        PRICK
      </text>
      <text transform="translate(90 177) rotate(-90)" fill="#111" textAnchor="middle" dominantBaseline="central" style={{ font: '700 10px var(--font-sans)', letterSpacing: '0.04em' }}>
        WE COME TO YOU
      </text>
    </svg>
  );
}
