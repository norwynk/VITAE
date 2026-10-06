import type { PenBrand } from '@/brand/pens';
import { Pen } from './Pen';

/**
 * PLACEHOLDER for art-directed photography. Renders a colour-blocked product
 * composition; in development it also shows the photo brief so the shoot list
 * stays visible. Replace with real photography (next/image) when available.
 */
export function PhotoSlot({
  brand,
  brief,
  caption,
  tilt = 24,
  background,
}: {
  brand: PenBrand;
  brief: string;
  caption?: string;
  tilt?: number;
  background?: string;
}) {
  return (
    <figure
      className="photo-slot"
      data-placeholder="photography"
      style={{ '--slot-bg': background ?? brand.colours.tint, '--slot-sun': brand.colours.light, '--tilt': `${tilt}deg`, margin: 0 } as React.CSSProperties}
    >
      <div className="photo-slot__sun" />
      <Pen colours={brand.colours} label={brand.penLabel} className="photo-slot__pen" />
      <div className="photo-slot__shadow" />
      {caption && (
        <figcaption className="photo-slot__caption">
          <strong>{caption}</strong>
        </figcaption>
      )}
      {process.env.NODE_ENV !== 'production' && <span className="photo-slot__dev">Photo placeholder: {brief}</span>}
    </figure>
  );
}
