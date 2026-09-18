import { modePickerElement, pickMode, type ModeOption } from '../shared/mode-picker';

export interface Mode extends ModeOption {
  /** Creative mode ignores all damage. */
  readonly invulnerable: boolean;
  /** Adventure mode sends waves of enemy ships. */
  readonly enemies: boolean;
  readonly startAmmo: number;
  readonly maxAmmo: number;
  /** Chance from 0 to 1 that a kill drops an upgrade. */
  readonly upgradeChance: number;
  /** In creative mode there is nothing to kill, so shots earn the upgrades instead. */
  readonly shotsPerUpgrade: number | null;
}

export const MODES: readonly Mode[] = [
  {
    id: 'adventure',
    name: 'Adventure',
    description: 'Enemy ships attack from above. You take damage, and ships you shoot down drop ammo, sometimes with an upgrade.',
    invulnerable: false,
    enemies: true,
    startAmmo: 80,
    maxAmmo: 160,
    upgradeChance: 0.2,
    shotsPerUpgrade: null,
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Fly anywhere and take no damage. Nothing attacks you, and shooting earns upgrades so you can try every weapon.',
    invulnerable: true,
    enemies: false,
    startAmmo: 400,
    maxAmmo: 400,
    upgradeChance: 0.2,
    shotsPerUpgrade: 8,
  },
];

export function chooseMode(): Promise<Mode> {
  return pickMode(
    modePickerElement(),
    'Spaceship Attack',
    MODES,
    'A / D or arrows move &middot; W / S climb and dive &middot; <b>press Space to fire one aimed shot</b> &middot; Shift boosts &middot; H repairs the hull for ammo',
  );
}
