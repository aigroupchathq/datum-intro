import * as THREE from 'three';
import { frameAt, addFlatStrip, ROAD_HALF } from './path.js';
import { solid, fill, inkLines, label, roadMaterial, INK, CRIMSON } from './ink.js';

/* The stops along the road. Each is built in the road's local frame at its point,
   on the side of the road away from the card, so the card never hides it. */

const f = {};
function sideSign(r, screenSide) {
  // screenSide: +1 = right of screen (+X), -1 = left
  const s = Math.sign(r.x) || 1;
  return s * screenSide;
}
/** A point beside the road. along: metres along the tangent; out: metres from the centre line. */
function beside(u, screen, out, along = 0) {
  frameAt(u, f);
  const s = sideSign(f.right, screen);
  const p = f.pos.clone().addScaledVector(f.right, s * out).addScaledVector(f.flat, along);
  const yaw = Math.atan2(f.flat.x, f.flat.z);
  return { p, yaw, s, right: f.right.clone().multiplyScalar(s), flat: f.flat.clone(), y: f.pos.y };
}

function pad(group, a, w, len, y) {
  // a flat apron beside the road, registered so the terrain sits under it
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), roadMaterial());
  m.rotation.x = -Math.PI / 2;
  m.position.copy(a.p).setY(y + 0.015);
  m.rotation.z = a.yaw;
  m.renderOrder = 0;
  group.add(m);
  const edge = inkLines(new THREE.PlaneGeometry(w, len), { angle: 1 });
  edge.rotation.copy(m.rotation); edge.position.copy(m.position).y += 0.01;
  group.add(edge);
  const half = Math.min(w, len) / 2;
  const dir = new THREE.Vector3(Math.sin(a.yaw), 0, Math.cos(a.yaw));
  addFlatStrip(a.p.clone().addScaledVector(dir, -(len / 2 - half)), a.p.clone().addScaledVector(dir, len / 2 - half), half + 0.4, y);
  // join the apron to the road
  addFlatStrip(a.p.clone().addScaledVector(a.right, -a.right.length() * 0), a.p.clone().addScaledVector(a.right, -(w / 2 + 1.5)), half * 0.8, y);
}

function post(h = 2.2, r = 0.07) {
  const g = new THREE.CylinderGeometry(r, r, h, 5);
  g.translate(0, h / 2, 0);
  return solid(g, '#16161a');
}

