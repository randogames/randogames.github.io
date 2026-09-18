/** A game mode the player can pick before starting. */
export interface ModeOption {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

/**
 * Shows a full-screen picker and resolves with the chosen mode.
 * Number keys pick a mode too, in listed order.
 */
export function pickMode<T extends ModeOption>(
  root: HTMLElement,
  title: string,
  modes: readonly T[],
  controlsNote: string,
): Promise<T> {
  root.innerHTML = `
    <div>
      <h1>${title}</h1>
      <p class="sub">Pick a mode.</p>
      <div class="modes">
        ${modes.map((m, i) => `
          <button class="mode" data-id="${m.id}">
            <span class="key">${i + 1}</span>
            <h2>${m.name}</h2>
            <p>${m.description}</p>
          </button>`).join('')}
      </div>
      <p class="controls-note">${controlsNote}</p>
    </div>`;
  root.style.display = 'grid';

  return new Promise<T>((resolve) => {
    const pick = (mode: T): void => {
      root.style.display = 'none';
      window.removeEventListener('keydown', onKey);
      resolve(mode);
    };
    const onKey = (e: KeyboardEvent): void => {
      const mode = modes[Number(e.key) - 1];
      if (mode) pick(mode);
    };
    for (const button of root.querySelectorAll<HTMLButtonElement>('button.mode')) {
      button.addEventListener('click', () => {
        const mode = modes.find((m) => m.id === button.dataset['id']);
        if (mode) pick(mode);
      });
    }
    window.addEventListener('keydown', onKey);
  });
}

export function modePickerElement(id = 'mode-picker'): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}
