/** Canvas drawing for every ship and effect. All shapes are centred on (0, 0). */

export function drawPlayer(ctx: CanvasRenderingContext2D, boosting: boolean, tilt: number): void {
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

  // Wings.
  ctx.fillStyle = '#3f7fd0';
  ctx.beginPath();
  ctx.moveTo(-18, 14);
  ctx.lineTo(-4, 2);
  ctx.lineTo(-4, 14);
  ctx.closePath();
  ctx.moveTo(18, 14);
  ctx.lineTo(4, 2);
  ctx.lineTo(4, 14);
  ctx.closePath();
  ctx.fill();

  // Hull.
  ctx.fillStyle = '#dde7f5';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(9, 10);
  ctx.lineTo(0, 15);
  ctx.lineTo(-9, 10);
  ctx.closePath();
  ctx.fill();

  // Cockpit.
  ctx.fillStyle = '#2b6cb0';
  ctx.beginPath();
  ctx.ellipse(0, -4, 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
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

export function drawBullet(ctx: CanvasRenderingContext2D, hostile: boolean): void {
  ctx.fillStyle = hostile ? '#ffb347' : '#7ef9ff';
  ctx.shadowColor = hostile ? '#ff6a00' : '#39d6ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.6, 7, 0, 0, Math.PI * 2);
  ctx.fill();
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
