import * as THREE from 'https://unpkg.com/three@0.183.2/build/three.module.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.015);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.5, 8);
camera.lookAt(0, 1.2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
const root = document.getElementById('root') ?? document.body;
root.appendChild(renderer.domElement);

// --- Materials ---
const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a1f18, roughness: 0.7, metalness: 0.05 });
const sofaMat = new THREE.MeshStandardMaterial({ color: 0xc8c0b8, roughness: 0.85, metalness: 0.0 });
const sofaDarkMat = new THREE.MeshStandardMaterial({ color: 0x9a928a, roughness: 0.85, metalness: 0.0 });
const pillowMat = new THREE.MeshStandardMaterial({ color: 0xd5cfc8, roughness: 0.9, metalness: 0.0 });
const pillowDarkMat = new THREE.MeshStandardMaterial({ color: 0x7a7068, roughness: 0.9, metalness: 0.0 });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x111a11, roughness: 0.05, metalness: 0.1, transmission: 0.6, thickness: 0.5, transparent: true, opacity: 0.7 });
const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.8 });
const rugMat = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.95, metalness: 0.0 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a050, roughness: 0.25, metalness: 0.9 });
const crystalMat = new THREE.MeshPhysicalMaterial({ color: 0xf5e6b8, roughness: 0.1, metalness: 0.3, transmission: 0.4, thickness: 0.3, emissive: 0xf5d080, emissiveIntensity: 0.8 });
const greenMat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.9 });

// --- Floor ---
const floorGeo = new THREE.PlaneGeometry(20, 15);
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.name = 'floor';
scene.add(floor);

// --- Rug ---
const rugGeo = new THREE.BoxGeometry(7, 0.03, 4);
const rug = new THREE.Mesh(rugGeo, rugMat);
rug.position.set(0, 0.015, 1);
rug.receiveShadow = true;
rug.name = 'rug';
scene.add(rug);

// --- Sofa Builder ---
function createSofaSection(width, height, depth, x, y, z, mat, name) {
  const geo = new THREE.BoxGeometry(width, height, depth);
  geo.translate(0, height / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  return mesh;
}

const sofaGroup = new THREE.Group();
sofaGroup.name = 'sofaGroup';

// Base cushions (L-shape)
// Long section
sofaGroup.add(createSofaSection(5.5, 0.35, 1.4, 0, 0.15, 1.2, sofaMat, 'sofaBase1'));
// Short right extension
sofaGroup.add(createSofaSection(1.8, 0.35, 1.4, -1.85, 0.15, 1.2, sofaDarkMat, 'sofaBase2'));
// Extra right piece (chaise)
sofaGroup.add(createSofaSection(1.8, 0.35, 1.2, 2.65, 0.15, 1.3, sofaMat, 'sofaBase3'));

// Back rest
sofaGroup.add(createSofaSection(5.5, 0.55, 0.35, 0, 0.5, 0.35, sofaDarkMat, 'sofaBack1'));
sofaGroup.add(createSofaSection(1.8, 0.55, 0.35, -1.85, 0.5, 0.35, sofaDarkMat, 'sofaBack2'));

// Left armrest
sofaGroup.add(createSofaSection(0.2, 0.45, 1.4, 2.85, 0.5, 1.2, sofaDarkMat, 'sofaArmL'));

// Seat frame
sofaGroup.add(createSofaSection(7.5, 0.15, 1.8, 0.4, 0, 1.1, new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 0.8 }), 'sofaFrame'));

// Step/platform left
const stepGeo = new THREE.BoxGeometry(1.2, 0.15, 1.0);
const step = new THREE.Mesh(stepGeo, new THREE.MeshStandardMaterial({ color: 0xe0ddd6, roughness: 0.6, metalness: 0.0 }));
step.position.set(-3.3, 0.075, 1.5);
step.castShadow = true;
step.name = 'sofaStep';
sofaGroup.add(step);

// Pillows
function createPillow(x, y, z, sx, sy, sz, mat, rot, name) {
  const pGeo = new THREE.BoxGeometry(sx, sy, sz, 2, 2, 2);
  const positions = pGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const px = positions.getX(i);
    const py = positions.getY(i);
    const pz = positions.getZ(i);
    const dx = Math.abs(px) / (sx / 2);
    const dy = Math.abs(py) / (sy / 2);
    const dz = Math.abs(pz) / (sz / 2);
    const squeeze = 1 - 0.15 * (dx * dy + dy * dz + dx * dz);
    positions.setXYZ(i, px * squeeze, py * squeeze, pz * squeeze);
  }
  pGeo.computeVertexNormals();
  const pillow = new THREE.Mesh(pGeo, mat);
  pillow.position.set(x, y, z);
  if (rot) pillow.rotation.set(rot.x || 0, rot.y || 0, rot.z || 0);
  pillow.castShadow = true;
  pillow.name = name;
  return pillow;
}

