import type { Botanical, PenColours } from '@/brand/pens';

/**
 * Painted botanical motifs for the pen wrap and cards. Pure decoration in the
 * pen's colour world; they never stand for an ingredient.
 */
const LEAF = '#7fae7a';
const LEAF_DEEP = '#55865a';

function Leaf({ fill = LEAF, vein = LEAF_DEEP }: { fill?: string; vein?: string }) {
  return (
    <g>
      <path d="M0 0 C0.35 -0.45 0.95 -0.45 1.3 0 C0.95 0.45 0.35 0.45 0 0 Z" fill={fill} />
      <path d="M0.05 0 L1.2 0" stroke={vein} strokeWidth="0.04" fill="none" opacity="0.7" />
    </g>
  );
}

function Shape({ kind, c }: { kind: Botanical; c: PenColours }) {
  switch (kind) {
    case 'blossom':
      return (
        <g>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="0" cy="-0.52" rx="0.36" ry="0.55" fill={r % 144 ? c.pastel : c.main} opacity="0.92" transform={`rotate(${r})`} />
          ))}
          <circle r="0.2" fill={c.accent} />
          {[0, 60, 120, 180, 240, 300].map((r) => (
            <circle key={r} cx="0" cy="-0.27" r="0.045" fill="#f6d36b" transform={`rotate(${r})`} />
          ))}
        </g>
      );
    case 'citrus':
      return (
        <g>
          <circle r="1" fill={c.main} />
          <circle r="0.88" fill="#fffaf0" />
          <circle r="0.8" fill={c.pastel} />
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d="M0 0 L0 -0.78" stroke="#fffaf0" strokeWidth="0.07" transform={`rotate(${i * 36})`} />
          ))}
          <circle r="0.1" fill="#fffaf0" />
        </g>
      );
    case 'lavender':
      return (
        <g>
          <path d="M0 1.1 C0.05 0.4 -0.05 -0.3 0 -1.1" stroke={LEAF_DEEP} strokeWidth="0.06" fill="none" />
          {Array.from({ length: 8 }, (_, i) => {
            const y = -1.05 + i * 0.2;
            return (
              <g key={i}>
                <ellipse cx="-0.11" cy={y} rx="0.1" ry="0.16" fill={i % 2 ? c.accent : c.main} transform={`rotate(-25 -0.11 ${y})`} />
                <ellipse cx="0.11" cy={y + 0.08} rx="0.1" ry="0.16" fill={i % 2 ? c.main : c.accent} transform={`rotate(25 0.11 ${y + 0.08})`} />
              </g>
            );
          })}
        </g>
      );
    case 'leaf':
      return (
        <g>
          <g transform="rotate(-30)"><Leaf /></g>
          <g transform="rotate(200) scale(0.8)"><Leaf fill={c.pastel} vein={c.deep} /></g>
          <g transform="rotate(95) scale(0.7)"><Leaf /></g>
        </g>
      );
    case 'berry':
      return (
        <g>
          <path d="M0 -0.7 C0.75 -0.75 0.85 0.1 0 0.95 C-0.85 0.1 -0.75 -0.75 0 -0.7 Z" fill={c.main} />
          {[[-0.3, -0.3], [0.25, -0.35], [0, -0.05], [-0.35, 0.2], [0.33, 0.15], [0, 0.45]].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx="0.04" ry="0.07" fill="#fff5c4" />
          ))}
          <path d="M0 -0.72 L-0.35 -0.95 L-0.1 -0.8 L0 -1.05 L0.1 -0.8 L0.35 -0.95 Z" fill={LEAF_DEEP} />
        </g>
      );
    case 'daisy':
      return (
        <g>
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx="0" cy="-0.55" rx="0.13" ry="0.45" fill="#fffdf8" stroke={c.pastel} strokeWidth="0.03" transform={`rotate(${i * 30})`} />
          ))}
          <circle r="0.24" fill="#f4c84d" />
          <circle r="0.24" fill={c.main} opacity="0.25" />
        </g>
      );
  }
}

/** One motif placed at (x, y) with radius `size`. SVG coordinates. */
export function Motif({ kind, colours, x, y, size, rotate = 0, opacity = 1 }: { kind: Botanical; colours: PenColours; x: number; y: number; size: number; rotate?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${size})`} opacity={opacity}>
      <Shape kind={kind} c={colours} />
    </g>
  );
}

/**
 * A spill of botanicals for the bottom of a card, like fruit laid out under
 * the product. Scales to its box width.
 */
export function BotanicalSpill({ kind, colours, className }: { kind: Botanical; colours: PenColours; className?: string }) {
  const items: [number, number, number, number][] = [
    // x, y, size, rotate
    [30, 150, 46, -12],
    [110, 128, 34, 20],
    [190, 160, 52, 8],
    [262, 132, 30, -30],
    [330, 150, 44, 16],
    [72, 92, 22, 40],
    [300, 90, 20, -20],
  ];
  return (
    <svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      {[[60, 120], [230, 110], [330, 120]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${-40 + i * 50}) scale(48)`}>
          <Leaf />
        </g>
      ))}
      {items.map(([x, y, s, r], i) => (
        <Motif key={i} kind={kind} colours={colours} x={x} y={y} size={s} rotate={r} />
      ))}
    </svg>
  );
}
