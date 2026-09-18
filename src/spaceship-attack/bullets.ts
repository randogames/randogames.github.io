import * as THREE from 'three';

const SPEED = 90;
const LIFETIME = 2.2;

export interface Bullet {
  readonly mesh: THREE.Mesh;
  readonly velocity: THREE.Vector3;
  readonly damage: number;
  readonly hostile: boolean;
  life: number;
}

const playerMat = new THREE.MeshStandardMaterial({ color: 0x7ef9ff, emissive: 0x39d6ff, emissiveIntensity: 3 });
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff6a00, emissiveIntensity: 3 });
const geometry = new THREE.CapsuleGeometry(0.11, 0.7, 4, 6);

/** Shared pool of player and enemy shots. */
export class Bullets {
  readonly list: Bullet[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  spawn(from: THREE.Vector3, direction: THREE.Vector3, damage: number, hostile: boolean): void {
    const mesh = new THREE.Mesh(geometry, hostile ? enemyMat : playerMat);
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    this.scene.add(mesh);
    this.list.push({ mesh, velocity: direction.clone().normalize().multiplyScalar(SPEED), damage, hostile, life: LIFETIME });
  }

  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i]!;
      b.mesh.position.addScaledVector(b.velocity, dt);
      b.life -= dt;
      if (b.life <= 0) this.remove(i);
    }
  }

  remove(index: number): void {
    const b = this.list[index];
    if (!b) return;
    this.scene.remove(b.mesh);
    this.list.splice(index, 1);
  }
}
