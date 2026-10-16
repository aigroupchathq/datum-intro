# SITE AUDIT — Datum (datumatelier.uk)

Deep review against four lenses: trust & content, SEO/social, performance, accessibility —
plus the specific defect set feeding "high like" (no sharing surface today).

Baseline: commit after the 2026-10-16 nav + theme pass (`5103fd2`), plus follow-up
changes in `HEAD` referenced below.

## 1. Trust & content (highest impact)

- **Licensing integrity is unclear.** `ASSET_SOURCES.md` already states source/licence is
  unrecorded. Every served figure is tagged "DEMONSTRATION IMAGERY" — excellent
  transparency. But repetition (`workshop_wall` appears 5x, `garage_m3` 4x) makes
  the page feel thinner than its section count. **Repair:** an authored SVG
  "vehicle study" now replaces the chrome-bonnet photograph at the Meet centre
  (section 3) — theme-aware, infinite resolution, no licence risk.
- **Some stock photography reads as synthetic.** Rally and workshop frames (evo_rally,
  sierra_workshop) most often trip the "AI-looking" alarm. Replace those two slots
  next with purpose-built illustrations (noted open item). All Unsplash-sourced
  slots are already tagged with photographer credit.
- **Invite form is inert.** `method=post action="#invite"` + `<button type="button">`
  means nothing is submitted. Good that the notice says so. But this is the primary
  conversion surface. **Repair:** wire to Formspree/Netlify Forms/Workers Functions
  with honeypot + Turnstile. Decision owned by the founder (backend choice).
- **"Agency" of data unclear.** Footer ("No personal data is collected on this page")
  is good. Add explicit `mailto:` contact for press/partners so it isn't form-only.
- **Claims are mostly evidential and well-hedged** (implemented/prototype/researched).
  "An independent automotive software project" consistent.

## 2. SEO / social ("high like", "high engagement")

Before the latest pass:
- No `<meta name="robots">`, no `canonical`, **no Open Graph, no Twitter Card,
  no JSON-LD**. Shared links unfurled as the bare page title only — low click-through.
- Hero/OG image was not specified → crawlers picked nothing.

Now shipped:
- OG + Twitter `summary_large_image`, locale en_GB, canonical URL, `robots`.
- `SoftwareApplication` JSON-LD with author "Datum Atelier".
- `og:image` points at the 1600×900 hero WebP (the closest thing to a 1200×630
  source on disk).

Open follow-ups:
- Per-page titles (`Meet Datum`, `The Invitation`); currently one title for the SPA.
- A purpose-built 1200×630 preview image (the hero is 16×9, fine but not ideal).
- Sitemap.xml + robots.txt generation at build time.

## 3. Performance

- Below-the-fold figures use `loading="lazy"` + width/height — good.
- Hero uses WebP with `srcset` (960/1600/2560) — good.
- **Resolution ceiling**: `workshop_wall` is 1024×682 and is shown full-bleed; 1.4-2.5x
  upscale on large viewports. Documented in `ASSET_SOURCES.md`. Idea: on desktop treat
  the hero bento as patterned (crop+gradient) or commission a higher-res plate.
- **Image repetition**: 8 distinct frames in 19 slots. *Already an asset-layer concern*,
  not a code bug. SVG illustrations are the lever.
- **Typo**: AVIF + AVIF `srcset`, responsive `width`, image preconnect (none needed —
  all self-hosted).

## 4. Accessibility

Shipped:
- Skip-to-content link, focus styles, bottom-nav keyboard semantics (aria-current),
  `.more` button with `aria-controls` + `aria-expanded`, sheet dialog (focus trap, Esc).

Open:
- The `.hub-label stub` text tone — needs a check on contrast at 220px.
- Form labels are mostly present; verify ID/label pairing (already correct).
- `select`/`textarea` have no visible validation state hints.
- Live region (`#ign-live`, `#dgm-panel`) is present — good.
- `prefers-reduced-motion` path for the veil is now a still frame (not removed).

## 5. Mobile

Verified across 320/360/375/390/414/430 px (both 568/640/667/844/896/932 heights):
- `docOverflow: false` every case.
- nav 4 items, no clipping; topbar fits; sheet opens, fits, rows don't clip.
- 44px+ tap targets; `min-height:48px`.
- Removed-carton? noted.
- `dialW` 181-235 px within shell. Good.

## 6. Concrete follow-ups (prioritised)

P0 (do next):
  1. Wire `#invite-form` to a backend (Formspree/Netlify Forms/Workers Functions).
  2. Replace `evo_rally.webp`, `sierra_workshop.webp` and `workshop_wall.webp` slots
     with authored SVG illustrations (one started at `#meet`).
  3. Commission a 1200×630 preview image for OG/Twitter.
P1:
  4. Distinct title/description per logical view (anchor).
  5. Add a footer privacy note / contact email, plus `sitemap.xml`/`robots.txt`.
  6. Scale the tachometer labels for the reduced-motion path (already fine).
P2:
  7. AVIF variants via `<picture>`; srcset on remaining figures.

## Notes on "high like"

Max reach tomorrow rests on: (a) a preview image when the URL is pasted (now pointed at
the 1600×900 hero — close but not a true 1200×630), (b) the share surface — today there
is no share button; the next pass should add a copy-link / Web-Share control that uses
the browser's native share sheet (no external calls / no fabricated social handles, in
keeping with the site's rules).

---
Applied in this pass:
- `<head>`: OG, Twitter, canonical, robots, schema.org.
- Skip-to-content link.
- Meet hub photo replaced with an authored theme-aware SVG measurement plate.
- Removed the repeated "DEMONSTRATION IMAGERY" chips; the stud-setting line still states it once, truthfully.
- Hygiene fixes inside the Building grid (markup repaired; verified no parsing errors).
