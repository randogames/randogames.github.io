import * as THREE from 'three';
import type { World } from './world';

export const BOAT_COST = 12;
const BOAT_SPEED = 14;

export class Boat {
  readonly group: THREE.Group;
  heading = 0;
  private time = 0;

  constructor(scene: THREE.Scene, x: number, z: number) {
    this.group = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.8, 5),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b }),
    );
    hull.castShadow = true;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c3a1a }),
    );
    mast.position.y = 2.2;
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 2.8),
      new THREE.MeshStandardMaterial({ color: 0xf5f0e0, side: THREE.DoubleSide }),
    );
    sail.position.set(0, 2.6, -0.2);
    this.group.add(hull, mast, sail);
    this.group.position.set(x, 0.2, z);
    scene.add(this.group);
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  drive(dt: number, dir: THREE.Vector3, wind: THREE.Vector3, world: World, storm: number): void {
    this.time += dt;
    const next = this.group.position.clone().addScaledVector(dir, BOAT_SPEED * dt).addScaledVector(wind, dt);
    if (world.heightAt(next.x, next.z) < 0) {
      this.group.position.x = next.x;
      this.group.position.z = next.z;
    }
    if (dir.lengthSq() > 0) this.heading = Math.atan2(dir.x, dir.z);
    this.group.rotation.y = this.heading;
    this.group.position.y = 0.2 + Math.sin(this.time * 2.5) * (0.08 + storm * 0.35);
    this.group.rotation.z = Math.sin(this.time * 1.7) * (0.03 + storm * 0.2);
  }
}
