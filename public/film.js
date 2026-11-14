/* ============================================================
   DATUM ATELIER, the film. Twelve seconds, three acts, one car.

   Act 1, Ownership fades: a service book. Each keeper writes in
   their own ink; at every change of keeper the earlier entries fade.
   Act 2, Custodianship holds: the same life on a Datum record. The
   crimson life line draws, entries arrive with their evidence, and at
   each change of keeper the earlier entries begin to fade, then hold.
   Act 3: the title.

   It never plays by itself. It plays when:
     - a button calls window.DATUM_WORLD.ignite({ source })
     - the page dispatches new CustomEvent('datum:ignite')
     - the URL carries ?splash=1 (preview)
   ?splash=0 blocks it.

   While playing: Esc or the Skip button ends it at once; any other
   input ends it after a short grace period. Reduced motion gets a
   still frame. Motion only eases out: nothing bounces or shakes.
   The film is illustrative: the car, keepers and entries are imagined.
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('film');
  var stage = document.getElementById('film-stage');
  var skip = document.getElementById('film-skip');
  if (!root || !stage || !skip) return;

  var END = 12.8, GRACE_MS = 600, FADE_MS = 600;

  /* ---------- one imagined car's life ---------- */
  var LIFE = [
    { y: 1991, mi: 412,   k: 1, hand: '1.6.91  Delivered, book stamped', title: 'Delivered, book stamped', ev: 'Recorded' },
    { y: 1994, mi: 18300, k: 1, hand: '2.4.94  Oil + filter, 18,300',    title: 'Oil and filter',          ev: 'Supported by evidence' },
    { y: 1996, mi: 28940, k: 2, hand: '96  sold. some papers lost',       title: 'Change of keeper',        ev: 'Recorded', keeper: true },
    { y: 1999, mi: 41200, k: 2, hand: '3.3.99  Clutch, Le Mans trip',    title: 'Clutch, before Le Mans',  ev: 'Supported by evidence' },
    { y: 2003, mi: 52700, k: 3, hand: '03  sold again',                  title: 'Change of keeper',        ev: 'Recorded', keeper: true },
    { y: 2008, mi: 64210, k: 3, hand: '08  Timing belt + pump, 64,2',    title: 'Timing belt and water pump', ev: 'Supported by evidence' }
  ];
  var TODAY = { y: 2026, mi: 71880, k: 3, title: 'Today. Kept with the car', ev: '31 entries, nothing lost' };
  var A1 = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5];      /* written in the book */
  var A2 = [6.3, 6.7, 7.1, 7.5, 7.9, 8.3];      /* recorded in Datum   */
  var T_TODAY = 8.7;
  var KEEPER_NAMES = ['', 'First keeper', 'Second keeper', 'Third keeper'];
  var SHORT = { 'Supported by evidence': 'Supported', '31 entries, nothing lost': 'Nothing lost' };
  var INK = ['', '#4A4236', '#2F3A52', '#55524C'];
  var SLANT = ['', 'rotate(-1deg)', 'rotate(.6deg) skewX(-4deg)', 'rotate(-.4deg)'];

  /* ---------- build the stage ---------- */
  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var built = false, els = {};
  function build() {
    if (built) return;
    built = true;
    stage.textContent = '';

    var hud = h('div', 'fm-hud');
    var left = h('div', 'fm-when');
    els.year = h('span', 'fm-year', '1991');
    els.keeper = h('span', 'fm-keeper', KEEPER_NAMES[1]);
    left.appendChild(els.year); left.appendChild(els.keeper);
    var odo = h('div', 'fm-odo');
    els.digits = [];
    for (var i = 0; i < 6; i++) { var d = h('i', i === 5 ? 'last' : '', '0'); els.digits.push(d); odo.appendChild(d); }
    odo.appendChild(h('b', '', 'miles'));
    hud.appendChild(left); hud.appendChild(odo);
    stage.appendChild(hud);
    els.hud = hud;

    /* act 1: the book */
    var paper = h('div', 'fm-paper');
    var ph = h('div', 'fm-ph'); ph.appendChild(h('span', '', 'Service record')); ph.appendChild(h('span', '', '1991 coupé'));
    paper.appendChild(ph);
    els.hand = [];
    LIFE.forEach(function (e) {
      var line = h('div', 'fm-hand', e.hand);
      line.style.color = INK[e.k];
      line.style.transform = SLANT[e.k];
      paper.appendChild(line);
      els.hand.push(line);
    });
    stage.appendChild(paper);
    els.paper = paper;

    /* act 2: the record */
    var rec = h('div', 'fm-record');
    els.line = h('span', 'fm-line');
    rec.appendChild(els.line);
    var list = h('ol', 'fm-entries');
    els.rows = [];
    LIFE.concat([TODAY]).forEach(function (e) {
      var li = h('li', 'fm-entry' + (e.keeper ? ' is-keeper' : '') + (e === TODAY ? ' is-today' : ''));
      li.appendChild(h('span', 'fm-mark'));
      li.appendChild(h('span', 'fm-date', String(e.y)));
      li.appendChild(h('span', 'fm-title', e.title));
      var tagEl = h('span', 'fm-tag' + (e.ev === 'Supported by evidence' ? ' is-supported' : ''));
      tagEl.appendChild(h('span', 'lg', e.ev));
      tagEl.appendChild(h('span', 'sh', SHORT[e.ev] || e.ev));
      li.appendChild(tagEl);
      list.appendChild(li);
      els.rows.push(li);
    });
    rec.appendChild(list);
    stage.appendChild(rec);
    els.record = rec;

    els.cap1 = h('p', 'fm-cap', 'Ownership fades.');
    els.cap2 = h('p', 'fm-cap is-crimson', 'Custodianship holds.');
    stage.appendChild(els.cap1); stage.appendChild(els.cap2);

    var title = h('div', 'fm-title-card');
    var brand = h('p', 'fm-brand'); brand.appendChild(document.createTextNode('DATUM ')); brand.appendChild(h('small', '', 'ATELIER'));
    title.appendChild(brand);
    title.appendChild(h('span', 'fm-rule'));
    title.appendChild(h('p', 'fm-value', "A record that tells you what's there, and what isn't."));
    title.appendChild(h('p', 'fm-note', 'Illustrative film. The car, keepers and entries are imagined.'));
    stage.appendChild(title);
    els.title = title;

    els.progress = h('span', 'fm-progress');
    stage.appendChild(els.progress);
  }

  /* ---------- timing helpers: ease out only ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  /* value along keyframes [[t, v], ...], held before the first and after the last */
  function key(t, ks) {
    if (t <= ks[0][0]) return ks[0][1];
    for (var i = 1; i < ks.length; i++) {
      if (t <= ks[i][0]) {
        var a = ks[i - 1], b = ks[i];
        return a[1] + (b[1] - a[1]) * ease((t - a[0]) / (b[0] - a[0]));
      }
    }
    return ks[ks.length - 1][1];
  }
  function pad6(n) { n = Math.max(0, Math.round(n)); return ('000000' + n).slice(-6); }

  /* which life entry is current at time t, given its schedule */
  function current(t, times) {
    var idx = -1;
    for (var i = 0; i < times.length; i++) if (t >= times[i]) idx = i;
    return idx;
  }
  function odoAt(t) {
    var times = t < 5.6 ? A1 : A2, start = t < 5.6 ? 0 : 5.6;
    var i = current(t, times);
    var from = i <= 0 ? 0 : LIFE[i - 1].mi, to = i < 0 ? 0 : LIFE[i].mi, t0 = i < 0 ? start : times[i];
    if (t >= 5.6 && t >= T_TODAY) { from = LIFE[5].mi; to = TODAY.mi; t0 = T_TODAY; }
    return from + (to - from) * ease((t - t0) / 0.45);
  }
  function yearAt(t) {
    if (t >= T_TODAY) return TODAY.y;
    var i = current(t, t < 5.6 ? A1 : A2);
    return i < 0 ? LIFE[0].y : LIFE[i].y;
  }
  function keeperAt(t) {
    var i = current(t, t < 5.6 ? A1 : A2);
    return i < 0 ? 1 : LIFE[i].k;
  }

  /* opacity of handwritten line i in act 1: written, then faded at each later change of keeper */
  function handOpacity(i, t) {
    var e = LIFE[i], ks = [[0, 0], [A1[i], 0], [A1[i] + 0.05, 1]];
    var lvl = 1;
    LIFE.forEach(function (x, j) {
      if (x.keeper && A1[j] > A1[i] && x.k > e.k) {
        lvl = lvl === 1 ? 0.22 : 0.08;
        ks.push([A1[j], ks[ks.length - 1][1]], [A1[j] + 0.6, lvl]);
      }
    });
    ks.push([4.0, ks[ks.length - 1][1]], [4.6, i === LIFE.length - 1 ? 0.3 : 0.05]);
    return key(t, ks);
  }
  /* act 2: earlier entries start to fade at a change of keeper, then hold */
  function rowOpacity(i, t) {
    var t0 = i < LIFE.length ? A2[i] : T_TODAY;
    var o = key(t, [[t0, 0], [t0 + 0.35, 1]]);
    if (t < t0) return 0;
    LIFE.forEach(function (x, j) {
      if (x.keeper && A2[j] > t0) {
        var dip = t < A2[j] + 0.2 ? key(t, [[A2[j], 1], [A2[j] + 0.2, 0.45]]) : key(t, [[A2[j] + 0.2, 0.45], [A2[j] + 0.75, 1]]);
        o = Math.min(o, dip);
      }
    });
    return o;
  }

  function setO(el, o) { el.style.opacity = o.toFixed(3); el.style.visibility = o < 0.005 ? 'hidden' : 'visible'; }

  /* ---------- render one moment ---------- */
  var lastText = {};
  function text(el, k, v) { if (lastText[k] !== v) { el.textContent = v; lastText[k] = v; } }
  function render(t) {
    /* HUD */
    setO(els.hud, key(t, [[0.4, 0], [0.9, 1], [10.2, 1], [10.6, 0]]));
    text(els.year, 'y', String(yearAt(t)));
    text(els.keeper, 'k', KEEPER_NAMES[keeperAt(t)]);
    var digits = pad6(odoAt(t));
    for (var d = 0; d < 6; d++) {
      text(els.digits[d], 'd' + d, digits.charAt(d));
      var lead = digits.slice(0, d + 1).replace(/0/g, '') === '' && d < 5;
      els.digits[d].className = (d === 5 ? 'last' : '') + (lead ? ' lz' : '');
    }

    /* act 1 */
    setO(els.paper, key(t, [[0.3, 0], [0.8, 1], [5.1, 1], [5.6, 0]]));
    els.paper.style.transform = 'rotate(-2deg) translateY(' + key(t, [[0.3, 10], [0.8, 0]]).toFixed(1) + 'px)';
    els.hand.forEach(function (line, i) {
      setO(line, handOpacity(i, t));
      var w = key(t, [[A1[i], 100], [A1[i] + 0.42, 0]]);
      line.style.clipPath = 'inset(-8px ' + w.toFixed(1) + '% -8px 0)';
    });
    setO(els.cap1, key(t, [[4.0, 0], [4.45, 1], [5.1, 1], [5.45, 0]]));
    els.cap1.style.transform = 'translateY(' + key(t, [[4.0, 8], [4.45, 0]]).toFixed(1) + 'px)';

    /* act 2 */
    setO(els.record, key(t, [[5.55, 0], [5.95, 1], [10.2, 1], [10.6, 0]]));
    els.line.style.transform = 'scaleY(' + key(t, [[5.75, 0], [6.45, 1]]).toFixed(3) + ')';
    els.rows.forEach(function (row, i) {
      setO(row, rowOpacity(i, t));
      var t0 = i < LIFE.length ? A2[i] : T_TODAY;
      row.style.transform = 'translateX(' + key(t, [[t0, 10], [t0 + 0.35, 0]]).toFixed(1) + 'px)';
    });
    setO(els.cap2, key(t, [[8.9, 0], [9.35, 1], [10.2, 1], [10.6, 0]]));
    els.cap2.style.transform = 'translateY(' + key(t, [[8.9, 8], [9.35, 0]]).toFixed(1) + 'px)';

    /* act 3 */
    setO(els.title, key(t, [[10.55, 0], [11.15, 1]]));
    els.title.style.transform = 'translateY(' + key(t, [[10.55, 8], [11.15, 0]]).toFixed(1) + 'px)';

    els.progress.style.transform = 'scaleX(' + clamp(t / END, 0, 1).toFixed(4) + ')';
  }

  /* ---------- lifecycle ---------- */
  var playing = false, ending = false, raf = 0, t0 = 0, startedAt = 0, source = null, stillTimer = 0;

  function onKey(e) {
    if (e.key === 'Escape') { finish(); return; }
    if (e.key === 'Tab') return;
    if (performance.now() - startedAt > GRACE_MS) finish();
  }
  function onIntent(e) {
    if (e && e.target && skip.contains(e.target)) return;
    if (performance.now() - startedAt > GRACE_MS) finish();
  }
  function arm(on) {
    var m = on ? 'addEventListener' : 'removeEventListener';
    skip[m]('click', finish);
    window[m]('keydown', onKey);
    window[m]('pointerdown', onIntent, { passive: true });
    window[m]('wheel', onIntent, { passive: true });
  }
  function setInert(on) {
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n === root || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') continue;
      try { n.inert = on; } catch (e) {}
    }
  }

  function frame(now) {
    if (!playing) return;
    var t = (now - t0) / 1000;
    render(t);
    if (t >= END) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  function ignite(opts) {
    opts = opts || {};
    try { if (/splash=0/.test(location.search)) return false; } catch (e) {}
    if (playing || ending) return false;
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    build();
    source = opts.source || (document.activeElement !== document.body ? document.activeElement : null);
    root.hidden = false;
    root.inert = false;
    root.removeAttribute('aria-hidden');
    root.classList.remove('out');
    root.classList.add('on');
    document.documentElement.classList.add('film-on');
    setInert(true);
    playing = true;
    startedAt = performance.now();
    arm(true);
    skip.focus({ preventScroll: true });

    if (reduce) {
      root.classList.add('is-still');
      render(9.6);                      /* the held record, with its closing line */
      setO(els.title, 1);
      els.title.style.transform = 'none';
      stillTimer = setTimeout(finish, 6000);
      return true;
    }
    t0 = performance.now();
    render(0);
    raf = requestAnimationFrame(frame);
    return true;
  }

  function finish() {
    if (!playing || ending) return;
    ending = true;
    playing = false;
    cancelAnimationFrame(raf);
    clearTimeout(stillTimer);
    arm(false);
    root.classList.add('out');
    setTimeout(function () {
      root.classList.remove('on', 'out', 'is-still');
      root.setAttribute('aria-hidden', 'true');
      root.inert = true;
      root.hidden = true;
      document.documentElement.classList.remove('film-on');
      setInert(false);
      ending = false;
      if (source && document.contains(source)) { try { source.focus({ preventScroll: true }); } catch (e) {} }
      source = null;
      try { document.dispatchEvent(new CustomEvent('datum:world:closed')); } catch (e) {}
    }, FADE_MS);
  }

  window.DATUM_WORLD = {
    ignite: ignite,
    playing: function () { return playing; },
    /* for visual checks: draw the film at a given second without playing it */
    frameAt: function (t) { build(); render(t); }
  };
  document.addEventListener('datum:ignite', function () { ignite({}); });
  [].forEach.call(document.querySelectorAll('.js-film'), function (b) {
    b.addEventListener('click', function () { ignite({ source: b }); });
  });
  try { if (/splash=1/.test(location.search)) setTimeout(function () { ignite({}); }, 400); } catch (e) {}
})();
