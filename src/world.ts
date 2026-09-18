import * as THREE from 'three';

export interface Island {
  readonly center: THREE.Vector2;
  readonly radius: number;
  readonly height: number;
}

export interface World {
  readonly islands: readonly Island[];
  /** Ground height at (x, z). Below 0 means water. */
  heightAt(x: number, z: number): number;
}

const SEA_SIZE = 400;

export function createWorld(scene: THREE.Scene): World {
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60 });
  scene.add(sun, new THREE.HemisphereLight(0xbfd8ff, 0x3a6b35, 0.8));

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(SEA_SIZE, SEA_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x1f6fb5, roughness: 0.3 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  scene.add(sea);

  const islands: Island[] = [
    { center: new THREE.Vector2(0, 0), radius: 14, height: 1.5 },
    { center: new THREE.Vector2(45, -20), radius: 9, height: 2 },
    { center: new THREE.Vector2(-40, 30), radius: 11, height: 1.2 },
  ];

  for (const island of islands) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(island.radius, island.radius * 1.3, island.height, 32),
      new THREE.MeshStandardMaterial({ color: 0xc2b280 }),
    );
    mesh.position.set(island.center.x, island.height / 2, island.center.y);
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grass = new THREE.Mesh(
      new THREE.CylinderGeometry(island.radius * 0.7, island.radius * 0.7, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x4f9a3a }),
    );
    grass.position.set(island.center.x, island.height + 0.1, island.center.y);
    grass.receiveShadow = true;
    scene.add(grass);

    const palm = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b }),
    );
    palm.position.set(island.center.x + island.radius * 0.4, island.height + 2, island.center.y);
    palm.castShadow = true;
    scene.add(palm);
  }

  return {
    islands,
    heightAt(x, z) {
      for (const island of islands) {
        if (island.center.distanceTo(new THREE.Vector2(x, z)) <= island.radius) {
          return island.height;
        }
      }
      return -1;
    },
  };
}
