import * as THREE from 'three';

// Scene setup
THREE.ColorManagement.enabled = true;

const isCompactViewport = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
const maxPixelRatio = isCompactViewport ? 1.35 : 2;
const radialSegments = isCompactViewport ? 32 : 64;
const ringSegments = isCompactViewport ? 48 : 80;
const shadowSize = isCompactViewport ? 512 : 1024;
const cameraTarget = new THREE.Vector3(0, 0.5, 0);
const MIN_KELVIN = 2700;
const MAX_KELVIN = 4000;
const DEFAULT_KELVIN = 3000;
const TEMPERATURE_PRESETS = [
  { kelvin: 2700, label: '2700K', tone: 'Warm' },
  { kelvin: 3000, label: '3000K', tone: 'Soft' },
  { kelvin: 4000, label: '4000K', tone: 'Neutral' },
];
const MIN_LUMENS = 150;
const MAX_LUMENS = 3000;
const DEFAULT_LUMENS = 850;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);
scene.fog = new THREE.FogExp2(0x050505, 0.015);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(1.35, 1.1, 6.1);
camera.lookAt(0, 0.5, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: !isCompactViewport,
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
renderer.shadowMap.enabled = !isCompactViewport;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const root = document.getElementById('root') ?? document.body;
root.appendChild(renderer.domElement);
renderer.domElement.style.touchAction = 'none';

function applyResponsiveCamera() {
  const isMobile = window.innerWidth <= 720;
  camera.fov = isMobile ? 52 : 45;
  camera.position.set(isMobile ? 0.85 : 1.35, isMobile ? 0.95 : 1.1, isMobile ? 7.0 : 6.1);
  cameraTarget.set(0, isMobile ? 0.35 : 0.5, 0);
  camera.lookAt(cameraTarget);
  camera.updateProjectionMatrix();
}
applyResponsiveCamera();

// ---- COLOR TEMPERATURE SYSTEM ----
let currentKelvin = DEFAULT_KELVIN;
let targetKelvin = DEFAULT_KELVIN;
let currentLumens = DEFAULT_LUMENS;
let targetLumens = DEFAULT_LUMENS;

function kelvinToRGB(kelvin) {
  const clampedKelvin = THREE.MathUtils.clamp(kelvin, MIN_KELVIN, MAX_KELVIN);
  const temp = clampedKelvin / 100;
  let r, g, b;
  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    b = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    b = 255;
  }
  const color = new THREE.Color();
  color.setRGB(
    THREE.MathUtils.clamp(r, 0, 255) / 255,
    THREE.MathUtils.clamp(g, 0, 255) / 255,
    THREE.MathUtils.clamp(b, 0, 255) / 255,
    THREE.SRGBColorSpace
  );
  return color;
}

function getTemperaturePosition(kelvin = currentKelvin) {
  return THREE.MathUtils.clamp((kelvin - MIN_KELVIN) / (MAX_KELVIN - MIN_KELVIN), 0, 1);
}

function getLampColor() {
  return kelvinToRGB(currentKelvin);
}

function getKelvinValue() {
  return Math.round(currentKelvin);
}

// ---- ROOM GEOMETRY ----
const roomSize = 12;
const roomHeight = 6;

// Floor
const floorGeo = new THREE.PlaneGeometry(roomSize, roomSize);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x0d0d0d,
  roughness: 0.85,
  metalness: 0.05,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.name = 'floor';
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.5;
floor.receiveShadow = true;
scene.add(floor);

// Ceiling
const ceilGeo = new THREE.PlaneGeometry(roomSize, roomSize);
const ceilMat = new THREE.MeshStandardMaterial({
  color: 0x080808,
  roughness: 0.95,
  metalness: 0.0,
});
const ceil = new THREE.Mesh(ceilGeo, ceilMat);
ceil.name = 'ceiling';
ceil.rotation.x = Math.PI / 2;
ceil.position.y = roomHeight - 1.5;
ceil.receiveShadow = true;
scene.add(ceil);

// Walls
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x0b0b0b,
  roughness: 0.92,
  metalness: 0.02,
});

const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomHeight), wallMat);
backWall.name = 'backWall';
backWall.position.set(0, roomHeight / 2 - 1.5, -roomSize / 2);
backWall.receiveShadow = true;
scene.add(backWall);

