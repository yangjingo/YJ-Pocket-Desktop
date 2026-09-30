import { execFile } from 'node:child_process';
import { readFile, mkdir, mkdtemp, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const CHUNK_SECONDS = 480;
const MAX_BYTES = 50_000_000;

export type Piece = { index: number; start: number; end: number; keepStart: number; keepEnd: number };
export type Recording = { source: string; relative: string; duration: number; bytes: bigint;
  signature: string; cache: string; pieces: Piece[] };
export type Auth = { key: string; endpoint: string };
type AsrResult = { text?: string; duration?: number; segments?: unknown[]; trace_id?: string };

export function piecesFor(duration: number): Piece[] {
  return Array.from({ length: Math.ceil(duration / CHUNK_SECONDS) }, (_, index) => ({
    index, start: Math.max(0, index * CHUNK_SECONDS - 2),
    end: Math.min(duration, (index + 1) * CHUNK_SECONDS + 2),
    keepStart: index * CHUNK_SECONDS, keepEnd: Math.min(duration, (index + 1) * CHUNK_SECONDS)
  }));
}

export async function planRecording(root: string, source: string): Promise<Recording> {
  const details = await stat(source, { bigint: true });
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', source], { windowsHide: true });
  const duration = Number(stdout.trim());
  if (!Number.isFinite(duration) || duration < 0) throw new Error(`录音时长无效：${source}`);
  const signature = `${details.size}-${details.mtimeNs}`;
  const path = relative(root, source);
  return { source, relative: path, duration, bytes: details.size, signature,
    cache: join(root, '_transcripts', '.cache', 'minimax', path, signature), pieces: piecesFor(duration) };
}

export function chunkCache(recording: Recording, piece: Piece): string {
  return join(recording.cache, 'chunks', `${String(piece.index).padStart(4, '0')}.json`);
}

export async function cachedChunk(recording: Recording, piece: Piece): Promise<boolean> {
  try {
    const raw = JSON.parse(await readFile(chunkCache(recording, piece), 'utf8')) as AsrResult;
    return Array.isArray(raw.segments);
  } catch { return false; }
}

export async function loadAuth(): Promise<Auth> {
  const path = join(homedir(), '.mmx', 'config.json');
  const config = JSON.parse(await readFile(path, 'utf8')) as { api_key?: string; region?: string };
  if (!config.api_key || !['cn', 'global'].includes(config.region ?? '')) throw new Error('请先在设置中配置 MiniMax API Key 与 region');
  const host = config.region === 'cn' ? 'api.minimaxi.com' : 'api.minimax.io';
  return { key: config.api_key, endpoint: `https://${host}/v1/speech_to_text` };
}

async function encodePiece(recording: Recording, piece: Piece, target: string): Promise<void> {
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-ss', String(piece.start),
    '-i', recording.source, '-t', String(piece.end - piece.start), '-vn', '-ac', '1', '-ar', '16000',
    '-c:a', 'libmp3lame', '-b:a', '32k', target];
  await run('ffmpeg', args, { windowsHide: true, timeout: 180_000 });
  const details = await stat(target);
  if (details.size < 1 || details.size > MAX_BYTES) throw new Error(`分段大小超出限制：${recording.relative}`);
}

async function requestAsr(audio: string, auth: Auth, format: 'verbose_json' | 'json' = 'verbose_json'): Promise<AsrResult> {
  const form = new FormData();
  form.set('model', 'asr-1.0');
  form.set('file', new Blob([new Uint8Array(await readFile(audio))]), basename(audio));
  form.set('response_format', format);
  form.set('timestamp_level', 'sentence');
  form.set('stream', 'false');
  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(auth.endpoint, { method: 'POST', body: form,
        headers: { Authorization: `Bearer ${auth.key}` }, signal: AbortSignal.timeout(900_000) });
    } catch (error) {
      lastError = `网络请求失败：${String(error)}`;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt));
      continue;
    }
    const result = await response.json() as AsrResult & { error?: { message?: string }; base_resp?: { status_msg?: string } };
    if (response.ok && result.text === '' && !result.segments) result.segments = [];
    if (response.ok && format === 'json' && typeof result.text === 'string') return result;
    if (response.ok && Array.isArray(result.segments)) return result;
    lastError = `MiniMax ASR HTTP ${response.status}: ${result.error?.message ?? result.base_resp?.status_msg ?? '响应缺少转写段落'}`;
    if (format === 'verbose_json' && /diarization failed|1033/i.test(lastError)) return requestAsr(audio, auth, 'json');
    if (response.status !== 429 && response.status < 500) throw new Error(lastError);
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt));
  }
  throw new Error(`MiniMax ASR 连续三次请求失败；${lastError}`);
}

export async function transcribePiece(recording: Recording, piece: Piece, auth: Auth): Promise<'cached' | 'transcribed'> {
  if (await cachedChunk(recording, piece)) return 'cached';
  const direct = piece.start === 0 && piece.end === piece.keepEnd && piece.end <= 500 && recording.bytes <= BigInt(MAX_BYTES);
  const temporary = direct ? '' : await mkdtemp(join(tmpdir(), 'yj-voice-asr-'));
  try {
    const audio = direct ? recording.source : join(temporary, 'chunk.mp3');
    if (!direct) await encodePiece(recording, piece, audio);
    const result = await requestAsr(audio, auth);
    if (!result.segments) result.segments = result.text
      ? [{ start: 0, end: piece.end - piece.start, speaker: 'unverified', text: result.text }] : [];
    const target = chunkCache(recording, piece);
    await mkdir(join(recording.cache, 'chunks'), { recursive: true });
    await writeFile(`${target}.tmp`, JSON.stringify(result, null, 2));
    await rename(`${target}.tmp`, target);
    return 'transcribed';
  } finally { if (temporary) await rm(temporary, { recursive: true, force: true }); }
}
