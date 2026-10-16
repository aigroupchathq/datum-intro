# MOTOR WORLD — `#x-body` RESEARCH & REDEsign (2026-10)

## What the panel was doing (before)
A 2 × 2 `.spec` card grid under two paragraphs, identical chrome for every
car and every lens (ENGINE / HISTORY / CULTURE). On mobile the quote,
the prose, and four metric cards sat at the same visual weight — no focus,
no point of difference as the lens changed. Reads "generic CMS block".

## Why it felt boring (root causes)
1. **No hero element.** The quote was paragraph-sized (14px muted). A quote
   this strong deserves display type.
2. **No variety by lens.** Engine content and History content used the same
   chrome and order — the user gets no signal that the panel changed mode.
3. **No visual rhythm.** Everything was 12px rows + the same card radius; the
   eye had no anchor.
4. **Nothing measurable.** The spec grid had small numbers only — nothing to
   "read" as data.
5. **The photo above is a stock car** with no visual connection to the body
   below (different bands, different type roles).

## Directions considered (and the one shipped)

| Direction | Idea | Cost | Risk to brand |
|---|---|---|---|
| A. Big pull quote + lead metric + chips | Make the lens's lead stat enormous (mono 200 weight) with the quote at display size; chips become quiet rows. | low | none | **SHIPPED** (v9 — the changes in HEAD) |
| B. Atlas fragment per lens | Tach gauge · era timeline · tag cloud | medium | medium (ambiguity of each canvas) |
| C. Per-car marquee SVG (auto-animated) | animated rev / championship timeline | medium | too much motion for accessibility |
| D. Live data | rev-noise subtitling + samples | high | fabricates data (banned by our evidence rules) |
| E. Conversational / Chat UI | "ask the engine" | high | gimmick |

I shipped **A** because it:
- makes the quote the hero (the content the founder actually wrote is strong),
- adds one dramatic number (lead datum) so each lens has instant visual identity,
- keeps the spec grid but adds hover/selectable feel chips,
- marks the lens strip (ENGINE/HISTORY/CULTURE) as a pill so the mode change is visible.

## What shipped in detail
- `.x-lede` two-column header inside the body: lens pill (accent) + lead metric
  (`font-weight:200`, tabular nums, fluid `clamp(2.2 → 3.6)rem`).
- `.pull` display quote with a mono caps kicker by lens.
- `.body-p` for the prose, `.meta-line` for the lens/car footer.
- Spec cards now have hover/active lift + accent border.
- `data-lens` is set on `#x-body` so per-lens CSS variants can land later.
- No fabricated content: the lead number is `d.s[0][1]` (already sourced).

## Open follow-ups (in priority order)
1. Add a small inline SVG archetype per lens (B/C visual) inside `.x-lede`:
   - ENGINE — needle gauge mini (28–36px) + the three G-forces
   - HISTORY — 3-dot era timeline
   - CULTURE — a fan-list/ticket stub
2. (c) **Decide the winner between B and E** if you want more theatricality; both
   need a small custom component.
3. Compress the lenthy four-spec grid on ≤360 px to one column (already wraps).
4. The photo slot still uses the Delta E30 references — swap to inline plates if
   it keeps feeling generic (see the sierra-workshop decision in this pass).

## Recording
- Changes: `#x-body` render output now emits `.x-lede / .pull / .body-p / .spec /
  .meta-line`. CSS: new tokens for display type, pill, lift.
- No backend / icon dep added (consistent with the rest of the site).
