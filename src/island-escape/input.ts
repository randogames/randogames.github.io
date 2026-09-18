/** Tracks held keys and keys pressed this frame. Call `endFrame()` once per frame. */
export class Input {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => {
      this.held.clear();
      this.pressed.clear();
    });
  }

  /** Movement axis in [-1, 1]. x: right positive, z: down-screen positive. */
  get axis(): { x: number; z: number } {
    const x = (this.isDown('KeyD', 'ArrowRight') ? 1 : 0) - (this.isDown('KeyA', 'ArrowLeft') ? 1 : 0);
    const z = (this.isDown('KeyS', 'ArrowDown') ? 1 : 0) - (this.isDown('KeyW', 'ArrowUp') ? 1 : 0);
    return { x, z };
  }

  get sneaking(): boolean {
    return this.isDown('ShiftLeft', 'ShiftRight');
  }

  get jump(): boolean {
    return this.wasPressed('Space');
  }

  /** Hit a tree or a pirate. */
  get action(): boolean {
    return this.wasPressed('KeyE', 'Tab');
  }

  /** Build, board or leave the boat. */
  get boat(): boolean {
    return this.wasPressed('KeyB');
  }

  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  wasPressed(...codes: string[]): boolean {
    return codes.some((c) => this.pressed.has(c));
  }

  endFrame(): void {
    this.pressed.clear();
  }
}
