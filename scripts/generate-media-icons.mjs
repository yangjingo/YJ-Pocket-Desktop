import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'app', 'assets', 'media-archive');

const definitions = `
  <defs>
    <linearGradient id="rear" x1=".08" y1="0" x2=".86" y2="1">
      <stop stop-color="#e9edef"/><stop offset=".32" stop-color="#aeb8bb"/>
      <stop offset=".63" stop-color="#707b80"/><stop offset="1" stop-color="#d0d7d8"/>
    </linearGradient>
    <linearGradient id="face" x1=".02" y1="0" x2=".98" y2="1">
      <stop stop-color="#f2f4f4"/><stop offset=".19" stop-color="#cdd3d3"/>
      <stop offset=".52" stop-color="#abb4b5"/><stop offset=".78" stop-color="#8f999c"/>
      <stop offset="1" stop-color="#737e81"/>
    </linearGradient>
    <linearGradient id="side" x1="0" y1="0" x2="1" y2="0">
      <stop stop-color="#535d61"/><stop offset=".32" stop-color="#b7c1c1"/>
      <stop offset=".71" stop-color="#697477"/><stop offset="1" stop-color="#343d41"/>
    </linearGradient>
    <linearGradient id="slot" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#0d1214"/><stop offset=".45" stop-color="#222a2d"/>
      <stop offset="1" stop-color="#111618"/>
    </linearGradient>
    <linearGradient id="polished" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#fff"/><stop offset=".36" stop-color="#aab4b6"/>
      <stop offset=".64" stop-color="#4b555a"/><stop offset="1" stop-color="#e1e7e7"/>
    </linearGradient>
    <radialGradient id="lamp">
      <stop stop-color="#fff6b1"/><stop offset=".38" stop-color="#ffbb24"/>
      <stop offset=".78" stop-color="#c86f00"/><stop offset="1" stop-color="#5c390c"/>
    </radialGradient>
    <radialGradient id="vinyl">
      <stop stop-color="#0c1011"/><stop offset=".17" stop-color="#2b3437"/>
      <stop offset=".43" stop-color="#0d1316"/><stop offset=".7" stop-color="#273034"/>
      <stop offset="1" stop-color="#070a0c"/>
    </radialGradient>
    <pattern id="brushed" width="7" height="3" patternUnits="userSpaceOnUse">
      <path d="M0 .5h7" stroke="#fff" stroke-opacity=".2" stroke-width=".45"/>
      <path d="M0 2.4h7" stroke="#2d383c" stroke-opacity=".13" stroke-width=".4"/>
    </pattern>
    <clipPath id="face-cut">
      <path d="M31 78h179q14 0 16 14v106q0 15-15 15H35q-13 0-13-14V92q0-13 9-14Z"/>
    </clipPath>
    <filter id="floor-shadow" x="-30%" y="-200%" width="160%" height="500%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
    <g id="screw">
      <circle r="5.7" fill="#485156" stroke="#f5f7f6" stroke-width="1.15"/>
      <circle r="3.9" fill="#7e898c" stroke="#303a3e" stroke-width=".9"/>
      <path d="M-2.8-.1 -.5-2.7 2.8-.5 .5 2.8Z" fill="#242c2f" stroke="#c9d1d1" stroke-width=".5"/>
    </g>
  </defs>`;

