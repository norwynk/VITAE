import type { PenBrand } from '@/brand/pens';
import { Pen } from '../brand/Pen';

/** Brand band between sections: short lines separated by our own pens, scrolling on a deep pink field. */
export function Marquee({ items, pens }: { items: string[]; pens: PenBrand[] }) {
  const run = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {run.map((text, i) => {
          const pen = pens[i % pens.length];
          return (
            <span key={i} className="marquee__item">
              {text}
              <Pen className="marquee__pen" colours={pen.colours} label={pen.penLabel} botanical={pen.botanical} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
