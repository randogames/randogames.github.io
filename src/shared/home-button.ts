/**
 * Makes the "All games" button easy to find: it sits faint in the corner and
 * lights up when the pointer moves into that corner of the screen.
 */
const NEAR_X = 240;
const NEAR_Y = 120;

export function installHomeButton(): void {
  const button = document.getElementById('home');
  if (!button) return;
  window.addEventListener('pointermove', (e) => {
    button.classList.toggle('near', e.clientX < NEAR_X && e.clientY < NEAR_Y);
  });
}
