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
const MAX_KELVIN = 6500;
const DEFAULT_KELVIN = 3460;
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
const spotLight = new THREE.SpotLight(getLampColor(), 20, 8, Math.PI * 0.35, 0.6, 1.5);
spotLight.name = 'spotLight';
spotLight.position.set(0, -0.1, 0);
spotLight.target.position.set(0, -5, 0);
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = shadowSize;
spotLight.shadow.mapSize.height = shadowSize;
spotLight.shadow.bias = -0.001;
lampGroup.add(spotLight);
lampGroup.add(spotLight.target);

// Volumetric light cone (visible beam)
const coneGeo = new THREE.CylinderGeometry(0.30, 1.8, 4.0, radialSegments, 1, true);
const coneMat = new THREE.MeshBasicMaterial({
  color: getLampColor(),
  transparent: true,
  opacity: 0.015,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const lightCone = new THREE.Mesh(coneGeo, coneMat);
lightCone.name = 'lightCone';
lightCone.position.y = -2.2;
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

// ---- DARK KITCHEN INTERIOR ----
const kitchenGroup = new THREE.Group();
kitchenGroup.name = 'darkKitchenInterior';
scene.add(kitchenGroup);

const stoneMat = new THREE.MeshStandardMaterial({
  color: 0x171411,
  roughness: 0.46,
  metalness: 0.08,
});
const cabinetMat = new THREE.MeshStandardMaterial({
  color: 0x0b0907,
  roughness: 0.64,
  metalness: 0.04,
});
const walnutMat = new THREE.MeshStandardMaterial({
  color: 0x24160d,
  roughness: 0.58,
  metalness: 0.02,
});
const bronzeMat = new THREE.MeshStandardMaterial({
  color: 0x8f6b36,
  roughness: 0.28,
  metalness: 0.72,
});
const backsplashMat = new THREE.MeshStandardMaterial({
  color: 0x0e0d0b,
  roughness: 0.38,
  metalness: 0.18,
});

function addBox(name, width, height, depth, x, y, z, material, parent = kitchenGroup) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = !isCompactViewport;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const islandTop = addBox('kitchenIslandStoneTop', 3.9, 0.16, 1.45, 0, -0.94, 0.28, stoneMat);
islandTop.castShadow = false;
addBox('kitchenIslandBase', 3.35, 0.56, 1.05, 0, -1.25, 0.32, cabinetMat);
addBox('kitchenIslandInsetFront', 2.95, 0.36, 0.035, 0, -1.23, 0.865, walnutMat);
addBox('kitchenIslandToeKick', 3.0, 0.08, 0.86, 0, -1.53, 0.32, walnutMat);
addBox('islandFrontBronzeLine', 3.25, 0.012, 0.012, 0, -1.04, 0.91, bronzeMat);
addBox('islandLeftBronzeLine', 0.012, 0.012, 1.2, -1.8, -1.04, 0.32, bronzeMat);
addBox('islandRightBronzeLine', 0.012, 0.012, 1.2, 1.8, -1.04, 0.32, bronzeMat);

for (let i = -1; i <= 1; i++) {
  addBox(`islandPanelDivider_${i}`, 0.012, 0.32, 0.018, i * 0.95, -1.24, 0.89, bronzeMat);
  addBox(`islandDrawerPull_${i}`, 0.34, 0.018, 0.018, i * 0.95, -1.17, 0.92, bronzeMat);
}

addBox('rearCounterBase', 5.8, 0.55, 0.62, 0, -1.21, -5.22, cabinetMat);
addBox('rearCounterTop', 6.1, 0.12, 0.72, 0, -0.87, -5.15, stoneMat);
addBox('rearBacksplash', 6.1, 1.2, 0.04, 0, -0.23, -5.62, backsplashMat);
addBox('upperCabinetBank', 5.9, 0.84, 0.22, 0, 0.92, -5.54, cabinetMat);
addBox('floatingBronzeShelf', 4.4, 0.04, 0.34, 0, 0.28, -5.32, bronzeMat);

for (let i = -3; i <= 3; i++) {
  addBox(`rearCabinetReveal_${i}`, 0.012, 0.76, 0.024, i * 0.82, 0.92, -5.40, bronzeMat);
  addBox(`baseCabinetReveal_${i}`, 0.012, 0.42, 0.024, i * 0.82, -1.19, -4.86, bronzeMat);
}

const vesselMat = new THREE.MeshStandardMaterial({
  color: 0x2b2117,
  roughness: 0.52,
  metalness: 0.12,
});
const vesselGeo = new THREE.CylinderGeometry(0.16, 0.11, 0.18, radialSegments);
const vessel = new THREE.Mesh(vesselGeo, vesselMat);
vessel.name = 'counterVessel';
vessel.position.set(-2.2, -0.71, -5.05);
vessel.castShadow = !isCompactViewport;
kitchenGroup.add(vessel);

const lowAccentLight = new THREE.PointLight(0xd6a763, 0.55, 5, 2.4);
lowAccentLight.name = 'kitchenWarmAccent';
lowAccentLight.position.set(-2.3, -0.55, -4.95);
scene.add(lowAccentLight);

// ---- ROTARY DIAL CONTROLLER ----
const dialGroup = new THREE.Group();
dialGroup.name = 'dialController';
dialGroup.position.set(1.42, 0.62, 1.05);
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
const poolGeo = new THREE.CircleGeometry(1.75, ringSegments);
const poolMat = new THREE.MeshStandardMaterial({
  color: getLampColor(),
  emissive: getLampColor(),
  emissiveIntensity: 0.15,
  transparent: true,
  opacity: 0.3,
  roughness: 0.9,
  metalness: 0.0,
});
const pool = new THREE.Mesh(poolGeo, poolMat);
pool.name = 'lightPool';
pool.rotation.x = -Math.PI / 2;
pool.position.set(0, -0.852, 0.28);
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

// Slider track
const sliderContainer = document.createElement('div');
sliderContainer.className = 'temperature-slider';
sliderContainer.style.cssText = `
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(20,20,20,0.85);
  border: 1px solid rgba(50,50,50,0.6);
  border-radius: 40px;
  padding: 10px 22px;
  backdrop-filter: blur(10px);
`;
uiContainer.appendChild(sliderContainer);

const warmLabel = document.createElement('span');
warmLabel.textContent = '2700K';
warmLabel.style.cssText = 'color: #c4956a; font-size: 11px; font-weight: 500; letter-spacing: 1px;';
sliderContainer.appendChild(warmLabel);

const slider = document.createElement('input');
slider.className = 'temperature-range';
slider.type = 'range';
slider.min = String(MIN_KELVIN);
slider.max = String(MAX_KELVIN);
slider.step = '50';
slider.value = String(DEFAULT_KELVIN);
slider.style.cssText = `
  -webkit-appearance: none;
  appearance: none;
  width: 220px;
  height: 3px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(to right, #c4956a, #e8d5b8, #ccd8e8, #a0b8d4);
`;
sliderContainer.appendChild(slider);

const coolLabel = document.createElement('span');
coolLabel.textContent = '6500K';
coolLabel.style.cssText = 'color: #a0b8d4; font-size: 11px; font-weight: 500; letter-spacing: 1px;';
sliderContainer.appendChild(coolLabel);

const inputRow = document.createElement('div');
inputRow.className = 'temperature-input-row';
inputRow.style.cssText = `
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: min(360px, 88vw);
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
  input.type = 'number';
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
  `;
  fieldWrap.appendChild(unit);

  wrap.appendChild(fieldWrap);
  inputRow.appendChild(wrap);
  return input;
}

const kelvinInput = addMetricInput('Colour temperature', 'K', {
  min: MIN_KELVIN,
  max: MAX_KELVIN,
  step: 50,
  value: DEFAULT_KELVIN,
});

const lumenInput = addMetricInput('Luminous output', 'lm', {
  min: MIN_LUMENS,
  max: MAX_LUMENS,
  step: 50,
  value: DEFAULT_LUMENS,
});

// Style the slider thumb
const styleSheet = document.createElement('style');
styleSheet.textContent = `
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
    .temperature-slider {
      width: min(100%, 360px);
      justify-content: center;
      gap: 9px !important;
      padding: 9px 12px !important;
    }
    .temperature-range {
      width: min(42vw, 190px) !important;
    }
    .temperature-slider span {
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
label.textContent = 'Colour Temperature';
uiContainer.appendChild(label);

function setTargetKelvin(value, syncControls = true) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return;
  targetKelvin = Math.round(THREE.MathUtils.clamp(parsed, MIN_KELVIN, MAX_KELVIN));
  if (syncControls) {
    slider.value = String(targetKelvin);
    kelvinInput.value = String(targetKelvin);
  }
}

function setTargetLumens(value, syncControls = true) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return;
  targetLumens = Math.round(THREE.MathUtils.clamp(parsed, MIN_LUMENS, MAX_LUMENS));
  if (syncControls) {
    lumenInput.value = String(targetLumens);
  }
}

slider.addEventListener('input', (e) => {
  setTargetKelvin(e.target.value, false);
  kelvinInput.value = String(targetKelvin);
});

kelvinInput.addEventListener('input', (e) => {
  if (e.target.value === '') return;
  setTargetKelvin(e.target.value);
});
kelvinInput.addEventListener('blur', (e) => {
  setTargetKelvin(e.target.value || DEFAULT_KELVIN);
});

lumenInput.addEventListener('input', (e) => {
  if (e.target.value === '') return;
  setTargetLumens(e.target.value, false);
});
lumenInput.addEventListener('blur', (e) => {
  setTargetLumens(e.target.value || DEFAULT_LUMENS);
});

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
  coneMat.opacity = THREE.MathUtils.clamp((0.008 + warmth * 0.014) * perceivedOutput, 0.008, 0.06);

  poolMat.opacity = THREE.MathUtils.clamp((0.18 + warmth * 0.18) * perceivedOutput, 0.16, 0.72);
  poolMat.emissiveIntensity = THREE.MathUtils.clamp((0.1 + warmth * 0.14) * perceivedOutput, 0.08, 0.5);
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