const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomHeight), wallMat);
leftWall.name = 'leftWall';
leftWall.position.set(-roomSize / 2, roomHeight / 2 - 1.5, 0);
leftWall.rotation.y = Math.PI / 2;
leftWall.receiveShadow = true;
scene.add(leftWall);

const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomHeight), wallMat);
rightWall.name = 'rightWall';
rightWall.position.set(roomSize / 2, roomHeight / 2 - 1.5, 0);
rightWall.rotation.y = -Math.PI / 2;
rightWall.receiveShadow = true;
scene.add(rightWall);

// ---- PENDANT LAMP ----
const lampGroup = new THREE.Group();
lampGroup.name = 'pendantLamp';
lampGroup.position.set(0, 2.3, 0);
scene.add(lampGroup);

// Ceiling canopy (mounting plate)
const canopyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.03, 32);
const canopyMat = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  roughness: 0.3,
  metalness: 0.9,
});
const canopy = new THREE.Mesh(canopyGeo, canopyMat);
canopy.name = 'canopy';
canopy.position.y = 1.68;
canopy.castShadow = true;
lampGroup.add(canopy);

// Suspension cable
const cableGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.65, 8);
const cableMat = new THREE.MeshStandardMaterial({
  color: 0x222222,
  roughness: 0.5,
  metalness: 0.8,
});
const cable = new THREE.Mesh(cableGeo, cableMat);
cable.name = 'cable';
cable.position.y = 0.875;
lampGroup.add(cable);

// Main lamp housing - outer shell (matte black metal)
const housingOuterGeo = new THREE.CylinderGeometry(0.45, 0.32, 0.35, radialSegments, 1, true);
const housingOuterMat = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.7,
  metalness: 0.85,
  side: THREE.DoubleSide,
});
const housingOuter = new THREE.Mesh(housingOuterGeo, housingOuterMat);
housingOuter.name = 'housingOuter';
housingOuter.position.y = 0;
housingOuter.castShadow = true;
lampGroup.add(housingOuter);

// Housing top cap
const topCapGeo = new THREE.CylinderGeometry(0.008, 0.45, 0.04, radialSegments);
const topCapMat = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.6,
  metalness: 0.9,
});
const topCap = new THREE.Mesh(topCapGeo, topCapMat);
topCap.name = 'topCap';
topCap.position.y = 0.175;
topCap.castShadow = true;
lampGroup.add(topCap);

// Inner reflector (brushed aluminum)
const reflectorGeo = new THREE.CylinderGeometry(0.43, 0.30, 0.33, radialSegments, 1, true);
const reflectorMat = new THREE.MeshStandardMaterial({
  color: 0x888888,
  roughness: 0.25,
  metalness: 0.95,
  side: THREE.BackSide,
});
const reflector = new THREE.Mesh(reflectorGeo, reflectorMat);
reflector.name = 'reflector';
reflector.position.y = 0.0;
lampGroup.add(reflector);

// Bottom ring (brushed aluminum accent)
const ringGeo = new THREE.TorusGeometry(0.32, 0.015, 12, ringSegments);
const ringMat = new THREE.MeshStandardMaterial({
  color: 0x999999,
  roughness: 0.2,
  metalness: 0.95,
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.name = 'bottomRing';
ring.rotation.x = Math.PI / 2;
ring.position.y = -0.175;
lampGroup.add(ring);

// Frosted glass diffuser
const diffuserGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.02, radialSegments);
const diffuserMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  roughness: 0.6,
  metalness: 0.0,
  transmission: 0.7,
  thickness: 0.5,
  transparent: true,
  opacity: 0.85,
  emissive: getLampColor(),
  emissiveIntensity: 1.5,
});
const diffuser = new THREE.Mesh(diffuserGeo, diffuserMat);
diffuser.name = 'diffuser';
diffuser.position.y = -0.175;
lampGroup.add(diffuser);

// Inner glow cylinder
const glowGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.30, radialSegments, 1, true);
const glowMat = new THREE.MeshBasicMaterial({
  color: getLampColor(),
  transparent: true,
  opacity: 0.08,
  side: THREE.BackSide,
});
const glowInner = new THREE.Mesh(glowGeo, glowMat);
glowInner.name = 'glowInner';
glowInner.position.y = 0.0;
lampGroup.add(glowInner);

