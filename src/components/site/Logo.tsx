import Link from 'next/link';

/** Typeset wordmark. Placeholder until the final logo is supplied. */
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="PRICK home">
      Prick
    </Link>
  );
}
