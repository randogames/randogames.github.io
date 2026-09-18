import { MAX_HULL } from './player-ship';
import type { Loadout } from './upgrades';
import type { Mode } from './modes';

export interface HudState {
  hull: number;
  loadout: Loadout;
  mode: Mode;
  kills: number;
  killsToNext: number;
  distance: number;
  boosting: boolean;
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly hullText: HTMLElement;
  private readonly hullBar: HTMLElement;
  private readonly ammoText: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly weapons: HTMLElement;
  private readonly messages: HTMLElement;
  private readonly overlay: HTMLElement;

  constructor() {
    this.root = byId('hud');
    this.hullText = byId('hull-text');
    this.hullBar = byId('hull-bar');
    this.ammoText = byId('ammo-text');
    this.stats = byId('stats');
    this.weapons = byId('weapons');
    this.messages = byId('messages');
    this.overlay = byId('overlay');
  }

  show(): void {
    this.root.style.display = 'block';
  }

  message(text: string): void {
    const el = document.createElement('div');
    el.className = 'msg';
    el.textContent = text;
    this.messages.appendChild(el);
    setTimeout(() => el.classList.add('fade'), 2600);
    setTimeout(() => el.remove(), 3600);
  }

  update(s: HudState): void {
    this.hullBar.style.width = `${(s.hull / MAX_HULL) * 100}%`;
    this.hullBar.style.background = s.hull < 30 ? '#e53935' : '#4fc3f7';
    this.hullText.textContent = s.mode.invulnerable ? 'invulnerable' : `${Math.ceil(s.hull)} / ${MAX_HULL}`;

    this.ammoText.textContent = Number.isFinite(s.loadout.ammo)
      ? `${s.loadout.ammo} / ${s.loadout.maxAmmo}`
      : 'unlimited';

    this.stats.textContent =
      `${s.mode.name} mode   Kills ${s.kills}   ${Math.round(s.distance)} m` +
      (s.boosting ? '   BOOST' : '');
    this.weapons.textContent =
      `Cannons ${s.loadout.guns}   Damage ${s.loadout.damage}` +
      (s.mode.enemies ? `   Next upgrade in ${s.killsToNext}` : '');
  }

  showGameOver(kills: number, distance: number): void {
    this.overlay.innerHTML =
      `<h1>Shot down</h1><p>${kills} kills over ${Math.round(distance)} metres.</p><p>Press R to fly again.</p>`;
    this.overlay.style.display = 'flex';
  }
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing HUD element #${id}`);
  return el;
}
