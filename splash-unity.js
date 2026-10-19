/* ============================================================
   DATUM ATELIER - "Cellular Unity", the on-demand opening beat.
   A car's records - ownership, memory, service, chassis, VIN,
   mileage, warranty - converge into one history, then the film
   dissolves and, if asked, lands you in a destination section.

   It never plays by itself. It ignites when:
     - a button calls window.DATUM_WORLD.ignite({ after, source })
     - the page dispatches: new CustomEvent('datum:ignite', { detail })
     - the URL carries ?splash=1 (preview override)

   ?splash=0 blocks ignition outright.

   Protocol while playing:
     - Esc, or the visible skip control, ends it immediately
     - any other input ends it after a 600ms grace period
     - reduced motion gets a still plate, never the animation

   Post-merge landing: after={ 'motorworld' } opens the Motor
   World drawer on the ENGINE lens and scrolls to the section.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- tokens: mirror the site, no private palette ---------- */
  var BG       = '#0a0a0b';   /* obsidian canvas token  */
  var GOLD_MID = '#c5a059';   /* site accent token      */
  var GOLD_HI  = '#e6c87a';   /* lit gold               */

  /* ---------- timing: a requestable film, not a toll ---------- */
  var DISPERSAL  = 2800,   /* fragments adrift on their own paths   */
      FORCE_SEAL = 1800,   /* safety net for unsettled stragglers   */
      HOLD       = 620,    /* hold the united core before the land  */
      GRACE_MS   = 600,    /* background-input grace period         */
      FADE_MS    = 920;    /* dissolve duration (pairs with CSS)    */

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
     PUBLIC SURFACE
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
     ENGINE
     ============================================================ */

  /* viewport */
  var DPR = 1, W = 0, H = 0, cx = 0, cy = 0;
  function sizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width  = Math.floor(innerWidth  * DPR);
    H = canvas.height = Math.floor(innerHeight * DPR);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = innerWidth / 2; cy = innerHeight / 2;
    bakeBackdrop();
  }

  /* ---------- baked sprites: the frame budget lives here ---------- */
  var back = null, rays = null, halo = [], hexSpr = null, flare = null, coreSpr = null;
  var baked = false;

  function bakeSprites() {
    if (baked) return;
    baked = true;

    /* halo: 32 tinted radial sprites, one per spectrum step */
    for (var i = 0; i < GOLD_RGB.length; i++) {
      var c = GOLD_RGB[i], s = 56;
      var hc = document.createElement('canvas'); hc.width = hc.height = s;
      var hx = hc.getContext('2d'),
          hg = hx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
      hg.addColorStop(0,  'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',.85)');
      hg.addColorStop(.3, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',.28)');
      hg.addColorStop(1,  'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
      hx.fillStyle = hg; hx.fillRect(0, 0, s, s);
      halo.push(hc);
    }

    /* hex body: obsidian face, gold rim, top-left catchlight */
    var hs = 96;
    hexSpr = document.createElement('canvas'); hexSpr.width = hexSpr.height = hs;
    var bx = hexSpr.getContext('2d'), hr2 = 40;
    bx.translate(hs/2, hs/2);
    bx.beginPath();
    for (var k = 0; k < 6; k++) {
      var a = k/6*6.283 - 1.5708, px = Math.cos(a)*hr2, py = Math.sin(a)*hr2;
      k ? bx.lineTo(px, py) : bx.moveTo(px, py);
    }
    bx.closePath();
    var bg = bx.createRadialGradient(-hr2*.45, -hr2*.5, 0, 0, 0, hr2*1.1);
    bg.addColorStop(0, '#191509'); bg.addColorStop(.6, '#0a0805'); bg.addColorStop(1, '#040404');
    bx.fillStyle = bg; bx.fill();
    bx.strokeStyle = 'rgba(230,200,122,.5)'; bx.lineWidth = 3; bx.stroke();
    bx.beginPath(); bx.moveTo(-hr2*.87, -hr2*.5); bx.lineTo(0, -hr2); bx.lineTo(hr2*.87, -hr2*.5);
    bx.strokeStyle = 'rgba(238,226,196,.55)'; bx.lineWidth = 2; bx.stroke();

    /* flare: additive bloom puck */
    var fs = 128;
    flare = document.createElement('canvas'); flare.width = flare.height = fs;
    var fx = flare.getContext('2d'),
        fg = fx.createRadialGradient(fs/2, fs/2, 0, fs/2, fs/2, fs/2);
    fg.addColorStop(0, 'rgba(240,224,170,.9)'); fg.addColorStop(.4, 'rgba(230,200,122,.35)'); fg.addColorStop(1, 'rgba(230,200,122,0)');
    fx.fillStyle = fg; fx.fillRect(0, 0, fs, fs);

    /* god rays: one pre-baked wheel, rotated live (one blit, not six gradients) */
    var rs = 720;
    rays = document.createElement('canvas'); rays.width = rays.height = rs;
    var rx = rays.getContext('2d');
    rx.translate(rs/2, rs/2);
    rx.globalCompositeOperation = 'lighter';
    for (var g1 = 0; g1 < 6; g1++) {
      var ang = g1/6*6.283, len = rs/2, wI = .09;
      var gg = rx.createLinearGradient(0, 0, Math.cos(ang)*len, Math.sin(ang)*len);
      gg.addColorStop(0, 'rgba(230,214,178,.08)'); gg.addColorStop(1, 'rgba(230,214,178,0)');
      rx.fillStyle = gg; rx.beginPath(); rx.moveTo(0, 0);
      rx.lineTo(Math.cos(ang - wI)*len, Math.sin(ang - wI)*len);
      rx.lineTo(Math.cos(ang + wI)*len, Math.sin(ang + wI)*len);
      rx.closePath(); rx.fill();
    }

    /* core: obsidian sphere with baked body, rim drawn live */
    var cs = 512, cr = cs/2;
    coreSpr = document.createElement('canvas'); coreSpr.width = coreSpr.height = cs;
    var ox = coreSpr.getContext('2d');
    var cbl = ox.createRadialGradient(cr*.62, cr*.64, 0, cr, cr, cr);
    cbl.addColorStop(0, '#131311'); cbl.addColorStop(.55, '#0a0a0a'); cbl.addColorStop(1, '#030303');
    ox.fillStyle = cbl; ox.beginPath(); ox.arc(cr, cr, cr, 0, 6.283); ox.fill();
  }

  /* ---------- backdrop: base, ambient, grain, vignette, frame - baked once ---------- */
  function bakeBackdrop() {
    if (!baked) bakeSprites();
    back = document.createElement('canvas'); back.width = W; back.height = H;
    var bx2 = back.getContext('2d');
    bx2.setTransform(DPR, 0, 0, DPR, 0, 0);
    bx2.fillStyle = BG; bx2.fillRect(0, 0, innerWidth, innerHeight);
    var amb = bx2.createRadialGradient(cx, cy, 0, cx, cy, Math.max(innerWidth, innerHeight)*.6);
    amb.addColorStop(0, 'rgba(30,25,17,.85)'); amb.addColorStop(.55, 'rgba(14,12,9,.55)'); amb.addColorStop(1, 'rgba(10,10,11,0)');
    bx2.fillStyle = amb; bx2.fillRect(0, 0, innerWidth, innerHeight);
    bx2.globalAlpha = .02;
    for (var i = 0; i < 1400; i++) {
      var fx2 = Math.random()*innerWidth, fy2 = Math.random()*innerHeight, s = Math.random()*1.2;
      bx2.fillStyle = Math.random() > .5 ? '#fff' : '#000';
      bx2.fillRect(fx2, fy2, s, s);
    }
    bx2.globalAlpha = 1;
    var vg = bx2.createRadialGradient(cx, cy, Math.min(innerWidth, innerHeight)*.3, cx, cy, Math.max(innerWidth, innerHeight)*.74);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)');
    bx2.fillStyle = vg; bx2.fillRect(0, 0, innerWidth, innerHeight);
    bx2.strokeStyle = 'rgba(244,242,238,.10)'; bx2.lineWidth = 1;
    bx2.strokeRect(20.5, 20.5, innerWidth - 41, innerHeight - 41);
  }

  /* ---------- spectrum: deep unlit gold to lit gold ---------- */
  var GOLD_RGB = (function () {
    var a = [], i;
    for (i = 0; i < 32; i++) {
      var t = i/31;
      a.push([ Math.round(51 + t*(230-51)), Math.round(38 + t*(200-38)), Math.round(15 + t*(122-15)) ]);
    }
    return a;
  })();
  function rgbHex(arr) {
    return '#' + arr.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  var SEAL_GOLD = GOLD_MID;

  /* ---------- parallax dust ---------- */
  var dust = [];
  function seedDust() {
    dust = [];
    for (var d = 0; d < 64; d++) dust.push({
      x: Math.random()*innerWidth, y: Math.random()*innerHeight,
      z: .15 + Math.random()*.85, s: .3 + Math.random()*.9,
      a: .015 + Math.random()*.04,
      vx: (Math.random()-.5)*.01, vy: (Math.random()-.5)*.01,
      ph: Math.random()*7
    });
  }

  /* ---------- fragment roster: the actual data model of a history ---------- */
  var FRAGMENTS = [
    { id: '1',   name: 'Ownership Cell',   glyph: '\u25A0', mass: 1.2, speed: .70,  motion: 'orbit-core' },
    { id: '2',   name: 'Memory Cell',      glyph: '\u25C6', mass: .8,  speed: .60,  motion: 'sway' },
    { id: '3',   name: 'Service Cell',     glyph: '\u25AC', mass: 1,   speed: .90,  motion: 'ballistic' },
    { id: '3a',  name: 'Service Sub-Cell', glyph: '\u25AA', mass: .6,  speed: .80,  motion: 'orbit-service' },
    { id: '4',   name: 'Enthusiast Cell',  glyph: '\u25B2', mass: .9,  speed: .75,  motion: 'sinusoidal' },
    { id: '5',   name: 'Chassis Cell',     glyph: '\u25B6', mass: 1.5, speed: 1.20, motion: 'fast-straight' },
    { id: '5a',  name: 'Chassis Sub',      glyph: '\u25B7', mass: 1.1, speed: 1,    motion: 'curve' },
    { id: '6',   name: 'Journey Cell',     glyph: '\u25B3', mass: .9,  speed: .65,  motion: 'random-walk' },
    { id: '7',   name: 'World Cell',       glyph: '\u25A1', mass: 1,   speed: .70,  motion: 'perlin' },
    { id: '7a',  name: 'World Sub',        glyph: '\u25AB', mass: .7,  speed: .50,  motion: 'orbit-core' },
    { id: '11',  name: 'Memory-Event',     glyph: '\u25C7', mass: .9,  speed: .72,  motion: 'decay-osc' },
    { id: '12',  name: 'Service-History',  glyph: '\u2261', mass: 1,   speed: .66,  motion: 'para-curve' },
    { id: '12a', name: 'Service-Peak',     glyph: '\u2261', mass: 1,   speed: 1.05, motion: 'ballistic' },
    { id: '13',  name: 'Owner-Note',       glyph: '\u25A3', mass: .8,  speed: .58,  motion: 'double-osc' },
    { id: '14',  name: 'Tech-Spec',        glyph: '\u2261', mass: .9,  speed: 1.10, motion: 'ballistic' },
    { id: '15',  name: 'Community-Tag',    glyph: '\u25CB', mass: .7,  speed: .52,  motion: 'noisy-orbit' },
    { id: '16',  name: 'Chassis-Meta',     glyph: '\u25C6', mass: 1.1, speed: .62,  motion: 'ellipse' },
    { id: '17',  name: 'VIN-Fragment',     glyph: '\u25A0', mass: 1.2, speed: 1.15, motion: 'ballistic' },
    { id: '17a', name: 'VIN-Sub',          glyph: '\u25AB', mass: 1.1, speed: 1.13, motion: 'ballistic-pair' },
    { id: '18',  name: 'Mileage-Log',      glyph: '\u25CF', mass: .9,  speed: .48,  motion: 'decel-stop' },
    { id: '18a', name: 'Mileage-Sub',      glyph: '\u2022', mass: .8,  speed: .40,  motion: 'ballistic' },
    { id: '19',  name: 'Recall-Trigger',   glyph: '\u25C6', mass: 1,   speed: .90,  motion: 'bounce' },
    { id: '20',  name: 'Service-Plan',     glyph: '\u25A0', mass: .9,  speed: .66,  motion: 'para-curve' },
    { id: '21',  name: 'Warranty-Link',    glyph: '\u25C7', mass: .8,  speed: .60,  motion: 'orbit-service' },
    { id: '22',  name: 'Owner-Count',      glyph: '\u25CF', mass: .7,  speed: .55,  motion: 'noisy-orbit' },
    { id: '23',  name: 'Region-Tag',       glyph: '\u25C6', mass: .7,  speed: .58,  motion: 'perlin' },
    { id: '24',  name: 'Fuel-Log',         glyph: '\u25CB', mass: .8,  speed: .50,  motion: 'decel-stop' },
    { id: '25',  name: 'Accident-Rec',     glyph: '\u00D7', mass: 1,   speed: .85,  motion: 'bounce' },
    { id: '26',  name: 'Title-Status',     glyph: '\u25A3', mass: .9,  speed: .64,  motion: 'ellipse' },
    { id: '27',  name: 'Lien-Note',        glyph: '\u25AA', mass: .8,  speed: .57,  motion: 'sway' },
    { id: '29',  name: 'Emission-Log',     glyph: '\u25A1', mass: .7,  speed: .53,  motion: 'random-walk' }
  ];
  var N = FRAGMENTS.length;

  /* ---------- live state ---------- */
  var cells = [], rings = [], shocks = [], sparks = [], embers = [], flashes = [];
  var coreTarget = 22, coreR = 22, coreVel = 0, merged = 0, lockA = 0;
  var phase = 'dispersal', phaseT = 0;
  var quality = { thin: false, dt: [], idx: 0 };

  function ensureWorld() {
    if (running) { spawn(); return; }
    running = true;
    bakeSprites(); seedDust(); sizeCanvas(); spawn();
  }

  function spawn() {
    cells = []; rings = []; shocks = []; sparks = []; embers = []; flashes = [];
    coreTarget = 22; coreR = 22; coreVel = 0; merged = 0; lockA = Math.random()*6.283;
    phase = 'dispersal'; phaseT = 0;
    for (var i = 0; i < N; i++) {
      var f = FRAGMENTS[i], ang = Math.random()*6.283,
          rad = Math.min(innerWidth, innerHeight)*.40*(.66 + Math.random()*.34);
      var c = {};
      for (var k in f) c[k] = f[k];
      c.ci  = Math.floor(i/N*30);
      c.color = rgbHex(GOLD_RGB[c.ci]);
      c.x = cx + Math.cos(ang)*rad;
      c.y = cy + Math.sin(ang)*rad;
      c.vx = (Math.random()-.5)*.5*f.speed;
      c.vy = (Math.random()-.5)*.5*f.speed;
      c.r = 5.5 + Math.random()*3;
      c.rot = Math.random()*6.283; c.spin = (Math.random()-.5)*.004;
      c.trail = []; c.active = true; c.sealing = false; c.sealT = 0; c.hit = false;
      c.sr = 0; c.lock = 0; c.born = 0; c.alpha = 0; c.flash = 0; c.seed = Math.random()*1000;
      c.sealScale = 1;
      cells.push(c);
    }
  }

  function noise(x, y, t) {
    return Math.sin(x*.012 + t)*Math.cos(y*.011 - t*.7)
      + .5*Math.sin(x*.023 - y*.019 + t*.3)
      + .25*Math.cos(y*.041 + t*.5);
  }
  function findByName(n) {
    for (var i = 0; i < cells.length; i++) if (cells[i].name === n) return cells[i];
    return null;
  }
  function applyMotion(c, dt, t) {
    var dx = c.x - cx, dy = c.y - cy, d = Math.hypot(dx, dy) || 1;
    switch (c.motion) {
      case 'decay-osc':  { var w = Math.PI/2.5;
        c.vx += Math.sin(w*t)*.0009*dt - c.vx*.0006*dt;
        c.vy += Math.cos(w*t)*.0007*dt - c.vy*.0006*dt; break; }
      case 'para-curve': c.vx -= .00018*dt; c.vy -= .00018*dt; break;
      case 'ballistic': break;
      case 'ballistic-pair': {
        var v = findByName('VIN-Fragment');
        if (v) { c.vx += (v.x - c.x)*.000008*dt; c.vy += (v.y - c.y)*.000008*dt; } break; }
      case 'double-osc': { var w2 = Math.PI/5;
        c.vx += Math.sin(w2*t + c.seed)*.0013*dt; c.vy += Math.cos(2*w2*t)*.001*dt; break; }
      case 'noisy-orbit': { var tx = -dy/d, ty = dx/d, n = noise(c.x*.004, c.y*.004, t*.5);
        c.vx += tx*.0016*dt + Math.cos(n*6.283)*.0009*dt;
        c.vy += ty*.0016*dt + Math.sin(n*6.283)*.0009*dt; break; }
      case 'ellipse': { var a = 140, b = 90,
          tg = (a*b)/Math.hypot(b*dx, a*dy) || d, pl = (tg - d)*.00002,
          tx2 = -dy/d, ty2 = dx/d;
        c.vx += (dx/d)*pl*dt + tx2*.0013*dt;
        c.vy += (dy/d)*pl*dt + ty2*.0013*dt; break; }
      case 'decel-stop': { var cyc = (t*1000)%5000; if (cyc < 800) { c.vx *= .72; c.vy *= .72; }
        c.vx -= .00009*dt; c.vy -= .000054*dt; break; }
      case 'bounce': break;
      case 'orbit-core': { var tx3 = -dy/d, ty3 = dx/d;
        c.vx += tx3*.0016*dt; c.vy += ty3*.0016*dt; break; }
      case 'sway': c.vx += Math.sin(t + c.seed)*.001*dt; break;
      case 'orbit-service': {
        var s = findByName('Service Cell');
        if (s) { var sx = c.x - s.x, sy = c.y - s.y, sd = Math.hypot(sx, sy) || 1;
          c.vx += -sy/sd*.0025*dt; c.vy += sx/sd*.0025*dt; } break; }
      case 'sinusoidal': c.vx += Math.sin(t*1.5 + c.seed)*.0015*dt;
        c.vy += Math.cos(t*1.2 + c.seed)*.001*dt; break;
      case 'fast-straight': break;
      case 'curve': c.vx += .0005*Math.sin(t*.8 + c.seed)*dt; break;
      case 'random-walk': { var n2 = noise(c.x*.004 + c.seed, c.y*.004, t*.45);
        c.vx += Math.cos(n2*6.283)*.0016*dt; c.vy += Math.sin(n2*6.283)*.0016*dt; break; }
      case 'perlin': { var n3 = noise(c.x*.005, c.y*.005, t);
        c.vx += Math.cos(n3*6.283)*.001*dt; c.vy += Math.sin(n3*6.283)*.001*dt; break; }
    }
  }

  /* ---------- merge choreography ---------- */
  function coreHit(c) {
    coreTarget += 1.35;
    rings.push({ t: 0, d: 0,   dur: 1150, sc: 1.4, lw: 1.7 });
    rings.push({ t: 0, d: 170, dur: 1150, sc: 1.4, lw: 1.5 });
    rings.push({ t: 0, d: 340, dur: 1150, sc: 1.4, lw: 1.3 });
    shocks.push({ x: c.x, y: c.y, t: 0, dur: 900, r0: 10, r1: 280 });
    flashes.push({ x: c.x, y: c.y, t: 0, dur: 520, size: 150 });
    var k, a, s;
    for (k = 0; k < 14; k++) { a = Math.random()*6.283; s = .3 + Math.random()*2.2;
      embers.push({ x: c.x, y: c.y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - .4, life: 900, max: 900, ph: Math.random()*7 }); }
    for (k = 0; k < 8; k++) { a = Math.random()*6.283; s = 1 + Math.random()*3;
      sparks.push({ x: c.x, y: c.y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: 420, max: 420 }); }
  }

  function sealLock(c) {
    c.sealing = true; c.sealT = 0; c.hit = false;
    c.sr = Math.hypot(c.x - cx, c.y - cy); c.lock = (lockA += 2.399);
  }

  /* ---------- HUD ---------- */
  function resetHud() {
    uiCount.textContent = N + ' records \u00b7 converging';
    uiCount.classList.remove('locked');
  }
  function hudProgress() {
    uiCount.textContent = pad2(merged) + '/' + N + ' merged';
  }
  function hudLocked() {
    uiCount.textContent = N + ' records \u2192 one history';
    uiCount.classList.add('locked');
  }

  /* ---------- math helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t)  { return a + (b - a)*t; }
  function easeInOut(t)   { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
  function outBack(t)     { var c1 = 1.9, c3 = c1 + 1; return 1 + c3*Math.pow(t - 1, 3) + c1*Math.pow(t - 1, 2); }
  function outElastic(t)  { return t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10*t)*Math.sin((t*10 - .75)*(2*Math.PI/3)) + 1; }
  function outCubic(t)    { return 1 - Math.pow(1 - t, 3); }

  /* ---------- step ---------- */
  function step(dt) {
    var dts = dt/1000, t = time*.001;
    time += dt; phaseT += dt;

    if (phase === 'dispersal' && phaseT > DISPERSAL) { phase = 'converge'; phaseT = 0; }
    if (phase === 'converge') {
      if (merged >= cells.length) {
        phase = 'unite'; phaseT = 0; hudLocked();
        rings.push({ t: 0, d: 0,   dur: 2000, sc: 5,  lw: 3   });
        rings.push({ t: 0, d: 240, dur: 2000, sc: 5,  lw: 2.4 });
        rings.push({ t: 0, d: 480, dur: 2000, sc: 5,  lw: 2   });
      } else if (phaseT > FORCE_SEAL) {
        for (var z = 0; z < cells.length; z++) {
          var cz = cells[z];
          if (cz.active && !cz.sealing) sealLock(cz);
        }
      }
    }
    if (phase === 'unite' && phaseT > HOLD) finish('finished');

    var acc = (coreTarget - coreR)*120 - coreVel*13;
    coreVel += acc*dts; coreR += coreVel*dts;

    var i, c, dx, dy, d;
    for (i = 0; i < cells.length; i++) {
      c = cells[i];
      if (!c.active && !c.sealing) continue;
      c.born += dt; c.alpha = Math.min(1, c.born/700);
      c.rot += c.spin*dt;

      if (c.sealing) {
        c.sealT += dt;
        var rad, sc = 1, p;
        if (c.sealT < 340)      { p = outCubic(c.sealT/340);          rad = lerp(c.sr, coreR + 42, p);  sc = 1 - .1*p; }
        else if (c.sealT < 520) { p = easeInOut((c.sealT - 340)/180); rad = lerp(coreR + 42, coreR + 74, p); sc = .9 - .18*p; }
        else                    { p = clamp((c.sealT - 520)/170, 0, 1); rad = lerp(coreR + 74, coreR + 2, outBack(p)); sc = .72 + .63*outElastic(p); }
        c.x = cx + Math.cos(c.lock)*rad; c.y = cy + Math.sin(c.lock)*rad; c.sealScale = sc;
        if (c.trail.length > 3) c.trail.splice(0, c.trail.length - 3);
        if (!c.hit && c.sealT >= 560) { coreHit(c); c.hit = true; }
        if (c.sealT >= 760) { c.active = false; c.sealing = false; merged++; hudProgress(); }
        continue;
      }

      applyMotion(c, dt, t);
      dx = c.x - cx; dy = c.y - cy; d = Math.hypot(dx, dy) || 1;
      if (phase === 'dispersal') { c.vx += dx/d*.001*dt; c.vy += dy/d*.001*dt; }
      else {
        var ad = Math.hypot(cx - c.x, cy - c.y), af = .0008*dt*Math.min(ad, 200);
        c.vx += (cx - c.x)/ad*af; c.vy += (cy - c.y)/ad*af;
        if (ad < 130) { c.vx += (cy - c.y)/ad*.00045*dt; c.vy += (cx - c.x)/ad*.00045*dt; }
      }

      var sp = Math.hypot(c.vx, c.vy); if (sp > 3) { c.vx = c.vx/sp*3; c.vy = c.vy/sp*3; }
      c.x += c.vx*dt*.06; c.y += c.vy*dt*.06;
      var rest = c.motion === 'bounce' ? .92 : .5;
      if (c.x < c.r) { c.x = c.r; c.vx = Math.abs(c.vx)*rest; }
      if (c.x > innerWidth - c.r) { c.x = innerWidth - c.r; c.vx = -Math.abs(c.vx)*rest; }
      if (c.y < c.r) { c.y = c.r; c.vy = Math.abs(c.vy)*rest; }
      if (c.y > innerHeight - c.r) { c.y = innerHeight - c.r; c.vy = -Math.abs(c.vy)*rest; }
      c.trail.push({ x: c.x, y: c.y }); if (c.trail.length > 14) c.trail.shift();
      if (Math.hypot(c.x - cx, c.y - cy) < coreR + c.r + 10) sealLock(c);
      c.flash = Math.max(0, c.flash - dt*.004);
    }

    /* pairwise collisions */
    for (var a2 = 0; a2 < cells.length; a2++) {
      var A = cells[a2]; if (!A.active || A.sealing) continue;
      for (var b2 = a2 + 1; b2 < cells.length; b2++) {
        var B = cells[b2]; if (!B.active || B.sealing) continue;
        var ddx = B.x - A.x, ddy = B.y - A.y, dd = Math.hypot(ddx, ddy), mn = A.r + B.r;
        if (dd > 0 && dd < mn) {
          var ov = mn - dd, nx = ddx/dd, ny = ddy/dd;
          A.x -= nx*ov*.5; A.y -= ny*ov*.5; B.x += nx*ov*.5; B.y += ny*ov*.5;
          var e = .15, vr = (B.vx - A.vx)*nx + (B.vy - A.vy)*ny;
          if (vr < 0) { var J = -(1 + e)*vr/(1/A.mass + 1/B.mass);
            A.vx -= J/A.mass*nx; A.vy -= J/A.mass*ny; B.vx += J/B.mass*nx; B.vy += J/B.mass*ny; }
          flashes.push({ x: (A.x + B.x)/2, y: (A.y + B.y)/2, t: 0, dur: 260, size: 70, hit: 1 });
          A.flash = B.flash = .55;
          if (!quality.thin) {
            for (var k2 = 0; k2 < 3; k2++) {
              var an2 = Math.random()*6.283, s2 = 1 + Math.random()*2.4;
              sparks.push({ x: (A.x + B.x)/2, y: (A.y + B.y)/2, vx: Math.cos(an2)*s2, vy: Math.sin(an2)*s2, life: 300, max: 300 });
            }
          }
        }
      }
    }

    flashes.forEach(function (o) { o.t += dt; }); flashes = flashes.filter(function (o) { return o.t < o.dur; });
    shocks.forEach(function (o)  { o.t += dt; }); shocks  = shocks.filter(function (o)  { return o.t < o.dur; });
    rings.forEach(function (o)   { o.t += dt; }); rings   = rings.filter(function (o)   { return o.t < o.dur + (o.d || 0); });
    sparks.forEach(function (o)  { o.x += o.vx; o.y += o.vy; o.vx *= .93; o.vy *= .93; o.life -= dt; });
    sparks = sparks.filter(function (o) { return o.life > 0; });
    embers.forEach(function (o)  { o.x += o.vx; o.y += o.vy; o.vy -= .004*dt; o.vx *= .99; o.vy *= .99; o.life -= dt; });
    embers = embers.filter(function (o) { return o.life > 0; });
    dust.forEach(function (o) {
      o.x += o.vx; o.y += o.vy;
      if (o.x < 0) o.x = innerWidth; if (o.x > innerWidth) o.x = 0;
      if (o.y < 0) o.y = innerHeight; if (o.y > innerHeight) o.y = 0;
    });
  }

  /* ---------- render ---------- */
  function draw() {
    if (!back) return;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.drawImage(back, 0, 0, innerWidth, innerHeight);
    var t = time*.001, i;

    /* dust */
    for (i = 0; i < dust.length; i++) {
      var p = dust[i];
      ctx.globalAlpha = p.a*(.6 + .4*Math.sin(t*1.5 + p.ph));
      ctx.fillStyle = GOLD_MID;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s*(.5 + p.z), 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* camera drift + breath */
    ctx.save();
    ctx.translate(cx + Math.sin(t*.13)*5, cy + Math.cos(t*.11)*4);
    var zoom = 1 + .014*Math.sin(t*.35);
    ctx.scale(zoom, zoom); ctx.translate(-cx, -cy);
    var breath = 1 + .014*Math.sin(t*1.6), coreRx = coreR*breath;

    /* god rays: one blit */
    if (!quality.thin) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.translate(cx, cy); ctx.rotate(t*.05 + Math.sin(t*.3)*.05); ctx.translate(-cx, -cy);
      ctx.drawImage(rays, cx - 360, cy - 360, 720, 720);
      ctx.restore();
    }

    /* AO ring */
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(cx, cy, coreRx + 9, 0, 6.283); ctx.stroke();

    /* merged depth rings: stroke-only, capped */
    var lmax = Math.min(merged, 9);
    for (var L = lmax; L >= 1; L--) {
      var lr = coreRx*(1 - L*.052)*(1 + .012*Math.sin(t*1.4 + L));
      if (lr < 4) continue;
      ctx.strokeStyle = 'rgba(230,214,178,' + Math.max(.05, .3 - L*.024) + ')';
      ctx.lineWidth = .8;
      ctx.beginPath(); ctx.arc(cx, cy, lr, 0, 6.283); ctx.stroke();
    }

    /* core glow + sphere + live rim */
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRx*2.4);
    gl.addColorStop(0, 'rgba(230,214,178,.09)'); gl.addColorStop(1, 'rgba(230,214,178,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, coreRx*2.4, 0, 6.283); ctx.fill();
    ctx.restore();
    ctx.drawImage(coreSpr, cx - coreRx, cy - coreRx, coreRx*2, coreRx*2);
    ctx.strokeStyle = 'rgba(230,214,178,.32)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, coreRx - .5, 0, 6.283); ctx.stroke();
    var rimA = t*.45;
    ctx.strokeStyle = 'rgba(240,230,205,.3)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, coreRx - .8, rimA, rimA + 1.9); ctx.stroke();

    /* sheen + ratio grid (skipped in thin mode) */
    if (!quality.thin) {
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, coreRx, 0, 6.283); ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      var sa = t*.45, sr2 = coreRx*1.05;
      var sg = ctx.createLinearGradient(cx + Math.cos(sa)*sr2, cy + Math.sin(sa)*sr2, cx - Math.cos(sa)*sr2, cy - Math.sin(sa)*sr2);
      sg.addColorStop(0, 'rgba(240,230,205,.13)'); sg.addColorStop(.5, 'rgba(240,230,205,0)');
      ctx.fillStyle = sg; ctx.fillRect(cx - coreRx, cy - coreRx, coreRx*2, coreRx*2);
      ctx.restore();
      ctx.strokeStyle = 'rgba(230,214,178,.09)'; ctx.lineWidth = .55;
      for (var gi = 0; gi < 12; gi++) {
        var ga = gi*Math.PI/6 + t*.02;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ga)*coreRx*1.9, cy + Math.sin(ga)*coreRx*1.9); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(230,214,178,.13)';
      for (var pk = 1; pk <= 3; pk++) { ctx.beginPath(); ctx.arc(cx, cy, coreRx/Math.pow(1.618, pk), 0, 6.283); ctx.stroke(); }
    }

    /* impact rings - the signature effect */
    for (var ri = 0; ri < rings.length; ri++) {
      var ro = rings[ri], dly = ro.d || 0;
      if (ro.t < dly) continue;
      var rp = (ro.t - dly)/ro.dur, rr2 = coreR*(.6 + rp*(ro.sc || 1.4)), ra2 = (1 - rp)*.5;
      ctx.strokeStyle = SEAL_GOLD;
      ctx.globalAlpha = ra2; ctx.lineWidth = (ro.lw || 1.5)*(1 - rp) + .3;
      ctx.beginPath(); ctx.arc(cx, cy, rr2, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = ra2*.3; ctx.lineWidth = (ro.lw || 1.5)*4*(1 - rp) + .3;
      ctx.beginPath(); ctx.arc(cx, cy, rr2, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* shockwaves */
    for (var si = 0; si < shocks.length; si++) {
      var so = shocks[si], s1 = so.t/so.dur, sk = so.r0 + (so.r1 - so.r0)*outCubic(s1);
      ctx.globalAlpha = (1 - s1)*.7; ctx.strokeStyle = SEAL_GOLD; ctx.lineWidth = 2.5*(1 - s1) + .4;
      ctx.beginPath(); ctx.arc(so.x, so.y, sk, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = (1 - s1)*.22; ctx.lineWidth = 8*(1 - s1);
      ctx.beginPath(); ctx.arc(so.x, so.y, sk*.8, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    /* sparks */
    ctx.lineCap = 'round';
    for (var ki = 0; ki < sparks.length; ki++) {
      var skp = sparks[ki], alp = skp.life/skp.max;
      ctx.strokeStyle = 'rgba(238,226,196,' + alp + ')'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(skp.x, skp.y); ctx.lineTo(skp.x - skp.vx*5, skp.y - skp.vy*5); ctx.stroke();
    }
    ctx.lineCap = 'butt';

    /* flashes: pre-baked puck */
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var fi = 0; fi < flashes.length; fi++) {
      var fo = flashes[fi], fp = fo.t/fo.dur, fr = (fo.size || 90)*(.5 + fp);
      ctx.globalAlpha = (1 - fp)*(fo.hit ? .5 : .8);
      ctx.drawImage(flare, fo.x - fr/2, fo.y - fr/2, fr, fr);
    }
    ctx.restore(); ctx.globalAlpha = 1;

    /* embers */
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var ei = 0; ei < embers.length; ei++) {
      var eo = embers[ei], ea = eo.life/eo.max, fl = .6 + .4*Math.sin(t*14 + eo.ph);
      ctx.globalAlpha = ea*fl*.85; ctx.fillStyle = GOLD_HI;
      ctx.beginPath(); ctx.arc(eo.x, eo.y, 1 + ea*1.4, 0, 6.283); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;

    /* cells: halo sprite + body sprite + glyph */
    var maxD = Math.hypot(innerWidth, innerHeight)*.6;
    for (var ci2 = 0; ci2 < cells.length; ci2++) {
      var c = cells[ci2];
      if (!c.active && !c.sealing) continue;
      var depth = clamp(Math.hypot(c.x - cx, c.y - cy)/maxD, 0, 1);
      var base = (1.3 - .5*depth)*(c.sealing ? (c.sealScale || 1) : 1);

      if (!quality.thin && c.trail.length > 3) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (var gt = 4; gt <= 12; gt += 4) {
          if (gt >= c.trail.length) continue;
          var gp = c.trail[c.trail.length - 1 - gt], hr2 = c.r*base*2.1;
          ctx.globalAlpha = (1 - gt/18)*.12*c.alpha;
          ctx.drawImage(halo[c.ci], gp.x - hr2/2, gp.y - hr2/2, hr2, hr2);
        }
        ctx.restore();
      }

      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(base, base); ctx.rotate(c.rot);

      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var hr = c.r*(2.4 + depth*1.6)*2;
      ctx.globalAlpha = .55 + .35*c.alpha;
      ctx.drawImage(halo[c.ci], -hr/2, -hr/2, hr, hr);
      ctx.restore();

      var bs = c.r*2.3;
      ctx.drawImage(hexSpr, -bs/2, -bs/2, bs, bs);

      if (c.flash > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = c.flash*.6;
        ctx.drawImage(flare, -c.r*1.6, -c.r*1.6, c.r*3.2, c.r*3.2);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      ctx.rotate(-c.rot);
      ctx.fillStyle = '#f0e2b8';
      ctx.font = '600 9px "IBM Plex Mono",ui-monospace,monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.glyph, 0, c.r*.06);
      ctx.restore();
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
    step(dt); draw(); watch(dt);
    raf = requestAnimationFrame(frame);
  }
})();
