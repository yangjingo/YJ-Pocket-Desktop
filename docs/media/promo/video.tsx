import type { Caption } from '@remotion/captions';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import captionsJson from './captions.json';
import captionsEnJson from './captions-en.json';
import { MetalLogo } from './metal-logo';

type PromoLanguage = 'zh' | 'en';
const captions = { zh: captionsJson as Caption[], en: captionsEnJson as Caption[] };
const silver = '#272828';
const amber = '#d39a42';
const ink = '#aeb0ae';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const Background = ({ glow = '#f2f2ef' }: { glow?: string }) => (
  <AbsoluteFill style={{
    background: `radial-gradient(ellipse 60% 56% at 75% 23%, ${glow}a0, transparent 75%), linear-gradient(145deg,#c5c6c4 0%,#aaaba9 53%,#818381 100%)`,
  }}>
    <AbsoluteFill style={{ opacity: 0.2, backgroundImage: 'repeating-linear-gradient(0deg,#ffffff38 0 1px,transparent 1px 4px)' }} />
    <div style={{ position: 'absolute', top: 38, left: 52, right: 52, height: 11, borderRadius: 8, background: 'linear-gradient(#f8f8f4,#bfc1be 36%,#878987 100%)', border: '1px solid #f7f7f2', boxShadow: '0 3px 5px #3335,inset 0 1px #fff' }} />
    <div style={{ position: 'absolute', left: 61, top: 56, bottom: 60, width: 2, background: 'linear-gradient(#f2f2ef,#797b78)' }} />
    <div style={{ position: 'absolute', left: 75, bottom: 48, right: 75, height: 1, background: 'linear-gradient(90deg,#f3f3ef,#686a68,#f3f3ef)' }} />
  </AbsoluteFill>
);

const Corner = ({ section }: { section: string }) => (
  <div style={{ position: 'absolute', top: 72, right: 90, padding: '16px 21px 13px', color: '#303130', fontFamily: 'Consolas, monospace', fontSize: 17, fontWeight: 700, letterSpacing: 2.5, textAlign: 'right', borderRadius: 8, border: '1px solid #f7f7f3', borderBottomColor: '#7d7f7c', background: 'linear-gradient(#f1f1ed,#b9bbb7)', boxShadow: 'inset 0 1px #fff,0 4px 8px #31333250' }}>
    <span style={{ color: amber }}>●</span> YJ / POCKET DESKTOP<br />
    <span style={{ fontSize: 12, letterSpacing: 3.5, color: '#696c68' }}>{section}</span>
  </div>
);

