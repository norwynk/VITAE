import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Browsers and Google ask for /favicon.ico; serve the square PNG icon (a multiple of 48px, as Google prefers). */
export async function GET() {
  const png = await readFile(path.join(process.cwd(), 'public', 'icons', 'icon-192.png'));
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
}
