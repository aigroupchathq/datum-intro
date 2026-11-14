import * as THREE from 'three';
import { solid, fill, inkLines, CRIMSON } from './ink.js';

/* A stylised early-90s coupé, made from a single side profile.
   Forward is +Z. Roughly 4.4 m long, 1.8 m wide. Fully code-built.

   buildCar({ model, modelYaw }) can swap in a modelled GLB (see car-model.js): the coded
   coupé shows at once, the model loads in the background and replaces its body and wheels.
   Lights, glow, exhaust puffs and shadow stay, and the API is unchanged. If the model is
   missing or fails to load, the coded coupé simply stays. */

function extrudeProfile(points, depth, bevel = 0.06) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, steps: 1,
  });
  g.translate(0, 0, -depth / 2);
  g.rotateY(-Math.PI / 2); // profile x (forward) -> world +Z
  return g;
}

export function buildCar({ model = null, modelYaw = 0 } = {}) {
  const car = new THREE.Group();
  const body = new THREE.Group();
  car.add(body);
  const coded = new THREE.Group();   // the coded coupé's bodywork, replaced if a model loads
  body.add(coded);

  // Body: long bonnet, short deck, wedge nose.
  const bodyGeo = extrudeProfile([
    [-2.15, 0.34], [2.12, 0.34], [2.22, 0.56], [2.14, 0.72], [0.62, 0.86],
    [-1.55, 0.9], [-2.12, 0.86], [-2.22, 0.6],
  ], 1.7);
  coded.add(solid(bodyGeo, null, { material: fill(CRIMSON.clone().multiplyScalar(0.82)), angle: 20 }));

  // Glasshouse
  const cabinGeo = extrudeProfile([
    [0.62, 0.86], [-0.05, 1.32], [-1.0, 1.36], [-1.62, 0.9],
  ], 1.42, 0.04);
  coded.add(solid(cabinGeo, null, { material: fill('#0b0c10'), angle: 20 }));

  // Pillar stripe and a thin crimson waist line, inked
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.03, 3.9), new THREE.MeshBasicMaterial({ color: '#E9E3D3' }));
  stripe.position.set(0, 0.62, 0.02);
  coded.add(stripe);

  // Pop-up headlights (closed) and lamps
  const lampMat = new THREE.MeshBasicMaterial({ color: '#fff4dc' });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#ff2a3d' });
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.06), lampMat);
    hl.position.set(s * 0.58, 0.55, 2.27);
    coded.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.06), tailMat);
    tl.position.set(s * 0.56, 0.68, -2.27);
    coded.add(tl);
  }
  // Rear wing
  const wing = solid(new THREE.BoxGeometry(1.6, 0.05, 0.34), null, { material: fill('#1a1a1e') });
  wing.position.set(0, 1.04, -1.95);
  coded.add(wing);

  // Wheels: 8-sided, low-poly, with an inked rim
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  let wheels = [];
  for (const [x, z] of [[-0.86, 1.36], [0.86, 1.36], [-0.86, -1.32], [0.86, -1.32]]) {
    const w = solid(wheelGeo, null, { material: fill('#0a0a0b'), angle: 1 });
    w.position.set(x, 0.36, z);
    car.add(w);
    wheels.push({ node: w, r: 0.36 });
  }

  // Headlight beams: real lights for props and the car's own surroundings
  // (ground and road get a matching fake beam in their shaders)
  const beams = [];
  for (const s of [-1, 1]) {
    const sl = new THREE.SpotLight('#ffe6bf', 0, 30, 0.42, 0.6, 1.2);
    sl.position.set(s * 0.6, 0.6, 2.2);
    sl.target.position.set(s * 0.9, 0, 14);
    car.add(sl, sl.target);
    beams.push(sl);
  }
  // A soft glow cone on the ground in front, drawn as a flat additive plane
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, 'rgba(255,236,200,.55)'); grd.addColorStop(1, 'rgba(255,236,200,0)');
    g.fillStyle = grd; g.beginPath(); g.moveTo(26, 0); g.lineTo(38, 0); g.lineTo(64, 128); g.lineTo(0, 128); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(7, 16),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, 0.06, 2.2 + 8);
  glow.renderOrder = 3;
  car.add(glow);

  // Exhaust puffs for the REV interlude
  const puffs = [];
  const puffGeo = new THREE.IcosahedronGeometry(0.22, 0);
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Group();
    p.add(new THREE.LineSegments(new THREE.EdgesGeometry(puffGeo), new THREE.LineBasicMaterial({ color: '#E9E3D3', transparent: true, opacity: 0 })));
    p.visible = false;
    p.userData = { life: 0, v: new THREE.Vector3() };
    car.add(p);
    puffs.push(p);
  }

  // A contact shadow, so the car sits on the road
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 4.9),
    new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.55, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  shadow.renderOrder = 1;
  car.add(shadow);

  if (model) {
    import('./car-model.js')
      .then((m) => m.loadCarModel(model, { yaw: modelYaw }))
      .then(({ root, wheelNodes }) => {
        body.remove(coded);
        wheels.forEach((w) => car.remove(w.node));
        body.add(root);
        car.updateMatrixWorld(true);
        // each wheel turns about its own centre, and (like the coupé's) does not lean with the body
        wheels = wheelNodes.map((w) => {
          const box = new THREE.Box3().setFromObject(w);
          const pivot = new THREE.Group();
          car.worldToLocal(box.getCenter(pivot.position));
          car.add(pivot);
          pivot.updateMatrixWorld(true);
          pivot.attach(w);
          return { node: pivot, r: Math.max(0.2, (box.max.y - box.min.y) / 2) };
        });
        car.userData.model = model;
      })
      .catch((err) => console.warn(`Car model ${model} not used, keeping the coded coupé:`, err));
  }

  let puffClock = 0, puffIdx = 0;
  const api = {
    group: car,
    /** speed: m/s along the road; lean: radians; beam 0..1; rpm 0..1 */
    update(dt, { distance, lean, beam, rpm, time }) {
      for (const w of wheels) w.node.rotation.x = distance / w.r;
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, lean, Math.min(1, dt * 6));
      // idle shiver, stronger when revving
      body.position.y = Math.sin(time * 38) * (0.006 + rpm * 0.02);
      body.rotation.x = -rpm * 0.025;
      for (const b of beams) b.intensity = beam * 60;
      glow.material.opacity = beam * 0.9;
      lampMat.color.setScalar(0.6 + beam * 0.4);

      puffClock += dt * (rpm > 0.15 ? 10 + rpm * 20 : 0);
      while (puffClock > 1) {
        puffClock -= 1;
        const p = puffs[puffIdx++ % puffs.length];
        p.visible = true; p.userData.life = 1;
        p.position.set((Math.random() - .5) * .3 + .45, 0.4, -2.35);
        p.scale.setScalar(0.6);
        p.userData.v.set((Math.random() - .5) * .8, 0.5 + Math.random() * .4, -1.6 - rpm * 2);
      }
      for (const p of puffs) {
        if (!p.visible) continue;
        p.userData.life -= dt * 1.3;
        if (p.userData.life <= 0) { p.visible = false; continue; }
        p.position.addScaledVector(p.userData.v, dt);
        p.scale.multiplyScalar(1 + dt * 1.8);
        p.rotation.y += dt * 2;
        p.children[0].material.opacity = p.userData.life * 0.7;
      }
    },
  };
  return api;
}
