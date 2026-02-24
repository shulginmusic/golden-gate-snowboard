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
const OBSTACLE_DENSITY = 0.72;
const COLLECTIBLE_DENSITY = 1.5;
const BASE_SPEED = 0.34;
const MAX_SPEED = 1.35;
const SLOPE_ACCEL = -0.025;
const SPEED_DECAY = 0.996;
const KEY_STEER_RATE = 1.25;
const COLLECT_RADIUS = 2.35;
const COLLECTIBLE_BASE_SCORE = 250;
const ROUTE_TURNINESS = 0.55;
const MAX_FORWARD_YAW = 1.22;
const SHARP_CORNER_WIDTH = 72;
const SHARP_CORNERS = [
  { z: 980, dir: 1 },
  { z: 1920, dir: -1 },
  { z: 3060, dir: 1 },
  { z: 4260, dir: -1 },
  { z: 5380, dir: 1 },
];

// ── Zone Definitions ─────────────────────────────────────────
const ZONES = [
  {
    id: 'twin_peaks', name: 'TWIN PEAKS',
    zStart: 0, zEnd: 1280,
    streetWidth: 30, buildingInset: 16,
    obstaclesPerChunk: [2, 3], collectiblesPerChunk: [3, 4],
    slopeMultiplier: 0.08, hillAmplitude: 14, hillFreqX: 0.025, hillFreqZ: 0.018, flatness: 0.0,
    obstacleWeights: { car: 0.45, dogWalker: 0.25, limeScooter: 0.2, van: 0.1 },
    buildingType: 'victorian', victorianDensity: 0.95,
    fogColor: 0x87ceeb, fogDensity: 0.003, skyColor: 0x87ceeb,
    hasRainbowCrosswalks: false, hasMurals: false,
  },
  {
    id: 'castro', name: 'THE CASTRO',
    zStart: 1280, zEnd: 2400,
    streetWidth: 18, buildingInset: 10,
    obstaclesPerChunk: [3, 5], collectiblesPerChunk: [2, 3],
    slopeMultiplier: 0.11, hillAmplitude: 10, hillFreqX: 0.03, hillFreqZ: 0.025, flatness: 0.2,
    obstacleWeights: { car: 0.35, dogWalker: 0.35, limeScooter: 0.2, van: 0.1 },
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
    obstacleWeights: { car: 0.32, dogWalker: 0.28, limeScooter: 0.24, van: 0.16 },
    buildingType: 'mural', victorianDensity: 0.8,
    fogColor: 0x80c4e0, fogDensity: 0.003, skyColor: 0x80c4e0,
    hasRainbowCrosswalks: false, hasMurals: true,
  },
  {
    id: 'haight', name: 'THE HAIGHT',
    zStart: 3520, zEnd: 4640,
    streetWidth: 14, buildingInset: 7,
    obstaclesPerChunk: [5, 9], collectiblesPerChunk: [2, 2],
    slopeMultiplier: 0.16, hillAmplitude: 14, hillFreqX: 0.04, hillFreqZ: 0.035, flatness: 0.1,
    obstacleWeights: { car: 0.28, dogWalker: 0.27, limeScooter: 0.25, van: 0.2 },
    buildingType: 'psychedelic', victorianDensity: 1.0,
    fogColor: 0x88b8d8, fogDensity: 0.003, skyColor: 0x88b8d8,
    hasRainbowCrosswalks: false, hasMurals: false,
  },
  {
    id: 'embarcadero', name: 'EMBARCADERO',
    zStart: 4640, zEnd: 5760,
    streetWidth: 22, buildingInset: 12,
    obstaclesPerChunk: [6, 10], collectiblesPerChunk: [1, 2],
    slopeMultiplier: 0.03, hillAmplitude: 1, hillFreqX: 0.01, hillFreqZ: 0.01, flatness: 0.85,
    obstacleWeights: { car: 0.45, dogWalker: 0.25, limeScooter: 0.15, van: 0.15 },
    buildingType: 'pier', victorianDensity: 0,
    fogColor: 0x6eb5d9, fogDensity: 0.003, skyColor: 0x6eb5d9,
    hasRainbowCrosswalks: false, hasMurals: false,
  },
  {
    id: 'bay', name: 'THE BAY',
    zStart: 5760, zEnd: 6400,
    streetWidth: 12, buildingInset: 6,
    obstaclesPerChunk: [2, 4], collectiblesPerChunk: [1, 2],
    slopeMultiplier: 0.03, hillAmplitude: 0, hillFreqX: 0, hillFreqZ: 0, flatness: 1.0,
    obstacleWeights: { car: 0.3, dogWalker: 0.45, limeScooter: 0.2, van: 0.05 },
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

function getRouteTurnSignal(z) {
  return Math.sin(z * 0.0065) * 0.6 + Math.sin(z * 0.017 + 1.4) * 0.32;
}

function getSharpCornerSignal(z) {
  let signal = 0;
  for (const corner of SHARP_CORNERS) {
    const dz = z - corner.z;
    if (Math.abs(dz) > SHARP_CORNER_WIDTH) continue;
    const phase = 1 - Math.abs(dz) / SHARP_CORNER_WIDTH;
    signal += corner.dir * Math.sin(phase * Math.PI);
  }
  return THREE.MathUtils.clamp(signal, -1, 1);
}

function getRouteCenterX(z, zone) {
  const halfStreet = zone.streetWidth / 2;
  const rolling = getRouteTurnSignal(z) * halfStreet * 0.34;

  let cornerOffset = 0;
  for (const corner of SHARP_CORNERS) {
    const start = corner.z - SHARP_CORNER_WIDTH * 0.48;
    const end = corner.z + SHARP_CORNER_WIDTH * 0.48;
    const step = smoothstep(start, end, z);
    cornerOffset += corner.dir * step * halfStreet * 0.82;
  }

  const clampedOffset = THREE.MathUtils.clamp(cornerOffset, -halfStreet * 0.84, halfStreet * 0.84);
  return rolling + clampedOffset;
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
let collectibleCombo = 0;
let collectibleComboTimer = 0;
let carveSprayTimer = 0;

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
function wrapAngleRad(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

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
  const flat = lerp(zc.flatness, zn.flatness, t);

  // Base downhill grade.
  const baseSlope = -z * slopeMult;

  // One-way drop zones: each term only increases with z, so total height never ramps upward.
  const dropScale = 1 - flat * 0.7;
  const stagedDrops = (
    1.6 * smoothstep(260, 420, z)
    + 2.3 * smoothstep(860, 1060, z)
    + 1.9 * smoothstep(1460, 1660, z)
    + 2.7 * smoothstep(2260, 2480, z)
    + 2.2 * smoothstep(3140, 3380, z)
    + 2.9 * smoothstep(4020, 4250, z)
    + 2.4 * smoothstep(5000, 5250, z)
  ) * dropScale;
  const downhillDrops = -stagedDrops;

  // Side camber and cross-slope texture vary with x only, never creating uphill ramps.
  const camberStrength = (0.032 + hillAmp * 0.0014) * (1 - flat * 0.65);
  const routeCamber = x * camberStrength;

  let hills = hillAmp * 0.22 * Math.sin(x * freqX + 0.9) * (1 - flat * 0.72);
  hills += hillAmp * 0.1 * Math.sin(x * (freqX * 2.1) - 1.2) * (1 - flat * 0.78);

  const noise = (noise2D(x * 0.3, 11.17) - 0.5) * 0.22 * (1 - flat * 0.8);

  // Bay zone: gentle dip to water level
  let waterDip = 0;
  if (z > ZONES[5].zStart - 40) {
    const bayT = Math.min(1, (z - (ZONES[5].zStart - 40)) / 80);
    waterDip = -2 * bayT;
  }

  return baseSlope + downhillDrops + routeCamber + hills + noise + waterDip;
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
renderer.toneMappingExposure = 1.08;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x87ceeb, 0.003);
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 10, -5);

// Bright sunny winter day
const ambientLight = new THREE.AmbientLight(0xccddff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xf3f8ff, 0.9);
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
    warmth: { value: 0.0 },
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
      float highlight = smoothstep(0.82, 0.98, max(max(color.r, color.g), color.b));
      float warmthMix = 1.0 - highlight;
      color.r += warmth * warmthMix;
      color.g += warmth * 0.5 * warmthMix;
      vec2 center = vUv - 0.5; float dist = length(center);
      color.rgb *= 1.0 - vignetteAmount * dist * dist * 2.0;
      gl_FragColor = color;
    }`,
};
composer.addPass(new ShaderPass(seventiesShader));

// ── Shared Materials ─────────────────────────────────────────
const terrainMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 0.18,
  roughness: 0.8,
  metalness: 0.0,
  flatShading: false,
});

const victorianPastelColors = [0xf8b4c8, 0xd8b4f8, 0xb4f8d0, 0xfff8d0, 0xb4d8f8, 0xf8e8b4];
const psychedelicColors = [0xff44aa, 0xaa44ff, 0x44ffaa, 0xffaa44, 0x44aaff, 0xff6644];
const victorianTrimColors = [0xffffff, 0xf0e0c0, 0xd4a0a0, 0xa0b0d4];
const colors70sCars = [0x6b8e23, 0xcc6633, 0xdaa520, 0x8b4513, 0xb22222, 0xf5deb3];
const colorsBuildings = [0xd4a373, 0xa8b5a2, 0xc9b1a0, 0x8fa3b0, 0xe8d5b7, 0xb5838d];
const muralColors = [0xcc3344, 0x3344cc, 0x44cc33, 0xccaa33, 0xcc33aa, 0x33ccaa];
const vanColors = [0xd2d5da, 0xc7ccd3, 0xe0e2e6, 0xadb3bd, 0xbec4cc];

const winMat = new THREE.MeshStandardMaterial({ color: 0x334455, flatShading: false });
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, flatShading: false });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x665544, flatShading: false });

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

  const width = 3.2 + rng() * 1.8;
  const height = 6.2 + rng() * 3.2;
  const depth = 4.2 + rng() * 1.8;

  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, flatShading: false });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, flatShading: false });

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
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: depth + 0.4,
    bevelEnabled: true,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    bevelSegments: 2,
  });
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

  // Front window stack (rowhouse look)
  for (let f = 0; f < floors; f++) {
    for (const xOff of [-0.35, 0.35]) {
      const frontWin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.06), winMat);
      frontWin.position.set(xOff * width, 1.6 + f * 2.3, depth / 2 + 0.53);
      g.add(frontWin);
    }
  }

  // Porch roof and columns
  const porchRoof = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.78, 0.08, 1.15),
    trimMat
  );
  porchRoof.position.set(0, 1.65, depth / 2 + 1.05);
  g.add(porchRoof);

  for (const xOff of [-1, 1]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.55, 10), trimMat);
    column.position.set(xOff * width * 0.24, 0.78, depth / 2 + 1.05);
    g.add(column);
  }

  // Roof dormer
  const dormer = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.38, 1.05, 0.95),
    trimMat
  );
  dormer.position.set(0, height + 0.8, depth * 0.1);
  g.add(dormer);

  g.userData.footprintHalfWidth = width * 0.5 + 0.9;

  return g;
}

function createGenericBuilding(rng) {
  const width = 3 + rng() * 5;
  const height = 4 + rng() * 12;
  const depth = 3 + rng() * 5;
  const color = colorsBuildings[Math.floor(rng() * colorsBuildings.length)];
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: false });
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
  mesh.userData.footprintHalfWidth = width * 0.5 + 0.3;
  return mesh;
}

function createPierBuilding(rng) {
  const g = new THREE.Group();
  const width = 6 + rng() * 8;
  const height = 4 + rng() * 3;
  const depth = 8 + rng() * 6;
  const mat = new THREE.MeshStandardMaterial({ color: 0x998877, flatShading: false });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  body.position.y = height / 2;
  body.castShadow = true;
  g.add(body);

  const roofLip = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.4, 0.3, depth + 0.4),
    new THREE.MeshStandardMaterial({ color: 0x777766, flatShading: false })
  );
  roofLip.position.y = height + 0.15;
  g.add(roofLip);

  const doorMat = new THREE.MeshStandardMaterial({ color: 0x556655, flatShading: false });
  const doorCount = Math.max(1, Math.floor(width / 3));
  for (let d = 0; d < doorCount; d++) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.1), doorMat);
    door.position.set(-width / 2 + 2 + d * 3, 1.25, depth / 2 + 0.05);
    g.add(door);
  }
  g.userData.footprintHalfWidth = width * 0.5 + 0.6;
  return g;
}

// ── Obstacle Factories ───────────────────────────────────────

function createTrolley() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdd6611, flatShading: false });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 5), bodyMat);
  body.position.y = 1.2; body.castShadow = true; g.add(body);

  const roofMatT = new THREE.MeshStandardMaterial({ color: 0xeecc88, flatShading: false });
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
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 14), wheelMat);
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
  const bodyMat = new THREE.MeshStandardMaterial({ color, flatShading: false });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 3.5), bodyMat);
  body.position.y = 0.6; body.castShadow = true; g.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.65, 1.8), bodyMat);
  cabin.position.set(0, 1.35, -0.2); g.add(cabin);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.05), winMat);
  windshield.position.set(0, 1.3, -1.1); g.add(windshield);

  for (const xOff of [-0.85, 0.85]) {
    for (const zOff of [-1.2, 1.2]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 14), wheelMat);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(xOff, 0.25, zOff); g.add(wheel);
    }
  }
  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 0.8, 0), new THREE.Vector3(2.0, 1.8, 3.8)
  );
  g.userData.obstacleType = 'car';
  return g;
}

function createDogWalker() {
  const g = new THREE.Group();
  const jacketColors = [0x556677, 0x445566, 0x667766, 0x775544];
  const jacketColor = jacketColors[Math.floor(Math.random() * jacketColors.length)];
  const bodyMat = new THREE.MeshStandardMaterial({ color: jacketColor, flatShading: false });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 14), bodyMat);
  body.position.y = 0.85; g.add(body);

  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88, flatShading: false });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), headMat);
  head.position.y = 1.35; g.add(head);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x333344, flatShading: false });
  for (const xOff of [-0.08, 0.08]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10), legMat);
    leg.position.set(xOff, 0.25, 0); g.add(leg);
  }

  const armMat = new THREE.MeshStandardMaterial({ color: 0x445566, flatShading: false });
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 10), armMat);
  arm.position.set(0.24, 0.85, 0);
  arm.rotation.z = -0.45;
  g.add(arm);

  const leashMat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f, flatShading: false });
  const leash = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 8), leashMat);
  leash.position.set(0.56, 0.65, 0.15);
  leash.rotation.z = -1.05;
  leash.rotation.y = 0.2;
  g.add(leash);

  const dogBodyMat = new THREE.MeshStandardMaterial({ color: 0x8a6b4f, flatShading: false });
  const dogBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.28), dogBodyMat);
  dogBody.position.set(0.95, 0.3, 0.26);
  g.add(dogBody);

  const dogHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), dogBodyMat);
  dogHead.position.set(1.23, 0.38, 0.28);
  g.add(dogHead);

  for (const legPos of [[0.78, 0.14], [1.1, 0.14], [0.78, 0.38], [1.1, 0.38]]) {
    const dogLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 8), dogBodyMat);
    dogLeg.position.set(legPos[0], 0.12, legPos[1]);
    g.add(dogLeg);
  }

  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0.62, 0.68, 0.2), new THREE.Vector3(1.6, 1.45, 0.85)
  );
  g.userData.obstacleType = 'dogWalker';
  g.userData.moveYaw = Math.PI * 0.5;
  return g;
}

function createLimeScooter() {
  const g = new THREE.Group();
  const limeMat = new THREE.MeshStandardMaterial({ color: 0x3ddc4a, flatShading: false });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2427, flatShading: false });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 1.15), limeMat);
  deck.position.y = 0.12;
  g.add(deck);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 1.05, 10), limeMat);
  stem.position.set(0, 0.66, -0.44);
  stem.rotation.x = 0.1;
  g.add(stem);

  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.05), darkMat);
  bar.position.set(0, 1.15, -0.45);
  g.add(bar);

  for (const zOff of [-0.42, 0.42]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 12), darkMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.12, zOff);
    g.add(wheel);
  }

  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 0.62, 0), new THREE.Vector3(0.7, 1.3, 1.25)
  );
  g.userData.obstacleType = 'limeScooter';
  return g;
}

function createTacoTruck() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, flatShading: false });
  const awningMat = new THREE.MeshStandardMaterial({ color: 0xdd4422, flatShading: false });

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
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 14), wheelMat);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(xOff, 0.3, zOff); g.add(wheel);
    }
  }
  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(2.4, 3.0, 4.2)
  );
  return g;
}

function createCityVan() {
  const g = new THREE.Group();
  const color = vanColors[Math.floor(Math.random() * vanColors.length)];
  const bodyMat = new THREE.MeshStandardMaterial({ color, flatShading: false });
  const trimMatVan = new THREE.MeshStandardMaterial({ color: 0x87909a, flatShading: false });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 3.2), bodyMat);
  body.position.y = 1.3; body.castShadow = true; g.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.24, 3.05), trimMatVan);
  roof.position.y = 2.2; g.add(roof);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.05), winMat);
  windshield.position.set(0, 2.2, -1.62); g.add(windshield);

  const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 2.2), trimMatVan);
  sidePanel.position.set(1.02, 1.42, 0); g.add(sidePanel);
  const sidePanel2 = sidePanel.clone();
  sidePanel2.position.x = -1.02;
  g.add(sidePanel2);

  for (const xOff of [-0.9, 0.9]) {
    for (const zOff of [-1.1, 1.1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 14), wheelMat);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(xOff, 0.3, zOff); g.add(wheel);
    }
  }
  g.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(2.2, 3.2, 3.6)
  );
  g.userData.obstacleType = 'van';
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
    const mat = new THREE.MeshStandardMaterial({ color, flatShading: false });
    const w = 0.8 + rng() * 1.5;
    const h = 0.8 + rng() * 2;
    const mural = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, w), mat);
    mural.position.set(3 + rng(), 1 + rng() * 3, (rng() - 0.5) * 3);
    building.add(mural);
  }
}

function createSnowflakeCollectible() {
  const geo = new THREE.IcosahedronGeometry(0.42, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xddeeff, emissiveIntensity: 1.0, flatShading: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.isCollectible = true;
  mesh.userData.bbox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.9, 0.9, 0.9)
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
  const baseObstacleCount = minObs + Math.floor(rng() * (maxObs - minObs + 1));
  const widthScale = THREE.MathUtils.clamp(zone.streetWidth / 20, 0.58, 1.08);
  const chunkCornerIntensity = Math.abs(getSharpCornerSignal(zMin + CHUNK_DEPTH * 0.5));
  const cornerScale = 1 - chunkCornerIntensity * 0.45;
  const obstacleCount = Math.max(1, Math.round(baseObstacleCount * OBSTACLE_DENSITY * widthScale * cornerScale));

  for (let i = 0; i < obstacleCount; i++) {
    const r = rng();
    let obj;
    const w = zone.obstacleWeights;
    let cum = 0;
    if (r < (cum += w.car)) obj = createCar();
    else if (r < (cum += w.dogWalker)) obj = createDogWalker();
    else if (r < (cum += w.limeScooter)) obj = createLimeScooter();
    else obj = createCityVan();

    const roadHalf = Math.max(1.3, halfStreet - 0.9);
    const z = zMin + rng() * CHUNK_DEPTH;
    const cornerIntensity = Math.abs(getSharpCornerSignal(z));
    const routeCenter = getRouteCenterX(z, zone);
    const centerBuffer = 1.0 + cornerIntensity * 2.0;
    let x = routeCenter;
    for (let tries = 0; tries < 6; tries++) {
      const candidate = (rng() - 0.5) * roadHalf * 2;
      if (Math.abs(candidate - routeCenter) >= centerBuffer || tries === 5) {
        x = candidate;
        break;
      }
    }
    obj.position.set(x, getHeight(x, z), z);

    const type = obj.userData.obstacleType;
    if (type === 'car' || type === 'van' || type === 'limeScooter') {
      const dir = rng() < 0.5 ? 0 : Math.PI;
      obj.rotation.y = dir + (rng() - 0.5) * 0.18;
    } else if (type === 'dogWalker') {
      const cross = obj.userData.moveYaw || (Math.PI * 0.5);
      obj.rotation.y = cross + (rng() - 0.5) * 0.5;
    } else {
      obj.rotation.y = rng() * Math.PI * 2;
    }

    scene.add(obj);
    chunk.obstacles.push(obj);
  }

  // ── Buildings on both sides ──
  const buildingsPerSide = zone.buildingType === 'pier' ? 3 + Math.floor(rng() * 3) : 5 + Math.floor(rng() * 3);
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
        building = createVictorianHouse(rng);
      } else {
        building = createVictorianHouse(rng);
      }

      const footprintHalfWidth = building.userData.footprintHalfWidth || 2.5;
      const sidewalkGap = zone.buildingType === 'pier' ? 2.4 : 1.8;
      const narrowStreetRelief = THREE.MathUtils.clamp((16 - zone.streetWidth) * 0.18, 0, 1.3);
      const minOffset = Math.max(zone.buildingInset, halfStreet + sidewalkGap + footprintHalfWidth) + narrowStreetRelief;
      const x = side * (minOffset + rng() * 1.6);
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
  const baseCollectibleCount = minCol + Math.floor(rng() * (maxCol - minCol + 1));
  const collectibleCount = Math.max(1, Math.round(baseCollectibleCount * COLLECTIBLE_DENSITY));
  const spreadFactor = zone.streetWidth / 30;
  for (let i = 0; i < collectibleCount; i++) {
    const sf = createSnowflakeCollectible();
    const x = (rng() - 0.5) * zone.streetWidth * 0.7 * spreadFactor;
    const z = zMin + rng() * CHUNK_DEPTH;
    sf.position.set(x, getHeight(x, z) + 1.2, z);
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
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, flatShading: false });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x555555, flatShading: false });

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
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, flatShading: false });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, flatShading: false });

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
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, flatShading: false });
  const roofMatF = new THREE.MeshStandardMaterial({ color: 0x888888, flatShading: false });
  const clockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: false });

  const main = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 30), wallMat);
  main.position.y = 4; main.castShadow = true; g.add(main);

  const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 20, 4), wallMat);
  tower.position.y = 14; g.add(tower);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(3, 8, 12), roofMatF);
  spire.position.y = 28; spire.rotation.y = Math.PI / 4; g.add(spire);

  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(1.5, 12), clockMat);
  clockFace.position.set(0, 18, 2.05); g.add(clockFace);

  const archMat = new THREE.MeshStandardMaterial({ color: 0x443322, flatShading: false });
  for (let i = -4; i <= 4; i++) {
    if (Math.abs(i) <= 1) continue;
    const arch = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, 0.5), archMat);
    arch.position.set(0, 2, i * 3); g.add(arch);
  }
  return g;
}

function createFerryBoat() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, flatShading: false });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x886644, flatShading: false });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, flatShading: false });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 12), hullMat);
  hull.position.y = 1; g.add(hull);

  // Bow
  const bow = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 12), hullMat);
  bow.rotation.x = -Math.PI / 2; bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 1, 8); g.add(bow);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.2, 11), deckMat);
  deck.position.y = 2.1; g.add(deck);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 5), cabinMat);
  cabin.position.set(0, 3.4, -1); cabin.castShadow = true; g.add(cabin);

  const stackMat = new THREE.MeshStandardMaterial({ color: 0xdd4422, flatShading: false });
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 2.5, 14), stackMat);
  stack.position.set(0, 5.5, -1); g.add(stack);

  for (let i = -1; i <= 1; i++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.05), winMat);
    w.position.set(i * 1.5, 3.8, 1.55); g.add(w);
  }

  const railMat = new THREE.MeshStandardMaterial({ color: 0x888888, flatShading: false });
  for (const side of [-1, 1]) {
    for (let z = -4; z <= 4; z += 2) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 10), railMat);
      post.position.set(side * 2.5, 2.7, z); g.add(post);
    }
  }

  // "FERRY" sign — just a colored plate
  const signMat = new THREE.MeshStandardMaterial({ color: 0x224488, flatShading: false });
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
  const boardMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, flatShading: false });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 1.6), boardMat);
  board.position.y = 0.04; board.castShadow = true; g.add(board);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2255aa, flatShading: false });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.9, 14), bodyMat);
  body.position.y = 0.65; body.castShadow = true; g.add(body);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10), bodyMat);
    arm.position.set(side * 0.32, 0.6, 0); arm.rotation.z = side * 0.4;
    arm.castShadow = true; g.add(arm);
  }

  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88, flatShading: false });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), headMat);
  head.position.y = 1.25; g.add(head);

  const beanieMat = new THREE.MeshStandardMaterial({ color: 0xdd6600, flatShading: false });
  const beanie = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), beanieMat
  );
  beanie.position.y = 1.32; g.add(beanie);

  const goggleMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, flatShading: false });
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
  speed: BASE_SPEED,
  jumpVelocity: 0,
  grounded: true,
  groundY: 0,
};

// ── Input ────────────────────────────────────────────────────
const keys = { left: false, right: false, jump: false };
const isLikelyMobile = window.matchMedia('(pointer: coarse)').matches
  || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let touchJumpQueued = false;
let steerSmooth = 0;
let mobileStatusTimer = null;

const mobileControlsEl = document.getElementById('mobile-controls');
const mobileLeftBtn = document.getElementById('mobile-left');
const mobileRightBtn = document.getElementById('mobile-right');
const mobileJumpBtn = document.getElementById('mobile-jump');
const mobileStatusEl = document.getElementById('mobile-status');

function setMobileControlsVisible(visible) {
  if (!mobileControlsEl) return;
  if (!isLikelyMobile) {
    mobileControlsEl.style.display = 'none';
    return;
  }
  mobileControlsEl.style.display = visible ? 'block' : 'none';
}

function setMobileStatus(text, timeoutMs = 2400) {
  if (!mobileStatusEl) return;
  mobileStatusEl.textContent = text;
  mobileStatusEl.style.opacity = '0.95';
  if (mobileStatusTimer) clearTimeout(mobileStatusTimer);
  if (timeoutMs > 0) {
    mobileStatusTimer = setTimeout(() => {
      if (!mobileStatusEl) return;
      mobileStatusEl.style.opacity = '0.78';
    }, timeoutMs);
  }
}

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

function bindHoldControl(button, setPressed) {
  if (!button) return;
  const press = (e) => {
    if (state !== GameState.PLAYING) return;
    e.preventDefault();
    setPressed(true);
  };
  const release = (e) => {
    if (e) e.preventDefault();
    setPressed(false);
  };
  button.addEventListener('pointerdown', press, { passive: false });
  button.addEventListener('pointerup', release, { passive: false });
  button.addEventListener('pointercancel', release, { passive: false });
  button.addEventListener('pointerleave', release, { passive: false });
}

if (isLikelyMobile) {
  bindHoldControl(mobileLeftBtn, (pressed) => { touchLeft = pressed; });
  bindHoldControl(mobileRightBtn, (pressed) => { touchRight = pressed; });
  if (mobileJumpBtn) {
    mobileJumpBtn.addEventListener('pointerdown', (e) => {
      if (state !== GameState.PLAYING) return;
      e.preventDefault();
      touchJumpQueued = true;
    }, { passive: false });
  }
}

window.addEventListener('touchstart', (e) => {
  if (state === GameState.GAMEOVER || state === GameState.WIN) return;
  if (isLikelyMobile) e.preventDefault();

  if (state === GameState.MENU) {
    startGame();
    return;
  }

  if (isLikelyMobile) return;

  for (const touch of e.changedTouches) {
    const x = touch.clientX / window.innerWidth;
    const y = touch.clientY / window.innerHeight;
    if (y < 0.3) { touchJump = true; continue; }
    if (x < 0.5) touchLeft = true; else touchRight = true;
  }
}, { passive: false });
window.addEventListener('touchend', (e) => {
  if (state === GameState.GAMEOVER || state === GameState.WIN) return;
  if (isLikelyMobile) {
    e.preventDefault();
    return;
  }
  for (const touch of e.changedTouches) {
    const x = touch.clientX / window.innerWidth;
    const y = touch.clientY / window.innerHeight;
    if (y < 0.3) { touchJump = false; continue; }
    if (x < 0.5) touchLeft = false; else touchRight = false;
  }
}, { passive: false });
window.addEventListener('touchcancel', () => {
  touchLeft = false;
  touchRight = false;
  touchJump = false;
  touchJumpQueued = false;
}, { passive: true });

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
  let zone = getZoneForZ(pos.z);
  const steerLeft = keys.left || touchLeft;
  const steerRight = keys.right || touchRight;
  const wantJump = keys.jump || touchJump || touchJumpQueued;

  const digitalSteer = (steerLeft ? 1 : 0) - (steerRight ? 1 : 0);
  const targetSteer = THREE.MathUtils.clamp(digitalSteer, -1, 1);
  steerSmooth = THREE.MathUtils.lerp(steerSmooth, targetSteer, Math.min(1, 8 * dt));
  const steerRate = KEY_STEER_RATE;
  playerState.rotation += steerSmooth * steerRate * dt;
  const routeTurn = getRouteTurnSignal(pos.z);
  const cornerTurn = getSharpCornerSignal(pos.z);
  playerState.rotation -= (routeTurn * ROUTE_TURNINESS + cornerTurn * 1.95) * dt;
  playerState.rotation = wrapAngleRad(playerState.rotation);
  playerState.rotation = THREE.MathUtils.clamp(playerState.rotation, -MAX_FORWARD_YAW, MAX_FORWARD_YAW);

  // Slope-based acceleration
  const hHere = getHeight(pos.x, pos.z);
  const lookZ = pos.z + Math.cos(playerState.rotation) * 1.0;
  const lookX = pos.x + Math.sin(playerState.rotation) * 1.0;
  const hAhead = getHeight(lookX, lookZ);
  const slope = (hAhead - hHere) / 1.0;

  playerState.speed += slope * SLOPE_ACCEL;
  playerState.speed *= SPEED_DECAY;
  playerState.speed = Math.max(0.2, Math.min(playerState.speed, MAX_SPEED));

  // Jump
  if (wantJump && playerState.grounded) {
    playerState.jumpVelocity = 8;
    playerState.grounded = false;
    touchJumpQueued = false;
  }
  if (touchJumpQueued && !playerState.grounded) touchJumpQueued = false;
  if (!playerState.grounded) {
    playerState.jumpVelocity -= 22 * dt;
  }

  // Move forward
  const moveSpeed = playerState.speed * 60 * dt;
  const minForwardStep = moveSpeed * 0.24;
  const forwardStep = Math.max(minForwardStep, Math.cos(playerState.rotation) * moveSpeed);
  pos.z += forwardStep;
  pos.x += Math.sin(playerState.rotation) * moveSpeed;
  zone = getZoneForZ(pos.z);
  const routeCenter = getRouteCenterX(pos.z, zone);
  pos.x += (routeCenter - pos.x) * dt * 0.75;

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
  const halfStreet = zone.streetWidth / 2;
  const cornerIntensity = Math.abs(cornerTurn);
  const shoulderPadding = THREE.MathUtils.lerp(1.35, 0.65, cornerIntensity);
  const rideLimit = Math.max(1.5, halfStreet - shoulderPadding);
  pos.x = Math.max(-rideLimit, Math.min(rideLimit, pos.x));

  if (playerState.grounded && Math.abs(steerSmooth) > 0.22 && playerState.speed > 0.35) {
    carveSprayTimer -= dt;
    if (carveSprayTimer <= 0) {
      const carvePos = new THREE.Vector3(
        pos.x - Math.sin(playerState.rotation) * 0.22,
        pos.y + 0.03,
        pos.z - Math.cos(playerState.rotation) * 0.62
      );
      spawnCarveSpray(carvePos, steerSmooth);
      carveSprayTimer = 0.035;
    }
  } else {
    carveSprayTimer = 0;
  }

  // Update mesh
  player.position.copy(pos);
  player.rotation.y = -playerState.rotation;

  const turnAmount = steerSmooth;
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
const SNOW_SIDE_SPAN = 90;
const SNOW_FORWARD_SPAN = 120;
const SNOW_REAR_SPAN = 24;
const SNOW_MIN_Y_OFFSET = 2;
const SNOW_MAX_Y_OFFSET = 42;

function placeSnowParticle(attr, i, playerPos) {
  const forwardX = Math.sin(playerState.rotation);
  const forwardZ = Math.cos(playerState.rotation);
  const sideX = forwardZ;
  const sideZ = -forwardX;
  const side = (Math.random() - 0.5) * SNOW_SIDE_SPAN;
  const forward = Math.random() * SNOW_FORWARD_SPAN - SNOW_REAR_SPAN;
  const x = playerPos.x + sideX * side + forwardX * forward;
  const y = playerPos.y + SNOW_MIN_Y_OFFSET + Math.random() * (SNOW_MAX_Y_OFFSET - SNOW_MIN_Y_OFFSET);
  const z = playerPos.z + sideZ * side + forwardZ * forward;
  attr.setXYZ(i, x, y, z);
}

function createSnowParticles() {
  const positions = new Float32Array(SNOW_COUNT * 3);
  const pp = playerState.position;
  const attr = new THREE.BufferAttribute(positions, 3);
  for (let i = 0; i < SNOW_COUNT; i++) {
    placeSnowParticle(attr, i, pp);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', attr);
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.32,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    fog: false,
  });
  snowParticles = new THREE.Points(geo, mat);
  snowParticles.frustumCulled = false;
  scene.add(snowParticles);
}

function updateSnowParticles(dt) {
  if (!snowParticles) return;
  const pos = snowParticles.geometry.attributes.position;
  const pp = playerState.position;
  const forwardX = Math.sin(playerState.rotation);
  const forwardZ = Math.cos(playerState.rotation);
  const sideX = forwardZ;
  const sideZ = -forwardX;
  for (let i = 0; i < SNOW_COUNT; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    y -= (3.6 + Math.sin(i * 0.1) * 1.2) * dt;
    x += Math.sin(i * 0.3 + y * 0.5) * 0.3 * dt;
    z += (0.4 + playerState.speed * 1.5) * dt;

    const dx = x - pp.x;
    const dz = z - pp.z;
    const forwardProgress = dx * forwardX + dz * forwardZ;
    const sideProgress = dx * sideX + dz * sideZ;
    const outOfBounds = y < pp.y + SNOW_MIN_Y_OFFSET
      || y > pp.y + SNOW_MAX_Y_OFFSET
      || forwardProgress < -SNOW_REAR_SPAN
      || forwardProgress > SNOW_FORWARD_SPAN
      || Math.abs(sideProgress) > SNOW_SIDE_SPAN * 0.6;

    if (outOfBounds) {
      placeSnowParticle(pos, i, pp);
      continue;
    }
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
}

// ── Collectible Burst FX ─────────────────────────────────────
const collectBursts = [];

function spawnCollectBurst(worldPos) {
  const particleCount = 16;
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.2 + Math.random() * 2.2;
    positions[i * 3] = worldPos.x;
    positions[i * 3 + 1] = worldPos.y + 0.5;
    positions[i * 3 + 2] = worldPos.z;
    velocities[i * 3] = Math.cos(a) * r;
    velocities[i * 3 + 1] = 1.4 + Math.random() * 2.2;
    velocities[i * 3 + 2] = Math.sin(a) * r;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffee99,
    size: 0.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  collectBursts.push({ points, velocities, life: 0.55, duration: 0.55 });
}

function updateCollectBursts(dt) {
  for (let i = collectBursts.length - 1; i >= 0; i--) {
    const burst = collectBursts[i];
    burst.life -= dt;
    const attr = burst.points.geometry.attributes.position;
    for (let p = 0; p < attr.count; p++) {
      const vx = burst.velocities[p * 3];
      const vy = burst.velocities[p * 3 + 1];
      const vz = burst.velocities[p * 3 + 2];
      attr.setXYZ(
        p,
        attr.getX(p) + vx * dt,
        attr.getY(p) + vy * dt,
        attr.getZ(p) + vz * dt
      );
      burst.velocities[p * 3 + 1] = vy - 5.5 * dt;
    }
    attr.needsUpdate = true;
    burst.points.material.opacity = Math.max(0, burst.life / burst.duration);

    if (burst.life <= 0) {
      scene.remove(burst.points);
      burst.points.geometry.dispose();
      burst.points.material.dispose();
      collectBursts.splice(i, 1);
    }
  }
}

// ── Carve Spray FX ───────────────────────────────────────────
const carveSprays = [];

function spawnCarveSpray(worldPos, steerAmount) {
  const particleCount = 11;
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const direction = Math.sign(steerAmount) || 1;
  const sideX = Math.cos(playerState.rotation);
  const sideZ = -Math.sin(playerState.rotation);
  const backX = -Math.sin(playerState.rotation);
  const backZ = -Math.cos(playerState.rotation);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = worldPos.x + (Math.random() - 0.5) * 0.22;
    positions[i * 3 + 1] = worldPos.y + 0.05 + Math.random() * 0.18;
    positions[i * 3 + 2] = worldPos.z + (Math.random() - 0.5) * 0.22;

    const sideSpeed = (1.1 + Math.random() * 1.9) * direction;
    const backSpeed = 0.8 + Math.random() * 1.4;
    velocities[i * 3] = sideX * sideSpeed + backX * backSpeed;
    velocities[i * 3 + 1] = 0.8 + Math.random() * 1.8;
    velocities[i * 3 + 2] = sideZ * sideSpeed + backZ * backSpeed;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.16,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  carveSprays.push({ points, velocities, life: 0.3, duration: 0.3 });
}

function updateCarveSprays(dt) {
  for (let i = carveSprays.length - 1; i >= 0; i--) {
    const spray = carveSprays[i];
    spray.life -= dt;
    const attr = spray.points.geometry.attributes.position;
    for (let p = 0; p < attr.count; p++) {
      const vx = spray.velocities[p * 3];
      const vy = spray.velocities[p * 3 + 1];
      const vz = spray.velocities[p * 3 + 2];
      attr.setXYZ(
        p,
        attr.getX(p) + vx * dt,
        attr.getY(p) + vy * dt,
        attr.getZ(p) + vz * dt
      );
      spray.velocities[p * 3 + 1] = vy - 9.5 * dt;
    }
    attr.needsUpdate = true;
    spray.points.material.opacity = Math.max(0, spray.life / spray.duration);
    if (spray.life <= 0) {
      scene.remove(spray.points);
      spray.points.geometry.dispose();
      spray.points.material.dispose();
      carveSprays.splice(i, 1);
    }
  }
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
      if (pp.distanceTo(sf.position) < COLLECT_RADIUS) {
        const pickPos = sf.position.clone();
        scene.remove(sf);
        chunk.collectibles.splice(i, 1);

        collectibleCombo = collectibleComboTimer > 0 ? collectibleCombo + 1 : 1;
        collectibleComboTimer = 2.2;
        const comboMult = 1 + Math.min(5, collectibleCombo - 1) * 0.25;
        const reward = Math.round(COLLECTIBLE_BASE_SCORE * comboMult);
        score += reward;
        playerState.speed = Math.min(MAX_SPEED, playerState.speed + 0.045);
        showBonus(`SNOW x${collectibleCombo} +${reward}`);
        spawnCollectBurst(pickPos);
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
  hudBonus.classList.remove('pop');
  void hudBonus.offsetWidth;
  hudBonus.classList.add('pop');
  hudBonus.style.opacity = '1';
  bonusTimer = 0.95;
}

function updateBonusDisplay(dt) {
  if (bonusTimer > 0) {
    bonusTimer -= dt;
    if (bonusTimer <= 0) {
      hudBonus.style.opacity = '0';
      hudBonus.classList.remove('pop');
    }
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
      sf.rotation.y += 3.2 * dt;
      sf.rotation.x += 1.2 * dt;
      sf.position.y = getHeight(sf.position.x, sf.position.z) + 1.3 + Math.sin(time * 4 + sf.position.x) * 0.45;
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
  playerState.speed = BASE_SPEED;
  playerState.jumpVelocity = 0;
  playerState.grounded = true;
  touchLeft = false;
  touchRight = false;
  touchJump = false;
  touchJumpQueued = false;
  steerSmooth = 0;
  collectibleCombo = 0;
  collectibleComboTimer = 0;
  carveSprayTimer = 0;
  for (const burst of collectBursts) {
    scene.remove(burst.points);
    burst.points.geometry.dispose();
    burst.points.material.dispose();
  }
  collectBursts.length = 0;
  for (const spray of carveSprays) {
    scene.remove(spray.points);
    spray.points.geometry.dispose();
    spray.points.material.dispose();
  }
  carveSprays.length = 0;

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
  setMobileControlsVisible(true);
  if (isLikelyMobile) setMobileStatus('TOUCH CONTROLS ON', 2200);
  state = GameState.PLAYING;
}

function endGame() {
  state = GameState.GAMEOVER;
  hudEl.style.display = 'none';
  setMobileControlsVisible(false);
  finalDistance.textContent = Math.floor(distance);
  finalScore.textContent = Math.floor(score);
  gameOverScreen.style.display = 'flex';
}

function winGame() {
  state = GameState.WIN;
  hudEl.style.display = 'none';
  setMobileControlsVisible(false);
  document.getElementById('win-distance').textContent = Math.floor(distance);
  document.getElementById('win-score').textContent = Math.floor(score);
  document.getElementById('win-lives').textContent = Math.max(0, lives);
  winScreen.style.display = 'flex';
}

// ── Button Handlers ──────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', () => {
  startGame();
});
document.getElementById('restart-btn').addEventListener('click', () => {
  startGame();
});
document.getElementById('play-again-btn').addEventListener('click', () => {
  startGame();
});

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
    updateCollectBursts(dt);
    updateCarveSprays(dt);

    if (collectibleComboTimer > 0) {
      collectibleComboTimer -= dt;
      if (collectibleComboTimer <= 0) collectibleCombo = 0;
    }

    if (invincibleTimer > 0) {
      invincibleTimer -= dt;
      player.visible = Math.floor(invincibleTimer * 8) % 2 === 0;
    } else {
      player.visible = true;
    }
  } else {
    updateCollectBursts(dt);
    updateCarveSprays(dt);
  }

  updateSnowParticles(dt);

  composer.render();
}

init();