const shell = `
  <ellipse cx="130" cy="219" rx="97" ry="6" fill="#000" opacity=".62" filter="url(#floor-shadow)"/>
  <path d="M39 84V46q0-15 15-15h55q9 0 13 8l11 17h82q17 0 19 17v122q0 12-13 14H45q-10 0-10-12Z"
    fill="url(#rear)" stroke="#e4e9e9" stroke-width="1.7"/>
  <path d="M48 36h62q6 0 9 6l11 18 86 1q11 0 13 10" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.4"/>
  <path d="M225 80q8 2 11 8v108q-1 10-12 13l-4-8V90Z" fill="url(#side)" stroke="#303a3d" stroke-width="1"/>
  <path d="M231 93v96" fill="none" stroke="#e5eaea" stroke-opacity=".8" stroke-width="1.2"/>
  <path d="M232 101v82" fill="none" stroke="#313a3e" stroke-width="1.8"/>
  <path d="M31 78h179q14 0 16 14v106q0 15-15 15H35q-13 0-13-14V92q0-13 9-14Z"
    fill="url(#face)" stroke="#eff2f1" stroke-width="1.7"/>
  <rect x="22" y="78" width="204" height="135" fill="url(#brushed)" clip-path="url(#face-cut)"/>
  <path d="M29 84q4-3 10-3h169q12 0 14 12v103q0 12-12 13H35q-9 0-10-11V93q0-6 4-9Z"
    fill="none" stroke="#526064" stroke-opacity=".48" stroke-width="1.2"/>
  <path d="M28 88q3-4 10-4h168" fill="none" stroke="#fff" stroke-opacity=".72" stroke-width="1.2"/>
  <path d="M27 201q3 8 11 8h168q13 0 16-11" fill="none" stroke="#f4f6f5" stroke-opacity=".42" stroke-width="1"/>
  <path d="M43 75h164" fill="none" stroke="#2e383c" stroke-opacity=".35" stroke-width="1"/>
  <path d="M39 207h165" fill="none" stroke="#555f62" stroke-opacity=".48" stroke-width="1"/>
  <rect x="58" y="105" width="139" height="34" rx="5" fill="#738084" stroke="#eff3f2" stroke-width="1.4"/>
  <rect x="61" y="108" width="133" height="28" rx="3.5" fill="url(#slot)" stroke="#3f494d" stroke-width="1"/>
  <path d="M64 109h128" stroke="#414b4d" stroke-width=".7"/>
  <circle cx="207" cy="119" r="5.9" fill="#454e4f" stroke="#eef1ef" stroke-width="1.2"/>
  <circle cx="207" cy="119" r="3.9" fill="url(#lamp)"/>
  <use href="#screw" x="35" y="93"/><use href="#screw" x="211" y="93"/>
  <use href="#screw" x="35" y="197"/><use href="#screw" x="211" y="197"/>
  <circle cx="231" cy="103" r="3" fill="#485255" stroke="#c9d2d2" stroke-width=".9"/>
  <circle cx="231" cy="190" r="3" fill="#485255" stroke="#c9d2d2" stroke-width=".9"/>`;

