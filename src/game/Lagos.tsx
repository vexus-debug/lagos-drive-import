import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { NECOM, type World } from "./world";
import { shopfront } from "./textures";

/** Lagos street furniture: black/yellow kerbs, open gutters + slabs, GeePee roof tanks, shop shutters, poles, bus stops, NECOM spire. */
export function LagosDetails({ W }: { W: World }) {
  const kerb = useRef<THREE.InstancedMesh>(null);
  const gutter = useRef<THREE.InstancedMesh>(null);
  const slab = useRef<THREE.InstancedMesh>(null);
  const tank = useRef<THREE.InstancedMesh>(null);
  const tankStand = useRef<THREE.InstancedMesh>(null);
  const shop = useRef<THREE.InstancedMesh>(null);
  const pole = useRef<THREE.InstancedMesh>(null);
  const arm = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    const kerbs: { x: number; z: number; sx: number; sz: number; yellow: boolean }[] = [];
    const gutters: { x: number; z: number; sx: number; sz: number }[] = [];
    const slabs: { x: number; z: number; sx: number; sz: number }[] = [];
    for (const b of W.blocks) {
      const edges: [number, number, number, number, boolean][] = [
        [b.minX, b.minZ + 0.15, b.maxX, b.minZ + 0.15, true],
        [b.minX, b.maxZ - 0.15, b.maxX, b.maxZ - 0.15, true],
        [b.minX + 0.15, b.minZ, b.minX + 0.15, b.maxZ, false],
        [b.maxX - 0.15, b.minZ, b.maxX - 0.15, b.maxZ, false],
      ];
      for (const [x1, z1, x2, z2, horiz] of edges) {
        const len = horiz ? x2 - x1 : z2 - z1;
        const n = Math.floor(len);
        for (let k = 0; k < n; k++) {
          const t = k + 0.5;
          kerbs.push(horiz ? { x: x1 + t, z: z1, sx: 0.98, sz: 0.3, yellow: k % 2 === 0 } : { x: x1, z: z1 + t, sx: 0.3, sz: 0.98, yellow: k % 2 === 0 });
        }
        // gutter sits just inside the kerb
        const inset = 0.75;
        const gx = horiz ? (x1 + x2) / 2 : x1 + (x1 === b.minX + 0.15 ? inset : -inset);
        const gz = horiz ? z1 + (z1 === b.minZ + 0.15 ? inset : -inset) : (z1 + z2) / 2;
        gutters.push(horiz ? { x: gx, z: gz, sx: len - 2, sz: 0.8 } : { x: gx, z: gz, sx: 0.8, sz: len - 2 });
        for (let t = 6; t < len - 4; t += 9)
          slabs.push(horiz ? { x: x1 + t, z: gz, sx: 1.6, sz: 1.0 } : { x: gx, z: z1 + t, sx: 1.0, sz: 1.6 });
      }
    }
    const lowBuildings = W.buildings.filter((b) => b.h < 60);
    return { kerbs, gutters, slabs, lowBuildings };
  }, [W]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Color();
    data.kerbs.forEach((k, i) => {
      kerb.current!.setMatrixAt(i, m.compose(v.set(k.x, 0.13, k.z), q.identity(), s.set(k.sx, 0.26, k.sz)));
      kerb.current!.setColorAt(i, c.set(k.yellow ? "#fec007" : "#181818"));
    });
    data.gutters.forEach((g, i) => gutter.current!.setMatrixAt(i, m.compose(v.set(g.x, 0.125, g.z), q.identity(), s.set(g.sx, 0.02, g.sz))));
    data.slabs.forEach((g, i) => slab.current!.setMatrixAt(i, m.compose(v.set(g.x, 0.16, g.z), q.identity(), s.set(g.sx, 0.08, g.sz))));
    data.lowBuildings.forEach((b, i) => {
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      const ox = (b.maxX - b.minX) * 0.25, oz = (b.maxZ - b.minZ) * 0.25;
      tank.current!.setMatrixAt(i, m.compose(v.set(cx + ox, b.h + 2.2, cz - oz), q.identity(), s.set(1, 1, 1)));
      tank.current!.setColorAt(i, c.set(i % 5 === 0 ? "#1f4fbf" : "#151515"));
      tankStand.current!.setMatrixAt(i, m.compose(v.set(cx + ox, b.h + 0.6, cz - oz), q.identity(), s.set(1, 1, 1)));
      shop.current!.setMatrixAt(i, m.compose(v.set(cx, 1.6, cz), q.identity(), s.set(b.maxX - b.minX + 0.12, 3.2, b.maxZ - b.minZ + 0.12)));
    });
    W.poles.forEach((p, i) => {
      pole.current!.setMatrixAt(i, m.compose(v.set(p.x, 4.5, p.z), q.identity(), s.set(1, 1, 1)));
      arm.current!.setMatrixAt(i, m.compose(v.set(p.x, 8.4, p.z), q.setFromEuler(new THREE.Euler(0, i % 2 ? 0 : Math.PI / 2, 0)), s.set(1, 1, 1)));
    });
    for (const r of [kerb, gutter, slab, tank, tankStand, shop, pole, arm]) {
      r.current!.instanceMatrix.needsUpdate = true;
      if (r.current!.instanceColor) r.current!.instanceColor.needsUpdate = true;
    }
  }, [W, data]);

  const shopMat = useMemo(() => {
    const mt = new THREE.MeshLambertMaterial({ map: shopfront() });
    mt.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
        #ifdef USE_INSTANCING
          vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vec2 rep = abs(normal.x) > 0.5 ? vec2(sc.z / 8.0, 1.0) : abs(normal.y) > 0.5 ? vec2(0.0) : vec2(sc.x / 8.0, 1.0);
          vMapUv = uv * rep;
        #endif`,
      );
    };
    return mt;
  }, []);

  const stopSigns = useMemo(
    () =>
      W.busStops.map((b) => {
        const cv = document.createElement("canvas");
        cv.width = 256; cv.height = 64;
        const g = cv.getContext("2d")!;
        g.fillStyle = "#0b6e4f"; g.fillRect(0, 0, 256, 64);
        g.fillStyle = "#fff"; g.font = "bold 34px Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(b.name, 128, 34);
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      }),
    [W],
  );

  const N = data.lowBuildings.length;
  return (
    <group>
      <instancedMesh ref={kerb} args={[undefined, undefined, data.kerbs.length]} receiveShadow>
        <boxGeometry />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={gutter} args={[undefined, undefined, data.gutters.length]}>
        <boxGeometry />
        <meshLambertMaterial color="#2a2722" />
      </instancedMesh>
      <instancedMesh ref={slab} args={[undefined, undefined, data.slabs.length]} receiveShadow>
        <boxGeometry />
        <meshLambertMaterial color="#a8a294" />
      </instancedMesh>
      <instancedMesh ref={tank} args={[undefined, undefined, N]} castShadow>
        <cylinderGeometry args={[1.1, 1.1, 2, 12]} />
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={tankStand} args={[undefined, undefined, N]}>
        <boxGeometry args={[2.2, 1.2, 2.2]} />
        <meshLambertMaterial color="#5a4a3a" wireframe />
      </instancedMesh>
      <instancedMesh ref={shop} args={[undefined, undefined, N]} castShadow material={shopMat}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={pole} args={[undefined, undefined, W.poles.length]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 9, 6]} />
        <meshLambertMaterial color="#a39e93" />
      </instancedMesh>
      <instancedMesh ref={arm} args={[undefined, undefined, W.poles.length]}>
        <boxGeometry args={[1.8, 0.1, 0.1]} />
        <meshLambertMaterial color="#555" />
      </instancedMesh>
      {/* NECOM House spire: red/white communications mast */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[NECOM.x, NECOM.h + 2.5 + i * 5, NECOM.z]} castShadow>
          <cylinderGeometry args={[0.5 - i * 0.04, 0.55 - i * 0.04, 5, 6]} />
          <meshLambertMaterial color={i % 2 ? "#ffffff" : "#d62828"} />
        </mesh>
      ))}
      <mesh position={[NECOM.x, NECOM.h + 1, NECOM.z]}>
        <boxGeometry args={[NECOM.w * 0.6, 2, NECOM.w * 0.6]} />
        <meshLambertMaterial color="#9a958c" />
      </mesh>
      {/* Danfo bus stops */}
      {W.busStops.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation-y={b.rot}>
          <mesh position={[0, 2.6, 0]} castShadow>
            <boxGeometry args={[5, 0.15, 2]} />
            <meshLambertMaterial color="#fec007" />
          </mesh>
          {[-2.3, 2.3].map((x) => (
            <mesh key={x} position={[x, 1.3, -0.8]}>
              <boxGeometry args={[0.12, 2.6, 0.12]} />
              <meshLambertMaterial color="#222" />
            </mesh>
          ))}
          <mesh position={[0, 0.5, -0.7]}>
            <boxGeometry args={[4, 0.12, 0.5]} />
            <meshLambertMaterial color="#666" />
          </mesh>
          <mesh position={[0, 3.05, 1.01]}>
            <planeGeometry args={[3.2, 0.8]} />
            <meshBasicMaterial map={stopSigns[i] ?? null} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
