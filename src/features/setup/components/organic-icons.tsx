/**
 * Organic animated icons for the Setup sidebar.
 *
 * Each icon is a custom SVG with its own hover animation — spring-based
 * path drawing / morphing / breathing. All expose the same handle
 * (startAnimation / stopAnimation) so SetupSidebar can drive them from
 * the row's mouse enter / leave.
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
  type Transition,
  type Variants,
} from 'framer-motion';

export type OrganicIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

export interface OrganicIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

type UseIconAnimationReturn = {
  controls: AnimationControls;
  handleMouseEnter: (e: ReactMouseEvent<HTMLDivElement>) => void;
  handleMouseLeave: (e: ReactMouseEvent<HTMLDivElement>) => void;
};

function useIconAnimation(
  ref: React.ForwardedRef<OrganicIconHandle>,
  onMouseEnter?: OrganicIconProps['onMouseEnter'],
  onMouseLeave?: OrganicIconProps['onMouseLeave'],
): UseIconAnimationReturn {
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

const SPRING: Transition = { type: 'spring', stiffness: 220, damping: 14 };
const DRAW: Transition = { duration: 0.55, ease: [0.22, 1, 0.36, 1] };

function IconShell({
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
 * 1) PEN — signature flourish (logo)
 * A curved line draws itself left→right under a nib.
 * ============================================================= */
export const PenOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const nibVariants: Variants = {
      normal: { rotate: 0, x: 0, y: 0 },
      animate: { rotate: [-6, 4, -2, 0], x: [0, 1, 0], y: [0, -1, 0] },
    };
    const lineVariants: Variants = {
      normal: { pathLength: 0, opacity: 0 },
      animate: { pathLength: 1, opacity: 1 },
    };
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <motion.g variants={nibVariants} transition={{ duration: 0.7, ease: 'easeInOut' }}>
          <path d="M15.5 4.5 L19.5 8.5" />
          <path d="M15.5 4.5 L11 9 L7 13 L4.5 19.5 L11 17 L15 13 L19.5 8.5" />
          <path d="M11 9 L15 13" />
        </motion.g>
        <motion.path
          d="M3 21 C 7 19, 11 22, 15 20 S 21 19, 21 21"
          variants={lineVariants}
          transition={DRAW}
        />
      </IconShell>
    );
  },
);
PenOrganicIcon.displayName = 'PenOrganicIcon';

/* =============================================================
 * 2) DROPLET / PALETTE — breathing color drops (colors)
 * Three drops pulse in sequence.
 * ============================================================= */
export const PaletteOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const drop = (delay: number): Variants => ({
      normal: { scale: 1, y: 0 },
      animate: { scale: [1, 1.25, 1], y: [0, -1.5, 0], transition: { duration: 0.9, delay, ease: 'easeInOut', repeat: 1, repeatType: 'mirror' } },
    });
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <motion.path
          d="M7 14 C 5 14, 4 12, 5.2 10 L 7 6.5 L 8.8 10 C 10 12, 9 14, 7 14 Z"
          fill="currentColor"
          variants={drop(0)}
        />
        <motion.path
          d="M12 18 C 10 18, 9 16, 10.2 14 L 12 10.5 L 13.8 14 C 15 16, 14 18, 12 18 Z"
          fill="currentColor"
          variants={drop(0.08)}
        />
        <motion.path
          d="M17 14 C 15 14, 14 12, 15.2 10 L 17 6.5 L 18.8 10 C 20 12, 19 14, 17 14 Z"
          fill="currentColor"
          variants={drop(0.16)}
        />
      </IconShell>
    );
  },
);
PaletteOrganicIcon.displayName = 'PaletteOrganicIcon';

/* =============================================================
 * 3) DIDONE T — high-contrast display letter (typography)
 * Thin cap with small drop-serifs, chunky FILLED stem, thin base.
 * Feels like actual printed type — different weight classes visible.
 * ============================================================= */
