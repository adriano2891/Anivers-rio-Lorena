import confetti from 'canvas-confetti';

/**
 * Dispara uma grande e espetacular explosão de confetes coloridos
 * garantindo z-index superior a qualquer modal ou camada fullscreen (z-index: 999999).
 */
export function fireCelebrationConfetti() {
  const festiveColors = [
    '#10b981', // emerald
    '#0d9488', // teal
    '#f59e0b', // amber
    '#3b82f6', // blue
    '#ec4899', // pink
    '#8b5cf6', // purple
    '#ef4444', // red
    '#facc15', // yellow
    '#ffffff'  // white
  ];

  // Onda 1: Grande explosão central
  confetti({
    particleCount: 120,
    spread: 80,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.6 },
    zIndex: 999999,
    colors: festiveColors,
    disableForReducedMotion: false
  });

  // Onda 2: Canhões laterais esquerdo e direito (efeito cascata)
  setTimeout(() => {
    confetti({
      particleCount: 65,
      angle: 60,
      spread: 60,
      startVelocity: 50,
      origin: { x: 0.05, y: 0.65 },
      zIndex: 999999,
      colors: festiveColors
    });

    confetti({
      particleCount: 65,
      angle: 120,
      spread: 60,
      startVelocity: 50,
      origin: { x: 0.95, y: 0.65 },
      zIndex: 999999,
      colors: festiveColors
    });
  }, 200);

  // Onda 3: Chuva dourada e verde alta
  setTimeout(() => {
    confetti({
      particleCount: 90,
      spread: 120,
      startVelocity: 35,
      origin: { x: 0.5, y: 0.35 },
      zIndex: 999999,
      scalar: 1.15,
      colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#ffd700']
    });
  }, 450);
}
