import { installUpdateBanner } from '../shared/update-banner';
import { chooseMode } from './modes';
import { installHomeButton } from '../shared/home-button';
import { Input } from './input';
import { Starfield } from './starfield';
import { createGame, update } from './game';
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
function showGameOver(score: number, kills: number, distance: number): void {
  if (!overlay) return;
  overlay.innerHTML =
    `<h1>Shot down</h1><p>Score ${score} with ${kills} kills over ${Math.round(distance)} metres.</p>` +
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

  if (game.over && !announced) {
    announced = true;
    showGameOver(game.score, game.kills, game.distance);
  }
  if (game.over && input.wasPressed('KeyR')) location.reload();

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
  });
}