export const TypeOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const cap: Variants = {
      normal: { pathLength: 1, opacity: 1 },
      animate: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.5, ease: 'easeOut' } },
    };
    const stem: Variants = {
      normal: { scaleY: 1, opacity: 1 },
      animate: { scaleY: [0, 1], opacity: [0, 1], transition: { duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] } },
    };
    const base: Variants = {
      normal: { pathLength: 1, opacity: 1 },
      animate: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.4, delay: 0.55 } },
    };
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        {/* Thin cap with small drop-serifs */}
        <motion.path d="M3 7 L3 5 L21 5 L21 7" variants={cap} strokeWidth="1.6" />
        {/* Chunky filled stem — the "display" weight */}
        <motion.rect
          x="10.5"
          y="5"
          width="3"
          height="13.5"
          rx="0.4"
          fill="currentColor"
          stroke="none"
          variants={stem}
          style={{ transformOrigin: '12px 5px' }}
        />
        {/* Thin base line */}
        <motion.path d="M7 19 L17 19" variants={base} strokeWidth="1.6" />
      </IconShell>
    );
  },
);
TypeOrganicIcon.displayName = 'TypeOrganicIcon';

/* =============================================================
 * 4) SHAPES — morphing quartet (iconography)
 * 4 shapes (circle, square, triangle, diamond) scale-rotate in stagger.
 * ============================================================= */
export const ShapesOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const shape = (i: number): Variants => ({
      normal: { scale: 1, rotate: 0 },
      animate: {
        scale: [1, 0.6, 1.1, 1],
        rotate: [0, 90, 180],
        transition: { duration: 0.7, delay: i * 0.06, ease: [0.4, 1.4, 0.6, 1] },
      },
    });
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <motion.circle cx="7" cy="7" r="3" variants={shape(0)} style={{ transformOrigin: '7px 7px' }} />
        <motion.rect x="14" y="4" width="6" height="6" rx="1" variants={shape(1)} style={{ transformOrigin: '17px 7px' }} />
        <motion.path d="M7 14 L4 20 L10 20 Z" variants={shape(2)} style={{ transformOrigin: '7px 17px' }} />
        <motion.path d="M17 14 L20 17 L17 20 L14 17 Z" variants={shape(3)} style={{ transformOrigin: '17px 17px' }} />
      </IconShell>
    );
  },
);
ShapesOrganicIcon.displayName = 'ShapesOrganicIcon';

/* =============================================================
 * 5) LANDSCAPE — sun rising over mountains (photography)
 * Sun rises inside a frame; mountains stay.
 * ============================================================= */
export const PhotoOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const sun: Variants = {
      normal: { cy: 10, scale: 1, opacity: 1 },
      animate: { cy: [13, 7, 10], scale: [0.6, 1.1, 1], transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
    };
    const mountain: Variants = {
      normal: { pathLength: 1, opacity: 1 },
      animate: { pathLength: [0, 1], transition: { duration: 0.6, delay: 0.15 } },
    };
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <motion.circle cx="9" cy="10" r="1.6" fill="currentColor" variants={sun} />
        <motion.path d="M3 18 L 8 13 L 12 16 L 16 11 L 21 16" variants={mountain} />
      </IconShell>
    );
  },
);
PhotoOrganicIcon.displayName = 'PhotoOrganicIcon';

/* =============================================================
 * 6) LINK — two rings that flex together (website)
 * Rings breathe outward, subtle counter-rotation.
 * ============================================================= */
