/**
 * SyncUp AI - High-Performance Canvas Confetti Engine
 * Zero-dependency, GPU-accelerated particle physics burst for gamified task completion and quiz mastery.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  width: number;
  height: number;
  color: string;
  alpha: number;
  decay: number;
}

const PALETTE = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f43f5e', // Rose
];

export function fireConfetti(origin?: { x: number; y: number }): void {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';

  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  document.body.appendChild(canvas);

  const startX = origin?.x ?? window.innerWidth / 2;
  const startY = origin?.y ?? window.innerHeight / 2;

  const particleCount = 75;
  const particles: Particle[] = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3.5, // Initial upward pop
      angle: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 0.25,
      width: 7 + Math.random() * 5,
      height: 4 + Math.random() * 4,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      alpha: 1,
      decay: 0.014 + Math.random() * 0.016,
    });
  }

  let animationFrameId: number;

  const animate = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let activeParticles = 0;

    for (const p of particles) {
      if (p.alpha <= 0) continue;
      activeParticles++;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // Gravity
      p.vx *= 0.985; // Air drag
      p.angle += p.angularVelocity;
      p.alpha = Math.max(0, p.alpha - p.decay);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      ctx.restore();
    }

    if (activeParticles > 0) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };

  animationFrameId = requestAnimationFrame(animate);
}
