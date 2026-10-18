# MOTOR WORLD — UI & UX Breakdown (reference doc)

Source: `index.html` section `#motorworld` (live on datumatelier.uk as of commit `60db59c`).
This doc is the canonical reference for "what Motor World does and how it looks" so a
future Datum app / marketing page can reproduce it.

## 1. Section shell
- Container: `<section id="motorworld" class="block path-driver">`
- Eyebrow: `Motor World · discovery` (mono, .72rem, uppercase, muted)
- Title: `Bring the car you love. We will show you why it's so much.` (display grotesk, weight 500, tracking -0.035em)
- Leade: `Every machine carries engineering, history and culture inside it. Choose one. Follow the thread from metal to meaning.`

## 2. Visual asset (the hero of the section)
A single wide `figure.figure` (16:10 aspect, ~688×384px) showing one featured car —
currently the Porsche 911 Carrera 3.2 (rainy_911.webp). Caption: `FEATURED MARQUE · PORSCHE 911 CARRERA 3.2`.

## 3. Discovery interaction model (Pattern C — sticky drawer)
The interactive part is a **drawer** (Pattern C: `grid-template-rows: 0fr → 1fr` over 450 ms, `--ease-spring`). Always open by default.

Inside the drawer:
- **Tablist "Discovery lenses"** — three chips: `ENGINE` / `HISTORY` / `CULTURE`. ARIA roles: `role="tablist"`, `role="tab"`, `aria-selected`. Active chip gets the accent border.
- **Body panel `#x-body`** (role="tabpanel", aria-live="polite") renders the selected lens content:
  - A pull-quote paragraph (the car's quote, e.g. "An air-cooled flat-six that breathes through simplicity.")
  - A prose paragraph (engineering/history/culture text)
  - A 2×2 spec grid of `label / value` pairs (e.g. ENGINE / 3.2L flat-six · ~231 PS)
  - A meta footer line: `LENS ENGINE · PORSCHE 911 CARRERA 3.2`
- **A quote block** below the drawer: `“{quote}”` + cite `MOTORWORLD NOTE · ILLUSTRATIVE`.

## 4. Car picker (removed in latest pass — see note)
Previously the section had a horizontal chip row `Choose a car to explore` with three
marques (Porsche 911 Carrera 3.2 / BMW M3 (E30) / Lancia Delta Integrale). Each
swap updated the photo, caption, name, and the x-body content. Removed at the
founder's request ("remove excess car names and examples"). The section now ships
with **no car picker** — the message stays generic and applies to any car.

If you want to bring discovery back later, the picker is a `role="tablist"` of
chips with `data-car` + `data-img`; selection swaps the photo and re-renders the
x-body via `renderX()`.

## 5. Knowledge path diagram (the "follow one thread" beat)
Below the drawer, a static SVG diagram (`role="img"`, aria-label describes it):
`E46 M3 (vehicle) → S54 (engine) → Engine Mgmt (system) → Diagnostics (knowledge)
→ Motorsport (touring-car heritage)`, with a dashed "shared engineering lineage"
link between S54 and Diagnostics. Labels in mono, boxes in hairline, accent on the
first box. This is the "how it works" explainer.

## 6. Behaviour (JS)
- `renderX()` reads the picked car + active lens, swaps the photo, caption, name,
  and re-renders `#x-body` + `#x-quote`. (Now guarded: returns early if no picker.)
- Chip clicks update `aria-selected` and call `renderX()`.
- Lens tabs update `aria-selected` and call `renderX()`.
- All state is in the DOM (aria-selected), no framework. Pattern C drawer handles
  open/close via `.open` class + grid-rows transition.

## 7. Theming
- `path-driver` class on the section scopes the driver path colour (accent gold
  on dark cards).
- Uses `--bg-surface-dark`, `--text-on-dark`, `--bg-accent-primary` tokens →
  switches cleanly between Swiss (stone + vermilion) and Obsidian (black + gold).
- The diagram's boxes use `.dbox` / `.dbox.hi` / `.dlink` / `.dlink.hi` / `.dl`
  / `.dh` / `.dt` classes, all token-driven.

## 8. Mobile / responsive
- Single column on phone (≤900 px), bottom pill nav covers navigation.
- At ≥900 px the topbar becomes the nav bar; Motor World scales to the wider
  960/1080 px shell; the diagram's 720 px SVG scales down via viewBox.
- No horizontal overflow verified 320-1920 px.

## 9. Copy (current, post-cleanup)
- Eyebrow: `Motor World · discovery`
- Title: `Bring the car you love. We will show you why it's so much.`
- Leade: `Every machine carries engineering, history and culture inside it. Choose one. Follow the thread from metal to meaning.`
- How it works quote: `Datum's Motor World connects any car to its engineering, its racing past and its culture, so the machine you already love keeps unfolding.`
- Knowledge path: `Or follow one thread end to end. Vehicle, engine, system, knowledge, motorsport:`

## 10. What to reproduce in the Datum app
- The three-lens tab model (ENGINE / HISTORY / CULTURE) is the discovery
  affordance — keep it.
- The pull-quote + prose + 2×2 spec grid + meta line is the body template.
- The knowledge-path diagram is the "how it works" explainer — keep generic
  (no specific car) so it applies to any vehicle.
- Drop the car picker unless you want a curated marquee set; if you keep it,
  use a `role="tablist"` of chips with `data-car`/`data-img` and a `renderX()`
  re-render (see the pre-cleanup commit `7a0b7c5` for the full implementation).
- Theme everything with tokens so Obsidian (black + gold) works for free.
- Keep the drawer open by default (`.drawer.open`) so the content is visible
  on first view — this is a discovery surface, not a hidden one.
