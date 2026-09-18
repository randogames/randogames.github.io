import * as THREE from 'three';

const LIFETIME = 0.55;

interface Burst {
  readonly mesh: THREE.Mesh;
  readonly light: THREE.PointLight;
  life: number;
}

/** Short expanding flash where a ship died. */
export class Explosions {
  private readonly bursts: Burst[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  spawn(at: THREE.Vector3): void {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0xffca57, emissive: 0xff7b00, emissiveIntensity: 3, transparent: true, flatShading: true }),
    );
    mesh.position.copy(at);
    const light = new THREE.PointLight(0xffa040, 120, 40);
    light.position.copy(at);
    this.scene.add(mesh, light);
    this.bursts.push({ mesh, light, life: LIFETIME });
  }

  update(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]!;
      b.life -= dt;
      const t = 1 - b.life / LIFETIME;
      b.mesh.scale.setScalar(1 + t * 3.5);
      b.mesh.rotation.set(t * 3, t * 2, 0);
      (b.mesh.material as THREE.MeshStandardMaterial).opacity = 1 - t;
      b.light.intensity = 120 * (1 - t);
      if (b.life <= 0) {
        this.scene.remove(b.mesh, b.light);
        this.bursts.splice(i, 1);
      }
    }
  }
}
