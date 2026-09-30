import { t, setLanguage, type Locale } from './i18n/index';

type Kind = 'folder' | 'image' | 'video' | 'audio' | 'file';
type Library = 'image' | 'video' | 'audio';
type WindowName = 'finder' | 'preview' | 'settings';
type FileItem = {name: string; path: string; kind: Kind; size: number | null; modified: number};
type Listing = {path: string; items: FileItem[]; voice_available: boolean; voice_path?: string};
type DesktopState = {path: string; library: Library | ''; items: FileItem[]; roots: FileItem[];
  visible: FileItem[]; filter: Kind | 'all'; view: 'grid' | 'list'; selected: FileItem | null; voice: boolean; voicePath: string};
type UiSettings = {language: Locale; library_path: string; key_configured: boolean};

(() => {
  const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error('缺少界面元素：' + selector);
    return element;
  };
  const state: DesktopState = {path: '', library: '', items: [], roots: [], visible: [], filter: 'all', view: 'grid', selected: null, voice: false, voicePath: ''};
  let topWindow = 40;
  let loadVersion = 0;
  const windowMotion = new Map<WindowName, Animation>();
  let language: Locale = 'zh', rootPath = 'D:\\YJ-Media', keyConfigured = false;
  const kindName = (kind: Kind) => t('kind_' + kind);
  const glyphs: Record<Kind, string> = {folder: '▰', image: '▧', video: '▷', audio: '♫', file: '◇'};

  function applyLanguage() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = language === 'zh' ? 'YJ-Pocket-Desktop · 便携素材终端' : 'YJ-Pocket-Desktop · Portable Media Desktop';
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n ?? ''); });
    for (const [selector, key] of [
      ['#desktop', 'desktopLabel'], ['#brand-popover', 'storageLabel'], ['#desktop-icons', 'mediaObjects'],
      ['#menu-settings', 'settings'], ['#back-button', 'parentFolder'], ['#refresh-button', 'refreshFolder'],
      ['#breadcrumb', 'currentLocation'], ['#grid-button', 'gridView'], ['#list-button', 'listView'],
      ['#prev-item', 'previousItem'], ['#next-item', 'nextItem'], ['#settings', 'settingsTitle'],
      ['.dock', 'applications'],
    ]) $(selector).setAttribute('aria-label', t(key));
    $('#lift-control').setAttribute('aria-label', t('deskHeight'));
    for (const [selector, key] of [['#desk-lower', 'deskLower'], ['#desk-raise', 'deskRaise']]) {
      $(selector).setAttribute('aria-label', t(key)); $(selector).setAttribute('title', t(key));
    }
    $<HTMLInputElement>('#search').placeholder = t('search');
    $('#settings-key-state').textContent = t(keyConfigured ? 'configured' : 'notConfigured');
    if (state.selected) $('#preview-kind').textContent = kindName(state.selected.kind) + ' ' + t('preview');
    if ($('#preview').dataset.mode === 'voice') {
      $('#preview-title').textContent = t('allRecordings'); $('#preview-kind').textContent = t('voiceMemos');
      const frame = document.querySelector<HTMLIFrameElement>('#preview-content iframe');
      if (frame) frame.title = t('voiceMemos');
    }
    const deck = document.querySelector<HTMLElement>('.player-device');
    const audio = deck?.querySelector('audio');
    if (deck && audio) translatePlayer(deck, audio);
    clock();
    [['#dock-finder','files'],['#dock-gallery','gallery'],['#dock-video','videos'],['#dock-player','music'],['#dock-voice','voiceMemos'],['#dock-settings','settings']].forEach(([selector, key]) => {
      const label = $(selector).querySelector('small');
      if (label) label.textContent = t(key);
      $(selector).setAttribute('title', t(key));
    });
    const searchLabel = $('#dock-search').querySelector('small');
    if (searchLabel) searchLabel.textContent = t('searchDock');
    $('#dock-search').setAttribute('title', t('search'));
    $('#dock-search').setAttribute('aria-label', t('search'));
    $('#menu-search').setAttribute('title', t('search'));
    $('#menu-search').setAttribute('aria-label', t('search'));
    (['finder', 'preview', 'settings'] as WindowName[]).forEach(updateWindowControls);
  }

  async function updateSettings(value: UiSettings) {
    language = value.language; rootPath = value.library_path; keyConfigured = value.key_configured;
    await setLanguage(language);
    $<HTMLSelectElement>('#settings-language').value = language;
    $<HTMLInputElement>('#settings-path').value = rootPath;
    $<HTMLInputElement>('#settings-key').value = '';
    $<HTMLInputElement>('#settings-clear-key').checked = false;
    applyLanguage();
  }

  async function loadSettings() {
    try {
      const response = await fetch('/api/settings', {cache: 'no-store'});
      if (!response.ok) throw new Error('设置读取失败');
      await updateSettings(await response.json() as UiSettings);
    } catch { applyLanguage(); }
    await load('');
  }

  function openSettings() {
    if (windowNode('settings').dataset.minimized === 'true') return showWindow('settings');
    $<HTMLSelectElement>('#settings-language').value = language;
    $<HTMLInputElement>('#settings-path').value = rootPath;
    $<HTMLInputElement>('#settings-key').value = '';
    $<HTMLInputElement>('#settings-clear-key').checked = false;
    $('#settings-message').textContent = '';
    showWindow('settings');
  }

  async function saveSettings(event: Event) {
    event.preventDefault();
    const button = $<HTMLButtonElement>('#settings-save'), message = $('#settings-message');
    const key = $<HTMLInputElement>('#settings-key').value;
    const path = $<HTMLInputElement>('#settings-path').value;
    const input = {language: $<HTMLSelectElement>('#settings-language').value,
      library_path: path, api_key: key,
      clear_key: $<HTMLInputElement>('#settings-clear-key').checked};
    button.disabled = true; message.classList.remove('error'); message.textContent = t('saving');
    try {
      const response = await fetch('/api/settings', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(input)});
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || '设置保存失败');
      const priorRoot = rootPath;
      await updateSettings(value as UiSettings);
      if (rootPath !== priorRoot) closePreview();
      state.path = ''; state.library = ''; state.roots = []; state.filter = 'all';
      $<HTMLInputElement>('#search').value = '';
      await load(''); message.textContent = t('saved');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.classList.add('error'); message.textContent = detail === 'MEDIA_PATH_INVALID' ? t('invalidMediaPath') : detail;
    }
    finally { button.disabled = false; }
  }

  const mediaUrl = (item: FileItem) => '/media/' + item.path.split('/').map(encodeURIComponent).join('/');
  const thumbUrl = (item: FileItem, width = 360) => '/thumb?path=' + encodeURIComponent(item.path) + '&w=' + width;
  const sizeLabel = (bytes: number | null) => bytes == null ? '' : bytes < 1048576 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
  const child = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) => {
    const node = document.createElement(tag); node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  function clock() {
    const date = new Date();
    const locale = language === 'zh' ? 'zh-CN' : 'en-US';
    const now = date.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit', hour12: false});
    $('#site-time').textContent = now;
    $('#screen-time').textContent = now;
    $('#menu-date').textContent = date.toLocaleDateString(locale, {month: 'short', day: 'numeric', weekday: 'short'});
  }

  function capacity(bytes: number): string {
    const gb = bytes / 1073741824;
    return gb >= 1024 ? (gb / 1024).toFixed(1) + ' TB' : gb.toFixed(1) + ' GB';
  }

  async function showStorage() {
    $('#brand-popover').classList.remove('hidden');
    $('#desktop-brand').setAttribute('aria-expanded', 'true');
    $('#brand-path').textContent = rootPath;
    try {
      const response = await fetch('/api/storage', {cache: 'no-store'});
      if (!response.ok) throw new Error('storage');
      const disk = await response.json() as {path:string; total:number; available:number};
      $('#brand-path').textContent = disk.path;
      $('#storage-used').textContent = t('used') + ' ' + capacity(disk.total - disk.available);
      $('#storage-total').textContent = t('total') + ' ' + capacity(disk.total);
      $('#storage-available').textContent = t('available') + ' ' + capacity(disk.available);
      $('#storage-fill').style.width = Math.max(0, Math.min(100, 100 * (1 - disk.available / disk.total))) + '%';
    } catch { $('#storage-available').textContent = language === 'zh' ? '容量暂不可用' : 'Capacity unavailable'; }
  }

  function bindStorage() {
    const trigger = $('#desktop-brand');
    let pinned = false;
    trigger.addEventListener('mouseenter', () => { void showStorage(); });
    trigger.addEventListener('mouseleave', () => { if (!pinned) hideStorage(); });
    trigger.addEventListener('click', () => { pinned = !pinned; pinned ? void showStorage() : hideStorage(); });
    document.addEventListener('pointerdown', event => {
      if (trigger.contains(event.target as Node) || $('#brand-popover').contains(event.target as Node)) return;
      pinned = false; hideStorage();
    });
  }

  function hideStorage() {
    $('#brand-popover').classList.add('hidden');
    $('#desktop-brand').setAttribute('aria-expanded', 'false');
  }

  async function load(path = state.path, library = state.library, refresh = false) {
    const version = ++loadVersion;
    const url = library ? '/api/library?kind=' + library + (refresh ? '&refresh=1' : '') : '/api/list?path=' + encodeURIComponent(path);
    $('#file-area').replaceChildren(child('div', 'loading-state', t('loading')));
    try {
      const response = await fetch(url, {cache: 'no-store'});
      if (!response.ok) throw new Error('文件夹读取失败 (' + response.status + ')');
      const data = await response.json() as Listing;
      if (version !== loadVersion) return;
      state.path = path; state.library = library; state.items = data.items; state.voice = data.voice_available;
      state.voicePath = data.voice_path ?? '';
      if (!path && !library) state.roots = data.items.filter(item => item.kind === 'folder');
      $('#dock-voice').hidden = !state.voice;
      $('#desktop-voice').hidden = !state.voice;
      render();
    } catch (error) {
      if (version !== loadVersion) return;
      $('#file-area').replaceChildren(child('div', 'empty-state', error instanceof Error ? error.message : String(error)));
    }
  }

  function navigate(path = '') {
    closePreview();
    state.filter = 'all'; state.library = '';
    $<HTMLInputElement>('#search').value = '';
    showWindow('finder');
    load(path, '');
  }

  function openLibrary(kind: Library) {
    closePreview();
    state.filter = 'all';
    $<HTMLInputElement>('#search').value = '';
    showWindow('finder');
    load('', kind);
  }

  function openDockLibrary(kind: Library) {
    const preview = windowNode('preview');
    if (preview.dataset.minimized === 'true' && preview.dataset.mode === kind) showWindow('preview');
    else openLibrary(kind);
  }

  function renderSidebar() {
    const host = $('#sidebar-rooms');
    host.replaceChildren();
    state.roots.forEach(item => {
      const button = child('button', 'room-link' + (state.path === item.path ? ' selected' : ''));
      const icon = document.createElement('img'); icon.className = 'room-icon'; icon.src = '/assets/media-archive/folder.svg'; icon.alt = '';
      button.append(icon, child('span', '', item.name));
      button.type = 'button'; button.title = item.name; button.addEventListener('click', () => navigate(item.path));
      host.append(button);
    });
    const active = state.library ? state.library : state.path ? '' : 'home';
    [['#home-button', 'home'], ['#gallery-button', 'image'], ['#video-button', 'video'], ['#music-button', 'audio']].forEach(([selector, name]) => {
      $(selector).classList.toggle('selected', active === name);
    });
  }

  function renderBreadcrumb() {
    const host = $('#breadcrumb');
    host.replaceChildren();
    const root = child('button', '', t('myDesktop')); root.type = 'button'; root.onclick = () => navigate(''); host.append(root);
    if (state.library) {
      host.append(child('span', '', '/'));
      host.append(child('span', 'current', state.library === 'image' ? t('photoGallery') : state.library === 'video' ? t('videos') : t('music')));
      return;
    }
    let current = '';
    state.path.split('/').filter(Boolean).forEach(part => {
      current += (current ? '/' : '') + part;
      host.append(child('span', '', '/'));
      const button = child('button', 'current', part); button.type = 'button';
      const target = current; button.onclick = () => navigate(target); host.append(button);
    });
  }

  function card(item: FileItem) {
    const button = child('button', 'file-card'); button.type = 'button'; button.dataset.kind = item.kind;
    button.title = item.path; button.setAttribute('aria-label', t(item.kind === 'folder' ? 'openFolder' : 'open') + ' ' + item.name);
    const thumb = child('div', 'file-thumb');
    if (item.kind === 'image' || item.kind === 'video') {
      const image = document.createElement('img'); image.loading = 'lazy'; image.alt = ''; image.src = thumbUrl(item);
      image.onerror = () => image.replaceWith(child('span', 'glyph', glyphs[item.kind])); thumb.append(image);
      if (item.kind === 'video') thumb.append(child('span', 'play-chip', '▶'));
    } else if (item.kind === 'folder') {
      const image = document.createElement('img'); image.className = 'folder-thumb-img'; image.src = '/assets/media-archive/folder.svg'; image.alt = '';
      thumb.append(image);
    } else thumb.append(child('span', 'glyph', glyphs[item.kind]));
    button.append(thumb, child('div', 'file-name', item.name), child('div', 'file-meta', item.kind === 'folder' ? t('openFolder') : kindName(item.kind) + ' · ' + sizeLabel(item.size)));
    button.addEventListener('click', () => item.kind === 'folder' ? navigate(item.path) : openPreview(item));
    return button;
  }

  function renderFiles() {
    const query = $<HTMLInputElement>('#search').value.trim().toLocaleLowerCase();
    state.visible = state.items.filter(item => (state.filter === 'all' || item.kind === state.filter) && item.name.toLocaleLowerCase().includes(query));
    const host = $('#file-area'); host.replaceChildren();
    if (!state.visible.length) {
      const empty = child('div', 'empty-state'); empty.append(child('strong', '', t('emptyTitle')), child('span', '', t('emptyHint')));
      host.append(empty); return;
    }
    const grid = child('div', 'files' + (state.view === 'list' ? ' list' : ''));
    state.visible.forEach(item => { grid.append(card(item)); });
    host.append(grid);
  }

  function render() {
    const title = state.library ? {image: t('photoGallery'), video: t('videoArchive'), audio: t('musicCollection')}[state.library] : state.path.split('/').pop() || t('myDesktop');
    $('#folder-title').textContent = title;
    $('#window-title').textContent = title;
    $('#folder-kicker').textContent = state.library ? 'YJ / COLLECTION' : 'YJ / DESKTOP';
    $('#folder-count').textContent = state.items.length + ' ' + t('items');
    $('#footer-status').textContent = rootPath + (state.path ? '\\' + state.path.replaceAll('/', '\\') : '');
    $<HTMLButtonElement>('#back-button').disabled = !state.path && !state.library;
    document.querySelectorAll<HTMLButtonElement>('#type-tabs button').forEach(button => {
      button.classList.toggle('active', button.dataset.kind === state.filter);
    });
    renderSidebar(); renderBreadcrumb(); renderFiles();
    syncDock();
  }

  function windowNode(name: WindowName): HTMLElement { return $('#' + name); }

  function updateWindowControls(name: WindowName) {
    const label = t(name === 'finder' ? 'files' : name === 'preview' ? 'preview' : 'settings');
    const maximized = windowNode(name).classList.contains('maximized');
    for (const action of ['close', 'minimize', 'maximize'] as const) {
      const button = $<HTMLButtonElement>(`#${name}-${action}`);
      const verb = t(action === 'maximize' && maximized ? 'restoreWindow' : action + 'Window');
      const title = language === 'zh' ? `${verb}${label}窗口` : `${verb} ${label} window`;
      button.setAttribute('aria-label', title); button.title = title;
      if (action === 'maximize') button.setAttribute('aria-pressed', String(maximized));
    }
  }

  function focusWindow(name: WindowName) {
    const window = windowNode(name);
    document.querySelectorAll('.os-window').forEach(node => { node.classList.toggle('is-active', node === window); });
    window.style.zIndex = String(++topWindow);
  }

  function focusTopWindow() {
    const visible = [...document.querySelectorAll<HTMLElement>('.os-window')]
      .filter(node => !node.classList.contains('hidden'));
    const top = visible.sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex))[0];
    document.querySelectorAll('.os-window').forEach(node => { node.classList.toggle('is-active', node === top); });
  }

  function syncDock() {
    const finder = windowNode('finder'), preview = windowNode('preview'), settings = windowNode('settings');
    const finderVisible = !finder.classList.contains('hidden');
    const previewVisible = !preview.classList.contains('hidden');
    const dock = (id: string, active: boolean, minimized: boolean) => {
      $(id).classList.toggle('active', active); $(id).classList.toggle('minimized', minimized);
    };
    dock('#dock-finder', finderVisible, finder.dataset.minimized === 'true');
    $('#desktop-folder').classList.toggle('is-open', finderVisible && !state.library);
    for (const [id, desktopId, kind] of [
      ['#dock-gallery', '#desktop-gallery', 'image'],
      ['#dock-video', '#desktop-video', 'video'],
      ['#dock-player', '#desktop-music', 'audio'],
    ]) {
      const active = (finderVisible && state.library === kind) || (previewVisible && preview.dataset.mode === kind);
      dock(id, active, preview.dataset.minimized === 'true' && preview.dataset.mode === kind);
      $(desktopId).classList.toggle('is-open', active);
    }
    const voiceOpen = previewVisible && preview.dataset.mode === 'voice';
    dock('#dock-voice', voiceOpen, preview.dataset.minimized === 'true' && preview.dataset.mode === 'voice');
    $('#desktop-voice').classList.toggle('is-open', voiceOpen);
    dock('#dock-settings', !settings.classList.contains('hidden'), settings.dataset.minimized === 'true');
  }

  function cancelWindowMotion(name: WindowName) {
    const animation = windowMotion.get(name);
    if (animation) { animation.onfinish = null; animation.cancel(); windowMotion.delete(name); }
  }

  function showWindow(name: WindowName) {
    const window = windowNode(name);
    cancelWindowMotion(name); window.classList.remove('hidden');
    delete window.dataset.minimized; window.setAttribute('aria-hidden', 'false');
    focusWindow(name);
    syncDock();
  }

  function markHidden(name: WindowName, minimize: boolean) {
    const window = windowNode(name);
    if (window.contains(document.activeElement)) focusAfterHide(name);
    window.classList.add('hidden'); window.setAttribute('aria-hidden', 'true');
    if (minimize) window.dataset.minimized = 'true'; else delete window.dataset.minimized;
    focusTopWindow(); syncDock();
  }

  function focusAfterHide(name: WindowName) {
    const mode = windowNode('preview').dataset.mode;
    const previewEntry = mode === 'image' ? '#desktop-gallery' : mode === 'video' ? '#desktop-video' : mode === 'audio' ? '#desktop-music' : '#desktop-voice';
    const finderEntry = state.library === 'image' ? '#desktop-gallery' : state.library === 'video' ? '#desktop-video' : state.library === 'audio' ? '#desktop-music' : '#desktop-folder';
    const selector = name === 'finder' ? finderEntry : name === 'settings' ? '#menu-settings' : previewEntry;
    const trigger = $(selector);
    (trigger.hidden ? $('#desktop-brand') : trigger).focus({preventScroll: true});
  }

  function hideWindow(name: WindowName) {
    cancelWindowMotion(name); markHidden(name, false);
  }

  function minimizeWindow(name: WindowName) {
    cancelWindowMotion(name); markHidden(name, true);
  }

  function toggleMaximize(name: WindowName) {
    const window = windowNode(name);
    const before = window.getBoundingClientRect();
    window.classList.toggle('maximized');
    showWindow(name); updateWindowControls(name);
    if (document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const after = window.getBoundingClientRect();
    const transform = `translate3d(${before.left - after.left}px,${before.top - after.top}px,0) scale(${before.width / after.width},${before.height / after.height})`;
    const animation = window.animate([{transform, transformOrigin: 'top left'}, {transform: 'none', transformOrigin: 'top left'}],
      {duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)'});
    windowMotion.set(name, animation);
    animation.onfinish = () => windowMotion.delete(name);
  }

  function maxWindowTop(window: HTMLElement) {
    const dock = document.querySelector<HTMLElement>('.dock');
    const dockTop = dock?.getClientRects().length ? dock.getBoundingClientRect().top : innerHeight - 24;
    const titleHeight = window.querySelector<HTMLElement>('.window-titlebar')?.offsetHeight ?? 45;
    return Math.max(48, dockTop - titleHeight - 8);
  }

  function bindDragging(name: WindowName) {
    const window = windowNode(name);
    const bar = window.querySelector<HTMLElement>('.window-titlebar');
    if (!bar) return;
    bar.addEventListener('pointerdown', event => {
      if ((event.target as HTMLElement).closest('button') || window.classList.contains('maximized') || innerWidth < 700) return;
      showWindow(name);
      const box = window.getBoundingClientRect(), startX = event.clientX, startY = event.clientY;
      let x = box.left, y = box.top, frame = 0;
      window.style.willChange = 'transform';
      bar.setPointerCapture(event.pointerId);
      const move = (next: PointerEvent) => {
        x = Math.max(0, Math.min(innerWidth - box.width, box.left + next.clientX - startX));
        y = Math.max(48, Math.min(maxWindowTop(window), box.top + next.clientY - startY));
        if (!frame) frame = requestAnimationFrame(() => { window.style.transform = `translate3d(${x - box.left}px,${y - box.top}px,0)`; frame = 0; });
      };
      const stop = () => {
        cancelAnimationFrame(frame); window.style.transform = ''; window.style.willChange = '';
        window.style.left = x + 'px'; window.style.top = y + 'px';
        bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', stop); bar.removeEventListener('pointercancel', stop);
      };
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', stop); bar.addEventListener('pointercancel', stop);
    });
    window.addEventListener('pointerdown', () => focusWindow(name));
  }

  function clampWindows() {
    document.querySelectorAll<HTMLElement>('.os-window').forEach(window => {
      if (innerWidth < 700) { window.style.left = ''; window.style.top = ''; return; }
      if (window.classList.contains('maximized') || !window.style.left) return;
      const bounds = window.getBoundingClientRect();
      window.style.left = Math.max(0, Math.min(innerWidth - bounds.width, bounds.left)) + 'px';
      window.style.top = Math.max(48, Math.min(maxWindowTop(window), bounds.top)) + 'px';
    });
  }

  function clearPreviewContent() {
    const host = $('#preview-content');
    host.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media => { media.pause(); });
    host.replaceChildren();
    host.style.removeProperty('--preview-aspect');
  }

  function closePreview() {
    hideWindow('preview');
    clearPreviewContent();
    delete $('#preview').dataset.mode;
    state.selected = null;
  }

  function openPreview(item: FileItem) {
    state.selected = item;
    $('#preview').dataset.mode = item.kind;
    showWindow('preview');
    $('#preview-title').textContent = item.name;
    $('#preview-overline').textContent = 'YJ / ' + kindName(item.kind).toUpperCase();
    $('#preview-kind').textContent = kindName(item.kind) + ' ' + t('preview');
    $('#preview-meta').textContent = item.path + ' · ' + sizeLabel(item.size);
    $<HTMLAnchorElement>('#download-link').href = mediaUrl(item); $('#download-link').hidden = false;
    clearPreviewContent();
    const host = $('#preview-content');
    if (item.kind === 'image') showImage(item, host);
    else if (item.kind === 'video') showVideo(item, host);
    else if (item.kind === 'audio') showAudio(item, host);
    else host.append(child('div', 'fallback', t('downloadFallback')));
    const media = state.visible.filter(row => row.kind !== 'folder');
    $<HTMLButtonElement>('#prev-item').disabled = media.indexOf(item) <= 0;
    $<HTMLButtonElement>('#next-item').disabled = media.indexOf(item) === media.length - 1;
  }

  function showImage(item: FileItem, host: HTMLElement) {
    const image = document.createElement('img'); image.alt = item.name; image.src = thumbUrl(item, 1800);
    image.onload = () => {
      if (host.contains(image) && image.naturalWidth && image.naturalHeight) {
        host.style.setProperty('--preview-aspect', `${image.naturalWidth} / ${image.naturalHeight}`);
      }
    };
    image.onerror = () => image.replaceWith(child('div', 'fallback', t('imageFallback')));
    host.append(image);
  }

  function showVideo(item: FileItem, host: HTMLElement) {
    const video = document.createElement('video'); video.controls = true; video.autoplay = true; video.playsInline = true;
    video.poster = thumbUrl(item, 900); video.src = mediaUrl(item);
    video.addEventListener('error', () => {
      video.remove();
      const fallback = child('div', 'fallback', t('videoFallback'));
      const button = child('button', '', t('convert')); button.type = 'button';
      button.onclick = () => prepareVideo(item, host, fallback); fallback.append(button); host.append(fallback);
    }, {once: true});
    host.append(video);
  }

  async function prepareVideo(item: FileItem, host: HTMLElement, fallback: HTMLElement) {
    fallback.replaceChildren(child('div', 'convert-status', t('converting')));
    try {
      const response = await fetch('/api/prepare', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({path: item.path})});
      if (!response.ok) throw new Error('无法启动转换');
      const {id} = await response.json();
      const poll = async (): Promise<void> => {
        if (state.selected !== item) return;
        const result = await (await fetch('/api/job?id=' + id)).json();
        if (result.status === 'working') { await new Promise(resolve => setTimeout(resolve, 1500)); return poll(); }
        if (result.status === 'error') throw new Error('视频转换失败');
        host.replaceChildren();
        const video = document.createElement('video'); video.controls = true; video.autoplay = true; video.playsInline = true;
        video.src = result.url; host.append(video); video.play().catch(() => {});
      };
      await poll();
    } catch (error) { fallback.textContent = error instanceof Error ? error.message : String(error); }
  }

  const audioTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return '0:00';
    const value = Math.floor(seconds);
    return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
  };

  function playerNode<T extends HTMLElement>(deck: HTMLElement, selector: string): T {
    const node = deck.querySelector<T>(selector);
    if (!node) throw new Error('播放器结构缺少 ' + selector);
    return node;
  }

  function createPlayer(): HTMLElement {
    const deck = child('div', 'player-device');
    deck.innerHTML = `<div class="player-gallery">
      <button class="player-sleeve player-sleeve-prev" data-player-action="playerPrevious" type="button"><span class="sleeve-mark">YJ</span><small></small></button>
      <div class="player-sleeve player-sleeve-current"><span class="sleeve-mark">YJ</span><small></small></div>
      <button class="player-sleeve player-sleeve-next" data-player-action="playerNext" type="button"><span class="sleeve-mark">YJ</span><small></small></button>
    </div><div class="player-deck">
      <div class="player-platter"><div class="audio-disc"><span>YJ</span></div></div>
      <span class="player-tonearm" aria-hidden="true"></span>
      <div class="player-hardware"><span class="player-led" aria-hidden="true"></span><label class="player-volume-unit"><small>VOL</small><span class="player-volume-shell"><span class="player-volume-knob" aria-hidden="true"></span><input class="player-volume" type="range" min="0" max="100" value="100"></span></label></div>
      <div class="player-track"><small class="player-kicker"></small><strong class="player-title"></strong><span class="player-status" role="status"></span></div>
      <div class="player-timeline"><span class="player-current-time">0:00</span><input class="player-seek" type="range" min="0" max="1" value="0"><span class="player-duration">0:00</span></div>
      <div class="player-keys"><button data-player-action="playerPrevious" type="button">◀◀</button><button data-player-action="playerRewind" type="button">↶</button><button class="player-play" data-player-action="playerPlay" type="button">▶</button><button data-player-action="playerForward" type="button">↷</button><button data-player-action="playerNext" type="button">▶▶</button></div>
    </div>`;
    return deck;
  }

  function translatePlayer(deck: HTMLElement, audio: HTMLAudioElement) {
    playerNode(deck, '.player-kicker').textContent = t('playerLocalAudio');
    playerNode<HTMLInputElement>(deck, '.player-seek').setAttribute('aria-label', t('playerSeek'));
    playerNode<HTMLInputElement>(deck, '.player-volume').setAttribute('aria-label', t('playerVolume'));
    deck.querySelectorAll<HTMLButtonElement>('[data-player-action]').forEach(button => {
      const action = button.dataset.playerAction === 'playerPlay' && !audio.paused ? 'playerPause' : button.dataset.playerAction ?? '';
      button.setAttribute('aria-label', t(action)); button.title = t(action);
    });
  }

  function syncPlayer(deck: HTMLElement, audio: HTMLAudioElement) {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const seek = playerNode<HTMLInputElement>(deck, '.player-seek');
    seek.max = String(duration || 1); seek.value = String(Math.min(audio.currentTime, duration || 1));
    seek.style.setProperty('--progress', duration ? `${audio.currentTime / duration * 100}%` : '0%');
    playerNode(deck, '.player-current-time').textContent = audioTime(audio.currentTime);
    playerNode(deck, '.player-duration').textContent = audioTime(duration);
    playerNode<HTMLButtonElement>(deck, '.player-play').textContent = audio.paused ? '▶' : 'Ⅱ';
    deck.classList.toggle('playing', !audio.paused);
    translatePlayer(deck, audio);
  }

  function showAudio(item: FileItem, host: HTMLElement) {
    const deck = createPlayer(), audio = document.createElement('audio');
    audio.src = mediaUrl(item); audio.preload = 'metadata'; deck.append(audio);
    playerNode(deck, '.player-title').textContent = item.name.replace(/\.[^.]+$/, '');
    const media = state.visible.filter(row => row.kind !== 'folder');
    const position = media.indexOf(item);
    for (const [selector, neighbor] of [['.player-sleeve-prev', media[position - 1]], ['.player-sleeve-next', media[position + 1]]] as const) {
      const sleeve = playerNode<HTMLButtonElement>(deck, selector);
      sleeve.disabled = !neighbor; playerNode(sleeve, 'small').textContent = neighbor?.name.replace(/\.[^.]+$/, '') ?? '';
    }
    playerNode(deck, '.player-sleeve-current small').textContent = item.name.replace(/\.[^.]+$/, '');
    playerNode<HTMLInputElement>(deck, '.player-seek').oninput = event => {
      if (Number.isFinite(audio.duration)) audio.currentTime = Number((event.target as HTMLInputElement).value);
    };
    const volume = playerNode<HTMLInputElement>(deck, '.player-volume');
    volume.oninput = () => {
      audio.volume = Number(volume.value) / 100;
      volume.parentElement?.style.setProperty('--turn', `${audio.volume * 270 - 135}deg`);
    };
    deck.querySelectorAll<HTMLButtonElement>('[data-player-action]').forEach(button => {
      button.onclick = () => playerAction(button.dataset.playerAction ?? '', audio);
    });
    for (const event of ['loadedmetadata', 'timeupdate', 'play', 'pause', 'ended']) audio.addEventListener(event, () => syncPlayer(deck, audio));
    audio.onerror = () => { playerNode(deck, '.player-status').textContent = t('audioUnavailable'); };
    host.append(deck); syncPlayer(deck, audio); void audio.play().catch(() => {});
  }

  function playerAction(action: string, audio: HTMLAudioElement) {
    if (action === 'playerPrevious') stepPreview(-1);
    else if (action === 'playerNext') stepPreview(1);
    else if (action === 'playerRewind') audio.currentTime = Math.max(0, audio.currentTime - 15);
    else if (action === 'playerForward') audio.currentTime = Math.min(audio.duration || audio.currentTime, audio.currentTime + 15);
    else if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  }

  function stepPreview(direction: number) {
    if (!state.selected) return;
    const media = state.visible.filter(row => row.kind !== 'folder');
    const next = media[media.indexOf(state.selected) + direction];
    if (next) openPreview(next);
  }

  function openVoice() {
    if (!state.voice) return;
    if ($('#preview').dataset.minimized === 'true' && $('#preview').dataset.mode === 'voice') return showWindow('preview');
    closePreview(); $('#preview').dataset.mode = 'voice'; showWindow('preview');
    $('#preview-title').textContent = t('allRecordings'); $('#preview-kind').textContent = t('voiceMemos');
    $('#preview-overline').textContent = 'YJ / VOICE MEMOS'; $('#preview-meta').textContent = state.voicePath;
    $('#download-link').hidden = true; $<HTMLButtonElement>('#prev-item').disabled = true; $<HTMLButtonElement>('#next-item').disabled = true;
    const frame = document.createElement('iframe'); frame.src = '/voice/index.html'; frame.title = t('voiceMemos');
    $('#preview-content').replaceChildren(frame);
  }

  function bind() {
    $('#home-button').onclick = () => navigate(''); $('#gallery-button').onclick = () => openLibrary('image');
    $('#video-button').onclick = () => openLibrary('video'); $('#music-button').onclick = () => openLibrary('audio');
    $('#dock-finder').onclick = () => windowNode('finder').dataset.minimized === 'true' ? showWindow('finder') : navigate('');
    const focusSearch = () => { showWindow('finder'); $<HTMLInputElement>('#search').focus(); };
    $('#dock-search').onclick = focusSearch;
    $('#menu-search').onclick = focusSearch;
    $('#dock-gallery').onclick = () => openDockLibrary('image'); $('#dock-video').onclick = () => openDockLibrary('video');
    $('#dock-player').onclick = () => openDockLibrary('audio'); $('#dock-voice').onclick = openVoice;
    $('#desktop-gallery').onclick = () => openDockLibrary('image'); $('#desktop-video').onclick = () => openDockLibrary('video');
    $('#desktop-music').onclick = () => openDockLibrary('audio'); $('#desktop-voice').onclick = openVoice;
    $('#desktop-folder').onclick = () => windowNode('finder').dataset.minimized === 'true' ? showWindow('finder') : navigate('');
    $('#dock-settings').onclick = openSettings; $('#menu-settings').onclick = openSettings;
    $('#menu-files').onclick = () => navigate('');
    $('#menu-gallery').onclick = () => openLibrary('image'); $('#menu-video').onclick = () => openLibrary('video');
    $('#menu-music').onclick = () => openLibrary('audio');
    $('#back-button').onclick = () => state.library ? navigate('') : navigate(state.path.split('/').slice(0, -1).join('/'));
    $('#refresh-button').onclick = () => load(state.path, state.library, true); $('#search').oninput = renderFiles;
    $('#grid-button').onclick = () => setView('grid'); $('#list-button').onclick = () => setView('list');
    $('#type-tabs').onclick = event => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-kind]'); if (button) setFilter(button.dataset.kind as Kind | 'all'); };
    $('#preview-back').onclick = closePreview; $('#preview-close').onclick = closePreview;
    $('#finder-close').onclick = () => hideWindow('finder'); $('#finder-minimize').onclick = () => minimizeWindow('finder');
    $('#finder-maximize').onclick = () => toggleMaximize('finder');
    $('#preview-minimize').onclick = () => minimizeWindow('preview'); $('#preview-maximize').onclick = () => toggleMaximize('preview');
    $('#settings-close').onclick = () => hideWindow('settings'); $('#settings-minimize').onclick = () => minimizeWindow('settings');
    $('#settings-maximize').onclick = () => toggleMaximize('settings');
    $('#settings-form').addEventListener('submit', event => { void saveSettings(event); });
    $<HTMLInputElement>('#settings-key').oninput = () => { $<HTMLInputElement>('#settings-clear-key').checked = false; };
    bindDragging('finder'); bindDragging('preview'); bindDragging('settings');
    document.querySelectorAll<HTMLElement>('.window-titlebar').forEach(bar => {
      bar.ondblclick = event => { if (!(event.target as HTMLElement).closest('button')) toggleMaximize(bar.dataset.drag as 'finder' | 'preview' | 'settings'); };
    });
    $('#prev-item').onclick = () => stepPreview(-1); $('#next-item').onclick = () => stepPreview(1);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (!$('#settings').classList.contains('hidden')) hideWindow('settings');
        else if (!$('#preview').classList.contains('hidden')) closePreview();
      }
      if ((event.target as HTMLElement).closest('input, textarea, select, button, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft') stepPreview(-1);
      if (event.key === 'ArrowRight') stepPreview(1);
    });
  }

  function setView(view: 'grid' | 'list') {
    state.view = view;
    $('#grid-button').classList.toggle('active', view === 'grid');
    $('#list-button').classList.toggle('active', view === 'list');
    renderFiles();
  }

  function setFilter(kind: Kind | 'all') {
    state.filter = kind;
    document.querySelectorAll<HTMLButtonElement>('#type-tabs button').forEach(button => { button.classList.toggle('active', button.dataset.kind === kind); });
    renderFiles();
  }

  async function drawWorld() {
    try {
      const { mountArchiveScene } = await import('./archive/scene');
      mountArchiveScene($<HTMLCanvasElement>('#world'), {
        photos: $<HTMLButtonElement>('#desktop-gallery'), videos: $<HTMLButtonElement>('#desktop-video'),
        music: $<HTMLButtonElement>('#desktop-music'), recordings: $<HTMLButtonElement>('#desktop-voice'),
        files: $<HTMLButtonElement>('#desktop-folder'),
      }, {
        lower: $<HTMLButtonElement>('#desk-lower'), raise: $<HTMLButtonElement>('#desk-raise'),
        readout: $<HTMLOutputElement>('#desk-height'),
      });
    } catch (_) { document.documentElement.classList.add('no-webgl'); }
  }

  clock(); setInterval(clock, 30000); bind(); bindStorage(); void loadSettings();
  const startWorld = () => {
    if (document.hidden) return;
    removeEventListener('visibilitychange', startWorld);
    requestAnimationFrame(() => setTimeout(drawWorld, 0));
  };
  addEventListener('visibilitychange', startWorld);
  startWorld();
  addEventListener('resize', () => requestAnimationFrame(clampWindows));
})();
