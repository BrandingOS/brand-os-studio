import { motion } from 'framer-motion';

const BLOBS = [
  { color: '#7C3AED', x: '15%', y: '20%', size: 520 },
  { color: '#06B6D4', x: '75%', y: '15%', size: 480 },
  { color: '#F97316', x: '80%', y: '75%', size: 560 },
  { color: '#EC4899', x: '20%', y: '80%', size: 520 },
] as const;

export function MeshGradient({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            background: blob.color,
            width: blob.size,
            height: blob.size,
            left: blob.x,
            top: blob.y,
            opacity: 0.35,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            x: [0, 60, -40, 0],
            y: [0, -50, 40, 0],
            scale: [1, 1.08, 0.95, 1],
          }}
          transition={{
            duration: 18 + i * 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[80px]" />
    </div>
  );
}
