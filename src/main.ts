import * as THREE from 'three';
import { createWorld } from './world';
import { Player } from './player';
import { Input } from './input';
import { FollowCamera } from './camera';
import { Trees } from './trees';
import { Boat, BOAT_COST } from './boat';
import { DayCycle } from './day';
import { Weather } from './weather';
import { Pirates } from './pirates';
import { Hud } from './hud';

const HIT_RANGE = 2.8;
const BOARD_RANGE = 4.5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
window.addEventListener('resize', () => renderer.setSize(window.innerWidth, window.innerHeight));

const scene = new THREE.Scene();
const hud = new Hud();
const notify = (m: string): void => hud.message(m);
const world = createWorld(scene);
const day = new DayCycle(scene);
const weather = new Weather(scene);
const trees = new Trees(scene, world);
const pirates = new Pirates(scene, world);
const input = new Input();
const follow = new FollowCamera();
const player = new Player(scene, world, notify);
const inventory = { wood: 0 };
let boat: Boat | null = null;
let won = false;

follow.update(0, player.position, null, true);
notify('Collect wood, build a boat, and sail to the city.');

function handleActions(): void {
  if (input.action) {
    player.swingArm();
    const fight = pirates.hit(player.position, HIT_RANGE);
    if (fight.hit) {
      if (fight.defeated) {
        inventory.wood += 2;
        notify('Pirate defeated! They dropped 2 wood.');
      }
      return;
    }
    if (player.onLand) {
      const chop = trees.hit(player.position, HIT_RANGE);
      if (chop) {
        inventory.wood += chop.wood;
        if (chop.felled) notify('Timber! +2 wood');
      }
    }
  }

  if (input.boat) {
    if (player.boat) {
      disembark();
    } else if (boat && boat.position.distanceTo(player.position) <= BOARD_RANGE) {
      player.boat = boat;
      notify('Aboard! Sail with WASD.');
    } else if (!boat && player.onLand && inventory.wood >= BOAT_COST) {
      buildBoat();
    } else if (!boat && player.onLand) {
      notify(`You need ${BOAT_COST} wood to build a boat (${inventory.wood} so far).`);
    }
  }
}

function buildBoat(): void {
  const island = world.islandAt(player.position.x, player.position.z);
  if (!island) return;
  const out = new THREE.Vector2(player.position.x, player.position.z).sub(island.center);
  if (out.lengthSq() < 0.01) out.set(0, 1);
  out.normalize();
  const spot = island.center.clone().addScaledVector(out, island.radius + 2.5);
  inventory.wood -= BOAT_COST;
  boat = new Boat(scene, spot.x, spot.y);
  notify('You built a boat! Walk to the shore and press B to board.');
}

function disembark(): void {
  if (!boat) return;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = boat.position.x + Math.cos(a) * 4;
    const z = boat.position.z + Math.sin(a) * 4;
    const h = world.heightAt(x, z);
    if (h >= 0) {
      player.boat = null;
      player.position.set(x, h + 0.8, z);
      notify('Ashore.');
      return;
    }
  }
  notify('No land close enough to step onto.');
}

const seaMaterial = world.sea.material as THREE.MeshStandardMaterial;
const CALM_SEA = new THREE.Color(0x1f6fb5);
const STORM_SEA = new THREE.Color(0x24384a);

const timer = new THREE.Timer();
function animate(): void {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);

  if (!won) {
    handleActions();
    const moveDir = follow.moveDirection(input.axis);
    player.update(dt, input, moveDir, weather.wind, weather.storm);
    trees.update(dt);
    pirates.update(dt, player, notify);

    const toCity = world.city.center.clone().sub(new THREE.Vector2(player.position.x, player.position.z));
    if (toCity.length() < world.city.radius + 6) {
      won = true;
      hud.showWin(day.day);
    }
    hud.update({
      hp: player.hp,
      wood: inventory.wood,
      day: day.day,
      swimTime: player.swimTime,
      swimming: player.swimming,
      onBoat: player.boat !== null,
      hasBoat: boat !== null,
      storm: weather.isStorm,
      cityDistance: toCity.length(),
      cityAngle: Math.atan2(toCity.x, toCity.y) - follow.yaw + Math.PI,
    });
  } else if (input.wasPressed('KeyR')) {
    location.reload();
  }

  day.update(dt, player.position, weather.storm);
  weather.update(dt, player.position, notify);
  world.sea.position.set(player.position.x, 0, player.position.z);
  seaMaterial.color.lerpColors(CALM_SEA, STORM_SEA, weather.storm);
  follow.update(dt, player.position, input.axis.x !== 0 || input.axis.z !== 0 ? player.heading : null);

  input.endFrame();
  renderer.render(scene, follow.camera);
}
renderer.setAnimationLoop(animate);

if (import.meta.env.DEV) {
  // Debug hook for scripted testing: window.game in the dev console.
  Object.assign(window, {
    game: { player, inventory, trees, pirates, weather, world, follow, notify, getBoat: () => boat },
  });
}