export const LinkOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const leftRing: Variants = {
      normal: { rotate: 0, x: 0 },
      animate: { rotate: [-20, 0], x: [-1.5, 0], transition: { duration: 0.7, ease: [0.3, 1.3, 0.4, 1] } },
    };
    const rightRing: Variants = {
      normal: { rotate: 0, x: 0 },
      animate: { rotate: [20, 0], x: [1.5, 0], transition: { duration: 0.7, ease: [0.3, 1.3, 0.4, 1] } },
    };
    const bridge: Variants = {
      normal: { pathLength: 1, opacity: 1 },
      animate: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.35, delay: 0.35 } },
    };
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <motion.path
          d="M10 15 L6.5 18.5 a4 4 0 0 1 -5.66 -5.66 L4.4 9.3 a4 4 0 0 1 5.66 0"
          variants={leftRing}
          style={{ transformOrigin: '6px 14px' }}
        />
        <motion.path
          d="M14 9 L17.5 5.5 a4 4 0 0 1 5.66 5.66 L19.6 14.7 a4 4 0 0 1 -5.66 0"
          variants={rightRing}
          style={{ transformOrigin: '18px 10px' }}
        />
        <motion.path d="M9 15 L15 9" variants={bridge} />
      </IconShell>
    );
  },
);
LinkOrganicIcon.displayName = 'LinkOrganicIcon';

/* =============================================================
 * 7) VOICE — speech bubble with audio waves (voice & tone)
 * Three bars pulse like a frequency meter.
 * ============================================================= */
export const VoiceOrganicIcon = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const bar = (delay: number, peak: number): Variants => ({
      normal: { scaleY: 1 },
      animate: {
        scaleY: [1, peak, 0.5, peak * 0.8, 1],
        transition: { duration: 0.9, delay, ease: 'easeInOut' },
      },
    });
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <path d="M4 6.5 Q 4 4, 6.5 4 L 17.5 4 Q 20 4, 20 6.5 L 20 13 Q 20 15.5, 17.5 15.5 L 11 15.5 L 7 19.5 L 7 15.5 L 6.5 15.5 Q 4 15.5, 4 13 Z" />
        <motion.rect x="8" y="8.5" width="1.6" height="3" rx="0.8" fill="currentColor" stroke="none" variants={bar(0, 1.6)} style={{ transformOrigin: 'center 10px' }} />
        <motion.rect x="11.2" y="7" width="1.6" height="6" rx="0.8" fill="currentColor" stroke="none" variants={bar(0.08, 1.8)} style={{ transformOrigin: 'center 10px' }} />
        <motion.rect x="14.4" y="8.5" width="1.6" height="3" rx="0.8" fill="currentColor" stroke="none" variants={bar(0.16, 1.6)} style={{ transformOrigin: 'center 10px' }} />
      </IconShell>
    );
  },
);
VoiceOrganicIcon.displayName = 'VoiceOrganicIcon';

// Shared spring export for any external tweaks.
export const ORGANIC_SPRING = SPRING;

/* =============================================================
 * ============= V2 VARIANTS =====================================
 * Alternate designs for: logo · colors · fonts · website · photos
 * ============================================================= */

/* V2 · 1) PEN-TOOL — nib + diagonal stroke, wobbles + draws (logo)
   Silhouette matches the reference pen illustration. */
export const PenOrganicIconV2 = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const body: Variants = {
      normal: { rotate: 0, x: 0, y: 0 },
      animate: { rotate: [0, -6, 3, 0], x: [0, 1, 0], y: [0, -0.5, 0], transition: { duration: 0.75, ease: 'easeInOut' } },
    };
    const diag: Variants = {
      normal: { pathLength: 1, opacity: 1 },
      animate: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] } },
    };
    const hole: Variants = {
      normal: { scale: 1 },
      animate: { scale: [1, 0.7, 1.15, 1], transition: { duration: 0.55, ease: [0.4, 1.4, 0.6, 1] } },
    };
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <motion.g variants={body} style={{ transformOrigin: '12px 12px' }}>
          {/* handle / tang — bottom-right pill */}
          <path d="M15.71 21.29 a1 1 0 0 1 -1.41 0 l-1.59 -1.59 a1 1 0 0 1 0 -1.41 l5.59 -5.59 a1 1 0 0 1 1.41 0 l1.59 1.59 a1 1 0 0 1 0 1.41 Z" />
          {/* nib body — triangular flag */}
          <path d="M18 13 l-1.38 -6.87 a1 1 0 0 0 -0.75 -0.78 L3.24 2.03 a1 1 0 0 0 -1.21 1.21 L5.35 15.88 a1 1 0 0 0 0.78 0.75 L13 18" />
          {/* tip crease — draws in */}
          <motion.path d="m2.3 2.3 7.29 7.29" variants={diag} />
          {/* breather hole */}
          <motion.circle cx="11" cy="11" r="2" variants={hole} style={{ transformOrigin: '11px 11px' }} />
        </motion.g>
      </IconShell>
    );
  },
);
PenOrganicIconV2.displayName = 'PenOrganicIconV2';

