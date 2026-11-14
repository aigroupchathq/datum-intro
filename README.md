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
src/scene/car.js        the stylised coupé (swap for a GLB later; same API)
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
