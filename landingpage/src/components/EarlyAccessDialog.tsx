/**
 * EarlyAccessDialog
 *
 * Centered modal that opens/closes via the EarlyAccess context.
 * Wraps Radix Dialog for the accessibility primitives (focus trap,
 * ESC handling, ARIA labels, click-outside-to-close, scroll lock)
 * and adds a custom framer-motion entrance/exit on top.
 *
 * Mounts the MultiStepEarlyAccess form inside.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEarlyAccess } from '@/components/EarlyAccessProvider';
import { MultiStepEarlyAccess } from '@/components/MultiStepEarlyAccess';

export function EarlyAccessDialog() {
  const { isOpen, close } = useEarlyAccess();

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => !o && close()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-md"
              />
            </Dialog.Overlay>

            {/* Modal panel */}
            <Dialog.Content
              asChild
              onOpenAutoFocus={(e) => {
                // Let the form's first input grab focus on its own
                e.preventDefault();
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="fixed left-1/2 top-1/2 z-[101] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2"
              >
                <div className="relative surface shadow-elegant p-6 sm:p-8">
                  {/* Close button */}
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>

                  {/* Heading */}
                  <Dialog.Title asChild>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                      Get early access
                    </h2>
                  </Dialog.Title>
                  <Dialog.Description asChild>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Three quick questions, then we'll save your spot.
                    </p>
                  </Dialog.Description>

                  {/* The form */}
                  <div className="mt-6">
                    <MultiStepEarlyAccess />
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
