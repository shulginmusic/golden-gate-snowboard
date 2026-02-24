// ═══════════════════════════════════════════════════════════════
//  GOLDEN GATE SNOWBOARD — San Francisco, February 5, 1976
//  Twin Peaks → Castro → Mission → Haight → Embarcadero → Bay
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ── Constants ────────────────────────────────────────────────
const CHUNK_WIDTH = 80;
const CHUNK_DEPTH = 80;
const CHUNK_SEGMENTS = 40;
const CHUNK_COUNT = 8;
const MAX_LIVES = 3;
const SNOWFLAKE_CHAR = '\u2744';
const PLAYER_HALF_W = 0.4;
const PLAYER_HALF_H = 0.75;
const PLAYER_HALF_D = 0.6;
const TOTAL_GAME_LENGTH = 6400;

// ── Zone Definitions ─────────────────────────────────────────
const ZONES = [
  {
    id: 'twin_peaks', name: 'TWIN PEAKS',
    zStart: 0, zEnd: 1280,
    streetWidth: 30, buildingInset: 16,
    obstaclesPerChunk: [2, 3], collectiblesPerChunk: [3, 4],
    slopeMultiplier: 0.08, hillAmplitude: 14, hillFreqX: 0.025, hillFreqZ: 0.018, flatness: 0.0,
    obstacleWeights: { trolley: 0, car: 0.3, pedestrian: 0.7, tacoTruck: 0, vwVan: 0 },
    buildingType: 'generic', victorianDensity: 0.1,
    fogColor: 0x87ceeb, fogDensity: 0.003, skyColor: 0x87ceeb,
    hasRainbowCrosswalks: false, hasMurals: false,
  },
  {
    id: 'castro', name: 'THE CASTRO',
    zStart: 1280, zEnd: 2400,
    streetWidth: 18, buildingInset: 10,
    obstaclesPerChunk: [3, 5], collectiblesPerChunk: [2, 3],
    slopeMultiplier: 0.11, hillAmplitude: 10, hillFreqX: 0.03, hillFreqZ: 0.025, flatness: 0.2,
    obstacleWeights: { trolley: 0.25, car: 0.3, pedestrian: 0.45, tacoTruck: 0, vwVan: 0 },
    buildingType: 'victorian', victorianDensity: 0.85,
    fogColor: 0x7ec8e3, fogDensity: 0.003, skyColor: 0x7ec8e3,
    hasRainbowCrosswalks: true, hasMurals: false,
  },
  {
    id: 'mission', name: 'THE MISSION',
    zStart: 2400, zEnd: 3520,
    streetWidth: 14, buildingInset: 8,
    obstaclesPerChunk: [4, 7], collectiblesPerChunk: [2, 3],
    slopeMultiplier: 0.12, hillAmplitude: 8, hillFreqX: 0.035, hillFreqZ: 0.03, flatness: 0.3,
    obstacleWeights: { trolley: 0.1, car: 0.3, pedestrian: 0.3, tacoTruck: 0.3, vwVan: 0 },
    buildingType: 'mural', victorianDensity: 0.3,
    fogColor: 0x80c4e0, fogDensity: 0.003, skyColor: 0x80c4e0,
    hasRainbowCrosswalks: false, hasMurals: true,
  },
  {
    id: 'haight', name: 'THE HAIGHT',
    zStart: 3520, zEnd: 4640,
    streetWidth: 12, buildingInset: 7,
    obstaclesPerChunk: [5, 9], collectiblesPerChunk: [2, 2],
    slopeMultiplier: 0.16, hillAmplitude: 14, hillFreqX: 0.04, hillFreqZ: 0.035, flatness: 0.1,
    obstacleWeights: { trolley: 0.05, car: 0.2, pedestrian: 0.3, tacoTruck: 0, vwVan: 0.45 },
    buildingType: 'psychedelic', victorianDensity: 0.7,
    fogColor: 0x88b8d8, fogDensity: 0.003, skyColor: 0x88b8d8,
    hasRainbowCrosswalks: false, hasMurals: false,
  },
  {
    id: 'embarcadero', name: 'EMBARCADERO',
    zStart: 4640, zEnd: 5760,
    streetWidth: 22, buildingInset: 12,
    obstaclesPerChunk: [6, 10], collectiblesPerChunk: [1, 2],
    slopeMultiplier: 0.03, hillAmplitude: 1, hillFreqX: 0.01, hillFreqZ: 0.01, flatness: 0.85,
    obstacleWeights: { trolley: 0.2, car: 0.5, pedestrian: 0.3, tacoTruck: 0, vwVan: 0 },
    buildingType: 'pier', victorianDensity: 0,
    fogColor: 0x6eb5d9, fogDensity: 0.003, skyColor: 0x6eb5d9,
    hasRainbowCrosswalks: false, hasMurals: false,
  },
  {
    id: 'bay', name: 'THE BAY',
    zStart: 5760, zEnd: 6400,
    streetWidth: 10, buildingInset: 6,
    obstaclesPerChunk: [2, 4], collectiblesPerChunk: [1, 2],
    slopeMultiplier: 0.03, hillAmplitude: 0, hillFreqX: 0, hillFreqZ: 0, flatness: 1.0,
    obstacleWeights: { trolley: 0, car: 0.2, pedestrian: 0.8, tacoTruck: 0, vwVan: 0 },
    buildingType: 'pier', victorianDensity: 0,
    fogColor: 0x60a8d0, fogDensity: 0.003, skyColor: 0x60a8d0,
    hasRainbowCrosswalks: false, hasMurals: false,
  },
];

function getZoneForZ(z) {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    if (z >= ZONES[i].zStart) return ZONES[i];
  }
  return ZONES[0];
}

function getZoneBlend(z) {
  const zone = getZoneForZ(z);
  const idx = ZONES.indexOf(zone);
  const nextZone = ZONES[Math.min(idx + 1, ZONES.length - 1)];
  const transitionWidth = 80;
  const distFromEnd = zone.zEnd - z;
  if (distFromEnd < transitionWidth && idx < ZONES.length - 1) {
    const t = 1 - (distFromEnd / transitionWidth);
    return { current: zone, next: nextZone, t: smoothstep(0, 1, t) };
  }
  return { current: zone, next: zone, t: 0 };
}

