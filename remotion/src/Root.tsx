import { Composition } from 'remotion';
import { BrandingOSReel, DURATION_IN_FRAMES, FPS } from './BrandingOSReel';
import { BrandingOSBurst, BURST_DURATION, BURST_FPS } from './BrandingOSBurst';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BrandingOSReel"
        component={BrandingOSReel}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="BrandingOSBurst"
        component={BrandingOSBurst}
        durationInFrames={BURST_DURATION}
        fps={BURST_FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
