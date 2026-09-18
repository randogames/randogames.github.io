import * as THREE from 'three';

const COUNT = 1400;
const SPREAD = 260;

/** Stars and drifting nebula haze that recycle around the player so the sky never runs out. */
export class Starfield {
  private readonly points: THREE.Points;
  private readonly positions: Float32Array;

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * SPREAD;
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD * 0.6;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.9 }),
    );
    scene.add(this.points);
  }

  /** Keep stars centred on the ship, wrapping any that fall too far behind. */
  update(focus: THREE.Vector3): void {
    this.points.position.set(focus.x, focus.y, focus.z);
    const half = SPREAD / 2;
    for (let i = 0; i < COUNT; i++) {
      const z = this.positions[i * 3 + 2]!;
      // Ship flies toward -Z, so stars drift to +Z in ship space.
      if (z > half) this.positions[i * 3 + 2] = z - SPREAD;
      else if (z < -half) this.positions[i * 3 + 2] = z + SPREAD;
    }
    this.points.geometry.attributes['position']!.needsUpdate = true;
  }

  /** Stars scroll past as the ship advances. */
  advance(distance: number): void {
    for (let i = 0; i < COUNT; i++) {
      this.positions[i * 3 + 2] = this.positions[i * 3 + 2]! + distance;
    }
  }
}
