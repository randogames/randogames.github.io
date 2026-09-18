import { BOAT_COST } from './boat';
import { MAX_HP, SWIM_LIMIT } from './player';

export interface HudState {
  hp: number;
  wood: number;
  day: number;
  swimTime: number;
  swimming: boolean;
  onBoat: boolean;
  hasBoat: boolean;
  storm: boolean;
  cityDistance: number;
  /** Screen-space angle to the city in radians, 0 = straight up. */
  cityAngle: number;
}

export class Hud {
  private readonly hp: HTMLElement;
  private readonly hpBar: HTMLElement;
  private readonly swim: HTMLElement;
  private readonly swimBar: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly compass: HTMLElement;
  private readonly compassText: HTMLElement;
  private readonly messages: HTMLElement;
  private readonly overlay: HTMLElement;

  constructor() {
    this.hp = byId('hp');
    this.hpBar = byId('hp-bar');
    this.swim = byId('swim');
    this.swimBar = byId('swim-bar');
    this.stats = byId('stats');
    this.hint = byId('hint');
    this.compass = byId('compass-arrow');
    this.compassText = byId('compass-text');
    this.messages = byId('messages');
    this.overlay = byId('overlay');
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
    this.hp.title = `${Math.round(s.hp)} / ${MAX_HP}`;

    this.swim.style.display = s.swimming ? 'block' : 'none';
    const left = Math.max(0, SWIM_LIMIT - s.swimTime);
    this.swimBar.style.width = `${(left / SWIM_LIMIT) * 100}%`;
    this.swimBar.style.background = left < 3 ? '#e53935' : '#29b6f6';

    this.stats.textContent = `Day ${s.day}   Wood: ${s.wood}${s.storm ? '   STORM' : ''}`;

    if (s.onBoat) this.hint.textContent = 'Sail with WASD. B near land to go ashore.';
    else if (s.hasBoat) this.hint.textContent = 'Walk to your boat and press B to board.';
    else if (s.wood >= BOAT_COST) this.hint.textContent = 'Press B to build a boat!';
    else this.hint.textContent = `Hit trees with E for wood (${s.wood}/${BOAT_COST} for a boat).`;

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
