import { defineConfig } from 'vite';
import { rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* Files kept in public/ but never published.
   Mirrors the "exclude" list in the live site's _config.yml (GitHub Pages publishing rules):
   internal prototypes, and photos and fonts no page uses. Keep the two lists in step. */
const NOT_PUBLISHED = [
  'docs',
  'feed-prototype.html',
  'icons',
  'assets/automotive',
  'assets/engineering',
  'assets/roads',
  'assets/workshops',
  'assets/hero/acquire_1600.webp',
  'assets/hero/care_1600.webp',
  'assets/hero/drive_1600.webp',
  'assets/hero/reflect_1600.webp',
  'assets/hero/hero_960.webp',
  'assets/hero/hero_1600.webp',
  'assets/hero/hero_2560.webp',
  'assets/hero/plate_720.webp',
  'assets/hero/plate_1280.webp',
  'assets/hero/plate_1600.webp',
  'assets/hero/rainy_911.webp',
  'assets/hero/og-compact-1200x630.jpg',
  'fonts/Archivo-Ital-Var.woff2',
  'fonts/InstrumentSerif-400.woff2',
  'fonts/InstrumentSerif-400i.woff2',
  'fonts/Manrope-400.woff2',
  'fonts/Manrope-600.woff2',
  'fonts/Manrope-700.woff2',
  'README.md',
];

const publishingRules = () => {
  let out = 'dist';
  return {
  name: 'datum-publishing-rules',
  apply: 'build',
  configResolved(c) { out = resolve(c.root, c.build.outDir); },
  closeBundle() {
    for (const p of NOT_PUBLISHED) {
      const f = resolve(out, p);
      if (existsSync(f)) rmSync(f, { recursive: true, force: true });
    }
  },
  };
};

/* /overview.html: the whole site on one calm page, with an address of its own (to bookmark,
   share and count). It is index.html itself, which opens in the still view at that address;
   kept out of search (noindex) with its canonical pointing at the home page. */
const overviewPage = () => {
  let out = 'dist';
  return {
    name: 'datum-overview-page',
    configResolved(c) { out = resolve(c.root, c.build.outDir); },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && /^\/overview\.html(?=$|[?#])/.test(req.url)) req.url = req.url.replace('/overview.html', '/index.html');
        next();
      });
    },
    closeBundle() {
      const index = resolve(out, 'index.html');
      if (!existsSync(index)) return;
      const src = readFileSync(index, 'utf8');
      const html = src.replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex, follow">');
      if (html === src) throw new Error('overview.html: robots meta tag not found in index.html');
      writeFileSync(resolve(out, 'overview.html'), html);
    },
  };
};

export default defineConfig({
  plugins: [publishingRules(), overviewPage()],
  build: {
    // the homepage's own scripts and styles get a folder of their own, so publishing can
    // replace assets/drive/ wholesale without touching the site's photographs in assets/
    assetsDir: 'assets/drive',
    // three.js is one chunk (~190 KB gzipped) loaded only in drive mode; the budget is 250 KB
    chunkSizeWarningLimit: 800,
  },
});

export { NOT_PUBLISHED };
