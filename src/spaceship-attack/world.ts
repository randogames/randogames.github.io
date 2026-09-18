/** The play area in game units. The canvas scales to fit this box. */
export const VIEW_WIDTH = 480;
export const VIEW_HEIGHT = 720;

export interface Vec2 {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function overlaps(a: Vec2, aRadius: number, b: Vec2, bRadius: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = aRadius + bRadius;
  return dx * dx + dy * dy <= r * r;
}
