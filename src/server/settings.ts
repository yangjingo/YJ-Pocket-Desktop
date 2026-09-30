import { homedir } from 'node:os';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export type Language = 'zh' | 'en';
export type PublicSettings = { language: Language; library_path: string; key_configured: boolean };
export type SettingsInput = { language?: unknown; library_path?: unknown; api_key?: unknown; clear_key?: unknown };

export function createSettings(appRoot: string, mmxPath = join(homedir(), '.mmx', 'config.json')) {
  const settingsPath = join(process.env.YJ_STATE_ROOT ?? appRoot, '.yj-cache', 'settings.json');
  let stored: { language?: Language; library_path?: string } = {};
  try { stored = JSON.parse(readFileSync(settingsPath, 'utf8')); } catch { /* use defaults */ }
  let language: Language = stored.language === 'en' ? 'en' : 'zh';
  const projectRoot = resolve(process.env.YJ_PROJECT_ROOT ?? appRoot);
  const defaultMediaRoot = resolve(process.env.YJ_MEDIA_ROOT ?? join(projectRoot, '..', 'YJ-Media'));
  const previousRoot = stored.library_path ? resolve(stored.library_path) : null;
  const oldMediaRoot = join(projectRoot, 'media');
  let libraryPath = previousRoot && previousRoot !== projectRoot && previousRoot !== oldMediaRoot
    ? previousRoot : defaultMediaRoot;

  async function mmxConfig(): Promise<Record<string, unknown>> {
    try { return JSON.parse(await readFile(mmxPath, 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw new Error('MiniMax 配置读取失败'); }
  }

  async function read(): Promise<PublicSettings> {
    const config = await mmxConfig();
    return { language, library_path: libraryPath,
      key_configured: typeof config.api_key === 'string' && !!config.api_key };
  }

  async function save(input: SettingsInput): Promise<PublicSettings> {
    if (input.language !== 'zh' && input.language !== 'en') throw new Error('请选择支持的语言');
    if (typeof input.library_path !== 'string' || !input.library_path.trim()) throw new Error('请输入文件夹绝对路径');
    const folder = await realpath(input.library_path.trim()).catch(error => {
      if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw new Error('MEDIA_PATH_INVALID');
      throw error;
    });
    if (!(await stat(folder)).isDirectory()) throw new Error('MEDIA_PATH_INVALID');
    if (typeof input.api_key !== 'string' && input.api_key != null) throw new Error('API Key 格式无效');
    const key = typeof input.api_key === 'string' ? input.api_key.trim() : '';
    if (key && (key.length < 10 || /[\r\n]/.test(key))) throw new Error('API Key 格式无效');
    if (key || input.clear_key === true) {
      const config = await mmxConfig();
      if (input.clear_key === true) delete config.api_key;
      else config.api_key = key;
      await mkdir(dirname(mmxPath), { recursive: true });
      await writeFile(mmxPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
    }
    await mkdir(dirname(settingsPath), { recursive: true });
    await writeFile(settingsPath, JSON.stringify({ language: input.language, library_path: folder }, null, 2) + '\n');
    language = input.language; libraryPath = folder;
    return read();
  }

  return { read, save, root: () => libraryPath };
}
