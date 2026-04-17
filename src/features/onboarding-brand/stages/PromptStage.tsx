import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MeshGradient } from '../components/MeshGradient';
import { PromptInput } from '../components/PromptInput';

interface PromptStageProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

export function PromptStage({ onSubmit, disabled }: PromptStageProps) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <MeshGradient />

      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <Link
          to="/"
          className="text-sm font-semibold tracking-tight text-foreground/80 hover:text-foreground transition-colors"
        >
          BrandOS
        </Link>
        <Link
          to="/onboarding"
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Classic setup
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-3xl"
        >
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs text-muted-foreground mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AI brand generator
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Let's build your brand
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
              Describe your business in one line. We'll generate a complete
              brand identity in seconds.
            </p>
          </div>

          <PromptInput onSubmit={onSubmit} disabled={disabled} />

          <div className="mt-10 flex items-center justify-center gap-5 text-xs text-muted-foreground">
            <Link to="/onboarding" className="hover:text-foreground underline-offset-4 hover:underline">
              Start from scratch
            </Link>
            <span className="opacity-40">·</span>
            <Link to="/onboarding" className="hover:text-foreground underline-offset-4 hover:underline">
              Already have a brand?
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
