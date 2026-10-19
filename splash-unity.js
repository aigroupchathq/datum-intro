/* ============================================================
   DATUM ATELIER - "Cellular Unity", the on-demand opening beat.
   OLED-monochrome cut: a black eclipse disc on true black. Records
   of a car's life - ownership, memory, service, chassis, VIN,
   mileage, warranty - find their lane, answer a single wavefront
   call, dock on a metronome cadence, ring the disc, and are
   swallowed into one history. Light is the only colour here.

   It never plays by itself. It ignites when:
     - a button calls window.DATUM_WORLD.ignite({ after, source })
     - the page dispatches: new CustomEvent('datum:ignite', { detail })
     - the URL carries ?splash=1 (preview override)

   ?splash=0 blocks ignition outright.

   Protocol while playing:
     - Esc, or the visible skip control, ends it immediately
     - any other input ends it after a 600ms grace period
     - reduced motion gets a still plate, never the animation

   Motion doctrine: nothing ever bounces (no overshoot curves);
   one phase-locked resonator owns all oscillation; the camera
   never shakes (one scripted dolly); timing is composed, not
   emergent. Post-merge landing: after='motorworld' opens the
   Motor World drawer on the ENGINE lens and scrolls there.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- tokens: OLED monochrome ---------- */
  var BG = '#000000';                  /* true black - pixels off */
  var W  = '255,255,255';              /* white for rgba strings  */

  /* six luminance tiers replace the old 32-hue spectrum */
  var TIERS = [ .40, .52, .64, .76, .88, 1 ];

  /* ---------- timing: composed beats, not a toll ---------- */
  var T_ESTABLISH = 500,    /* bloom-up of the resting disc          */
      T_LANES0    = 500,    /* fragments find their lanes            */
      LANE_STAG   = 18,     /* per-fragment lane stagger             */
      T_CALL0     = 1600,   /* the wavefront call begins             */
      T_CALLSPAN  = 1700,   /* wavefront sweeps to the park ring     */
      T_DOCK0     = 2900,   /* docking cadence begins                */
      BEAT        = 55,     /* one seat every 55 ms                  */
      DOCK_DUR    = 620,    /* radial drop per record                */
      SEAL_DUR    = 500,    /* swallow into the disc after the seat  */
      T_LOCK      = T_DOCK0 + 30*BEAT + DOCK_DUR,  /* 5170 */
      T_END       = 6400,   /* film ends; resonance has settled      */
      HOLD        = 400,
      GRACE_MS    = 600,
      FADE_MS     = 920;

  /* resonance: one oscillator, phase-locked, exponentially damped */
  var RES_T = 1050, RES_TAU = 420;

  /* ---------- elements ---------- */
  var el      = document.getElementById('splash'),
      canvas  = document.getElementById('splash-c'),
      uiWord  = document.getElementById('splash-word'),
      uiCount = document.getElementById('splash-count'),
      uiSkip  = document.getElementById('splash-skip'),
      uiStill = document.getElementById('splash-still');
  if (!el || !canvas || !uiWord || !uiCount || !uiSkip || !uiStill) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  /* ---------- lifecycle state ---------- */
  var ending = false, running = false, runId = 0,
      afterPlan = null, sourceBtn = null,
      startedAt = 0, last = 0, time = 0, raf = 0;

  function locked() { return document.documentElement.classList.contains('splash-on'); }
  function pad2(n)  { return String(n).padStart(2, '0'); }

  /* ---------- input protocol ---------- */
  function onSkip()   { finish('skip'); }
  function onKey(e)   { if (e.key === 'Escape') { finish('esc'); return; }
                        if (performance.now() - startedAt > GRACE_MS) finish('input'); }
  function onIntent() { if (performance.now() - startedAt > GRACE_MS) finish('input'); }

  function arm() {
    uiSkip.addEventListener('click', onSkip);
    window.addEventListener('keydown', onKey, { passive: true });
    window.addEventListener('pointerdown', onIntent, { passive: true });
    window.addEventListener('wheel', onIntent, { passive: true });
    window.addEventListener('touchstart', onIntent, { passive: true });
    window.addEventListener('resize', sizeCanvas);
  }
  function disarm() {
    uiSkip.removeEventListener('click', onSkip);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerdown', onIntent);
    window.removeEventListener('wheel', onIntent);
    window.removeEventListener('touchstart', onIntent);
    window.removeEventListener('resize', sizeCanvas);
  }

  /* ---------- page lock: nothing beneath is reachable while playing ---------- */
  function setInert(on) {
    var nodes = document.body.children, skip = { SCRIPT: 1, STYLE: 1 };
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n === el || skip[n.tagName]) continue;
      try { n.inert = on; } catch (e) {}
    }
  }

  /* ============================================================
     PUBLIC SURFACE (unchanged contract)
     ============================================================ */
  function ignite(opts) {
    opts = opts || {};
    var url = '';
    try { url = location.search || ''; } catch (e) {}
    if (/splash=0/.test(url) || ending || locked()) return false;

    var reduce = false;
    try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}

    el.classList.remove('out', 'is-still');
    el.removeAttribute('aria-hidden');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', "Datum world. The car's records converge into one history.");
    el.classList.add('on');
    document.documentElement.classList.add('splash-on');
    setInert(true);
    sourceBtn = opts.source || (document.activeElement && document.activeElement !== document.body ? document.activeElement : null);
    afterPlan = opts.after || null;

    startedAt = performance.now();
    arm();

    if (reduce) {
      el.classList.add('is-still');
      uiStill.setAttribute('tabindex', '-1');
      uiStill.focus({ preventScroll: true });
      var rid = ++runId;
      setTimeout(function () { if (rid === runId) finish('still-end'); }, 2600);
      return true;
    }

    ensureWorld();
    resetHud();
    uiSkip.focus({ preventScroll: true });
    last = startedAt; time = 0;
    raf = requestAnimationFrame(frame);
    return true;
  }

  function finish(reason) {
    if (ending || !locked()) return;
    ending = true;
    disarm();
    cancelAnimationFrame(raf);
    document.documentElement.classList.remove('splash-on');
    setInert(false);
    el.classList.add('out');
    setTimeout(function () {
      var route = afterPlan; afterPlan = null;
      el.classList.remove('on', 'out', 'is-still');
      el.removeAttribute('role');
      el.removeAttribute('aria-modal');
      el.setAttribute('aria-hidden', 'true');
      ending = false;
      if (route === 'motorworld') land('motorworld');
      if (sourceBtn && document.contains(sourceBtn)) { try { sourceBtn.focus({ preventScroll: true }); } catch (e) {} }
      sourceBtn = null;
      try { document.dispatchEvent(new CustomEvent('datum:world:closed', { detail: { endedBy: route || 'none', reason: reason } })); } catch (e) {}
    }, FADE_MS);
  }

  /* ---------- post-merge landing: the film becomes navigation ---------- */
  function land(where) {
    if (where !== 'motorworld') return;
    var drawer = document.querySelector('#motorworld .drawer[data-drawer]');
    var sum = drawer && drawer.querySelector('.drawer-sum');
    if (sum && sum.getAttribute('aria-expanded') !== 'true') sum.click();
    var chip = drawer.querySelector('.chip[data-lens="engine"]') || drawer.querySelector('.chip[data-lens]');
    if (chip && chip.getAttribute('aria-selected') !== 'true') chip.click();
    var sec = document.getElementById('motorworld');
    if (sec) { try { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
  }

  /* ---------- hooks ---------- */
  window.DATUM_WORLD = {
    ignite: ignite,
    playing: locked
  };
  document.addEventListener('datum:ignite', function (e) {
    ignite((e && e.detail) || {});
  });

  /* preview override */
  try { if (/splash=1/.test(location.search)) setTimeout(function () { ignite({}); }, 550); } catch (e) {}

  /* ============================================================
     ENGINE - monochrome eclipse
     ============================================================ */

  var DPR = 1, Wd = 0, Hd = 0, cx = 0, cy = 0, minSide = 0, PARK_R = 0;
  function sizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    Wd = canvas.width  = Math.floor(innerWidth  * DPR);
    Hd = canvas.height = Math.floor(innerHeight * DPR);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = innerWidth / 2; cy = innerHeight / 2;
    minSide = Math.min(innerWidth, innerHeight);
    PARK_R = minSide * 0.44;
    bakeBackdrop();
  }

  /* ---------- baked sprites: the frame budget lives here ---------- */
  var back = null, rays = null, halo = [], hexSpr = null, flare = null;
  var baked = false;

  function bakeSprites() {
    if (baked) return;
    baked = true;

    /* halo: one sprite per luminance tier - white, nothing else */
    for (var i = 0; i < TIERS.length; i++) {
      var t = TIERS[i], s = 56;
      var hc = document.createElement('canvas'); hc.width = hc.height = s;
      var hx = hc.getContext('2d'),
          hg = hx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
      hg.addColorStop(0,  'rgba(' + W + ',' + (t*.85).toFixed(3) + ')');
      hg.addColorStop(.3, 'rgba(' + W + ',' + (t*.28).toFixed(3) + ')');
      hg.addColorStop(1,  'rgba(' + W + ',0)');
      hx.fillStyle = hg; hx.fillRect(0, 0, s, s);
      halo.push(hc);
    }

    /* hex body: pure black face, white rim, top-left catchlight */
    var hs = 96;
    hexSpr = document.createElement('canvas'); hexSpr.width = hexSpr.height = hs;
    var bx = hexSpr.getContext('2d'), hr2 = 40;
    bx.translate(hs/2, hs/2);
    bx.beginPath();
    for (var k = 0; k < 6; k++) {
      var a = k/6*6.2832 - 1.5708, px = Math.cos(a)*hr2, py = Math.sin(a)*hr2;
      k ? bx.lineTo(px, py) : bx.moveTo(px, py);
    }
    bx.closePath();
    var bg = bx.createRadialGradient(-hr2*.4, -hr2*.45, 0, 0, 0, hr2*1.1);
    bg.addColorStop(0, '#0b0b0b'); bg.addColorStop(.6, '#020202'); bg.addColorStop(1, '#000');
    bx.fillStyle = bg; bx.fill();
    bx.strokeStyle = 'rgba(' + W + ',.42)'; bx.lineWidth = 3; bx.stroke();
    bx.beginPath(); bx.moveTo(-hr2*.87, -hr2*.5); bx.lineTo(0, -hr2); bx.lineTo(hr2*.87, -hr2*.5);
    bx.strokeStyle = 'rgba(' + W + ',.5)'; bx.lineWidth = 2; bx.stroke();

    /* flare: white bloom puck, reserved for the single lock bloom */
    var fs = 128;
    flare = document.createElement('canvas'); flare.width = flare.height = fs;
    var fx = flare.getContext('2d'),
        fg = fx.createRadialGradient(fs/2, fs/2, 0, fs/2, fs/2, fs/2);
    fg.addColorStop(0, 'rgba(' + W + ',.85)');
    fg.addColorStop(.35, 'rgba(' + W + ',.28)');
    fg.addColorStop(1, 'rgba(' + W + ',0)');
    fx.fillStyle = fg; fx.fillRect(0, 0, fs, fs);

    /* corona rays: one pre-baked white wheel, rotated live */
    var rs = 720;
    rays = document.createElement('canvas'); rays.width = rays.height = rs;
    var rx = rays.getContext('2d');
    rx.translate(rs/2, rs/2);
    rx.globalCompositeOperation = 'lighter';
    for (var g1 = 0; g1 < 6; g1++) {
      var ang = g1/6*6.2832, len = rs/2, wI = .09;
      var gg = rx.createLinearGradient(0, 0, Math.cos(ang)*len, Math.sin(ang)*len);
      gg.addColorStop(0, 'rgba(' + W + ',.05)'); gg.addColorStop(1, 'rgba(' + W + ',0)');
      rx.fillStyle = gg; rx.beginPath(); rx.moveTo(0, 0);
      rx.lineTo(Math.cos(ang - wI)*len, Math.sin(ang - wI)*len);
      rx.lineTo(Math.cos(ang + wI)*len, Math.sin(ang + wI)*len);
      rx.closePath(); rx.fill();
    }
  }

  /* ---------- backdrop: black, ambient, grain, film gate - baked once ---------- */
  function bakeBackdrop() {
    if (!baked) bakeSprites();
    back = document.createElement('canvas'); back.width = Wd; back.height = Hd;
    var bx2 = back.getContext('2d');
    bx2.setTransform(DPR, 0, 0, DPR, 0, 0);
    bx2.fillStyle = BG; bx2.fillRect(0, 0, innerWidth, innerHeight);
    var amb = bx2.createRadialGradient(cx, cy, 0, cx, cy, Math.max(innerWidth, innerHeight)*.55);
    amb.addColorStop(0, 'rgba(' + W + ',.045)'); amb.addColorStop(.55, 'rgba(' + W + ',.018)'); amb.addColorStop(1, 'rgba(' + W + ',0)');
    bx2.fillStyle = amb; bx2.fillRect(0, 0, innerWidth, innerHeight);
    bx2.globalAlpha = .018;
    for (var i = 0; i < 1400; i++) {
      var fx2 = Math.random()*innerWidth, fy2 = Math.random()*innerHeight, s = Math.random()*1.2;
      bx2.fillStyle = Math.random() > .5 ? '#fff' : '#000';
      bx2.fillRect(fx2, fy2, s, s);
    }
    bx2.globalAlpha = 1;
    /* film gate: a single white hairline frame, gallery style */
    bx2.strokeStyle = 'rgba(' + W + ',.08)'; bx2.lineWidth = 1;
    bx2.strokeRect(20.5, 20.5, innerWidth - 41, innerHeight - 41);
  }

  /* ---------- dust: emulsion motes ---------- */
  var dust = [];
  function seedDust() {
    dust = [];
    for (var d = 0; d < 56; d++) dust.push({
      x: Math.random()*innerWidth, y: Math.random()*innerHeight,
      z: .15 + Math.random()*.85, s: .3 + Math.random()*.9,
      a: .02 + Math.random()*.05,
      vx: (Math.random()-.5)*.008, vy: (Math.random()-.5)*.008,
      ph: Math.random()*7
    });
  }

  /* ---------- fragment roster: the data model of a history ---------- */
  var FRAGMENTS = [
    { id: '1',   name: 'Ownership Cell',   glyph: '\u25A0', mass: 1.2, speed: .70 },
    { id: '2',   name: 'Memory Cell',      glyph: '\u25C6', mass: .8,  speed: .60 },
    { id: '3',   name: 'Service Cell',     glyph: '\u25AC', mass: 1,   speed: .90 },
    { id: '3a',  name: 'Service Sub-Cell', glyph: '\u25AA', mass: .6,  speed: .80, parent: '3' },
    { id: '4',   name: 'Enthusiast Cell',  glyph: '\u25B2', mass: .9,  speed: .75 },
    { id: '5',   name: 'Chassis Cell',     glyph: '\u25B6', mass: 1.5, speed: 1.20 },
    { id: '5a',  name: 'Chassis Sub',      glyph: '\u25B7', mass: 1.1, speed: 1,   parent: '5' },
    { id: '6',   name: 'Journey Cell',     glyph: '\u25B3', mass: .9,  speed: .65 },
    { id: '7',   name: 'World Cell',       glyph: '\u25A1', mass: 1,   speed: .70 },
    { id: '7a',  name: 'World Sub',        glyph: '\u25AB', mass: .7,  speed: .50, parent: '7' },
    { id: '11',  name: 'Memory-Event',     glyph: '\u25C7', mass: .9,  speed: .72 },
    { id: '12',  name: 'Service-History',  glyph: '\u2261', mass: 1,   speed: .66 },
    { id: '12a', name: 'Service-Peak',     glyph: '\u2261', mass: 1,   speed: 1.05, parent: '12' },
    { id: '13',  name: 'Owner-Note',       glyph: '\u25A3', mass: .8,  speed: .58 },
    { id: '14',  name: 'Tech-Spec',        glyph: '\u2261', mass: .9,  speed: 1.10 },
    { id: '15',  name: 'Community-Tag',    glyph: '\u25CB', mass: .7,  speed: .52 },
    { id: '16',  name: 'Chassis-Meta',     glyph: '\u25C6', mass: 1.1, speed: .62 },
    { id: '17',  name: 'VIN-Fragment',     glyph: '\u25A0', mass: 1.2, speed: 1.15 },
    { id: '17a', name: 'VIN-Sub',          glyph: '\u25AB', mass: 1.1, speed: 1.13, parent: '17' },
    { id: '18',  name: 'Mileage-Log',      glyph: '\u25CF', mass: .9,  speed: .48 },
    { id: '18a', name: 'Mileage-Sub',      glyph: '\u2022', mass: .8,  speed: .40, parent: '18' },
    { id: '19',  name: 'Recall-Trigger',   glyph: '\u25C6', mass: 1,   speed: .90 },
    { id: '20',  name: 'Service-Plan',     glyph: '\u25A0', mass: .9,  speed: .66 },
    { id: '21',  name: 'Warranty-Link',    glyph: '\u25C7', mass: .8,  speed: .60 },
    { id: '22',  name: 'Owner-Count',      glyph: '\u25CF', mass: .7,  speed: .55 },
    { id: '23',  name: 'Region-Tag',       glyph: '\u25C6', mass: .7,  speed: .58 },
    { id: '24',  name: 'Fuel-Log',         glyph: '\u25CB', mass: .8,  speed: .50 },
    { id: '25',  name: 'Accident-Rec',     glyph: '\u00D7', mass: 1,   speed: .85 },
    { id: '26',  name: 'Title-Status',     glyph: '\u25A3', mass: .9,  speed: .64 },
    { id: '27',  name: 'Lien-Note',        glyph: '\u25AA', mass: .8,  speed: .57 },
    { id: '29',  name: 'Emission-Log',     glyph: '\u25A1', mass: .7,  speed: .53 }
  ];
  var N = FRAGMENTS.length;

  /* ---------- live state ---------- */
  var cells = [], rings = [], glints = [], embers = [];
  var seats = 0, bloomed = false, sediment = null;
  var phase = 0;            /* continuous resonator phase */
  var quality = { thin: false, dt: [], idx: 0 };

  /* scripted timeline helpers */
  function quinticOut(t)   { return 1 - Math.pow(1 - t, 5); }
  function quarticOut(t)   { return 1 - Math.pow(1 - t, 4); }
  function quinticInOut(t) { return t < .5 ? 16*t*t*t*t*t : 1 - Math.pow(-2*t + 2, 5)/2; }
  function cubicOut(t)     { return 1 - Math.pow(1 - t, 3); }
  function easeInOutC(t)   { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
  function clamp(v, a, b)  { return v < a ? a : v > b ? b : v; }

  /* the Call: wavefront radius as a function of absolute time */
  function rWF(t) {
    var p = clamp((t - T_CALL0)/T_CALLSPAN, 0, 1);
    return 40 + (PARK_R + 14 - 40)*p;
  }

  function ensureWorld() {
    if (running) { spawn(); return; }
    running = true;
    bakeSprites(); seedDust(); sizeCanvas(); spawn();
  }

  function spawn() {
    cells = []; rings = []; glints = []; embers = [];
    seats = 0; bloomed = false; sediment = null; phase = 0;

    /* deterministic golden-spacing lane radii; sub-cells ride just
       outside their parent so the roster's relationships stay legible */
    var byId = {}, primaryIdx = 0, primaries = 0, i;
    for (i = 0; i < N; i++) { if (!FRAGMENTS[i].parent) primaries++; }
    for (i = 0; i < N; i++) {
      var f = FRAGMENTS[i], c = {};
      for (var k in f) c[k] = f[k];
      if (f.parent) {
        c.laneR = byId[f.parent] ? byId[f.parent].laneR*1.085 : minSide*.34;
        c.omega = byId[f.parent] ? byId[f.parent].omega : .12;
      } else {
        var sp = ((primaryIdx + .5)/primaries + .618034*primaryIdx) % 1;
        c.laneR = minSide*(.26 + .16*sp);
        c.omega = .14*Math.pow(150/c.laneR, .8);   /* pseudo-Keplerian */
        primaryIdx++;
        byId[c.id] = c;
      }
      c.ci = Math.floor((((i*7) % 11)/11)*TIERS.length);  /* luminance spread */
      c.r = 5.5 + Math.random()*3;
      c.rot = Math.random()*6.2832; c.spin = (Math.random()-.5)*.001;
      c.angNudge = 0;
      c.lanePhase = Math.random()*6.2832;
      c.tOn = T_LANES0 + i*LANE_STAG;
      c.captured = false; c.fx = 0; c.fy = 0;
      c.tCall = T_CALL0 + T_CALLSPAN*clamp((c.laneR - 40)/(PARK_R + 14 - 40), 0, 1);
      c.durFly = 800;
      /* heavy truths first: dock deepest, earliest */
      c.massRank = 0;
      c.state = 'float';
      c.x = cx + Math.cos(c.lanePhase)*minSide*(.5 + Math.random()*.25);
      c.y = cy + Math.sin(c.lanePhase)*minSide*(.5 + Math.random()*.25);
      c.vx = (Math.random()-.5)*.12; c.vy = (Math.random()-.5)*.12;
      alpha0(c);
      cells.push(c);
    }
    /* rank by mass descending - the heavy records descend first */
    var order = cells.slice().sort(function (a, b) { return b.mass - a.mass; });
    for (i = 0; i < order.length; i++) {
      order[i].massRank = i;
      order[i].dockSlot = T_DOCK0 + i*BEAT;
      order[i].layer = 1 + Math.floor(i*8/N);   /* 8 sediment shells */
    }
    sediment = [];
    for (i = 0; i <= 8; i++) sediment.push({ n: 0 });
  }
  function alpha0(c) { c.alpha = 0; c.born = 0; }

  /* resonance amplitude: idle breath, pumped by seats, decays after lock */
  function ampAt(t) {
    var base = .0045 + .0155*(seats/N);
    if (seats >= N) {
      var d = t - T_LOCK;
      if (d > 0) base *= Math.exp(-d/RES_TAU);
    }
    return base;
  }
  function coreBase() {
    return 26 + 42*easeInOutC(seats/N);
  }

  /* ---------- HUD ---------- */
  function resetHud() {
    uiCount.textContent = N + ' records \u00b7 converging';
    uiCount.classList.remove('locked');
  }
  function hudProgress() {
    uiCount.textContent = pad2(seats) + '/' + N + ' merged';
  }
  function hudLocked() {
    uiCount.textContent = N + ' records \u2192 one history';
    uiCount.classList.add('locked');
  }

  /* ---------- eclipse helpers ---------- */
  function coreR(t) {
    var est = quinticOut(clamp(t/T_ESTABLISH, 0, 1));
    var A = ampAt(t);
    var osc = A*Math.sin(phase) + .25*A*Math.sin(phase*2.4 + .7);
    return coreBase()*est*(1 + osc);
  }

  /* ---------- step: the composed timeline ---------- */
  function step(dt) {
    var t = time;
    var t_s = t*.001;
    phase += 6.2832*dt/RES_T;

    /* the single impact: two rings + a glint + a resonator pump */
    function seat(c) {
      seats++;
      hudProgress();
      rings.push({ t0: t, dur: 900 });
      rings.push({ t0: t + 140, dur: 900 });
      glints.push({ ang: c.dockAng, t0: t, dur: 700 });
      c.sealStart = t;
    }

    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      c.born += dt;
      c.alpha = Math.min(1, c.born/500);

      if (c.state === 'gone') { c.alpha = 0; continue; }

      if (c.state === 'float') {
        c.x += c.vx*dt*.06; c.y += c.vy*dt*.06;
        c.rot += c.spin*dt;
        if (t >= c.tOn) { c.fx = c.x; c.fy = c.y; c.state = 'lane'; }
        continue;
      }

      if (c.state === 'lane') {
        var bl = cubicOut(clamp((t - c.tOn)/900, 0, 1));
        var la = c.lanePhase + c.omega*(t - T_LANES0)*.001;
        var lx = cx + Math.cos(la)*c.laneR, ly = cy + Math.sin(la)*c.laneR;
        c.x = c.fx + (lx - c.fx)*bl;
        c.y = c.fy + (ly - c.fy)*bl;
        c.spin *= Math.exp(-dt*.0012); c.rot += c.spin*dt;
        if (bl >= 1) { c.fx = lx; c.fy = ly; }
        if (t >= c.tCall) {
          c.fx = c.x; c.fy = c.y;
          c.depAng = la;
          c.state = 'fly';
        }
        continue;
      }

      if (c.state === 'fly') {
        var p = clamp((t - c.tCall)/c.durFly, 0, 1), e = quinticInOut(p);
        var th = c.depAng + .085*(t - c.tCall)*.001;
        var P1x = cx + Math.cos(th)*PARK_R, P1y = cy + Math.sin(th)*PARK_R;
        var dx = P1x - c.fx, dy = P1y - c.fy, dl = Math.hypot(dx, dy) || 1;
        var tx = -dy/dl, ty = dx/dl;
        var C1x = c.fx + tx*.42*dl, C1y = c.fy + ty*.42*dl;
        var C2x = P1x - tx*.35*dl, C2y = P1y - ty*.35*dl;
        var u = 1 - e, q = e;
        var w0 = u*u*u, w1 = 3*u*u*q, w2 = 3*u*q*q, w3 = q*q*q;
        c.x = w0*c.fx + w1*C1x + w2*C2x + w3*P1x;
        c.y = w0*c.fy + w1*C1y + w2*C2y + w3*P1y;
        c.spin *= Math.exp(-dt*.0018); c.rot += c.spin*dt;
        if (p >= 1) { c.state = 'park'; c.parkT = t; c.parkAng = th; }
        continue;
      }

      if (c.state === 'park') {
        var pa = c.parkAng + .085*(t - c.parkT)*.001 + c.angNudge;
        c.x = cx + Math.cos(pa)*PARK_R; c.y = cy + Math.sin(pa)*PARK_R;
        if (t >= c.dockSlot) { c.state = 'dock'; c.dockT = t; c.dockAng = pa; }
        continue;
      }

      if (c.state === 'dock') {
        var dp = clamp((t - c.dockT)/DOCK_DUR, 0, 1);
        var drop = quarticOut(dp);
        var rNow = (PARK_R)*(1 - drop) + (coreBase() + 12)*drop;
        c.x = cx + Math.cos(c.dockAng)*rNow; c.y = cy + Math.sin(c.dockAng)*rNow;
        c.scale = 1.06 - .06*quinticOut(dp);
        c.rot += (0 - c.rot%6.2832)*Math.min(1, dt*.004);
        if (dp >= 1) { c.state = 'seal'; c.scale = 1; seat(c); }
        continue;
      }

      if (c.state === 'seal') {
        var sp = clamp((t - c.sealStart)/SEAL_DUR, 0, 1);
        var rS = (coreBase() + 12) + (coreBase()*.55 - (coreBase() + 12))*quarticOut(sp);
        c.x = cx + Math.cos(c.dockAng)*rS; c.y = cy + Math.sin(c.dockAng)*rS;
        c.alpha = 1 - sp;
        if (sp >= 1) {
          c.state = 'gone'; c.alpha = 0;
          sediment[c.layer].n++;
        }
        continue;
      }
    }

    /* parked-ring discipline: a soft angular field keeps neighbours at
       distance - glide not snap (this replaces the old impulse collisions).
       Corrections spring on a per-cell nudge and decay to zero. */
    for (var a2 = 0; a2 < cells.length; a2++) {
      var A2 = cells[a2]; if (A2.state !== 'park') continue;
      for (var b2 = a2 + 1; b2 < cells.length; b2++) {
        var B2 = cells[b2]; if (B2.state !== 'park') continue;
        var angA = A2.parkAng + .085*(t - A2.parkT)*.001 + A2.angNudge;
        var angB = B2.parkAng + .085*(t - B2.parkT)*.001 + B2.angNudge;
        var dAng = pa_(angB - angA), gap = Math.abs(dAng)*PARK_R, mn = A2.r + B2.r + 8;
        if (gap < mn) {
          var sN = .5*(mn - gap)/PARK_R*.055, sg = dAng > 0 ? 1 : -1;
          A2.angNudge -= sg*sN; B2.angNudge += sg*sN;
        }
      }
    }
    for (var f2 = 0; f2 < cells.length; f2++) cells[f2].angNudge *= Math.exp(-dt*.004);

    if (!bloomed && seats >= N && t >= T_LOCK) {
      bloomed = true;
      hudLocked();
      embers.length = 0;
      for (var k3 = 0; k3 < 16; k3++) {
        var an3 = Math.random()*6.2832, s3 = .1 + Math.random()*.7;
        embers.push({ x: cx + Math.cos(an3)*coreBase(), y: cy + Math.sin(an3)*coreBase(),
                      vx: Math.cos(an3)*s3, vy: Math.sin(an3)*s3 - .05, life: 1600, max: 1600, ph: Math.random()*7 });
      }
    }

    if (t >= T_END + HOLD) finish('finished');

    /* ring / glint / ember lifetimes */
    rings = rings.filter(function (o) { return t - o.t0 < o.dur; });
    glints = glints.filter(function (o) { return t - o.t0 < o.dur; });
    embers.forEach(function (o) { o.x += o.vx; o.y += o.vy; o.vy -= .0004*dt; o.vx *= .995; o.vy *= .995; o.life -= dt; });
    embers = embers.filter(function (o) { return o.life > 0; });
    dust.forEach(function (o) {
      o.x += o.vx; o.y += o.vy;
      if (o.x < 0) o.x = innerWidth; if (o.x > innerWidth) o.x = 0;
      if (o.y < 0) o.y = innerHeight; if (o.y > innerHeight) o.y = 0;
    });
  }
  function pa_(a) { while (a > Math.PI) a -= 6.2832; while (a < -Math.PI) a += 6.2832; return a; }

  /* ---------- render ---------- */  function draw() {
    if (!back) return;
    var t = time, i;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.drawImage(back, 0, 0, innerWidth, innerHeight);

    /* camera: one scripted dolly plus a whisper of drift; never shakes */
    var dolly = .94 + .06*cubicOut(clamp(t/T_END, 0, 1));
    ctx.save();
    ctx.translate(cx + Math.sin(t*.00011)*2.5, cy + Math.cos(t*.00009)*2);
    ctx.scale(dolly, dolly); ctx.translate(-cx, -cy);

    var cR = coreR(t), A = ampAt(t), sPh = Math.sin(phase);
    var breath = 1 + .35*A*sPh;

    /* dust: emulsion motes, alpha-only modulation with the resonance */
    for (i = 0; i < dust.length; i++) {
      var p2 = dust[i];
      ctx.globalAlpha = clamp(p2.a*(.6 + .4*Math.sin(t*.0015 + p2.ph))*(1 + .3*A*sPh), 0, 1);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(p2.x, p2.y, p2.s*(.5 + p2.z), 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* corona rays: one blit, mono, faint */
    if (!quality.thin) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.translate(cx, cy); ctx.rotate(t*.00005 + Math.sin(t*.0003)*.05); ctx.translate(-cx, -cy);
      ctx.drawImage(rays, cx - 360, cy - 360, 720, 720);
      ctx.restore();
    }

    /* the Call: the visible wavefront, cause made visible */
    if (t >= T_CALL0 && t <= T_CALL0 + T_CALLSPAN) {
      var wp = clamp((t - T_CALL0)/T_CALLSPAN, 0, 1);
      ctx.strokeStyle = 'rgba(' + W + ',' + (.14*(1 - wp*.35)).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, rWF(t), 0, 6.2832); ctx.stroke();
    }

    /* sediment shells: where history has settled, drawn soft and standing */
    var shells = quality.thin ? 5 : 8;
    for (var L = 1; L <= shells; L++) {
      var sd = sediment ? sediment[L].n : 0;
      if (!sd) continue;
      var sr = (cR*(1 + .10 + L*.055));
      ctx.strokeStyle = 'rgba(' + W + ',' + Math.min(.16, .04 + sd*.012).toFixed(3) + ')';
      ctx.lineWidth = .8;
      ctx.beginPath(); ctx.arc(cx, cy, sr*(1 + .25*A*sPh), 0, 6.2832); ctx.stroke();
    }

    /* impact rings: one stroke plus its echo, cubic decay, no gradient */
    for (var ri = 0; ri < rings.length; ri++) {
      var ro = rings[ri], tp = clamp((t - ro.t0)/ro.dur, 0, 1);
      if (tp <= 0) continue;
      var rr2 = cR + 4 + tp*cR*.9;
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = Math.pow(1 - tp, 2)*.5;
      ctx.lineWidth = 1.6*(1 - tp) + .3;
      ctx.beginPath(); ctx.arc(cx, cy, rr2, 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* glints: light settling upward from the seat angle */
    for (var gi = 0; gi < glints.length; gi++) {
      var gl = glints[gi], gp = clamp((t - gl.t0)/gl.dur, 0, 1);
      var ga = gl.ang + .7*gp, span = .26*(1 - gp*.5);
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = (1 - gp)*.55;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, cR + 2, ga - span/2, ga + span/2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* cells */
    var maxD = Math.hypot(innerWidth, innerHeight)*.6;
    for (var ci = 0; ci < cells.length; ci++) {
      var c = cells[ci];
      if (c.state === 'gone' || c.alpha <= 0) continue;
      var depth = clamp(Math.hypot(c.x - cx, c.y - cy)/maxD, 0, 1);
      var sB = (1.25 - .45*depth)*(c.scale || 1);

      /* halo sprite, tiered luminance */
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var hr = c.r*(2.4 + depth*1.6)*2;
      ctx.globalAlpha = (.5 + .4*c.alpha)*clamp(breath, .9, 1.2);
      ctx.drawImage(halo[c.ci], c.x - hr/2, c.y - hr/2, hr, hr);
      ctx.restore();

      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(sB, sB); ctx.rotate(c.rot);
      var bs = c.r*2.3;
      ctx.drawImage(hexSpr, -bs/2, -bs/2, bs, bs);
      ctx.rotate(-c.rot);
      ctx.fillStyle = 'rgba(255,255,255,' + (.55 + .45*c.ci/TIERS.length).toFixed(3) + ')';
      ctx.font = '500 9px "IBM Plex Mono",ui-monospace,monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.glyph, 0, c.r*.06);
      ctx.restore();
    }

    /* the disc: pure black, defined by its rim of light */
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx, cy, cR, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(' + W + ',.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, cR - .5, 0, 6.2832); ctx.stroke();
    var rimA = t*.00045;
    ctx.strokeStyle = 'rgba(' + W + ',.6)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, cR - .8, rimA, rimA + 1.9); ctx.stroke();

    /* specular sweep inside the rim (thin mode skips it) */
    if (!quality.thin) {
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, cR, 0, 6.2832); ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      var sa = t*.00045, sr2 = cR*1.05;
      var sg = ctx.createLinearGradient(cx + Math.cos(sa)*sr2, cy + Math.sin(sa)*sr2, cx - Math.cos(sa)*sr2, cy - Math.sin(sa)*sr2);
      sg.addColorStop(0, 'rgba(' + W + ',.10)'); sg.addColorStop(.5, 'rgba(' + W + ',0)');
      ctx.fillStyle = sg; ctx.fillRect(cx - cR, cy - cR, cR*2, cR*2);
      ctx.restore();
    }

    /* single lock bloom with its ember exhale */
    if (bloomed) {
      var bp = clamp((t - T_LOCK)/520, 0, 1);
      if (bp < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - bp)*.5;
        var fr2 = cR*3.2*(0.4 + bp);
        ctx.drawImage(flare, cx - fr2/2, cy - fr2/2, fr2, fr2);
        ctx.restore(); ctx.globalAlpha = 1;
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var ei = 0; ei < embers.length; ei++) {
        var eo = embers[ei], ea = eo.life/eo.max, fl = .6 + .4*Math.sin(t*.014 + eo.ph);
        ctx.globalAlpha = ea*fl*.8; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(eo.x, eo.y, 1 + ea*1.2, 0, 6.2832); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /* ---------- watchdog: thin the frame when a real GPU needs it ---------- */
  function watch(dt) {
    var b = quality.dt; b[quality.idx] = dt; quality.idx = (quality.idx + 1) % 24;
    if (quality.idx !== 0) return;
    var avg = 0;
    for (var i = 0; i < b.length; i++) avg += (b[i] || 16);
    avg /= b.length;
    if (avg > 22 && !quality.thin) quality.thin = true;
    else if (avg < 14 && quality.thin) quality.thin = false;
  }

  /* ---------- loop ---------- */
  function frame(now) {
    if (!running || !locked() || ending) return;
    var dt = Math.min(33, now - last) || 16;
    last = now;
    time += dt;
    step(dt); draw(); watch(dt);
    raf = requestAnimationFrame(frame);
  }
})();
