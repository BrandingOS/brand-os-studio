import { Composition } from 'remotion';
import { BrandingOSReel, DURATION_IN_FRAMES, FPS } from './BrandingOSReel';

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
    </>
  );
};
