import { installUpdateBanner } from '../shared/update-banner';
import { chooseMode } from './modes';
import { bossDueAt, bossHp } from './bosses';
import { installHomeButton } from '../shared/home-button';
import { Input } from './input';
import { Starfield } from './starfield';
import { createGame, currentSkin, grantUpgrade, shotDamage, update } from './game';
import { draw, fitCanvas } from './render';

installUpdateBanner();
installHomeButton();

const canvas = document.querySelector<HTMLCanvasElement>('#screen');
if (!canvas) throw new Error('Missing #screen canvas');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D is not available');

let scale = fitCanvas(canvas);
window.addEventListener('resize', () => {
  scale = fitCanvas(canvas);
});

const messages = document.querySelector<HTMLElement>('#messages');
function notify(text: string): void {
  if (!messages) return;
  const el = document.createElement('div');
  el.className = 'msg';
  el.textContent = text;
  messages.appendChild(el);
  setTimeout(() => el.classList.add('fade'), 1800);
  setTimeout(() => el.remove(), 2800);
}

const overlay = document.querySelector<HTMLElement>('#overlay');
function showEnding(won: boolean, score: number, kills: number, bosses: number): void {
  if (!overlay) return;
  overlay.innerHTML = won
    ? `<h1>Fleet destroyed!</h1><p>You beat all ${bosses} bosses with a score of ${score}.</p>` +
      `<p>Press R to fly again.</p>`
    : `<h1>Shot down</h1><p>Score ${score} with ${kills} kills and ${bosses} bosses beaten.</p>` +
      `<p>Press R to fly again.</p>`;
  overlay.style.display = 'flex';
}

const input = new Input();
const stars = new Starfield();
const mode = await chooseMode();
const game = createGame(mode);

canvas.style.display = 'block';
notify(mode.enemies ? 'Enemy ships incoming. Space to shoot.' : 'Free flight. Nothing can hurt you.');

let last = performance.now();
let announced = false;
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  update(game, dt, input, notify);
  stars.update(dt, game.boosting ? 2.6 : 1);
  draw(ctx!, scale, game, stars);

  if ((game.over || game.won) && !announced) {
    announced = true;
    showEnding(game.won, game.score, game.kills, game.bossesDefeated);
  }
  if ((game.over || game.won) && input.wasPressed('KeyR')) location.reload();

  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  // Debug hook for scripted testing: window.game in the dev console.
  Object.assign(window, {
    game,
    input,
    stars,
    // Advance one fixed step, for scripted tests.
    __step: () => update(game, 1 / 60, input, notify),
    __skin: () => currentSkin(game).name,
    __grantUpgrade: () => grantUpgrade(game, notify),
    __missile: () => { input.forceKey('KeyM'); update(game, 1 / 60, input, notify); input.endFrame(); },
    __shotDamage: () => shotDamage(game),
    __bossHp: (tier: number) => bossHp(tier),
    __bossDueAt: (tier: number, kpm: number) => bossDueAt(tier, kpm),
    __fire: () => { input.forceFire(); update(game, 1 / 60, input, notify); input.endFrame(); },
  });
}
