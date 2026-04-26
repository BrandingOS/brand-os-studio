/**
 * Hand-coded SVG illustration set for the uniex pitch deck.
 *
 * These replace the three reference JPGs (`/brands/uniex/designs/{1,2,3}.jpg`)
 * across all variant slides so each variant gets a distinct, on-brand visual
 * instead of three rasters reused 11 times.
 *
 * Style fingerprint matches the originals:
 *   - flat vector, bold filled regions, a few outline accents
 *   - cartoon characters (large head / small body)
 *   - brand palette (navy / green) + accent pops (orange / blue / purple / yellow)
 *   - decorative confetti scatter + slight off-axis tilts
 *
 * All components share the `IllustrationProps` shape (`size`, `className`,
 * `style`, `transparent`). They render at a 1:1 viewBox so consumers can
 * scale via `size` or sit them inside a sized container.
 */

export { StudentClimbingChart } from './StudentClimbingChart';
export { GlobeWithFlags } from './GlobeWithFlags';
export { ConnectedLaptop } from './ConnectedLaptop';
export { CompassChoice } from './CompassChoice';
export { MentorConversation } from './MentorConversation';
export { OpenBookKnowledge } from './OpenBookKnowledge';
export { TrophyCelebration } from './TrophyCelebration';
export { HandshakePartners } from './HandshakePartners';
export { VideoPlayCard } from './VideoPlayCard';
export { GraduationCap } from './GraduationCap';

export { PAL as ILLUSTRATION_PALETTE } from './types';
export type { IllustrationProps } from './types';
