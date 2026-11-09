import Link from 'next/link';

/** Takes a pen to the member's account, where they answer its safety check and ask their clinician. */
export function ShortlistButton({ slug, name, className = 'btn small' }: { slug: string; name: string; className?: string }) {
  return (
    <Link href={`/app?pen=${slug}`} className={className} aria-label={`Ask my clinician about ${name}`}>
      Ask my clinician
    </Link>
  );
}