const details = {
  folder: `<rect x="64" y="158" width="123" height="29" rx="4" fill="#859093" stroke="#e7eded" stroke-width="1.2"/>
    <rect x="67" y="161" width="117" height="23" rx="2" fill="url(#slot)" stroke="#4c5659" stroke-width=".8"/>
    <path d="M72 165h106" stroke="#4a5457" stroke-width=".8"/>`,
  photos: `<rect x="76" y="149" width="103" height="49" rx="4" fill="#657073" stroke="#e8eded" stroke-width="1.1"/>
    <g transform="rotate(7 145 173)"><rect x="104" y="151" width="68" height="44" fill="#e8eaea" stroke="#4c5558" stroke-width="1"/>
      <rect x="108" y="155" width="60" height="34" fill="#555f62"/><path d="M108 189l23-25 10 9 11-12 16 28Z" fill="#1e272a"/></g>
    <rect x="82" y="153" width="75" height="43" rx="1" fill="#ebeeee" stroke="#3b4548" stroke-width="1.1"/>
    <rect x="87" y="157" width="65" height="32" fill="#687175"/>
    <circle cx="133" cy="166" r="5" fill="#e2e6e5"/>
    <path d="M87 189l19-15 11 6 11-13 24 22Z" fill="#182125"/>
    <path d="M88 190h63" stroke="#e6eae9" stroke-width=".8"/>`,
  videos: `<rect x="72" y="150" width="107" height="48" rx="5" fill="#667174" stroke="#edf0ef" stroke-width="1.2"/>
    <rect x="76" y="154" width="99" height="40" rx="2" fill="url(#slot)" stroke="#465154" stroke-width="1"/>
    <path d="M77 163h97M77 185h97" stroke="#879294" stroke-width="1.8"/>
    <path d="M84 157v4m12-4v4m12-4v4m12-4v4m12-4v4m12-4v4m12-4v4m12-4v4
      M84 188v4m12-4v4m12-4v4m12-4v4m12-4v4m12-4v4m12-4v4m12-4v4"
      stroke="#d9dfde" stroke-width="3"/>
    <path d="M112 166v17l18-8.5Z" fill="url(#polished)" stroke="#f4f6f5" stroke-width=".7"/>`,
  music: `<circle cx="117" cy="174" r="27" fill="#475155" stroke="#f0f2f0" stroke-width="1.5"/>
    <circle cx="117" cy="174" r="23.5" fill="url(#vinyl)" stroke="#20282b" stroke-width="1"/>
    <circle cx="117" cy="174" r="17.5" fill="none" stroke="#899396" stroke-opacity=".58" stroke-width=".8"/>
    <circle cx="117" cy="174" r="12.5" fill="none" stroke="#566166" stroke-width=".9"/>
    <circle cx="117" cy="174" r="7" fill="url(#polished)" stroke="#11181a" stroke-width="1"/>
    <circle cx="117" cy="174" r="2.2" fill="#20282b"/>
    <circle cx="157" cy="151" r="5.4" fill="url(#polished)" stroke="#394347" stroke-width="1"/>
    <path d="M158 155l-8 10-18 12" fill="none" stroke="#343d41" stroke-width="5" stroke-linecap="round"/>
    <path d="M158 154l-8 10-18 12" fill="none" stroke="#dce2e1" stroke-width="2.7" stroke-linecap="round"/>
    <path d="M129 176l6 4-4 5-7-4Z" fill="#aeb8b8" stroke="#2b3539" stroke-width=".8"/>`,
  recordings: `<path d="M71 122h7m3-1v2m5-3v4m5-6v8m5-11v14m5-16v18m5-13v8m5-17v26m5-22v16m5-25v32m5-23v18m5-17v6m5-21v32m5-26v20m5-16v12m5-10v8m5-14v16m5-11v10m5-7v6m5-4h7"
      fill="none" stroke="#e3e7e5" stroke-width="2" stroke-linecap="round"/>
    <path d="M113 149h20q9 0 9 10v18q0 10-9 10h-20q-9 0-9-10v-18q0-10 9-10Z"
      fill="url(#polished)" stroke="#364044" stroke-width="1.7"/>
    <rect x="109" y="154" width="28" height="28" rx="12" fill="url(#slot)" stroke="#dce3e2" stroke-width="1"/>
    <path d="M112 157h22m-23 5h24m-24 5h24m-24 5h24m-23 5h22" stroke="#8b9799" stroke-width="1.2"/>
    <path d="M99 170v11q0 22 24 22t24-22v-11" fill="none" stroke="#414b4d" stroke-width="6" stroke-linecap="round"/>
    <path d="M99 169v11q0 21 24 21t24-21v-11" fill="none" stroke="#dce2e1" stroke-width="3" stroke-linecap="round"/>
    <path d="M123 202v7m-12 1h24" stroke="#333d41" stroke-width="6" stroke-linecap="round"/>
    <path d="M123 202v7m-12 1h24" stroke="#e3e8e7" stroke-width="2.4" stroke-linecap="round"/>`,
  search: `<circle cx="115" cy="165" r="19" fill="url(#slot)" stroke="#333d41" stroke-width="7"/>
    <circle cx="115" cy="165" r="19" fill="none" stroke="url(#polished)" stroke-width="4"/>
    <path d="M129 180l25 24" fill="none" stroke="#30393d" stroke-width="10" stroke-linecap="round"/>
    <path d="M129 180l25 24" fill="none" stroke="url(#polished)" stroke-width="6" stroke-linecap="round"/>
    <path d="M103 155q7-10 19-6" fill="none" stroke="#f2f5f3" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>`,
};

const titles = { folder: '文件夹', photos: '照片素材', videos: '视频素材', music: '音乐素材', recordings: '录音素材', search: '搜索当前文件夹' };
const lampColors = new Set(['#fff6b1', '#ffbb24', '#c86f00', '#5c390c']);

function silverSvg(svg) {
  return svg.replace(/#[0-9a-f]{6}\b/gi, color => {
    if (lampColors.has(color.toLowerCase())) return color;
    const [red, green, blue] = color.slice(1).match(/../g).map(value => Number.parseInt(value, 16));
    const gray = Math.round(red * .2126 + green * .7152 + blue * .0722);
    return `#${gray.toString(16).padStart(2, '0').repeat(3)}`;
  });
}

await mkdir(output, { recursive: true });
for (const [name, detail] of Object.entries(details)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 256 256" role="img" aria-label="${titles[name]}">
  <title>${titles[name]}</title>${definitions}${shell}${detail}
</svg>\n`;
  await writeFile(join(output, `${name}.svg`), silverSvg(svg), 'utf8');
}
