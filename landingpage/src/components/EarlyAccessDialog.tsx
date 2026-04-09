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
                initial={{ opacity: 0, y: 28, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                transition={{
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="fixed left-1/2 top-1/2 z-[101] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto"
              >
                <div className="relative surface shadow-elegant p-7 sm:p-10">
                  {/* Close button */}
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>

                  {/* Heading */}
                  <Dialog.Title asChild>
                    <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight pr-12">
                      Get early access.
                    </h2>
                  </Dialog.Title>
                  <Dialog.Description asChild>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Five quick questions. About 30 seconds. Email at the end.
                    </p>
                  </Dialog.Description>

                  {/* The form */}
                  <div className="mt-7">
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
