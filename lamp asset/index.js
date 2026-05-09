import * as THREE from 'three';

// Scene setup
const isCompactViewport = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
const maxPixelRatio = isCompactViewport ? 1.2 : 1.5;
const radialSegments = isCompactViewport ? 24 : 40;
const ringSegments = isCompactViewport ? 32 : 48;
const shadowSize = isCompactViewport ? 512 : 1024;
const cameraTarget = new THREE.Vector3(0, 0.5, 0);

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
let colorTemp = 0.3; // 0 = warm (2700K), 1 = cool (6500K)
let targetColorTemp = 0.3;

function kelvinToRGB(kelvin) {
  const temp = kelvin / 100;
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
  return new THREE.Color(
    Math.min(255, Math.max(0, r)) / 255,
    Math.min(255, Math.max(0, g)) / 255,
    Math.min(255, Math.max(0, b)) / 255
  );
}

function getLampColor() {
  const kelvin = 2700 + colorTemp * (6500 - 2700);
  return kelvinToRGB(kelvin);
}

function getKelvinValue() {
  return Math.round(2700 + colorTemp * (6500 - 2700));
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

// ---- ROTARY DIAL CONTROLLER ----
const dialGroup = new THREE.Group();
dialGroup.name = 'dialController';
dialGroup.position.set(1.8, 0.05, 1.5);
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

// ---- FLOOR LIGHT POOL (subtle circle of light on floor) ----
const poolGeo = new THREE.CircleGeometry(2.0, ringSegments);
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
pool.position.y = -1.49;
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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  user-select: none;
`;
document.body.appendChild(uiContainer);

// Kelvin display
const kelvinDisplay = document.createElement('div');
kelvinDisplay.className = 'temperature-readout';
kelvinDisplay.style.cssText = `
  color: #888;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 2px;
  text-transform: uppercase;
`;
kelvinDisplay.textContent = `${getKelvinValue()}K`;
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
slider.min = '0';
slider.max = '100';
slider.value = '30';
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

// Event
slider.addEventListener('input', (e) => {
  targetColorTemp = parseInt(e.target.value) / 100;
});

// ---- UPDATE FUNCTION ----
function updateLampColor() {
  colorTemp += (targetColorTemp - colorTemp) * 0.05;
  const color = getLampColor();

  lampLight.color.copy(color);
  fillLight.color.copy(color);
  spotLight.color.copy(color);

  diffuserMat.emissive.copy(color);
  glowMat.color.copy(color);
  coneMat.color.copy(color);
  ledMat.color.copy(color);
  poolMat.color.copy(color);
  poolMat.emissive.copy(color);

  kelvinDisplay.textContent = `${getKelvinValue()}K`;

  // Rotate dial indicator
  const dialAngle = colorTemp * Math.PI * 1.5 - Math.PI * 0.75;
  indicator.position.x = Math.cos(-dialAngle) * 0.1;
  indicator.position.z = Math.sin(-dialAngle) * 0.1;
  indicator.rotation.y = dialAngle;

  const warmth = 1 - colorTemp;

  // Adjust light intensity subtly
  lampLight.intensity = 12 + warmth * 6;
  spotLight.intensity = 16 + warmth * 8;

  // Adjust volumetric cone opacity
  coneMat.opacity = 0.012 + warmth * 0.015;

  // Pool glow
  poolMat.opacity = 0.2 + warmth * 0.2;
  poolMat.emissiveIntensity = 0.1 + warmth * 0.15;
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
