import { app, BrowserWindow, dialog, session, shell } from 'electron';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

let desktopWindow: BrowserWindow | null = null;
let desktopPort = 0;
const PORT_BASE = 47000;
const PORT_SPAN = 1000;
const PORT_ATTEMPTS = 20;

async function startSafeServer(start: (port: number) => Promise<number>): Promise<number> {
  const firstPort = PORT_BASE + Math.floor(Math.random() * PORT_SPAN);
  for (let attempt = 0; attempt < PORT_ATTEMPTS; attempt++) {
    try { return await start(firstPort + attempt); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error('本地服务端口均被占用');
}

function initialMediaRoot(): string {
  if (process.env.YJ_MEDIA_ROOT) return process.env.YJ_MEDIA_ROOT;
  const projectRoot = localProjectRoot();
  if (projectRoot && existsSync(join(projectRoot, '..', 'YJ-Media'))) return join(projectRoot, '..', 'YJ-Media');
  if (projectRoot) return join(projectRoot, '..', 'YJ-Media');
  const music = app.getPath('music');
  return existsSync(music) ? music : app.getPath('home');
}

function localProjectRoot(): string | null {
  const candidates = app.isPackaged
    ? [dirname(app.getPath('exe')), 'D:\\YJ-Desktop'] : [app.getAppPath()];
  return candidates.find(root => existsSync(join(root, 'package.json')) && existsSync(join(root, 'app', 'index.html'))) ?? null;
}

function configurePaths(): void {
  const mediaRoot = initialMediaRoot();
  const projectRoot = localProjectRoot();
  const stateRoot = app.isPackaged ? join(app.getPath('userData'), 'state') : app.getAppPath();
  const current = join(stateRoot, '.yj-cache', 'settings.json');
  const previousSettings = [
    join(app.getPath('appData'), 'YJ Desktop', 'state', '.yj-cache', 'settings.json'),
    join(projectRoot ?? mediaRoot, '.yj-cache', 'settings.json'),
  ];
  if (app.isPackaged && !existsSync(current)) {
    const previous = previousSettings.find(existsSync);
    if (previous) {
      mkdirSync(dirname(current), { recursive: true });
      copyFileSync(previous, current);
    }
  }
  process.env.YJ_STATE_ROOT = stateRoot;
  process.env.YJ_MEDIA_ROOT = mediaRoot;
  if (projectRoot) process.env.YJ_PROJECT_ROOT = projectRoot;
  process.env.YJ_EMBEDDED = '1';
}

function openExternal(address: string): void {
  try {
    const url = new URL(address);
    if (url.protocol === 'https:' || url.protocol === 'http:') void shell.openExternal(address);
  } catch { /* ignore invalid links */ }
}

function createWindow(port: number): void {
  const origin = `http://127.0.0.1:${port}`;
  desktopWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 760, minHeight: 540,
    show: false, autoHideMenuBar: true, backgroundColor: '#b9bab8',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  const window = desktopWindow;
  window.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' }; });
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin === origin) return;
    event.preventDefault(); openExternal(url);
  });
  window.once('ready-to-show', () => { window.maximize(); window.show(); });
  window.on('closed', () => { desktopWindow = null; });
  void window.loadURL(origin + '/').catch(error => dialog.showErrorBox('页面打开失败', String(error)));
}

async function boot(): Promise<void> {
  configurePaths();
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, reply) => reply(false));
  const server = require(join(__dirname, 'server.cjs')) as { startDesktopServer(port: number): Promise<number> };
  desktopPort = await startSafeServer(server.startDesktopServer);
  createWindow(desktopPort);
}

app.setName('YJ-Pocket-Desktop');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (!desktopWindow) return;
    if (desktopWindow.isMinimized()) desktopWindow.restore();
    desktopWindow.focus();
  });
  app.on('activate', () => { if (!desktopWindow && desktopPort) createWindow(desktopPort); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  void app.whenReady().then(boot).catch(error => {
    dialog.showErrorBox('YJ-Pocket-Desktop 启动失败', String(error));
    app.quit();
  });
}
