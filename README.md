# Rando Games

A small site of browser games, built with Claude Code as the coding assistant.
Everything runs in the browser. There is no backend.

## Games

- **Island Escape** (`island-escape/`) - 3D survival with Three.js. Gather wood
  and stone, craft tools, survive storms and pirate raids, then sail to the city.
- **Spaceship Attack** (`spaceship-attack/`) - 2D vertical shooter on canvas.
  Burst fire, homing missiles, and a boss about every minute.

Both games offer Adventure and Creative modes.

## Working on it

```sh
npm install
npm run dev        # opens the game currently being worked on
npm run build      # static site in dist/
npm run typecheck
```

While the dev server is running, saving a file does **not** reload the page.
A "New version ready" banner appears instead, and you restart when you choose
by pressing R. This keeps a run alive while the code changes underneath it.

Set `SITE_BASE` when building for a subpath, for example a GitHub Pages
project site:

```sh
SITE_BASE=/game/ npm run build
```

## Playtests

Headless Playwright scripts drive the real games through their mechanics. Start
the dev server first, then:

```sh
npm run playtest             # Island Escape, adventure mode
npm run playtest:creative    # Island Escape, creative mode
npm run playtest:spaceship   # Spaceship Attack basics
npm run playtest:bosses      # boss progression and skins
npm run playtest:abilities   # burst fire, missiles, ammo decay
npm run balance              # weapon and boss balance report
npm run reloadtest           # the deferred-reload banner
```
