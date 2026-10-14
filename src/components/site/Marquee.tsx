/** Brand band between sections: short lines separated by a sparkle, scrolling on a deep pink field. */
export function Marquee({ items }: { items: string[] }) {
  const run = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {run.map((text, i) => (
          <span key={i} className="marquee__item">
            {text}
            <svg className="marquee__spark" viewBox="-10 -10 20 20">
              <path d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
