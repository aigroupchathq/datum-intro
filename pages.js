/* Datum Atelier, subpages: the road strip and the life line.
   Decorative only. Without it the pages read exactly the same.
   - a short road strip under the header, with the car moving along it as you scroll
   - the spine fills crimson behind you; section markers light up as you pass them */
(function () {
  var main = document.getElementById('main');
  var spine = document.querySelector('.spine');
  if (!main) return;

  /* ---- road strip ---- */
  var NS = 'http://www.w3.org/2000/svg';
  var D = 'M0 40 C 160 12, 300 62, 470 34 S 760 8, 930 38 S 1120 58, 1200 30';
  var strip = document.createElement('div');
  strip.className = 'road-strip wrap';
  strip.setAttribute('aria-hidden', 'true');
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 1200 70');
  svg.setAttribute('preserveAspectRatio', 'none');
  function path(cls, dy) {
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', D);
    p.setAttribute('class', cls);
    if (dy) p.setAttribute('transform', 'translate(0 ' + dy + ')');
    svg.appendChild(p);
    return p;
  }
  path('tar');
  path('edge', -8); path('edge b', -8); path('edge', 8); path('edge b', 8);
  path('dash');
  var life = path('life');
  var car = document.createElement('i');
  car.className = 'car';
  strip.appendChild(svg);
  strip.appendChild(car);
  main.parentNode.insertBefore(strip, main);

  var len = life.getTotalLength();
  life.style.strokeDasharray = len + ' ' + len;

  /* ---- markers on the spine ---- */
  var marks = spine ? [].slice.call(spine.querySelectorAll('.mark')) : [];

  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    var max = Math.max(1, document.documentElement.scrollHeight - vh);
    var p = Math.min(1, Math.max(0, window.scrollY / max));

    // the car on the strip, turned to the road's direction (in screen space)
    var at = len * (0.03 + p * 0.94);
    var a = life.getPointAtLength(at), b = life.getPointAtLength(Math.min(len, at + 4));
    var w = svg.clientWidth, h = svg.clientHeight;
    var sx = w / 1200, sy = h / 70;
    var ang = Math.atan2((b.y - a.y) * sy, (b.x - a.x) * sx) * 180 / Math.PI;
    car.style.transform = 'translate(' + (svg.getBoundingClientRect().left - strip.getBoundingClientRect().left + a.x * sx).toFixed(1) + 'px,' + (a.y * sy).toFixed(1) + 'px) rotate(' + ang.toFixed(1) + 'deg)';
    life.style.strokeDashoffset = (len - at).toFixed(1);

    // the life line on the spine, down to the reading line
    if (spine) {
      var r = spine.getBoundingClientRect();
      var line = vh * 0.55;
      spine.style.setProperty('--life', Math.max(0, Math.min(r.height, line - r.top)).toFixed(0) + 'px');
      var here = -1;
      for (var i = 0; i < marks.length; i++) {
        var done = marks[i].getBoundingClientRect().top < line;
        marks[i].classList.toggle('done', done);
        if (done) here = i;
      }
      for (var j = 0; j < marks.length; j++) marks[j].classList.toggle('here', j === here);
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
