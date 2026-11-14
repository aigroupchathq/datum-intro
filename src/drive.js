import * as THREE from 'three';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { frameAt, LENGTH } from './scene/path.js';
import { shared, lifeLine, BG, CAM_TILT } from './scene/ink.js';
import { buildRoad, buildLand, buildTrees } from './scene/land.js';
import { buildProps } from './scene/props.js';
import { buildCar } from './scene/car.js';

const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const ease = (u) => u * u * (3 - 2 * u);
// frame-rate independent easing toward a target: the same feel at 30, 60 or 120 fps
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

export async function start() {
  const mobile = matchMedia('(max-width: 759px)').matches;
  const canvas = document.getElementById('world');
  const ignition = document.getElementById('ignition');

  // Signs are hand-lettered on canvases, so wait for the site's fonts first.
  try {
    await Promise.race([
      Promise.all(['700 80px Archivo', '500 54px Caveat', '600 52px "IBM Plex Mono"'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch (e) { /* draw with fallbacks */ }

  /* ---------- stops, read from the HTML ---------- */
  const stops = [...document.querySelectorAll('.stop')].map((el, i) => ({
    i, el, id: el.id.replace('stop-', ''), t: parseFloat(el.dataset.t),
    screen: el.dataset.side === 'right' ? 1 : -1, cam: el.dataset.cam || null,
    card: el.querySelector('.card'), on: false, vis: 0,
  }));
  const routeLinks = [...document.querySelectorAll('.route a')];

  /* ---------- renderer, scene, camera ---------- */
  // Resolution is the main cost (the ground shader runs on nearly every pixel). It starts modest;
  // the governor in the loop raises it while frames are quick and lowers it if they are not.
  // Multisampling only on standard-density screens, where pixels are cheap and jaggies show most.
  const maxPR = Math.min(devicePixelRatio, mobile ? 1.5 : 2);
  const minPR = Math.min(maxPR, 1);
  let pr = Math.min(maxPR, mobile ? 1.25 : 1.5);
  // ?pr=1.5 pins the resolution (testing and comparisons); the governor then stays out of it
  const pinPR = parseFloat(new URLSearchParams(location.search).get('pr'));
  if (pinPR > 0) pr = Math.min(3, pinPR);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 1.5, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pr);
  renderer.setClearColor(BG);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 50, 120);
  scene.add(new THREE.HemisphereLight('#c9c4b8', '#050505', 1.1));
  const sun = new THREE.DirectionalLight('#ffffff', 0.9);
  sun.position.set(-30, 50, -20);
  scene.add(sun);

  const cam = new THREE.PerspectiveCamera(mobile ? 50 : 38, 1, 0.5, 400);
  const CAM = {
    base: mobile ? { h: 36, d: 20, ahead: 8 } : { h: 28, d: 18, ahead: 3 },
    garage: mobile ? { h: 26, d: 16, ahead: 5 } : { h: 21, d: 15, ahead: 1 },
    near: mobile ? { h: 32, d: 18, ahead: 7 } : { h: 25, d: 16, ahead: 2 },
    close: mobile ? { h: 30, d: 17, ahead: 6 } : { h: 25, d: 16, ahead: 1 },
    gate: mobile ? { h: 34, d: 20, ahead: 8 } : { h: 27, d: 19, ahead: 2 },
  };
  CAM_TILT.value = Math.atan2(CAM.base.h, CAM.base.d);

  /* ---------- the world ---------- */
  const props = buildProps(scene, stops);          // registers aprons first...
  buildRoad(scene);
  buildLand(scene, { mobile });                     // ...so the land is shaped around them
  const avoid = stops.map((s) => { const f = frameAt(s.t); return { x: f.pos.x, z: f.pos.z, r: 18 }; });
  buildTrees(scene, { mobile, avoid });
  // where the camera looks while parked at a stop: between the car and that stop's scenery
  stops.forEach((s) => {
    const at = frameAt(s.t, {}).pos.clone();
    const a = props.anchors[s.id];
    s.focus = a ? at.clone().lerp(a, 0.5) : at;
  });
  // Optional modelled car: <canvas id="world" data-car="/car.glb" data-car-yaw="0">.
  // ?car=/candidate.glb&yaw=-90 previews another model; only same-site .glb paths are accepted.
  const q = new URLSearchParams(location.search);
  const tryCar = q.get('car');
  const preview = tryCar && /^\/[\w\-/.]+\.glb$/.test(tryCar) && !tryCar.includes('..');
  const model = preview ? tryCar : canvas.dataset.car || null;
  const car = buildCar({ model, modelYaw: parseFloat(preview ? q.get('yaw') : canvas.dataset.carYaw) || 0 });
  scene.add(car.group);

  /* ---------- smooth scroll ---------- */
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 });

  /* ---------- scroll -> distance along the road ----------
     Each stop has a "dwell": a stretch of scroll where the car waits at that stop while
     you read. Between stops the car eases off, drives, and eases in. */
  let knots = [];
  let vh = innerHeight;
  // Phones: a card taller than the space under the car is lifted and its stop lengthened by
  // its overflow, so the page scrolls through it. svh (the small viewport) keeps this steady
  // while iOS Safari's toolbar grows and shrinks.
  const svhProbe = mobile ? document.body.appendChild(Object.assign(document.createElement('div'), { ariaHidden: 'true' })) : null;
  if (svhProbe) svhProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
  // position from the top of the document (offsetTop is relative to <main>, which is positioned)
  const docTop = (el) => el.getBoundingClientRect().top + scrollY;
  function fitPhoneCards() {
    const svh = svhProbe.offsetHeight || innerHeight;
    stops.forEach((s, i) => {
      const stick = (i === 0 ? 0.38 : 0.42) * svh;           // mirrors road.css (38svh / 42svh)
      const extra = Math.max(0, Math.round(s.card.offsetHeight - (svh - stick - 12)));
      s.stick = stick;
      // the hero card starts at its line on load, then scrolls up natively as you read
      if (i === 0) {
        const pad = `${Math.max(0, Math.round(stick - docTop(s.el)))}px`;
        if (s.el.style.paddingTop !== pad) s.el.style.paddingTop = pad;
      }
      if (s.extra === extra && s.svh === svh) return;
      s.extra = extra; s.svh = svh;
      s.card.style.top = `${Math.round(stick - extra)}px`;
      s.el.style.minHeight = extra ? `calc(${i === stops.length - 1 ? 150 : 200}vh + ${extra}px)` : '';
    });
  }
  // A tall card is never moved by script (that lags a frame behind native scrolling and
  // wobbles): it rises with the page, the car parks as its top passes the usual line, and it
  // carries on rising until its sticky top holds it fully on screen.
  let lastW = 0, lastH = 0, needRender = true;
  function measure() {
    // phones: the small viewport, so the address bar showing or hiding moves nothing
    vh = mobile ? (svhProbe.offsetHeight || innerHeight) : innerHeight;
    if (mobile) fitPhoneCards();
    const maxS = document.documentElement.scrollHeight - vh;
    knots = stops.map((s, i) => {
      const top = s.el.offsetTop, h = s.el.offsetHeight;
      const ex = s.extra || 0;
      const mid = top + (h - ex) * 0.5 - vh * 0.55;
      // the car stays parked (and the card fully shown) for the extra scroll a tall card needs
      let a = mid - vh * 0.28, b = mid + vh * 0.28 + ex;
      if (ex && i > 0) { a = docTop(s.el) - s.stick; b = a + vh * 0.56 + ex; }
      if (i === 0) { a = -1; b = Math.max(vh * 0.12, mid - vh * 0.2) + ex; }
      if (i === stops.length - 1) { a = Math.min(a, maxS - vh * 0.6); b = Infinity; }
      // a tall phone card is best met on arrival, top edge showing, not mid-read
      const land = ex ? a + vh * 0.06 : mid;
      return { a, b, t: s.t, top, h, mid: clamp(i === 0 ? 0 : land, 0, maxS) };
    });
    // resize the drawing buffer only when the canvas really changed size (it is sized to the
    // large viewport, so on iPhone the address bar coming and going does not reallocate it)
    const w = canvas.clientWidth, hgt = canvas.clientHeight;
    if (w !== lastW || hgt !== lastH) {
      lastW = w; lastH = hgt;
      renderer.setSize(w, hgt, false);
      cam.aspect = w / hgt;
      cam.updateProjectionMatrix();
    }
    needRender = true;
  }
  let measuring = false;
  const remeasure = () => { if (!measuring) { measuring = true; requestAnimationFrame(() => { measuring = false; measure(); }); } };
  function tAt(s) {
    for (let i = 0; i < knots.length; i++) {
      const k = knots[i];
      if (s <= k.b) {
        if (s >= k.a || i === 0) return k.t;
        const p = knots[i - 1];
        return THREE.MathUtils.lerp(p.t, k.t, ease(clamp((s - p.b) / (k.a - p.b), 0, 1)));
      }
    }
    return 1;
  }
  function visAt(s, i) {
    const k = knots[i];
    const lo = k.a - vh * 0.1, hi = k.b + vh * 0.1;
    const out = s < lo ? lo - s : s > hi ? s - hi : 0;
    return 1 - smooth(0, vh * 0.42, out);
  }

  /* ---------- keyboard, route map and links drive the car too ---------- */
  const go = (i) => lenis.scrollTo(knots[i].mid + (i === 0 ? 0 : vh * 0.02), { duration: 1.6 });
  routeLinks.forEach((a, i) => a.addEventListener('click', (e) => { e.preventDefault(); go(i); }));
  document.querySelector('.skip-drive')?.addEventListener('click', (e) => { e.preventDefault(); go(stops.length - 1); });
  stops.forEach((s, i) => s.el.addEventListener('focusin', () => { if (!s.on) go(i); }));
  if (location.hash === '#instrument') requestAnimationFrame(() => go(stops.findIndex((s) => s.id === 'rev')));

  /* ---------- REV: the painted dial and the car answer the real control ---------- */
  let revHeld = false, rpm = 0;
  const revBtn = document.getElementById('instrument-rev');
  if (revBtn) {
    revBtn.addEventListener('pointerdown', () => { revHeld = true; });
    addEventListener('pointerup', () => { revHeld = false; });
    revBtn.addEventListener('pointercancel', () => { revHeld = false; });
    revBtn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') revHeld = true; });
    revBtn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') revHeld = false; });
    revBtn.addEventListener('blur', () => { revHeld = false; });
  }

  /* ---------- the record's odometer counts up as you drive to it ---------- */
  const odo = [...document.querySelectorAll('#odo i')];
  const recordT = stops.find((s) => s.id === 'record')?.t || 0.17;
  let lastMiles = -1;
  function setOdo(miles) {
    if (miles === lastMiles || !odo.length) return;
    lastMiles = miles;
    String(miles).padStart(6, '0').split('').forEach((d, i) => { if (odo[i].textContent !== d) odo[i].textContent = d; });
  }

  /* ---------- loop ---------- */
  const hint = document.querySelector('.scroll-hint');
  const f = {};
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3();
  let carT = 0, lastYaw = null, lean = 0, beam = 0.25, ignited = false, first = true;
  const clock = new THREE.Clock();

  // ?perf=1: a small readout (frame rate, slow frames, draw calls, resolution) for testing on devices
  const hud = new URLSearchParams(location.search).get('perf') === '1' ? makeHud(renderer) : null;
  if (hud) window.__drive = { renderer, scene };

  measure();
  addEventListener('resize', remeasure);
  new ResizeObserver(remeasure).observe(document.body);

  // Upload every texture and buffer and compile every shader now, behind the ignition screen,
  // so the first drive past each stop does not stutter.
  {
    const culled = [];
    scene.traverse((o) => { if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; } });
    renderer.compile(scene, cam);
    renderer.render(scene, cam);
    culled.forEach((o) => { o.frustumCulled = true; });
  }

  // Quality governor: about once a second of continuous drawing, compare the average frame time.
  // Too slow (under ~45 fps): one step lower, and never back above that. Quick for three seconds
  // running: one step higher, up to the screen's own density.
  const gov = { sum: 0, n: 0, good: 0, ceiling: maxPR, since: performance.now() + 2000 };
  function govern(delta, now) {
    if (pinPR > 0 || now < gov.since || delta > 100) return;  // pinned; settling; tab switches
    gov.sum += delta; gov.n++;
    if (gov.sum < 1000 || gov.n < 20) return;
    const avg = gov.sum / gov.n;
    gov.sum = 0; gov.n = 0;
    let next = pr;
    if (avg > 22 && pr > minPR) { next = Math.max(minPR, pr - 0.25); gov.ceiling = next; gov.good = 0; }
    else if (avg < 17.5 && pr < gov.ceiling) { if (++gov.good >= 3) { next = Math.min(gov.ceiling, pr + 0.25); gov.good = 0; } }
    else gov.good = 0;
    if (next !== pr) {
      pr = next;
      renderer.setPixelRatio(pr);
      renderer.setSize(lastW, lastH, false);
      needRender = true;
    }
  }
  const film = document.getElementById('film');
  let lastS = -1, lastFrame = 0, drewLast = false, revAt = -1e9, lastModel = null;

  function frame(time) {
    lenis.raf(time);
    const dt = Math.min(clock.getDelta(), 0.05);
    const s = lenis.scroll ?? scrollY;

    // car: follow the target distance with a little momentum
    const target = tAt(s);
    carT += (target - carT) * damp(3.2, dt);
    if (Math.abs(target - carT) < 1e-5) carT = target;
    frameAt(carT, f);
    car.group.position.copy(f.pos);
    const yaw = Math.atan2(f.flat.x, f.flat.z);
    car.group.rotation.y = yaw;
    if (lastYaw !== null) {
      let dy = yaw - lastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      lean += ((clamp(-dy / Math.max(dt, 1e-3) * 0.08, -0.09, 0.09)) - lean) * damp(5, dt);
    }
    lastYaw = yaw;

    if (!ignited && s > 4) ignited = true;
    rpm += ((revHeld ? 1 : 0) - rpm) * Math.min(1, dt * (revHeld ? 9 : 4.5));
    const beamTo = (ignited ? 1 : 0.25) + rpm * 0.25;
    beam += (beamTo - beam) * damp(3, dt);
    if (rpm > 0.15) revAt = time;                            // exhaust puffs live on for a moment
    car.update(dt, { distance: carT * LENGTH, lean, beam, rpm, time: time / 1000 });

    if (props.dial) props.dial.pivot.rotation.y = props.dial.a0 - rpm * 0.906 * props.dial.sweep - Math.PI / 2;

    shared.uCarPos.value.copy(f.pos);
    shared.uCarDir.value.copy(f.flat);
    shared.uBeam.value = beam;
    lifeLine.uProgress.value = carT;

    // cards: fade and lift in at their stop (opacity and transform only: compositor work)
    let here = 0, best = -1;
    stops.forEach((st, i) => {
      const v = visAt(s, i);
      if (Math.abs(v - st.vis) > 0.001 || (v === 0 && st.vis !== 0)) {
        st.vis = v;
        const live = v > 0;
        if (live !== st.live) { st.live = live; st.card.classList.toggle('live', live); }  // own layer only while shown
        st.card.style.opacity = v.toFixed(3);
        st.card.style.transform = `translate3d(0,${((1 - v) * 28).toFixed(1)}px,0)`;
      }
      // the contents follow in a soft cascade; it starts as the card arrives and, once played,
      // only replays after the card has fully gone, so scrolling to and fro never flickers
      const on = st.on ? v > 0.02 : v > 0.45;
      if (on !== st.on) {
        st.on = on;
        st.card.classList.toggle('on', on);
        if (on) gsap.fromTo(st.card.querySelectorAll(':scope > *'), { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: 'power3.out', overwrite: true, force3D: true, clearProps: 'transform,opacity' });
      }
      if (v > best) { best = v; here = i; }
    });
    routeLinks.forEach((a, i) => {
      a.classList.toggle('here', i === here);
      a.classList.toggle('done', i !== here && stops[i].t <= carT + 0.002);
    });
    if (hint) hint.classList.toggle('gone', s > 40);
    setOdo(Math.round(64210 * ease(clamp(carT / recordT, 0, 1))));

    // camera: a world-aligned chase from above; the road ahead runs down the screen
    let p = { ...CAM.base };
    for (const st of stops) {
      if (!st.cam) continue;
      const w = 1 - smooth(0, 0.07, Math.abs(carT - st.t));
      if (w <= 0) continue;
      const c = CAM[st.cam];
      for (const k of ['h', 'd', 'ahead']) p[k] = THREE.MathUtils.lerp(p[k], c[k], w);
    }
    const L0 = Math.hypot(p.h, p.d);
    const groundW = 2 * L0 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect;
    let lx = f.pos.x, lz = f.pos.z + p.ahead;
    for (const st of stops) {
      const w = ease(1 - smooth(0, 0.045, Math.abs(carT - st.t)));
      if (w <= 0) continue;
      lx += (st.focus.x - f.pos.x) * w;
      lz += (st.focus.z - f.pos.z) * w * 0.6;
    }
    // keep the scene in the half of the screen the card leaves free
    const card = stops[here];
    if (mobile) lz += 5 * card.vis;
    else lx += card.screen * groundW * 0.2 * card.vis;
    tmp.set(lx, f.pos.y, lz);
    if (first) { camLook.copy(tmp); }
    const camMoving = camLook.distanceToSquared(tmp) > 4e-6;
    camLook.lerp(tmp, damp(3.5, dt));
    const want = tmp.set(camLook.x, camLook.y + p.h, camLook.z + p.d);
    const camAway = camPos.distanceToSquared(want) > 4e-6;
    if (first) camPos.copy(want); else camPos.lerp(want, damp(3.5, dt));
    cam.position.copy(camPos);
    cam.lookAt(camLook);
    const L = Math.hypot(p.h, p.d);
    scene.fog.near = shared.uFogNear.value = L + 14;
    scene.fog.far = shared.uFogFar.value = L + 62;
    shared.uTime.value = time / 1000;

    // Draw only when something on screen changed. A parked car with nothing moving costs no GPU
    // time, which also keeps phones cool (a hot phone slows itself down).
    if (car.group.userData.model !== lastModel) { lastModel = car.group.userData.model; needRender = true; }
    const scrolled = Math.abs(s - lastS) > 0.05; lastS = s;
    const busy = first || needRender || scrolled || camMoving || camAway || Math.abs(target - carT) > 1e-6 || revHeld
      || rpm > 0.002 || time - revAt < 1400 || Math.abs(beamTo - beam) > 0.003 || Math.abs(lean) > 0.0005;
    const draw = busy && !(film && !film.hidden);              // the film covers the road while it plays
    if (draw) {
      renderer.render(scene, cam);
      if (drewLast) govern(time - lastFrame, time);
      needRender = false;
    }
    drewLast = draw; lastFrame = time;
    if (hud) hud.tick(time, draw);
    if (first) {
      first = false;
      ignition?.classList.add('done');
      setTimeout(() => ignition?.remove(), 900);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // pause the smooth scroller while the film plays, so Esc and keys stay with the film
  if (film) new MutationObserver(() => (film.hidden ? lenis.start() : lenis.stop())).observe(film, { attributes: true, attributeFilter: ['hidden'] });
}

/* ?perf=1 readout: average frame rate, share of slow frames (> 20 ms), draw calls,
   triangles and the render resolution. For checking on real phones; never shown otherwise. */
function makeHud(renderer) {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:200;font:11px/1.35 ui-monospace,monospace;color:#E9E3D3;background:rgba(0,0,0,.72);padding:6px 8px;border-radius:4px;pointer-events:none;white-space:pre';
  document.body.appendChild(el);
  let last = 0, frames = 0, slow = 0, since = 0, drawn = 0;
  const api = {
    stats: null,
    tick(now, draw) {
      if (draw) drawn++;
      if (last) { frames++; if (now - last > 20) slow++; }
      last = now;
      if (!since) since = now;
      if (now - since < 500) return;
      const i = renderer.info.render;
      api.stats = { fps: Math.round((frames * 1000) / (now - since)), drawn: Math.round((drawn * 1000) / (now - since)), slowPct: Math.round((slow / Math.max(1, frames)) * 100),
        calls: i.calls, tris: i.triangles, lines: i.lines, px: renderer.getPixelRatio(),
        size: `${renderer.domElement.width}x${renderer.domElement.height}` };
      el.textContent = `${api.stats.fps} fps  drawn ${api.stats.drawn}/s  slow ${api.stats.slowPct}%\n${i.calls} draws  ${(i.triangles / 1000).toFixed(0)}k tris  ${(i.lines / 1000).toFixed(0)}k lines\n${api.stats.size} @${api.stats.px}`;
      frames = slow = drawn = 0; since = now;
    },
  };
  return api;
}
