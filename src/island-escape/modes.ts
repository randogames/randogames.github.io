import { modePickerElement, pickMode, type ModeOption } from '../shared/mode-picker';

export interface Mode extends ModeOption {
  /** Creative mode ignores drowning, starving and pirate attacks. */
  readonly invulnerable: boolean;
  /** Creative mode can fly by holding Space. */
  readonly flight: boolean;
  /** Adventure mode sends pirate raids. */
  readonly pirates: boolean;
  /** Creative mode starts with plenty of everything. */
  readonly startingSupplies: boolean;
}

export const MODES: readonly Mode[] = [
  {
    id: 'adventure',
    name: 'Adventure',
    description: 'Survive. Hunger, drowning, storms and pirate raids are all real, and you start with nothing.',
    invulnerable: false,
    flight: false,
    pirates: true,
    startingSupplies: false,
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Build freely. Hold Space to fly, nothing can hurt you, no pirates, and you start with every tool and plenty of materials.',
    invulnerable: true,
    flight: true,
    pirates: false,
    startingSupplies: true,
  },
];

export function chooseMode(): Promise<Mode> {
  return pickMode(
    modePickerElement(),
    'Island Escape',
    MODES,
    'WASD move &middot; Shift sneak &middot; Space jump (hold to fly in creative) &middot; E hit &middot; C craft &middot; 1-4 hold tool &middot; Q eat &middot; B boat',
  );
}
