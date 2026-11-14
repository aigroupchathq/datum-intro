import * as THREE from 'three';
import { fill, inkLines, CRIMSON } from './ink.js';

/* Loads a modelled car (GLB) and dresses it in the drive's ink style.
   Only fetched when a model is configured, so the coded coupé costs nothing extra.

   What the GLB should be (see README, "Swapping in a modelled car"):
     - plain glTF binary, or meshopt-compressed (gltfpack -cc). Not Draco.
     - any size and position: it is scaled to LENGTH metres long, centred, wheels on y = 0
     - nose towards +Z (glTF's usual "front"); otherwise pass yaw in degrees
     - wheel nodes named with "wheel" (Wheel_FL, wheel.rear.left...) so they can turn;
       a steering wheel is ignored
     - glass named with "glass" or "window", lamps with "light" or "lamp" (optional)
     - a node or material named with "noink" skips the ink outline (dense interiors etc.) */

const LENGTH = 4.4;

export async function loadCarModel(url, { yaw = 0, inkAngle = 30 } = {}) {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;

  // orient, then normalise: LENGTH long, centred on x/z, sitting on y = 0
  const root = new THREE.Group();
  model.rotation.y = THREE.MathUtils.degToRad(yaw);
  root.add(model);
  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(LENGTH / Math.max(size.z, 1e-6));
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
  root.updateMatrixWorld(true);

  // the ink look: flat-shaded fills from the model's own colours, inked edges
  const wheelNodes = [];
  model.traverse((o) => {
    const name = `${o.name} ${o.material?.name || ''}`.toLowerCase();
    const own = o.name.toLowerCase();
    if (/wheel/.test(own) && !/steer/.test(own) && !wheelNodes.some((w) => isAncestor(w, o))) wheelNodes.push(o);
    if (!o.isMesh) return;
    const src = Array.isArray(o.material) ? o.material[0] : o.material;
    const base = src?.color ? src.color.clone() : CRIMSON.clone();
    if (/glass|window/.test(name)) o.material = fill('#0b0c10');
    else if (/light|lamp/.test(name)) o.material = new THREE.MeshBasicMaterial({ color: base.getHSL({}).l < 0.4 ? '#ff2a3d' : '#fff4dc' });
    else o.material = fill(base.multiplyScalar(0.82));
    o.castShadow = o.receiveShadow = false;
    if (!/noink/.test(name) && !hasNoInkAncestor(o)) o.add(inkLines(o.geometry, { angle: inkAngle }));
  });

  return { root, wheelNodes };
}

function isAncestor(a, o) { for (let p = o.parent; p; p = p.parent) if (p === a) return true; return false; }
function hasNoInkAncestor(o) { for (let p = o.parent; p; p = p.parent) if (/noink/i.test(p.name)) return true; return false; }
