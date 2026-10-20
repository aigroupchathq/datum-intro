/* Datum instrument dial.
   Canvas rendering adapted from the Datum instrument-cluster study.
   This build carries the dial and hold-to-rev control only. */
(function () {
  'use strict';

    var TAU = Math.PI * 2;
    var d2r = function (d) { return d * Math.PI / 180; };
    var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };

    function roundRect(ctx, x, y, w, h, r) {
      var rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      ctx.lineTo(x + w, y + h - rr);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      ctx.lineTo(x + rr, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
    }

    // letter-spaced centred text, drawn char by char (no reliance on ctx.letterSpacing)
    function spaced(ctx, text, x, y, sp) {
      var chars = String(text).split('');
      var widths = [], total = 0, i;
      for (i = 0; i < chars.length; i++) {
        var w = ctx.measureText(chars[i]).width;
        widths.push(w); total += w;
      }
      total += sp * (chars.length - 1);
      var cx = x - total / 2;
      var prev = ctx.textAlign;
      ctx.textAlign = 'left';
      for (i = 0; i < chars.length; i++) {
        ctx.fillText(chars[i], cx, y);
        cx += widths[i] + sp;
      }
      ctx.textAlign = prev;
    }

    // text laid along a circle, one glyph per step, reading clockwise.
    // starts at startA (radians, 0 = 3 o'clock, -PI/2 = 12 o'clock).
    function ringText(ctx, text, cx, cy, radius, startA, size, tracking, color, stack) {
      if (!text) return startA;
      ctx.save();
      ctx.font = '400 ' + size.toFixed(1) + 'px ' + (stack || '"Segoe UI", system-ui, sans-serif');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      var a = startA;
      for (var i = 0; i < text.length; i++) {
        var w = ctx.measureText(text.charAt(i)).width + tracking;
        var da = w / Math.max(1, radius);
        var mid = a + da / 2;
        ctx.save();
        ctx.translate(cx + Math.cos(mid) * radius, cy + Math.sin(mid) * radius);
        ctx.rotate(mid + Math.PI / 2);
        ctx.fillText(text.charAt(i), 0, 0);
        ctx.restore();
        a += da;
      }
      ctx.restore();
      return a;
    }

    var THEMES = {
      anthracite: {   // black & gold — the default
        faceHi: '#23271c', faceMid: '#13160d', faceLo: '#05060a',
        guilLight: 0.055, guilDark: 0.42,
        num: '#f2c41f', numRed: '#ff4a3d',
        tickMaj: '#f2c41f', tickMin: 'rgba(242,196,31,.42)',
        label: 'rgba(246,211,58,.9)',
        redline: '#a3121e', redlineEdge: 'rgba(255,64,48,.4)',
        drum: '#10120a', drumLo: '#2c2f1f', drumText: '#f2c41f',
        drumTen: '#0c0d06', drumTenText: '#ffd94a',
        odoA: '#33290a', odoB: '#0f100b', odoC: '#85701c',
        needle: ['#8a6305', '#d9a614', '#ffd23f', '#c8940f', '#7a5c06'],
        needleHot: ['#7c0b12', '#d92121', '#ff6a58', '#c81623', '#7d0c13'],
        emblem: '246,217,72',
        hubHi: '#3a3418', hubMid: '#141208', hubLo: '#050502', hubRing: 'rgba(247,213,64,.9)'
      },
      champagne: {
        faceHi: '#faf6ec', faceMid: '#e7e0d0', faceLo: '#b4a992',
        guilLight: 0.55, guilDark: 0.085,
        num: '#242830', numRed: '#9d1019',
        tickMaj: '#2b3037', tickMin: 'rgba(40,45,52,.55)',
        label: 'rgba(35,40,46,.82)',
        redline: '#9d1119', redlineEdge: 'rgba(160,20,25,.3)',
        drum: '#f8f4ea', drumLo: '#c0b7a5', drumText: '#1a1d21',
        drumTen: '#fcf7eb', drumTenText: '#a3121b',
        odoA: '#f7f9fb', odoB: '#939ba3', odoC: '#e0e5ea',
        needle: ['#7c0b12', '#d92121', '#ff6a58', '#c81623', '#7d0c13'],
        needleHot: ['#7c0b12', '#d92121', '#ff6a58', '#c81623', '#7d0c13'],
        emblem: '235,241,247'
      }
    };
    var themeKey = 'anthracite';

    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (window.matchMedia) {
      var mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
      var onRM = function (e) { reduceMotion = e.matches; };
      if (mqRM.addEventListener) mqRM.addEventListener('change', onRM);
      else if (mqRM.addListener) mqRM.addListener(onRM);
    }

    function drawEmblem(ctx, cx, cy, s, base) {
      base = base || '235,241,247';
      ctx.save();
      ctx.lineCap = 'round';
      // outer datum ring
      ctx.strokeStyle = 'rgba(' + base + ',.9)';
      ctx.lineWidth = Math.max(1, s * 0.055);
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.56, 0, TAU); ctx.stroke();
      // fine inner ring (machined)
      ctx.strokeStyle = 'rgba(' + base + ',.4)';
      ctx.lineWidth = Math.max(1, s * 0.024);
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.36, 0, TAU); ctx.stroke();
      // crosshair registration ticks (plus shape)
      ctx.strokeStyle = 'rgba(' + base + ',.9)';
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.8,  cy); ctx.lineTo(cx - s * 0.30, cy);
      ctx.moveTo(cx + s * 0.30, cy); ctx.lineTo(cx + s * 0.8,  cy);
      ctx.moveTo(cx, cy - s * 0.8);  ctx.lineTo(cx, cy - s * 0.30);
      ctx.moveTo(cx, cy + s * 0.30); ctx.lineTo(cx, cy + s * 0.8);
      ctx.stroke();
      // serif D over the reference mark
      ctx.font = '700 ' + (s * 0.92).toFixed(1) + 'px "Palatino Linotype", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(' + base + ',.98)';
      ctx.fillText('D', cx, cy + s * 0.04);
      ctx.restore();
    }

    function Gauge(canvas, cfg) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.cfg = cfg;
      this.face = document.createElement('canvas');
      this.overlay = document.createElement('canvas');
      this.ring = document.createElement('canvas');   // rotating chapter ring
      this.ringAngle = 0;
      this.size = 0; this.dpr = 1;
      this.val = cfg.start;   // displayed (spring) value
      this.target = cfg.start;
      this.vel = 0;
      this.direct = false;
      var self = this;
      var handleResize = function () {
        self.resize();
        if (self.onResize) self.onResize();
      };
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(handleResize);
        this._ro.observe(canvas);
      } else {
        window.addEventListener('resize', handleResize);
      }
      this.resize();
    }

    Gauge.prototype.angleFor = function (v) {
      var t = (v - this.cfg.start) / (this.cfg.end - this.cfg.start);
      return this.cfg.a0 + t * this.cfg.sweep;
    };

    Gauge.prototype.resize = function () {
      var w = this.cv.clientWidth || (this.cv.parentElement && this.cv.parentElement.clientWidth) || 300;
      var s = Math.max(120, Math.round(w));
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      if (s === this.size && dpr === this.dpr) return;
      this.size = s; this.dpr = dpr;
      var px = Math.round(s * dpr);
      [this.cv, this.face, this.overlay, this.ring].forEach(function (c) {
        c.width = px; c.height = px;
      });
      this.geom();
      this.buildFace();
      this.buildOverlay();
      this.buildRing();
    };

    Gauge.prototype.geom = function () {
      var S = this.size;
      this.S = S;
      this.cx = S / 2;
      this.cy = S / 2;
      this.outerR = S * 0.5 - 1;
      this.faceR = this.outerR * 0.855;
      this.rTickIn = this.faceR * 0.74;
      this.rTickOut = this.faceR * 0.90;
    };

    Gauge.prototype.faceFont = function (size) {
      return '600 ' + size.toFixed(1) + 'px "Palatino Linotype", "Book Antiqua", Georgia, serif';
    };

    /* ---- static: bezel, face, guilloche, redline, ticks, numerals, captions ---- */
    Gauge.prototype.buildFace = function () {
      var f = this.face.getContext('2d');
      var S = this.S, cx = this.cx, cy = this.cy;
      var outerR = this.outerR, faceR = this.faceR;
      var th = THEMES[themeKey];
      this.th = th;

      f.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      f.clearRect(0, 0, S, S);

      /* ---- polished chrome bezel ---- */
      var chrome = f.createLinearGradient(0, 0, S, S);
      chrome.addColorStop(0.00, '#f7fafc');
      chrome.addColorStop(0.12, '#b6bfc7');
      chrome.addColorStop(0.26, '#eef2f5');
      chrome.addColorStop(0.40, '#788088');
      chrome.addColorStop(0.52, '#dde3e8');
      chrome.addColorStop(0.66, '#828b93');
      chrome.addColorStop(0.80, '#e9eef2');
      chrome.addColorStop(1.00, '#5c646b');
      f.beginPath(); f.arc(cx, cy, outerR, 0, TAU);
      f.fillStyle = chrome; f.fill();

      var curved = f.createRadialGradient(cx - outerR * 0.36, cy - outerR * 0.42, outerR * 0.08, cx, cy, outerR);
      curved.addColorStop(0, 'rgba(255,255,255,.6)');
      curved.addColorStop(0.42, 'rgba(255,255,255,0)');
      curved.addColorStop(0.80, 'rgba(0,0,0,.2)');
      curved.addColorStop(1, 'rgba(0,0,0,.5)');
      f.beginPath(); f.arc(cx, cy, outerR, 0, TAU);
      f.fillStyle = curved; f.fill();

      /* ---- knurled ring ---- */
      f.save();
      f.beginPath();
      f.arc(cx, cy, outerR - 1.5, 0, TAU);
      f.arc(cx, cy, faceR + 1.5, 0, TAU, true);
      f.clip();
      var k, kInner = faceR + 1.5, kOuter = outerR - 1.5;
      for (k = 0; k < 360; k += 1.15) {
        var a = d2r(k), ca = Math.cos(a), sa = Math.sin(a);
        f.beginPath();
        f.moveTo(cx + ca * kInner, cy + sa * kInner);
        f.lineTo(cx + ca * kOuter, cy + sa * kOuter);
        f.strokeStyle = 'rgba(255,255,255,.13)';
        f.lineWidth = 0.7; f.stroke();
        var a2 = d2r(k + 0.38), ca2 = Math.cos(a2), sa2 = Math.sin(a2);
        f.beginPath();
        f.moveTo(cx + ca2 * kInner, cy + sa2 * kInner);
        f.lineTo(cx + ca2 * kOuter, cy + sa2 * kOuter);
        f.strokeStyle = 'rgba(0,0,0,.22)';
        f.lineWidth = 0.9; f.stroke();
      }
      f.restore();

      /* ---- inner bevel / rim shadow ---- */
      var bevel = f.createRadialGradient(cx, cy, faceR * 0.88, cx, cy, faceR);
      bevel.addColorStop(0, 'rgba(0,0,0,0)');
      bevel.addColorStop(0.55, 'rgba(0,0,0,.26)');
      bevel.addColorStop(1, 'rgba(0,0,0,.68)');
      f.beginPath(); f.arc(cx, cy, faceR, 0, TAU);
      f.fillStyle = bevel; f.fill();

      /* ---- face base ---- */
      var face = f.createRadialGradient(cx - faceR * 0.18, cy - faceR * 0.24, faceR * 0.05, cx, cy, faceR);
      face.addColorStop(0, th.faceHi);
      face.addColorStop(0.55, th.faceMid);
      face.addColorStop(1, th.faceLo);
      f.beginPath(); f.arc(cx, cy, faceR, 0, TAU);
      f.fillStyle = face; f.fill();

      /* ---- engine-turned guilloche ---- */
      f.save();
      f.beginPath(); f.arc(cx, cy, faceR, 0, TAU); f.clip();
      var r, i = 0;
      for (r = faceR * 0.05; r < faceR * 0.999; r += 2, i++) {
        f.beginPath(); f.arc(cx, cy, r, 0, TAU);
        f.strokeStyle = (i % 2)
          ? 'rgba(255,255,255,' + th.guilLight + ')'
          : 'rgba(0,0,0,' + th.guilDark + ')';
        f.lineWidth = 1; f.stroke();
      }
      // fine sunburst (alternating light/dark micro-lines = machined metal)
      var a3;
      for (a3 = 0; a3 < 360; a3 += 1) {
        var rad = d2r(a3);
        f.beginPath();
        f.moveTo(cx + Math.cos(rad) * faceR * 0.1, cy + Math.sin(rad) * faceR * 0.1);
        f.lineTo(cx + Math.cos(rad) * faceR, cy + Math.sin(rad) * faceR);
        f.strokeStyle = (a3 % 2)
          ? 'rgba(255,255,255,' + (th.guilLight * 0.8) + ')'
          : 'rgba(0,0,0,' + (th.guilDark * 0.35) + ')';
        f.lineWidth = 0.6; f.stroke();
      }
      f.restore();

      /* ---- redline band ---- */
      var self = this, cfg = this.cfg;
      if (cfg.redline != null) {
        var rMid = (this.rTickIn + this.rTickOut) / 2;
        f.beginPath();
        f.arc(cx, cy, rMid, this.angleFor(cfg.redline), this.angleFor(cfg.end));
        f.strokeStyle = th.redline;
        f.lineWidth = (this.rTickOut - this.rTickIn) * 0.92;
        f.lineCap = 'butt';
        f.stroke();
        // soft edge glow
        f.beginPath();
        f.arc(cx, cy, rMid, this.angleFor(cfg.redline), this.angleFor(cfg.end));
        f.strokeStyle = th.redlineEdge;
        f.lineWidth = (this.rTickOut - this.rTickIn) * 1.35;
        f.stroke();
        f.globalAlpha = 1;
      }

      /* ---- ticks ---- */
      function isMultiple(v, step) { return Math.abs(v / step - Math.round(v / step)) < 1e-6; }
      for (var v = cfg.start; v <= cfg.end + 1e-6; v += cfg.minor) {
        var maj = isMultiple(v, cfg.major);
        var mid = !maj && isMultiple(v, cfg.mid);
        var ang = this.angleFor(v);
        var ca = Math.cos(ang), sa = Math.sin(ang);
        var r1 = maj ? this.rTickIn : (mid ? this.rTickIn + this.faceR * 0.055 : this.rTickOut - this.faceR * 0.045);
        var r2 = this.rTickOut;
        var inRed = (cfg.redline != null && v >= cfg.redline);
        // emboss: dark then light
        f.lineCap = 'round';
        f.beginPath();
        f.moveTo(cx + ca * (r1 + 0.8), cy + sa * (r1 + 0.8));
        f.lineTo(cx + ca * (r2 + 0.8), cy + sa * (r2 + 0.8));
        f.strokeStyle = 'rgba(0,0,0,.5)';
        f.lineWidth = maj ? 3.4 : (mid ? 2.2 : 1.3);
        f.stroke();
        f.beginPath();
        f.moveTo(cx + ca * r1, cy + sa * r1);
        f.lineTo(cx + ca * r2, cy + sa * r2);
        f.strokeStyle = inRed ? th.numRed : (maj ? th.tickMaj : th.tickMin);
        f.lineWidth = maj ? 2.3 : (mid ? 1.5 : 0.9);
        f.stroke();
      }

      /* ---- numerals ---- */
      var numR = cfg.numRadius * faceR;
      var numSize = cfg.numSize * faceR;
      f.font = this.faceFont(numSize);
      f.textAlign = 'center';
      f.textBaseline = 'middle';
      for (var nv = cfg.start; nv <= cfg.end + 1e-6; nv += cfg.major) {
        var na = this.angleFor(nv);
        var nx = cx + Math.cos(na) * numR;
        var ny = cy + Math.sin(na) * numR;
        var label = String(Math.round(nv / cfg.numDiv));
        var red = (cfg.redline != null && nv >= cfg.redline - 1e-6);
        f.fillStyle = 'rgba(0,0,0,.55)';
        f.fillText(label, nx, ny + numSize * 0.07);
        f.fillStyle = red ? th.numRed : th.num;
        f.fillText(label, nx, ny);
      }

      /* ---- captions ---- */
      f.textBaseline = 'middle';
      var capSize = faceR * 0.072;
      f.font = '400 ' + capSize.toFixed(1) + 'px "Palatino Linotype", Georgia, serif';
      f.fillStyle = th.label;

      // datum reference mark (crosshair target) above the wordmark
      var dmY = cy + faceR * (cfg.wordmarkK - 0.135);
      var dmR = Math.max(1, faceR * 0.016);
      f.lineCap = 'round';
      f.strokeStyle = th.label;
      f.lineWidth = Math.max(1, faceR * 0.006);
      f.beginPath(); f.arc(cx, dmY, dmR, 0, TAU); f.stroke();
      f.beginPath();
      f.moveTo(cx - dmR * 1.7, dmY); f.lineTo(cx + dmR * 1.7, dmY);
      f.moveTo(cx, dmY - dmR * 1.7); f.lineTo(cx, dmY + dmR * 1.7);
      f.stroke();

      if (cfg.wordmark !== false) {
        spaced(f, 'DATUM', cx, cy + faceR * cfg.wordmarkK, capSize * 0.34);
      }

      var lblSize = faceR * (cfg.labelSize || 0.075);
      f.font = '400 ' + lblSize.toFixed(1) + 'px "Segoe UI", system-ui, sans-serif';
      f.fillStyle = th.label;
      spaced(f, cfg.label, cx, cy + faceR * cfg.labelK, lblSize * 0.28);

      if (cfg.odometer && cfg.odoCaption !== false) {
        var mSize = faceR * 0.055;
        f.font = '400 ' + mSize.toFixed(1) + 'px "Segoe UI", system-ui, sans-serif';
        f.fillStyle = th.label;
        spaced(f, 'MILES', cx, cy + faceR * (cfg.odoLabelK || 0.738), mSize * 0.3);
      }
    };

    /* ---- static overlay: hub + glass ---- */
    Gauge.prototype.buildOverlay = function () {
      var o = this.overlay.getContext('2d');
      var S = this.S, cx = this.cx, cy = this.cy, faceR = this.faceR;
      var th = THEMES[themeKey] || {};
      o.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      o.clearRect(0, 0, S, S);

      /* hub with winged B */
      var r = faceR * 0.135;
      var hg = o.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      hg.addColorStop(0, '#fbfdff'); hg.addColorStop(0.34, '#b4bcc4');
      hg.addColorStop(0.6, '#eef2f6'); hg.addColorStop(1, '#6a727a');
      o.beginPath(); o.arc(cx, cy, r, 0, TAU); o.fillStyle = hg; o.fill();

      // knurl on hub edge
      o.save();
      o.beginPath(); o.arc(cx, cy, r, 0, TAU); o.arc(cx, cy, r * 0.82, 0, TAU, true); o.clip();
      for (var k = 0; k < 360; k += 7) {
        var a = d2r(k), ca = Math.cos(a), sa = Math.sin(a);
        o.beginPath();
        o.moveTo(cx + ca * r * 0.82, cy + sa * r * 0.82);
        o.lineTo(cx + ca * r, cy + sa * r);
        o.strokeStyle = 'rgba(255,255,255,.28)'; o.lineWidth = 1; o.stroke();
      }
      o.restore();

      // dark badge disc
      o.beginPath(); o.arc(cx, cy, r * 0.7, 0, TAU);
      var bg = o.createRadialGradient(cx - r * 0.22, cy - r * 0.28, r * 0.04, cx, cy, r * 0.72);
      bg.addColorStop(0, th.hubHi || '#2e3d4c'); bg.addColorStop(0.58, th.hubMid || '#101922'); bg.addColorStop(1, th.hubLo || '#05090c');
      o.fillStyle = bg; o.fill();
      o.beginPath(); o.arc(cx, cy, r * 0.7, 0, TAU);
      o.lineWidth = r * 0.075; o.strokeStyle = th.hubRing || 'rgba(240,246,251,.85)'; o.stroke();
      drawEmblem(o, cx, cy, r * 0.62, th.emblem);

      // hub highlight
      var hh = o.createRadialGradient(cx - r * 0.34, cy - r * 0.42, 0, cx - r * 0.34, cy - r * 0.42, r * 1.2);
      hh.addColorStop(0, 'rgba(255,255,255,.32)'); hh.addColorStop(0.5, 'rgba(255,255,255,0)');
      o.beginPath(); o.arc(cx, cy, r, 0, TAU); o.fillStyle = hh; o.fill();

      /* glass */
      o.save();
      o.beginPath(); o.arc(cx, cy, faceR, 0, TAU); o.clip();

      var g = o.createLinearGradient(cx - faceR * 1.05, cy - faceR * 1.05, cx + faceR * 0.9, cy + faceR);
      g.addColorStop(0, 'rgba(255,255,255,.20)');
      g.addColorStop(0.17, 'rgba(255,255,255,.055)');
      g.addColorStop(0.30, 'rgba(255,255,255,0)');
      g.addColorStop(0.74, 'rgba(255,255,255,0)');
      g.addColorStop(0.88, 'rgba(255,255,255,.05)');
      g.addColorStop(1, 'rgba(255,255,255,.11)');
      o.fillStyle = g; o.fillRect(0, 0, S, S);

      // crisp reflected "window" wedges
      o.save();
      o.translate(cx, cy); o.rotate(d2r(-30));
      var rg = o.createLinearGradient(0, -faceR, 0, faceR);
      rg.addColorStop(0, 'rgba(255,255,255,.14)');
      rg.addColorStop(0.5, 'rgba(255,255,255,.02)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      o.fillStyle = rg;
      o.fillRect(-faceR * 0.96, -faceR * 1.0, faceR * 0.40, faceR * 1.5);
      o.fillRect(faceR * 0.08, -faceR * 1.0, faceR * 0.15, faceR * 1.5);
      o.restore();

      // vignette
      var vg = o.createRadialGradient(cx, cy, faceR * 0.55, cx, cy, faceR * 1.02);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(0.78, 'rgba(0,0,0,.16)');
      vg.addColorStop(1, 'rgba(0,0,0,.52)');
      o.fillStyle = vg; o.fillRect(0, 0, S, S);
      o.restore();

      // inner rim: reflected light low, shade high
      o.beginPath(); o.arc(cx, cy, faceR - 1.2, d2r(18), d2r(142));
      o.strokeStyle = 'rgba(255,255,255,.34)'; o.lineWidth = 3; o.stroke();
      o.beginPath(); o.arc(cx, cy, faceR - 1.2, d2r(186), d2r(334));
      o.strokeStyle = 'rgba(0,0,0,.34)'; o.lineWidth = 4.5; o.stroke();
    };

    /* ---- rotating chapter ring: engraved mantra + fine ticks ---- */
    Gauge.prototype.buildRing = function () {
      var r = this.ring.getContext('2d');
      var S = this.S, cx = this.cx, cy = this.cy, faceR = this.faceR;
      var cfg = this.cfg, th = this.th || THEMES[themeKey];
      r.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      r.clearRect(0, 0, S, S);
      if (!cfg.mantraK) return;

      var rad = faceR * (cfg.mantraK || 0.42);

      // fine minute-ticks (like a clock's chapter); majors every 30°
      r.lineCap = 'butt';
      for (var d = 0; d < 360; d += 3) {
        var ta = d2r(d);
        var maj = (d % 30 === 0);
        var t0 = rad + faceR * 0.085;
        var t1 = t0 + faceR * (maj ? 0.030 : 0.013);
        r.beginPath();
        r.moveTo(cx + Math.cos(ta) * t0, cy + Math.sin(ta) * t0);
        r.lineTo(cx + Math.cos(ta) * t1, cy + Math.sin(ta) * t1);
        r.strokeStyle = maj ? th.tickMin : 'rgba(230,222,203,.20)';
        r.lineWidth = maj ? 1.4 : 0.8;
        r.stroke();
      }
    };

    Gauge.prototype.drawOdometer = function (ctx, miles, test) {
      var faceR = this.faceR, cx = this.cx, cy = this.cy;
      var th = this.th;
      var w = faceR * 0.70, h = faceR * 0.158;
      var odoK = this.cfg.odoK || 0.60;
      var x = cx - w / 2, y = cy + faceR * odoK - h / 2;
      var pad = faceR * 0.016;

      // chrome frame
      var fg = ctx.createLinearGradient(0, y - pad, 0, y + h + pad);
      fg.addColorStop(0, th.odoA); fg.addColorStop(0.5, th.odoB); fg.addColorStop(1, th.odoA);
      roundRect(ctx, x - pad, y - pad, w + pad * 2, h + pad * 2, faceR * 0.035);
      ctx.fillStyle = fg; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();

      // recess shadow
      roundRect(ctx, x, y, w, h, faceR * 0.022);
      var rs = ctx.createLinearGradient(0, y, 0, y + h);
      rs.addColorStop(0, 'rgba(0,0,0,.55)');
      rs.addColorStop(0.22, 'rgba(0,0,0,.10)');
      rs.addColorStop(1, 'rgba(0,0,0,.30)');
      ctx.fillStyle = '#0a0b0c'; ctx.fill();
      ctx.save(); ctx.clip();

      var cells = 6;
      var cw = w / cells;
      var value = test ? 88888.8 : miles;
      var fixed = Math.max(0, Math.round(value * 10));
      var digits = String(fixed);
      while (digits.length < cells) digits = '0' + digits;
      digits = digits.slice(-cells);
      var fontPx = h * 0.78;

      for (var i = 0; i < cells; i++) {
        var ten = (i === cells - 1);

        var cxx = x + i * cw;
        // drum shading
        ctx.save();
        ctx.beginPath(); ctx.rect(cxx, y, cw, h); ctx.clip();
        var dg = ctx.createLinearGradient(0, y, 0, y + h);
        dg.addColorStop(0, ten ? '#c9bda6' : th.drumLo);
        dg.addColorStop(0.30, ten ? th.drumTen : th.drum);
        dg.addColorStop(0.70, ten ? th.drumTen : th.drum);
        dg.addColorStop(1, ten ? '#c9bda6' : th.drumLo);
        ctx.fillStyle = dg; ctx.fillRect(cxx, y, cw, h);

        ctx.font = '600 ' + fontPx.toFixed(1) + 'px "Palatino Linotype", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ten ? th.drumTenText : th.drumText;
        ctx.fillText(digits.charAt(i), cxx + cw / 2, y + h / 2);
        ctx.restore();

        // separator
        if (i < cells - 1) {
          ctx.beginPath();
          ctx.moveTo(cxx + cw, y + h * 0.08);
          ctx.lineTo(cxx + cw, y + h * 0.92);
          ctx.strokeStyle = 'rgba(0,0,0,.28)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.restore();

      // decimal marker (between 5th and 6th cell)
      var mx = x + cw * (cells - 1);
      ctx.beginPath();
      ctx.arc(mx, y + h + pad * 0.1, 1.6, 0, TAU);
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fill();
    };

    /* ---- needle ---- */
    Gauge.prototype.drawNeedle = function (ctx) {
      var cfg = this.cfg;
      var cx = this.cx, cy = this.cy, faceR = this.faceR;
      var span = cfg.end - cfg.start;
      // wide window so the needle may sweep past the dial during the spin-up test
      var a = this.angleFor(clamp(this.val, cfg.start - span * 0.12, cfg.start + span * 1.75));
      var L = faceR * 0.845;
      var w = faceR * 0.048;
      var tail = faceR * 0.19;
      var hot = this.val >= (cfg.redline != null ? cfg.redline : 1e9);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a + Math.PI / 2);

      ctx.shadowColor = 'rgba(0,0,0,.6)';
      ctx.shadowBlur = faceR * 0.07;
      ctx.shadowOffsetX = faceR * 0.018;
      ctx.shadowOffsetY = faceR * 0.026;

      ctx.beginPath();
      ctx.moveTo(0, -L);
      ctx.quadraticCurveTo(w * 0.85, -L * 0.34, w, 0);
      ctx.lineTo(w * 0.5, tail);
      ctx.lineTo(-w * 0.5, tail);
      ctx.lineTo(-w, 0);
      ctx.quadraticCurveTo(-w * 0.85, -L * 0.34, 0, -L);
      ctx.closePath();

      var th = this.th || THEMES[themeKey];
      var ng = ctx.createLinearGradient(-w, 0, w, 0);
      var ncol = (hot ? th.needleHot : th.needle) || ['#7c0b12', '#d92121', '#ff6a58', '#c81623', '#7d0c13'];
      ng.addColorStop(0, ncol[0]);
      ng.addColorStop(0.32, ncol[1]);
      ng.addColorStop(0.55, ncol[2]);
      ng.addColorStop(0.78, ncol[3]);
      ng.addColorStop(1, ncol[4]);
      ctx.fillStyle = ng;
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

      // centre spine highlight
      ctx.beginPath();
      ctx.moveTo(0, -L * 0.96);
      ctx.lineTo(w * 0.22, 0);
      ctx.lineTo(-w * 0.22, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,235,225,.35)';
      ctx.fill();

      // counterweight disc
      ctx.beginPath();
      ctx.arc(0, tail * 0.55, w * 0.62, 0, TAU);
      ctx.fillStyle = '#2a2f34';
      ctx.fill();

      // glow at the tip when in the red
      if (hot) {
        ctx.beginPath();
        ctx.arc(0, -L * 0.92, faceR * 0.05, 0, TAU);
        ctx.fillStyle = 'rgba(255,70,50,.55)';
        ctx.fill();
      }
      ctx.restore();
    };

    /* ---- per-frame ---- */
    Gauge.prototype.step = function (dt) {
      if (this.direct) { this.val = this.target; this.vel = 0; return; }
      // lightly damped spring: the needle whips past its mark and rings down,
      // like a clock hand loosed from its axle. Sub-stepped for stability.
      var k = 340, damp = reduceMotion ? 42 : 11;
      var h = 1 / 240;
      var n = Math.max(1, Math.min(16, Math.ceil(dt / h)));
      var step = dt / n;
      for (var i = 0; i < n; i++) {
        this.vel += (this.target - this.val) * k * step - this.vel * damp * step;
        this.val += this.vel * step;
      }
      var span = this.cfg.end - this.cfg.start;
      var lo = this.cfg.start - span * 0.12, hi = this.cfg.start + span * 1.75;
      if (this.val < lo) { this.val = lo; this.vel = 0; }
      if (this.val > hi) { this.val = hi; this.vel = 0; }
    };

    // rotate the chapter ring — one full turn per `revsPerTurn` engine revolutions
    Gauge.prototype.spin = function (dt, revsPerSec, dir) {
      if (!this.cfg.mantraK) return;
      var rate = Math.min(150, Math.max(0, revsPerSec));
      this.ringAngle += dir * (rate / 540) * TAU * dt;
      if (this.ringAngle > TAU) this.ringAngle -= TAU;
      if (this.ringAngle < -TAU) this.ringAngle += TAU;
    };

    Gauge.prototype.render = function (odoValue, odoTest) {
      var ctx = this.ctx, S = this.S, cx = this.cx, cy = this.cy;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, S, S);
      ctx.drawImage(this.face, 0, 0, S, S);
      // rotating chapter ring (text-free), under the needle
      if (this.cfg.mantraK) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.ringAngle);
        ctx.translate(-cx, -cy);
        ctx.drawImage(this.ring, 0, 0, S, S);
        ctx.restore();
      }
      if (this.cfg.odometer) this.drawOdometer(ctx, odoValue, odoTest);
      this.drawNeedle(ctx);
      ctx.drawImage(this.overlay, 0, 0, S, S);
    };

  /* ================================================================
     Dial only: hold REV, release, settle. No drivetrain, no readouts.
     ================================================================ */
  var canvas = document.getElementById('instrument-canvas');
  var rev = document.getElementById('instrument-rev');
  if (!canvas || !rev) return;

  var tach = new Gauge(canvas, {
    start: 0, end: 8000, major: 1000, mid: 500, minor: 100, numDiv: 1000,
    a0: d2r(135), sweep: d2r(270), redline: 6800,
    numRadius: 0.64, numSize: 0.145,
    wordmark: false, wordmarkK: 0.28, label: '', labelK: 0.50, labelSize: 0.072,
    mantraK: 0.40,
    odometer: true, odoK: 0.645, odoCaption: false, odoLabelK: 0.762
  });

  var ODO = 1235.0;
  var REV_TARGET = 7250;
  var state = { rpm: 0, rev: false };
  var raf = 0;
  var last = 0;
  var paint = function () { tach.render(ODO, false); };
  tach.onResize = paint;

  tach.val = 0;
  tach.target = 0;
  paint();

  function frame(now) {
    var dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;

    var target = state.rev ? REV_TARGET : 0;
    var rate = state.rev ? 9 : 4.5;
    state.rpm += (target - state.rpm) * Math.min(1, dt * rate);
    if (!state.rev && state.rpm < 0.5) state.rpm = 0;

    tach.target = state.rpm;
    tach.step(dt);
    tach.spin(dt, reduceMotion ? 0 : state.rpm / 60, 1);
    paint();

    if (!state.rev && Math.abs(tach.val) < 0.6 && Math.abs(tach.vel) < 0.6) {
      tach.val = 0;
      tach.vel = 0;
      tach.target = 0;
      paint();
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (raf || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function press(e) {
    if (e && e.pointerId != null && rev.setPointerCapture) {
      try { rev.setPointerCapture(e.pointerId); } catch (x) {}
    }
    state.rev = true;
    rev.classList.add('down');
    kick();
  }

  function release() {
    if (!state.rev) return;
    state.rev = false;
    rev.classList.remove('down');
    kick();
  }

  rev.addEventListener('pointerdown', press);
  rev.addEventListener('pointerup', release);
  rev.addEventListener('pointercancel', release);
  rev.addEventListener('lostpointercapture', release);
  window.addEventListener('pointerup', release);
  rev.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  rev.addEventListener('keydown', function (e) {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      press();
    }
  });
  rev.addEventListener('keyup', function (e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      release();
    }
  });
  rev.addEventListener('blur', release);
  window.addEventListener('blur', release);

  /* Keep the floating back-to-top key off the instrument face. */
  var card = document.getElementById('instrument');
  var topBtn = document.getElementById('top');
  if (card && topBtn && typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(function (entries) {
      topBtn.classList.toggle('instrument-near', entries[0].isIntersecting);
    }, { threshold: 0.35 }).observe(card);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      release();
      if (raf) {
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
        raf = 0;
      }
    } else if (!state.rev && Math.abs(tach.val) > 0.5) {
      kick();
    }
  });

  paint();

})();
