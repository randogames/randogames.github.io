import * as THREE from 'three';
import type { Input } from './input';
import type { World } from './world';

const WALK_SPEED = 8;

export class Player {
  readonly mesh: THREE.Mesh;

  constructor(scene: THREE.Scene, private readonly world: World) {
    this.mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xe25822 }),
    );
    this.mesh.castShadow = true;
    const start = world.islands[0];
    const y = start ? start.height : 0;
    this.mesh.position.set(start?.center.x ?? 0, y + 0.8, start?.center.y ?? 0);
    scene.add(this.mesh);
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  update(dt: number, input: Input): void {
    const { x, z } = input.axis;
    if (x === 0 && z === 0) return;

    const dir = new THREE.Vector3(x, 0, z).normalize();
    const next = this.mesh.position.clone().addScaledVector(dir, WALK_SPEED * dt);
    const ground = this.world.heightAt(next.x, next.z);
    if (ground < 0) return; // Can't walk into the sea (yet).

    next.y = ground + 0.8;
    this.mesh.position.copy(next);
    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  }
}
