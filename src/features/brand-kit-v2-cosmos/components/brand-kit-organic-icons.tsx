/**
 * Organic animated icons for the Brand Kit sidebar.
 *
 * Mirrors the shape of `src/features/setup/components/organic-icons`
 * — each icon is a framer-motion SVG with spring-driven variants and
 * an imperative `startAnimation` / `stopAnimation` handle. They are
 * all stroked with `currentColor`, so light + dark themes work by
 * swapping the surrounding text color via cosmos tokens.
 */

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  motion,
  useAnimation,
  type AnimationControls,
  type Variants,
} from 'framer-motion';
import type {
  OrganicIconHandle,
  OrganicIconProps,
} from '@/features/setup/components/organic-icons';

/* ─── Animation harness (local copy — tiny, no cross-module coupling) ─ */

function useIconAnimation(
  ref: React.ForwardedRef<OrganicIconHandle>,
  onMouseEnter?: OrganicIconProps['onMouseEnter'],
  onMouseLeave?: OrganicIconProps['onMouseLeave'],
) {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;
    return {
      startAnimation: () => controls.start('animate'),
      stopAnimation: () => controls.start('normal'),
    };
  });

  const handleMouseEnter = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) onMouseEnter?.(e);
      else controls.start('animate');
    },
    [controls, onMouseEnter],
  );

  const handleMouseLeave = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) onMouseLeave?.(e);
      else controls.start('normal');
    },
    [controls, onMouseLeave],
  );

  return { controls, handleMouseEnter, handleMouseLeave };
}

function Shell({
  size = 24,
  children,
  controls,
  onMouseEnter,
  onMouseLeave,
  restProps,
}: {
  size?: number;
  children: React.ReactNode;
  controls: AnimationControls;
  onMouseEnter: (e: ReactMouseEvent<HTMLDivElement>) => void;
  onMouseLeave: (e: ReactMouseEvent<HTMLDivElement>) => void;
  restProps: HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...restProps}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ overflow: 'visible' }}
        animate={controls}
      >
        {children}
      </motion.svg>
    </div>
  );
}

/* =============================================================
 * 1) STATIONERY — paper stack, top sheet lifts and peels
 * ============================================================= */
export const PaperStackOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(ref, onMouseEnter, onMouseLeave);
    // Top sheet lifts off, rotates a bit, then settles back.
    const top: Variants = {
      normal: { x: 0, y: 0, rotate: 0 },
      animate: {
        x: [0, 1.5, 0],
        y: [0, -3, 0],
        rotate: [0, -6, 0],
        transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
      },
    };
    // Mid sheet shifts slightly to hint the stack below.
    const mid: Variants = {
      normal: { x: 0, y: 0 },
      animate: { x: [0, -0.8, 0], y: [0, 0.5, 0], transition: { duration: 0.85, ease: 'easeInOut' } },
    };
    return (
      <Shell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        {/* Bottom sheet */}
        <rect x="7" y="7" width="12" height="14" rx="1.4" />
        {/* Mid sheet */}
        <motion.g variants={mid}>
          <rect x="5.5" y="5.5" width="12" height="14" rx="1.4" fill="var(--surface-elevated, #ffffff)" />
          <rect x="5.5" y="5.5" width="12" height="14" rx="1.4" />
        </motion.g>
        {/* Top sheet with lines + dog-ear corner */}
        <motion.g variants={top} style={{ transformOrigin: '10px 18px' }}>
          <path
            d="M4 3.5 H14 L16.5 6 V18 A1.4 1.4 0 0 1 15.1 19.4 H4 A1.4 1.4 0 0 1 2.6 18 V4.9 A1.4 1.4 0 0 1 4 3.5 Z"
            fill="var(--surface-elevated, #ffffff)"
          />
          <path d="M4 3.5 H14 L16.5 6 V18 A1.4 1.4 0 0 1 15.1 19.4 H4 A1.4 1.4 0 0 1 2.6 18 V4.9 A1.4 1.4 0 0 1 4 3.5 Z" />
          {/* Dog-ear fold */}
          <path d="M14 3.5 V6 H16.5" strokeWidth="1.4" />
          {/* Content lines */}
          <path d="M5.5 9 H13" strokeWidth="1.3" />
          <path d="M5.5 12 H13" strokeWidth="1.3" />
          <path d="M5.5 15 H10.5" strokeWidth="1.3" />
        </motion.g>
      </Shell>
    );
  },
);
PaperStackOrganicIcon.displayName = 'PaperStackOrganicIcon';

