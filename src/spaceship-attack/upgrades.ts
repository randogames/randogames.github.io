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

/**
 * Awarded in order; once the list runs out the last one repeats.
 * Every shot is a deliberate press, so upgrades make each press count for more
 * rather than making the gun fire faster.
 */
export const UPGRADES: readonly Upgrade[] = [
  { name: 'Twin cannons', apply: (l) => { l.guns = 2; } },
  { name: 'Heavier rounds', apply: (l) => { l.damage += 1; } },
  { name: 'Bigger magazine', apply: (l) => { l.maxAmmo += 40; l.ammo += 40; } },
  { name: 'Triple cannons', apply: (l) => { l.guns = 3; } },
  { name: 'Heavier rounds II', apply: (l) => { l.damage += 2; } },
  { name: 'Reinforced rounds', apply: (l) => { l.damage += 2; } },
  { name: 'Bigger magazine II', apply: (l) => { l.maxAmmo += 60; l.ammo += 60; } },
  { name: 'Heavier rounds III', apply: (l) => { l.damage += 3; } },
];

export const AMMO_PER_KILL = 14;

export function createLoadout(startAmmo: number, maxAmmo: number): Loadout {
  return { guns: 1, fireDelay: 0.16, damage: 1, ammo: startAmmo, maxAmmo };
}

export function upgradeFor(upgradeCount: number): Upgrade {
  return UPGRADES[Math.min(upgradeCount, UPGRADES.length - 1)]!;
}
