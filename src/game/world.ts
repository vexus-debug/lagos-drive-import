import type { P } from "./types";

export interface Box { minX: number; maxX: number; minZ: number; maxZ: number }
export interface Building extends Box { h: number; color: string }

export const LINES = [-200, -100, 0, 100, 200];
export const HALF_ROAD = 8;

export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = ["#f2e3c6", "#e8b07a", "#d9734e", "#5fb3a8", "#f4d35e", "#e6e1d3", "#8fb8de", "#c97b84", "#f0a868", "#9cc69b"];
const STALL = ["#e63946", "#f4a261", "#2a9d8f", "#e9c46a", "#457b9d", "#8ac926", "#ff6b9a"];
const SIGNS: [string, string, string][] = [
  ["WELCOME TO LAGOS ISLAND", "#0b6e4f", "#ffffff"],
  ["BALOGUN MARKET", "#d62828", "#fcbf49"],
  ["GO-SLOW? NO WAHALA", "#fcbf49", "#1d3557"],
  ["MAMA PUT - BROAD ST", "#2a9d8f", "#fefae0"],
  ["SUYA SPOT IDUMOTA", "#6a040f", "#ffba08"],
  ["EKO O NI BAJE", "#1d3557", "#f1faee"],
  ["CMS BUS TERMINAL", "#ffd60a", "#000814"],
  ["POS / BUREAU DE CHANGE", "#7b2cbf", "#ffd6ff"],
];
/** Real Lagos Island street names mapped onto the road lines (z = horizontal, x = vertical). */
export const STREET_Z: Record<number, string> = { [-200]: "Nnamdi Azikiwe St", [-100]: "Marina (Expressway)", 0: "Broad Street", 100: "Martins Street", 200: "Marina Waterfront" };
export const STREET_X: Record<number, string> = { [-200]: "Idumota Rd", [-100]: "Balogun St", 0: "Odunlami St", 100: "Joseph St", 200: "CMS / Bishop Crowther" };
export const NECOM = { x: 50, z: 50, w: 16, h: 95 };
export const GPT_COLORS = ["#1a1a1a", "#2a2a2a", "#1d4ed8", "#111"];