/* V2 · 2) EYEDROPPER — slanted pipette color picker (colors)
   Bulb squeezes, a drop forms at the tip and falls. */
export const PaletteOrganicIconV2 = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const body: Variants = {
      normal: { rotate: 0, x: 0, y: 0 },
      animate: { rotate: [0, -5, 3, 0], x: [0, 0.5, 0], y: [0, -0.5, 0], transition: { duration: 0.7, ease: 'easeInOut' } },
    };
    const bulb: Variants = {
      normal: { scale: 1 },
      animate: { scale: [1, 0.85, 1.08, 1], transition: { duration: 0.6, ease: [0.4, 1.4, 0.6, 1] } },
    };
    const drop: Variants = {
      normal: { scale: 0, y: 0, opacity: 0 },
      animate: {
        scale: [0, 1.25, 1.1, 1, 0.85],
        y: [0, 0, 0.5, 3, 5.5],
        opacity: [0, 1, 1, 1, 0],
        transition: { duration: 1.2, delay: 0.3, ease: 'easeOut', times: [0, 0.2, 0.45, 0.85, 1] },
      },
    };
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <motion.g variants={body} style={{ transformOrigin: '12px 12px' }}>
          {/* Tube + tip — Lucide "pipette" tip paths */}
          <path d="m2 22 1-1h3l9-9" />
          <path d="M3 21v-3l9-9" />
          {/* Squeeze bulb at top-right — Lucide "pipette" bulb path */}
          <motion.path
            d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"
            variants={bulb}
            style={{ transformOrigin: '17px 7px' }}
          />
        </motion.g>
        {/* Color drop forming at the tip */}
        <motion.circle
          cx="2.2"
          cy="22.2"
          r="1.4"
          fill="currentColor"
          stroke="none"
          variants={drop}
          style={{ transformOrigin: '2.2px 22.2px' }}
        />
      </IconShell>
    );
  },
);
PaletteOrganicIconV2.displayName = 'PaletteOrganicIconV2';

/* V2 · 3) Aa — serif A + sans a (typography) */
export const TypeOrganicIconV2 = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const big: Variants = {
      normal: { opacity: 1, y: 0, scale: 1 },
      animate: { opacity: [0, 1], y: [3, 0], scale: [0.85, 1], transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    };
    const small: Variants = {
      normal: { opacity: 1, y: 0, scale: 1 },
      animate: { opacity: [0, 1], y: [4, 0], scale: [0.75, 1], transition: { duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] } },
    };
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <motion.text
          x="3"
          y="19"
          fontSize="16"
          fontFamily="Instrument Serif, Playfair Display, serif"
          fontWeight="400"
          fill="currentColor"
          stroke="none"
          variants={big}
          style={{ transformOrigin: '8px 14px' }}
        >
          A
        </motion.text>
        <motion.text
          x="13.5"
          y="20"
          fontSize="13"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="500"
          fill="currentColor"
          stroke="none"
          variants={small}
          style={{ transformOrigin: '17px 15px' }}
        >
          a
        </motion.text>
      </IconShell>
    );
  },
);
TypeOrganicIconV2.displayName = 'TypeOrganicIconV2';

