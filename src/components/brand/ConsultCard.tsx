/**
 * Weight-loss treatments that aren't offered on the site can still be
 * discussed in a personal clinical consultation. Never names them.
 */
export const CONSULT_PHONE = { display: '082 457 1926', tel: '+27824571926', who: 'Dr Kylee' };

export function ConsultCard({ variant = 'card' }: { variant?: 'card' | 'inline' }) {
  if (variant === 'inline') {
    return (
      <p className="consult-inline">
        <strong>Looking for other weight-loss options?</strong> Some are only available through a personal consultation. Call{' '}
        {CONSULT_PHONE.who} on <a href={`tel:${CONSULT_PHONE.tel}`}>{CONSULT_PHONE.display}</a>.
      </p>
    );
  }
  return (
    <article className="consult-card" aria-label="Speak to us about other options">
      <p className="eyebrow">Weight loss</p>
      <h3 className="display consult-card__title">Speak to us about other options.</h3>
      <p>
        Some weight-loss treatments aren&apos;t offered on this site. They&apos;re only available through a personal clinical
        consultation, where {CONSULT_PHONE.who} can look at your health properly and talk you through what fits.
      </p>
      <a className="btn" href={`tel:${CONSULT_PHONE.tel}`}>
        Call {CONSULT_PHONE.who}: {CONSULT_PHONE.display}
      </a>
    </article>
  );
}
