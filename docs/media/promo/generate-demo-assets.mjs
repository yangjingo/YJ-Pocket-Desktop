import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..', '..', '..');
const mediaRoot = join(projectRoot, 'dist', 'promo-demo-media');
const audioRoot = join(import.meta.dirname, 'public', 'audio');
const width = 1200;
const height = 760;

const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
const smoothstep = value => {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
};

function makeLandscape(seed, palette) {
  const stride = (width * 3 + 3) & ~3;
  const pixels = Buffer.alloc(54 + stride * height);
  pixels.write('BM', 0);
  pixels.writeUInt32LE(pixels.length, 2);
  pixels.writeUInt32LE(54, 10);
  pixels.writeUInt32LE(40, 14);
  pixels.writeInt32LE(width, 18);
  pixels.writeInt32LE(height, 22);
  pixels.writeUInt16LE(1, 26);
  pixels.writeUInt16LE(24, 28);
  pixels.writeUInt32LE(stride * height, 34);

  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const horizon = 0.54 + 0.055 * Math.sin(u * 9 + seed) + 0.035 * Math.sin(u * 23 + seed * 1.7);
      const ridge = 0.69 + 0.042 * Math.sin(u * 14 + seed * 2) + 0.025 * Math.sin(u * 37 + seed);
      const sun = Math.hypot((u - palette.sunX) * 1.28, v - palette.sunY);
      const glow = Math.exp(-sun * sun * 42);
      const grain = (Math.sin(x * 2.34 + y * 3.91 + seed * 7) * Math.sin(x * 0.73 - y * 2.15) + 1) * 2.4;
      let color;
      if (v < horizon) {
        const t = smoothstep(v / horizon);
        color = palette.skyTop.map((channel, index) => channel * (1 - t) + palette.skyLow[index] * t + glow * 62);
      } else if (v < ridge) {
        color = palette.far.map((channel, index) => channel + (v - horizon) * 42 + glow * 8);
      } else {
        const t = smoothstep((v - ridge) / (1 - ridge));
        const shimmer = 12 * Math.sin(v * 230 + seed) * Math.sin(u * 26);
        color = palette.near.map((channel, index) => channel * (1 - t * 0.43) + palette.haze[index] * t * 0.43 + shimmer * (1 - t));
      }
      const contour = v > ridge && Math.sin(v * 150 + 3 * Math.sin(u * 17 + seed)) > 0.965 ? 15 : 0;
      const offset = 54 + (height - 1 - y) * stride + x * 3;
      pixels[offset] = clamp(color[2] + grain + contour);
      pixels[offset + 1] = clamp(color[1] + grain + contour);
      pixels[offset + 2] = clamp(color[0] + grain + contour);
    }
  }
  return pixels;
}

const looks = [
  { name: 'Aurora_01', seed: 1.1, sunX: 0.72, sunY: 0.34, skyTop: [14, 34, 55], skyLow: [52, 121, 133], far: [24, 64, 78], near: [17, 46, 57], haze: [55, 118, 124] },
  { name: 'Aurora_02', seed: 2.7, sunX: 0.27, sunY: 0.28, skyTop: [18, 30, 61], skyLow: [99, 104, 140], far: [49, 60, 98], near: [26, 34, 69], haze: [105, 91, 132] },
  { name: 'Coastline_01', seed: 3.4, sunX: 0.77, sunY: 0.41, skyTop: [45, 73, 87], skyLow: [208, 166, 127], far: [95, 112, 116], near: [38, 77, 83], haze: [187, 158, 125] },
  { name: 'Coastline_02', seed: 4.3, sunX: 0.36, sunY: 0.31, skyTop: [34, 62, 77], skyLow: [133, 179, 169], far: [58, 110, 113], near: [30, 71, 77], haze: [146, 183, 160] },
  { name: 'Afterglow_01', seed: 5.8, sunX: 0.67, sunY: 0.38, skyTop: [44, 34, 61], skyLow: [205, 112, 93], far: [105, 67, 83], near: [49, 42, 66], haze: [192, 115, 101] },
  { name: 'Nocturne_01', seed: 7.3, sunX: 0.2, sunY: 0.28, skyTop: [10, 21, 43], skyLow: [49, 68, 99], far: [26, 43, 69], near: [14, 27, 51], haze: [67, 83, 110] },
];

await mkdir(join(mediaRoot, 'Pictures', 'Field Notes'), { recursive: true });
for (const look of looks) {
  const folder = join(mediaRoot, 'Pictures', 'Field Notes');
  const bmp = join(folder, `${look.name}.bmp`);
  const jpg = join(folder, `${look.name}.jpg`);
  await writeFile(bmp, makeLandscape(look.seed, look));
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', bmp, '-q:v', '3', jpg], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Could not generate ${jpg}`);
  await rm(bmp);
}

const sampleRate = 32000;
const duration = 30;
const samples = sampleRate * duration;
const wav = Buffer.alloc(44 + samples * 4);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(samples * 4, 40);

const notes = [55, 62, 67, 71, 57, 64, 69, 72, 52, 59, 64, 67, 50, 57, 62, 66];
const hz = note => 440 * 2 ** ((note - 69) / 12);
for (let n = 0; n < samples; n++) {
  const t = n / sampleRate;
  const beat = t / 0.6;
  const beatPhase = beat % 1;
  const step = Math.floor(beat * 2) % notes.length;
  const stepPhase = (beat * 2) % 1;
  const base = hz(notes[Math.floor(beat / 4) * 4 % notes.length] - 12);
  const pad = (Math.sin(2 * Math.PI * base * t) + 0.36 * Math.sin(2 * Math.PI * base * 2.01 * t)) * 0.12;
  const arp = Math.sin(2 * Math.PI * hz(notes[step]) * t) * Math.exp(-stepPhase * 7) * 0.11;
  const kick = Math.sin(2 * Math.PI * (53 - beatPhase * 30) * (t % 0.6)) * Math.exp(-beatPhase * 17) * 0.19;
  const hatPhase = (beat * 2 + 0.5) % 1;
  const noise = Math.sin(n * 73.13) * Math.sin(n * 47.91);
  const hat = noise * Math.exp(-hatPhase * 38) * 0.025;
  const fade = Math.min(1, t / 1.2, (duration - t) / 2.2);
  const left = (pad + arp + kick + hat) * fade * 1.6;
  const right = (pad * 0.98 + arp * Math.sin(2 * Math.PI * 0.11 * t) * 0.7 + kick + hat) * fade * 1.6;
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left)) * 32767), 44 + n * 4);
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right)) * 32767), 46 + n * 4);
}
await mkdir(audioRoot, { recursive: true });
await mkdir(join(mediaRoot, 'Music'), { recursive: true });
await mkdir(join(mediaRoot, 'Videos'), { recursive: true });
await mkdir(join(mediaRoot, 'Recordings'), { recursive: true });
await writeFile(join(audioRoot, 'glass-signal.wav'), wav);
await writeFile(join(mediaRoot, 'Music', 'Glass Signal.wav'), wav);
console.log(`Created synthetic demo library at ${mediaRoot}`);
