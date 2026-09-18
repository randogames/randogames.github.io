import { modePickerElement, pickMode, type ModeOption } from '../shared/mode-picker';

export interface Mode extends ModeOption {
  /** Creative mode ignores all damage. */
  readonly invulnerable: boolean;
  /** Enemy ships and bosses appear in both modes. */
  readonly enemies: boolean;
  /** Whether enemies shoot back and ramming hurts. */
  readonly enemiesAttack: boolean;
  readonly startAmmo: number;
  readonly maxAmmo: number;
  /** Chance from 0 to 1 that a kill drops an upgrade. */
  readonly upgradeChance: number;
  /** A guaranteed upgrade after this many kills, whatever the dice say. */
  readonly killsPerGuaranteedUpgrade: number;
  /** In creative mode there is nothing to kill, so shots earn the upgrades instead. */
  readonly shotsPerUpgrade: number | null;
}

export const MODES: readonly Mode[] = [
  {
    id: 'adventure',
    name: 'Adventure',
    description: 'Enemy ships attack from above and a boss arrives every few minutes. Kills drop ammo, with a 40% chance of an upgrade and a guaranteed one every five kills.',
    invulnerable: false,
    enemies: true,
    enemiesAttack: true,
    startAmmo: 80,
    maxAmmo: 160,
    upgradeChance: 0.4,
    killsPerGuaranteedUpgrade: 5,
    shotsPerUpgrade: null,
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Enemy ships still come, but nothing can hurt you. Fly anywhere, and shooting earns upgrades so you can try every weapon.',
    invulnerable: true,
    enemies: true,
    enemiesAttack: false,
    startAmmo: 400,
    maxAmmo: 400,
    upgradeChance: 0.4,
    killsPerGuaranteedUpgrade: 5,
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
