# ASSET SOURCES — datum-intro promotional site

All assets are project-internal demonstration files copied (not moved) from the
Datum application repository. No file here is presented as a customer record,
workshop partner, or verified history. Every photographic figure on the site
carries a "demonstration imagery" label.

Last reconciled against `index.html`: 2026-10-15.

## Rights position (founder decision required)

- Source/licence for these files is **unrecorded in the repository**. They are
  used here strictly as illustrative demonstration imagery for Datum's own
  pre-launch site, matching their existing in-app illustrative role.
- **Do not treat this manifest as licence clearance.** Founder must confirm
  each file's origin before any public deployment.
- **Excluded on privacy grounds:** `real_uk_m3_cottage.jpg` (legible UK plate
  MW21 GBO + identifiable residence) and `splash_curated.jpg` (diecast-model
  diorama — would mislead as real vehicles at hero scale).
- **External downloads (Pexels/Unsplash): BLOCKED** — this environment cannot
  download binary files or inspect per-asset licence pages. No external image
  was fetched, hotlinked, or scraped. Revisit only with a capable environment
  and per-asset licence recording.

## Served files — what `index.html` actually references

Sizes are the bytes on disk as served. Sections are the `<section id>` the
image appears in.

| File | Section(s) | Size | Notes |
|---|---|---|---|
| `workshops/workshop_wall.webp` | hero, drivers, studies, building ×2 | 234.9KB | **Currently the hero.** 1024×682 — see resolution ceiling below. Used 5×. |
| `workshops/sierra_workshop.webp` | business | 205.0KB | Specialist preparation workshop. |
| `automotive/two_fates.webp` | why, building | 135.2KB | Dietmar Becker. Same marque, two fates. Attribution in caption. |
| `automotive/evo_rally.webp` | motorworld, studies, building | 110.2KB | Rally action, race number only, no road plate. |
| `roads/dawn_road.webp` | drivers, building | 86.7KB | Dawn road atmosphere. No plate content. |
| `automotive/garage_m3.webp` | drivers, business, studies, building | 82.0KB | Cared-for machine in a dark curated garage. |
| `automotive/continental_detail.webp` | meet | 51.6KB | Tim Stief. Chrome bonnet detail. No plates, no people. |
| `automotive/manual_shifter.webp` | drivers, building | 51.8KB | Driver–machine contact point. |

**8 distinct photographs occupy 19 image slots.** `workshop_wall` appears 5×,
`garage_m3` 4×, `evo_rally` 3×. This repetition is a known weakness: the page
reads as thinner than its section count suggests. Recorded as an open design
item, not fixed.

### Unreferenced (present but not used by `index.html`)

| File | Size | Notes |
|---|---|---|
| `engineering/engine_bay.webp` | 94.2KB | 1024×682. Displaced by `garage_m3` and `two_fates` in the studies/business figures. |

`engine_bay.webp` is 94.2KB of dead weight, retained pending a decision on the
business figures.

### Featured marque imagery

| File | Size | Notes |
|---|---|---|
| `hero/rainy_911.webp` | 91.5KB | 1920×837. The pre-2026-10-15 hero. Reused as the **Porsche 911 Carrera 3.2** featured image in Motor World, replacing `workshops/sierra_workshop.webp` (a workshop scene previously shown for a car). Confirm the car depicted is the intended model. |

## Originals / masters

The original `.jpg`/`.png` masters were **removed from the working tree on
2026-10-15** (4.5MB) to stop them being served. They are **retained in git
history** (`datum-intro` repo, commit `7fdb7ff`) and recoverable with
`git checkout -- <path>`. Master list with true dimensions:

