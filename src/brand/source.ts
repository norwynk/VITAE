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

/** The four promises in the "Know your source" section: cheeky titles, plain facts underneath. */
export const SOURCE_PILLARS = [
  { title: 'Good breeding.', body: 'Every pen comes from a SAHPRA-licensed supplier. No back-alley pricks, no mystery vials.' },
  { title: 'Tested. Every. Batch.', body: 'Not some batches. Not most batches. Every batch is tested before it’s released.' },
  { title: 'Kept cool.', body: 'A full cold chain keeps your pen chilled from the supplier to your door. Cooler than most pricks you’ve met.' },
  { title: 'Doctor’s orders.', body: 'Nothing ships until a clinician has read your screening and said yes.' },
];

/** One line for footers and small print. */
export const SOURCE_LINE = 'Every pen comes from a SAHPRA-licensed supplier, every batch is tested, and it reaches you through a full cold chain.';
