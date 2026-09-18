import * as THREE from 'three';
import { seededRandom } from './random';
import type { World } from './world';

const HITS_TO_FELL = 4;
const REGROW_SECONDS = 90;

interface Tree {
  readonly group: THREE.Group;
  readonly pos: THREE.Vector3;
  hits: number;
  regrow: number;
  shake: number;
}

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });

export class Trees {
  private readonly trees: Tree[] = [];

  constructor(scene: THREE.Scene, world: World) {
    const rand = seededRandom(42);
    for (const island of world.islands) {
      if (island.isCity) continue;
      const count = 3 + Math.floor(island.radius / 3);
      for (let i = 0; i < count; i++) {
        const angle = rand() * Math.PI * 2;
        const dist = 3 + rand() * (island.radius * 0.68 - 3);
        const pos = new THREE.Vector3(
          island.center.x + Math.cos(angle) * dist,
          island.height,
          island.center.y + Math.sin(angle) * dist,
        );
        const group = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 8), trunkMat);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), leafMat);
        leaves.position.y = 3.6;
        leaves.castShadow = true;
        group.add(trunk, leaves);
        group.position.copy(pos);
        scene.add(group);
        this.trees.push({ group, pos, hits: 0, regrow: 0, shake: 0 });
      }
    }
  }

  /** Hit the nearest standing tree within range. Returns wood gained, or null if no tree. */
  hit(from: THREE.Vector3, range: number): { wood: number; felled: boolean } | null {
    let best: Tree | null = null;
    let bestDist = range;
    for (const t of this.trees) {
      if (t.regrow > 0) continue;
      const d = t.pos.distanceTo(from);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    if (!best) return null;
    best.hits += 1;
    best.shake = 0.3;
    if (best.hits >= HITS_TO_FELL) {
      best.regrow = REGROW_SECONDS;
      best.hits = 0;
      best.group.visible = false;
      return { wood: 2, felled: true };
    }
    return { wood: 1, felled: false };
  }

  /** Position of the nearest standing tree, or null. */
  nearestStanding(from: THREE.Vector3): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null;
    let bestDist = Infinity;
    for (const t of this.trees) {
      if (t.regrow > 0) continue;
      const d = t.pos.distanceTo(from);
      if (d < bestDist) {
        bestDist = d;
        best = t.pos;
      }
    }
    return best;
  }

  update(dt: number): void {
    for (const t of this.trees) {
      if (t.regrow > 0) {
        t.regrow -= dt;
        if (t.regrow <= 0) {
          t.group.visible = true;
          t.group.scale.setScalar(1);
        }
        continue;
      }
      if (t.shake > 0) {
        t.shake -= dt;
        t.group.rotation.z = Math.sin(t.shake * 40) * 0.08;
      } else {
        t.group.rotation.z = 0;
      }
    }
  }
}