export function buildProps(scene, stops) {
  const root = new THREE.Group();
  scene.add(root);
  const S = Object.fromEntries(stops.map((s) => [s.id, s]));
  const api = { dial: null, anchors: {} };
  const anchor = (id, p) => { api.anchors[id] = p.clone(); };

  /* 0 · The garage: the car waits inside, door up, a drawing more than a building */
  {
    frameAt(0, f);
    const g = new THREE.Group();
    const at = f.pos.clone().addScaledVector(f.flat, -0.6);
    g.position.copy(at); g.rotation.y = Math.atan2(f.flat.x, f.flat.z);
    const wallGeo = new THREE.BoxGeometry(0.25, 3.2, 8);
    for (const x of [-3.4, 3.4]) { const w = solid(wallGeo, '#121215'); w.position.set(x, 1.6, -1); g.add(w); }
    const back = solid(new THREE.BoxGeometry(7, 3.2, 0.25), '#121215'); back.position.set(0, 1.6, -5); g.add(back);
    // roof drawn only in ink, so we can see in
    const roof = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-3.5, 3.2, 3), new THREE.Vector3(0, 4.6, 3), new THREE.Vector3(3.5, 3.2, 3),
    ]);
    for (const z of [3, -5]) {
      const l = new THREE.Line(roof, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .7 }));
      l.position.z = z - 3; g.add(l);
    }
    const ridge = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 4.6, 0), new THREE.Vector3(0, 4.6, -8)]);
    g.add(new THREE.Line(ridge, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .5 })));
    const sign = label('DATUM ATELIER', { font: '700 80px Archivo, sans-serif', width: 5.2 });
    sign.position.set(0, 4.2, 0.4); g.add(sign);
    const floor = label('No. 1 · 1991 COUPÉ', { font: '500 56px "IBM Plex Mono", monospace', width: 3.8, painted: true, color: 'rgba(233,227,211,.55)' });
    floor.position.set(0, 0.03, -3.6); g.add(floor);
    root.add(g);
    anchor('garage', at);
    addFlatStrip(at.clone().addScaledVector(f.flat, -5), at.clone(), 3.6, f.pos.y);
  }

  /* 1 · The record: mile posts for each entry, then the ramp where Entry 14 was signed */
  {
    const s = S.record, scr = -s.screen;
    const entries = [['12.4.96', 'OIL + FILTER'], ['3.3.99', 'CLUTCH · LE MANS'], ['11.03', 'BRAKES'], ['?', 'RECEIPT IN GLOVEBOX?']];
    entries.forEach(([d, w], i) => {
      const a = beside(s.t - 0.105 + i * 0.026, scr, ROAD_HALF + 1.3);
      const p = post(1.3, 0.12); p.position.copy(a.p); root.add(p);
      const l = label(`${d}\n${w}`, { font: '500 54px Caveat, cursive', width: 3.2, color: i === 3 ? 'rgba(233,227,211,.5)' : '#E9E3D3' });
      l.position.copy(a.p).add(new THREE.Vector3(a.right.x * 1.9, 1.9, a.right.z * 1.9));
      root.add(l);
    });
    // the ramp: a two-post lift on a workshop apron
    const a = beside(s.t, scr, ROAD_HALF + 5.2);
    anchor('record', a.p);
    pad(root, a, 7, 9, a.y);
    const lift = new THREE.Group();
    lift.position.copy(a.p).setY(a.y); lift.rotation.y = a.yaw;
    for (const x of [-1.6, 1.6]) {
      const col = solid(new THREE.BoxGeometry(0.35, 3.4, 0.35), '#18181c'); col.position.set(x, 1.7, 0); lift.add(col);
      for (const z of [-0.9, 0.9]) {
        const arm = solid(new THREE.BoxGeometry(1.5, 0.08, 0.12), null, { material: fill(CRIMSON.clone().multiplyScalar(.6)) });
        arm.position.set(x * 0.55, 0.9, z); arm.rotation.y = z * 0.4 * Math.sign(x); lift.add(arm);
      }
    }
    const bar = solid(new THREE.BoxGeometry(3.55, 0.25, 0.3), '#18181c'); bar.position.set(0, 3.45, 0); lift.add(bar);
    root.add(lift);
    const stamp = label('ENTRY 14\nSIGNED AT THE RAMP', { font: '600 52px "IBM Plex Mono", monospace', width: 3.4, color: '#F0566A', border: 'rgba(240,86,106,.8)' });
    stamp.position.copy(a.p).add(new THREE.Vector3(0, 5.1, 0)); root.add(stamp);
    const paint = label('64,210', { font: '700 120px "IBM Plex Mono", monospace', width: 3.6, painted: true, color: 'rgba(233,227,211,.75)' });
    paint.position.copy(a.p).setY(a.y + 0.04).addScaledVector(a.flat, 3.2); root.add(paint);
  }

  /* 2 · The junction: four ways, four reasons to keep the record */
  {
    const s = S.junction;
    frameAt(s.t, f);
    const c = f.pos.clone();
    for (const dir of [-1, 1]) {
      const len = 34;
      const end = c.clone().addScaledVector(f.right, dir * len);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, len), roadMaterial());
      m.rotation.x = -Math.PI / 2; m.rotation.z = Math.atan2(f.right.x, f.right.z);
      m.position.copy(c).lerp(end, 0.5).setY(c.y + 0.012);
      root.add(m);
      addFlatStrip(c.clone(), end, 2.8, c.y);
      // dashed edges fading into the hills
      for (const e of [-2.6, 2.6]) {
        const pts = [];
        for (let i = 0; i < 18; i++) pts.push(c.clone().addScaledVector(f.right, dir * (ROAD_HALF + 1 + i * 1.8)).addScaledVector(f.flat, e).setY(c.y + 0.05));
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        const ln = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .45 }));
        root.add(ln);
      }
    }
    const a = beside(s.t, -s.screen, ROAD_HALF + 1.4, 3.6);
    anchor('junction', a.p.clone().lerp(c, 0.5));
    const pole = post(4.4, 0.1); pole.position.copy(a.p); root.add(pole);
    const names = ['KEEPERS', 'WORKSHOPS', 'THE NEXT KEEPER', 'CLUBS & PRESS'];
    names.forEach((n, i) => {
      const ang = [0.9, -0.7, 2.5, -2.3][i];
      const arm = new THREE.Group();
      arm.position.copy(a.p).setY(a.y + 3.9 - i * 0.55);
      arm.rotation.y = ang;
      const b = solid(new THREE.BoxGeometry(2.2, 0.36, 0.06), i === 0 ? null : '#1b1b20', i === 0 ? { material: fill(CRIMSON.clone().multiplyScalar(.7)) } : {});
      b.position.x = 1.1; arm.add(b);
      root.add(arm);
      const l = label(n, { font: '600 60px Archivo, sans-serif', width: 2.6 + n.length * 0.05 });
      const tip = new THREE.Vector3(Math.cos(ang) * 2.4, 0, -Math.sin(ang) * 2.4);
      l.position.copy(arm.position).add(tip).add(new THREE.Vector3(0, 0.5, 0));
      root.add(l);
    });
  }

  /* 3 · Roadworks: the road's own surface says where each part of Datum stands */
  {
    const s = S.roadworks;
    const marks = [[0.012, 'LIVE', '#F0566A'], [0.026, 'IN DEVELOPMENT', '#E9E3D3'], [0.04, 'PLANNED', 'rgba(233,227,211,.55)']];
    for (const [du, w, col] of marks) {
      frameAt(s.t + du, f);
      const l = label(w, { font: '800 90px Archivo, sans-serif', width: Math.min(5.4, 1.2 + w.length * 0.42), painted: true, color: col });
      l.position.copy(f.pos).setY(f.pos.y + 0.05);
      l.rotation.z = Math.atan2(f.flat.x, f.flat.z) * 0; // keep upright on screen
      root.add(l);
    }
    // cones through the in-development stretch
    const coneGeo = new THREE.ConeGeometry(0.28, 0.75, 6); coneGeo.translate(0, 0.375, 0);
    for (let i = 0; i < 9; i++) {
      for (const side of [-1, 1]) {
        const a = beside(s.t + 0.019 + i * 0.0016, side, ROAD_HALF + 0.35);
        const c = solid(coneGeo, null, { material: fill('#d5531f') }); c.position.copy(a.p); root.add(c);
      }
    }
    // a barrier and a surveyor's level for the planned stretch: a datum, measured
    const a = beside(s.t + 0.04, -s.screen, ROAD_HALF + 2.6);
    anchor('roadworks', frameAt(s.t + 0.024, {}).pos.clone().lerp(a.p, 0.3));
    const tri = new THREE.Group(); tri.position.copy(a.p);
    for (let i = 0; i < 3; i++) {
      const leg = solid(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 4), '#222');
      const ang = (i / 3) * Math.PI * 2;
      leg.position.set(Math.cos(ang) * 0.35, 0.85, Math.sin(ang) * 0.35);
      leg.rotation.set(Math.sin(ang) * 0.35, 0, -Math.cos(ang) * 0.35);
      tri.add(leg);
    }
    const head = solid(new THREE.BoxGeometry(0.5, 0.3, 0.3), null, { material: fill('#c9a227') }); head.position.y = 1.85; tri.add(head);
    root.add(tri);
    for (let i = 0; i < 6; i++) {
      const b = beside(s.t + 0.034 + i * 0.003, -s.screen, ROAD_HALF + 0.6);
      const stake = solid(new THREE.BoxGeometry(0.08, 0.7, 0.08), '#E9E3D3'); stake.position.copy(b.p).setY(b.y + 0.35); root.add(stake);
    }
    const bar = beside(s.t + 0.006, -s.screen, ROAD_HALF + 2.4);
    const barrier = solid(new THREE.BoxGeometry(2.8, 0.45, 0.12), null, { material: fill('#e8e3d4') });
    barrier.position.copy(bar.p).setY(bar.y + 0.8); barrier.rotation.y = bar.yaw + Math.PI / 2; root.add(barrier);
    for (const x of [-1.2, 1.2]) {
      const l = post(0.8, 0.05); l.position.copy(bar.p).addScaledVector(bar.flat, x); root.add(l);
    }
  }

  /* 4 · The lay-by: a safe place to stop, with the three promises posted */
  {
    const s = S.layby;
    const a = beside(s.t, -s.screen, ROAD_HALF + 3.4);
    anchor('layby', a.p);
    pad(root, a, 4.4, 16, a.y);
    const names = ['EXPORT\nEVERYTHING', 'A COPY ON\nYOUR DEVICE', 'FAIR\nNOTICE'];
    names.forEach((n, i) => {
      const b = beside(s.t - 0.016 + i * 0.016, -s.screen, ROAD_HALF + 6.8);
      const p = post(1.7, 0.08); p.position.copy(b.p); root.add(p);
      const l = label(n, { font: '600 52px Archivo, sans-serif', width: 2.6, bg: 'rgba(10,10,12,.85)', border: 'rgba(233,227,211,.6)' });
      l.position.copy(b.p).setY(b.y + 2.4); root.add(l);
    });
    const exit = label('SAFE EXIT', { font: '700 90px Archivo, sans-serif', width: 3.6, painted: true, color: 'rgba(233,227,211,.6)' });
    exit.position.copy(a.p).setY(a.y + 0.05); root.add(exit);
  }

  /* 5 · Hold REV: a rev dial painted on the tarmac; its needle follows your thumb */
  {
    const s = S.rev;
    const a = beside(s.t, -s.screen, ROAD_HALF + 6.5);
    anchor('rev', a.p);
    pad(root, a, 10.5, 10.5, a.y);
    const g = new THREE.Group(); g.position.copy(a.p).setY(a.y + 0.05);
    const R = 4;
    const pts = [];
    const a0 = Math.PI * 1.25, sweep = Math.PI * 1.5;
    for (let i = 0; i <= 80; i++) { const t = a0 - (i / 80) * sweep; pts.push(new THREE.Vector3(Math.cos(t) * R, 0, -Math.sin(t) * R)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: INK })));
    const ticks = [];
    for (let i = 0; i <= 80; i++) {
      const t = a0 - (i / 80) * sweep, major = i % 10 === 0, len = major ? 0.9 : 0.35;
      const c = Math.cos(t), sn = -Math.sin(t);
      ticks.push(new THREE.Vector3(c * R, 0, sn * R), new THREE.Vector3(c * (R - len), 0, sn * (R - len)));
      if (major) {
        const n = label(String(i / 10), { font: '600 80px "IBM Plex Mono", monospace', width: 0.7, painted: true, color: i >= 68 ? '#F0566A' : '#E9E3D3' });
        n.position.set(c * (R - 1.6), 0.01, sn * (R - 1.6)); g.add(n);
      }
    }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .8 })));
    // redline arc
    const red = [];
    for (let i = 68; i <= 80; i++) { const t = a0 - (i / 80) * sweep; red.push(new THREE.Vector3(Math.cos(t) * (R + 0.25), 0, -Math.sin(t) * (R + 0.25))); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(red), new THREE.LineBasicMaterial({ color: CRIMSON })));
    const needle = new THREE.Mesh(new THREE.PlaneGeometry(0.18, R - 0.4), new THREE.MeshBasicMaterial({ color: CRIMSON }));
    needle.geometry.translate(0, (R - 0.4) / 2, 0);
    needle.rotation.x = -Math.PI / 2;
    const pivot = new THREE.Group(); pivot.add(needle); pivot.position.y = 0.03; g.add(pivot);
    const hub = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), new THREE.MeshBasicMaterial({ color: '#E9E3D3' }));
    hub.rotation.x = -Math.PI / 2; hub.position.y = 0.04; g.add(hub);
    const word = label('REV', { font: '700 120px "IBM Plex Mono", monospace', width: 1.6, painted: true, color: 'rgba(233,227,211,.7)' });
    word.position.set(0, 0.01, 2.2); g.add(word);
    root.add(g);
    api.dial = { pivot, a0, sweep };
  }

  /* 6 · The atelier: where Datum is made */
  {
    const s = S.atelier;
    const a = beside(s.t, -s.screen, ROAD_HALF + 7);
    anchor('atelier', a.p);
    pad(root, a, 9, 12, a.y);
    const b = new THREE.Group(); b.position.copy(a.p).setY(a.y); b.rotation.y = a.yaw;
    const walls = solid(new THREE.BoxGeometry(5.6, 3, 6.4), '#141418'); walls.position.y = 1.7; b.add(walls);
    const roofShape = new THREE.Shape([new THREE.Vector2(-3.1, 0), new THREE.Vector2(0, 1.5), new THREE.Vector2(3.1, 0)]);
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 6.9, bevelEnabled: false }); roofGeo.translate(0, 3, -3.45);
    b.add(solid(roofGeo, '#1d1d22'));
    // roller door faces the road
    const toRoad = -(a.right.x * Math.cos(a.yaw) - a.right.z * Math.sin(a.yaw));
    const doorX = (Math.sign(toRoad) || -1) * 2.82;
    const door = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 3.6), new THREE.MeshBasicMaterial({ color: INK }));
      l.position.set(doorX, 0.3 + i * 0.28, 0); door.add(l);
    }
    b.add(door);
    const lamp = new THREE.PointLight('#ffd9a0', 30, 16, 1.6); lamp.position.set(doorX * 1.3, 3.2, 0); b.add(lamp);
    root.add(b);
    const sign = label('ATELIER', { font: '700 90px Archivo, sans-serif', width: 3.6 });
    sign.position.copy(a.p).setY(a.y + 5.8); root.add(sign);
    const vd = label('VD', { font: '600 120px Caveat, cursive', width: 1.6, color: '#F0566A' });
    vd.position.copy(a.p).setY(a.y + 4.4).add(new THREE.Vector3(2.6, 0, 1.2)); root.add(vd);
  }

  /* 7 · The gate: the road ends at the invitation */
  {
    frameAt(1, f);
    const g = new THREE.Group();
    g.position.copy(f.pos).addScaledVector(f.flat, 7.5); g.rotation.y = Math.atan2(f.flat.x, f.flat.z);
    for (const x of [-4, 4]) { const p = solid(new THREE.BoxGeometry(0.9, 3.4, 0.9), '#16161a'); p.position.set(x, 1.7, 0); g.add(p); }
    const beam = solid(new THREE.BoxGeometry(9, 0.4, 0.5), null, { material: fill(CRIMSON.clone().multiplyScalar(.75)) }); beam.position.y = 3.6; g.add(beam);
    root.add(g);
    anchor('gate', g.position);
    const sign = label('INVITATIONS', { font: '700 90px Archivo, sans-serif', width: 5.2 });
    sign.position.copy(g.position).add(new THREE.Vector3(0, 5.4, 0)); root.add(sign);
    addFlatStrip(f.pos.clone(), f.pos.clone().addScaledVector(f.flat, 16), 5, f.pos.y);
  }

  return api;
}