| Master | Dimensions | Size |
|---|---|---|
| `hero/rainy_911.jpg` | 1920×837 | 248KB |
| `roads/dawn_road.jpg` | 1600×1067 | 168KB |
| `automotive/manual_shifter.jpg` | 1600×900 | 139KB |
| `workshops/sierra_workshop.jpg` | 1376×768 | 941KB |
| `automotive/evo_rally.jpg` | 1376×768 | 757KB |
| `automotive/garage_m3.jpg` | 1376×768 | 700KB |
| `automotive/delta_rally.jpg` | 1280×960 | 378KB |
| `automotive/e30_sport_evo.jpg` | 1280×853 | 281KB |
| `engineering/engine_bay.jpg` | 1024×682 | 339KB |
| `workshops/workshop_wall.jpg` | 1024×682 | 351KB |
| `hero/alpine_hero.png` | 640×426 | 471KB |
| `automotive/delta_rally.jpg`, `e30_sport_evo.jpg` | — | not currently served |

### Resolution ceiling — unresolved

**`workshop_wall` is 1024×682 and is displayed full-bleed.** At a 1440px
viewport that is a ~1.4× upscale; at 2560px, ~2.5×. Full-bleed hero display
needs roughly 2560px wide. Only `rainy_911` (1920×837) is even close, and it is
still 1.33× short at 2560. **No photograph on disk can fill a large viewport
without upscaling.** Resolving this needs either a new higher-resolution
source or a hero treatment that does not depend on full-bleed sharpness.

## WebP re-encode log (2026-10-15)

Eleven served files were re-derived from their git masters at WebP quality 82,
method 6 — a single lossy generation from the original rather than a second
generation from an already-lossy WebP. Each candidate was then compared to the
previous file with PSNR (peak signal-to-noise ratio over the full frame).

Outcome: **7 kept, 4 reverted.** Files below 40dB were restored from backup,
because the byte saving did not justify a measurable quality loss.

| File | Before | After | Delta | PSNR | Decision |
|---|---|---|---|---|---|
| `workshops/workshop_wall.webp` | 234.9KB | 213.6KB | −21.3KB | **35.32dB** | **reverted** — visibly degraded, trivial gain |
| `automotive/delta_rally.webp` | 316.4KB | 288.9KB | −27.5KB | **36.92dB** | **reverted** |
| `workshops/sierra_workshop.webp` | 205.0KB | 188.9KB | −16.1KB | **38.13dB** | **reverted** |
| `engineering/engine_bay.webp` | 94.2KB | 86.4KB | −7.8KB | **39.76dB** | **reverted** (also unreferenced) |
| `automotive/manual_shifter.webp` | 57.1KB | 51.8KB | −5.3KB | 44.76dB | kept |
| `automotive/continental_detail.webp` | 59.0KB | 51.6KB | −7.4KB | 43.48dB | kept |
| `roads/dawn_road.webp` | 93.8KB | 86.7KB | −7.1KB | 43.38dB | kept |
| `hero/rainy_911.webp` | 102.7KB | 91.5KB | −11.2KB | 42.07dB | kept (unreferenced) |
| `automotive/garage_m3.webp` | 89.2KB | 82.0KB | −7.2KB | 41.39dB | kept |
| `automotive/two_fates.webp` | 143.5KB | 135.2KB | −8.3KB | 41.28dB | kept |
| `automotive/evo_rally.webp` | 119.6KB | 110.2KB | −9.4KB | 40.12dB | kept |

Net saving: **56KB.** Threshold applied: 40dB, i.e. the loss is below the level
generally taken as imperceptible. Anything above 40dB here was kept; anything
below was restored.

**This was a smaller win than estimated.** The files were already reasonably
compressed for their content; aggressive re-encoding bought roughly 8% and cost
real image quality on dark, detailed frames. The measured approach above is the
record of that, including the four rejections.

## Typography

Self-hosted OFL faces in `fonts/` (2026-10-15):

- **Archivo** variable — `Archivo-Var.woff2` (34.1KB, weights 100–900) and
  `Archivo-Ital-Var.woff2` (38.2KB, italic 100–900). One grotesque carries both
  the display and interface roles; display is created by weight, tracking and
  size rather than by a second family.
