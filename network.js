/* Datum Network — design-direction zone map.
   Static SVG graph; JS only switches which local nodes are active. */
(function () {
  'use strict';

  var root = document.getElementById('network-card');
  if (!root) return;

  var zones = [].slice.call(root.querySelectorAll('.network-zone'));
  var nodes = [].slice.call(root.querySelectorAll('.network-node'));
  var links = [].slice.call(root.querySelectorAll('.network-link'));
  var caption = document.getElementById('network-caption');
  if (!zones.length || !nodes.length) return;

  var DATA = {
    home: {
      caption: 'Home: the garage, the club, the drive.',
      nodes: ['custodian', 'club', 'drive']
    },
    coast: {
      caption: 'Coast: recovery, storage, detailers.',
      nodes: ['recovery', 'storage', 'detailer']
    },
    city: {
      caption: 'City: MOT, mechanics, fabrication.',
      nodes: ['mot', 'mechanic', 'fabrication']
    },
    mountain: {
      caption: 'Mountain: recovery, specialists, builders.',
      nodes: ['recovery2', 'specialist', 'builder']
    }
  };

  function setZone(zone) {
    var active = DATA[zone] ? DATA[zone].nodes : [];
    zones.forEach(function (btn) {
      var on = btn.getAttribute('data-zone') === zone;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('on', on);
    });
    nodes.forEach(function (node) {
      var on = active.indexOf(node.getAttribute('data-node')) >= 0;
      node.classList.toggle('is-active', on);
      node.classList.toggle('is-dim', !on);
    });
    links.forEach(function (link) {
      var on = active.indexOf(link.getAttribute('data-node')) >= 0;
      link.classList.toggle('is-active', on);
      link.classList.toggle('is-dim', !on);
    });
    if (caption) caption.textContent = DATA[zone] ? DATA[zone].caption : '';
  }

  zones.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setZone(btn.getAttribute('data-zone'));
    });
  });

  var topBtn = document.getElementById('top');
  if (topBtn && typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(function (entries) {
      topBtn.classList.toggle('instrument-near', entries[0].isIntersecting);
    }, { threshold: 0.35 }).observe(root);
  }

  setZone('home');
})();
