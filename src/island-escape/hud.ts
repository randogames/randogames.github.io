import { MAX_HP, MAX_HUNGER, SWIM_LIMIT } from './player';
import type { Inventory } from './inventory';
import { HOTBAR, TOOL_NAMES } from './tools';
import type { Mode } from './modes';

export interface HudState {
  hp: number;
  hunger: number;
  inventory: Inventory;
  mode: Mode;
  day: number;
  night: boolean;
  swimTime: number;
  swimming: boolean;
  onBoat: boolean;
  hasBoat: boolean;
  hasTable: boolean;
  hasFire: boolean;
  storm: boolean;
  cityDistance: number;
  /** Screen-space angle to the city in radians, 0 = straight up. */
  cityAngle: number;
}

export class Hud {
  private readonly hpText: HTMLElement;
  private readonly hpBar: HTMLElement;
  private readonly hungerText: HTMLElement;
  private readonly hungerBar: HTMLElement;
  private readonly swim: HTMLElement;
  private readonly swimBar: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly items: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly compass: HTMLElement;
  private readonly compassText: HTMLElement;
  private readonly messages: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly hotbar: HTMLElement;

  constructor() {
    this.hpText = byId('hp-text');
    this.hpBar = byId('hp-bar');
    this.hungerText = byId('hunger-text');
    this.hungerBar = byId('hunger-bar');
    this.swim = byId('swim');
    this.swimBar = byId('swim-bar');
    this.stats = byId('stats');
    this.items = byId('items');
    this.hint = byId('hint');
    this.compass = byId('compass-arrow');
    this.compassText = byId('compass-text');
    this.messages = byId('messages');
    this.overlay = byId('overlay');
    this.hotbar = byId('hotbar');
    this.hotbar.innerHTML = HOTBAR.map((k, i) => `<div class="slot" data-tool="${k}"><span class="key">${i + 1}</span>${TOOL_NAMES[k]}</div>`).join('');
  }

  message(text: string): void {
    const el = document.createElement('div');
    el.className = 'msg';
    el.textContent = text;
    this.messages.appendChild(el);
    setTimeout(() => el.classList.add('fade'), 3500);
    setTimeout(() => el.remove(), 4500);
  }

  update(s: HudState): void {
    this.hpBar.style.width = `${(s.hp / MAX_HP) * 100}%`;
    this.hpText.textContent = s.mode.invulnerable ? 'invulnerable' : `${Math.ceil(s.hp)} / ${MAX_HP}`;
    this.hungerBar.style.width = `${(s.hunger / MAX_HUNGER) * 100}%`;
    this.hungerText.textContent = s.mode.invulnerable ? 'full' : `${Math.ceil(s.hunger)} / ${MAX_HUNGER}`;
    this.hungerBar.style.background = s.hunger < 20 ? '#e53935' : '#c98a2b';

    this.swim.style.display = s.swimming ? 'block' : 'none';
    const left = Math.max(0, SWIM_LIMIT - s.swimTime);
    this.swimBar.style.width = `${(left / SWIM_LIMIT) * 100}%`;
    this.swimBar.style.background = left < 3 ? '#e53935' : '#29b6f6';

    this.stats.textContent = `${s.mode.name} mode   Day ${s.day}${s.night ? ' (night)' : ''}${s.storm ? '   STORM' : ''}`;
    const inv = s.inventory;
    this.items.textContent = `Wood ${inv.wood}   Stone ${inv.stone}   Raw meat ${inv.rawMeat}   Cooked meat ${inv.cookedMeat}`;
    for (const slot of this.hotbar.children) {
      const kind = (slot as HTMLElement).dataset['tool'];
      slot.classList.toggle('owned', kind !== undefined && inv[kind as keyof Inventory] === true);
      slot.classList.toggle('selected', kind === inv.held);
    }

    if (s.onBoat) this.hint.textContent = 'Sail with WASD. B near land to go ashore.';
    else if (s.hasBoat) this.hint.textContent = 'Walk to your boat and press B to board.';
    else if (!s.hasTable) this.hint.textContent = 'Hit trees (E) for wood, then press C to craft a crafting table.';
    else if (!s.hasFire) this.hint.textContent = 'Hit rocks for stone. Craft a campfire and a pot to cook meat.';
    else this.hint.textContent = 'Craft a boat at the table (12 wood + 2 stone) and sail to the city.';

    this.compass.style.transform = `rotate(${s.cityAngle}rad)`;
    this.compassText.textContent = `City ${Math.round(s.cityDistance)} m`;
  }

  showWin(day: number): void {
    this.overlay.innerHTML = `<h1>You escaped!</h1><p>You reached the city on day ${day}.</p><p>Press R to play again.</p>`;
    this.overlay.style.display = 'flex';
  }
}

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing HUD element #${id}`);
  return el;
}