// ── Game State ───────────────────────────────────────────────
const GameState = { MENU: 0, PLAYING: 1, GAMEOVER: 2, WIN: 3 };
let state = GameState.MENU;
let score = 0;
let distance = 0;
let lives = MAX_LIVES;
let bonusTimer = 0;
let invincibleTimer = 0;
let currentZone = ZONES[0];
let previousZoneName = '';
let zoneBannerTimer = 0;
let finishBoat = null;
let waterPlane = null;

// ── Utilities ────────────────────────────────────────────────
function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise2D(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function fract(x) { return x - Math.floor(x); }

function seededRandom(seed) {
  let s = Math.abs(seed) + 1;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }

function disposeObject(obj) {
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
    // Don't dispose shared materials
  }
  if (obj.children) {
    for (let i = obj.children.length - 1; i >= 0; i--) {
      disposeObject(obj.children[i]);
    }
  }
}

// ── Terrain Height ───────────────────────────────────────────
function getHeight(x, z) {
  const blend = getZoneBlend(z);
  const zc = blend.current;
  const zn = blend.next;
  const t = blend.t;

  const slopeMult = lerp(zc.slopeMultiplier, zn.slopeMultiplier, t);
  const hillAmp = lerp(zc.hillAmplitude, zn.hillAmplitude, t);
  const freqX = lerp(zc.hillFreqX, zn.hillFreqX, t);
  const freqZ = lerp(zc.hillFreqZ, zn.hillFreqZ, t);
  const flat = lerp(zc.flatness, zn.flatness, t);

  // Smooth downhill slope — always goes down, never creates pits
  const baseSlope = -z * slopeMult;

  // Gentle rolling hills — only positive bumps, no valleys
  let hills = hillAmp * 0.5 * (1 + Math.sin(x * freqX + 1.0)) * (1 + Math.cos(z * freqZ)) * 0.25;
  hills += hillAmp * 0.25 * (1 + Math.sin(x * (freqX * 1.6) - 0.5)) * (1 + Math.sin(z * (freqZ * 1.67) + 2.0)) * 0.25;
  hills *= (1 - flat);

  // Very subtle surface texture (no dips)
  const noise = 0.15 * noise2D(x * 0.3, z * 0.3) * (1 - flat * 0.8);

  // Bay zone: gentle dip to water level
  let waterDip = 0;
  if (z > ZONES[5].zStart - 40) {
    const bayT = Math.min(1, (z - (ZONES[5].zStart - 40)) / 80);
    waterDip = -2 * bayT;
  }

  return baseSlope + hills + noise + waterDip;
}

function getTerrainNormal(x, z) {
  const eps = 0.5;
  const hL = getHeight(x - eps, z);
  const hR = getHeight(x + eps, z);
  const hD = getHeight(x, z - eps);
  const hU = getHeight(x, z + eps);
  return new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
}

// ── Three.js Setup ───────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x87ceeb, 0.003);
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 10, -5);

// Bright sunny winter day
const ambientLight = new THREE.AmbientLight(0xccddff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfff8e0, 0.9);
dirLight.position.set(-50, 100, -50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 500;
dirLight.shadow.camera.left = -100;
dirLight.shadow.camera.right = 100;
dirLight.shadow.camera.top = 100;
dirLight.shadow.camera.bottom = -100;
scene.add(dirLight);
scene.add(dirLight.target);

// ── Post-Processing ──────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.85
);
composer.addPass(bloomPass);

const seventiesShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignetteAmount: { value: 0.45 },
    warmth: { value: 0.07 },
    desaturation: { value: 0.12 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float vignetteAmount; uniform float warmth; uniform float desaturation;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(color.rgb, vec3(gray), desaturation);
      color.r += warmth; color.g += warmth * 0.5;
      vec2 center = vUv - 0.5; float dist = length(center);
      color.rgb *= 1.0 - vignetteAmount * dist * dist * 2.0;
      gl_FragColor = color;
    }`,
};
composer.addPass(new ShaderPass(seventiesShader));

// ── Shared Materials ─────────────────────────────────────────
const terrainMaterial = new THREE.MeshStandardMaterial({
  color: 0xe8e8f0, roughness: 0.9, metalness: 0.0, flatShading: true,
});

const victorianPastelColors = [0xf8b4c8, 0xd8b4f8, 0xb4f8d0, 0xfff8d0, 0xb4d8f8, 0xf8e8b4];
const psychedelicColors = [0xff44aa, 0xaa44ff, 0x44ffaa, 0xffaa44, 0x44aaff, 0xff6644];
const victorianTrimColors = [0xffffff, 0xf0e0c0, 0xd4a0a0, 0xa0b0d4];
const colors70sCars = [0x6b8e23, 0xcc6633, 0xdaa520, 0x8b4513, 0xb22222, 0xf5deb3];
const colorsBuildings = [0xd4a373, 0xa8b5a2, 0xc9b1a0, 0x8fa3b0, 0xe8d5b7, 0xb5838d];
const muralColors = [0xcc3344, 0x3344cc, 0x44cc33, 0xccaa33, 0xcc33aa, 0x33ccaa];
const vwColors = [0x44aa88, 0xdd8844, 0x8844aa, 0xaadd44, 0xdd4488];

const winMat = new THREE.MeshStandardMaterial({ color: 0x334455, flatShading: true });
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, flatShading: true });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x665544, flatShading: true });

// ── Terrain System ───────────────────────────────────────────
function createChunkGeometry(chunkZ) {
  const geo = new THREE.PlaneGeometry(CHUNK_WIDTH, CHUNK_DEPTH, CHUNK_SEGMENTS, CHUNK_SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + chunkZ;
    pos.setY(i, getHeight(x, z));
  }
  geo.computeVertexNormals();
  return geo;
}

const chunks = [];
let nextChunkZ = 0;

function initChunks() {
  for (let i = 0; i < CHUNK_COUNT; i++) {
    const z = i * CHUNK_DEPTH;
    const geo = createChunkGeometry(z);
    const mesh = new THREE.Mesh(geo, terrainMaterial);
    mesh.position.set(0, 0, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    const chunk = { mesh, zStart: z, obstacles: [], buildings: [], collectibles: [] };
    chunks.push(chunk);
    populateChunk(chunk);
  }
  nextChunkZ = CHUNK_COUNT * CHUNK_DEPTH;
}

function recycleChunk(chunk) {
  for (const obj of chunk.obstacles) { disposeObject(obj); scene.remove(obj); }
  for (const obj of chunk.buildings) { disposeObject(obj); scene.remove(obj); }
  for (const obj of chunk.collectibles) { disposeObject(obj); scene.remove(obj); }
  chunk.obstacles = [];
  chunk.buildings = [];
  chunk.collectibles = [];

  chunk.zStart = nextChunkZ;
  chunk.mesh.position.z = nextChunkZ;
  chunk.mesh.geometry.dispose();
  chunk.mesh.geometry = createChunkGeometry(nextChunkZ);
  nextChunkZ += CHUNK_DEPTH;
  populateChunk(chunk);
}

function updateChunks(playerZ) {
  for (const chunk of chunks) {
    if (chunk.zStart + CHUNK_DEPTH < playerZ - CHUNK_DEPTH) {
      recycleChunk(chunk);
    }
  }
}

// ── Building Factories ───────────────────────────────────────

function createVictorianHouse(rng, colorOverride) {
  const g = new THREE.Group();
  const bodyColor = colorOverride || victorianPastelColors[Math.floor(rng() * victorianPastelColors.length)];
  const trimColor = victorianTrimColors[Math.floor(rng() * victorianTrimColors.length)];

  const width = 4 + rng() * 2;
  const height = 5 + rng() * 3;
  const depth = 5 + rng() * 2;

  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, flatShading: true });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, flatShading: true });

  // Main body
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bodyMat);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Peaked roof
  const roofHeight = 2 + rng() * 1.5;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-width / 2 - 0.3, 0);
  roofShape.lineTo(0, roofHeight);
  roofShape.lineTo(width / 2 + 0.3, 0);
  roofShape.lineTo(-width / 2 - 0.3, 0);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: depth + 0.4, bevelEnabled: false });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, height, -depth / 2 - 0.2);
  g.add(roof);

  // Bay window
  const bayW = width * 0.4;
  const bayH = height * 0.45;
  const bayD = 1.0;
  const bayWindow = new THREE.Mesh(new THREE.BoxGeometry(bayW, bayH, bayD), bodyMat);
  bayWindow.position.set(0, height * 0.45, depth / 2 + bayD / 2);
  g.add(bayWindow);

  // Bay window panes
  for (let w = -1; w <= 1; w++) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(bayW * 0.25, bayH * 0.6, 0.05), winMat);
    pane.position.set(w * bayW * 0.3, height * 0.45, depth / 2 + bayD + 0.03);
    g.add(pane);
  }

  // Front steps
  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.2, 0.4), trimMat);
    step.position.set(0, s * 0.2 + 0.1, depth / 2 + bayD + 0.3 + s * 0.4);
    g.add(step);
  }

  // Trim bands
  const floors = Math.floor(height / 2.8);
  for (let f = 0; f <= floors; f++) {
    const trimStrip = new THREE.Mesh(new THREE.BoxGeometry(width + 0.15, 0.1, depth + 0.15), trimMat);
    trimStrip.position.y = f * 2.8 + 0.05;
    g.add(trimStrip);
  }

  // Upper windows on sides
  for (let f = 1; f < floors; f++) {
    for (const side of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.45), winMat);
      win.position.set(side * (width / 2 + 0.03), f * 2.8 + 1.4, 0);
      g.add(win);
    }
  }

  return g;
}

function createGenericBuilding(rng) {
  const width = 3 + rng() * 5;
  const height = 4 + rng() * 12;
  const depth = 3 + rng() * 5;
  const color = colorsBuildings[Math.floor(rng() * colorsBuildings.length)];
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.position.y = height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const floors = Math.floor(height / 2.5);
  for (let f = 0; f < floors; f++) {
    for (let w = -1; w <= 1; w++) {
      if (rng() > 0.3) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.4), winMat);
        win.position.set(width / 2 + 0.03, -height / 2 + 1.5 + f * 2.5, w * 1.2);
        mesh.add(win);
        const win2 = win.clone();
        win2.position.x = -width / 2 - 0.03;
        mesh.add(win2);
      }
    }
  }
  return mesh;
}

function createPierBuilding(rng) {
  const g = new THREE.Group();
  const width = 6 + rng() * 8;
  const height = 4 + rng() * 3;
  const depth = 8 + rng() * 6;
  const mat = new THREE.MeshStandardMaterial({ color: 0x998877, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  body.position.y = height / 2;
  body.castShadow = true;
  g.add(body);

  const roofLip = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.4, 0.3, depth + 0.4),
    new THREE.MeshStandardMaterial({ color: 0x777766, flatShading: true })
  );
  roofLip.position.y = height + 0.15;
  g.add(roofLip);

  const doorMat = new THREE.MeshStandardMaterial({ color: 0x556655, flatShading: true });
  const doorCount = Math.max(1, Math.floor(width / 3));
  for (let d = 0; d < doorCount; d++) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.1), doorMat);
    door.position.set(-width / 2 + 2 + d * 3, 1.25, depth / 2 + 0.05);
    g.add(door);
  }
  return g;
}

// ── Obstacle Factories ───────────────────────────────────────

function createTrolley() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdd6611, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 5), bodyMat);
  body.position.y = 1.2; body.castShadow = true; g.add(body);

  const roofMatT = new THREE.MeshStandardMaterial({ color: 0xeecc88, flatShading: true });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 5.2), roofMatT);
  roof.position.y = 2.2; g.add(roof);

  for (const side of [-1, 1]) {
    for (let i = -1.5; i <= 1.5; i += 1) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.7), winMat);
      win.position.set(side * 1.12, 1.4, i); g.add(win);
    }
  }
  for (const xOff of [-0.9, 0.9]) {
    for (const zOff of [-1.8, 1.8]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 6), wheelMat);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(xOff, 0.3, zOff); g.add(wheel);
    }
  }
  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(2.4, 2.4, 5.4)
  );
  return g;
}

function createCar() {
  const g = new THREE.Group();
  const color = colors70sCars[Math.floor(Math.random() * colors70sCars.length)];
  const bodyMat = new THREE.MeshStandardMaterial({ color, flatShading: true });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 3.5), bodyMat);
  body.position.y = 0.6; body.castShadow = true; g.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.65, 1.8), bodyMat);
  cabin.position.set(0, 1.35, -0.2); g.add(cabin);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.05), winMat);
  windshield.position.set(0, 1.3, -1.1); g.add(windshield);

  for (const xOff of [-0.85, 0.85]) {
    for (const zOff of [-1.2, 1.2]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 6), wheelMat);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(xOff, 0.25, zOff); g.add(wheel);
    }
  }
  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 0.8, 0), new THREE.Vector3(2.0, 1.8, 3.8)
  );
  return g;
}

function createPedestrian() {
  const g = new THREE.Group();
  const jacketColors = [0x883322, 0x225577, 0x556633, 0x774433, 0x993366];
  const jacketColor = jacketColors[Math.floor(Math.random() * jacketColors.length)];
  const bodyMat = new THREE.MeshStandardMaterial({ color: jacketColor, flatShading: true });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 6), bodyMat);
  body.position.y = 0.85; g.add(body);

  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88, flatShading: true });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), headMat);
  head.position.y = 1.35; g.add(head);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x333344, flatShading: true });
  for (const xOff of [-0.08, 0.08]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5), legMat);
    leg.position.set(xOff, 0.25, 0); g.add(leg);
  }

  const umbrellaColors = [0xcc2222, 0x2244aa, 0x22aa44, 0xaa8822];
  const umbrellaColor = umbrellaColors[Math.floor(Math.random() * umbrellaColors.length)];
  const umbrellaMat = new THREE.MeshStandardMaterial({ color: umbrellaColor, flatShading: true, side: THREE.DoubleSide });
  const umbrella = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.3, 8, 1, true), umbrellaMat);
  umbrella.rotation.x = Math.PI; umbrella.position.set(0.1, 1.75, 0); g.add(umbrella);

  const handleMat = new THREE.MeshStandardMaterial({ color: 0x444444, flatShading: true });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 4), handleMat);
  handle.position.set(0.1, 1.45, 0); g.add(handle);

  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 0.75, 0), new THREE.Vector3(0.6, 1.5, 0.6)
  );
  return g;
}

function createTacoTruck() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, flatShading: true });
  const awningMat = new THREE.MeshStandardMaterial({ color: 0xdd4422, flatShading: true });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 4.0), bodyMat);
  body.position.y = 1.5; body.castShadow = true; g.add(body);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.6, 1.5), bodyMat);
  cab.position.set(0, 1.2, -2.5); g.add(cab);

  const serviceWin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 1.5), winMat);
  serviceWin.position.set(1.13, 1.8, 0.3); g.add(serviceWin);

  const awning = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 1.8), awningMat);
  awning.position.set(1.4, 2.5, 0.3); g.add(awning);

  for (const xOff of [-0.95, 0.95]) {
    for (const zOff of [-1.5, 1.5]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 6), wheelMat);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(xOff, 0.3, zOff); g.add(wheel);
    }
  }
  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(2.4, 3.0, 4.2)
  );
  return g;
}

function createVWVan() {
  const g = new THREE.Group();
  const color = vwColors[Math.floor(Math.random() * vwColors.length)];
  const bodyMat = new THREE.MeshStandardMaterial({ color, flatShading: true });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf0f0e8, flatShading: true });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 3.2), bodyMat);
  body.position.y = 1.3; body.castShadow = true; g.add(body);

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 3.0), whiteMat);
  top.position.y = 2.6; g.add(top);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.05), winMat);
  windshield.position.set(0, 2.2, -1.62); g.add(windshield);

  // Peace symbol on side (simple circle + lines)
  const peaceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
  const peaceCircle = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.42, 12), peaceMat);
  peaceCircle.position.set(1.01, 1.5, 0); peaceCircle.rotation.y = Math.PI / 2;
  g.add(peaceCircle);

  for (const xOff of [-0.9, 0.9]) {
    for (const zOff of [-1.1, 1.1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 6), wheelMat);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(xOff, 0.3, zOff); g.add(wheel);
    }
  }
  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(2.2, 3.2, 3.6)
  );
  return g;
}

// ── Decorations ──────────────────────────────────────────────

function createRainbowCrosswalk() {
  const g = new THREE.Group();
  const rainbowColors = [0xff0000, 0xff8800, 0xffff00, 0x00cc00, 0x0000ff, 0x8800aa];
  for (let i = 0; i < rainbowColors.length; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.02, 0.5),
      new THREE.MeshStandardMaterial({ color: rainbowColors[i] })
    );
    stripe.position.z = (i - 2.5) * 0.65;
    g.add(stripe);
  }
  return g;
}

function addMuralToBuilding(building, rng) {
  const count = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const color = muralColors[Math.floor(rng() * muralColors.length)];
    const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
    const w = 0.8 + rng() * 1.5;
    const h = 0.8 + rng() * 2;
    const mural = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, w), mat);
    mural.position.set(3 + rng(), 1 + rng() * 3, (rng() - 0.5) * 3);
    building.add(mural);
  }
}

function createSnowflakeCollectible() {
  const geo = new THREE.OctahedronGeometry(0.35, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xaaccff, emissiveIntensity: 0.6, flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.isCollectible = true;
  mesh.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.7, 0.7, 0.7)
  );
  return mesh;
}

// ── Populate Chunk (Zone-Aware) ──────────────────────────────

function populateChunk(chunk) {
  const rng = seededRandom(chunk.zStart * 137 + 42);
  const zMin = chunk.zStart;
  const zone = getZoneForZ(zMin + CHUNK_DEPTH / 2);

  // Don't populate past game end
  if (zMin >= TOTAL_GAME_LENGTH + CHUNK_DEPTH) return;

  const halfStreet = zone.streetWidth / 2;

  // ── Obstacles ──
  const [minObs, maxObs] = zone.obstaclesPerChunk;
  const obstacleCount = minObs + Math.floor(rng() * (maxObs - minObs + 1));

  for (let i = 0; i < obstacleCount; i++) {
    const r = rng();
    let obj;
    const w = zone.obstacleWeights;
    let cum = 0;
    if (r < (cum += w.trolley)) obj = createTrolley();
    else if (r < (cum += w.car)) obj = createCar();
    else if (r < (cum += w.pedestrian)) obj = createPedestrian();
    else if (r < (cum += w.tacoTruck)) obj = createTacoTruck();
    else obj = createVWVan();

    const x = (rng() - 0.5) * halfStreet * 1.4;
    const z = zMin + rng() * CHUNK_DEPTH;
    obj.position.set(x, getHeight(x, z), z);
    obj.rotation.y = rng() * Math.PI * 2;
    scene.add(obj);
    chunk.obstacles.push(obj);
  }

  // ── Buildings on both sides ──
  const buildingsPerSide = 3 + Math.floor(rng() * 3);
  for (const side of [-1, 1]) {
    for (let i = 0; i < buildingsPerSide; i++) {
      let building;
      const vRoll = rng();

      if (zone.buildingType === 'victorian' || (zone.victorianDensity > 0 && vRoll < zone.victorianDensity)) {
        building = createVictorianHouse(rng);
      } else if (zone.buildingType === 'psychedelic') {
        const psychColor = psychedelicColors[Math.floor(rng() * psychedelicColors.length)];
        building = createVictorianHouse(rng, psychColor);
      } else if (zone.buildingType === 'pier') {
        building = createPierBuilding(rng);
      } else if (zone.buildingType === 'mural') {
        if (vRoll < zone.victorianDensity) {
          building = createVictorianHouse(rng);
        } else {
          building = createGenericBuilding(rng);
        }
      } else {
        building = createGenericBuilding(rng);
      }

      const x = side * (zone.buildingInset + rng() * 4);
      const z = zMin + (i / buildingsPerSide) * CHUNK_DEPTH + rng() * (CHUNK_DEPTH / buildingsPerSide) * 0.8;
      building.position.set(x, getHeight(x, z), z);
      building.rotation.y = side > 0 ? Math.PI * 0.5 + rng() * 0.2 : -Math.PI * 0.5 + rng() * 0.2;
      scene.add(building);
      chunk.buildings.push(building);

      // Add murals in Mission zone
      if (zone.hasMurals && rng() > 0.5) {
        addMuralToBuilding(building, rng);
      }
    }
  }

  // ── Rainbow crosswalks (Castro) ──
  if (zone.hasRainbowCrosswalks && rng() > 0.4) {
    const cw = createRainbowCrosswalk();
    const z = zMin + rng() * CHUNK_DEPTH;
    cw.position.set(0, getHeight(0, z) + 0.05, z);
    scene.add(cw);
    chunk.buildings.push(cw);
  }

  // ── Collectibles ──
  const [minCol, maxCol] = zone.collectiblesPerChunk;
  const collectibleCount = minCol + Math.floor(rng() * (maxCol - minCol + 1));
  const spreadFactor = zone.streetWidth / 30;
  for (let i = 0; i < collectibleCount; i++) {
    const sf = createSnowflakeCollectible();
    const x = (rng() - 0.5) * 20 * spreadFactor;
    const z = zMin + rng() * CHUNK_DEPTH;
    sf.position.set(x, getHeight(x, z) + 1.5, z);
    scene.add(sf);
    chunk.collectibles.push(sf);
  }

  // ── Finish boat (Bay zone) ──
  if (zone.id === 'bay' && zMin <= TOTAL_GAME_LENGTH && zMin + CHUNK_DEPTH >= TOTAL_GAME_LENGTH) {
    const boat = createFerryBoat();
    const boatZ = TOTAL_GAME_LENGTH;
    boat.position.set(0, getHeight(0, boatZ) + 1.5, boatZ);
    boat.userData.isFinish = true;
    scene.add(boat);
    chunk.obstacles.push(boat);
    finishBoat = boat;
  }
}

// ── Landmarks ────────────────────────────────────────────────

function createGoldenGateBridge() {
  const g = new THREE.Group();
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, flatShading: true });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x555555, flatShading: true });

  for (const xOff of [-20, 20]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 80, 3), bridgeMat);
    tower.position.set(xOff, 40, 0); tower.castShadow = true; g.add(tower);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3), bridgeMat);
    cross.position.set(xOff, 72, 0); g.add(cross);
  }

  const deck = new THREE.Mesh(new THREE.BoxGeometry(44, 2, 8), deckMat);
  deck.position.y = 18; g.add(deck);

  for (const side of [-18, 18]) {
    const cablePoints = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      cablePoints.push(new THREE.Vector3(side, 72 - 50 * Math.sin(t * Math.PI), -4 + t * 8));
    }
    const curve = new THREE.CatmullRomCurve3(cablePoints);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.2, 4, false), bridgeMat);
    g.add(cable);
  }

  return g;
}

function createSutroTower() {
  const g = new THREE.Group();
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, flatShading: true });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, flatShading: true });

  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 90, 1.5), towerMat);
  trunk.position.y = 45; g.add(trunk);

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 40, 0.8), whiteMat);
    leg.position.set(Math.cos(angle) * 4, 15, Math.sin(angle) * 4);
    leg.rotation.z = -Math.cos(angle) * 0.15;
    leg.rotation.x = Math.sin(angle) * 0.15;
    g.add(leg);
  }

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const prong = new THREE.Mesh(new THREE.BoxGeometry(0.4, 25, 0.4), towerMat);
    prong.position.set(Math.cos(angle) * 2.5, 78, Math.sin(angle) * 2.5);
    g.add(prong);
  }

  for (let h = 15; h < 70; h += 18) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 6), whiteMat);
    cross.position.y = h; g.add(cross);
  }
  return g;
}

function createFerryBuilding() {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, flatShading: true });
  const roofMatF = new THREE.MeshStandardMaterial({ color: 0x888888, flatShading: true });
  const clockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });

  const main = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 30), wallMat);
  main.position.y = 4; main.castShadow = true; g.add(main);

  const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 20, 4), wallMat);
  tower.position.y = 14; g.add(tower);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(3, 8, 4), roofMatF);
  spire.position.y = 28; spire.rotation.y = Math.PI / 4; g.add(spire);

  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(1.5, 12), clockMat);
  clockFace.position.set(0, 18, 2.05); g.add(clockFace);

  const archMat = new THREE.MeshStandardMaterial({ color: 0x443322, flatShading: true });
  for (let i = -4; i <= 4; i++) {
    if (Math.abs(i) <= 1) continue;
    const arch = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, 0.5), archMat);
    arch.position.set(0, 2, i * 3); g.add(arch);
  }
  return g;
}

function createFerryBoat() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, flatShading: true });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x886644, flatShading: true });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, flatShading: true });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 12), hullMat);
  hull.position.y = 1; g.add(hull);

  // Bow
  const bow = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 4), hullMat);
  bow.rotation.x = -Math.PI / 2; bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 1, 8); g.add(bow);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.2, 11), deckMat);
  deck.position.y = 2.1; g.add(deck);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 5), cabinMat);
  cabin.position.set(0, 3.4, -1); cabin.castShadow = true; g.add(cabin);

  const stackMat = new THREE.MeshStandardMaterial({ color: 0xdd4422, flatShading: true });
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 2.5, 6), stackMat);
  stack.position.set(0, 5.5, -1); g.add(stack);

  for (let i = -1; i <= 1; i++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.05), winMat);
    w.position.set(i * 1.5, 3.8, 1.55); g.add(w);
  }

  const railMat = new THREE.MeshStandardMaterial({ color: 0x888888, flatShading: true });
  for (const side of [-1, 1]) {
    for (let z = -4; z <= 4; z += 2) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 4), railMat);
      post.position.set(side * 2.5, 2.7, z); g.add(post);
    }
  }

  // "FERRY" sign — just a colored plate
  const signMat = new THREE.MeshStandardMaterial({ color: 0x224488, flatShading: true });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 0.1), signMat);
  sign.position.set(0, 4.8, 2.55); g.add(sign);

  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 2, 0), new THREE.Vector3(7, 5, 14)
  );
  g.userData.isFinish = true;
  return g;
}

// ── Water Plane ──────────────────────────────────────────────

function createWaterPlane() {
  const bayStart = ZONES[5].zStart;
  const bayEnd = ZONES[5].zEnd + 200;
  const length = bayEnd - bayStart + 200;
  const waterGeo = new THREE.PlaneGeometry(300, length);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2266aa, transparent: true, opacity: 0.65,
    roughness: 0.2, metalness: 0.3, side: THREE.DoubleSide,
  });
  waterPlane = new THREE.Mesh(waterGeo, waterMat);
  waterPlane.rotation.x = -Math.PI / 2;
  const waterY = getHeight(0, bayStart) + 0.3;
  waterPlane.position.set(0, waterY, (bayStart + bayEnd) / 2);
  scene.add(waterPlane);
}

// ── Fixed Landmarks ──────────────────────────────────────────

let goldenGateBridge, sutroTower, ferryBuildingLandmark;

function initLandmarks() {
  // Sutro Tower — visible from Twin Peaks area
  sutroTower = createSutroTower();
  const stX = 55, stZ = 200;
  sutroTower.position.set(stX, getHeight(stX, stZ), stZ);
  scene.add(sutroTower);

  // Golden Gate Bridge — behind/beside start, far in the distance
  goldenGateBridge = createGoldenGateBridge();
  goldenGateBridge.position.set(-200, 5, -100);
  goldenGateBridge.scale.set(2, 2, 2);
  scene.add(goldenGateBridge);

  // Ferry Building — midway through Embarcadero
  ferryBuildingLandmark = createFerryBuilding();
  const fbZ = ZONES[4].zStart + 500;
  ferryBuildingLandmark.position.set(18, getHeight(18, fbZ), fbZ);
  ferryBuildingLandmark.rotation.y = -Math.PI / 4;
  scene.add(ferryBuildingLandmark);
}

// ── Player ───────────────────────────────────────────────────

function createPlayer() {
  const g = new THREE.Group();
  const boardMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, flatShading: true });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 1.6), boardMat);
  board.position.y = 0.04; board.castShadow = true; g.add(board);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2255aa, flatShading: true });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.9, 6), bodyMat);
  body.position.y = 0.65; body.castShadow = true; g.add(body);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 5), bodyMat);
    arm.position.set(side * 0.32, 0.6, 0); arm.rotation.z = side * 0.4;
    arm.castShadow = true; g.add(arm);
  }

  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88, flatShading: true });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), headMat);
  head.position.y = 1.25; g.add(head);

  const beanieMat = new THREE.MeshStandardMaterial({ color: 0xdd6600, flatShading: true });
  const beanie = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), beanieMat
  );
  beanie.position.y = 1.32; g.add(beanie);

  const goggleMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, flatShading: true });
  const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.06), goggleMat);
  goggles.position.set(0, 1.27, -0.16); g.add(goggles);

  return g;
}

const player = createPlayer();
scene.add(player);

const playerState = {
  position: new THREE.Vector3(0, 0, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  rotation: 0,
  speed: 0.3,
  jumpVelocity: 0,
  grounded: true,
  groundY: 0,
};

// ── Input ────────────────────────────────────────────────────
const keys = { left: false, right: false, jump: false };

window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space') { keys.jump = true; e.preventDefault(); }
  if (e.code === 'Enter' && state === GameState.MENU) startGame();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space') keys.jump = false;
});

let touchLeft = false, touchRight = false, touchJump = false;
window.addEventListener('touchstart', (e) => {
  for (const touch of e.changedTouches) {
    const x = touch.clientX / window.innerWidth;
    const y = touch.clientY / window.innerHeight;
    if (y < 0.3) { touchJump = true; continue; }
    if (x < 0.5) touchLeft = true; else touchRight = true;
  }
  if (state === GameState.MENU) startGame();
});
window.addEventListener('touchend', (e) => {
  for (const touch of e.changedTouches) {
    const x = touch.clientX / window.innerWidth;
    const y = touch.clientY / window.innerHeight;
    if (y < 0.3) { touchJump = false; continue; }
    if (x < 0.5) touchLeft = false; else touchRight = false;
  }
});

// ── Camera ───────────────────────────────────────────────────
const cameraOffset = new THREE.Vector3(0, 5, -9);
const cameraLookAhead = new THREE.Vector3(0, 1, 4);

function updateCamera(dt) {
  const idealOffset = cameraOffset.clone();
  idealOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -playerState.rotation);
  idealOffset.add(playerState.position);
  camera.position.lerp(idealOffset, 4 * dt);

  const lookTarget = cameraLookAhead.clone();
  lookTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), -playerState.rotation);
  lookTarget.add(playerState.position);
  camera.lookAt(lookTarget);
}

// ── Player Update ────────────────────────────────────────────
function updatePlayer(dt) {
  const pos = playerState.position;
  const steerLeft = keys.left || touchLeft;
  const steerRight = keys.right || touchRight;
  const wantJump = keys.jump || touchJump;

  if (steerLeft) playerState.rotation += 2.2 * dt;
  if (steerRight) playerState.rotation -= 2.2 * dt;

  // Slope-based acceleration
  const hHere = getHeight(pos.x, pos.z);
  const lookZ = pos.z + Math.cos(playerState.rotation) * 1.0;
  const lookX = pos.x + Math.sin(playerState.rotation) * 1.0;
  const hAhead = getHeight(lookX, lookZ);
  const slope = (hAhead - hHere) / 1.0;

  playerState.speed += slope * -0.03;
  playerState.speed *= 0.997;
  playerState.speed = Math.max(0.15, Math.min(playerState.speed, 1.5));

  // Jump
  if (wantJump && playerState.grounded) {
    playerState.jumpVelocity = 8;
    playerState.grounded = false;
  }
  if (!playerState.grounded) {
    playerState.jumpVelocity -= 22 * dt;
  }

  // Move forward
  const moveSpeed = playerState.speed * 60 * dt;
  pos.z += Math.cos(playerState.rotation) * moveSpeed;
  pos.x += Math.sin(playerState.rotation) * moveSpeed;

  // Ground follow
  const groundY = getHeight(pos.x, pos.z);
  playerState.groundY = groundY;

  if (playerState.grounded) {
    pos.y = groundY;
    playerState.jumpVelocity = 0;
  } else {
    pos.y += playerState.jumpVelocity * dt;
    if (pos.y <= groundY) {
      pos.y = groundY;
      playerState.grounded = true;
      playerState.jumpVelocity = 0;
    }
  }

  // Zone-aware X clamp
  const zone = getZoneForZ(pos.z);
  const halfStreet = zone.streetWidth / 2;
  pos.x = Math.max(-halfStreet, Math.min(halfStreet, pos.x));

  // Update mesh
  player.position.copy(pos);
  player.rotation.y = -playerState.rotation;

  const turnAmount = (steerLeft ? 1 : 0) - (steerRight ? 1 : 0);
  player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, turnAmount * 0.25, 5 * dt);

  const normal = getTerrainNormal(pos.x, pos.z);
  const slopeAngleX = Math.atan2(normal.z, normal.y);
  player.rotation.x = THREE.MathUtils.lerp(player.rotation.x, -slopeAngleX * 0.5, 3 * dt);

  dirLight.position.set(pos.x - 50, pos.y + 100, pos.z - 50);
  dirLight.target.position.copy(pos);
  dirLight.target.updateMatrixWorld();
}

// ── Snow Particles ───────────────────────────────────────────
let snowParticles;
const SNOW_COUNT = 2000;

function createSnowParticles() {
  const positions = new Float32Array(SNOW_COUNT * 3);
  for (let i = 0; i < SNOW_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 1] = Math.random() * 35;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.18, transparent: true, opacity: 0.75, depthWrite: false,
  });
  snowParticles = new THREE.Points(geo, mat);
  scene.add(snowParticles);
}

function updateSnowParticles(dt) {
  if (!snowParticles) return;
  const pos = snowParticles.geometry.attributes.position;
  const pp = playerState.position;
  for (let i = 0; i < SNOW_COUNT; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    y -= (3 + Math.sin(i * 0.1) * 1) * dt;
    x += Math.sin(i * 0.3 + y * 0.5) * 0.3 * dt;
    z += 0.2 * dt;
    if (y < pp.y - 5) y = pp.y + 30;
    if (x < pp.x - 60) x += 120;
    if (x > pp.x + 60) x -= 120;
    if (z < pp.z - 60) z += 120;
    if (z > pp.z + 60) z -= 120;
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
}

// ── Collision Detection ──────────────────────────────────────
const _playerBox = new THREE.Box3();
const _obstacleBox = new THREE.Box3();

function checkCollisions() {
  const pp = playerState.position;
  _playerBox.min.set(pp.x - PLAYER_HALF_W, pp.y, pp.z - PLAYER_HALF_D);
  _playerBox.max.set(pp.x + PLAYER_HALF_W, pp.y + PLAYER_HALF_H * 2, pp.z + PLAYER_HALF_D);

  for (const chunk of chunks) {
    for (const obs of chunk.obstacles) {
      if (!obs.userData.bbox) continue;
      _obstacleBox.copy(obs.userData.bbox);
      _obstacleBox.min.add(obs.position);
      _obstacleBox.max.add(obs.position);

      if (_playerBox.intersectsBox(_obstacleBox)) {
        // Win condition: reached the ferry
        if (obs.userData.isFinish) {
          winGame();
          return;
        }
        if (invincibleTimer <= 0 && !obs.userData.hit) {
          obs.userData.hit = true;
          onCollision();
        }
      } else {
        const dist = pp.distanceTo(obs.position);
        if (dist < 3.0 && !obs.userData.nearMissAwarded && !obs.userData.isFinish) {
          if (pp.z > obs.position.z) {
            obs.userData.nearMissAwarded = true;
            score += 50;
            showBonus('GROOVY! +50');
          }
        }
      }
    }

    for (let i = chunk.collectibles.length - 1; i >= 0; i--) {
      const sf = chunk.collectibles[i];
      if (pp.distanceTo(sf.position) < 1.5) {
        scene.remove(sf);
        chunk.collectibles.splice(i, 1);
        score += 100;
        showBonus('+100');
      }
    }
  }
}

function onCollision() {
  lives--;
  invincibleTimer = 1.5;
  playerState.speed *= 0.4;
  updateLivesDisplay();
  renderer.domElement.style.boxShadow = 'inset 0 0 80px rgba(255,50,50,0.7)';
  setTimeout(() => { renderer.domElement.style.boxShadow = 'none'; }, 200);
  if (lives <= 0) endGame();
}

// ── Scoring & UI ─────────────────────────────────────────────
const hudEl = document.getElementById('hud');
const hudScore = document.getElementById('hud-score');
const hudDistance = document.getElementById('hud-distance');
const hudSpeed = document.getElementById('hud-speed');
const hudLives = document.getElementById('hud-lives');
const hudBonus = document.getElementById('hud-bonus');
const hudZone = document.getElementById('hud-zone');
const hudZoneBanner = document.getElementById('hud-zone-banner');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const winScreen = document.getElementById('win-screen');
const finalDistance = document.getElementById('final-distance');
const finalScore = document.getElementById('final-score');

const targetFogColor = new THREE.Color(ZONES[0].fogColor);
const targetSkyColor = new THREE.Color(ZONES[0].skyColor);
let targetFogDensity = ZONES[0].fogDensity;

function updateScore(dt) {
  distance += playerState.speed * 60 * dt * 3.28;
  score += playerState.speed * dt * 10;
  hudScore.textContent = Math.floor(score);
  hudDistance.textContent = Math.floor(distance) + ' ft';
  hudSpeed.textContent = 'SPEED: ' + Math.floor(playerState.speed * 100);
}

function updateLivesDisplay() {
  hudLives.textContent = SNOWFLAKE_CHAR.repeat(Math.max(0, lives));
}

function showBonus(text) {
  hudBonus.textContent = text;
  hudBonus.style.opacity = '1';
  bonusTimer = 0.8;
}

function updateBonusDisplay(dt) {
  if (bonusTimer > 0) {
    bonusTimer -= dt;
    if (bonusTimer <= 0) hudBonus.style.opacity = '0';
  }
}

function updateZoneHUD(dt) {
  const zone = getZoneForZ(playerState.position.z);

  if (zone.name !== previousZoneName) {
    previousZoneName = zone.name;
    currentZone = zone;

    // Show banner
    hudZoneBanner.textContent = zone.name;
    hudZoneBanner.style.opacity = '1';
    zoneBannerTimer = 2.5;

    // Update fog/sky targets
    targetFogColor.setHex(zone.fogColor);
    targetSkyColor.setHex(zone.skyColor);
    targetFogDensity = zone.fogDensity;
  }

  hudZone.textContent = zone.name;

  // Banner fade
  if (zoneBannerTimer > 0) {
    zoneBannerTimer -= dt;
    if (zoneBannerTimer <= 0.5) {
      hudZoneBanner.style.opacity = String(Math.max(0, zoneBannerTimer / 0.5));
    }
    if (zoneBannerTimer <= 0) hudZoneBanner.style.opacity = '0';
  }

  // Smooth fog/sky transition
  scene.fog.color.lerp(targetFogColor, 2 * dt);
  scene.background.lerp(targetSkyColor, 2 * dt);
  scene.fog.density = lerp(scene.fog.density, targetFogDensity, 2 * dt);
}

function updateCollectibles(dt, time) {
  for (const chunk of chunks) {
    for (const sf of chunk.collectibles) {
      sf.rotation.y += 2 * dt;
      sf.rotation.x += 0.5 * dt;
      sf.position.y = getHeight(sf.position.x, sf.position.z) + 1.5 + Math.sin(time * 3 + sf.position.x) * 0.3;
    }
  }
}

function updateFinishBoat(time) {
  if (finishBoat) {
    const baseY = getHeight(finishBoat.position.x, finishBoat.position.z) + 1.5;
    finishBoat.position.y = baseY + Math.sin(time * 1.5) * 0.3;
    finishBoat.rotation.z = Math.sin(time * 0.8) * 0.02;
  }
}

// ── Game State Machine ───────────────────────────────────────

function startGame() {
  if (state === GameState.PLAYING) return;

  score = 0;
  distance = 0;
  lives = MAX_LIVES;
  invincibleTimer = 0;
  bonusTimer = 0;
  zoneBannerTimer = 0;
  previousZoneName = '';
  currentZone = ZONES[0];
  finishBoat = null;

  playerState.position.set(0, getHeight(0, 0), 0);
  playerState.rotation = 0;
  playerState.speed = 0.3;
  playerState.jumpVelocity = 0;
  playerState.grounded = true;

  // Clean up old chunks
  for (const chunk of chunks) {
    scene.remove(chunk.mesh);
    chunk.mesh.geometry.dispose();
    for (const obj of chunk.obstacles) { disposeObject(obj); scene.remove(obj); }
    for (const obj of chunk.buildings) { disposeObject(obj); scene.remove(obj); }
    for (const obj of chunk.collectibles) { disposeObject(obj); scene.remove(obj); }
  }
  chunks.length = 0;
  nextChunkZ = 0;

  // Reset fog/sky
  scene.fog.color.setHex(ZONES[0].fogColor);
  scene.fog.density = ZONES[0].fogDensity;
  scene.background.setHex(ZONES[0].skyColor);
  targetFogColor.setHex(ZONES[0].fogColor);
  targetSkyColor.setHex(ZONES[0].skyColor);
  targetFogDensity = ZONES[0].fogDensity;

  initChunks();
  updateLivesDisplay();

  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  winScreen.style.display = 'none';
  hudEl.style.display = 'block';
  state = GameState.PLAYING;
}

function endGame() {
  state = GameState.GAMEOVER;
  hudEl.style.display = 'none';
  finalDistance.textContent = Math.floor(distance);
  finalScore.textContent = Math.floor(score);
  gameOverScreen.style.display = 'flex';
}

function winGame() {
  state = GameState.WIN;
  hudEl.style.display = 'none';
  document.getElementById('win-distance').textContent = Math.floor(distance);
  document.getElementById('win-score').textContent = Math.floor(score);
  document.getElementById('win-lives').textContent = Math.max(0, lives);
  winScreen.style.display = 'flex';
}

// ── Button Handlers ──────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('play-again-btn').addEventListener('click', startGame);

// ── Menu Camera ──────────────────────────────────────────────
function updateMenuCamera(time) {
  const radius = 30;
  camera.position.set(
    Math.sin(time * 0.3) * radius, 20 + Math.sin(time * 0.2) * 5, Math.cos(time * 0.3) * radius
  );
  camera.lookAt(0, 5, 10);
}

// ── Window Resize ────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// ── Init ─────────────────────────────────────────────────────
function init() {
  initChunks();
  initLandmarks();
  createSnowParticles();
  createWaterPlane();
  updateLivesDisplay();
  gameLoop();
}

// ── Game Loop ────────────────────────────────────────────────
const clock = new THREE.Clock();

function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  if (state === GameState.MENU) {
    updateMenuCamera(time);
  } else if (state === GameState.PLAYING) {
    updatePlayer(dt);
    updateChunks(playerState.position.z);
    updateCamera(dt);
    checkCollisions();
    updateCollectibles(dt, time);
    updateFinishBoat(time);
    updateScore(dt);
    updateBonusDisplay(dt);
    updateZoneHUD(dt);
    updateSnowParticles(dt);

    if (invincibleTimer > 0) {
      invincibleTimer -= dt;
      player.visible = Math.floor(invincibleTimer * 8) % 2 === 0;
    } else {
      player.visible = true;
    }
  }

  composer.render();
}

init();
