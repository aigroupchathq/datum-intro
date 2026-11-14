import './styles/road.css';
import './sound.js';   // optional engine sound for REV: a tiny toggle; the synth loads on first use
import { isOverviewPath, sectionInView } from './view.js';

const html = document.documentElement;
const take = document.querySelector('.take-drive');
const fallBack = (err) => { console.error(err); html.classList.replace('drive', 'still-mode'); };

/* Only load the 3D drive when it will actually run.
   Reduced motion or no WebGL gets the same content as a calm page, with no 3D download. */
if (html.classList.contains('drive')) {
  import('./drive.js').then((m) => m.start()).catch(fallBack);
} else if (take && html.hasAttribute('data-webgl')) {
  // The whole-page view (/overview.html, reduced motion or ?drive=0) offers the drive. The 3D
  // is fetched only if asked for, and the road opens at the section being read.
  take.hidden = false;
  take.addEventListener('click', () => {
    const at = sectionInView();
    take.hidden = true;
    if (isOverviewPath()) history.pushState({ datum: 'drive' }, '', '/');
    html.classList.replace('still-mode', 'drive');
    import('./drive.js').then((m) => m.start({ startAt: at })).catch(fallBack);
  }, { once: true });
}
