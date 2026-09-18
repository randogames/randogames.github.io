import { VIEW_HEIGHT, VIEW_WIDTH } from './world';

interface Star {
  x: number;
  y: number;
  /** Bigger stars sit closer and scroll faster. */
  size: number;
  speed: number;
}

/** Three layers of stars scrolling down the screen. */
export class Starfield {
  private readonly stars: Star[] = [];

  constructor(count = 110) {
    for (let i = 0; i < count; i++) {
      const size = Math.random() < 0.7 ? 1 : Math.random() < 0.8 ? 1.6 : 2.4;
      this.stars.push({
        x: Math.random() * VIEW_WIDTH,
        y: Math.random() * VIEW_HEIGHT,
        size,
        speed: 18 + size * 34,
      });
    }
  }

  update(dt: number, scrollBoost: number): void {
    for (const s of this.stars) {
      s.y += s.speed * scrollBoost * dt;
      if (s.y > VIEW_HEIGHT) {
        s.y -= VIEW_HEIGHT;
        s.x = Math.random() * VIEW_WIDTH;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const s of this.stars) {
      ctx.globalAlpha = 0.35 + s.size * 0.25;
      ctx.fillStyle = '#dbe9ff';
      ctx.fillRect(s.x, s.y, s.size, s.size * 2);
    }
    ctx.globalAlpha = 1;
  }
}
