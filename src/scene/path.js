import * as THREE from 'three';

/* The route. One curve drives the road, the car and the camera.
   The road winds "down" the page (+Z is toward the bottom of the screen)
   and descends gently, so the car literally drives downhill as you scroll. */

export const BASE_Y = (z) => 22 - z * 0.048;

const XZ = [
  [0, -6], [0, 6], [7, 24], [-6, 44], [-14, 66], [-4, 88], [12, 106], [17, 128],
  [6, 150], [-12, 168], [-17, 190], [-6, 212], [11, 230], [16, 252], [4, 274],
  [-13, 292], [-15, 314], [-2, 334], [13, 352], [14, 374], [2, 394], [-6, 414], [0, 432]
];

export const curve = new THREE.CatmullRomCurve3(
  XZ.map(([x, z]) => new THREE.Vector3(x, BASE_Y(z), z)), false, 'centripetal', 0.5
);
curve.arcLengthDivisions = 2000;
export const LENGTH = curve.getLength();

/* Frame at arc-length fraction u: position, tangent and the "right" normal on the ground. */
const _up = new THREE.Vector3(0, 1, 0);
export function frameAt(u, out = {}) {
  u = THREE.MathUtils.clamp(u, 0, 1);
  out.pos = curve.getPointAt(u, out.pos || new THREE.Vector3());
  out.tan = curve.getTangentAt(u, out.tan || new THREE.Vector3());
  const flat = (out.flat || (out.flat = new THREE.Vector3())).set(out.tan.x, 0, out.tan.z).normalize();
  out.right = (out.right || new THREE.Vector3()).crossVectors(flat, _up).normalize();
  return out;
}

/* Everything flat that the terrain must sit under: the main road plus pads and side roads.
   Stored as samples, bucketed by z for fast nearest lookups. */
const BIN = 6;
const samples = []; // {x, y, z, half}
const bins = new Map();
function addSample(x, y, z, half) {
  const s = { x, y, z, half };
  samples.push(s);
  const k = Math.floor(z / BIN);
  if (!bins.has(k)) bins.set(k, []);
  bins.get(k).push(s);
}

export const ROAD_HALF = 3.1;
{
  const n = 1400, f = {};
  for (let i = 0; i <= n; i++) { frameAt(i / n, f); addSample(f.pos.x, f.pos.y, f.pos.z, ROAD_HALF); }
}

export function addFlatStrip(a, b, half, y) {
  const n = Math.ceil(a.distanceTo(b) / 0.8);
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(b, i / n);
    addSample(p.x, y ?? p.y, p.z, half);
  }
}

/* Nearest flat sample: distance beyond its edge, and its height. */
export function nearest(x, z, reach = 40) {
  let best = Infinity, by = 0;
  const k0 = Math.floor((z - reach) / BIN), k1 = Math.floor((z + reach) / BIN);
  for (let k = k0; k <= k1; k++) {
    const list = bins.get(k);
    if (!list) continue;
    for (const s of list) {
      const d = Math.hypot(s.x - x, s.z - z) - s.half;
      if (d < best) { best = d; by = s.y; }
    }
  }
  return { d: best, y: by };
}

/* Small deterministic value noise, for hills. */
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function hills(x, z) {
  return (vnoise(x * 0.045, z * 0.045) - 0.5) * 9 + (vnoise(x * 0.12 + 7, z * 0.12) - 0.5) * 3;
}

export function terrainHeight(x, z) {
  const n = nearest(x, z);
  const free = BASE_Y(z) + hills(x, z) + Math.max(0, Math.abs(x) - 30) * 0.18; // valley walls rise
  const t = THREE.MathUtils.smoothstep(n.d, 1.2, 15);
  return THREE.MathUtils.lerp(n.y - 0.3, free, t);
}

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
