import * as THREE from 'three';
import { buildEnemyShip } from './ships';
import type { Bullets } from './bullets';
import type { PlayerShip } from './player-ship';

const SPAWN_AHEAD = 190;
const DESPAWN_BEHIND = 40;
const HIT_RADIUS = 1.9;

export interface EnemyKill {
  readonly position: THREE.Vector3;
}

interface Enemy {
  readonly group: THREE.Group;
  readonly drift: THREE.Vector3;
  hp: number;
  fireTimer: number;
  bob: number;
}

const TIERS = [
  { color: 0x8e44ad, scale: 1, hp: 2, fireEvery: 2.6 },
  { color: 0xc0392b, scale: 1.25, hp: 4, fireEvery: 1.9 },
  { color: 0x16a085, scale: 0.85, hp: 2, fireEvery: 1.4 },
];

/** Waves of hostile ships that fly toward the player and shoot back. */
export class Enemies {
  private readonly enemies: Enemy[] = [];
  private spawnTimer = 1.5;

  constructor(private readonly scene: THREE.Scene) {}

  get count(): number {
    return this.enemies.length;
  }

  nearest(from: THREE.Vector3): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null;
    let bestDist = Infinity;
    for (const e of this.enemies) {
      const d = e.group.position.distanceTo(from);
      if (d < bestDist) {
        bestDist = d;
        best = e.group.position;
      }
    }
    return best;
  }

  /** Difficulty ramps with how far the player has flown. */
  private spawnInterval(distance: number): number {
    return Math.max(0.55, 2.4 - distance / 4000);
  }

  update(dt: number, player: PlayerShip, bullets: Bullets, hostile: boolean): EnemyKill[] {
    const kills: EnemyKill[] = [];

    if (hostile) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.spawnInterval(player.distance);
        this.spawn(player);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      e.bob += dt;
      e.group.position.addScaledVector(e.drift, dt);
      e.group.position.y += Math.sin(e.bob * 1.6) * 6 * dt;
      e.group.rotation.y += dt * 1.2;

      // Slide toward the player's lane so they actually threaten.
      const dx = player.position.x - e.group.position.x;
      e.group.position.x += THREE.MathUtils.clamp(dx, -8, 8) * dt * 0.6;

      if (e.group.position.z > player.position.z + DESPAWN_BEHIND) {
        this.remove(i);
        continue;
      }

      if (hostile) {
        e.fireTimer -= dt;
        if (e.fireTimer <= 0) {
          e.fireTimer = 1.4 + Math.random() * 1.6;
          const dir = player.position.clone().sub(e.group.position).normalize();
          bullets.spawn(e.group.position.clone().addScaledVector(dir, 1.4), dir, 6, true);
        }
      }

      // Player shots hitting this enemy.
      for (let b = bullets.list.length - 1; b >= 0; b--) {
        const bullet = bullets.list[b]!;
        if (bullet.hostile) continue;
        if (bullet.mesh.position.distanceTo(e.group.position) > HIT_RADIUS * e.group.scale.x) continue;
        e.hp -= bullet.damage;
        bullets.remove(b);
        if (e.hp <= 0) {
          kills.push({ position: e.group.position.clone() });
          this.remove(i);
          break;
        }
      }
    }

    return kills;
  }

  /** Enemy shots and collisions hurting the player. */
  checkPlayerHits(player: PlayerShip, bullets: Bullets): void {
    for (let b = bullets.list.length - 1; b >= 0; b--) {
      const bullet = bullets.list[b]!;
      if (!bullet.hostile) continue;
      if (bullet.mesh.position.distanceTo(player.position) > 2.2) continue;
      player.damage(bullet.damage);
      bullets.remove(b);
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      if (e.group.position.distanceTo(player.position) > 2.6) continue;
      player.damage(18);
      this.remove(i);
    }
  }

  private spawn(player: PlayerShip): void {
    const tier = TIERS[Math.floor(Math.random() * TIERS.length)]!;
    const group = buildEnemyShip({ color: tier.color, scale: tier.scale });
    group.position.set(
      player.position.x + (Math.random() - 0.5) * 60,
      THREE.MathUtils.clamp(player.position.y + (Math.random() - 0.5) * 30, 6, 48),
      player.position.z - SPAWN_AHEAD,
    );
    this.scene.add(group);
    this.enemies.push({
      group,
      drift: new THREE.Vector3((Math.random() - 0.5) * 6, 0, 18 + Math.random() * 10),
      hp: tier.hp,
      fireTimer: 1 + Math.random() * 2,
      bob: Math.random() * 10,
    });
  }

  private remove(index: number): void {
    const e = this.enemies[index];
    if (!e) return;
    this.scene.remove(e.group);
    this.enemies.splice(index, 1);
  }
}
