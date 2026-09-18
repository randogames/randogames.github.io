import * as THREE from 'three';

const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
const darkWood = new THREE.MeshStandardMaterial({ color: 0x5c3a1a });
const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6f6f6f });

export interface Campfire {
  readonly position: THREE.Vector3;
  readonly light: THREE.PointLight;
  readonly flame: THREE.Mesh;
  time: number;
}

export function placeTable(scene: THREE.Scene, pos: THREE.Vector3): THREE.Vector3 {
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.15, 1.3), woodMat);
  top.position.y = 0.9;
  top.castShadow = true;
  group.add(top);
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.15), darkWood);
    leg.position.set(x, 0.45, z);
    group.add(leg);
  }
  // Grid lines on top so it reads as a crafting table.
  for (const offset of [-0.22, 0.22]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.04), darkWood);
    a.position.set(0, 0.99, offset);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 1.2), darkWood);
    b.position.set(offset, 0.99, 0);
    group.add(a, b);
  }
  group.position.copy(pos);
  scene.add(group);
  return pos.clone();
}

export function placeCampfire(scene: THREE.Scene, pos: THREE.Vector3): Campfire {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), darkWood);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 3) * Math.PI;
    log.position.y = 0.12;
    group.add(log);
  }
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), stoneMat);
    const a = (i / 8) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.9, 0.1, Math.sin(a) * 0.9);
    group.add(s);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.1, 8),
    new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5500, emissiveIntensity: 2, transparent: true, opacity: 0.9 }),
  );
  flame.position.y = 0.7;
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffcc33, emissiveIntensity: 3 }),
  );
  core.position.y = 0.55;
  group.add(flame, core);

  const light = new THREE.PointLight(0xff9a3c, 80, 28, 1.6);
  light.position.y = 1.2;
  group.add(light);

  group.position.copy(pos);
  scene.add(group);
  return { position: pos.clone(), light, flame, time: Math.random() * 10 };
}

export function updateCampfires(fires: readonly Campfire[], dt: number): void {
  for (const f of fires) {
    f.time += dt;
    const flicker = 0.85 + Math.sin(f.time * 17) * 0.08 + Math.sin(f.time * 31) * 0.07;
    f.light.intensity = 80 * flicker;
    f.flame.scale.set(flicker, 0.9 + flicker * 0.3, flicker);
  }
}

/** Is any of the given positions within `range` of `from`? */
export function anyNear(positions: readonly THREE.Vector3[], from: THREE.Vector3, range: number): boolean {
  return positions.some((p) => p.distanceTo(from) <= range);
}
