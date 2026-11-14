/* Optional engine sound for the REV instrument. Off by default.

   A small speaker button sits beside REV. Nothing audio-related loads until someone presses
   it: the synth (engine-sound.js) is fetched then, and the AudioContext is created inside that
   click, as iOS Safari requires. The choice is remembered on this device only.
   instrument.js is untouched: like drive.js, this listens to the same REV button from outside. */

const KEY = 'datum-sound';
const rev = document.getElementById('instrument-rev');

if (rev) {
  const read = () => { try { return localStorage.getItem(KEY) === 'on'; } catch (e) { return false; } };
  const save = (on) => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* private mode */ } };

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'instrument-sound';
  btn.setAttribute('aria-label', 'Engine sound');
  btn.setAttribute('aria-pressed', 'false');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/>' +
    '<path class="on" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11"/>' +
    '<path class="off" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  const row = document.createElement('div');
  row.className = 'instrument-controls';
  rev.replaceWith(row);
  row.append(rev, btn);

  let engine = null, loading = null, ctx = null;
  // Must run synchronously inside the click or press: iOS Safari only lets audio start there.
  function unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx ||= new AC({ latencyHint: 'interactive' });
    if (ctx.state !== 'running') ctx.resume();
    return ctx;
  }
  const load = () => (loading ||= import('./engine-sound.js').then((m) => (engine = m.createEngine(rev, ctx))));

  async function set(on) {
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('is-on', on);
    save(on);
    if (on) {
      if (!unlock()) return;
      await load();
      engine.enable();
    } else if (engine) {
      engine.disable();
    }
  }

  btn.addEventListener('click', () => set(btn.getAttribute('aria-pressed') !== 'true'));

  // Remembered "on": audio may only start after a gesture, so arm it on the first REV press.
  if (read()) {
    btn.setAttribute('aria-pressed', 'true');
    btn.classList.add('is-on');
    const arm = () => set(true);
    rev.addEventListener('pointerdown', arm, { once: true });
    rev.addEventListener('keydown', arm, { once: true });
  }
}