sofaGroup.add(createPillow(-0.8, 0.85, 0.55, 0.55, 0.35, 0.15, pillowMat, { z: 0.1 }, 'pillow1'));
sofaGroup.add(createPillow(-0.1, 0.9, 0.55, 0.5, 0.3, 0.15, pillowDarkMat, { z: -0.15 }, 'pillow2'));
sofaGroup.add(createPillow(0.6, 0.82, 0.55, 0.55, 0.35, 0.15, pillowMat, { z: 0.05 }, 'pillow3'));
sofaGroup.add(createPillow(1.3, 0.88, 0.55, 0.45, 0.3, 0.12, pillowDarkMat, { z: -0.1, y: 0.1 }, 'pillow4'));
sofaGroup.add(createPillow(2.0, 0.78, 0.7, 0.5, 0.3, 0.15, pillowMat, { x: -0.2 }, 'pillow5'));

// Throw blanket draped
const blanketGeo = new THREE.PlaneGeometry(1.2, 0.8, 8, 8);
const blanketPos = blanketGeo.attributes.position;
for (let i = 0; i < blanketPos.count; i++) {
  const bx = blanketPos.getX(i);
  const by = blanketPos.getY(i);
  blanketPos.setZ(i, Math.sin(bx * 3) * 0.03 + Math.cos(by * 4) * 0.02);
}
blanketGeo.computeVertexNormals();
const blanket = new THREE.Mesh(blanketGeo, new THREE.MeshStandardMaterial({ color: 0x8a8278, roughness: 0.9, side: THREE.DoubleSide }));
blanket.position.set(1.5, 0.88, 0.55);
blanket.rotation.set(-0.3, 0.2, 0.1);
blanket.castShadow = true;
blanket.name = 'blanket';
sofaGroup.add(blanket);

scene.add(sofaGroup);

// --- Glass Wall ---
const wallGroup = new THREE.Group();
wallGroup.name = 'glassWall';
wallGroup.position.set(0, 0, -1);

// Back wall (dark)
const backWallGeo = new THREE.PlaneGeometry(14, 7);
const backWall = new THREE.Mesh(backWallGeo, new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.5 }));
backWall.position.set(0, 3.5, -0.15);
backWall.name = 'backWall';
wallGroup.add(backWall);

// Glass panes in grid
const paneW = 1.5;
const paneH = 1.4;
const cols = 9;
const rows = 4;
const gap = 0.08;

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const paneGeo = new THREE.PlaneGeometry(paneW, paneH);
    const px = (c - (cols - 1) / 2) * (paneW + gap);
    const py = 0.5 + r * (paneH + gap) + paneH / 2;
    const pane = new THREE.Mesh(paneGeo, glassMat);
    pane.position.set(px, py, 0);
    pane.name = `glassPane_${r}_${c}`;
    wallGroup.add(pane);

    // Vertical frame
    if (c < cols) {
      const vFrame = new THREE.Mesh(new THREE.BoxGeometry(gap, paneH + gap, 0.06), frameMat);
      vFrame.position.set(px - paneW / 2 - gap / 2, py, 0);
      vFrame.name = `vFrame_${r}_${c}`;
      wallGroup.add(vFrame);
    }
  }
  // Horizontal frame
  const hFrame = new THREE.Mesh(new THREE.BoxGeometry(cols * (paneW + gap), gap, 0.06), frameMat);
  hFrame.position.set(0, 0.5 + r * (paneH + gap), 0);
  hFrame.name = `hFrame_${r}`;
  wallGroup.add(hFrame);
}
// Top frame
const hFrameTop = new THREE.Mesh(new THREE.BoxGeometry(cols * (paneW + gap), gap, 0.06), frameMat);
hFrameTop.position.set(0, 0.5 + rows * (paneH + gap), 0);
hFrameTop.name = 'hFrameTop';
wallGroup.add(hFrameTop);

// Right side frames
for (let r = 0; r < rows; r++) {
  const px = ((cols - 1) - (cols - 1) / 2) * (paneW + gap) + paneW / 2 + gap / 2;
  const py = 0.5 + r * (paneH + gap) + paneH / 2;
  const vFrame = new THREE.Mesh(new THREE.BoxGeometry(gap, paneH + gap, 0.06), frameMat);
  vFrame.position.set(px, py, 0);
  vFrame.name = `vFrameR_${r}`;
  wallGroup.add(vFrame);
}

scene.add(wallGroup);

// --- Greenery behind glass ---
const foliageGroup = new THREE.Group();
foliageGroup.name = 'foliage';
for (let i = 0; i < 60; i++) {
  const s = 0.3 + Math.random() * 0.8;
  const bushGeo = new THREE.SphereGeometry(s, 6, 5);
  const bushMat2 = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.28 + Math.random() * 0.08, 0.4 + Math.random() * 0.3, 0.1 + Math.random() * 0.12),
    roughness: 0.95
  });
  const bush = new THREE.Mesh(bushGeo, bushMat2);
  bush.position.set(-6 + Math.random() * 12, 1 + Math.random() * 4, -2.5 - Math.random() * 3);
  bush.name = `bush_${i}`;
  foliageGroup.add(bush);
}
scene.add(foliageGroup);

