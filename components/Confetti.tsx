import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

export const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const colors = ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#ffffff'];

    // Create explosion
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        size: Math.random() * 6 + 2,
      });
    }

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let activeParticles = false;

      particles.forEach((p) => {
        if (p.alpha <= 0) return;
        activeParticles = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.alpha -= 0.01; // Fade out

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (activeParticles) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
};