# Datum Atelier: the drive

The datumatelier.uk homepage, redesigned as a scroll-driven 3D road.
Scroll and the car drives down a winding, descending road. At each stop it parks and
that section's card pops up. **All copy is unchanged from the live site.**

## Run it locally

Needs Node.js 18 or newer (`node -v` to check; install from nodejs.org if missing).

```bash
npm install
npm run dev
```

Open http://localhost:5173. Add `?drive=0` to see the calm fallback page, or `?drive=1`
to force the drive even if your OS has "reduce motion" on.

`npm run build` writes a static site to `dist/`. Upload the contents of `dist/` to any host
(MilesWeb, Netlify, Cloudflare Pages...). No server code needed.

## The stops

| Stop | Section | On the road |
|---|---|---|
| Start | Hero | The car waits in an ink-drawn garage, lights on |
| The record | Specimen record | Mile posts for each service entry, the ramp of Entry 14, the odometer counts to 64,210 |
| Who it is for | Four audiences | A crossroads with four finger-posts |
| Where Datum stands | Live / In development / Planned | Painted on the road itself, with cones and a surveyor's level |
| If Datum stops | Three promises | A lay-by with three posted signs |
| Hold REV | The instrument | A rev dial painted on the tarmac follows the real REV button; the car shakes and puffs |
| Who is behind it | VD | The atelier, signed |
| Invitations | CTA | The road ends at the gate |

Behind the car, the centre line turns into a solid crimson "life line": the record kept, mile by mile.

## Where things live

```
index.html              the homepage: all content as real HTML (SEO, screen readers, keyboard)
src/main.js             loads the 3D only when it will run
src/drive.js            scroll -> car -> camera, cards, route map, REV hook
src/scene/path.js       the road curve, terrain height, flat areas
src/scene/land.js       road ribbon, ink edges, life line, terrain, trees
src/scene/props.js      everything built at each stop
src/scene/car.js        the stylised coupé; can swap in a modelled GLB (same API)
src/scene/car-model.js  loads and ink-dresses a GLB car (only fetched when one is set)
src/sound.js            the optional engine-sound toggle beside REV
src/engine-sound.js     the WebAudio engine synth (only fetched when sound is turned on)
src/scene/ink.js        the look: shaders, ink lines, hand-lettered labels
src/styles/road.css     cards, route map, fallbacks (on top of the original site.css)
public/                 the existing site, untouched: subpages, fonts, images, film.js, instrument.js
```

Each stop is a `<section class="stop" data-t="0.34" data-side="left">`. `data-t` is where on the
road (0 to 1) the car parks; `data-side` is which side the card sits on. Edit copy in `index.html`.

## Fallbacks

- Reduced motion or no WebGL: the same content as a clean stacked page; Three.js is never downloaded.
- "Skip the drive" and the route map on the right are real links; Tab moves the car to the focused stop.
- The old `/#instrument` deep link goes straight to Hold REV.

## Phones

Below 760px the card sits under the car. A card taller than that space is not boxed in:
it arrives at the usual line while the car parks, then lifts as you scroll, and its stop is
lengthened by the same amount so the car stays parked while you read. See `fitPhoneCards()`
and `phoneHold()` in `src/drive.js`.

## Engine sound

A speaker button beside REV turns on a synthesised engine note. It is off by default and
remembered on that device (`localStorage` key `datum-sound`). Nothing audio-related is
downloaded until it is pressed. It idles only while the REV instrument is on screen.
On iPhone it follows the ring/silent switch.

## Swapping in a modelled car

1. Export the car as `.glb`. Keep it under 1 MB: compress with meshopt, e.g.
   `npx gltfpack -i car-source.glb -o car.glb -cc` (this also converts a Draco file;
   Draco itself is not supported, as it needs extra decoder files hosted beside the site).
2. Name the wheel nodes with "wheel" (`Wheel_FL`...) so they turn. Optional: "glass" or
   "window" for glass, "light" or "lamp" for lamps, "noink" to skip the ink outline on a part.
3. Size and position don't matter: it is scaled to 4.4 m long, centred, and set on the road.
   The nose should point to +Z; if it doesn't, set a yaw in degrees.
4. Put it in `public/` and switch it on in `index.html`:
   `<canvas id="world" data-car="/car.glb" data-car-yaw="0"></canvas>`

To try a model first without editing anything: `http://localhost:5173/?car=/car.glb&yaw=-90`
(same-site `.glb` paths only). If the model is missing or fails, the coded coupé stays.

## Publishing to the live site

The live site is `aigroupchathq/datum-intro` (main branch, GitHub Pages). This project lives
on that repository's `drive-source` branch. There, `_build/build.py` generates every subpage
(with `pages.css` and `pages.js` linked) but not `index.html`, which comes from here:

```bash
npm run build
npm run check
npm run publish-to -- ../datum-intro
```

Then review, commit and push in `datum-intro`. The subpages in `public/` here mirror the
live build; change subpage copy in `_build/build.py` on main, then copy the pages back.
The home page's copy follows `home` in `build.py` word for word: change both together.
