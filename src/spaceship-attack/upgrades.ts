export interface Loadout {
  /** Shots fired per trigger press. */
  guns: number;
  /** Shots available in a burst before the gun has to cool down. */
  burstSize: number;
  /** Seconds between shots inside a burst. */
  fireDelay: number;
  /** Seconds the gun is unavailable once a burst runs out. */
  reloadSeconds: number;
  /** Damage per bullet. */
  damage: number;
  /** Seconds between missiles. */
  missileCooldown: number;
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
 * Only bosses hand these out, in this order. Damage rises on the listed steps
 * and the repeating tail gives ammo, so a long run cannot make the ship
 * strong without limit.
 */
export const UPGRADES: readonly Upgrade[] = [
  { name: 'Twin cannons', apply: (l) => { l.guns = 2; } },
  { name: 'Heavier rounds', apply: (l) => { l.damage += 1; } },
  { name: 'Longer burst', apply: (l) => { l.burstSize += 1; } },
  { name: 'Triple cannons', apply: (l) => { l.guns = 3; } },
  { name: 'Heavier rounds II', apply: (l) => { l.damage += 1; } },
  { name: 'Missile reloader', apply: (l) => { l.missileCooldown = Math.max(4, l.missileCooldown - 3); } },
  { name: 'Longer burst II', apply: (l) => { l.burstSize += 1; } },
  { name: 'Heavier rounds III', apply: (l) => { l.damage += 1; } },
  { name: 'Quick reload', apply: (l) => { l.reloadSeconds = Math.max(1.2, l.reloadSeconds - 0.5); } },
  { name: 'Bigger magazine', apply: (l) => { addAmmo(l, 60); } },
  { name: 'Longer burst III', apply: (l) => { l.burstSize += 1; } },
  // Repeats from here on.
  { name: 'Ammo resupply', apply: (l) => { addAmmo(l, 40); } },
];

export const BASE_BURST_SIZE = 5;
export const BASE_RELOAD_SECONDS = 2;
export const BASE_MISSILE_COOLDOWN = 10;

export function createLoadout(startAmmo: number, maxAmmo: number): Loadout {
  return {
    guns: 1,
    burstSize: BASE_BURST_SIZE,
    fireDelay: 0.12,
    reloadSeconds: BASE_RELOAD_SECONDS,
    damage: 1,
    missileCooldown: BASE_MISSILE_COOLDOWN,
    ammo: startAmmo,
    maxAmmo,
  };
}

export function upgradeFor(upgradeCount: number): Upgrade {
  return UPGRADES[Math.min(upgradeCount, UPGRADES.length - 1)]!;
}
