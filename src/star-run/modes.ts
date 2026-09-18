export type ModeId = 'adventure' | 'creative';

export interface Mode {
  readonly id: ModeId;
  readonly name: string;
  readonly description: string;
  /** Creative mode ignores all damage. */
  readonly invulnerable: boolean;
  /** Creative mode can climb and dive freely; adventure mode stays in its lane. */
  readonly freeFlight: boolean;
  /** Adventure mode spawns waves of enemies. */
  readonly enemies: boolean;
  readonly startAmmo: number;
}

export const MODES: readonly Mode[] = [
  {
    id: 'adventure',
    name: 'Adventure',
    description: 'Enemy ships attack. You take damage, and every kill earns ammo and upgrades.',
    invulnerable: false,
    freeFlight: false,
    enemies: true,
    startAmmo: 60,
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Fly anywhere with endless ammo and no damage. Nothing attacks you.',
    invulnerable: true,
    freeFlight: true,
    enemies: false,
    startAmmo: Infinity,
  },
];

/** Shows the mode picker and resolves once the player chooses. */
export function chooseMode(): Promise<Mode> {
  const root = document.getElementById('mode-picker');
  if (!root) throw new Error('Missing #mode-picker');
  root.innerHTML = `
    <h1>Star Run</h1>
    <p class="sub">Pick a mode.</p>
    <div class="modes">
      ${MODES.map((m, i) => `
        <button class="mode" data-id="${m.id}">
          <span class="key">${i + 1}</span>
          <h2>${m.name}</h2>
          <p>${m.description}</p>
        </button>`).join('')}
    </div>
    <p class="controls-note">A / D or arrows steer &middot; W / S climb and dive &middot; Space shoots &middot; Shift boosts</p>`;
  root.style.display = 'grid';

  return new Promise<Mode>((resolve) => {
    const pick = (mode: Mode): void => {
      root.style.display = 'none';
      window.removeEventListener('keydown', onKey);
      resolve(mode);
    };
    const onKey = (e: KeyboardEvent): void => {
      const index = Number(e.key) - 1;
      const mode = MODES[index];
      if (mode) pick(mode);
    };
    for (const button of root.querySelectorAll<HTMLButtonElement>('button.mode')) {
      button.addEventListener('click', () => {
        const mode = MODES.find((m) => m.id === button.dataset['id']);
        if (mode) pick(mode);
      });
    }
    window.addEventListener('keydown', onKey);
  });
}