const Intro = ({ language }: { language: PromoLanguage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 38 });
  const line = interpolate(frame, [8, 55], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return <AbsoluteFill style={{ color: silver, fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif' }}>
    <Background glow="#f5f5f1" />
    <Corner section="CREATIVE TERMINAL / 01" />
    <div style={{ position: 'absolute', left: 110, top: 232, width: 1000, height: 500, padding: 12, borderRadius: 20, border: '2px solid #f8f8f4', borderBottomColor: '#777976', background: 'linear-gradient(145deg,#efefeb,#aeb0ac 65%,#777977)', boxShadow: 'inset 0 2px #fff,0 24px 33px #2c2d2b60' }}>
      <div style={{ height: '100%', padding: '60px 65px', borderRadius: 9, border: '2px solid #646665', background: 'radial-gradient(ellipse at 25% 15%,#313534,#181a19 75%)', boxShadow: 'inset 0 8px 18px #050606b8,0 1px #fff9', color: '#f1f2ed', opacity: reveal, transform: `translateY(${(1 - reveal) * 16}px)` }}>
        <div style={{ fontFamily: 'Consolas, monospace', fontSize: 20, color: '#c0c5c0', letterSpacing: 7, marginBottom: 34 }}>YJ / OBJECT ARCHIVE VOL. 01</div>
        <div style={{ fontSize: language === 'en' ? 78 : 98, fontWeight: 700, letterSpacing: language === 'en' ? -3 : -7, lineHeight: 1.19 }}>{language === 'en' ? <>YOUR MEDIA.<br />IN ITS PLACE.</> : <>素材，<br />自有归处。</>}</div>
        <div style={{ marginTop: 33, color: '#c7cdca', fontSize: 27, letterSpacing: language === 'en' ? 0 : 2 }}>{language === 'en' ? 'A creative desktop for your pocket drive.' : '把你的创意桌面，装进口袋硬盘。'}</div>
      </div>
    </div>
    <div style={{ position: 'absolute', right: 130, top: 170, width: 620, height: 620, opacity: reveal }}>
      <MetalLogo size={620} />
    </div>
    <div style={{ position: 'absolute', left: 116, right: 116, top: 793, height: 47, padding: '0 21px', display: 'flex', alignItems: 'center', gap: 15, border: '1px solid #f4f4f0', borderBottomColor: '#6f716e', borderRadius: 8, background: 'linear-gradient(#e9eae6,#b2b4b0)', boxShadow: 'inset 0 1px #fff,0 5px 8px #2224', fontFamily: 'Consolas, monospace', fontSize: 17, fontWeight: 700, letterSpacing: 4 }}>
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: amber, boxShadow: '0 0 0 3px #7d7f7c,0 1px #fff' }} />
      LOCAL / PORTABLE / YOURS
      <div style={{ marginLeft: 'auto', width: 515, height: 2, transformOrigin: 'left', transform: `scaleX(${line})`, background: 'linear-gradient(90deg,#575957,#f3f3ef)' }} />
    </div>
  </AbsoluteFill>;
};

