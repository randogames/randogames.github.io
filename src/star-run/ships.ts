import * as THREE from 'three';

/** Nose points along local -Z, the direction of travel. */
export function buildPlayerShip(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 3, 4),
    new THREE.MeshStandardMaterial({ color: 0xd7e3f4, metalness: 0.5, roughness: 0.35 }),
  );
  body.rotation.x = -Math.PI / 2;
  body.rotation.z = Math.PI / 4;
  body.castShadow = true;

  const wings = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.14, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x3f7fd0, metalness: 0.4, roughness: 0.4 }),
  );
  wings.position.z = 0.5;

  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.8, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x3f7fd0 }),
  );
  fin.position.set(0, 0.45, 1);

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x0b1d33, emissive: 0x1d3f6b, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.1 }),
  );
  cockpit.position.set(0, 0.28, -0.2);

  g.add(body, wings, fin, cockpit);
  for (const x of [-1.5, 1.5]) {
    const engine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 1, 10),
      new THREE.MeshStandardMaterial({ color: 0x8894a5, metalness: 0.6, roughness: 0.3 }),
    );
    engine.rotation.x = Math.PI / 2;
    engine.position.set(x, -0.05, 0.9);
    g.add(engine);
  }
  return g;
}

export interface EnemyLook {
  readonly color: number;
  readonly scale: number;
}

export function buildEnemyShip(look: EnemyLook): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9, 0),
    new THREE.MeshStandardMaterial({ color: look.color, metalness: 0.5, roughness: 0.4, flatShading: true }),
  );
  hull.castShadow = true;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.13, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0x2a2a35, metalness: 0.7, roughness: 0.3 }),
  );
  ring.rotation.x = Math.PI / 2;
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff2200, emissiveIntensity: 2 }),
  );
  eye.position.z = -0.7;
  g.add(hull, ring, eye);
  g.scale.setScalar(look.scale);
  return g;
}
