'use client';
import { MAX_SHORTLIST, useShortlist } from '@/hooks/useShortlist';

/** Adds a pen to "My pens", or takes it off again. */
export function ShortlistButton({ slug, name, className = 'btn small' }: { slug: string; name: string; className?: string }) {
  const { has, add, remove, full } = useShortlist();
  const inList = has(slug);
  if (!inList && full) {
    return (
      <span className="small shortlist-full" role="status">
        My pens is full ({MAX_SHORTLIST})
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`${className}${inList ? ' is-added' : ''}`}
      aria-pressed={inList}
      aria-label={inList ? `Remove ${name} from my pens` : `Add ${name} to my pens`}
      onClick={() => (inList ? remove(slug) : add(slug))}
    >
      {inList ? 'In my pens ✓' : 'Add to my pens'}
    </button>
  );
}