// Light source point
const lampLight = new THREE.PointLight(getLampColor(), 15, 12, 1.5);
lampLight.name = 'lampLight';
lampLight.position.set(0, -0.1, 0);
lampLight.castShadow = true;
lampLight.shadow.mapSize.width = shadowSize;
lampLight.shadow.mapSize.height = shadowSize;
lampLight.shadow.bias = -0.001;
lampLight.shadow.normalBias = 0.02;
lampLight.shadow.radius = 4;
lampGroup.add(lampLight);

// Secondary fill light (softer)
const fillLight = new THREE.PointLight(getLampColor(), 3, 8, 2);
fillLight.name = 'fillLight';
fillLight.position.set(0, -0.3, 0);
lampGroup.add(fillLight);

// Spotlight for dramatic cone
const spotLight = new THREE.SpotLight(getLampColor(), 20, 7.5, Math.PI * 0.23, 0.72, 1.65);
spotLight.name = 'spotLight';
spotLight.position.set(0, -0.1, 0);
spotLight.target.position.set(0, -3.24, 0);
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = shadowSize;
spotLight.shadow.mapSize.height = shadowSize;
spotLight.shadow.bias = -0.001;
lampGroup.add(spotLight);
lampGroup.add(spotLight.target);

// Volumetric light cone (visible beam)
const coneGeo = new THREE.CylinderGeometry(0.24, 0.92, 3.05, radialSegments, 1, true);
const coneMat = new THREE.MeshBasicMaterial({
  color: getLampColor(),
  transparent: true,
  opacity: 0.015,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const lightCone = new THREE.Mesh(coneGeo, coneMat);
lightCone.name = 'lightCone';
lightCone.position.y = -1.69;
lampGroup.add(lightCone);

// Ambient light (very dim)
const ambientLight = new THREE.AmbientLight(0x222222, 0.5);
ambientLight.name = 'ambientLight';
scene.add(ambientLight);

// Very subtle rim light
const rimLight = new THREE.DirectionalLight(0x555555, 0.42);
rimLight.name = 'rimLight';
rimLight.position.set(3, 4, -2);
scene.add(rimLight);

// ---- DARK LIVING ROOM INTERIOR ----
const livingRoomGroup = new THREE.Group();
livingRoomGroup.name = 'darkLivingRoomInterior';
scene.add(livingRoomGroup);

const charcoalFabricMat = new THREE.MeshStandardMaterial({
  color: 0x11100e,
  roughness: 0.82,
  metalness: 0.0,
});
const walnutMat = new THREE.MeshStandardMaterial({
  color: 0x24170f,
  roughness: 0.58,
  metalness: 0.02,
});
const deepWoodMat = new THREE.MeshStandardMaterial({
  color: 0x130d09,
  roughness: 0.5,
  metalness: 0.04,
});
const tableTopMat = new THREE.MeshStandardMaterial({
  color: 0x1c1711,
  roughness: 0.34,
  metalness: 0.08,
});
const bronzeMat = new THREE.MeshStandardMaterial({
  color: 0x8f6b36,
  roughness: 0.26,
  metalness: 0.72,
});
const wallPanelMat = new THREE.MeshStandardMaterial({
  color: 0x0d0b09,
  roughness: 0.78,
  metalness: 0.02,
});
const rugMat = new THREE.MeshStandardMaterial({
  color: 0x17120d,
  roughness: 0.9,
  metalness: 0.0,
});

function addBox(name, width, height, depth, x, y, z, material, parent = livingRoomGroup) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = !isCompactViewport;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

addBox('livingRoomWallPanelLeft', 1.5, 2.35, 0.03, -2.65, 0.18, -5.78, wallPanelMat);
addBox('livingRoomWallPanelCenter', 2.6, 2.35, 0.03, -0.35, 0.18, -5.79, wallPanelMat);
addBox('livingRoomWallPanelRight', 1.5, 2.35, 0.03, 2.15, 0.18, -5.78, wallPanelMat);
addBox('slimPictureLedge', 4.8, 0.035, 0.16, -0.18, 0.62, -5.58, bronzeMat);
addBox('lowMediaConsole', 4.7, 0.34, 0.46, -0.12, -1.17, -4.95, deepWoodMat);

for (let i = -2; i <= 2; i++) {
  addBox(`wallPanelReveal_${i}`, 0.012, 2.1, 0.024, i * 0.95, 0.2, -5.54, bronzeMat);
  addBox(`consoleReveal_${i}`, 0.012, 0.26, 0.024, i * 0.82, -1.16, -4.68, bronzeMat);
}

addBox('sofaBase', 4.65, 0.42, 0.9, -0.18, -1.28, -3.28, charcoalFabricMat);
addBox('sofaBack', 4.85, 0.86, 0.28, -0.18, -0.91, -3.73, charcoalFabricMat);
addBox('sofaLeftArm', 0.32, 0.7, 0.96, -2.72, -1.08, -3.28, charcoalFabricMat);
addBox('sofaRightArm', 0.32, 0.7, 0.96, 2.36, -1.08, -3.28, charcoalFabricMat);

for (let i = 0; i < 4; i++) {
  const cushion = addBox(`sofaSeatCushion_${i}`, 1.03, 0.12, 0.78, -1.72 + i * 1.03, -1.02, -3.15, charcoalFabricMat);
  cushion.castShadow = false;
}

addBox('leftPillow', 0.5, 0.38, 0.16, -1.58, -0.72, -2.88, walnutMat).rotation.z = -0.08;
addBox('rightPillow', 0.55, 0.34, 0.16, 1.1, -0.73, -2.88, walnutMat).rotation.z = 0.12;

addBox('areaRug', 4.9, 0.025, 2.5, -0.05, -1.48, 0.05, rugMat);
const tableTop = addBox('roundCoffeeTableTop', 2.65, 0.12, 1.32, 0, -0.96, 0, tableTopMat);
tableTop.castShadow = false;
addBox('coffeeTableShadowPlinth', 2.38, 0.1, 1.08, 0, -1.19, 0, deepWoodMat);
addBox('coffeeTableBronzeFront', 2.35, 0.012, 0.018, 0, -0.88, 0.69, bronzeMat);
addBox('coffeeTableBronzeBack', 2.35, 0.012, 0.018, 0, -0.88, -0.69, bronzeMat);
addBox('coffeeTableLeftLeg', 0.08, 0.28, 0.08, -1.08, -1.16, 0.48, bronzeMat);
addBox('coffeeTableRightLeg', 0.08, 0.28, 0.08, 1.08, -1.16, 0.48, bronzeMat);

const sideTable = addBox('sideTable', 0.54, 0.08, 0.44, -2.15, -0.96, -2.78, walnutMat);
sideTable.castShadow = false;
addBox('sideTableStem', 0.08, 0.36, 0.08, -2.15, -1.17, -2.78, bronzeMat);

const shadeMat = new THREE.MeshStandardMaterial({
  color: 0xb18a55,
  roughness: 0.55,
  metalness: 0.05,
  emissive: 0x4a2d14,
  emissiveIntensity: 0.32,
});
const sideShade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.22, radialSegments), shadeMat);
sideShade.name = 'sideTableLampShade';
sideShade.position.set(-2.15, -0.72, -2.78);
sideShade.castShadow = !isCompactViewport;
sideShade.receiveShadow = true;
livingRoomGroup.add(sideShade);

