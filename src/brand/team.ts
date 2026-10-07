/**
 * Co-founders, shown as one quiet line, never as a founder story. Wording is
 * only what the founders supplied; no titles or claims are added.
 */
export interface CoFounder {
  name: string;
  role: string;
  bio?: string;
  /** Path under /public. */
  photo?: string;
}

export const CO_FOUNDERS: CoFounder[] = [
  { name: 'Norwyn K', role: 'Co-founder and Director' },
  {
    name: 'Dr Kylee Montgomerie',
    role: 'Co-founder',
    /** Completes "<name> is …". */
    bio: 'a South African doctor with over 30 years in corporate wellness.',
    photo: '/team/kylee-montgomerie-sm.png',
  },
];
