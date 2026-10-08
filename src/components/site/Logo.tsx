import Link from 'next/link';

/** The PRICK wordmark. `light` is the white version for dark backgrounds. */
export function Logo({ variant = 'dark', className }: { variant?: 'dark' | 'light'; className?: string }) {
  return (
    <Link href="/" className={`logo${className ? ` ${className}` : ''}`} aria-label="PRICK home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={variant === 'light' ? '/brand/prick-logo-white.png' : '/brand/prick-logo.png'} alt="PRICK" width={900} height={277} />
    </Link>
  );
}
