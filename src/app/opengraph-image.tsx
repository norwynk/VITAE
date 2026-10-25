import { ImageResponse } from 'next/og';

export const alt = 'PRICK: not all pricks are created equal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The share card for the site (WhatsApp, Facebook, X, LinkedIn). */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '72px', background: '#fbf6ee' }}>
        <div style={{ display: 'flex', fontSize: 44, fontWeight: 800, letterSpacing: 2, color: '#111' }}>
          PR<span style={{ color: '#ff1f78' }}>!</span>CK
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36, fontSize: 92, fontWeight: 800, lineHeight: 1, textTransform: 'uppercase' }}>
          <span style={{ color: '#111' }}>Not all pricks</span>
          <span style={{ color: '#ff1f78' }}>are created equal.</span>
        </div>
        <div style={{ display: 'flex', marginTop: 36, fontSize: 34, color: '#333' }}>Peptide pens with a clinician behind every single one.</div>
      </div>
    ),
    size,
  );
}
