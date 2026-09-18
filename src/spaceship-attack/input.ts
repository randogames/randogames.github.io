/** Held keys and keys pressed this frame. Call `endFrame()` once per frame. */
export class Input {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => {
      this.held.clear();
      this.pressed.clear();
    });
  }

  /** -1 (left) to 1 (right). */
  get steer(): number {
    return (this.isDown('KeyD', 'ArrowRight') ? 1 : 0) - (this.isDown('KeyA', 'ArrowLeft') ? 1 : 0);
  }

  /** -1 (dive) to 1 (climb). */
  get pitch(): number {
    return (this.isDown('KeyW', 'ArrowUp') ? 1 : 0) - (this.isDown('KeyS', 'ArrowDown') ? 1 : 0);
  }

  /**
   * True only on the frame Space goes down. Holding it does not keep firing,
   * so every shot is a separate, aimed press.
   */
  get firePressed(): boolean {
    return this.wasPressed('Space');
  }

  get boosting(): boolean {
    return this.isDown('ShiftLeft', 'ShiftRight');
  }

  /** Repair ability: spends ammo to refill the hull. */
  get healPressed(): boolean {
    return this.wasPressed('KeyH');
  }

  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  wasPressed(...codes: string[]): boolean {
    return codes.some((c) => this.pressed.has(c));
  }

  /** Test helper: pretend Space was pressed this frame. */
  forceFire(): void {
    this.pressed.add('Space');
  }

  endFrame(): void {
    this.pressed.clear();
  }
}
