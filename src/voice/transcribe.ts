import { spawn } from 'node:child_process';
import { access, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createLimit } from '../shared/async-limit';
import { cachedChunk, loadAuth, planRecording, transcribePiece, type Auth, type Recording } from './asr';

type Options = { root: string; publisher: string; file?: string; category?: string; all: boolean;
  limit?: number; concurrency: number; notesConcurrency: number; dryRun: boolean; asrOnly: boolean };

function options(argv: string[]): Options {
  const values = new Map<string, string>();
  const switches = new Set(['--all', '--dry-run', '--asr-only']);
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (switches.has(flag)) { values.set(flag, 'true'); continue; }
    if (!['--root', '--publisher', '--file', '--category', '--limit', '--concurrency', '--notes-concurrency'].includes(flag) || !argv[index + 1]) throw new Error(`无效参数：${flag}`);
    values.set(flag, argv[++index]);
  }
  const count = Number(values.has('--all')) + Number(values.has('--file')) + Number(values.has('--category'));
  if (count !== 1) throw new Error('请指定 --all、--file 或 --category 其中一项');
  const number = (flag: string, fallback: number) => Number(values.get(flag) ?? fallback);
  const concurrency = number('--concurrency', 2), notesConcurrency = number('--notes-concurrency', 1);
  const limit = values.has('--limit') ? number('--limit', 0) : undefined;
  const publisher = values.get('--publisher');
  if (![concurrency, notesConcurrency, limit ?? 1].every(value => Number.isInteger(value) && value > 0)) throw new Error('并发数和数量限制必须是正整数');
  return { root: resolve(values.get('--root') ?? process.env.YJ_VOICE_ROOT ?? join(resolve(__dirname, '..', '..'), 'YJ-Media', 'Recordings', 'IPhone-Voice')),
    publisher: publisher ? resolve(publisher) : '',
    file: values.get('--file'), category: values.get('--category'), all: values.has('--all'), limit,
    concurrency, notesConcurrency, dryRun: values.has('--dry-run'), asrOnly: values.has('--asr-only') };
}

function inside(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

async function walk(folder: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.name.startsWith('._') || entry.name === '_transcripts' || entry.isSymbolicLink()) continue;
    const path = join(folder, entry.name);
    if (entry.isDirectory()) found.push(...await walk(path));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.m4a') found.push(path);
  }
  return found;
}

async function selectedFiles(args: Options): Promise<string[]> {
  const folder = resolve(args.root, args.category ?? '');
  const source = args.file ? resolve(args.root, args.file) : folder;
  if (!inside(args.root, source)) throw new Error('录音必须位于指定根目录内');
  const files = args.file ? [source] : await walk(folder);
  const sized = await Promise.all(files.map(async path => ({ path, size: (await stat(path)).size })));
  sized.sort((a, b) => a.size - b.size || a.path.localeCompare(b.path));
  return sized.slice(0, args.limit).map(item => item.path);
}

function python(script: string, argv: string[]): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn('python', [script, ...argv], { cwd: dirname(dirname(script)),
      stdio: 'inherit', windowsHide: true });
    child.once('error', fail);
    child.once('exit', code => code === 0 ? done() : fail(new Error(`${script} 退出码 ${code}`)));
  });
}

async function publish(recording: Recording, args: Options): Promise<void> {
  await python(args.publisher, ['--root', args.root, '--file', recording.source,
    '--workers', '1', '--skip-gallery']);
}

async function runRecording(recording: Recording, args: Options, auth: Auth,
  asrLimit: ReturnType<typeof createLimit>, notesLimit: ReturnType<typeof createLimit>): Promise<void> {
  const outcomes = await Promise.allSettled(recording.pieces.map(piece => asrLimit(async () => {
    const state = await transcribePiece(recording, piece, auth);
    console.log(`ASR ${recording.relative}: ${piece.index + 1}/${recording.pieces.length} ${state}`);
  })));
  const failure = outcomes.find(result => result.status === 'rejected');
  if (failure?.status === 'rejected') throw failure.reason;
  if (!args.asrOnly) await notesLimit(() => publish(recording, args));
}

async function main(): Promise<void> {
  const args = options(process.argv.slice(2));
  const files = await selectedFiles(args);
  const recordings: Recording[] = [];
  for (const source of files) recordings.push(await planRecording(args.root, source));
  if (args.dryRun) {
    const pieces = recordings.flatMap(recording => recording.pieces.map(piece => cachedChunk(recording, piece)));
    const cached = (await Promise.all(pieces)).filter(Boolean).length;
    console.log(JSON.stringify({ recordings: recordings.length, chunks: pieces.length, cached,
      pending: pieces.length - cached, concurrency: args.concurrency }));
    return;
  }
  if (!args.asrOnly && !args.publisher) throw new Error('请用 --publisher 指定 HTML 生成脚本，或使用 --asr-only');
  if (!args.asrOnly) await access(args.publisher);
  const auth = await loadAuth();
  const asrLimit = createLimit(args.concurrency), notesLimit = createLimit(args.notesConcurrency);
  const outcomes = await Promise.allSettled(recordings.map(recording => runRecording(recording, args, auth, asrLimit, notesLimit)));
  const failures = outcomes.flatMap((result, index) => result.status === 'rejected'
    ? [{ source: recordings[index].relative, error: String(result.reason) }] : []);
  if (!args.asrOnly) await python(join(dirname(args.publisher), 'transcribe_iphone_voice.py'),
    ['--root', args.root, '--gallery-only']);
  const report = join(args.root, '_transcripts', '.cache', 'minimax_ts_failures.json');
  await mkdir(dirname(report), { recursive: true });
  await writeFile(report, JSON.stringify(failures, null, 2));
  console.log(`完成 ${recordings.length - failures.length}/${recordings.length} 段录音`);
  if (failures.length) process.exitCode = 1;
}

void main().catch(error => { console.error(String(error)); process.exitCode = 1; });
