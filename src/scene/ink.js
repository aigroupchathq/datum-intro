import * as THREE from 'three';

/* The look: low-poly forms, drawn over in ink.
   - Fills are flat-shaded and dark, like soft graphite on black card.
   - Every edge is re-drawn twice in warm ink, slightly offset, like a pen sketch.
   - The ground carries survey contour lines and hatching in its shadows.
     (A "datum" is the reference level surveyors measure height from.) */

export const INK = new THREE.Color('#E9E3D3');
export const CRIMSON = new THREE.Color('#C8102E');
export const BG = new THREE.Color('#050505');

export const shared = {
  uCarPos: { value: new THREE.Vector3() },
  uCarDir: { value: new THREE.Vector3(0, 0, 1) },
  uBeam: { value: 0 },
  uFogNear: { value: 50 },
  uFogFar: { value: 120 },
  uTime: { value: 0 },
};

/* Fake headlights + fog, shared by the custom ground and road shaders. */
const common = /* glsl */`
  uniform vec3 uCarPos; uniform vec3 uCarDir; uniform float uBeam;
  uniform float uFogNear; uniform float uFogFar;
  varying vec3 vW; varying float vDepth;
  float beam(vec3 w){
    vec2 d = w.xz - uCarPos.xz; float dist = length(d);
    float ang = dot(d / max(dist, 1e-3), normalize(uCarDir.xz));
    return uBeam * smoothstep(.80, .97, ang) * smoothstep(26., 3., dist) * smoothstep(.8, 2.4, dist)
         + uBeam * .35 * smoothstep(5., 0., dist);
  }
  float lineAA(float v, float w){ float fw = fwidth(v); if (fw < 1e-4) return 0.; float f = abs(fract(v - .5) - .5) / fw; return 1. - clamp(f / w, 0., 1.); }
  vec3 fogMix(vec3 c){ return mix(c, vec3(.0196), smoothstep(uFogNear, uFogFar, vDepth)); }
`;
const vert = /* glsl */`
  varying vec3 vW; varying float vDepth;
  #ifdef USE_U
  attribute float u; varying float vU;
  #endif
  void main(){
    vec4 w = modelMatrix * vec4(position, 1.);
    vW = w.xyz;
    #ifdef USE_U
    vU = u;
    #endif
    vec4 mv = viewMatrix * w; vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export function groundMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: vert,
    fragmentShader: /* glsl */`
      ${common}
      void main(){
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        if (n.y < 0.) n = -n;
        float lit = clamp(dot(n, normalize(vec3(-.45, .8, -.35))), 0., 1.);
        vec3 base = mix(vec3(.035,.036,.042), vec3(.115,.112,.118), lit);
        // survey contours every 1.2 m, a heavier "index" line every 6 m
        float c = lineAA(vW.y / 1.2, 1.0) * .22 + lineAA(vW.y / 6.0, 1.2) * .22;
        // hatching only in shadow
        float dark = 1. - lit;
        float h1 = lineAA((vW.x + vW.z) * .9, .9) * smoothstep(.42, .62, dark);
        float h2 = lineAA((vW.x - vW.z) * .9, .9) * smoothstep(.62, .8, dark);
        vec3 ink = vec3(.913,.89,.827);
        vec3 col = base + ink * (c + (h1 + h2) * .10);
        col += vec3(1., .86, .62) * beam(vW) * .22;
        gl_FragColor = vec4(fogMix(col), 1.);
      }`,
  });
}

export function roadMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: vert,
    fragmentShader: /* glsl */`
      ${common}
      void main(){
        vec3 col = vec3(.10,.10,.11);
        // faint aggregate speckle
        float s = fract(sin(dot(floor(vW.xz * 6.), vec2(12.9898, 78.233))) * 43758.5);
        col += (s - .5) * .025;
        col += vec3(1., .88, .66) * beam(vW) * .45;
        gl_FragColor = vec4(fogMix(col), 1.);
      }`,
  });
}

/* The centre line. Ahead of the car: pale ink dashes. Behind it: a solid crimson life line,
   drawn as you travel, like the record keeping every mile. */
export const lifeLine = { uProgress: { value: 0 } };
export function centreLineMaterial() {
  return new THREE.ShaderMaterial({
    defines: { USE_U: 1 },
    uniforms: { ...shared, ...lifeLine, uLen: { value: 1 } },
    vertexShader: vert,
    fragmentShader: /* glsl */`
      ${common}
      uniform float uProgress; uniform float uLen; varying float vU;
      void main(){
        float behind = step(vU, uProgress);
        float dash = step(.5, fract(vU * uLen / 3.2));
        if (behind < .5 && dash < .5) discard;
        vec3 ink = vec3(.913,.89,.827) * .75 + beam(vW) * .3;
        vec3 col = mix(ink, vec3(.85,.07,.18), behind);
        gl_FragColor = vec4(fogMix(col), 1.);
      }`,
  });
}

/* Low-poly fill. */
export function fill(color = '#141417', opts = {}) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });
}

/* Ink line work: edges drawn twice with a tiny offset, like a quick pen sketch. */
const inkMatA = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .85 });
const inkMatB = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .32 });
const redMat = new THREE.LineBasicMaterial({ color: CRIMSON });
export function inkLines(geometry, { angle = 28, red = false, jitter = 0.05 } = {}) {
  const g = new THREE.EdgesGeometry(geometry, angle);
  const group = new THREE.Group();
  const a = new THREE.LineSegments(g, red ? redMat : inkMatA);
  group.add(a);
  if (!red) {
    const b = new THREE.LineSegments(g, inkMatB);
    b.position.set(jitter, jitter * 0.6, -jitter * 0.8);
    b.scale.setScalar(1.012);
    group.add(b);
  }
  return group;
}

/* A low-poly solid, filled and inked. */
export function solid(geometry, color, opts = {}) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geometry, opts.material || fill(color));
  g.add(m);
  if (opts.ink !== false) g.add(inkLines(geometry, opts));
  g.userData.mesh = m;
  return g;
}

/* Hand-lettered labels (canvas textures). The camera looks down at a fixed tilt,
   so "upright" signs are tilted to face it, and "painted" text lies flat on the road. */
export const CAM_TILT = { value: 1.08 };
export function label(text, {
  font = '600 64px Archivo, sans-serif', color = '#E9E3D3', bg = null, border = null,
  width = 4, padX = 28, height = null, painted = false,
} = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = font;
  const lines = String(text).split('\n');
  const m = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const lh = parseInt(font.match(/(\d+)px/)[1], 10) * 1.15;
  c.width = Math.ceil(m + padX * 2);
  c.height = Math.ceil(lh * lines.length + padX * 1.1);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 6; ctx.strokeRect(5, 5, c.width - 10, c.height - 10); }
  ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, c.width / 2, padX * .55 + lh * (i + .5)));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const h = height ?? width * c.height / c.width;
  const w = height ? height * c.width / c.height : width;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: !painted, fog: true })
  );
  if (painted) { mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 2; }
  else mesh.rotation.x = -CAM_TILT.value;
  mesh.userData.size = { w, h };
  return mesh;
}
