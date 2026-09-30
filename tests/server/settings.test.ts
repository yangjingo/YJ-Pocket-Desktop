import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { createSettings } from '../../src/server/settings';

test('settings keep secrets private and validate the media path', async () => {
  const base = await mkdtemp(join(tmpdir(), 'yj-desktop-settings-'));
  const resolved = await realpath(base), temporaryRoot = await realpath(tmpdir());
  assert.equal(dirname(resolved), temporaryRoot);
  assert.ok(relative(temporaryRoot, resolved).startsWith('yj-desktop-settings-'));
  const media = join(base, 'media'), keyFile = join(base, 'mmx', 'config.json');
  try {
    await mkdir(media);
    await mkdir(join(base, '.yj-cache'));
    await writeFile(join(base, '.yj-cache', 'settings.json'), JSON.stringify({language:'zh', library_path:base}));
    assert.equal((await createSettings(base, keyFile).read()).library_path, join(base, '..', 'YJ-Media'));
    await writeFile(join(base, '.yj-cache', 'settings.json'), JSON.stringify({language:'zh', library_path:media, wallpaper:'warm'}));
    const settings = createSettings(base, keyFile);
    assert.equal((await settings.read()).key_configured, false);
    assert.equal('wallpaper' in await settings.read(), false);
    const saved = await settings.save({ language: 'en', library_path: media,
      api_key: 'test-key-1234567890' });
    assert.equal(saved.key_configured, true);
    assert.equal(JSON.stringify(saved).includes('test-key'), false);
    assert.equal(JSON.parse(await readFile(keyFile, 'utf8')).api_key, 'test-key-1234567890');
    await assert.rejects(settings.save({language:'zh', library_path:join(base, 'missing')}), /MEDIA_PATH_INVALID/);
    assert.equal((await settings.read()).library_path, await realpath(media));
    assert.equal((await settings.save({language:'zh', library_path:media, clear_key:true})).key_configured, false);
    assert.equal('wallpaper' in JSON.parse(await readFile(join(base, '.yj-cache', 'settings.json'), 'utf8')), false);
  } finally {
    await rm(resolved, { recursive: true, force: true });
  }
});
