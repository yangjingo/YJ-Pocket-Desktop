import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, opendir, readdir, realpath, rename, stat, statfs } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createSettings, type SettingsInput } from './settings';
import { createLimit } from '../shared/async-limit';

type Kind = 'folder' | 'image' | 'video' | 'audio' | 'file';
type Entry = { name: string; path: string; kind: Kind; size: number | null; modified: number };
type Job = { status: 'working' | 'error'; message?: string };

const APP_ROOT = resolve(__dirname, '..');
const PROJECT_ROOT = resolve(process.env.YJ_PROJECT_ROOT ?? APP_ROOT);
const CACHE = join(process.env.YJ_STATE_ROOT ?? APP_ROOT, '.yj-cache');
const settings = createSettings(APP_ROOT);
const voiceRoot = () => resolve(process.env.YJ_VOICE_ROOT ?? join(settings.root(), 'Recordings', 'IPhone-Voice'));
const HIDDEN_ROOT = new Set(['app', 'README.md', 'README.zh.md', 'package.json', 'package-lock.json',
  'tsconfig.json', 'electron-builder.yml', 'node_modules', 'src', 'tests', 'dist', 'build', 'scripts', 'docs']);
const IMAGE = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);
const VIDEO = new Set(['.mp4', '.mov', '.m4v', '.webm']);
const AUDIO = new Set(['.mp3', '.m4a', '.wav', '.flac', '.ogg', '.aac']);
const VOICE_TYPES = new Set(['.html', '.js', '.css', '.m4a', '.mp3', '.wav', '.png', '.jpg', '.svg', '.txt']);
const thumbnails = new Map<string, Promise<string>>();
const videos = new Map<string, Job>();
const libraryCache = new Map<Kind, { root: string; expires: number; items: Promise<Entry[]> }>();
let thumbActive = 0;
const thumbWaiting: Array<() => void> = [];

function within(base: string, target: string): boolean {
  const path = relative(base, target);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith('..' + sep));
}

async function safePath(base: string, raw: string): Promise<string> {
  if (isAbsolute(raw) || raw.includes('\0')) throw new Error('无效路径');
  const path = await realpath(resolve(base, raw));
  if (!within(base, path)) throw new Error('路径超出允许范围');
  const parts = relative(base, path).split(sep);
  if (parts.some(part => part.startsWith('.'))) throw new Error('隐藏文件不可访问');
  if (base === PROJECT_ROOT && HIDDEN_ROOT.has(parts[0])) throw new Error('应用文件不可访问');
  return path;
}

function visible(name: string, parent: string): boolean {
  return !name.startsWith('.') && !(parent === PROJECT_ROOT && HIDDEN_ROOT.has(name));
}

function kindOf(path: string, directory: boolean): Kind {
  if (directory) return 'folder';
  const suffix = extname(path).toLowerCase();
  if (IMAGE.has(suffix)) return 'image';
  if (VIDEO.has(suffix)) return 'video';
  if (AUDIO.has(suffix)) return 'audio';
  return 'file';
}

async function entryOf(path: string, directory: boolean, root = settings.root()): Promise<Entry | null> {
  const details = await stat(path);
  if (!directory && details.size === 0) return null;
  return { name: basename(path), path: relative(root, path).split(sep).join('/'),
    kind: kindOf(path, directory), size: directory ? null : details.size,
    modified: Math.floor(details.mtimeMs / 1000) };
}

async function listFolder(folder: string): Promise<Entry[]> {
  if (!(await stat(folder)).isDirectory()) throw new Error('不是文件夹');
  const children = await readdir(folder, { withFileTypes: true });
  const rows = await Promise.all(children.filter(child => visible(child.name, folder) && !child.isSymbolicLink())
    .map(child => entryOf(join(folder, child.name), child.isDirectory())));
  return rows.filter((row): row is Entry => row !== null)
    .sort((a, b) => Number(b.kind === 'folder') - Number(a.kind === 'folder') || a.name.localeCompare(b.name, 'zh-CN'));
}

