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
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-md"
              />
            </Dialog.Overlay>

            {/* Modal — fixed full-screen wrapper handles centering, the
                inner motion.div ONLY handles entrance/exit animation.
                This separation is critical: framer-motion animates the
                inner element's `transform`, and if positioning is also
                done via `transform: translate(-50%, -50%)`, the animated
                transform overrides the centering. The modal then renders
                with its top-left at the viewport center, extending
                down-right (which is exactly the bug we just hit). */}
            <Dialog.Content
              asChild
              onOpenAutoFocus={(e) => {
                // Let the form's first input grab focus on its own
                e.preventDefault();
              }}
            >
              <div className="fixed inset-0 z-[101] grid place-items-center p-4 sm:p-6 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{
                    duration: 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative w-full max-w-xl max-h-[calc(100vh-3rem)] overflow-y-auto surface shadow-elegant p-7 sm:p-10"
                >
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
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
