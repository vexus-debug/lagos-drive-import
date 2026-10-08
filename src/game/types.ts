import type * as THREE from "three";

export type CarType = "danfo" | "keke" | "sedan" | "police";
export type P = { x: number; z: number };

export interface Car {
  id: number;
  type: CarType;
  color: string;
  x: number;
  z: number;
  h: number;
  vx: number;
  vz: number;
  speed: number;
  route: P[];
  idx: number;
  ai: "traffic" | "police" | "player" | "parked";
  active: boolean;
  stun: number;
  blocked: number;
  hitCd: number;
  obj: THREE.Object3D | null;
  lights: THREE.MeshLambertMaterial[];
}

export interface Ped {
  id: number;
  x: number;
  z: number;
  h: number;
  route: P[];
  idx: number;
  dir: 1 | -1;
  speed: number;
  dead: number;
  color: string;
  wrap: string | null;
  obj: THREE.Object3D | null;
  phase: number;
}

export interface Mission {
  kind: "courier" | "taxi";
  drop: P;
  reward: number;
  time: number;
}

export interface GameState {
  player: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    vy: number;
    onGround: boolean;
    health: number;
    stamina: number;
    bob: number;
    moving: boolean;
  };
  car: Car | null;
  cash: number;
  heat: number;
  cars: Car[];
  peds: Ped[];
  offers: { courier: P; taxi: P };
  mission: Mission | null;
  msgs: { text: string; t: number }[];
  prompt: string;
  camMode: 0 | 1;
  wasted: number;
  locked: boolean;
  spawnCd: number;
  time: number;
  markers: { courier: THREE.Object3D | null; taxi: THREE.Object3D | null; drop: THREE.Object3D | null };
}

export interface Input {
  keys: Set<string>;
  pressed: Set<string>;
  mdx: number;
  mdy: number;
}

export const SPECS: Record<CarType, { len: number; wid: number; max: number; accel: number; turn: number; r: number; name: string }> = {
  danfo: { len: 5, wid: 2.2, max: 27, accel: 10, turn: 1.7, r: 2.0, name: "Danfo" },
  keke: { len: 2.6, wid: 1.4, max: 18, accel: 9, turn: 2.5, r: 1.1, name: "Keke Napep" },
  sedan: { len: 4.4, wid: 1.9, max: 40, accel: 15, turn: 2.1, r: 1.8, name: "Sedan" },
  police: { len: 4.6, wid: 2, max: 44, accel: 17, turn: 2.2, r: 1.85, name: "Police Cruiser" },
};