// --- Ring Chandeliers ---
function createChandelier(radius, y, segments, name) {
  const group = new THREE.Group();
  group.name = name;

  // Main ring
  const ringGeo = new THREE.TorusGeometry(radius, 0.04, 12, 64);
  const ring = new THREE.Mesh(ringGeo, goldMat);
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  ring.name = `${name}_ring`;
  group.add(ring);

  // Inner ring
  const innerRingGeo = new THREE.TorusGeometry(radius - 0.06, 0.02, 8, 64);
  const innerRing = new THREE.Mesh(innerRingGeo, goldMat);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.name = `${name}_innerRing`;
  group.add(innerRing);

  // Crystal segments around the ring
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cx = Math.cos(angle) * radius;
    const cz = Math.sin(angle) * radius;

    const crystalGeo = new THREE.BoxGeometry(0.12, 0.08, 0.06);
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(cx, 0, cz);
    crystal.lookAt(0, 0, 0);
    crystal.rotateY(Math.PI / 2);
    crystal.name = `${name}_crystal_${i}`;
    group.add(crystal);
  }

  // Light
  const light = new THREE.PointLight(0xf5d080, 3, 8, 1.5);
  light.position.set(0, -0.1, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.bias = -0.002;
  light.name = `${name}_light`;
  group.add(light);

  // Warm glow below
  const glowLight = new THREE.PointLight(0xf5c860, 1.5, 5, 2);
  glowLight.position.set(0, -0.3, 0);
  glowLight.name = `${name}_glowLight`;
  group.add(glowLight);

  // Suspension wires
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  for (let w = 0; w < 3; w++) {
    const wa = (w / 3) * Math.PI * 2;
    const wireGeo = new THREE.CylinderGeometry(0.003, 0.003, 6 - y + 3.5);
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(Math.cos(wa) * radius * 0.5, (6 - y + 3.5) / 2, Math.sin(wa) * radius * 0.5);
    wire.name = `${name}_wire_${w}`;
    group.add(wire);
  }

  group.position.set(0, y, 0.8);
  return group;
}

scene.add(createChandelier(0.7, 3.8, 24, 'chandelier1'));
scene.add(createChandelier(0.55, 3.2, 20, 'chandelier2'));
scene.add(createChandelier(0.65, 4.3, 22, 'chandelier3'));

// Offset chandeliers slightly
scene.getObjectByName('chandelier1').position.x = 0.3;
scene.getObjectByName('chandelier2').position.x = -0.8;
scene.getObjectByName('chandelier2').position.z = 0.5;
scene.getObjectByName('chandelier3').position.x = 0.6;
scene.getObjectByName('chandelier3').position.z = 1.2;

// --- Ambient + Key Lighting ---
const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.3);
ambientLight.name = 'ambientLight';
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x4060a0, 0.15);
dirLight.position.set(-5, 8, 3);
dirLight.name = 'dirLight';
scene.add(dirLight);

// Subtle fill from behind the glass (moonlight)
const moonLight = new THREE.DirectionalLight(0x304060, 0.2);
moonLight.position.set(0, 5, -5);
moonLight.name = 'moonLight';
scene.add(moonLight);

// Floor reflection hint
const floorLight = new THREE.RectAreaLight(0xf5d080, 0.5, 4, 2);
floorLight.position.set(0, 0.1, 1);
floorLight.rotation.x = -Math.PI / 2;
floorLight.name = 'floorLight';
scene.add(floorLight);

// --- Ceiling ---
const ceilGeo = new THREE.PlaneGeometry(14, 10);
const ceil = new THREE.Mesh(ceilGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }));
ceil.rotation.x = Math.PI / 2;
ceil.position.set(0, 6.5, 0);
ceil.name = 'ceiling';
scene.add(ceil);

// --- UI Overlay ---
const overlay = document.createElement('div');
overlay.style.cssText = `
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  font-family: 'Inter', sans-serif; color: rgba(255,255,255,0.5);
  font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
  pointer-events: none; user-select: none;
`;
overlay.textContent = 'Drag to orbit • Scroll to zoom';
root.appendChild(overlay);

const title = document.createElement('div');
title.style.cssText = `
  position: fixed; top: 24px; left: 28px;
  font-family: 'Inter', sans-serif; color: rgba(255,255,255,0.7);
  font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
  pointer-events: none; user-select: none;
`;
title.textContent = 'Interior Scene';
root.appendChild(title);

// Load Inter font
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

// --- Animation ---
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  // Gentle chandelier sway
  ['chandelier1', 'chandelier2', 'chandelier3'].forEach((name, i) => {
    const ch = scene.getObjectByName(name);
    if (ch) {
      ch.rotation.y = t * 0.05 + i * 2;
      ch.position.y += Math.sin(t * 0.5 + i) * 0.0001;
    }
  });

  // Subtle crystal shimmer
  scene.traverse((obj) => {
    if (obj.name && obj.name.includes('crystal') && obj.material) {
      obj.material.emissiveIntensity = 0.6 + Math.sin(t * 2 + obj.position.x * 10) * 0.3;
    }
  });

  camera.position.x = Math.sin(t * 0.08) * 0.18;
  camera.position.y = 2.45 + Math.sin(t * 0.12) * 0.05;
  camera.lookAt(0.15, 1.35, 0.25);
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
