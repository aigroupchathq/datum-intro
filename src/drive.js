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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile || devicePixelRatio < 2, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
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
  const car = buildCar();
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
  function fitPhoneCards() {
    const svh = svhProbe.offsetHeight || innerHeight;
    stops.forEach((s, i) => {
      const stick = (i === 0 ? 0.38 : 0.42) * svh;           // mirrors road.css (38svh / 42svh)
      const extra = Math.max(0, Math.round(s.card.offsetHeight - (svh - stick - 12)));
      s.stick = stick;
      if (s.extra === extra && s.svh === svh) return;
      s.extra = extra; s.svh = svh;
      s.card.style.top = `${Math.round(stick - extra)}px`;
      s.el.style.minHeight = extra ? `calc(${i === stops.length - 1 ? 150 : 200}vh + ${extra}px)` : '';
    });
  }
  // The sticky top above is the card's highest point. Until the car has parked, hold a tall
  // card down at the normal line (so it arrives like every other card), then lift it as you
  // scroll through the stop. Returns the extra translateY, in px, for scroll position s.
  function phoneHold(st, k, s) {
    if (!st.extra) return 0;
    const nat = k.top - s;                                   // where normal flow would put it
    const floor = k.top + k.h - st.card.offsetHeight - s;    // the stop's end pushing it off
    const lift = clamp(s - Math.max(k.a, 0), 0, st.extra);
    const want = Math.min(Math.max(nat, st.stick - lift), floor);
    const real = Math.min(Math.max(nat, st.stick - st.extra), floor);
    return Math.max(0, want - real);
  }
  function measure() {
    vh = innerHeight;
    if (mobile) fitPhoneCards();
    const maxS = document.documentElement.scrollHeight - vh;
    knots = stops.map((s, i) => {
      const top = s.el.offsetTop, h = s.el.offsetHeight;
      const ex = s.extra || 0;
      const mid = top + (h - ex) * 0.5 - vh * 0.55;
      // the car stays parked (and the card fully shown) for the extra scroll a tall card needs
      let a = mid - vh * 0.28, b = mid + vh * 0.28 + ex;
      if (i === 0) { a = -1; b = Math.max(vh * 0.12, mid - vh * 0.2) + ex; }
      if (i === stops.length - 1) { a = Math.min(a, maxS - vh * 0.6); b = Infinity; }
      // a tall phone card is best met on arrival, top edge showing, not mid-read
      const land = ex ? a + vh * 0.06 : mid;
      return { a, b, t: s.t, top, h, mid: clamp(i === 0 ? 0 : land, 0, maxS) };
    });
    const w = canvas.clientWidth, hgt = canvas.clientHeight;
    renderer.setSize(w, hgt, false);
    cam.aspect = w / hgt;
    cam.updateProjectionMatrix();
  }
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
  measure();
  addEventListener('resize', () => { measure(); });
  new ResizeObserver(() => measure()).observe(document.body);

  function frame(time) {
    lenis.raf(time);
    const dt = Math.min(clock.getDelta(), 0.05);
    const s = lenis.scroll ?? scrollY;

    // car: follow the target distance with a little momentum
    const target = tAt(s);
    carT += (target - carT) * Math.min(1, dt * 3.2);
    if (Math.abs(target - carT) < 1e-5) carT = target;
    frameAt(carT, f);
    car.group.position.copy(f.pos);
    const yaw = Math.atan2(f.flat.x, f.flat.z);
    car.group.rotation.y = yaw;
    if (lastYaw !== null) {
      let dy = yaw - lastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      lean += ((clamp(-dy / Math.max(dt, 1e-3) * 0.08, -0.09, 0.09)) - lean) * Math.min(1, dt * 5);
    }
    lastYaw = yaw;

    if (!ignited && s > 4) ignited = true;
    rpm += ((revHeld ? 1 : 0) - rpm) * Math.min(1, dt * (revHeld ? 9 : 4.5));
    beam += ((ignited ? 1 : 0.25) + rpm * 0.25 - beam) * Math.min(1, dt * 3);
    car.update(dt, { distance: carT * LENGTH, lean, beam, rpm, time: time / 1000 });

    if (props.dial) props.dial.pivot.rotation.y = props.dial.a0 - rpm * 0.906 * props.dial.sweep - Math.PI / 2;

    shared.uCarPos.value.copy(f.pos);
    shared.uCarDir.value.copy(f.flat);
    shared.uBeam.value = beam;
    lifeLine.uProgress.value = carT;

    // cards: fade and lift in at their stop
    let here = 0, best = -1;
    stops.forEach((st, i) => {
      const v = visAt(s, i);
      const hold = mobile ? phoneHold(st, knots[i], scrollY) : 0;   // native scroll: matches sticky layout
      if (Math.abs(v - st.vis) > 0.001 || Math.abs(hold - (st.hold || 0)) > 0.5) {
        st.vis = v; st.hold = hold;
        st.card.style.opacity = v.toFixed(3);
        st.card.style.transform = `translateY(${(hold + (1 - v) * 28).toFixed(1)}px)`;
      }
      const on = v > 0.6;
      if (on !== st.on) {
        st.on = on;
        st.card.classList.toggle('on', on);
        if (on) gsap.fromTo(st.card.querySelectorAll(':scope > *'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power2.out', overwrite: true });
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
    camLook.lerp(tmp, Math.min(1, dt * 3.5));
    const want = tmp.set(camLook.x, camLook.y + p.h, camLook.z + p.d);
    if (first) camPos.copy(want); else camPos.lerp(want, Math.min(1, dt * 3.5));
    cam.position.copy(camPos);
    cam.lookAt(camLook);
    const L = Math.hypot(p.h, p.d);
    scene.fog.near = shared.uFogNear.value = L + 14;
    scene.fog.far = shared.uFogFar.value = L + 62;
    shared.uTime.value = time / 1000;

    renderer.render(scene, cam);
    if (first) {
      first = false;
      ignition?.classList.add('done');
      setTimeout(() => ignition?.remove(), 900);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // pause the smooth scroller while the film plays, so Esc and keys stay with the film
  const film = document.getElementById('film');
  if (film) new MutationObserver(() => (film.hidden ? lenis.start() : lenis.stop())).observe(film, { attributes: true, attributeFilter: ['hidden'] });
}
