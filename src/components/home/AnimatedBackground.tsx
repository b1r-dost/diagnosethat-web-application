export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Diagonal moving lines with subtle glow */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute h-[1.5px] w-[200%]"
          style={{
            top: `${10 + i * 12}%`,
            left: '-50%',
            transformOrigin: 'center center',
            background: `linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.08) 20%, hsl(var(--primary) / 0.25) 50%, hsl(var(--primary) / 0.08) 80%, transparent 100%)`,
            boxShadow: '0 0 4px hsl(var(--primary) / 0.15)',
            animation: `slideDiagonal ${15 + i * 2}s linear infinite, pulseGlowSubtle ${4 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 1.5}s, ${i * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}
