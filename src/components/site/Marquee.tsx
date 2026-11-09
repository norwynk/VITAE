/** Brand band between sections: short lines separated by a crown, scrolling on a deep pink field. */
export function Marquee({ items }: { items: string[] }) {
  const run = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {run.map((text, i) => (
          <span key={i} className="marquee__item">
            {text}
            <svg className="marquee__crown" viewBox="0 0 124 64">
              <path d="M6 58 L0 8 L34 32 L62 2 L90 32 L124 8 L118 58 Z" fill="#ffc62b" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
