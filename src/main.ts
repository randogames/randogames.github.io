import * as THREE from 'three';
import { Timer } from 'three/addons/misc/Timer.js';
import { createWorld } from './world';
import { Player } from './player';
import { Input } from './input';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 60, 160);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

const world = createWorld(scene);
const input = new Input();
const player = new Player(scene, world);

const cameraOffset = new THREE.Vector3(0, 12, 16);
const timer = new Timer();

function animate(): void {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  player.update(dt, input);

  camera.position.copy(player.position).add(cameraOffset);
  camera.lookAt(player.position);

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
