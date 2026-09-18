import type { ToolKind } from './tools';

export interface Inventory {
  /** Tool currently in hand, chosen with keys 1-4. */
  held: ToolKind | null;
  wood: number;
  stone: number;
  rawMeat: number;
  cookedMeat: number;
  axe: boolean;
  pickaxe: boolean;
  sword: boolean;
  pot: boolean;
}

export function createInventory(): Inventory {
  return { held: null, wood: 0, stone: 0, rawMeat: 0, cookedMeat: 0, axe: false, pickaxe: false, sword: false, pot: false };
}
