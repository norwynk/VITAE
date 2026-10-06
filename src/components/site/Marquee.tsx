const COLOURS = ['var(--pink)', 'var(--orange)', 'var(--blue)', 'var(--lime)'];

export function Marquee({ items }: { items: string[] }) {
  const run = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {run.map((text, i) => (
          <span key={i} className="marquee__item">
            {text}
            <span className="marquee__dot" style={{ background: COLOURS[i % COLOURS.length] }} />
          </span>
        ))}
      </div>
    </div>
  );
}