- **IBM Plex Mono** 400/500 (`IBMPlexMono-400.woff2`, `-500.woff2`, 28.9KB) —
  labels, captions, record and plate data.

`@font-face` with `font-display:swap`; system-stack fallbacks retained.
Total served font payload: **101.2KB**, down from 143.9KB.

**Unreferenced font files (115.0KB, safe to remove once backups are retired):**
`Manrope-400/600/700.woff2` (72.9KB) and `InstrumentSerif-400/400i.woff2`
(42.1KB). These are still referenced by the local-only `index.backup.html` and
`v2.html`, which are untracked and were removed from the public site in commit
`7fdb7ff`. Deleting the font files will break those two local files.

## Iconography

12 inline Lucide SVGs in `icons/` (ISC licence, lucide-icons/lucide, fetched
2026-10-15): car, route, wrench, book-open, shield, network, arrow-up-right,
compass, clock, file-check, layers, search. Used sparingly: business-card
headings, CTA arrows, invite button. **No manufacturer logos anywhere** —
verified: zero brand marks in the rendered page.

## Motion

CSS + IntersectionObserver only. No motion.dev/GSAP installed. Reduced-motion
alternatives throughout, including the hero veil, which does not mount at all
under `prefers-reduced-motion`.

## Optimisation status

Done: WebP for all served photographs; explicit `width`/`height` on every
`<img>`; `loading="lazy"` below the fold; `fetchpriority="high"` on the hero;
zero external requests (fonts and imagery fully self-hosted); zero console
errors; zero failed requests.

Open: the resolution ceiling above; the 8-photographs-in-19-slots repetition;
185.7KB of unreferenced imagery; 115.0KB of unreferenced fonts. AVIF variants
and responsive `srcset` are **not** implemented.


## Unsplash photography swap (2026-16)

Every photograph added in this pass was **licence-verified before use**: the
photo page's JSON-LD `license` field was read and only files reporting
`https://unsplash.com/license` (the free Unsplash Licence) were accepted.

| Slot | File | Photographer | Unsplash ID | Licence |
|---|---|---|---|---|
| Hero (responsive 960/1600/2560) | `hero_*.webp` | Theo | `TlWM_glSTw0` | free Unsplash Licence |
| `#plate-stage` (real car, replaces SVG) | `plate_*.webp` | Nenad Kaevik | `79JFIGDVhM0` | free Unsplash Licence |
| `#drivers` ch.1 Acquisition | `acquire_*.webp` | Egor Vikhrev | `S0cqn0mZU0E` | free Unsplash Licence |
| `#drivers` ch.2 Routine care | `care_*.webp` | Ahmet Debelemez | `PqLR9V06qEo` | free Unsplash Licence |
| `#drivers` ch.3 Meaningful drive | `drive_*.webp` | Andrew Svk | `7IBuoQQlCKY` | free Unsplash Licence |
| `#drivers` ch.4 Reflection | `reflect_*.webp` | Stephanie Valencia | `mUHwpYNpq_c` | free Unsplash Licence |

Derived at 1280w and 1600w, WebP q80 method 6, with `srcset` so narrow
viewports fetch the 1280w file. Alt text is taken from each photo's Unsplash
description slug; every figure carries a visible photographer credit.

### Rejected: Unsplash+ premium assets

Four candidates were downloaded and then **rejected on licence grounds** before
being wired in. They are served from `plus.unsplash.com` and report
`license: https://unsplash.com/plus/license` -- Unsplash+ is a paid
subscription product, not the free Unsplash Licence. Using them without a
subscription would be a licence breach, and labelling them as "Unsplash
Licence" would be a fabricated claim. They are **not** referenced by the site.
A replacement set of free-licensed photographs was sourced and used instead.
This is recorded because a provenance manifest should show what was turned
down, not just what was kept.
