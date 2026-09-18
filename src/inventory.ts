export interface Inventory {
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
  return { wood: 0, stone: 0, rawMeat: 0, cookedMeat: 0, axe: false, pickaxe: false, sword: false, pot: false };
}
