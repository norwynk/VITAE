/**
 * Certificates of analysis, by pen. Each one is matched on the peptide named on
 * the certificate. A stack lists one per peptide, and `still` names any peptide
 * whose certificate we don't have yet. Never put one peptide's certificate
 * under another's name.
 */
export interface Certificate {
  /** The peptide, as customers know it. */
  peptide: string;
  /** Only where the certificate prints one. */
  batch?: string;
  file: string;
}

const CJC: Certificate = { peptide: 'CJC-1295 without DAC', batch: '2025062801-1', file: '/coa/cjc-1295-no-dac.pdf' };
const IPAMORELIN: Certificate = { peptide: 'Ipamorelin', batch: '2025010224-1', file: '/coa/ipamorelin.pdf' };
const GHK_CU: Certificate = { peptide: 'GHK-Cu', batch: 'CP0250718C', file: '/coa/ghk-cu.pdf' };
const TB_500: Certificate = { peptide: 'TB-500 (Thymosin β4 Acetate)', batch: '2025080301', file: '/coa/thymosin-beta-4.pdf' };

export const PEN_CERTIFICATES: Record<string, { certificates: Certificate[]; still?: string[] }> = {
  'sharp-mind': { certificates: [{ peptide: 'Semax', batch: 'SX2026040301', file: '/coa/semax.jpg' }] },
  'gut-reset': { certificates: [{ peptide: 'KPV', batch: 'KP2026032103', file: '/coa/kpv.jpg' }] },
  'hormone-reset': { certificates: [{ peptide: 'Kisspeptin 10', batch: 'KS2026012301', file: '/coa/kisspeptin-10.jpg' }] },
  'all-day-energy': { certificates: [{ peptide: 'MOTS-c', batch: 'MS2026030101', file: '/coa/mots-c.jpg' }] },
  'bedroom-confidence': { certificates: [{ peptide: 'PT-141', batch: 'PT20260319', file: '/coa/pt-141.jpg' }] },
  'body-sculpt': { certificates: [{ peptide: 'Tesamorelin', file: '/coa/tesamorelin.pdf' }] },
  'skin-rewind': { certificates: [GHK_CU] },
  'skin-rewind-reserve': { certificates: [GHK_CU] },
  'deep-sleep-rebuild': { certificates: [CJC, IPAMORELIN] },
  'the-glow-up': { certificates: [GHK_CU, TB_500], still: ['BPC-157'] },
  'rapid-recovery': { certificates: [TB_500], still: ['BPC-157'] },
};