const lowAccentLight = new THREE.PointLight(0xd6a763, 0.55, 5, 2.4);
lowAccentLight.name = 'livingRoomWarmAccent';
lowAccentLight.position.set(-2.15, -0.58, -2.78);
scene.add(lowAccentLight);

// ---- ROTARY DIAL CONTROLLER ----
const dialGroup = new THREE.Group();
dialGroup.name = 'dialController';
dialGroup.position.set(1.04, 0.62, 0.34);
scene.add(dialGroup);

// Base platform
const basePlatGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.04, radialSegments);
const basePlatMat = new THREE.MeshStandardMaterial({
  color: 0x0e0e0e,
  roughness: 0.85,
  metalness: 0.1,
});
const basePlat = new THREE.Mesh(basePlatGeo, basePlatMat);
basePlat.name = 'dialBasePlatform';
basePlat.position.y = -1.48;
basePlat.receiveShadow = true;
dialGroup.add(basePlat);

// Dial body
const dialBodyGeo = new THREE.CylinderGeometry(0.25, 0.27, 0.12, radialSegments);
const dialBodyMat = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  roughness: 0.35,
  metalness: 0.9,
});
const dialBody = new THREE.Mesh(dialBodyGeo, dialBodyMat);
dialBody.name = 'dialBody';
dialBody.position.y = -1.4;
dialBody.castShadow = true;
dialGroup.add(dialBody);

