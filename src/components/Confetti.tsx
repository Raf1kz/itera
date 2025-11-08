import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfettiProps {
  isActive: boolean;
}

export function Confetti({ isActive }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([]);

  useEffect(() => {
    const palette = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'] as const;

    if (!isActive) {
      setParticles([]);
      return undefined;
    }

    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      color: palette[Math.floor(Math.random() * palette.length)] ?? '#3b82f6',
      delay: Math.random() * 0.3,
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(timer);
  }, [isActive]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: `${particle.x}vw`, 
              y: '-10vh',
              opacity: 1,
              rotate: 0
            }}
            animate={{ 
              y: '110vh',
              opacity: 0,
              rotate: 360
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2 + Math.random(),
              delay: particle.delay,
              ease: "easeIn"
            }}
            className="absolute w-3 h-3 rounded-sm"
            style={{ backgroundColor: particle.color }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
