import { AbsoluteFill, Img, staticFile } from 'remotion';

export const AppIcon = () => (
  <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
    <Img src={staticFile('icon.svg')} style={{ width: 1024, height: 1024 }} />
  </AbsoluteFill>
);
