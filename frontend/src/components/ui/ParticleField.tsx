import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
}

interface ParticleFieldProps {
  count?:   number;
  color?:   string;
  speed?:   number;
  opacity?: number;
}

export default function ParticleField({
  count   = 80,
  color   = '255,255,255',
  speed   = 0.3,
  opacity = 0.35,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let width  = canvas.width  = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    let animId: number;

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x:       Math.random() * width,
      y:       Math.random() * height,
      vx:      (Math.random() - 0.5) * speed,
      vy:      (Math.random() - 0.5) * speed - 0.1,
      life:    Math.random(),
      maxLife: 0.6 + Math.random() * 0.4,
      size:    0.5 + Math.random() * 1.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.life += 0.003;
        if (p.life > p.maxLife) {
          p.life = 0;
          p.x    = Math.random() * width;
          p.y    = height + 10;
        }
        p.x += p.vx;
        p.y += p.vy;

        const t   = Math.sin((p.life / p.maxLife) * Math.PI);
        const a   = t * opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${a})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      width  = canvas.width  = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [count, color, speed, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
