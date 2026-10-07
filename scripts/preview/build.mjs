// Builds one self-contained preview page: node scripts/preview/build.mjs <out.html>
import { build } from '../../functions/node_modules/esbuild/lib/main.js';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '../..');
const out = process.argv[2] ?? path.join(root, '.preview/prick-preview.html');

const result = await build({
  entryPoints: [path.join(here, 'entry.tsx')],
  bundle: true,
  write: false,
  minify: true,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: {
    react: path.join(here, 'shims/react.js'),
    'react/jsx-runtime': path.join(here, 'shims/jsx-runtime.js'),
    'react/jsx-dev-runtime': path.join(here, 'shims/jsx-runtime.js'),
    'react-dom/client': path.join(here, 'shims/react-dom-client.js'),
    'next/link': path.join(here, 'shims/next-link.js'),
    '@/services/repository': path.join(here, 'shims/repository.ts'),
    '@': path.join(root, 'src'),
  },
  loader: { '.css': 'empty' },
  logLevel: 'warning',
});
let js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
// The preview is one self-contained page: inline images the site serves from /public.
js = js.replace(/"(\/(?:team|cards)\/[\w.-]+\.(png|jpg))"/g, (match, file, ext) => {
  const data = readFileSync(path.join(root, 'public', file)).toString('base64');
  return `"data:image/${ext === 'jpg' ? 'jpeg' : 'png'};base64,${data}"`;
});
const css = readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');

const html = `<title>PRICK</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Caveat:wght@500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Instrument+Serif:ital@0;1&display=swap">
<style>
/* Single light brand look by design: every colour is set explicitly below. */
:root {
  --font-display-loaded: 'Anton';
  --font-serif-loaded: 'Instrument Serif';
  --font-sans-loaded: 'DM Sans';
  --font-hand-loaded: 'Caveat';
  color-scheme: light;
}
${css}
.site-nav { top: env(safe-area-inset-top, 0px); }
</style>
<div class="demo-bar">Preview of the PRICK customer pages. Pens are fictional demo products and can't be bought.</div>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js}</script>
`;
writeFileSync(out, html);
console.log(`Wrote ${out} (${Math.round(html.length / 1024)} KB)`);
