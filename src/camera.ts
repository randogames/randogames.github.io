import * as THREE from 'three';

const MIN_DISTANCE = 5;
const MAX_DISTANCE = 45;
const TURN_RATE = 1.8; // radians per second the camera swings toward the player's heading

/** Third-person camera that hangs behind the player and slowly turns to follow their heading. */
export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = Math.PI;
  distance = 14;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);
    window.addEventListener('wheel', (e) => {
      this.distance = THREE.MathUtils.clamp(this.distance + e.deltaY * 0.02, MIN_DISTANCE, MAX_DISTANCE);
    }, { passive: true });
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  /** Direction the camera is facing, flattened onto the ground. */
  get forward(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  get right(): THREE.Vector3 {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  /** Turn a screen-relative input axis into a world-space direction. */
  moveDirection(axis: { x: number; z: number }): THREE.Vector3 {
    const dir = this.forward.multiplyScalar(-axis.z).add(this.right.multiplyScalar(axis.x));
    return dir.lengthSq() > 0 ? dir.normalize() : dir;
  }

  update(dt: number, target: THREE.Vector3, targetYaw: number | null, snap = false): void {
    if (targetYaw !== null) {
      let diff = targetYaw - this.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.yaw += diff * Math.min(1, TURN_RATE * dt);
    }
    const height = 2 + this.distance * 0.55;
    const desired = new THREE.Vector3(
      target.x - Math.sin(this.yaw) * this.distance,
      target.y + height,
      target.z - Math.cos(this.yaw) * this.distance,
    );
    if (snap) this.camera.position.copy(desired);
    else this.camera.position.lerp(desired, 1 - Math.exp(-dt * 6));
    this.camera.lookAt(target.x, target.y + 1, target.z);
  }
}