// Dial knob top
const dialKnobGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.06, radialSegments);
const dialKnobMat = new THREE.MeshStandardMaterial({
  color: 0x222222,
  roughness: 0.25,
  metalness: 0.95,
});
const dialKnob = new THREE.Mesh(dialKnobGeo, dialKnobMat);
dialKnob.name = 'dialKnob';
dialKnob.position.y = -1.31;
dialKnob.castShadow = true;
dialGroup.add(dialKnob);

// Knurled texture (small ridges around the dial)
const ridgeCount = isCompactViewport ? 24 : 36;
for (let i = 0; i < ridgeCount; i++) {
  const angle = (i / ridgeCount) * Math.PI * 2;
  const ridgeGeo = new THREE.BoxGeometry(0.008, 0.10, 0.015);
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.3,
    metalness: 0.9,
  });
  const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
  ridge.name = `dialRidge_${i}`;
  ridge.position.set(
    Math.cos(angle) * 0.255,
    -1.4,
    Math.sin(angle) * 0.255
  );
  ridge.rotation.y = -angle;
  dialGroup.add(ridge);
}

// Dial indicator line
const indicatorGeo = new THREE.BoxGeometry(0.12, 0.008, 0.008);
const indicatorMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.2,
  metalness: 0.5,
  emissive: 0xffffff,
  emissiveIntensity: 0.5,
});
const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
indicator.name = 'dialIndicator';
indicator.position.set(0.1, -1.28, 0);
dialGroup.add(indicator);

// Temperature scale ring (subtle markings)
const scaleRingGeo = new THREE.TorusGeometry(0.33, 0.005, 8, ringSegments);
const scaleRingMat = new THREE.MeshStandardMaterial({
  color: 0x333333,
  roughness: 0.5,
  metalness: 0.8,
});
const scaleRing = new THREE.Mesh(scaleRingGeo, scaleRingMat);
scaleRing.name = 'scaleRing';
scaleRing.rotation.x = Math.PI / 2;
scaleRing.position.y = -1.46;
dialGroup.add(scaleRing);

// Scale tick marks
for (let i = 0; i <= 8; i++) {
  const angle = (i / 8) * Math.PI * 1.5 - Math.PI * 0.75;
  const tickLen = i % 2 === 0 ? 0.04 : 0.025;
  const tickGeo = new THREE.BoxGeometry(tickLen, 0.004, 0.004);
  const tickMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.4,
    metalness: 0.7,
  });
  const tick = new THREE.Mesh(tickGeo, tickMat);
  tick.name = `scaleTick_${i}`;
  const r = 0.33;
  tick.position.set(Math.cos(angle) * r, -1.46, Math.sin(angle) * r);
  tick.rotation.y = -angle;
  dialGroup.add(tick);
}

// Small LED indicator on dial
const ledGeo = new THREE.SphereGeometry(0.015, 10, 8);
const ledMat = new THREE.MeshBasicMaterial({ color: getLampColor() });
const led = new THREE.Mesh(ledGeo, ledMat);
led.name = 'dialLED';
led.position.set(0, -1.27, -0.18);
dialGroup.add(led);

// ---- COUNTERTOP LIGHT POOL ----
const poolGeo = new THREE.CircleGeometry(0.82, ringSegments);
const poolMat = new THREE.MeshStandardMaterial({
  color: getLampColor(),
  emissive: getLampColor(),
  emissiveIntensity: 0.15,
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
  roughness: 0.9,
  metalness: 0.0,
});
const pool = new THREE.Mesh(poolGeo, poolMat);
pool.name = 'lightPool';
pool.rotation.x = -Math.PI / 2;
pool.position.set(0, -0.892, 0);
pool.scale.set(1.22, 0.68, 1);
pool.renderOrder = 2;
scene.add(pool);

// ---- UI OVERLAY ----
const uiContainer = document.createElement('div');
uiContainer.className = 'temperature-ui';
uiContainer.style.cssText = `
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 100;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  user-select: none;
`;
document.body.appendChild(uiContainer);

