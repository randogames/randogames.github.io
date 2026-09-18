import { defineConfig, type Plugin } from 'vite';

/**
 * Don't hot-reload the games while someone is playing. Instead tell the page a
 * new version exists; the page shows a banner and the player restarts with R.
 */
function deferredReload(): Plugin {
  return {
    name: 'deferred-reload',
    hotUpdate({ file }) {
      if (this.environment.name !== 'client') return;
      this.environment.hot.send({ type: 'custom', event: 'game:new-version', data: { file } });
      return []; // swallow the update; nothing is patched or reloaded
    },
  };
}

export default defineConfig({
  // A project site lives under /<repo>/, so the base is configurable.
  base: process.env['SITE_BASE'] ?? '/',
  plugins: [deferredReload()],
  server: {
    port: 5173,
    strictPort: true,
    open: '/spaceship-attack/', // the game currently being worked on
  },
  build: {
    rolldownOptions: {
      input: {
        main: 'index.html',
        'island-escape': 'island-escape/index.html',
        'spaceship-attack': 'spaceship-attack/index.html',
      },
    },
  },
});
