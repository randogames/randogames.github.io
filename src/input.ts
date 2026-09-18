/** Tracks which movement keys are held. */
export class Input {
  private readonly held = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (e) => this.held.add(e.code));
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => this.held.clear());
  }

  /** Movement axis in [-1, 1]. x: right positive, z: down-screen positive. */
  get axis(): { x: number; z: number } {
    const x = (this.has('KeyD', 'ArrowRight') ? 1 : 0) - (this.has('KeyA', 'ArrowLeft') ? 1 : 0);
    const z = (this.has('KeyS', 'ArrowDown') ? 1 : 0) - (this.has('KeyW', 'ArrowUp') ? 1 : 0);
    return { x, z };
  }

  private has(...codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }
}