// Kelvin display
const kelvinDisplay = document.createElement('div');
kelvinDisplay.className = 'temperature-readout';
kelvinDisplay.style.cssText = `
  color: #b9a678;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 2px;
  text-transform: uppercase;
`;
kelvinDisplay.textContent = `${getKelvinValue()}K / ${Math.round(currentLumens)} lm`;
uiContainer.appendChild(kelvinDisplay);

// Colour temperature presets
const temperatureButtonGroup = document.createElement('div');
temperatureButtonGroup.className = 'temperature-options';
temperatureButtonGroup.setAttribute('aria-label', 'Colour temperature presets');
temperatureButtonGroup.style.cssText = `
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(20,20,20,0.85);
  border: 1px solid rgba(50,50,50,0.6);
  border-radius: 2px;
  padding: 8px;
  backdrop-filter: blur(10px);
`;
uiContainer.appendChild(temperatureButtonGroup);

const temperatureButtons = TEMPERATURE_PRESETS.map((preset) => {
  const button = document.createElement('button');
  button.className = 'temperature-option';
  button.type = 'button';
  button.dataset.kelvin = String(preset.kelvin);
  button.setAttribute('aria-pressed', 'false');
  button.style.cssText = `
    min-width: 92px;
    min-height: 42px;
    border: 1px solid rgba(214,185,111,0.28);
    background: rgba(10,10,10,0.62);
    color: #c9b37c;
    font: inherit;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  `;

  const value = document.createElement('span');
  value.className = 'temperature-option-value';
  value.textContent = preset.label;
  button.appendChild(value);

  const tone = document.createElement('span');
  tone.className = 'temperature-option-tone';
  tone.textContent = preset.tone;
  button.appendChild(tone);

  button.addEventListener('click', () => setTargetKelvin(preset.kelvin));
  temperatureButtonGroup.appendChild(button);
  return button;
});

// Brightness slider
const brightnessContainer = document.createElement('div');
brightnessContainer.className = 'brightness-slider';
brightnessContainer.style.cssText = `
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(420px, 88vw);
  background: rgba(20,20,20,0.85);
  border: 1px solid rgba(50,50,50,0.6);
  border-radius: 40px;
  padding: 10px 22px;
  backdrop-filter: blur(10px);
`;
uiContainer.appendChild(brightnessContainer);

const dimLabel = document.createElement('span');
dimLabel.textContent = 'LOW';
dimLabel.style.cssText = 'color: #8d7a52; font-size: 10px; font-weight: 500; letter-spacing: 0.16em;';
brightnessContainer.appendChild(dimLabel);

const brightnessSlider = document.createElement('input');
brightnessSlider.className = 'brightness-range';
brightnessSlider.type = 'range';
brightnessSlider.min = String(MIN_LUMENS);
brightnessSlider.max = String(MAX_LUMENS);
brightnessSlider.step = '10';
brightnessSlider.value = String(DEFAULT_LUMENS);
brightnessSlider.style.cssText = `
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(to right, #4d3b21, #d6b96f, #fff0bd);
`;
brightnessContainer.appendChild(brightnessSlider);

const brightLabel = document.createElement('span');
brightLabel.textContent = 'HIGH';
brightLabel.style.cssText = 'color: #f0dc9e; font-size: 10px; font-weight: 500; letter-spacing: 0.16em;';
brightnessContainer.appendChild(brightLabel);

const inputRow = document.createElement('div');
inputRow.className = 'temperature-input-row';
inputRow.style.cssText = `
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  width: min(220px, 88vw);
`;
uiContainer.appendChild(inputRow);

