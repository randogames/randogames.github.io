export interface Loadout {
  /** Shots fired per trigger burst. */
  guns: number;
  /** Seconds between shots. */
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

/** Awarded at every `KILLS_PER_UPGRADE` kills, in order, then it repeats the last one. */
export const UPGRADES: readonly Upgrade[] = [
  { name: 'Twin cannons', apply: (l) => { l.guns = 2; } },
  { name: 'Rapid fire', apply: (l) => { l.fireDelay = Math.max(0.06, l.fireDelay * 0.65); } },
  { name: 'Heavier rounds', apply: (l) => { l.damage += 1; } },
  { name: 'Triple cannons', apply: (l) => { l.guns = 3; } },
  { name: 'Bigger magazine', apply: (l) => { l.maxAmmo += 60; l.ammo += 60; } },
  { name: 'Rapid fire II', apply: (l) => { l.fireDelay = Math.max(0.05, l.fireDelay * 0.7); } },
  { name: 'Heavier rounds II', apply: (l) => { l.damage += 2; } },
];

export const KILLS_PER_UPGRADE = 4;
export const AMMO_PER_KILL = 12;

export function createLoadout(startAmmo: number): Loadout {
  return { guns: 1, fireDelay: 0.22, damage: 1, ammo: startAmmo, maxAmmo: Number.isFinite(startAmmo) ? 120 : Infinity };
}

export function upgradeFor(upgradeCount: number): Upgrade {
  return UPGRADES[Math.min(upgradeCount, UPGRADES.length - 1)]!;
}