async function scanMediaFolder(folder: string, kind: Kind, inspect: ReturnType<typeof createLimit>, root: string) {
  const folders: string[] = [], rows: Entry[] = [], files: Array<Promise<Entry | null>> = [];
  async function flush() {
    const batch = await Promise.all(files.splice(0));
    rows.push(...batch.filter((row): row is Entry => row !== null));
  }
  for await (const child of await opendir(folder)) {
    if (!visible(child.name, folder) || child.isSymbolicLink()) continue;
    const path = join(folder, child.name);
    if (child.isDirectory()) folders.push(path);
    else if (kindOf(path, false) === kind) files.push(inspect(() => entryOf(path, false, root)));
    if (files.length >= 256) await flush();
  }
  await flush();
  return { folders, rows };
}

async function scanMediaLibrary(kind: Kind, categoryRoot: string, root: string): Promise<Entry[]> {
  const inspect = createLimit(8), folders = [await exists(categoryRoot) ? categoryRoot : root], rows: Entry[] = [];
  while (folders.length) {
    const batch = folders.splice(0, 4);
    const results = await Promise.all(batch.map(folder => scanMediaFolder(folder, kind, inspect, root)));
    for (const result of results) { folders.push(...result.folders); rows.push(...result.rows); }
  }
  return rows.sort((a, b) => b.modified - a.modified);
}

async function mediaLibrary(kind: Kind, refresh = false): Promise<Entry[]> {
  const category = kind === 'image' ? 'Pictures' : kind === 'video' ? 'Videos' : kind === 'audio' ? 'Music' : null;
  if (!category) throw new Error('不支持的媒体类型');
  const root = settings.root(), cached = libraryCache.get(kind);
  if (!refresh && cached?.root === root && cached.expires > Date.now()) return cached.items;
  const items = scanMediaLibrary(kind, join(root, category), root);
  const entry = { root, expires: Number.POSITIVE_INFINITY, items };
  libraryCache.set(kind, entry);
  void items.then(rows => {
    if (rows.length > 20_000 && libraryCache.get(kind) === entry) libraryCache.delete(kind);
    else entry.expires = Date.now() + 10_000;
  }, () => {
    if (libraryCache.get(kind) === entry) libraryCache.delete(kind);
  });
  return items;
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value));
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length, 'Cache-Control': 'no-store' });
  response.end(body);
}

