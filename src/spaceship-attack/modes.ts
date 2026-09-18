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
}

export const MODES: readonly Mode[] = [
  {
    id: 'adventure',
    name: 'Adventure',
    description: 'Enemy ships attack from above and a boss arrives about every minute. Only bosses hand out upgrades, and ammo gets scarcer the longer you survive.',
    invulnerable: false,
    enemies: true,
    enemiesAttack: true,
    startAmmo: 80,
    maxAmmo: 160,
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Enemy ships and bosses still come, but nothing can hurt you. Fly anywhere and take the fight at your own pace.',
    invulnerable: true,
    enemies: true,
    enemiesAttack: false,
    startAmmo: 400,
    maxAmmo: 400,
  },
];

export function chooseMode(): Promise<Mode> {
  return pickMode(
    modePickerElement(),
    'Spaceship Attack',
    MODES,
    'A / D or arrows move &middot; W / S climb and dive &middot; <b>press Space to fire one aimed shot</b> &middot; Shift boosts &middot; <b>H heals you to full hull</b> for a fifth of your ammo',
  );
}
