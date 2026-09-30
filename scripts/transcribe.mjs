import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist', 'voice-transcribe.cjs');
await build({ entryPoints: [join(root, 'src', 'voice-transcribe.ts')], outfile: output,
  bundle: true, platform: 'node', format: 'cjs', target: 'node20' });
const child = spawn(process.execPath, [output, ...process.argv.slice(2)],
  { cwd: root, stdio: 'inherit', windowsHide: true });
child.once('error', error => { console.error(error); process.exitCode = 1; });
child.once('exit', code => { process.exitCode = code ?? 1; });