type ScreenSceneProps = { image: string; number: string; eyebrow: string; heading: string; detail: string; accent?: string; focus?: boolean };
const ScreenScene = ({ image, number, eyebrow, heading, detail, accent = '#eeeeea', focus = false }: ScreenSceneProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 34 });
  const drift = interpolate(frame, [0, 150], [22, -12], clamp);
  const focusOpacity = focus ? interpolate(frame, [17, 35, 88, 108], [0, 1, 1, 0], clamp) : 0;
  return <AbsoluteFill style={{ color: silver, fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif' }}>
    <Background glow={accent} />
    <Corner section={`PRODUCT VIEW / ${number}`} />
    <div style={{ position: 'absolute', left: 88, top: 171, width: 530, minHeight: 558, padding: '40px 40px 42px', zIndex: 3, opacity: reveal, transform: `translateY(${(1 - reveal) * 27}px)`, borderRadius: 18, border: '2px solid #f5f5f1', borderBottomColor: '#737572', background: 'linear-gradient(140deg,#eeefea,#c2c4c0 57%,#a2a4a1)', boxShadow: 'inset 0 2px #fff,0 18px 29px #3335' }}>
      <div style={{ height: 7, margin: '-23px -22px 38px', borderRadius: 5, background: 'linear-gradient(#fff,#979a96)', boxShadow: '0 1px #5556' }} />
      <div style={{ color: '#565956', fontFamily: 'Consolas, monospace', letterSpacing: 5, fontSize: 20, fontWeight: 700 }}>{number} / {eyebrow}</div>
      <h1 style={{ margin: '31px 0 27px', fontSize: 71, lineHeight: 1.25, letterSpacing: -5, whiteSpace: 'pre-line', color: '#232625', textShadow: '0 1px #fff' }}>{heading}</h1>
      <div style={{ width: 76, height: 5, borderRadius: 3, background: 'linear-gradient(#fafaf6,#8c8e8b)', boxShadow: '0 2px 2px #5556', marginBottom: 27 }} />
      <div style={{ color: '#4b504d', fontSize: 25, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{detail}</div>
      <div style={{ position: 'absolute', bottom: 19, right: 22, width: 11, height: 11, borderRadius: '50%', background: amber, boxShadow: '0 0 0 3px #818380,0 1px #fff' }} />
    </div>
    <div style={{ position: 'absolute', left: 610 + drift, top: 171, width: 1200, height: 750, padding: 9, zIndex: 2, opacity: reveal, transform: `perspective(1700px) rotateY(${-4 + reveal * 3}deg) rotateX(1deg) scale(${0.975 + reveal * 0.025})`, transformOrigin: '45% 50%', borderRadius: 23, overflow: 'hidden', border: '2px solid #f6f6f2', borderBottomColor: '#6e706e', background: 'linear-gradient(135deg,#f8f8f4,#b6b8b4)', boxShadow: 'inset 0 1px #fff,0 36px 56px #2526256b' }}>
      <Img src={staticFile(`screens/${image}`)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, border: '1px solid #676967', boxShadow: 'inset 0 2px 5px #1118' }} />
      {focus && <div style={{ position: 'absolute', left: '33.8%', top: '35.2%', width: '15.5%', height: '4.1%', opacity: focusOpacity, border: `3px solid ${amber}`, borderRadius: 9, boxShadow: `0 0 28px ${amber}99` }} />}
    </div>
    <div style={{ position: 'absolute', left: 105, bottom: 146, fontFamily: 'Consolas, monospace', fontSize: 17, letterSpacing: 3, fontWeight: 700, color: '#454844' }}>REAL UI · SYNTHETIC DEMO MEDIA</div>
  </AbsoluteFill>;
};

const Outro = ({ language }: { language: PromoLanguage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 38 });
  return <AbsoluteFill style={{ color: silver, fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif' }}>
    <Background glow="#f5f5f1" />
    <Corner section="THE SIGNATURE / 06" />
    <div style={{ position: 'absolute', left: 170, top: 182, width: 630, height: 630, opacity: reveal }}>
      <MetalLogo size={630} />
    </div>
    <div style={{ position: 'absolute', left: 815, top: 310, width: 940, height: 402, padding: 12, opacity: reveal, transform: `translateY(${(1 - reveal) * 26}px)`, borderRadius: 17, border: '2px solid #f8f8f3', borderBottomColor: '#747674', background: 'linear-gradient(145deg,#ededeb,#b6b8b4 70%,#828481)', boxShadow: 'inset 0 2px #fff,0 24px 35px #2226' }}>
      <div style={{ height: '100%', padding: '66px 52px', borderRadius: 7, background: 'radial-gradient(ellipse at 25% 20%,#333635,#171a19 75%)', border: '2px solid #616361', boxShadow: 'inset 0 7px 16px #070808ad', color: '#f1f2ed' }}>
        <div style={{ fontFamily: 'Consolas, monospace', color: '#aeb5af', fontSize: 17, letterSpacing: 5, marginBottom: 30 }}>YJ / CREATIVE TERMINAL</div>
        <div style={{ fontFamily: 'Consolas, monospace', fontSize: 59, fontWeight: 700, letterSpacing: -3, whiteSpace: 'nowrap' }}>YJ-Pocket-Desktop</div>
        <div style={{ color: '#c8cfca', fontSize: 31, marginTop: 30, letterSpacing: language === 'en' ? 2 : 7 }}>{language === 'en' ? 'LOCAL MEDIA · READY TO ROAM' : '本地素材 · 自由随行'}</div>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 143, right: 143, bottom: 160, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f3f3ef', borderBottomColor: '#747674', borderRadius: 8, background: 'linear-gradient(#e9eae6,#adafac)', boxShadow: 'inset 0 1px #fff,0 4px 8px #2224', fontFamily: 'Consolas, monospace', fontSize: 16, fontWeight: 700, letterSpacing: 5, color: '#454844' }}>LOCAL-FIRST / PORTABLE / MIT LICENSE</div>
  </AbsoluteFill>;
};

const CaptionTrack = ({ language }: { language: PromoLanguage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = frame / fps * 1000;
  const caption = captions[language].find(item => ms >= item.startMs && ms < item.endMs);
  if (!caption) return null;
  const opacity = interpolate(ms, [caption.startMs, caption.startMs + 280, caption.endMs - 280, caption.endMs], [0, 1, 1, 0], clamp);
  return <div style={{ position: 'absolute', zIndex: 20, bottom: 35, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', opacity }}>
    <div style={{ padding: '12px 29px', borderRadius: 8, background: 'linear-gradient(#f2f2ee,#c0c2be)', border: '1px solid #f8f8f4', borderBottomColor: '#777976', color: '#292b29', fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif', fontSize: 25, fontWeight: 700, letterSpacing: 1, boxShadow: 'inset 0 1px #fff,0 6px 13px #2225' }}>{caption.text}</div>
  </div>;
};

const sceneCopy = {
  zh: [
    { heading: '一打开，\n就是工作台。', detail: '银色桌面与媒体物件，\n让每一次打开都有仪式感。' },
    { heading: '不同素材，\n各有其位。', detail: '照片、视频、音乐与文件夹，\n从同一个入口开始浏览。' },
    { heading: '所想，\n很快就在眼前。', detail: '输入文件名，快速筛选\n当前文件夹中的素材。' },
    { heading: '灵感，\n值得看清。', detail: '无需离开桌面，\n轻点即刻预览。' },
    { heading: '听见，\n创作的节奏。', detail: '本地音频，\n在唱片机中轻轻转动。' },
  ],
  en: [
    { heading: 'Open to\nyour workspace.', detail: 'A silver media desk,\nready when you are.' },
    { heading: 'One desk.\nMany collections.', detail: 'Photos, videos, music and folders,\nall within reach.' },
    { heading: 'Find it\nby name.', detail: 'Filter files by name\nin the current folder.' },
    { heading: 'See the\ndetails.', detail: 'Preview images without\nleaving your desktop.' },
    { heading: 'Hear the\nmoment.', detail: 'Play local audio\non the turntable.' },
  ],
} as const;

export const PocketDesktopPromo = ({ language = 'zh' }: { language?: PromoLanguage }) => <AbsoluteFill style={{ backgroundColor: ink }}>
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={120}><Intro language={language} /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
    <TransitionSeries.Sequence durationInFrames={150}><ScreenScene image={`${language === 'en' ? 'en/' : ''}01-desk.webp`} number="01" eyebrow="THE DESK" {...sceneCopy[language][0]} accent="#eeefec" /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={linearTiming({ durationInFrames: 15 })} />
    <TransitionSeries.Sequence durationInFrames={150}><ScreenScene image={`${language === 'en' ? 'en/' : ''}02-gallery.webp`} number="02" eyebrow="THE COLLECTION" {...sceneCopy[language][1]} accent="#e3e5e1" /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
    <TransitionSeries.Sequence durationInFrames={150}><ScreenScene image={`${language === 'en' ? 'en/' : ''}03-search.webp`} number="03" eyebrow="FOCUS FAST" {...sceneCopy[language][2]} accent="#e5e7e3" focus /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={linearTiming({ durationInFrames: 15 })} />
    <TransitionSeries.Sequence durationInFrames={150}><ScreenScene image={`${language === 'en' ? 'en/' : ''}04-preview.webp`} number="04" eyebrow="QUICK LOOK" {...sceneCopy[language][3]} accent="#dee1dd" /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
    <TransitionSeries.Sequence durationInFrames={120}><ScreenScene image={`${language === 'en' ? 'en/' : ''}05-audio.webp`} number="05" eyebrow="SOUND ON" {...sceneCopy[language][4]} accent="#e4e3df" /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
    <TransitionSeries.Sequence durationInFrames={150}><Outro language={language} /></TransitionSeries.Sequence>
  </TransitionSeries>
  <CaptionTrack language={language} />
  <Audio src={staticFile('audio/glass-signal.wav')} volume={0.76} />
</AbsoluteFill>;
