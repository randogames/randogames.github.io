import * as THREE from 'three';
import { installUpdateBanner } from '../shared/update-banner';
import { chooseMode, type Mode } from './modes';
import { Input } from './input';
import { PlayerShip } from './player-ship';
import { Enemies } from './enemies';
import { Bullets } from './bullets';
import { Explosions } from './explosions';
import { Starfield } from './starfield';
import { Hud } from './hud';
import { createLoadout, upgradeFor, AMMO_PER_KILL, KILLS_PER_UPGRADE } from './upgrades';

installUpdateBanner();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070f);
scene.fog = new THREE.Fog(0x05070f, 120, 230);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 400);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

scene.add(new THREE.HemisphereLight(0x6f8fd0, 0x0a0f1e, 1.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
keyLight.position.set(20, 40, 20);
scene.add(keyLight);

const input = new Input();
const hud = new Hud();
const starfield = new Starfield(scene);
const bullets = new Bullets(scene);
const explosions = new Explosions(scene);
const enemies = new Enemies(scene);

const mode: Mode = await chooseMode();
const loadout = createLoadout(mode.startAmmo);
const player = new PlayerShip(scene, mode);
let kills = 0;
let upgradesEarned = 0;
let over = false;

hud.show();
hud.message(mode.enemies ? 'Enemy ships ahead. Good luck.' : 'Free flight. Nothing can hurt you.');

const CAMERA_OFFSET = new THREE.Vector3(0, 4.5, 14);

function awardKill(at: THREE.Vector3): void {
  explosions.spawn(at);
  kills += 1;
  if (Number.isFinite(loadout.ammo)) {
    loadout.ammo = Math.min(loadout.maxAmmo, loadout.ammo + AMMO_PER_KILL);
  }
  if (kills % KILLS_PER_UPGRADE === 0) {
    const upgrade = upgradeFor(upgradesEarned);
    upgrade.apply(loadout);
    upgradesEarned += 1;
    hud.message(`Upgrade: ${upgrade.name}`);
  }
}

const timer = new THREE.Timer();
function animate(): void {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);

  if (over) {
    if (input.wasPressed('KeyR')) location.reload();
    input.endFrame();
    explosions.update(dt);
    renderer.render(scene, camera);
    return;
  }

  const beforeZ = player.position.z;
  player.update(dt, input, loadout, bullets);
  starfield.advance(beforeZ - player.position.z);

  bullets.update(dt);
  for (const kill of enemies.update(dt, player, bullets, mode.enemies)) awardKill(kill.position);
  if (mode.enemies) enemies.checkPlayerHits(player, bullets);
  explosions.update(dt);
  starfield.update(player.position);

  if (player.dead) {
    over = true;
    explosions.spawn(player.position.clone());
    player.group.visible = false;
    hud.showGameOver(kills, player.distance);
  }

  camera.position.lerp(player.position.clone().add(CAMERA_OFFSET), 1 - Math.exp(-dt * 9));
  camera.lookAt(player.position.x, player.position.y + 1, player.position.z - 24);
  keyLight.position.set(player.position.x + 20, player.position.y + 40, player.position.z + 20);

  hud.update({
    hull: player.hull,
    loadout,
    mode,
    kills,
    killsToNext: KILLS_PER_UPGRADE - (kills % KILLS_PER_UPGRADE),
    distance: player.distance,
    boosting: player.boosting,
  });

  input.endFrame();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

if (import.meta.env.DEV) {
  // Debug hook for scripted testing: window.game in the dev console.
  Object.assign(window, {
    game: { player, enemies, bullets, loadout, mode, input, getKills: () => kills, isOver: () => over },
  });
}
