/**
 * Beating a boss upgrades the ship itself: a new hull, a different looking shot,
 * and a permanent power bonus on top of whatever upgrades are collected.
 */
export interface Skin {
  readonly name: string;
  readonly hull: string;
  readonly accent: string;
  readonly cockpit: string;
  readonly bullet: string;
  readonly bulletGlow: string;
  readonly bulletShape: 'bolt' | 'lance' | 'orb' | 'wave' | 'star';
  /** Added to bullet damage while this skin is worn. */
  readonly damageBonus: number;
}

export const SKINS: readonly Skin[] = [
  { name: 'Scout', hull: '#dde7f5', accent: '#3f7fd0', cockpit: '#2b6cb0', bullet: '#7ef9ff', bulletGlow: '#39d6ff', bulletShape: 'bolt', damageBonus: 0 },
  { name: 'Vanguard', hull: '#cfe6d2', accent: '#27ae60', cockpit: '#186a3b', bullet: '#a8ff9c', bulletGlow: '#45e02a', bulletShape: 'lance', damageBonus: 1 },
  { name: 'Corsair', hull: '#e8dcf5', accent: '#8e44ad', cockpit: '#5b2c6f', bullet: '#e39bff', bulletGlow: '#bb3cff', bulletShape: 'orb', damageBonus: 1 },
  { name: 'Tempest', hull: '#d6e9f7', accent: '#1f6f9b', cockpit: '#12455f', bullet: '#8fe9ff', bulletGlow: '#00b7ff', bulletShape: 'wave', damageBonus: 2 },
  { name: 'Warden', hull: '#f7e7c8', accent: '#d68910', cockpit: '#7e5109', bullet: '#ffd86b', bulletGlow: '#ff9f1a', bulletShape: 'star', damageBonus: 2 },
  { name: 'Ascendant', hull: '#fbe4ea', accent: '#c0392b', cockpit: '#7b241c', bullet: '#ff8d7a', bulletGlow: '#ff3b1f', bulletShape: 'star', damageBonus: 3 },
];

export function skinFor(bossesDefeated: number): Skin {
  return SKINS[Math.min(bossesDefeated, SKINS.length - 1)]!;
}