function mime(path: string): string {
  const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.heic': 'image/heic',
    '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.flac': 'audio/flac',
    '.ogg': 'audio/ogg', '.aac': 'audio/aac', '.txt': 'text/plain; charset=utf-8' };
  return types[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

function byteRange(header: string | undefined, size: number): [number, number] | null {
  if (!header) return [0, size - 1];
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  return start >= 0 && start <= end && start < size ? [start, end] : null;
}

async function sendFile(request: IncomingMessage, response: ServerResponse, path: string): Promise<void> {
  const details = await stat(path);
  if (!details.isFile()) throw new Error('文件不存在');
  const range = byteRange(request.headers.range, details.size);
  if (!range) { response.writeHead(416, { 'Content-Range': `bytes */${details.size}` }); response.end(); return; }
  const [start, end] = range;
  const headers: Record<string, string | number> = { 'Content-Type': mime(path), 'Content-Length': end - start + 1,
    'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=60' };
  if (request.headers.range) headers['Content-Range'] = `bytes ${start}-${end}/${details.size}`;
  response.writeHead(request.headers.range ? 206 : 200, headers);
  if (request.method === 'HEAD') { response.end(); return; }
  createReadStream(path, { start, end }).on('error', () => response.destroy()).pipe(response);
}

function ffmpeg(args: string[], timeoutMs: number): Promise<void> {
  return new Promise((done, fail) => {
    const process = spawn('ffmpeg', args, { windowsHide: true });
    let errorText = '';
    const timer = setTimeout(() => { process.kill(); fail(new Error('媒体转换超时')); }, timeoutMs);
    process.stderr.on('data', chunk => { errorText = (errorText + String(chunk)).slice(-2000); });
    process.on('error', error => { clearTimeout(timer); fail(error); });
    process.on('close', code => { clearTimeout(timer); code === 0 ? done() : fail(new Error(errorText || 'ffmpeg 失败')); });
  });
}

function cacheKey(path: string, details: { size: number; mtimeMs: number }, width: number): string {
  return createHash('sha256').update(`${path}:${details.size}:${details.mtimeMs}:${width}`)
    .digest('hex').slice(0, 24);
}

async function acquireThumb(): Promise<() => void> {
  if (thumbActive >= 2) await new Promise<void>(resolveWait => thumbWaiting.push(resolveWait));
  thumbActive += 1;
  return () => { thumbActive -= 1; thumbWaiting.shift()?.(); };
}

async function thumbnail(path: string, width: number): Promise<string> {
  if (['.jpg', '.jpeg'].includes(extname(path).toLowerCase())) return path;
  const target = join(CACHE, 'thumbs', `${cacheKey(path, await stat(path), width)}.jpg`);
  if (await exists(target)) return target;
  const pending = thumbnails.get(target);
  if (pending) return pending;
  const task = buildThumbnail(path, width, target).finally(() => thumbnails.delete(target));
  thumbnails.set(target, task);
  return task;
}

async function buildThumbnail(path: string, width: number, target: string): Promise<string> {
  const release = await acquireThumb();
  try {
    if (await exists(target)) return target;
    await mkdir(dirname(target), { recursive: true });
    const temporary = target.replace(/\.jpg$/, '.working.jpg');
    const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y'];
    if (kindOf(path, false) === 'video') args.push('-ss', '1');
    args.push('-i', path, '-frames:v', '1');
    if (extname(path).toLowerCase() !== '.heic') args.push('-vf', `scale=${width}:-2:flags=lanczos`);
    args.push('-q:v', '4', temporary);
    await ffmpeg(args, 120_000);
    await rename(temporary, target);
    return target;
  } finally { release(); }
}

async function exists(path: string): Promise<boolean> {
  try { await stat(path); return true; } catch { return false; }
}

async function convertVideo(path: string, target: string): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  const temporary = target.replace(/\.mp4$/, '.working.mp4');
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', path,
    '-map', '0:v:0', '-map', '0:a?', '-vf', 'scale=1280:-2:force_original_aspect_ratio=decrease',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', temporary];
  await ffmpeg(args, 7_200_000);
  await rename(temporary, target);
}

async function prepareVideo(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let body = '';
  for await (const chunk of request) {
    body += String(chunk);
    if (body.length > 4096) throw new Error('请求过大');
  }
  const raw = JSON.parse(body) as { path?: string };
  const path = await safePath(settings.root(), raw.path ?? '');
  if (kindOf(path, false) !== 'video') throw new Error('只能转换视频');
  const id = cacheKey(path, await stat(path), 1280);
  const target = join(CACHE, 'converted', `${id}.mp4`);
  if (!(await exists(target)) && !videos.has(id)) {
    videos.set(id, { status: 'working' });
    void convertVideo(path, target).catch(error => videos.set(id, { status: 'error', message: String(error) }));
  }
  sendJson(response, 200, { id, status: await exists(target) ? 'ready' : 'working' });
}

async function saveSettings(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const origin = request.headers.origin;
  if (origin && origin !== `http://${request.headers.host}`) throw new Error('来源不允许修改设置');
  if (!request.headers['content-type']?.startsWith('application/json')) throw new Error('请发送 JSON 设置');
  let body = '';
  for await (const chunk of request) {
    body += String(chunk);
    if (body.length > 8192) throw new Error('设置请求过大');
  }
  const input = JSON.parse(body) as SettingsInput;
  sendJson(response, 200, await settings.save(input));
}

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const path = url.pathname;
  if (path === '/api/health' && request.method === 'GET') {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(`yj-pocket-desktop\n${APP_ROOT}`);
    return;
  }
  if (path === '/api/settings' && request.method === 'GET') return sendJson(response, 200, await settings.read());
  if (path === '/api/settings' && request.method === 'POST') return saveSettings(request, response);
  if (path === '/api/storage' && request.method === 'GET') {
    const disk = await statfs(settings.root());
    return sendJson(response, 200, { path: settings.root(), total: disk.blocks * disk.bsize,
      available: disk.bavail * disk.bsize });
  }
  if (request.method === 'POST' && path === '/api/prepare') return prepareVideo(request, response);
  if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
  if (path === '/api/list') {
    const folder = await safePath(settings.root(), url.searchParams.get('path') ?? '');
    return sendJson(response, 200, { path: relative(settings.root(), folder).split(sep).join('/'),
      items: await listFolder(folder), voice_available: await exists(voiceRoot()), voice_path: voiceRoot() });
  }
  if (path === '/api/library') {
    const kind = url.searchParams.get('kind') as Kind;
    return sendJson(response, 200, { path: '', library: kind,
      items: await mediaLibrary(kind, url.searchParams.get('refresh') === '1'), voice_available: await exists(voiceRoot()), voice_path: voiceRoot() });
  }
  return routeFile(request, response, url);
}