/* =============================================================
 * 1b) SOCIAL MEDIA — two chat bubbles, typing dots pulse
 * ============================================================= */
export const ChatBubblesOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(ref, onMouseEnter, onMouseLeave);
    // Back bubble nudges up and right, subtle.
    const back: Variants = {
      normal: { x: 0, y: 0, scale: 1 },
      animate: {
        x: [0, -1, 0],
        y: [0, -1, 0],
        scale: [0.96, 1, 1],
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
      },
    };
    // Front bubble pops in.
    const front: Variants = {
      normal: { scale: 1, opacity: 1 },
      animate: {
        scale: [0.5, 1.08, 1],
        opacity: [0, 1, 1],
        transition: { duration: 0.55, delay: 0.15, ease: [0.22, 1.3, 0.5, 1] },
      },
    };
    // Three typing dots fire in sequence.
    const dot = (i: number): Variants => ({
      normal: { scale: 1, opacity: 1 },
      animate: {
        scale: [0, 1.3, 1],
        opacity: [0, 1, 1],
        transition: { duration: 0.4, delay: 0.35 + i * 0.08, ease: 'easeOut' },
      },
    });
    return (
      <Shell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        {/* Back bubble — rounded rect with a tail on the bottom-left */}
        <motion.g variants={back} style={{ transformOrigin: '8px 9px' }}>
          <path d="M3 5.5 A2 2 0 0 1 5 3.5 H13 A2 2 0 0 1 15 5.5 V10 A2 2 0 0 1 13 12 H7.5 L5 14.5 V12 A2 2 0 0 1 3 10 Z" />
        </motion.g>
        {/* Front bubble — solid, overlapping bottom-right */}
        <motion.g variants={front} style={{ transformOrigin: '15.5px 15.5px' }}>
          <path
            d="M10 13 A2 2 0 0 0 8 15 V18.5 A2 2 0 0 0 10 20.5 H18 L20.5 22.5 V20.5 A2 2 0 0 0 22 18.5 V15 A2 2 0 0 0 20 13 Z"
            fill="currentColor"
            stroke="none"
          />
          {/* Typing dots (punched-out via cosmos token so they read in both themes) */}
          <motion.circle cx="12" cy="16.5" r="0.9" fill="var(--surface-elevated, #ffffff)" variants={dot(0)} style={{ transformOrigin: '12px 16.5px' }} />
          <motion.circle cx="15" cy="16.5" r="0.9" fill="var(--surface-elevated, #ffffff)" variants={dot(1)} style={{ transformOrigin: '15px 16.5px' }} />
          <motion.circle cx="18" cy="16.5" r="0.9" fill="var(--surface-elevated, #ffffff)" variants={dot(2)} style={{ transformOrigin: '18px 16.5px' }} />
        </motion.g>
      </Shell>
    );
  },
);
ChatBubblesOrganicIcon.displayName = 'ChatBubblesOrganicIcon';

/* =============================================================
 * 2) MOCKUPS — isometric cube rotates / lid lifts
 * ============================================================= */
export const CubeOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(ref, onMouseEnter, onMouseLeave);
    const lid: Variants = {
      normal: { y: 0 },
      animate: { y: [0, -2, 0], transition: { duration: 0.8, ease: 'easeInOut' } },
    };
    const side: Variants = {
      normal: { pathLength: 1, opacity: 1 },
      animate: { pathLength: [0, 1], opacity: [0.3, 1], transition: { duration: 0.6, ease: 'easeOut' } },
    };
    return (
      <Shell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        {/* Left face */}
        <motion.path d="M4 8 L12 4 L12 13 L4 17 Z" variants={side} />
        {/* Right face */}
        <motion.path d="M20 8 L12 4 L12 13 L20 17 Z" variants={side} />
        {/* Top face — lifts on hover */}
        <motion.path d="M4 8 L12 12 L20 8" variants={lid} />
        {/* Bottom seam */}
        <motion.path d="M4 17 L12 21 L20 17 L12 13 Z" variants={side} />
      </Shell>
    );
  },
);
CubeOrganicIcon.displayName = 'CubeOrganicIcon';

/* =============================================================
 * 3) BRAND GUIDES — compass needle spins
 * ============================================================= */
