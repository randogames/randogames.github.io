import * as THREE from 'three';

export const DAY_LENGTH = 160; // real seconds per in-game day

const NIGHT = new THREE.Color(0x0a1230);
const DAWN = new THREE.Color(0xf0a060);
const DAY = new THREE.Color(0x87ceeb);
const STORM = new THREE.Color(0x3f4852);

/** Sun, ambient light and sky colour driven by a simple day/night cycle. */
export class DayCycle {
  readonly sun: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private time = DAY_LENGTH * 0.3; // start mid-morning

  constructor(private readonly scene: THREE.Scene) {
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, far: 200 });
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a6b35, 0.8);
    scene.add(this.sun, this.sun.target, this.hemi);
    scene.fog = new THREE.Fog(DAY.clone(), 60, 220);
  }

  get day(): number {
    return Math.floor(this.time / DAY_LENGTH) + 1;
  }

  /** 0 at midnight, 0.5 at noon. */
  get phase(): number {
    return (this.time / DAY_LENGTH) % 1;
  }

  update(dt: number, focus: THREE.Vector3, storm: number): void {
    this.time += dt;
    const angle = (this.phase - 0.25) * Math.PI * 2;
    const elevation = Math.sin(angle);
    const daylight = THREE.MathUtils.clamp(elevation * 1.5 + 0.1, 0, 1);

    this.sun.position.set(focus.x + Math.cos(angle) * 60, focus.y + Math.max(elevation, 0.05) * 80, focus.z + 30);
    this.sun.target.position.copy(focus);
    this.sun.intensity = daylight * 2.5 * (1 - storm * 0.7);
    this.hemi.intensity = 0.25 + daylight * 0.6 * (1 - storm * 0.5);

    const sky = new THREE.Color();
    if (daylight < 0.5) sky.lerpColors(NIGHT, DAWN, daylight * 2);
    else sky.lerpColors(DAWN, DAY, (daylight - 0.5) * 2);
    sky.lerp(STORM, storm);
    this.scene.background = sky;
    if (this.scene.fog) this.scene.fog.color.copy(sky);
  }
}
