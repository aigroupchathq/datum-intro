/* ============================================================
   DATUM ATELIER — second opening beat: "Cellular Unity"
   A restrained black-and-gold cellular-collision canvas that
   plays once, after the veil and before the hero, then
   dissolves away. Self-contained; bails under reduced motion.

   Preview overrides (query string):
     ?splash=1  force it to play again
     ?splash=0  skip it entirely
   ============================================================ */
(function () {
  "use strict";

  var el = document.getElementById('splash'),
      canvas = document.getElementById('splash-c');
  if (!el || !canvas) return;
  var ctx = canvas.getContext('2d');

  function detach() {
    if (el.parentNode) el.parentNode.removeChild(el);
    document.documentElement.classList.remove('splash-on');
  }

  var q = '';
  try { q = location.search || ''; } catch (e) {}

  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}
  if (reduce || /splash=0/.test(q)) { detach(); return; }

  var seen = false;
  try { seen = sessionStorage.getItem('datum_splash') === '1'; } catch (e) {}
  if (seen && !/splash=1/.test(q)) { detach(); return; }

  /* ── timing ──
     Beat 1 runs long so the variety of motion is the show; the pull-in is
     short and decisive; then the united core holds before the site reveals. */
  var DISPERSAL = 5200,   // fragments adrift — each on its own path
      FORCE_SEAL = 3800,  // safety net: guarantee the timeline
      HOLD = 1300;        // hold the united core before revealing the site

  /* ── easing ── */
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; },
      lerp = function (a, b, t) { return a + (b - a) * t; },
      outCubic = function (t) { return 1 - Math.pow(1 - t, 3); },
      inOutCubic = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
      outQuint = function (t) { return 1 - Math.pow(1 - t, 5); },
      outBack = function (t) { var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
      outElastic = function (t) { return t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1; };

  /* ── viewport ── */
  var canvasEl = canvas, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, cx = 0, cy = 0;
  function resize() {
    W = canvasEl.width = Math.floor(innerWidth * DPR);
    H = canvasEl.height = Math.floor(innerHeight * DPR);
    canvasEl.style.width = '100%'; canvasEl.style.height = '100%';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = innerWidth / 2; cy = innerHeight / 2;
  }

  /* ── film grain ── */
  var grain = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 140;
    var x = c.getContext('2d'), d = x.createImageData(140, 140);
    for (var i = 0; i < d.data.length; i += 4) {
      var v = Math.random() * 255 | 0;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0); return ctx.createPattern(c, 'repeat');
  })();

  /* ── value noise ── */
  function noise(x, y, t) {
    return Math.sin(x * .012 + t) * Math.cos(y * .011 - t * .7)
      + .5 * Math.sin(x * .023 - y * .019 + t * .3)
      + .25 * Math.cos(y * .041 + t * .5);
  }

  /* ── desaturated bone/platinum spectrum (barely warm, 32) ── */
  var GOLD = Array.from({ length: 32 }, function (_, i) {
    var t = i / 31,
        r = Math.round(22 + t * (196 - 22)),
        g = Math.round(21 + t * (190 - 21)),
        b = Math.round(19 + t * (176 - 19));
    return '#' + [r, g, b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  });
  var SEAL_GOLD = '#b8b2a4';

  /* ── parallax dust ── */
  var dust = [];
  for (var di = 0; di < 70; di++) dust.push({
    x: Math.random() * innerWidth, y: Math.random() * innerHeight,
    z: .15 + Math.random() * .85, s: .3 + Math.random() * .9,
    a: .015 + Math.random() * .045,
    vx: (Math.random() - .5) * .01, vy: (Math.random() - .5) * .01,
    ph: Math.random() * 7
  });

  /* ── fragment roster ── */
  var FRAGMENTS = [
    { id: '1', name: 'Ownership Cell', glyph: '■', mass: 1.2, speed: .70, motion: 'orbit-core' },
    { id: '2', name: 'Memory Cell', glyph: '◆', mass: .8, speed: .60, motion: 'sway' },
    { id: '3', name: 'Service Cell', glyph: '▬', mass: 1, speed: .90, motion: 'ballistic' },
    { id: '3a', name: 'Service Sub-Cell', glyph: '▪', mass: .6, speed: .80, motion: 'orbit-service' },
    { id: '4', name: 'Enthusiast Cell', glyph: '▲', mass: .9, speed: .75, motion: 'sinusoidal' },
    { id: '5', name: 'Chassis Cell', glyph: '▶', mass: 1.5, speed: 1.20, motion: 'fast-straight' },
    { id: '5a', name: 'Chassis Sub', glyph: '▷', mass: 1.1, speed: 1, motion: 'curve' },
    { id: '6', name: 'Journey Cell', glyph: '△', mass: .9, speed: .65, motion: 'random-walk' },
    { id: '7', name: 'World Cell', glyph: '□', mass: 1, speed: .70, motion: 'perlin' },
    { id: '7a', name: 'World Sub', glyph: '▫', mass: .7, speed: .50, motion: 'orbit-core' },
    { id: '11', name: 'Memory-Event', glyph: '◇', mass: .9, speed: .72, motion: 'decay-osc' },
    { id: '12', name: 'Service-History', glyph: '≡', mass: 1, speed: .66, motion: 'para-curve' },
    { id: '12a', name: 'Service-Peak', glyph: '≡', mass: 1, speed: 1.05, motion: 'ballistic' },
    { id: '13', name: 'Owner-Note', glyph: '▣', mass: .8, speed: .58, motion: 'double-osc' },
    { id: '14', name: 'Tech-Spec', glyph: '≡', mass: .9, speed: 1.10, motion: 'ballistic' },
    { id: '15', name: 'Community-Tag', glyph: '○', mass: .7, speed: .52, motion: 'noisy-orbit' },
    { id: '16', name: 'Chassis-Meta', glyph: '◆', mass: 1.1, speed: .62, motion: 'ellipse' },
    { id: '17', name: 'VIN-Fragment', glyph: '■', mass: 1.2, speed: 1.15, motion: 'ballistic' },
    { id: '17a', name: 'VIN-Sub', glyph: '▫', mass: 1.1, speed: 1.13, motion: 'ballistic-pair' },
    { id: '18', name: 'Mileage-Log', glyph: '●', mass: .9, speed: .48, motion: 'decel-stop' },
    { id: '18a', name: 'Mileage-Sub', glyph: '•', mass: .8, speed: .40, motion: 'ballistic' },
    { id: '19', name: 'Recall-Trigger', glyph: '◆', mass: 1, speed: .90, motion: 'bounce' },
    { id: '20', name: 'Service-Plan', glyph: '■', mass: .9, speed: .66, motion: 'para-curve' },
    { id: '21', name: 'Warranty-Link', glyph: '◇', mass: .8, speed: .60, motion: 'orbit-service' },
    { id: '22', name: 'Owner-Count', glyph: '●', mass: .7, speed: .55, motion: 'noisy-orbit' },
    { id: '23', name: 'Region-Tag', glyph: '◆', mass: .7, speed: .58, motion: 'perlin' },
    { id: '24', name: 'Fuel-Log', glyph: '○', mass: .8, speed: .50, motion: 'decel-stop' },
    { id: '25', name: 'Accident-Rec', glyph: '×', mass: 1, speed: .85, motion: 'bounce' },
    { id: '26', name: 'Title-Status', glyph: '▣', mass: .9, speed: .64, motion: 'ellipse' },
    { id: '27', name: 'Lien-Note', glyph: '▪', mass: .8, speed: .57, motion: 'sway' },
    { id: '29', name: 'Emission-Log', glyph: '□', mass: .7, speed: .53, motion: 'random-walk' }
  ];
  FRAGMENTS.forEach(function (f, i) { f.color = GOLD[Math.floor(i / FRAGMENTS.length * 32)]; });

  /* ── state ── */
  var cells = [], layers = [], rings = [], shocks = [], sparks = [], embers = [], flashes = [];
  var coreTarget = 34, coreR = 34, coreVel = 0, merged = 0, lockA = 0;
  var phase = 'dispersal', phaseT = 0, time = 0, last = 0;
  var running = true, fading = false, raf = 0;

  function spawn() {
    cells = []; layers = []; rings = []; shocks = []; sparks = []; embers = []; flashes = [];
    coreTarget = 34; coreR = 34; coreVel = 0; merged = 0; lockA = Math.random() * 6.28;
    phase = 'dispersal'; phaseT = 0;
    for (var i = 0; i < FRAGMENTS.length; i++) {
      var f = FRAGMENTS[i], ang = Math.random() * 6.283,
          rad = Math.min(innerWidth, innerHeight) * .40 * (.66 + Math.random() * .34);
      var c = {};
      for (var k in f) c[k] = f[k];
      c.x = cx + Math.cos(ang) * rad;
      c.y = cy + Math.sin(ang) * rad;
      c.vx = (Math.random() - .5) * .5 * f.speed;
      c.vy = (Math.random() - .5) * .5 * f.speed;
      c.r = 5.5 + Math.random() * 3;
      c.rot = Math.random() * 6.28; c.spin = (Math.random() - .5) * .004;
      c.trail = []; c.active = true; c.sealing = false; c.sealT = 0; c.hit = false;
      c.sr = 0; c.lock = 0; c.born = 0; c.alpha = 0; c.flash = 0; c.seed = Math.random() * 1000;
      cells.push(c);
    }
  }

  /* ── motion models (smooth; no per-frame randomness) ── */
  function applyMotion(c, dt, t) {
    var dx = c.x - cx, dy = c.y - cy, d = Math.hypot(dx, dy) || 1;
    switch (c.motion) {
      case 'decay-osc': { var w = Math.PI / 2.5;
        c.vx += Math.sin(w * t) * .0009 * dt - c.vx * .0006 * dt;
        c.vy += Math.cos(w * t) * .0007 * dt - c.vy * .0006 * dt; break; }
      case 'para-curve': c.vx -= .01 * dt * .018; c.vy -= .01 * dt * .018; break;
      case 'ballistic': break;
      case 'ballistic-pair': {
        var v = findByName('VIN-Fragment');
        if (v) { c.vx += (v.x - c.x) * .000008 * dt; c.vy += (v.y - c.y) * .000008 * dt; } break; }
      case 'double-osc': { var w2 = Math.PI / 5;
        c.vx += Math.sin(w2 * t + c.seed) * .0013 * dt; c.vy += Math.cos(2 * w2 * t) * .001 * dt; break; }
      case 'noisy-orbit': { var tx = -dy / d, ty = dx / d, n = noise(c.x * .004, c.y * .004, t * .5);
        c.vx += tx * .0016 * dt + Math.cos(n * 6.283) * .0009 * dt;
        c.vy += ty * .0016 * dt + Math.sin(n * 6.283) * .0009 * dt; break; }
      case 'ellipse': { var a = 140, b = 90,
          tg = (a * b) / Math.hypot(b * dx, a * dy) || d, pl = (tg - d) * .00002,
          tx2 = -dy / d, ty2 = dx / d;
        c.vx += (dx / d) * pl * dt + tx2 * .0013 * dt;
        c.vy += (dy / d) * pl * dt + ty2 * .0013 * dt; break; }
      case 'decel-stop': { var cyc = (t * 1000) % 5000; if (cyc < 800) { c.vx *= .72; c.vy *= .72; }
        c.vx -= .005 * dt * .018; c.vy -= .003 * dt * .018; break; }
      case 'bounce': break;
      case 'orbit-core': { var tx3 = -dy / d, ty3 = dx / d;
        c.vx += tx3 * .0016 * dt; c.vy += ty3 * .0016 * dt; break; }
      case 'sway': c.vx += Math.sin(t + c.seed) * .001 * dt; break;
      case 'orbit-service': {
        var s = findByName('Service Cell');
        if (s) { var sx = c.x - s.x, sy = c.y - s.y, sd = Math.hypot(sx, sy) || 1;
          c.vx += -sy / sd * .0025 * dt; c.vy += sx / sd * .0025 * dt; } break; }
      case 'sinusoidal': c.vx += Math.sin(t * 1.5 + c.seed) * .0015 * dt;
        c.vy += Math.cos(t * 1.2 + c.seed) * .001 * dt; break;
      case 'fast-straight': break;
      case 'curve': c.vx += .0005 * Math.sin(t * .8 + c.seed) * dt; break;
      case 'random-walk': { var n2 = noise(c.x * .004 + c.seed, c.y * .004, t * .45);
        c.vx += Math.cos(n2 * 6.283) * .0016 * dt; c.vy += Math.sin(n2 * 6.283) * .0016 * dt; break; }
      case 'perlin': { var n3 = noise(c.x * .005, c.y * .005, t);
        c.vx += Math.cos(n3 * 6.283) * .001 * dt; c.vy += Math.sin(n3 * 6.283) * .001 * dt; break; }
    }
  }
  function findByName(n) { for (var i = 0; i < cells.length; i++) if (cells[i].name === n) return cells[i]; return null; }

  /* ── core impact: spring overshoot + concentric rings + embers ── */
  function coreHit(c) {
    coreTarget += 1.6;
    // three concentric rings, staggered — the signature "ring effect"
    rings.push({ t: 0, d: 0, dur: 1150, sc: 1.4, lw: 1.7 });
    rings.push({ t: 0, d: 170, dur: 1150, sc: 1.4, lw: 1.5 });
    rings.push({ t: 0, d: 340, dur: 1150, sc: 1.4, lw: 1.3 });
    shocks.push({ x: c.x, y: c.y, t: 0, dur: 900, r0: 10, r1: 280 });
    flashes.push({ x: c.x, y: c.y, t: 0, dur: 520 });
    for (var k = 0; k < 22; k++) { var a = Math.random() * 6.283, s = .3 + Math.random() * 2.2;
      embers.push({ x: c.x, y: c.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - .4, life: 900, max: 900, ph: Math.random() * 7 }); }
    for (var j = 0; j < 12; j++) { var an = Math.random() * 6.283, sp = 1 + Math.random() * 3;
      sparks.push({ x: c.x, y: c.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: 420, max: 420 }); }
  }

  function sealLock(c) { c.sealing = true; c.sealT = 0; c.hit = false;
    c.sr = Math.hypot(c.x - cx, c.y - cy); c.lock = (lockA += 2.399); }

  function step(dt) {
    var dts = dt / 1000, t = time * .001;
    time += dt; phaseT += dt;

    if (phase === 'dispersal' && phaseT > DISPERSAL) { phase = 'converge'; phaseT = 0; }
    if (phase === 'converge') {
      if (merged >= cells.length) {
        phase = 'unite'; phaseT = 0;
        // the seal: three wide rings leave the core as the last fragment lands
        rings.push({ t: 0, d: 0, dur: 2600, sc: 5, lw: 3 });
        rings.push({ t: 0, d: 240, dur: 2600, sc: 5, lw: 2.4 });
        rings.push({ t: 0, d: 480, dur: 2600, sc: 5, lw: 2 });
      }
      else if (phaseT > FORCE_SEAL) {
        for (var z = 0; z < cells.length; z++) {
          var cz = cells[z];
          if (cz.active && !cz.sealing) sealLock(cz);
        }
      }
    }
    if (phase === 'unite' && phaseT > HOLD) finish();

    // core spring — damped with gentle overshoot
    var acc = (coreTarget - coreR) * 120 - coreVel * 13;
    coreVel += acc * dts; coreR += coreVel * dts;

    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (!c.active && !c.sealing) continue;
      c.born += dt; c.alpha = Math.min(1, c.born / 700);
      c.rot += c.spin * dt;

      if (c.sealing) {
        /* 3-stage seal: attract → wind-up → strike (overshoot) */
        c.sealT += dt;
        var rad, sc = 1;
        if (c.sealT < 340) { var p = outQuint(c.sealT / 340); rad = lerp(c.sr, coreR + 42, p); sc = lerp(1, .9, p); }
        else if (c.sealT < 520) { var p2 = inOutCubic((c.sealT - 340) / 180); rad = lerp(coreR + 42, coreR + 74, p2); sc = lerp(.9, .72, p2); }
        else { var p3 = clamp((c.sealT - 520) / 170, 0, 1); rad = lerp(coreR + 74, coreR + 2, outBack(p3)); sc = lerp(.72, 1.35, outElastic(p3)); }
        c.x = cx + Math.cos(c.lock) * rad; c.y = cy + Math.sin(c.lock) * rad; c.sealScale = sc;
        if (c.trail.length > 3) c.trail.splice(0, c.trail.length - 3);
        if (!c.hit && c.sealT >= 560) { coreHit(c); c.hit = true; }
        if (c.sealT >= 760) { c.active = false; c.sealing = false; merged++; layers.push({ r: coreR }); }
        continue;
      }

      applyMotion(c, dt, t);
      var dx = c.x - cx, dy = c.y - cy, d = Math.hypot(dx, dy) || 1;
      if (phase === 'dispersal') { c.vx += dx / d * .001 * dt; c.vy += dy / d * .001 * dt; }
      else {
        var ad = Math.hypot(cx - c.x, cy - c.y), af = .0008 * dt * Math.min(ad, 200);
        c.vx += (cx - c.x) / ad * af; c.vy += (cy - c.y) / ad * af;
        if (ad < 130) { c.vx += (cy - c.y) / ad * .00045 * dt; c.vy += (cx - c.x) / ad * .00045 * dt; }
      }

      var sp = Math.hypot(c.vx, c.vy); if (sp > 3) { c.vx = c.vx / sp * 3; c.vy = c.vy / sp * 3; }
      c.x += c.vx * dt * .06; c.y += c.vy * dt * .06;
      var rest = c.motion === 'bounce' ? .92 : .5;
      if (c.x < c.r) { c.x = c.r; c.vx = Math.abs(c.vx) * rest; }
      if (c.x > innerWidth - c.r) { c.x = innerWidth - c.r; c.vx = -Math.abs(c.vx) * rest; }
      if (c.y < c.r) { c.y = c.r; c.vy = Math.abs(c.vy) * rest; }
      if (c.y > innerHeight - c.r) { c.y = innerHeight - c.r; c.vy = -Math.abs(c.vy) * rest; }
      c.trail.push({ x: c.x, y: c.y }); if (c.trail.length > 26) c.trail.shift();
      if (!c.sealing && Math.hypot(c.x - cx, c.y - cy) < coreR + c.r + 10) sealLock(c);
      c.flash = Math.max(0, c.flash - dt * .004);
    }

    // collisions
    for (var a2 = 0; a2 < cells.length; a2++) {
      var A = cells[a2]; if (!A.active || A.sealing) continue;
      for (var b2 = a2 + 1; b2 < cells.length; b2++) {
        var B = cells[b2]; if (!B.active || B.sealing) continue;
        var ddx = B.x - A.x, ddy = B.y - A.y, dd = Math.hypot(ddx, ddy), mn = A.r + B.r;
        if (dd > 0 && dd < mn) {
          var ov = mn - dd, nx = ddx / dd, ny = ddy / dd;
          A.x -= nx * ov * .5; A.y -= ny * ov * .5; B.x += nx * ov * .5; B.y += ny * ov * .5;
          var e = .15, vr = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
          if (vr < 0) { var J = -(1 + e) * vr / (1 / A.mass + 1 / B.mass);
            A.vx -= J / A.mass * nx; A.vy -= J / A.mass * ny; B.vx += J / B.mass * nx; B.vy += J / B.mass * ny; }
          flashes.push({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, t: 0, dur: 260, hit: 1 });
          A.flash = B.flash = .55;
          for (var k2 = 0; k2 < 3; k2++) { var an2 = Math.random() * 6.283, s2 = 1 + Math.random() * 2.4;
            sparks.push({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, vx: Math.cos(an2) * s2, vy: Math.sin(an2) * s2, life: 300, max: 300 }); }
        }
      }
    }

    flashes.forEach(function (o) { o.t += dt; }); flashes = flashes.filter(function (o) { return o.t < o.dur; });
    shocks.forEach(function (o) { o.t += dt; }); shocks = shocks.filter(function (o) { return o.t < o.dur; });
    rings.forEach(function (o) { o.t += dt; }); rings = rings.filter(function (o) { return o.t < o.dur + (o.d || 0); });
    sparks.forEach(function (o) { o.x += o.vx; o.y += o.vy; o.vx *= .93; o.vy *= .93; o.life -= dt; });
    sparks = sparks.filter(function (o) { return o.life > 0; });
    embers.forEach(function (o) { o.x += o.vx; o.y += o.vy; o.vy -= .004 * dt; o.vx *= .99; o.vy *= .99; o.life -= dt; });
    embers = embers.filter(function (o) { return o.life > 0; });
    dust.forEach(function (o) {
      o.x += o.vx; o.y += o.vy;
      if (o.x < 0) o.x = innerWidth; if (o.x > innerWidth) o.x = 0;
      if (o.y < 0) o.y = innerHeight; if (o.y > innerHeight) o.y = 0;
    });
  }

  /* No tapered ribbon trails.
     A bright head dragging a tail toward the core reads as something racing
     in to attack it. The motion itself carries the story; trails are gone.
     A faint, short motion-blur ghost (below) keeps the movement legible. */

  function draw() {
    var Wc = innerWidth, Hc = innerHeight, t = time * .001;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, Wc, Hc);
    var amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(Wc, Hc) * .55);
    amb.addColorStop(0, '#050505'); amb.addColorStop(.5, '#020202'); amb.addColorStop(1, '#000');
    ctx.fillStyle = amb; ctx.fillRect(0, 0, Wc, Hc);

    // dust (parallax)
    for (var i = 0; i < dust.length; i++) {
      var p = dust[i], tw = .6 + .4 * Math.sin(t * 1.5 + p.ph);
      ctx.globalAlpha = p.a * tw; ctx.fillStyle = '#c9a24d';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (.5 + p.z), 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // camera: smooth continuous drift + gentle breathing
    var ox = Math.sin(t * .13) * 5, oy = Math.cos(t * .11) * 4;
    var zoom = 1 + .014 * Math.sin(t * .35);
    ctx.save();
    ctx.translate(cx + ox, cy + oy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);

    var breath = 1 + .014 * Math.sin(t * 1.6), coreRx = coreR * breath;

    // god rays
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var g1 = 0; g1 < 6; g1++) {
      var ang = t * .05 + g1 / 6 * 6.283 + Math.sin(t * .3 + g1) * .12,
          len = Math.max(Wc, Hc) * (.3 + .06 * Math.sin(t * .7 + g1 * 1.3)), wI = .08;
      var gg = ctx.createLinearGradient(cx, cy, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      gg.addColorStop(0, 'rgba(184,178,164,.06)'); gg.addColorStop(1, 'rgba(184,178,164,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang - wI) * len, cy + Math.sin(ang - wI) * len);
      ctx.lineTo(cx + Math.cos(ang + wI) * len, cy + Math.sin(ang + wI) * len);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // AO ring
    ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(cx, cy, coreRx + 9, 0, 6.283); ctx.stroke();

    // core layers (rippled, muted)
    for (var l = layers.length - 1; l >= 0; l--) {
      var r = Math.max(5, coreRx * (1 - l * .052)), rip = 1 + .012 * Math.sin(t * 1.4 + l);
      ctx.beginPath();
      for (var k = 0; k <= 64; k++) {
        var aa = k / 64 * 6.283, rr = r * rip * (1 + .014 * Math.sin(aa * 6 + t * 1.2 + l));
        var xx = cx + Math.cos(aa) * rr, yy = cy + Math.sin(aa) * rr; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.closePath();
      var lg = ctx.createRadialGradient(cx - r * .3, cy - r * .3, 0, cx, cy, r);
      lg.addColorStop(0, 'rgba(150,146,134,.28)'); lg.addColorStop(.6, 'rgba(70,68,62,.2)'); lg.addColorStop(1, 'rgba(18,17,15,.4)');
      ctx.fillStyle = lg; ctx.fill(); ctx.strokeStyle = 'rgba(150,146,134,.28)'; ctx.lineWidth = .7; ctx.stroke();
    }

    // core body — black obsidian
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRx * 3);
    gl.addColorStop(0, 'rgba(150,146,134,.1)'); gl.addColorStop(.35, 'rgba(70,68,62,.04)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, coreRx * 3, 0, 6.283); ctx.fill(); ctx.restore();

    var cb = ctx.createRadialGradient(cx - coreRx * .35, cy - coreRx * .4, 0, cx, cy, coreRx);
    cb.addColorStop(0, '#161514'); cb.addColorStop(.55, '#080807'); cb.addColorStop(1, '#000');
    ctx.fillStyle = cb; ctx.beginPath(); ctx.arc(cx, cy, coreRx, 0, 6.283); ctx.fill();

    // rotating metallic sheen (specular sweep)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, coreRx, 0, 6.283); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    var sa = t * .45;
    var sg = ctx.createLinearGradient(cx + Math.cos(sa) * coreRx, cy + Math.sin(sa) * coreRx,
      cx - Math.cos(sa) * coreRx, cy - Math.sin(sa) * coreRx);
    sg.addColorStop(0, 'rgba(220,214,198,.14)'); sg.addColorStop(.5, 'rgba(220,214,198,0)');
    ctx.fillStyle = sg; ctx.fillRect(cx - coreRx, cy - coreRx, coreRx * 2, coreRx * 2); ctx.restore();

    // ratio grid
    var phi = 1.618; ctx.strokeStyle = 'rgba(150,146,134,.1)'; ctx.lineWidth = .55;
    for (var gi = 0; gi < 12; gi++) {
      var ga = gi * Math.PI / 6 + t * .02;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ga) * coreRx * 1.9, cy + Math.sin(ga) * coreRx * 1.9); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(150,146,134,.14)';
    for (var pk = 1; pk <= 3; pk++) { ctx.beginPath(); ctx.arc(cx, cy, coreRx / Math.pow(phi, pk), 0, 6.283); ctx.stroke(); }

    // Fresnel rim (lit from upper-left) — subtle
    var rimA = t * .25, lx = cx - Math.cos(rimA) * coreRx, ly = cy - Math.sin(rimA) * coreRx;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var rg = ctx.createLinearGradient(lx, ly, cx + Math.cos(rimA) * coreRx, cy + Math.sin(rimA) * coreRx);
    rg.addColorStop(0, 'rgba(228,222,206,.35)'); rg.addColorStop(1, 'rgba(228,222,206,0)');
    ctx.strokeStyle = rg; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, coreRx, -Math.PI * .9, -Math.PI * .35); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(150,146,134,.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, coreRx, 0, 6.283); ctx.stroke();

    // impact rings — concentric, expanding, fading (the signature effect)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var ri = 0; ri < rings.length; ri++) {
      var ro = rings[ri], dly = ro.d || 0;
      if (ro.t < dly) continue;
      var rp = (ro.t - dly) / ro.dur, rr2 = coreR * (.6 + rp * (ro.sc || 1.4)), ra2 = (1 - rp) * .55;
      ctx.strokeStyle = SEAL_GOLD;
      ctx.globalAlpha = ra2; ctx.lineWidth = (ro.lw || 1.5) * (1 - rp) + .3;
      ctx.beginPath(); ctx.arc(cx, cy, rr2, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = ra2 * .33; ctx.lineWidth = (ro.lw || 1.5) * 4 * (1 - rp) + .3;
      ctx.beginPath(); ctx.arc(cx, cy, rr2, 0, 6.283); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;

    // wordmark
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save(); ctx.globalAlpha = .9 + .1 * Math.sin(t * 1.6);
    ctx.fillStyle = '#e6c67a'; ctx.font = '600 13px "IBM Plex Mono",ui-monospace,monospace';
    ctx.fillText('D A T U M', cx, cy - 7); ctx.restore();
    ctx.fillStyle = '#a8892f'; ctx.font = '500 11px "IBM Plex Mono",ui-monospace,monospace';
    ctx.fillText('A T E L I E R', cx, cy + 10);

    // shockwaves
    for (var si = 0; si < shocks.length; si++) {
      var so = shocks[si], sp2 = so.t / so.dur, sr2 = so.r0 + (so.r1 - so.r0) * outCubic(sp2);
      ctx.globalAlpha = (1 - sp2) * .8; ctx.strokeStyle = SEAL_GOLD; ctx.lineWidth = 2.5 * (1 - sp2) + .4;
      ctx.beginPath(); ctx.arc(so.x, so.y, sr2, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = (1 - sp2) * .28; ctx.lineWidth = 8 * (1 - sp2);
      ctx.beginPath(); ctx.arc(so.x, so.y, sr2 * .8, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // sparks (motion-blurred streaks)
    for (var ki = 0; ki < sparks.length; ki++) {
      var sk = sparks[ki], alp = sk.life / sk.max;
      ctx.strokeStyle = 'rgba(255,240,200,' + alp + ')'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sk.x, sk.y); ctx.lineTo(sk.x - sk.vx * 5, sk.y - sk.vy * 5); ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // seal flashes (additive bloom)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var fi = 0; fi < flashes.length; fi++) {
      var fo = flashes[fi], fp = fo.t / fo.dur, fa = 1 - fp, FR = fo.hit ? 30 * (1 + fp) : 70 * (0.5 + fp);
      var fg = ctx.createRadialGradient(fo.x, fo.y, 0, fo.x, fo.y, FR);
      fg.addColorStop(0, 'rgba(255,235,180,' + (fa * (fo.hit ? .42 : .7)) + ')'); fg.addColorStop(1, 'rgba(255,235,180,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fo.x, fo.y, FR, 0, 6.283); ctx.fill();
    }
    ctx.restore();

    // embers (buoyant, flickering)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var ei = 0; ei < embers.length; ei++) {
      var eo = embers[ei], ea = eo.life / eo.max, fl = .6 + .4 * Math.sin(t * 14 + eo.ph);
      ctx.globalAlpha = ea * fl * .9; ctx.fillStyle = '#ffcf6b';
      ctx.beginPath(); ctx.arc(eo.x, eo.y, 1 + ea * 1.4, 0, 6.283); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;

    // cells: faint motion-blur ghosts + body + glyph
    var maxD = Math.hypot(Wc, Hc) * .6;
    for (var ci = 0; ci < cells.length; ci++) {
      var c = cells[ci];
      if (!c.active && !c.sealing) continue;
      var depth = clamp(Math.hypot(c.x - cx, c.y - cy) / maxD, 0, 1);
      var base = (1.3 - .5 * depth) * (c.sealing ? (c.sealScale || 1) : 1);

      if (c.trail.length > 2) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (var gt = 4; gt <= 9; gt += 5) {
          if (gt >= c.trail.length) continue;
          var gp = c.trail[c.trail.length - 1 - gt], galpha = (1 - gt / 18) * .13 * c.alpha;
          ctx.globalAlpha = galpha; ctx.fillStyle = c.color;
          ctx.beginPath(); ctx.arc(gp.x, gp.y, c.r * base * .85, 0, 6.283); ctx.fill();
        }
        ctx.restore();
      }

      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(base, base); ctx.rotate(c.rot);

      // halo (additive, softer for far = fake DOF)
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var hr = c.r * (2.4 + depth * 1.6), hg = ctx.createRadialGradient(0, 0, 0, 0, 0, hr);
      hg.addColorStop(0, c.color + (c.flash > 0 ? '99' : '55')); hg.addColorStop(1, c.color + '00');
      ctx.globalAlpha = .7 + .3 * c.alpha; ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(0, 0, hr, 0, 6.283); ctx.fill(); ctx.restore();

      // hex body, lit upper-left
      ctx.beginPath();
      for (var hk = 0; hk < 6; hk++) { var ha = hk / 6 * 6.283, hx = Math.cos(ha) * c.r, hy = Math.sin(ha) * c.r; hk ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy); }
      ctx.closePath();
      var bgd = ctx.createRadialGradient(-c.r * .45, -c.r * .5, 0, 0, 0, c.r * 1.1);
      bgd.addColorStop(0, '#241c0e'); bgd.addColorStop(.6, '#0a0703'); bgd.addColorStop(1, '#030201');
      ctx.fillStyle = bgd; ctx.fill();
      ctx.strokeStyle = c.color; ctx.lineWidth = 1.25; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,200,.55)'; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.moveTo(-c.r * .87, -c.r * .5); ctx.lineTo(0, -c.r); ctx.lineTo(c.r * .87, -c.r * .5); ctx.stroke();

      if (c.flash > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,240,200,' + (c.flash * .6) + ')';
        ctx.beginPath(); ctx.arc(0, 0, c.r, 0, 6.283); ctx.fill(); ctx.restore();
      }

      ctx.rotate(-c.rot);
      ctx.fillStyle = '#f0e2b8'; ctx.font = '600 9px "IBM Plex Mono",ui-monospace,monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.glyph, 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // vignette
    var vg = ctx.createRadialGradient(cx, cy, Math.min(Wc, Hc) * .3, cx, cy, Math.max(Wc, Hc) * .72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.8)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, Wc, Hc);

    // grain (very subtle, slow drift — no flicker)
    ctx.save(); ctx.globalAlpha = .02;
    ctx.translate((Math.floor(time / 120) * 7) % 140, (Math.floor(time / 120) * 11) % 140);
    ctx.fillStyle = grain; ctx.fillRect(-140, -140, Wc + 280, Hc + 280); ctx.restore();

    // hairlines frame
    ctx.strokeStyle = 'rgba(150,146,134,.14)'; ctx.lineWidth = 1;
    ctx.strokeRect(20.5, 20.5, Wc - 41, Hc - 41);
  }

  /* ── lifecycle ── */
  var startedAt = 0;

  function onIntent() { if (performance.now() - startedAt > 600) finish(); }

  function finish() {
    if (fading) return; fading = true;
    window.removeEventListener('pointerdown', onIntent);
    window.removeEventListener('keydown', onIntent);
    window.removeEventListener('wheel', onIntent);
    window.removeEventListener('touchstart', onIntent);
    el.classList.add('out');
    document.documentElement.classList.remove('splash-on');
    setTimeout(function () {
      running = false;
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1200);
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(33, now - last); last = now;
    if (dt > 0) step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function begin() {
    if (startedAt) return;
    startedAt = performance.now();
    try { sessionStorage.setItem('datum_splash', '1'); } catch (e) {}
    document.documentElement.classList.add('splash-on');
    el.classList.add('on');
    resize(); spawn();
    addEventListener('resize', resize);
    last = performance.now();
    raf = requestAnimationFrame(frame);
    window.addEventListener('pointerdown', onIntent, { passive: true });
    window.addEventListener('keydown', onIntent, { passive: true });
    window.addEventListener('wheel', onIntent, { passive: true });
    window.addEventListener('touchstart', onIntent, { passive: true });
  }

  /* ── wait for the veil to lift, then take over ── */
  var veilOff = document.documentElement.classList.contains('veil-off');
  if (veilOff) setTimeout(begin, 150);
  else document.addEventListener('datum:veil-lifted', function () { setTimeout(begin, 150); }, { once: true });
  setTimeout(function () { begin(); }, 7000); // safety net
})();
