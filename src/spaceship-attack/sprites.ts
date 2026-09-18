/** Canvas drawing for every ship and effect. All shapes are centred on (0, 0). */
import type { Skin } from './skins';

export function drawPlayer(ctx: CanvasRenderingContext2D, boosting: boolean, tilt: number, skin: Skin, tier: number): void {
  ctx.save();
  ctx.rotate(tilt * 0.25);

  // Engine flame, longer when boosting.
  const flame = boosting ? 26 + Math.random() * 10 : 12 + Math.random() * 5;
  const gradient = ctx.createLinearGradient(0, 14, 0, 14 + flame);
  gradient.addColorStop(0, boosting ? '#fff3b0' : '#ffd166');
  gradient.addColorStop(1, 'rgba(255, 94, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-6, 13);
  ctx.lineTo(6, 13);
  ctx.lineTo(0, 13 + flame);
  ctx.closePath();
  ctx.fill();

  // Wings grow wider and more swept with each skin.
  const span = 18 + tier * 2.2;
  ctx.fillStyle = skin.accent;
  ctx.beginPath();
  ctx.moveTo(-span, 14);
  ctx.lineTo(-4, 2 - tier);
  ctx.lineTo(-4, 14);
  ctx.closePath();
  ctx.moveTo(span, 14);
  ctx.lineTo(4, 2 - tier);
  ctx.lineTo(4, 14);
  ctx.closePath();
  ctx.fill();

  // Extra canards once the ship is well upgraded.
  if (tier >= 3) {
    ctx.beginPath();
    ctx.moveTo(-span * 0.55, -6);
    ctx.lineTo(-6, -12);
    ctx.lineTo(-6, -2);
    ctx.closePath();
    ctx.moveTo(span * 0.55, -6);
    ctx.lineTo(6, -12);
    ctx.lineTo(6, -2);
    ctx.closePath();
    ctx.fill();
  }

  // Hull.
  ctx.fillStyle = skin.hull;
  ctx.beginPath();
  ctx.moveTo(0, -20 - tier);
  ctx.lineTo(9, 10);
  ctx.lineTo(0, 15);
  ctx.lineTo(-9, 10);
  ctx.closePath();
  ctx.fill();

  // Cockpit.
  ctx.fillStyle = skin.cockpit;
  ctx.beginPath();
  ctx.ellipse(0, -4, 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  if (tier >= 5) {
    ctx.strokeStyle = skin.bulletGlow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export type EnemyShape = 'scout' | 'brute' | 'darter';

const ENEMY_COLORS: Record<EnemyShape, [string, string]> = {
  scout: ['#a569bd', '#6c3483'],
  brute: ['#e74c3c', '#922b21'],
  darter: ['#1abc9c', '#117a65'],
};

export function drawEnemy(ctx: CanvasRenderingContext2D, shape: EnemyShape, spin: number): void {
  const [light, dark] = ENEMY_COLORS[shape];
  ctx.save();
  ctx.rotate(spin);
  ctx.fillStyle = dark;
  ctx.strokeStyle = light;
  ctx.lineWidth = 2;

  if (shape === 'brute') {
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-12, -14);
    ctx.lineTo(12, -14);
    ctx.lineTo(20, 0);
    ctx.closePath();
  } else if (shape === 'darter') {
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(-11, -12);
    ctx.lineTo(0, -6);
    ctx.lineTo(11, -12);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(-14, -8);
    ctx.lineTo(14, -8);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ff5b4a';
  ctx.beginPath();
  ctx.arc(0, 2, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Bosses: a big armoured hull whose silhouette changes with the tier. */
export function drawBoss(
  ctx: CanvasRenderingContext2D,
  tier: number,
  radius: number,
  color: string,
  phase: number,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 2.5;

  if (tier === 2 || tier === 4) ctx.rotate(Math.sin(phase * 0.6) * 0.12);

  ctx.beginPath();
  if (tier === 1) {
    ctx.moveTo(-radius, -radius * 0.3);
    ctx.lineTo(0, radius * 0.75);
    ctx.lineTo(radius, -radius * 0.3);
    ctx.lineTo(radius * 0.5, -radius * 0.7);
    ctx.lineTo(-radius * 0.5, -radius * 0.7);
  } else if (tier === 2) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius * 0.8);
    }
  } else if (tier === 3) {
    ctx.moveTo(0, radius);
    ctx.lineTo(-radius * 0.8, -radius * 0.2);
    ctx.lineTo(-radius * 0.3, -radius * 0.8);
    ctx.lineTo(radius * 0.3, -radius * 0.8);
    ctx.lineTo(radius * 0.8, -radius * 0.2);
  } else if (tier === 4) {
    ctx.rect(-radius, -radius * 0.6, radius * 2, radius * 1.2);
  } else {
    ctx.moveTo(0, radius);
    ctx.lineTo(-radius * 0.55, radius * 0.35);
    ctx.lineTo(-radius, -radius * 0.45);
    ctx.lineTo(-radius * 0.4, -radius * 0.85);
    ctx.lineTo(radius * 0.4, -radius * 0.85);
    ctx.lineTo(radius, -radius * 0.45);
    ctx.lineTo(radius * 0.55, radius * 0.35);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing core, plus turret pods on the bigger hulls.
  const pulse = 0.6 + Math.abs(Math.sin(phase * 3)) * 0.4;
  ctx.fillStyle = `rgba(255, 91, 74, ${pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.24, 0, Math.PI * 2);
  ctx.fill();

  if (tier >= 3) {
    ctx.fillStyle = 'rgba(20,20,26,.9)';
    for (const x of [-radius * 0.62, radius * 0.62]) {
      ctx.beginPath();
      ctx.arc(x, radius * 0.1, radius * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawBullet(ctx: CanvasRenderingContext2D, hostile: boolean, skin: Skin): void {
  if (hostile) {
    ctx.fillStyle = '#ffb347';
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    return;
  }

  ctx.fillStyle = skin.bullet;
  ctx.strokeStyle = skin.bullet;
  ctx.shadowColor = skin.bulletGlow;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  switch (skin.bulletShape) {
    case 'bolt':
      ctx.ellipse(0, 0, 2.6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'lance':
      ctx.moveTo(0, -11);
      ctx.lineTo(2.4, 5);
      ctx.lineTo(0, 8);
      ctx.lineTo(-2.4, 5);
      ctx.closePath();
      ctx.fill();
      break;
    case 'orb':
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'wave':
      ctx.lineWidth = 2.4;
      ctx.moveTo(-5, 4);
      ctx.quadraticCurveTo(0, -4, 5, 4);
      ctx.stroke();
      ctx.moveTo(-5, -3);
      ctx.quadraticCurveTo(0, -11, 5, -3);
      ctx.stroke();
      break;
    case 'star':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? 7 : 3;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.shadowBlur = 0;
}

export function drawPickup(ctx: CanvasRenderingContext2D, pulse: number): void {
  ctx.save();
  ctx.rotate(pulse);
  ctx.fillStyle = '#ffd54f';
  ctx.strokeStyle = '#fff6d5';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const r = i % 2 === 0 ? 9 : 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
