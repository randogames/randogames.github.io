import * as THREE from 'three';

export type ToolKind = 'axe' | 'pickaxe' | 'sword' | 'pot';

/** Hotbar order: key 1 to 4. */
export const HOTBAR: readonly ToolKind[] = ['axe', 'pickaxe', 'sword', 'pot'];

export const TOOL_NAMES: Record<ToolKind, string> = {
  axe: 'Stone axe',
  pickaxe: 'Stone pickaxe',
  sword: 'Stone sword',
  pot: 'Cooking pot',
};

const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7d7d7d, roughness: 0.8 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.6, roughness: 0.4 });

/** Builds a hand-held tool. Local +Y runs from the grip to the tip. */
export function buildTool(kind: ToolKind): THREE.Group {
  const g = new THREE.Group();
  const handle = (): THREE.Mesh => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), handleMat);
    h.position.y = 0.35;
    return h;
  };
  switch (kind) {
    case 'axe': {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.3), stoneMat);
      head.position.set(0, 0.62, 0.1);
      g.add(handle(), head);
      break;
    }
    case 'pickaxe': {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.55), stoneMat);
      head.position.y = 0.68;
      g.add(handle(), head);
      break;
    }
    case 'sword': {
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.06), handleMat);
      grip.position.y = 0.12;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.06), stoneMat);
      guard.position.y = 0.26;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.03), stoneMat);
      blade.position.y = 0.58;
      g.add(grip, guard, blade);
      break;
    }
    case 'pot': {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.24, 12), metalMat);
      body.position.y = 0.2;
      const bail = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 16, Math.PI), metalMat);
      bail.position.y = 0.32;
      g.add(body, bail);
      break;
    }
  }
  for (const child of g.children) child.castShadow = true;
  return g;
}
