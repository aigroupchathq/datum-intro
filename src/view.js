/* Shared by main.js and drive.js: which view the address asks for, and where the reader is. */

export const isOverviewPath = () => /\/overview\.html$/.test(location.pathname);

// The section nearest the top of the screen, so switching views keeps the reader's place.
export function sectionInView() {
  const line = innerHeight * 0.35;
  let at = 0;
  document.querySelectorAll('.stop').forEach((s, i) => { if (s.getBoundingClientRect().top <= line) at = i; });
  return at;
}
