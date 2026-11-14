/* npm run check: build output sanity before uploading dist/ to the host.
   - the files the host needs are there (.htaccess, CNAME, robots, sitemap, every page)
   - nothing on the "not published" list slipped through
   - the 3D chunk stays inside its 250 KB (gzipped) budget
   - every page's local links and assets resolve inside dist/ */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { NOT_PUBLISHED } from '../vite.config.js';

const DIST = new URL('../dist/', import.meta.url).pathname;
const BUDGET = 250 * 1024;
let bad = 0;
const ok = (m) => console.log('  ok   ' + m);
const fail = (m) => { bad++; console.log('  FAIL ' + m); };

if (!existsSync(DIST)) { console.log('No dist/. Run npm run build first.'); process.exit(1); }

const pages = ['index.html', 'overview.html', 'record.html', 'keepers.html', 'workshops.html', 'buyers.html', 'partners.html', 'invite.html', 'privacy.html', '404.html'];
for (const f of ['.htaccess', 'CNAME', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'site.css', 'pages.css', 'pages.js', 'invite.js', 'instrument.js', 'film.js', ...pages]) {
  existsSync(join(DIST, f)) ? ok(f) : fail(`${f} is missing`);
}
if (existsSync(join(DIST, 'overview.html'))) {
  const ov = readFileSync(join(DIST, 'overview.html'), 'utf8');
  (ov.includes('content="noindex, follow"') && ov.includes('<link rel="canonical" href="https://datumatelier.uk/">') ? ok : fail)('overview.html is kept out of search, canonical to the home page');
}
for (const p of NOT_PUBLISHED) if (existsSync(join(DIST, p))) fail(`${p} should not be published`);
ok(`none of the ${NOT_PUBLISHED.length} unpublished paths are in dist/`);

const drive = readdirSync(join(DIST, 'assets', 'drive')).find((f) => /^drive-.*\.js$/.test(f));
if (!drive) fail('no drive-*.js chunk');
else {
  const gz = gzipSync(readFileSync(join(DIST, 'assets', 'drive', drive))).length;
  (gz <= BUDGET ? ok : fail)(`3D chunk ${(gz / 1024).toFixed(1)} KB gzipped (budget ${BUDGET / 1024} KB)`);
}

// GitHub Pages (Jekyll) silently skips files whose names start with _ or .
const skipped = readdirSync(join(DIST, 'assets', 'drive')).filter((f) => /^[_.]/.test(f));
skipped.length ? fail(`GitHub Pages would not publish: ${skipped.join(', ')}`) : ok('no build file is hidden from GitHub Pages');

// local references in every page: src, href, srcset, url()
let refs = 0;
for (const page of pages) {
  const html = readFileSync(join(DIST, page), 'utf8');
  const found = [...html.matchAll(/(?:src|href)="([^"]+)"|srcset="([^"]+)"/g)]
    .flatMap((m) => (m[1] ? [m[1]] : m[2].split(',').map((s) => s.trim().split(/\s+/)[0])));
  for (const u of found) {
    if (/^(https?:|mailto:|tel:|#|data:|javascript:)/.test(u)) continue;
    const path = u.split(/[?#]/)[0];
    if (!path) continue;
    const file = path.startsWith('/') ? join(DIST, path) : join(DIST, dirname(page), path);
    const target = existsSync(file) && statSync(file).isDirectory() ? join(file, 'index.html') : file;
    refs++;
    if (!existsSync(target)) fail(`${page} links to ${u}, which is not in dist/`);
  }
}
ok(`${refs} local links and assets checked across ${pages.length} pages`);

console.log(bad ? `\n${bad} problem(s). Fix before uploading.` : '\ndist/ is ready to upload.');
process.exit(bad ? 1 : 0);
