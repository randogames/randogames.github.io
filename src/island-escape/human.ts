import * as THREE from 'three';

/** A simple blocky human made of boxes. Origin is at the hips; feet are 0.8 below. */
export interface Human {
  readonly group: THREE.Group;
  readonly head: THREE.Mesh;
  readonly leftLeg: THREE.Group;
  readonly rightLeg: THREE.Group;
  readonly leftArm: THREE.Group;
  readonly rightArm: THREE.Group;
}

export interface HumanColors {
  shirt: number;
  pants: number;
  skin?: number;
  hair?: number;
}

export function buildHuman(colors: HumanColors): Human {
  const skin = new THREE.MeshStandardMaterial({ color: colors.skin ?? 0xf1c27d });
  const shirt = new THREE.MeshStandardMaterial({ color: colors.shirt });
  const pants = new THREE.MeshStandardMaterial({ color: colors.pants });
  const hair = new THREE.MeshStandardMaterial({ color: colors.hair ?? 0x3b2a1a });
  const eye = new THREE.MeshStandardMaterial({ color: 0x111111 });

  const group = new THREE.Group();
  group.rotation.order = 'YXZ';

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.28), shirt);
  torso.position.y = 0.325;
  torso.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skin);
  head.position.y = 0.9;
  head.castShadow = true;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), hair);
  cap.position.y = 0.94;
  for (const side of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eye);
    e.position.set(side * 0.08, 0.93, 0.19);
    group.add(e);
  }

  const limb = (w: number, len: number, mat: THREE.Material, x: number, y: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), mat);
    mesh.position.y = -len / 2;
    mesh.castShadow = true;
    pivot.add(mesh);
    return pivot;
  };
  const leftLeg = limb(0.22, 0.8, pants, -0.13, 0);
  const rightLeg = limb(0.22, 0.8, pants, 0.13, 0);
  const leftArm = limb(0.16, 0.65, skin, -0.34, 0.6);
  const rightArm = limb(0.16, 0.65, skin, 0.34, 0.6);
  const sleeveL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.18), shirt);
  sleeveL.position.y = -0.14;
  const sleeveR = sleeveL.clone();
  leftArm.add(sleeveL);
  rightArm.add(sleeveR);

  group.add(torso, head, cap, leftLeg, rightLeg, leftArm, rightArm);
  return { group, head, leftLeg, rightLeg, leftArm, rightArm };
}

export interface Pose {
  /** Walk cycle phase, advanced by distance travelled. */
  walk: number;
  moving: boolean;
  sneaking: boolean;
  swimming: boolean;
  /** 0..1 remaining time of an arm swing (hitting). */
  swing: number;
}

export function poseHuman(h: Human, p: Pose): void {
  const g = h.group;
  const s = p.moving ? Math.sin(p.walk) : 0;
  const ease = 0.25;

  if (p.swimming) {
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 1.35, ease);
    g.scale.y = 1;
    const t = p.walk * 1.5;
    h.leftArm.rotation.x = Math.PI + Math.sin(t) * 0.8;
    h.rightArm.rotation.x = Math.PI + Math.sin(t + Math.PI) * 0.8;
    h.leftLeg.rotation.x = Math.sin(t * 2) * 0.35;
    h.rightLeg.rotation.x = -Math.sin(t * 2) * 0.35;
    return;
  }

  g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, p.sneaking ? 0.4 : 0, ease);
  g.scale.y = THREE.MathUtils.lerp(g.scale.y, p.sneaking ? 0.75 : 1, ease);
  const stride = p.sneaking ? 0.4 : 0.75;
  h.leftLeg.rotation.x = s * stride;
  h.rightLeg.rotation.x = -s * stride;
  h.leftArm.rotation.x = -s * stride * 0.7;
  h.rightArm.rotation.x = p.swing > 0 ? -1.8 + (1 - p.swing) * 2.2 : s * stride * 0.7;
}