function addMetricInput(labelText, unitText, config) {
  const wrap = document.createElement('label');
  wrap.className = 'temperature-metric';
  wrap.style.cssText = `
    display: grid;
    gap: 6px;
    color: #8d7a52;
    font-size: 8px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  `;

  const labelTextNode = document.createElement('span');
  labelTextNode.textContent = labelText;
  wrap.appendChild(labelTextNode);

  const fieldWrap = document.createElement('span');
  fieldWrap.className = 'temperature-number-wrap';
  fieldWrap.style.cssText = `
    display: flex;
    align-items: center;
    min-height: 34px;
    border: 1px solid rgba(214,185,111,0.28);
    background: rgba(10,10,10,0.74);
  `;

  const input = document.createElement('input');
  input.className = 'temperature-number';
  input.type = 'text';
  input.min = String(config.min);
  input.max = String(config.max);
  input.step = String(config.step);
  input.value = String(config.value);
  input.inputMode = 'numeric';
  input.style.cssText = `
    width: 100%;
    height: 32px;
    border: 0;
    background: transparent;
    color: #f1dfad;
    font: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    outline: none;
    text-align: center;
  `;
  fieldWrap.appendChild(input);

  const unit = document.createElement('span');
  unit.textContent = unitText;
  unit.style.cssText = `
    padding-right: 11px;
    color: #6f6040;
    font-size: 8px;
    letter-spacing: 0.12em;
    pointer-events: none;
  `;
  fieldWrap.appendChild(unit);

  wrap.appendChild(fieldWrap);
  inputRow.appendChild(wrap);
  return input;
}

const lumenInput = addMetricInput('Luminous output', 'lm', {
  min: MIN_LUMENS,
  max: MAX_LUMENS,
  step: 10,
  value: DEFAULT_LUMENS,
});

// Style the slider thumb
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .temperature-option {
    display: grid;
    gap: 3px;
    place-items: center;
  }
  .temperature-option:hover,
  .temperature-option:focus-visible,
  .temperature-option.active {
    background: rgba(240,220,158,0.14) !important;
    border-color: rgba(240,220,158,0.72) !important;
    color: #f0dc9e !important;
    outline: none;
  }
  .temperature-option-value {
    display: block;
    font-size: 11px;
    font-weight: 500;
  }
  .temperature-option-tone {
    display: block;
    color: #8d7a52;
    font-size: 7px;
    letter-spacing: 0.18em;
  }
  .temperature-option.active .temperature-option-tone {
    color: #d6b96f;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(255,255,255,0.3);
    border: 2px solid rgba(255,255,255,0.8);
  }
  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(255,255,255,0.3);
    border: 2px solid rgba(255,255,255,0.8);
  }
  @media (max-width: 720px) {
    .temperature-ui {
      bottom: 18px !important;
      width: min(92vw, 420px);
      gap: 9px !important;
    }
    .temperature-options {
      width: min(100%, 360px);
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px !important;
      padding: 7px !important;
    }
    .temperature-option {
      min-width: 0 !important;
      min-height: 39px !important;
      letter-spacing: 0.1em !important;
    }
    .temperature-option-value {
      font-size: 10px !important;
    }
    .temperature-option-tone {
      font-size: 6px !important;
    }
    .brightness-slider {
      width: min(100%, 360px) !important;
      gap: 9px !important;
      padding: 9px 12px !important;
    }
    .brightness-range {
      width: 100% !important;
    }
    .brightness-slider span {
      font-size: 9px !important;
      letter-spacing: 0.08em !important;
    }
    .temperature-readout {
      font-size: 11px !important;
    }
    .temperature-input-row {
      width: min(92vw, 360px) !important;
      gap: 8px !important;
    }
    .temperature-metric {
      font-size: 7px !important;
      letter-spacing: 0.12em !important;
    }
    .temperature-number-wrap {
      min-height: 31px !important;
    }
    .temperature-number {
      height: 29px !important;
      font-size: 10px !important;
    }
    .temperature-label {
      font-size: 8px !important;
      letter-spacing: 2px !important;
    }
  }
`;
document.head.appendChild(styleSheet);

// Label
const label = document.createElement('div');
label.className = 'temperature-label';
label.style.cssText = `
  color: #555;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 3px;
  text-transform: uppercase;
