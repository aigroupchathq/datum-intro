import './styles/road.css';
import './sound.js';   // optional engine sound for REV: a tiny toggle; the synth loads on first use

/* Only load the 3D drive when it will actually run.
   Reduced motion or no WebGL gets the same content as a calm page, with no 3D download. */
if (document.documentElement.classList.contains('drive')) {
  import('./drive.js').then((m) => m.start()).catch((err) => {
    console.error(err);
    document.documentElement.classList.replace('drive', 'still-mode');
  });
}