/* V2 · 4) BROWSER — mini window with pulsing dots + url bar (website) */
export const LinkOrganicIconV2 = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const frame: Variants = {
      normal: { pathLength: 1, opacity: 1 },
      animate: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.5 } },
    };
    const dot = (delay: number): Variants => ({
      normal: { scale: 1, opacity: 1 },
      animate: { scale: [0, 1.3, 1], opacity: [0, 1], transition: { duration: 0.5, delay } },
    });
    const urlBar: Variants = {
      normal: { scaleX: 1, opacity: 1 },
      animate: { scaleX: [0, 1], opacity: [0, 1], transition: { duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] } },
    };
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        <motion.rect x="2.5" y="5" width="19" height="14" rx="2" variants={frame} />
        <motion.path d="M2.5 9.5 L21.5 9.5" variants={frame} />
        <motion.circle cx="5.5" cy="7.3" r="0.7" fill="currentColor" stroke="none" variants={dot(0.1)} style={{ transformOrigin: '5.5px 7.3px' }} />
        <motion.circle cx="8" cy="7.3" r="0.7" fill="currentColor" stroke="none" variants={dot(0.18)} style={{ transformOrigin: '8px 7.3px' }} />
        <motion.circle cx="10.5" cy="7.3" r="0.7" fill="currentColor" stroke="none" variants={dot(0.26)} style={{ transformOrigin: '10.5px 7.3px' }} />
        <motion.rect x="5" y="12.5" width="14" height="1.6" rx="0.8" fill="currentColor" stroke="none" variants={urlBar} style={{ transformOrigin: '5px 13.3px' }} />
        <motion.rect x="5" y="15.5" width="8" height="1.2" rx="0.6" fill="currentColor" stroke="none" variants={urlBar} style={{ transformOrigin: '5px 16.1px' }} />
      </IconShell>
    );
  },
);
LinkOrganicIconV2.displayName = 'LinkOrganicIconV2';

/* V2 · 5) PHOTO FAN — two clean cards fanning + a lifted top card
   Top card glides up while the back card tilts outward. */
export const PhotoOrganicIconV2 = forwardRef<OrganicIconHandle, OrganicIconProps>(
  ({ onMouseEnter, onMouseLeave, size, ...rest }, ref) => {
    const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
      ref,
      onMouseEnter,
      onMouseLeave,
    );
    const back: Variants = {
      normal: { rotate: -8, x: 0 },
      animate: { rotate: [-8, -18, -14], x: [0, -1, 0], transition: { duration: 0.7, ease: [0.3, 1.3, 0.4, 1] } },
    };
    const front: Variants = {
      normal: { rotate: 6, y: 0, x: 0 },
      animate: { rotate: [6, 14, 10], y: [0, -1.5, 0], x: [0, 1, 0], transition: { duration: 0.7, delay: 0.1, ease: [0.3, 1.3, 0.4, 1] } },
    };
    const sun: Variants = {
      normal: { cy: 9, scale: 1 },
      animate: { cy: [10.5, 8, 9], scale: [0.7, 1.1, 1], transition: { duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] } },
    };
    const hill: Variants = {
      normal: { pathLength: 1, opacity: 1 },
      animate: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.55, delay: 0.25 } },
    };
    return (
      <IconShell size={size} controls={controls} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} restProps={rest}>
        {/* Back card — tilted left */}
        <motion.g variants={back} style={{ transformOrigin: '12px 20px' }}>
          <rect x="4" y="5" width="12" height="14" rx="1.8" fill="white" />
          <rect x="4" y="5" width="12" height="14" rx="1.8" />
        </motion.g>
        {/* Front card — tilted right, scene inside */}
        <motion.g variants={front} style={{ transformOrigin: '12px 20px' }}>
          <rect x="8" y="4.5" width="12" height="14" rx="1.8" fill="white" />
          <rect x="8" y="4.5" width="12" height="14" rx="1.8" />
          <motion.circle cx="11.5" cy="9" r="1.4" fill="currentColor" stroke="none" variants={sun} style={{ transformOrigin: '11.5px 9px' }} />
          <motion.path d="M8.5 15 L11.5 12 L14 13.5 L16.5 11.5 L19.5 14" variants={hill} />
        </motion.g>
      </IconShell>
    );
  },
);
PhotoOrganicIconV2.displayName = 'PhotoOrganicIconV2';
