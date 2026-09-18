import * as THREE from 'three';
import { createWorld } from './world';
import { Player } from './player';
import { Input } from './input';
import { FollowCamera } from './camera';
import { Trees } from './trees';
import { Rocks } from './rocks';
import { Animals } from './animals';
import { Boat } from './boat';
import { DayCycle } from './day';
import { Weather } from './weather';
import { Pirates } from './pirates';
import { Hud } from './hud';
import { createInventory } from './inventory';
import { CraftingMenu, RECIPES, blocker, payFor, type Recipe } from './crafting';
import { placeTable, placeCampfire, updateCampfires, anyNear, type Campfire } from './structures';
import { HOTBAR, TOOL_NAMES } from './tools';

const HIT_RANGE = 2.8;
const BOARD_RANGE = 4.5;
const STATION_RANGE = 4;
const COOKED_MEAT_FOOD = 40;
const RAW_MEAT_FOOD = 12;

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
const rocks = new Rocks(scene, world);
const animals = new Animals(scene, world);
const pirates = new Pirates(scene, world);
const input = new Input();
const follow = new FollowCamera();
const player = new Player(scene, world, notify);
const inventory = createInventory();
const crafting = new CraftingMenu();
const tables: THREE.Vector3[] = [];
const fires: Campfire[] = [];
let boat: Boat | null = null;
let won = false;

follow.update(0, player.position, null, true);
notify('Collect wood and stone, craft, eat, and build a boat to reach the city.');

function craftContext(): { nearTable: boolean; nearFire: boolean; hasBoat: boolean } {
  return {
    nearTable: anyNear(tables, player.position, STATION_RANGE),
    nearFire: anyNear(fires.map((f) => f.position), player.position, STATION_RANGE),
    hasBoat: boat !== null,
  };
}

/** A free spot on land just in front of the player, sliding sideways if something already stands there. */
function spotInFront(): THREE.Vector3 | null {
  const p = player.position;
  const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
  const side = new THREE.Vector3(forward.z, 0, -forward.x);
  const taken = [...tables, ...fires.map((f) => f.position)];
  for (const offset of [0, 1.8, -1.8, 3.6, -3.6]) {
    const spot = p.clone().addScaledVector(forward, 2.2).addScaledVector(side, offset);
    const h = world.heightAt(spot.x, spot.z);
    if (h < 0) continue;
    spot.y = h;
    if (!anyNear(taken, spot, 1.6)) return spot;
  }
  return null;
}

function craft(recipe: Recipe): void {
  const why = blocker(recipe, inventory, craftContext());
  if (why) {
    notify(`Can't craft ${recipe.name}: ${why}.`);
    return;
  }
  if (recipe.id === 'table' || recipe.id === 'campfire') {
    const spot = spotInFront();
    if (!spot) {
      notify('Face some open ground to place that.');
      return;
    }
    payFor(recipe, inventory);
    if (recipe.id === 'table') tables.push(placeTable(scene, spot));
    else fires.push(placeCampfire(scene, spot));
    notify(`${recipe.name} placed.`);
    return;
  }
  if (recipe.id === 'boat') {
    if (!player.onLand) return;
    payFor(recipe, inventory);
    buildBoat();
    return;
  }
  payFor(recipe, inventory);
  switch (recipe.id) {
    case 'axe': inventory.axe = true; break;
    case 'pickaxe': inventory.pickaxe = true; break;
    case 'sword': inventory.sword = true; break;
    case 'pot': inventory.pot = true; break;
    case 'cook': inventory.cookedMeat += 1; break;
  }
  if (recipe.id === 'cook') {
    notify('Meat cooked. Press Q to eat.');
  } else {
    const slot = HOTBAR.indexOf(recipe.id as (typeof HOTBAR)[number]) + 1;
    notify(`You made a ${recipe.name.toLowerCase()}. Press ${slot} to hold it.`);
  }
}

