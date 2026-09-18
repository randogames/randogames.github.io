import * as THREE from 'three';

const RAIN_COUNT = 2500;
const RAIN_BOX = 70;

/** Occasional storms: dark sky, rain, and wind that pushes boats and swimmers. */
export class Weather {
  readonly wind = new THREE.Vector3();
  /** 0 = clear, 1 = full storm (eases in and out). */
  storm = 0;
  private active = false;
  private timer = 120 + Math.random() * 120;
  private readonly rain: THREE.Points;
  private readonly positions: Float32Array;
  private readonly material: THREE.PointsMaterial;
  private readonly targetWind = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * RAIN_BOX;
      this.positions[i * 3 + 1] = Math.random() * 40;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_BOX;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.PointsMaterial({ color: 0xbcd4ee, size: 0.18, transparent: true, opacity: 0 });
    this.rain = new THREE.Points(geometry, this.material);
    this.rain.visible = false;
    scene.add(this.rain);
  }

  get isStorm(): boolean {
    return this.active;
  }

  update(dt: number, focus: THREE.Vector3, notify: (m: string) => void): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.active = !this.active;
      if (this.active) {
        this.timer = 20 + Math.random() * 15;
        const a = Math.random() * Math.PI * 2;
        this.targetWind.set(Math.cos(a) * 5, 0, Math.sin(a) * 5);
        notify('A storm is rolling in!');
      } else {
        this.timer = 240 + Math.random() * 240;
        this.targetWind.set(0, 0, 0);
        notify('The storm has passed.');
      }
    }

    const goal = this.active ? 1 : 0;
    this.storm += (goal - this.storm) * Math.min(1, dt * 0.6);
    this.wind.lerp(this.targetWind, Math.min(1, dt * 0.5));

    this.rain.visible = this.storm > 0.02;
    this.material.opacity = this.storm * 0.8;
    if (!this.rain.visible) return;

    this.rain.position.set(focus.x, 0, focus.z);
    const fall = 28 * dt;
    for (let i = 0; i < RAIN_COUNT; i++) {
      let y = (this.positions[i * 3 + 1] ?? 0) - fall;
      if (y < 0) y += 40;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3] = (this.positions[i * 3] ?? 0) + this.wind.x * dt * 0.3;
      this.positions[i * 3 + 2] = (this.positions[i * 3 + 2] ?? 0) + this.wind.z * dt * 0.3;
      if (Math.abs(this.positions[i * 3] ?? 0) > RAIN_BOX / 2) this.positions[i * 3] = -(this.positions[i * 3] ?? 0);
      if (Math.abs(this.positions[i * 3 + 2] ?? 0) > RAIN_BOX / 2) this.positions[i * 3 + 2] = -(this.positions[i * 3 + 2] ?? 0);
    }
    this.rain.geometry.attributes['position']!.needsUpdate = true;
  }
}
