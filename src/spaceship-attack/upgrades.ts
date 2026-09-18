export interface Loadout {
  /** Shots fired per trigger press. */
  guns: number;
  /** Minimum seconds between presses, so mashing cannot machine-gun. */
  fireDelay: number;
  /** Damage per bullet. */
  damage: number;
  ammo: number;
  maxAmmo: number;
}

export interface Upgrade {
  readonly name: string;
  readonly apply: (l: Loadout) => void;
}

const AMMO_CAP = 400;

function addAmmo(l: Loadout, amount: number): void {
  l.maxAmmo = Math.min(AMMO_CAP, l.maxAmmo + amount);
  l.ammo = Math.min(l.maxAmmo, l.ammo + amount);
}

/**
 * Awarded in order. Damage only rises on the listed steps, and the repeating
 * tail hands out ammo rather than more damage, so a long run cannot turn the
 * ship into a one-press boss killer.
 */
export const UPGRADES: readonly Upgrade[] = [
  { name: 'Twin cannons', apply: (l) => { l.guns = 2; } },
  { name: 'Heavier rounds', apply: (l) => { l.damage += 1; } },
  { name: 'Bigger magazine', apply: (l) => { addAmmo(l, 40); } },
  { name: 'Triple cannons', apply: (l) => { l.guns = 3; } },
  { name: 'Heavier rounds II', apply: (l) => { l.damage += 1; } },
  { name: 'Bigger magazine II', apply: (l) => { addAmmo(l, 50); } },
  { name: 'Heavier rounds III', apply: (l) => { l.damage += 1; } },
  // Repeats from here on.
  { name: 'Ammo resupply', apply: (l) => { addAmmo(l, 40); } },
];

export const AMMO_PER_KILL = 14;

export function createLoadout(startAmmo: number, maxAmmo: number): Loadout {
  return { guns: 1, fireDelay: 0.16, damage: 1, ammo: startAmmo, maxAmmo };
}

export function upgradeFor(upgradeCount: number): Upgrade {
  return UPGRADES[Math.min(upgradeCount, UPGRADES.length - 1)]!;
}
