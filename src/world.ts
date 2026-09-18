import * as THREE from 'three';
import { seededRandom } from './random';

export interface Island {
  readonly center: THREE.Vector2;
  readonly radius: number;
  readonly height: number;
  readonly isCity: boolean;
}

export interface World {
  readonly islands: readonly Island[];
  readonly home: Island;
  readonly city: Island;
  /** Ground height at (x, z). Below 0 means water. */
  heightAt(x: number, z: number): number;
  islandAt(x: number, z: number): Island | null;
  nearestIsland(x: number, z: number): Island;
}

const SEA_SIZE = 700;
export const CITY_DISTANCE = 2600;

const sand = new THREE.MeshStandardMaterial({ color: 0xc2b280 });
const grass = new THREE.MeshStandardMaterial({ color: 0x4f9a3a });
const concrete = new THREE.MeshStandardMaterial({ color: 0x9a9a9a });
const brick = new THREE.MeshStandardMaterial({ color: 0xb5583a });

export function createWorld(scene: THREE.Scene): World & { sea: THREE.Mesh } {
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(SEA_SIZE, SEA_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x1f6fb5, roughness: 0.35 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  scene.add(sea);

  const home: Island = { center: new THREE.Vector2(0, 0), radius: 16, height: 1.5, isCity: false };
  const city: Island = { center: new THREE.Vector2(0, -CITY_DISTANCE), radius: 55, height: 2, isCity: true };
  const islands: Island[] = [
    home,
    { center: new THREE.Vector2(48, -22), radius: 9, height: 2, isCity: false },
    { center: new THREE.Vector2(-42, 32), radius: 11, height: 1.2, isCity: false },
    { center: new THREE.Vector2(-30, -60), radius: 8, height: 1.8, isCity: false },
    { center: new THREE.Vector2(70, 40), radius: 13, height: 1.4, isCity: false },
    { center: new THREE.Vector2(20, 80), radius: 7, height: 2.2, isCity: false },
    // Small rest stops on the long way to the city.
    { center: new THREE.Vector2(120, -700), radius: 8, height: 1.6, isCity: false },
    { center: new THREE.Vector2(-150, -1400), radius: 9, height: 1.6, isCity: false },
    { center: new THREE.Vector2(90, -2000), radius: 7, height: 1.6, isCity: false },
    city,
  ];

  for (const island of islands) {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(island.radius, island.radius * 1.3, island.height, 40),
      sand,
    );
    base.position.set(island.center.x, island.height / 2, island.center.y);
    base.receiveShadow = true;
    scene.add(base);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(island.radius * 0.72, island.radius * 0.72, 0.2, 40),
      island.isCity ? concrete : grass,
    );
    top.position.set(island.center.x, island.height + 0.1, island.center.y);
    top.receiveShadow = true;
    scene.add(top);
  }

  buildCity(scene, city);

  return {
    sea,
    islands,
    home,
    city,
    heightAt(x, z) {
      const island = this.islandAt(x, z);
      return island ? island.height : -1;
    },
    islandAt(x, z) {
      const p = new THREE.Vector2(x, z);
      return islands.find((i) => i.center.distanceTo(p) <= i.radius) ?? null;
    },
    nearestIsland(x, z) {
      const p = new THREE.Vector2(x, z);
      let best = home;
      let bestDist = Infinity;
      for (const i of islands) {
        const d = i.center.distanceTo(p) - i.radius;
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    },
  };
}

function buildCity(scene: THREE.Scene, city: Island): void {
  const rand = seededRandom(7);
  for (let i = 0; i < 40; i++) {
    const w = 3 + rand() * 5;
    const h = 4 + rand() * 18;
    const angle = rand() * Math.PI * 2;
    const dist = rand() * city.radius * 0.6;
    const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), rand() > 0.5 ? concrete : brick);
    building.position.set(
      city.center.x + Math.cos(angle) * dist,
      city.height + h / 2,
      city.center.y + Math.sin(angle) * dist,
    );
    building.castShadow = true;
    scene.add(building);
  }
  const lighthouse = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.8, 30, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  );
  lighthouse.position.set(city.center.x, city.height + 15, city.center.y + city.radius * 0.7);
  scene.add(lighthouse);
  const lamp = new THREE.PointLight(0xfff2b0, 200, 300);
  lamp.position.set(city.center.x, city.height + 31, city.center.y + city.radius * 0.7);
  scene.add(lamp);
}
