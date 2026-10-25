import type { MetadataRoute } from 'next';

/** Lets members add PRICK to their Home Screen (iPhones need this for reminders) with a proper icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PRICK',
    short_name: 'PRICK',
    description: 'Peptide pens with a clinician behind every one.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#fbf6ee',
    theme_color: '#fbf6ee',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