`;
label.textContent = 'Light Controls';
uiContainer.appendChild(label);

function numericDraft(value) {
  return String(value).replace(/[^\d]/g, '');
}

function nearestTemperaturePreset(value) {
  return TEMPERATURE_PRESETS.reduce((nearest, preset) => (
    Math.abs(preset.kelvin - value) < Math.abs(nearest.kelvin - value) ? preset : nearest
  ), TEMPERATURE_PRESETS[0]).kelvin;
}

function updateTemperatureButtons() {
  temperatureButtons.forEach((button) => {
    const isActive = Number(button.dataset.kelvin) === targetKelvin;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function setTargetKelvin(value, syncControls = true) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return;
  targetKelvin = nearestTemperaturePreset(THREE.MathUtils.clamp(parsed, MIN_KELVIN, MAX_KELVIN));
  currentKelvin = targetKelvin;
  if (syncControls) updateTemperatureButtons();
}

function setTargetLumens(value, syncControls = true) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return;
  targetLumens = Math.round(THREE.MathUtils.clamp(parsed, MIN_LUMENS, MAX_LUMENS));
  if (syncControls) {
    lumenInput.value = String(targetLumens);
    brightnessSlider.value = String(targetLumens);
  }
}

function commitLumenInput(value) {
  const draft = numericDraft(value);
  setTargetLumens(draft || DEFAULT_LUMENS);
}

brightnessSlider.addEventListener('input', (e) => {
  setTargetLumens(e.target.value);
});

lumenInput.addEventListener('input', (e) => {
  const draft = numericDraft(e.target.value);
  if (draft !== e.target.value) e.target.value = draft;
  const parsed = Number(draft);
  if (Number.isFinite(parsed) && parsed >= MIN_LUMENS) {
    setTargetLumens(parsed, false);
    brightnessSlider.value = String(targetLumens);
  }
});
lumenInput.addEventListener('blur', (e) => {
  commitLumenInput(e.target.value);
});
lumenInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    commitLumenInput(e.currentTarget.value);
    e.currentTarget.blur();
  }
});

updateTemperatureButtons();

// ---- UPDATE FUNCTION ----
function updateLampColor() {
  currentKelvin += (targetKelvin - currentKelvin) * 0.06;
  currentLumens += (targetLumens - currentLumens) * 0.08;

  const color = getLampColor();
  const temperaturePosition = getTemperaturePosition(currentKelvin);
  const warmth = 1 - temperaturePosition;
  const lumenFactor = THREE.MathUtils.clamp(currentLumens / DEFAULT_LUMENS, 0.18, 3.6);
  const perceivedOutput = Math.sqrt(lumenFactor);

  lampLight.color.copy(color);
  fillLight.color.copy(color);
  spotLight.color.copy(color);
  lowAccentLight.color.copy(color);

  diffuserMat.emissive.copy(color);
  glowMat.color.copy(color);
  coneMat.color.copy(color);
  ledMat.color.copy(color);
  poolMat.color.copy(color);
  poolMat.emissive.copy(color);

  kelvinDisplay.textContent = `${getKelvinValue()}K / ${Math.round(currentLumens)} lm`;

  // Rotate dial indicator
  const dialAngle = temperaturePosition * Math.PI * 1.5 - Math.PI * 0.75;
  indicator.position.x = Math.cos(-dialAngle) * 0.1;
  indicator.position.z = Math.sin(-dialAngle) * 0.1;
  indicator.rotation.y = dialAngle;

  lampLight.intensity = (9.5 + warmth * 4.8) * perceivedOutput;
  fillLight.intensity = (1.6 + warmth * 0.9) * perceivedOutput;
  spotLight.intensity = (13 + warmth * 5.8) * perceivedOutput;
  lowAccentLight.intensity = (0.3 + warmth * 0.2) * Math.min(perceivedOutput, 1.7);
  diffuserMat.emissiveIntensity = 0.95 + perceivedOutput * 0.9;

  glowMat.opacity = THREE.MathUtils.clamp(0.045 * perceivedOutput, 0.035, 0.16);
  coneMat.opacity = THREE.MathUtils.clamp((0.006 + warmth * 0.011) * perceivedOutput, 0.006, 0.042);

  poolMat.opacity = THREE.MathUtils.clamp((0.12 + warmth * 0.13) * perceivedOutput, 0.1, 0.48);
  poolMat.emissiveIntensity = THREE.MathUtils.clamp((0.08 + warmth * 0.11) * perceivedOutput, 0.06, 0.36);
}

// ---- ANIMATION LOOP ----
let simulatorReadyAnnounced = false;

function animate() {
  updateLampColor();
  renderer.render(scene, camera);

  if (!simulatorReadyAnnounced) {
    simulatorReadyAnnounced = true;
    window.dispatchEvent(new Event('hazen-simulator-ready'));
  }
}

renderer.setAnimationLoop(animate);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  applyResponsiveCamera();
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
});
