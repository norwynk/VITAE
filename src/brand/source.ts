/**
 * Where the pens come from: the claims PRICK leads with. Confirmed by the
 * founders (licensed supplier, every batch tested, full cold chain). Change
 * the wording here only; never add a claim that isn't confirmed.
 */
export const SOURCE = {
  licensed: 'SAHPRA-licensed supplier',
  tested: 'Every batch tested',
  cold: 'Cold chain, door to door',
};

/** The four promises in the "Know your source" section. */
export const SOURCE_PILLARS = [
  { title: 'A licensed supplier.', body: 'Every pen comes from a SAHPRA-licensed supplier. Never the grey market, never a mystery vial.' },
  { title: 'Every batch tested.', body: 'Each batch is tested before it is released. Not some batches: every one.' },
  { title: 'Cold all the way.', body: 'A full cold chain keeps your pen at the right temperature, from the supplier to your door.' },
  { title: 'A clinician’s yes first.', body: 'Nothing ships until a clinician has read your screening and approved it for you.' },
];

/** One line for footers and small print. */
export const SOURCE_LINE = 'Every pen comes from a SAHPRA-licensed supplier, every batch is tested, and it reaches you through a full cold chain.';
