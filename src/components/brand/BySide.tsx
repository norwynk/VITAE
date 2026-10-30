import type { ReactNode } from 'react';

/**
 * Copy that reads differently on the men's side. Both versions render, and
 * html[data-side] shows the right one from the first paint.
 */
export function BySide({ women, men }: { women: ReactNode; men?: ReactNode }) {
  if (men === undefined) return <>{women}</>;
  return (
    <>
      <span className="only-women">{women}</span>
      <span className="only-men">{men}</span>
    </>
  );
}
