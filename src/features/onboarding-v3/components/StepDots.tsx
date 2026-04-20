import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { CreateStep } from '../types';

const LABELS: Record<CreateStep, string> = { 1: 'Define', 2: 'Feel', 3: 'Generate' };

export function StepDots({ current }: { current: CreateStep }) {
  const steps: CreateStep[] = [1, 2, 3];
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {steps.map((s, i) => {
        const state: 'done' | 'active' | 'pending' =
          s < current ? 'done' : s === current ? 'active' : 'pending';
        return (
          <div key={s} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                layout
                className="relative grid place-items-center w-6 h-6 rounded-full border"
                style={{
                  borderColor: state === 'pending' ? 'var(--border)' : 'var(--accent)',
                  background: state === 'active' ? 'var(--accent)' : 'transparent',
                }}
                animate={state === 'active' ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 1.6, repeat: state === 'active' ? Infinity : 0 }}
              >
                {state === 'done' && <Check size={12} className="text-cosmos-accent" />}
                {state === 'active' && <div className="w-2 h-2 rounded-full bg-cosmos-accent-contrast" />}
              </motion.div>
              <span
                className="text-[11px] font-medium tracking-wider uppercase"
                style={{ color: state === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}
              >
                {LABELS[s]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-10 h-px mb-4"
                style={{ background: s < current ? 'var(--accent)' : 'var(--border)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
