import { useEffect, useRef } from 'react';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let offset = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Get computed styles to use theme colors
      const computedStyle = getComputedStyle(document.documentElement);
      const isDark = document.documentElement.classList.contains('dark');
      
      // Use very subtle line color
      ctx.strokeStyle = isDark 
        ? 'rgba(255, 255, 255, 0.03)' 
        : 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 1;

      const spacing = 40;
      const lineLength = Math.max(canvas.width, canvas.height) * 2;

      // Draw diagonal lines moving slowly
      for (let i = -lineLength; i < lineLength; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i + offset, 0);
        ctx.lineTo(i + offset + canvas.height, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width - i - offset, 0);
        ctx.lineTo(canvas.width - i - offset - canvas.height, canvas.height);
        ctx.stroke();
      }

      offset = (offset + 0.2) % spacing;
      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
    />
  );
}
