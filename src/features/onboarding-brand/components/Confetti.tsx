import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface ConfettiProps {
  colors: string[];
  count?: number;
  onDone?: () => void;
}

interface Particle {
  id: number;
  color: string;
  x: number;
  rotate: number;
  duration: number;
  delay: number;
  size: number;
}

export function Confetti({ colors, count = 80, onDone }: ConfettiProps) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      color: colors[i % colors.length] ?? '#7C3AED',
      x: Math.random() * 100,
      rotate: Math.random() * 720 - 360,
      duration: 2.2 + Math.random() * 1.6,
      delay: Math.random() * 0.4,
      size: 6 + Math.floor(Math.random() * 8),
    }));
  }, [colors, count]);

  useEffect(() => {
    const id = window.setTimeout(() => onDone?.(), 3600);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{
            y: typeof window !== 'undefined' ? window.innerHeight + 40 : 900,
            rotate: p.rotate,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            borderRadius: 2,
          }}
          className="absolute top-0"
        />
      ))}
    </div>
  );
}
