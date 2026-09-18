/**
 * Shows a banner when the dev server has a newer version of the game.
 * The running game keeps going; the player restarts with R or by clicking.
 */
export function installUpdateBanner(): void {
  const hot = import.meta.hot;
  if (!hot) return;

  let banner: HTMLElement | null = null;
  const show = (): void => {
    if (banner) return;
    banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = '<b>New version ready.</b> Press <kbd>R</kbd> or click here to restart.';
    Object.assign(banner.style, {
      position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: '1000',
      padding: '10px 18px', borderRadius: '10px', background: '#ffd54f', color: '#222',
      font: '15px system-ui, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,.4)', cursor: 'pointer',
    });
    banner.addEventListener('click', () => location.reload());
    document.body.appendChild(banner);
  };

  hot.on('game:new-version', show);
  // Fallback: html edits still make Vite ask for a full reload. Refusing here stops it.
  hot.on('vite:beforeFullReload', () => {
    show();
    throw new Error('reload deferred until the player presses R');
  });
  window.addEventListener('keydown', (e) => {
    if (banner && e.code === 'KeyR') location.reload();
  });
}