function handleHit(): void {
  player.swingArm();
  const from = player.position;
  const weapon = inventory.held === 'sword' ? 2 : 1;

  const fight = pirates.hit(from, HIT_RANGE, weapon);
  if (fight.hit) {
    if (fight.defeated) {
      inventory.wood += 2;
      notify('Pirate defeated! They dropped 2 wood.');
    }
    return;
  }
  if (!player.onLand) return;

  // Pick whichever thing is closest: animal, tree or rock.
  const dist = (p: THREE.Vector3 | null): number => (p ? p.distanceTo(from) : Infinity);
  const dAnimal = dist(animals.nearestAlive(from));
  const dTree = dist(trees.nearestStanding(from));
  const dRock = dist(rocks.nearestStanding(from));
  const closest = Math.min(dAnimal, dTree, dRock);
  if (closest > HIT_RANGE) return;

  if (closest === dAnimal) {
    const hunt = animals.hit(from, HIT_RANGE, weapon);
    if (hunt?.killed) {
      inventory.rawMeat += hunt.meat;
      notify(`You got ${hunt.meat} raw meat from the ${hunt.kind}.`);
    }
  } else if (closest === dTree) {
    const chop = trees.hit(from, HIT_RANGE);
    if (chop) {
      const wood = chop.wood * (inventory.held === 'axe' ? 2 : 1);
      inventory.wood += wood;
      if (chop.felled) notify(`Timber! +${wood} wood`);
    }
  } else {
    const mine = rocks.hit(from, HIT_RANGE, inventory.held === 'pickaxe' ? 2 : 1);
    if (mine) {
      inventory.stone += mine.stone;
      if (mine.depleted) notify(`Rock broken up. +${mine.stone} stone`);
    }
  }
}

function handleEat(): void {
  if (inventory.cookedMeat > 0) {
    inventory.cookedMeat -= 1;
    player.eat(COOKED_MEAT_FOOD);
    notify('Yum. Cooked meat.');
  } else if (inventory.rawMeat > 0) {
    inventory.rawMeat -= 1;
    player.eat(RAW_MEAT_FOOD);
    notify('Raw meat. Not great. Cook it over a campfire with a pot.');
  } else {
    notify('Nothing to eat. Hunt a chicken or a pig.');
  }
}

function handleActions(): void {
  if (input.wasPressed('KeyC')) crafting.toggle();
  if (input.wasPressed('Escape')) crafting.close();
  if (crafting.open) {
    for (let i = 0; i < RECIPES.length; i++) {
      if (input.wasPressed(`Digit${i + 1}`)) {
        const recipe = RECIPES[i];
        if (recipe) craft(recipe);
      }
    }
    return;
  }

  if (input.action) handleHit();
  if (input.wasPressed('KeyQ')) handleEat();
  HOTBAR.forEach((kind, i) => {
    if (!input.wasPressed(`Digit${i + 1}`)) return;
    if (!inventory[kind]) {
      notify(`You don't have a ${TOOL_NAMES[kind].toLowerCase()} yet. Craft one (C).`);
      return;
    }
    inventory.held = inventory.held === kind ? null : kind;
    player.hold(inventory.held);
  });

  if (input.boat) {
    if (player.boat) {
      disembark();
    } else if (boat && boat.position.distanceTo(player.position) <= BOARD_RANGE) {
      player.boat = boat;
      notify('Aboard! Sail with WASD.');
    } else if (!boat) {
      notify('No boat yet. Craft one at a crafting table (C).');
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
    const moveDir = crafting.open ? new THREE.Vector3() : follow.moveDirection(input.axis);
    player.update(dt, input, moveDir, weather.wind, weather.storm);
    trees.update(dt);
    rocks.update(dt, player.position);
    animals.update(dt);
    pirates.update(dt, player, notify);
    updateCampfires(fires, dt);

    const toCity = world.city.center.clone().sub(new THREE.Vector2(player.position.x, player.position.z));
    if (toCity.length() < world.city.radius + 6) {
      won = true;
      hud.showWin(day.day);
    }
    const ctx = craftContext();
    crafting.render(inventory, ctx);
    hud.update({
      hp: player.hp,
      hunger: player.hunger,
      inventory,
      day: day.day,
      night: day.phase < 0.2 || day.phase > 0.8,
      swimTime: player.swimTime,
      swimming: player.swimming,
      onBoat: player.boat !== null,
      hasBoat: boat !== null,
      hasTable: tables.length > 0,
      hasFire: fires.length > 0,
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
  const moving = !crafting.open && (input.axis.x !== 0 || input.axis.z !== 0);
  follow.update(dt, player.position, moving ? player.heading : null);

  input.endFrame();
  renderer.render(scene, follow.camera);
}
renderer.setAnimationLoop(animate);

if (import.meta.env.DEV) {
  // Debug hook for scripted testing: window.game in the dev console.
  Object.assign(window, {
    game: { player, inventory, trees, rocks, animals, pirates, weather, world, follow, notify, day, craft, RECIPES, getBoat: () => boat, tables, fires },
  });
}
