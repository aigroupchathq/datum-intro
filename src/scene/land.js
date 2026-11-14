import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { curve, frameAt, LENGTH, ROAD_HALF, terrainHeight, nearest, rng } from './path.js';
import { groundMaterial, roadMaterial, centreLineMaterial, INK } from './ink.js';

/* The road ribbon, its inked edges, the life line, the land and the trees. */

export function buildRoad(scene) {
  const n = 900, f = {};
  const pos = [], idx = [], cpos = [], cu = [], left = [], right = [], leftB = [], rightB = [];
  const r = rng(7);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    frameAt(u, f);
    const y = f.pos.y + 0.02;
    const L = f.pos.clone().addScaledVector(f.right, -ROAD_HALF);
    const R = f.pos.clone().addScaledVector(f.right, ROAD_HALF);
    pos.push(L.x, y, L.z, R.x, y, R.z);
    // centre line: a thin strip carrying its distance along the road
    const cl = f.pos.clone().addScaledVector(f.right, -0.08), cr = f.pos.clone().addScaledVector(f.right, 0.08);
    cpos.push(cl.x, y + 0.02, cl.z, cr.x, y + 0.02, cr.z); cu.push(u, u);
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    // sketchy edges: the main stroke, plus a lighter second pass that wanders a little
    const e = 0.18;
    left.push(L.clone().addScaledVector(f.right, e).setY(y + 0.03));
    right.push(R.clone().addScaledVector(f.right, -e).setY(y + 0.03));
    const j = () => (r() - 0.5) * 0.12;
    leftB.push(L.clone().addScaledVector(f.right, e + 0.1 + j()).setY(y + 0.03));
    rightB.push(R.clone().addScaledVector(f.right, -e - 0.1 + j()).setY(y + 0.03));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const road = new THREE.Mesh(g, roadMaterial());
  scene.add(road);

  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
  cg.setAttribute('u', new THREE.Float32BufferAttribute(cu, 1));
  cg.setIndex(idx);
  const cm = centreLineMaterial();
  cm.uniforms.uLen.value = LENGTH;
  const centre = new THREE.Mesh(cg, cm);
  centre.renderOrder = 2;
  scene.add(centre);

  const strong = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .9 });
  const faint = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .3 });
  for (const [pts, m] of [[left, strong], [right, strong], [leftB, faint], [rightB, faint]]) {
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m));
  }
  return { road, centre };
}

export function buildLand(scene, { mobile }) {
  const W = 190, D = 520, sx = mobile ? 70 : 105, sz = mobile ? 190 : 290;
  const g = new THREE.PlaneGeometry(W, D, sx, sz);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, D / 2 - 40);
  const p = g.attributes.position;
  const r = rng(3);
  for (let i = 0; i < p.count; i++) {
    // a little jitter keeps the facets from looking like a grid
    const x = p.getX(i) + (r() - .5) * 0.9, z = p.getZ(i) + (r() - .5) * 0.9;
    p.setXYZ(i, x, terrainHeight(x, z), z);
  }
  g.computeVertexNormals();
  const land = new THREE.Mesh(g, groundMaterial());
  scene.add(land);
  return land;
}

export function buildTrees(scene, { mobile, avoid = [] }) {
  const r = rng(11);
  const fills = [], edges = [];
  const variants = [
    () => { const a = new THREE.ConeGeometry(1.4, 3.2, 5); a.translate(0, 2.6, 0); const b = new THREE.ConeGeometry(1.0, 2.4, 5); b.translate(0, 4.1, 0); const t = new THREE.CylinderGeometry(.18, .22, 1.2, 4); t.translate(0, .6, 0); return [a, b, t]; },
    () => { const a = new THREE.IcosahedronGeometry(1.5, 0); a.translate(0, 2.8, 0); const t = new THREE.CylinderGeometry(.16, .2, 1.8, 4); t.translate(0, .9, 0); return [a, t]; },
    () => { const a = new THREE.ConeGeometry(1.0, 4.4, 4); a.translate(0, 2.9, 0); const t = new THREE.CylinderGeometry(.12, .16, 1, 4); t.translate(0, .5, 0); return [a, t]; },
  ];
  const count = mobile ? 230 : 420;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  let placed = 0, tries = 0;
  while (placed < count && tries++ < count * 12) {
    const x = (r() - .5) * 170, z = -30 + r() * 480;
    const n = nearest(x, z, 30);
    if (n.d < 4.5) continue;
    if (n.d < 9 && r() < .75) continue;                // keep verges mostly clear
    if (avoid.some((a) => Math.hypot(a.x - x, a.z - z) < a.r)) continue;
    const y = terrainHeight(x, z);
    const parts = variants[Math.floor(r() * variants.length)]();
    const sc = 0.7 + r() * 0.8;
    q.setFromAxisAngle(v.set(0, 1, 0), r() * Math.PI * 2);
    m.compose(new THREE.Vector3(x, y - 0.1, z), q, s.set(sc, sc * (0.85 + r() * .4), sc));
    for (const part of parts) {
      const pg = part.index ? part.toNonIndexed() : part.clone();
      pg.deleteAttribute('uv');
      pg.applyMatrix4(m);
      fills.push(pg);
      const eg = new THREE.EdgesGeometry(part, 20);
      eg.applyMatrix4(m);
      edges.push(eg);
    }
    placed++;
  }
  const fillGeo = mergeGeometries(fills.map((g) => { g.deleteAttribute('normal'); return g; }));
  fillGeo.computeVertexNormals();
  const trees = new THREE.Mesh(fillGeo, new THREE.MeshLambertMaterial({ color: '#15171a', flatShading: true }));
  scene.add(trees);
  const edgeGeo = mergeGeometries(edges);
  scene.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .5 })));
}