async function routeFile(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
  const path = url.pathname;
  if (path === '/api/job') {
    const id = url.searchParams.get('id') ?? '';
    if (!/^[a-f0-9]{24}$/.test(id)) throw new Error('无效任务编号');
    const target = join(CACHE, 'converted', `${id}.mp4`);
    return sendJson(response, 200, await exists(target)
      ? { status: 'ready', url: `/converted/${id}.mp4` } : videos.get(id) ?? { status: 'missing' });
  }
  if (path === '/thumb') {
    const source = await safePath(settings.root(), url.searchParams.get('path') ?? '');
    if (!['image', 'video'].includes(kindOf(source, false))) throw new Error('无缩略图');
    const width = Math.min(1800, Math.max(120, Number(url.searchParams.get('w') ?? 360)));
    return sendFile(request, response, await thumbnail(source, width));
  }
  if (path.startsWith('/media/')) return sendFile(request, response, await safePath(settings.root(), decodeURIComponent(path.slice(7))));
  if (path.startsWith('/converted/')) return sendFile(request, response,
    await safePath(join(CACHE, 'converted'), decodeURIComponent(path.slice(11))));
  if (path.startsWith('/voice/')) {
    const source = await safePath(voiceRoot(), decodeURIComponent(path.slice(7)) || 'index.html');
    if (!VOICE_TYPES.has(extname(source).toLowerCase())) throw new Error('不允许访问该文件');
    return sendFile(request, response, source);
  }
  const staticFiles: Record<string, string> = { '/': 'app/index.html', '/index.html': 'app/index.html',
    '/desktop.css': 'app/styles/desktop.css', '/skeuomorphic.css': 'app/styles/skeuomorphic.css',
    '/silver-system.css': 'app/styles/silver-system.css', '/dist/web/app.js': 'dist/web/app.js',
    '/assets/media-archive/folder.svg': 'app/assets/media-archive/folder.svg',
    '/assets/media-archive/recordings.svg': 'app/assets/media-archive/recordings.svg',
    '/assets/media-archive/photos.svg': 'app/assets/media-archive/photos.svg',
    '/assets/media-archive/videos.svg': 'app/assets/media-archive/videos.svg',
    '/assets/media-archive/music.svg': 'app/assets/media-archive/music.svg',
    '/assets/media-archive/search.svg': 'app/assets/media-archive/search.svg' };
  if (staticFiles[path]) return sendFile(request, response, join(APP_ROOT, staticFiles[path]));
  if (/^\/dist\/web\/chunks\/[a-zA-Z0-9_-]+\.js$/.test(path))
    return sendFile(request, response, join(APP_ROOT, path.slice(1)));
  response.writeHead(404); response.end();
}

const server = createServer((request, response) => {
  void route(request, response).catch(error => {
    if (response.headersSent) { response.destroy(); return; }
    const message = error instanceof Error ? error.message : String(error);
    sendJson(response, message.includes('ENOENT') ? 404 : 400, { error: message });
  });
});
export function startDesktopServer(port = 8765): Promise<number> {
  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', fail);
      const address = server.address();
      if (!address || typeof address === 'string') return fail(new Error('服务端口不可用'));
      console.log(`YJ-Pocket-Desktop: http://127.0.0.1:${address.port}`);
      done(address.port);
    });
  });
}

if (process.env.YJ_EMBEDDED !== '1') {
  void startDesktopServer().catch(error => { console.error(error); process.exitCode = 1; });
}
