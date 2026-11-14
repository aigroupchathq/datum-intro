/* A synthesised straight-six for the REV control. No samples, no library: WebAudio only.

   rpm follows the same rise and fall as instrument.js (rate 9 while held, 4.5 on release),
   from a fast idle up to the dial's 7,250 redline. The sound idles only while the REV
   instrument is on screen, and the AudioContext is suspended when it goes quiet. */

const IDLE = 850, RED = 7250, CYL = 6;
const VOL = 0.22;

export function createEngine(rev, ctx) {   // ctx: created and resumed inside a user gesture
  let nodes = null;
  let on = false, held = false, inView = false;
  let n = 0, level = 0, raf = 0, last = 0, quietSince = 0;

  function build() {
    const out = ctx.createDynamicsCompressor();
    out.threshold.value = -18; out.ratio.value = 4;
    out.connect(ctx.destination);
    const master = ctx.createGain(); master.gain.value = 0; master.connect(out);

    // the combustion note: a saw at firing frequency over a square sub, soft-clipped, then a
    // low-pass that opens as the revs climb
    const saw = ctx.createOscillator(); saw.type = 'sawtooth';
    const sub = ctx.createOscillator(); sub.type = 'square';
    const sawG = ctx.createGain(); sawG.gain.value = 0.55;
    const subG = ctx.createGain(); subG.gain.value = 0.35;
    const shape = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(x * 2.4); }
    shape.curve = curve; shape.oversample = '2x';
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.Q.value = 3.5;
    const body = ctx.createGain(); body.gain.value = 1;
    saw.connect(sawG).connect(shape); sub.connect(subG).connect(shape);
    shape.connect(tone).connect(body).connect(master);

    // exhaust burble: a slow amplitude wobble, strongest at idle
    const lfo = ctx.createOscillator(); lfo.type = 'triangle';
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.25;
    lfo.connect(lfoG).connect(body.gain);

    // intake rush: band-passed noise that rises with the revs
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = 0.8;
    const air = ctx.createGain(); air.gain.value = 0;
    noise.connect(band).connect(air).connect(master);

    [saw, sub, lfo, noise].forEach((s) => s.start());
    nodes = { master, saw, sub, tone, lfo, lfoG, band, air };
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    n += ((held ? 1 : 0) - n) * Math.min(1, dt * (held ? 9 : 4.5));
    const audible = on && inView && !document.hidden;
    level += ((audible ? 1 : 0) - level) * Math.min(1, dt * 6);

    const rpm = IDLE + n * (RED - IDLE);
    const f = (rpm / 60) * (CYL / 2);
    const t = ctx.currentTime, k = 0.03;
    nodes.saw.frequency.setTargetAtTime(f, t, k);
    nodes.sub.frequency.setTargetAtTime(f / 2, t, k);
    nodes.tone.frequency.setTargetAtTime(260 + n * 2800, t, k);
    nodes.lfo.frequency.setTargetAtTime(f / 3, t, k);
    nodes.lfoG.gain.setTargetAtTime(0.28 * (1 - n * 0.8), t, k);
    nodes.band.frequency.setTargetAtTime(500 + n * 2500, t, k);
    nodes.air.gain.setTargetAtTime(0.05 + n * 0.16, t, k);
    nodes.master.gain.setTargetAtTime(VOL * level * (0.55 + n * 0.45), t, k);

    // go quiet: stop the loop and suspend the context, so it costs nothing while unused
    if (!audible && level < 0.01 && n < 0.01) {
      if (!quietSince) quietSince = now;
      if (now - quietSince > 1500) { raf = 0; ctx.suspend(); return; }
    } else quietSince = 0;
    raf = requestAnimationFrame(tick);
  }

  function wake() {
    if (!on || !nodes) return;
    if (ctx.state !== 'running') ctx.resume();
    quietSince = 0;
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) wake(); }, { threshold: 0.25 });
  io.observe(rev.closest('.instrument') || rev);

  const down = () => { held = true; wake(); };
  const up = () => { held = false; };
  rev.addEventListener('pointerdown', down);
  addEventListener('pointerup', up);
  rev.addEventListener('pointercancel', up);
  rev.addEventListener('lostpointercapture', up);
  rev.addEventListener('blur', up);
  rev.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') down(); });
  rev.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
  document.addEventListener('visibilitychange', wake);

  return {
    // instrument.js marks a held REV with .down: catch a press that began while this loaded
    enable() { on = true; if (!nodes) build(); held = held || rev.classList.contains('down'); wake(); },
    disable() { on = false; },
  };
}
