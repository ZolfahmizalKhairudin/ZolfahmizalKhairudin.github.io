// "Mini Zol": a small toon-shaded 3D bust built from primitives. Head, body and eyes follow the cursor.
import * as THREE from './vendor/three/three.module.min.js';

const box = document.querySelector('.avatar');
const canvas = box && box.querySelector('canvas');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

function noWebGL() { document.documentElement.classList.add('no-3d'); }

function start() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch { noWebGL(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, -0.6, 8.6);
  camera.lookAt(0, -0.72, 0);

  // three-step toon shading and a dark ink outline (inverted hull)
  const grad = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra });
  const ink = new THREE.MeshBasicMaterial({ color: 0x07080a, side: THREE.BackSide });
  const add = (parent, geo, mat, { p, s, r, line = 0 } = {}) => {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(...p); if (s) m.scale.set(...s); if (r) m.rotation.set(...r);
    if (line) { const o = new THREE.Mesh(geo, ink); o.scale.setScalar(1 + line); m.add(o); }
    parent.add(m); return m;
  };

  const C = { skin: 0xa8714f, hair: 0x15121a, blazer: 0x22493a, lapel: 0x2c5c49, shirt: 0x131419, frame: 0x101013, white: 0xf3f0ea, pupil: 0x1b1310, mouth: 0x6e3a2c, gold: 0xd8b25a, pin: 0xe8892f };

  // school tie: dark green with thin orange stripes edged in black, drawn as a seamless diagonal tile
  const tieTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#21473a'; g.fillRect(0, 0, 64, 64);
    const stripe = (off, w, col) => { g.strokeStyle = col; g.lineWidth = w; for (let k = -64; k <= 128; k += 32) { g.beginPath(); g.moveTo(k + off, 0); g.lineTo(k + off - 64, 64); g.stroke(); } };
    stripe(0, 3.5, '#ef8a2c'); stripe(4, 2, '#0c0c0f'); stripe(-4, 2, '#0c0c0f');
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.4, 2.4); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);

  // torso: a lathe bust, flattened front to back
  const prof = [[0, -1.45], [1.05, -1.45], [1.16, -0.95], [1.2, -0.5], [1.12, -0.22], [0.88, -0.06], [0.48, 0.05], [0.26, 0.08], [0, 0.08]].map(([x, y]) => new THREE.Vector2(x, y));
  add(body, new THREE.LatheGeometry(prof, 40), toon(C.blazer), { s: [1, 1, 0.6], line: 0.025 });

  const front = (shape, mat, z, depth = 0.02) => {
    const m = add(body, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), mat, { p: [0, 0, z], r: [-0.3, 0, 0] });
    return m;
  };
  const shp = (pts) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach((q) => s.lineTo(...q)); s.closePath(); return s; };
  front(shp([[-0.3, 0.04], [0.3, 0.04], [0, -0.9]]), toon(C.shirt), 0.6);                                         // shirt V
  front(shp([[-0.085, -0.08], [0.085, -0.08], [0.16, -0.72], [0, -0.86], [-0.16, -0.72]]), toon(0xffffff, { map: tieTex }), 0.625);   // tie blade
  front(shp([[-0.11, 0.05], [0.11, 0.05], [0.075, -0.11], [-0.075, -0.11]]), toon(0xffffff, { map: tieTex }), 0.64, 0.05);           // knot
  add(body, new THREE.BoxGeometry(0.26, 0.035, 0.03), toon(C.gold), { p: [0, -0.5, 0.82], r: [-0.3, 0, 0] });                         // tie clip
  front(shp([[-0.3, 0.04], [-0.04, -0.92], [-0.5, -0.62], [-0.66, -0.06]]), toon(C.lapel), 0.645);                 // lapels
  front(shp([[0.3, 0.04], [0.04, -0.92], [0.5, -0.62], [0.66, -0.06]]), toon(C.lapel), 0.645);
  add(body, new THREE.OctahedronGeometry(0.06), toon(C.pin), { p: [-0.42, -0.3, 0.74], s: [1.3, 1, 0.5] });      // lapel pin
  add(body, new THREE.SphereGeometry(0.045, 12, 8), toon(C.gold), { p: [0, -1.12, 0.71] });                       // button
  add(body, new THREE.CylinderGeometry(0.29, 0.31, 0.16, 24), toon(C.shirt), { p: [0, 0.12, 0], line: 0.03 });   // collar
  add(body, new THREE.CylinderGeometry(0.21, 0.23, 0.42, 20), toon(C.skin), { p: [0, 0.28, 0] });                // neck

  // head on a pivot at the top of the neck
  const pivot = new THREE.Group(); pivot.position.set(0, 0.38, 0); body.add(pivot);
  const head = new THREE.Group(); head.position.set(0, 0.62, 0); pivot.add(head);
  add(head, new THREE.SphereGeometry(0.62, 40, 28), toon(C.skin), { s: [0.95, 1.08, 0.95], line: 0.03 });
  for (const sx of [-1, 1]) add(head, new THREE.SphereGeometry(0.13, 16, 12), toon(C.skin), { p: [sx * 0.58, 0, -0.02], s: [0.55, 1, 0.8], line: 0.08 });

  // hair: a cap tipped back, a wavy fringe and side volume
  const hairM = toon(C.hair);
  add(head, new THREE.SphereGeometry(0.67, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM, { p: [0, 0.07, -0.04], s: [0.98, 1.12, 1.02], r: [-0.42, 0, 0], line: 0.03 });
  [[-0.4, 0.43, 0.34, 0.5], [-0.16, 0.5, 0.42, 0.2], [0.1, 0.5, 0.43, -0.2], [0.34, 0.44, 0.36, -0.5]].forEach(([x, y, z, rz]) =>
    add(head, new THREE.SphereGeometry(0.2, 18, 12), hairM, { p: [x, y, z], s: [1.15, 0.62, 0.85], r: [0.3, 0, rz], line: 0.05 }));
  [[-0.22, 0.66, 0.05, 0.4], [0.05, 0.72, 0.0, -0.1], [0.3, 0.64, -0.02, -0.5], [-0.05, 0.62, -0.3, 0.2], [0.42, 0.5, 0.18, -0.7], [-0.46, 0.52, 0.16, 0.7]].forEach(([x, y, z, rz]) =>
    add(head, new THREE.SphereGeometry(0.19, 16, 10), hairM, { p: [x, y, z], s: [1.1, 0.7, 1], r: [0, 0, rz], line: 0.05 }));   // messy top
  for (const sx of [-1, 1]) add(head, new THREE.SphereGeometry(0.25, 18, 12), hairM, { p: [sx * 0.5, 0.26, -0.08], s: [0.6, 1, 1.05], line: 0.05 });

  // face
  for (const sx of [-1, 1]) add(head, new THREE.BoxGeometry(0.2, 0.045, 0.05), toon(C.hair), { p: [sx * 0.22, 0.27, 0.55], r: [0, 0, sx * -0.12] });
  const eyes = new THREE.Group(); head.add(eyes);
  const pupils = [];
  for (const sx of [-1, 1]) {
    add(eyes, new THREE.SphereGeometry(0.085, 18, 12), toon(C.white), { p: [sx * 0.205, 0.08, 0.53], s: [1.2, 1, 0.5] });
    pupils.push(add(eyes, new THREE.SphereGeometry(0.048, 14, 10), new THREE.MeshBasicMaterial({ color: C.pupil }), { p: [sx * 0.205, 0.075, 0.575] }));
  }
  const frameM = toon(C.frame);
  // thick, squarish frames with rounded corners, angled slightly to wrap the face
  const rr = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
  const rim = rr(0.38, 0.27, 0.07); rim.holes.push(rr(0.31, 0.2, 0.045));
  const rimGeo = new THREE.ExtrudeGeometry(rim, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2, curveSegments: 10 });
  rimGeo.translate(0, 0, -0.0175);
  for (const sx of [-1, 1]) {
    add(head, rimGeo, frameM, { p: [sx * 0.205, 0.09, 0.6], r: [0, sx * 0.14, 0] });
    add(head, new THREE.BoxGeometry(0.03, 0.03, 0.5), frameM, { p: [sx * 0.43, 0.13, 0.34], r: [0, sx * -0.18, 0] });
  }
  add(head, new THREE.BoxGeometry(0.07, 0.03, 0.03), frameM, { p: [0, 0.15, 0.62] });   // bridge
  add(head, new THREE.SphereGeometry(0.075, 16, 12), toon(C.skin), { p: [0, -0.07, 0.6], s: [0.8, 1, 1] });
  add(head, new THREE.TorusGeometry(0.1, 0.018, 6, 16, Math.PI), toon(C.mouth), { p: [0, -0.24, 0.55], s: [1, 0.35, 1], r: [0, 0, Math.PI] });

  // light: soft fill, a white key, and the page's aqua and blue as rim lights
  scene.add(new THREE.HemisphereLight(0xe6eeff, 0x0a0b0e, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 4, 5); scene.add(key);
  const rimA = new THREE.DirectionalLight(0x7ce8d8, 3); rimA.position.set(-4, 2, -4); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0x4fb3ff, 2); rimB.position.set(4, 1, -3); scene.add(rimB);

  root.position.y = -0.95;
  const baseY = root.position.y;

  // sizing
  const size = () => {
    const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.z = w / h < 0.85 ? 10.4 : 8.6;   // whole bust in view; pull back on tall, narrow boxes so the shoulders fit
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(() => { size(); if (still) renderer.render(scene, camera); }).observe(box);
  size();

  if (still) { pivot.rotation.set(0.04, -0.25, 0); body.rotation.y = -0.08; renderer.render(scene, camera); return; }

  // input: look at the pointer; wander when idle
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  let lastMove = -1e4;
  const hint = document.querySelector('.avatar-hint');
  addEventListener('pointermove', (e) => {
    const r = box.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.32;
    look.tx = Math.max(-1, Math.min(1, (e.clientX - cx) / (innerWidth / 2)));
    look.ty = Math.max(-1, Math.min(1, (e.clientY - cy) / (innerHeight / 2)));
    lastMove = performance.now();
    if (hint && !hint.classList.contains('gone')) hint.classList.add('gone');
  }, { passive: true });

  // click: a happy hop
  let hopV = 0, hopY = 0;
  box.addEventListener('pointerdown', () => { if (hopY <= 0.001) hopV = 0.06; });

  let visible = true, running = false, intro = 0, nextBlink = 2, blinkT = -1;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !running) requestAnimationFrame(loop); }).observe(box);
  const clock = new THREE.Clock();

  function loop() {
    if (!visible) { running = false; return; }
    running = true;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;

    if (performance.now() - lastMove > 4000) { look.tx = Math.sin(t * 0.5) * 0.45; look.ty = Math.sin(t * 0.37) * 0.15 - 0.05; }
    const k = 1 - Math.pow(0.0015, dt);          // frame-rate independent easing
    look.x += (look.tx - look.x) * k; look.y += (look.ty - look.y) * k;

    pivot.rotation.y = look.x * 0.7; pivot.rotation.x = look.y * 0.35; pivot.rotation.z = -look.x * 0.06;
    body.rotation.y = look.x * 0.22;
    pupils.forEach((p, i) => { p.position.x = (i ? 0.205 : -0.205) + look.x * 0.03; p.position.y = 0.075 - look.y * 0.022; });

    // blink
    if (t > nextBlink && blinkT < 0) blinkT = 0;
    if (blinkT >= 0) { blinkT += dt; const b = Math.sin(Math.min(blinkT / 0.16, 1) * Math.PI); eyes.scale.y = 1 - b * 0.9; if (blinkT > 0.16) { blinkT = -1; eyes.scale.y = 1; nextBlink = t + 2.5 + Math.random() * 3; } }

    // hop, breathing and the intro pop
    hopV -= 0.004; hopY = Math.max(0, hopY + hopV); if (hopY === 0) hopV = 0;
    intro = Math.min(1, intro + dt * 1.4);
    const e = 1 + 2.2 * Math.pow(intro - 1, 3) + 1.2 * Math.pow(intro - 1, 2);   // back-out overshoot
    root.scale.setScalar(0.6 + 0.4 * e);
    root.position.y = baseY + hopY + Math.sin(t * 1.6) * 0.025;
    body.scale.y = 1 + Math.sin(t * 1.6) * 0.006;

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

if (canvas) {
  const test = document.createElement('canvas');
  if (!test.getContext('webgl2')) noWebGL(); else start();   // three.js r170 needs WebGL2
}