export function buildWorld() {
  const r = rng(1337);
  const buildings: Building[] = [];
  const colliders: Box[] = [];
  const palms: P[] = [];
  const stalls: { x: number; z: number; color: string }[] = [];
  const billboards: { x: number; z: number; rot: number; text: string; bg: string; fg: string }[] = [];
  const sidewalks: P[][] = [];
  const blocks: Box[] = [];
  const routes: P[][] = [];

  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const a = LINES[i], b = LINES[i + 1], c = LINES[j], d = LINES[j + 1];
      blocks.push({ minX: a + 8, maxX: b - 8, minZ: c + 8, maxZ: d - 8 });
      sidewalks.push([{ x: a + 10, z: c + 10 }, { x: b - 10, z: c + 10 }, { x: b - 10, z: d - 10 }, { x: a + 10, z: d - 10 }]);
      const market = i === 1 && j === 3;
      if (market) {
        for (let gx = 0; gx < 6; gx++)
          for (let gz = 0; gz < 5; gz++) {
            const x = a + 20 + gx * 12, z = c + 20 + gz * 14;
            stalls.push({ x, z, color: STALL[Math.floor(r() * STALL.length)] });
            colliders.push({ minX: x - 1.6, maxX: x + 1.6, minZ: z - 1.2, maxZ: z + 1.2 });
          }
      } else {
        const cell = 76 / 3;
        for (let cx = 0; cx < 3; cx++)
          for (let cz = 0; cz < 3; cz++) {
            if (r() > 0.85) continue;
            const w = 12 + r() * 10, dp = 12 + r() * 10;
            const h = 6 + r() * r() * 45;
            const mx = a + 12 + cell * (cx + 0.5) + (r() - 0.5) * (cell - w) * 0.8;
            const mz = c + 12 + cell * (cz + 0.5) + (r() - 0.5) * (cell - dp) * 0.8;
            const bd = { minX: mx - w / 2, maxX: mx + w / 2, minZ: mz - dp / 2, maxZ: mz + dp / 2 };
            buildings.push({ ...bd, h, color: PALETTE[Math.floor(r() * PALETTE.length)] });
            colliders.push(bd);
          }
      }
      // palms along sidewalks
      for (let t = a + 18; t < b - 14; t += 16) {
        if (r() < 0.55) palms.push({ x: t, z: c + 11.2 });
        if (r() < 0.55) palms.push({ x: t, z: d - 11.2 });
      }
      for (let t = c + 18; t < d - 14; t += 16) {
        if (r() < 0.4) palms.push({ x: a + 11.2, z: t });
        if (r() < 0.4) palms.push({ x: b - 11.2, z: t });
      }
    }
  for (const p of palms) colliders.push({ minX: p.x - 0.3, maxX: p.x + 0.3, minZ: p.z - 0.3, maxZ: p.z + 0.3 });

  // billboards
  const spots: [number, number, number][] = [
    [30, -89, 0], [-60, 11, Math.PI], [150, 111, Math.PI], [-150, -11, 0], [60, 189, 0], [-30, -111, 0], [111, 50, -Math.PI / 2], [-89, 140, Math.PI / 2],
  ];
  spots.forEach(([x, z, rot], k) => billboards.push({ x, z, rot, text: SIGNS[k][0], bg: SIGNS[k][1], fg: SIGNS[k][2] }));

  // NECOM House landmark: clear its plot, then add the tower
  {
    const n = { minX: NECOM.x - NECOM.w / 2, maxX: NECOM.x + NECOM.w / 2, minZ: NECOM.z - NECOM.w / 2, maxZ: NECOM.z + NECOM.w / 2 };
    const hit = (b: Box) => b.maxX > n.minX - 4 && b.minX < n.maxX + 4 && b.maxZ > n.minZ - 4 && b.minZ < n.maxZ + 4;
    for (let k = buildings.length - 1; k >= 0; k--) if (hit(buildings[k])) buildings.splice(k, 1);
    for (let k = colliders.length - 1; k >= 0; k--) if (hit(colliders[k])) colliders.splice(k, 1);
    buildings.push({ ...n, h: NECOM.h, color: "#d8d4cc" });
    colliders.push(n);
  }

  // Danfo bus stops (yellow shelters) on sidewalks
  const busStops: { x: number; z: number; rot: number; name: string }[] = [];
  const stopNames = ["CMS", "OBALENDE", "MARINA", "BROAD ST", "IDUMOTA", "TBS", "OYINGBO", "LEKKI"];
  const stopSpots: [number, number, number][] = [[40, 11, 0], [-150, -89, Math.PI], [140, 189, Math.PI], [-60, 111, 0], [11, -150, Math.PI / 2], [-111, 60, Math.PI / 2], [160, -11, Math.PI], [-170, 189, Math.PI]];
  stopSpots.forEach(([x, z, rot], k) => {
    busStops.push({ x, z, rot, name: stopNames[k] });
  });

  // concrete utility poles along sidewalks
  const poles: P[] = [];
  for (const L of sidewalks)
    for (let e = 0; e < 4; e++) {
      const a = L[e], b = L[(e + 1) % 4];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      for (let t = 9; t < len - 5; t += 28) {
        const x = a.x + ((b.x - a.x) * t) / len, z = a.z + ((b.z - a.z) * t) / len;
        // push slightly toward road
        const ox = Math.abs(b.x - a.x) > 1 ? 0 : x > (L[0].x + L[1].x) / 2 ? 1 : -1;
        const oz = Math.abs(b.z - a.z) > 1 ? 0 : z > (L[1].z + L[2].z) / 2 ? 1 : -1;
        const p = { x: x + ox * 0.9, z: z + oz * 0.9 };
        poles.push(p);
        colliders.push({ minX: p.x - 0.2, maxX: p.x + 0.2, minZ: p.z - 0.2, maxZ: p.z + 0.2 });
      }
    }

  // island towers (Victoria Island / Eko Atlantic)
  const isl: [number, number, number][] = [[-35, 445, 70], [35, 450, 55], [-38, 495, 42], [36, 497, 80], [0, 505, 30]];
  for (const [x, z, h] of isl) {
    const bd = { minX: x - 9, maxX: x + 9, minZ: z - 9, maxZ: z + 9 };
    buildings.push({ ...bd, h, color: "#8fb8de" });
    colliders.push(bd);
  }

  // overpass pillars (Marina expressway) along z=-100
  const pillars: P[] = [];
  for (let x = -200; x <= 200; x += 25) {
    pillars.push({ x, z: -100 });
    colliders.push({ minX: x - 0.7, maxX: x + 0.7, minZ: -100.7, maxZ: -99.3 });
  }
  // bridge rails
  colliders.push({ minX: -9, maxX: -7.8, minZ: 214, maxZ: 418 });
  colliders.push({ minX: 7.8, maxX: 9, minZ: 214, maxZ: 418 });

  // traffic routes: rectangles on the road grid, both directions
  const rects: [number, number, number, number][] = [];
  for (let k = 0; k < 10; k++) {
    let i1 = Math.floor(r() * 4), i2 = i1 + 1 + Math.floor(r() * (4 - i1));
    let j1 = Math.floor(r() * 4), j2 = j1 + 1 + Math.floor(r() * (4 - j1));
    if (i2 > 4) i2 = 4;
    if (j2 > 4) j2 = 4;
    rects.push([LINES[i1], LINES[i2], LINES[j1], LINES[j2]]);
  }
  rects.push([-200, 200, -200, 200]);
  for (const [x1, x2, z1, z2] of rects) {
    routes.push([{ x: x1 + 4, z: z1 + 4 }, { x: x2 - 4, z: z1 + 4 }, { x: x2 - 4, z: z2 - 4 }, { x: x1 + 4, z: z2 - 4 }]);
    routes.push([{ x: x1 - 4, z: z1 - 4 }, { x: x1 - 4, z: z2 + 4 }, { x: x2 + 4, z: z2 + 4 }, { x: x2 + 4, z: z1 - 4 }]);
  }
  // Third Mainland-style bridge loop
  routes.push([{ x: 4, z: 196 }, { x: 4, z: 472 }, { x: -4, z: 472 }, { x: -4, z: 196 }]);

  return { buildings, colliders, palms, stalls, billboards, sidewalks, blocks, routes, pillars, busStops, poles };
}

export type World = ReturnType<typeof buildWorld>;

export function randomSidewalkPoint(W: World): P {
  const loop = W.sidewalks[Math.floor(Math.random() * W.sidewalks.length)];
  const i = Math.floor(Math.random() * 4);
  const a = loop[i], b = loop[(i + 1) % 4];
  const f = 0.15 + Math.random() * 0.7;
  return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f };
}

export function inWorld(x: number, z: number) {
  return (
    (Math.abs(x) <= 213 && Math.abs(z) <= 213) ||
    (Math.abs(x) <= 7.6 && z >= 200 && z <= 422) ||
    (Math.abs(x) <= 58 && z >= 418 && z <= 515)
  );
}
