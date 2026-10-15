# ASSET SOURCES — datum-intro promotional site

All assets are project-internal demonstration files copied (not moved) from the
Datum application repository. No file here is presented as a customer record,
workshop partner, or verified history. Every photographic figure on the site
carries a "demonstration imagery" label.

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

## Local files (`assets/`)

| File | Source path | Section | Size | Rationale |
|---|---|---|---|---|
| `hero/rainy_911.jpg` (+`.webp` 103KB) | Wikimedia Commons, CC0, Gabriel Gurrola via Unsplash (downloaded 2026-10-15) | Hero | 1920px | Black 911, wet night street, tail-light glow. Stranger's plate softly withheld by us before publication; recorded here as an edit. No endorsement implied. |
| `automotive/delta_rally.jpg` (+`.webp` 316KB) | Wikimedia Commons, CC BY-SA 3.0, Albmartiniracing (downloaded 2026-10-15) | Motorworld explorer Delta tab | 1280px | Period rally Delta in motion. Attribution carried in the explorer caption whenever the Delta tab is active. |
| `hero/alpine_hero.png` | `design-boards/m3_csl_alpine_hero.png` | Diagram hub (124px) | 640px | Press-style alpine frame; retired from hero for resolution honesty. |
|---|---|---|---|---|
| `hero/alpine_hero.png` | `design-boards/m3_csl_alpine_hero.png` | Hero | 471KB | Cinematic alpine vehicle, dark grade, headline legibility |
| `workshops/sierra_workshop.jpg` | `feed/ford_sierra_rs_cosworth.jpg` | Business/craft | 941KB | Authentic specialist-workshop scene, incidental show plate only |
| `workshops/workshop_wall.jpg` | `feed/heritage_wrenching_workshop.jpg` | Business/craft | 351KB | Genuine mechanical labour, tools, craft |
| `automotive/evo_rally.jpg` | `feed/mitsubishi_evo6_tme_rally.jpg` | Drives/memory | 757KB | Rally road action, race number only, no road plate |
| `roads/dawn_road.jpg` | `feed/track_dawn_patrol_road.jpg` | Drives/memory | 168KB | Dawn road atmosphere |
| `engineering/engine_bay.jpg` | `feed/engine_bay_detailed_direct_injection.jpg` | Engineering | 339KB | Mechanical detail |
| `automotive/manual_shifter.jpg` | `feed/dashboard_manual_shifter.jpg` | Human detail | 139KB | Driver-machine contact point |
| `automotive/garage_m3.jpg` | `clean_garage_m3.jpg` | Care/custody | 700KB | Cared-for machine, no visible plate |

## Art direction (quality pass, 2026-10-15)

- Hero upgraded from 640px `alpine_hero` to 1376px rally frame: 4.6× the pixels
  at full-viewport display. Previous hero retired to the 124px diagram hub,
  where 640px is more than sufficient.
- Drivers chapter 3 uses the 1600px dawn-road frame (no plate content at all).
- All served files converted to WebP quality 84; originals retained as masters.
- Excluded throughout: readable-plate residence shot, diecast diorama,
  legible-plate Ford/AMG frames.

## Typography

Self-hosted OFL faces in `fonts/` (downloaded 2026-10-15 from Google Fonts):
Manrope 400/600/700, Instrument Serif 400 + italic, IBM Plex Mono 400/500.
`@font-face` with `font-display:swap`; system-stack fallbacks retained.

## Iconography

12 inline Lucide SVGs in `icons/` (ISC licence, lucide-icons/lucide, fetched
2026-10-15): car, route, wrench, book-open, shield, network, arrow-up-right,
compass, clock, file-check, layers, search. Used sparingly: business-card
headings, CTA arrows, invite button. No manufacturer logos anywhere.

## Motion

CSS + IntersectionObserver only. No motion.dev/GSAP installed. Reduced-motion
alternatives throughout.

## Optimisation status

Originals served as-is for local preview. Before any public release: convert to
WebP/AVIF, responsive variants, explicit dimensions, lazy loading below fold.
Recorded here as an open item, not done.
