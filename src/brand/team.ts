/**
 * Co-founders. Wording is only what the founders supplied; no titles or
 * claims are added.
 */
export interface CoFounder {
  name: string;
  role: string;
  bio?: string;
  /** Path under /public. */
  photo?: string;
  /** First name as handwritten beside the photo. */
  handle?: string;
  /** Quote in the founder's own words, as supplied. */
  quote?: string;
}

export const CO_FOUNDERS: CoFounder[] = [
  { name: 'Norwyn K', role: 'Co-founder and Director' },
  {
    name: 'Dr Kylee Montgomerie',
    role: 'Co-founder',
    /** Completes "<name> is …". */
    bio: 'a South African doctor with over 30 years in corporate wellness.',
    photo: '/team/kylee-montgomerie.png',
    handle: 'Kylee',
    quote:
      "We started PRICK to help women grow into their best selves. That's why we made a better-for-you peptide experience that women can trust.",
  },
];
