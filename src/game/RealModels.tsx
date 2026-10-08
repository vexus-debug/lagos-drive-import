import { useFrame, useLoader } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { SPECS, type Car, type Ped } from "./types";

const CAR_URL = (n: string) => `/models/cars/${n}.glb`;
const SEDANS = ["sedan", "sedan-sports", "suv", "hatchback-sports", "taxi"];
const PEOPLE = ["male-a", "male-b", "male-c", "female-a", "female-b", "female-c"].map((n) => `/models/people/character-${n}.glb`);

/** Kenney cars face -Z; the game drives along +Z, so the model is turned around. */
const CAR_YAW = Math.PI;

function fitCar(src: THREE.Object3D, len: number, tint?: string) {
  const o = src.clone(true);
  o.traverse((m) => {
    const mesh = m as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    if (tint) {
      const mt = (mesh.material as THREE.MeshStandardMaterial).clone();
      mt.color.set(tint);
      mesh.material = mt;
    }
  });
  const box = new THREE.Box3().setFromObject(o);
  const size = box.getSize(new THREE.Vector3());
  const s = len / Math.max(size.x, size.z);
  const g = new THREE.Group();
  o.scale.setScalar(s);
  o.position.set(-((box.min.x + box.max.x) / 2) * s, -box.min.y * s, -((box.min.z + box.max.z) / 2) * s);
  const pivot = new THREE.Group();
  pivot.rotation.y = CAR_YAW;
  pivot.add(o);
  g.add(pivot);
  return g;
}

export function RealCar({ car }: { car: Car }) {
  const name = car.type === "danfo" ? "van" : car.type === "police" ? "police" : SEDANS[car.id % SEDANS.length];
  const gltf = useLoader(GLTFLoader, CAR_URL(name));
  const ref = useRef<THREE.Group>(null);
  const obj = useMemo(
    () => fitCar(gltf.scene, SPECS[car.type].len, car.type === "danfo" ? "#ffd21f" : undefined),
    [gltf, car.type],
  );
  const red = useMemo(() => new THREE.MeshLambertMaterial({ color: "#ff2030", emissive: "#ff0010", emissiveIntensity: 0.1 }), []);
  const blue = useMemo(() => new THREE.MeshLambertMaterial({ color: "#2050ff", emissive: "#0030ff", emissiveIntensity: 0.1 }), []);
  useLayoutEffect(() => {
    car.obj = ref.current;
    car.lights = [red, blue];
  }, [car, red, blue]);
  return (
    <group ref={ref} visible={car.active}>
      <primitive object={obj} />
      {car.type === "police" && (
        <>
          <mesh position={[-0.3, 1.75, -0.2]} material={red}><boxGeometry args={[0.5, 0.15, 0.3]} /></mesh>
          <mesh position={[0.3, 1.75, -0.2]} material={blue}><boxGeometry args={[0.5, 0.15, 0.3]} /></mesh>
        </>
      )}
    </group>
  );
}

export function RealPed({ ped }: { ped: Ped }) {
  const gltf = useLoader(GLTFLoader, PEOPLE[ped.id % PEOPLE.length]);
  const ref = useRef<THREE.Group>(null);
  const { obj, mixer, walk, die } = useMemo(() => {
    const o = skClone(gltf.scene);
    o.traverse((m) => ((m as THREE.Mesh).isMesh && ((m as THREE.Mesh).castShadow = true)));
    const box = new THREE.Box3().setFromObject(o);
    o.scale.setScalar(1.75 / (box.max.y - box.min.y));
    const mixer = new THREE.AnimationMixer(o);
    const clip = (n: string) => gltf.animations.find((a) => a.name === n);
    const walk = clip("walk") ? mixer.clipAction(clip("walk")!) : null;
    const die = clip("die") ? mixer.clipAction(clip("die")!) : null;
    if (die) { die.setLoop(THREE.LoopOnce, 1); die.clampWhenFinished = true; }
    walk?.play();
    mixer.update(ped.id * 0.13);
    return { obj: o, mixer, walk, die };
  }, [gltf, ped.id]);
  const wasDead = useRef(false);
  useLayoutEffect(() => {
    ped.obj = ref.current;
  }, [ped]);
  useFrame((_, dt) => {
    const dead = ped.dead > 0;
    if (dead !== wasDead.current) {
      wasDead.current = dead;
      if (dead) { walk?.stop(); die?.reset().play(); } else { die?.stop(); walk?.play(); }
    }
    if (ref.current?.visible) mixer.update(Math.min(dt, 0.05) * (dead ? 1 : ped.speed / 1.4));
  });
  return (
    <group ref={ref}>
      <primitive object={obj} />
    </group>
  );
}
