import type { Inventory } from './inventory';

export type RecipeId = 'table' | 'campfire' | 'pot' | 'axe' | 'pickaxe' | 'sword' | 'boat' | 'cook';

export interface Recipe {
  readonly id: RecipeId;
  readonly name: string;
  readonly wood: number;
  readonly stone: number;
  readonly rawMeat: number;
  readonly needsTable: boolean;
  readonly needsFire: boolean;
  readonly needsPot: boolean;
  readonly description: string;
}

const base = { wood: 0, stone: 0, rawMeat: 0, needsTable: false, needsFire: false, needsPot: false };

export const RECIPES: readonly Recipe[] = [
  { ...base, id: 'table', name: 'Crafting table', wood: 4, description: 'Placed in front of you. Unlocks tools and the boat.' },
  { ...base, id: 'campfire', name: 'Campfire', wood: 5, stone: 2, description: 'Light and warmth at night. Cook meat here with a pot.' },
  { ...base, id: 'axe', name: 'Stone axe', wood: 2, stone: 3, needsTable: true, description: 'Twice the wood per hit.' },
  { ...base, id: 'pickaxe', name: 'Stone pickaxe', wood: 2, stone: 3, needsTable: true, description: 'Twice the stone per hit.' },
  { ...base, id: 'sword', name: 'Stone sword', wood: 1, stone: 4, needsTable: true, description: 'Pirates and animals go down faster.' },
  { ...base, id: 'pot', name: 'Cooking pot', stone: 4, needsTable: true, description: 'Lets you cook meat over a campfire.' },
  { ...base, id: 'cook', name: 'Cook meat', rawMeat: 1, needsFire: true, needsPot: true, description: 'Raw meat becomes cooked meat. Eat with Q.' },
  { ...base, id: 'boat', name: 'Boat', wood: 12, stone: 2, needsTable: true, description: 'Sail the sea. Board it with B.' },
];

export interface CraftContext {
  nearTable: boolean;
  nearFire: boolean;
  hasBoat: boolean;
}

export function alreadyOwned(r: Recipe, inv: Inventory, ctx: CraftContext): boolean {
  switch (r.id) {
    case 'axe': return inv.axe;
    case 'pickaxe': return inv.pickaxe;
    case 'sword': return inv.sword;
    case 'pot': return inv.pot;
    case 'boat': return ctx.hasBoat;
    default: return false;
  }
}

/** Why the recipe can't be crafted right now, or null if it can. */
export function blocker(r: Recipe, inv: Inventory, ctx: CraftContext): string | null {
  if (alreadyOwned(r, inv, ctx)) return 'already have it';
  if (r.needsTable && !ctx.nearTable) return 'stand next to a crafting table';
  if (r.needsFire && !ctx.nearFire) return 'stand next to a campfire';
  if (r.needsPot && !inv.pot) return 'you need a cooking pot';
  if (r.needsPot && inv.held !== 'pot') return 'hold the cooking pot (close the menu, press 4)';
  if (inv.wood < r.wood || inv.stone < r.stone || inv.rawMeat < r.rawMeat) return 'not enough materials';
  return null;
}

export function payFor(r: Recipe, inv: Inventory): void {
  inv.wood -= r.wood;
  inv.stone -= r.stone;
  inv.rawMeat -= r.rawMeat;
}

/** DOM panel listing recipes. Number keys pick one. */
export class CraftingMenu {
  open = false;
  private readonly el: HTMLElement;

  constructor() {
    const el = document.getElementById('crafting');
    if (!el) throw new Error('Missing #crafting');
    this.el = el;
  }

  toggle(): void {
    this.open = !this.open;
    this.el.style.display = this.open ? 'block' : 'none';
  }

  close(): void {
    this.open = false;
    this.el.style.display = 'none';
  }

  render(inv: Inventory, ctx: CraftContext): void {
    if (!this.open) return;
    const rows = RECIPES.map((r, i) => {
      const why = blocker(r, inv, ctx);
      const cost = [
        r.wood ? `${r.wood} wood` : '',
        r.stone ? `${r.stone} stone` : '',
        r.rawMeat ? `${r.rawMeat} raw meat` : '',
      ].filter(Boolean).join(' + ');
      return `<div class="recipe ${why ? 'no' : 'ok'}"><b>${i + 1}. ${r.name}</b> <span class="cost">${cost}</span><br><small>${r.description}${why ? ` <i>(${why})</i>` : ''}</small></div>`;
    });
    this.el.innerHTML = `<h2>Crafting</h2><p>Press a number to craft. C closes.</p>${rows.join('')}`;
  }
}