export const CompassOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(ref, onMouseEnter, onMouseLeave);
    const needle: Variants = {
      normal: { rotate: 0 },
      animate: { rotate: [0, 160, 320, 360], transition: { duration: 1.1, ease: 'easeInOut' } },
    };
    return (
      <Shell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <circle cx="12" cy="12" r="8.5" />
        <motion.g variants={needle} style={{ transformOrigin: '12px 12px' }}>
          <path d="M12 6 L14 12 L12 18 L10 12 Z" fill="currentColor" stroke="none" />
        </motion.g>
        <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
      </Shell>
    );
  },
);
CompassOrganicIcon.displayName = 'CompassOrganicIcon';

/* =============================================================
 * 4) PRESENTATIONS — chart bars rise in sequence
 * ============================================================= */
export const ChartOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(ref, onMouseEnter, onMouseLeave);
    const bar = (i: number, fromY: number): Variants => ({
      normal: { scaleY: 1 },
      animate: {
        scaleY: [0, 1],
        transition: { duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
      },
    });
    return (
      <Shell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
        <motion.rect x="7" y="10" width="2" height="5" fill="currentColor" stroke="none" variants={bar(0, 15)} style={{ transformOrigin: '8px 15px' }} />
        <motion.rect x="11" y="8" width="2" height="7" fill="currentColor" stroke="none" variants={bar(1, 15)} style={{ transformOrigin: '12px 15px' }} />
        <motion.rect x="15" y="6" width="2" height="9" fill="currentColor" stroke="none" variants={bar(2, 15)} style={{ transformOrigin: '16px 15px' }} />
        <path d="M9 20 L15 20" strokeWidth="1.6" />
      </Shell>
    );
  },
);
ChartOrganicIcon.displayName = 'ChartOrganicIcon';

/* =============================================================
 * 12) ANIMATIONS — play button pulses
 * ============================================================= */
export const PlayOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(ref, onMouseEnter, onMouseLeave);
    const ring: Variants = {
      normal: { scale: 1, opacity: 1 },
      animate: { scale: [1, 1.12, 1], opacity: [1, 0.6, 1], transition: { duration: 0.8, ease: 'easeInOut' } },
    };
    const tri: Variants = {
      normal: { x: 0 },
      animate: { x: [0, 1.5, 0], transition: { duration: 0.7, ease: 'easeInOut' } },
    };
    return (
      <Shell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <motion.circle cx="12" cy="12" r="8.5" variants={ring} style={{ transformOrigin: '12px 12px' }} />
        <motion.path d="M10.5 8.5 L16 12 L10.5 15.5 Z" fill="currentColor" stroke="none" variants={tri} />
      </Shell>
    );
  },
);
PlayOrganicIcon.displayName = 'PlayOrganicIcon';

/* =============================================================
 * 13) QR CODE — three finder corners pop
 * ============================================================= */
export const QrOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(ref, onMouseEnter, onMouseLeave);
    const pop = (i: number): Variants => ({
      normal: { scale: 1, opacity: 1 },
      animate: { scale: [0, 1.1, 1], opacity: [0, 1, 1], transition: { duration: 0.5, delay: i * 0.08, ease: [0.3, 1.4, 0.5, 1] } },
    });
    return (
      <Shell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <motion.rect x="3.5" y="3.5" width="7" height="7" rx="1" variants={pop(0)} style={{ transformOrigin: '7px 7px' }} />
        <motion.rect x="13.5" y="3.5" width="7" height="7" rx="1" variants={pop(1)} style={{ transformOrigin: '17px 7px' }} />
        <motion.rect x="3.5" y="13.5" width="7" height="7" rx="1" variants={pop(2)} style={{ transformOrigin: '7px 17px' }} />
        <motion.rect x="14" y="14" width="2" height="2" fill="currentColor" stroke="none" variants={pop(3)} style={{ transformOrigin: '15px 15px' }} />
        <motion.rect x="18" y="18" width="2" height="2" fill="currentColor" stroke="none" variants={pop(4)} style={{ transformOrigin: '19px 19px' }} />
        <motion.rect x="18" y="14" width="2" height="2" fill="currentColor" stroke="none" variants={pop(5)} style={{ transformOrigin: '19px 15px' }} />
        <motion.rect x="14" y="18" width="2" height="2" fill="currentColor" stroke="none" variants={pop(6)} style={{ transformOrigin: '15px 19px' }} />
      </Shell>
    );
  },
);
QrOrganicIcon.displayName = 'QrOrganicIcon';
