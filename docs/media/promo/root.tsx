import { Composition } from 'remotion';
import { AppIcon } from './app-icon';
import { PocketDesktopPromo } from './video';

export const PromoRoot = () => (
  <>
    <Composition
      id="PocketDesktop30"
      component={PocketDesktopPromo}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="PocketDesktop30En"
      component={PocketDesktopPromo}
      defaultProps={{ language: 'en' }}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="PocketDesktopIcon"
      component={AppIcon}
      durationInFrames={1}
      fps={30}
      width={1024}
      height={1024}
    />
  </>
);
