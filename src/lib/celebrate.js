import confetti from 'canvas-confetti';
import { houseAccent } from './houses.js';

/** House-coloured confetti burst (respects prefers-reduced-motion). */
export function fireHouseConfetti(house, { big = false } = {}) {
  const colors = [house.primary, houseAccent(house), house.light, '#FFFFFF'];
  const base = { colors, disableForReducedMotion: true, zIndex: 9999 };
  confetti({ ...base, particleCount: big ? 180 : 110, spread: big ? 100 : 75, startVelocity: big ? 55 : 45, origin: { y: 0.65 } });
  setTimeout(() => {
    confetti({ ...base, particleCount: big ? 90 : 50, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } });
    confetti({ ...base, particleCount: big ? 90 : 50, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } });
  }, 220);
}
